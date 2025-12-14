###############################################################################
# Multi-Region Disaster Recovery Infrastructure
# Deploys OpenMeet platform across multiple regions for high availability
###############################################################################

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23"
    }
  }

  backend "s3" {
    bucket         = "openmeet-terraform-state"
    key            = "multi-region/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "openmeet-terraform-locks"
  }
}

###############################################################################
# Variables
###############################################################################

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "openmeet"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

variable "primary_region" {
  description = "Primary AWS region"
  type        = string
  default     = "us-east-1"
}

variable "secondary_region" {
  description = "Secondary AWS region for DR"
  type        = string
  default     = "us-west-2"
}

variable "tertiary_region" {
  description = "Tertiary AWS region for additional redundancy"
  type        = string
  default     = "eu-west-1"
}

###############################################################################
# Providers for Multiple Regions
###############################################################################

provider "aws" {
  alias  = "primary"
  region = var.primary_region
}

provider "aws" {
  alias  = "secondary"
  region = var.secondary_region
}

provider "aws" {
  alias  = "tertiary"
  region = var.tertiary_region
}

###############################################################################
# VPCs for Each Region
###############################################################################

module "vpc_primary" {
  source = "./modules/vpc"
  providers = {
    aws = aws.primary
  }

  region      = var.primary_region
  environment = var.environment
  cidr_block  = "10.0.0.0/16"
}

module "vpc_secondary" {
  source = "./modules/vpc"
  providers = {
    aws = aws.secondary
  }

  region      = var.secondary_region
  environment = var.environment
  cidr_block  = "10.1.0.0/16"
}

module "vpc_tertiary" {
  source = "./modules/vpc"
  providers = {
    aws = aws.tertiary
  }

  region      = var.tertiary_region
  environment = var.environment
  cidr_block  = "10.2.0.0/16"
}

###############################################################################
# EKS Clusters for Each Region
###############################################################################

module "eks_primary" {
  source = "./modules/eks"
  providers = {
    aws = aws.primary
  }

  cluster_name    = "${var.project_name}-${var.environment}-primary"
  region          = var.primary_region
  vpc_id          = module.vpc_primary.vpc_id
  subnet_ids      = module.vpc_primary.private_subnet_ids
  node_group_size = {
    min     = 3
    max     = 10
    desired = 5
  }
}

module "eks_secondary" {
  source = "./modules/eks"
  providers = {
    aws = aws.secondary
  }

  cluster_name    = "${var.project_name}-${var.environment}-secondary"
  region          = var.secondary_region
  vpc_id          = module.vpc_secondary.vpc_id
  subnet_ids      = module.vpc_secondary.private_subnet_ids
  node_group_size = {
    min     = 2
    max     = 8
    desired = 3
  }
}

module "eks_tertiary" {
  source = "./modules/eks"
  providers = {
    aws = aws.tertiary
  }

  cluster_name    = "${var.project_name}-${var.environment}-tertiary"
  region          = var.tertiary_region
  vpc_id          = module.vpc_tertiary.vpc_id
  subnet_ids      = module.vpc_tertiary.private_subnet_ids
  node_group_size = {
    min     = 2
    max     = 8
    desired = 3
  }
}

###############################################################################
# Global Load Balancer (Route53 + Health Checks)
###############################################################################

resource "aws_route53_zone" "main" {
  provider = aws.primary
  name     = "openmeet.ai"
}

resource "aws_route53_health_check" "primary" {
  provider          = aws.primary
  fqdn              = "primary.openmeet.ai"
  port              = 443
  type              = "HTTPS"
  resource_path     = "/health"
  failure_threshold = 3
  request_interval  = 30

  tags = {
    Name = "Primary Region Health Check"
  }
}

resource "aws_route53_health_check" "secondary" {
  provider          = aws.secondary
  fqdn              = "secondary.openmeet.ai"
  port              = 443
  type              = "HTTPS"
  resource_path     = "/health"
  failure_threshold = 3
  request_interval  = 30

  tags = {
    Name = "Secondary Region Health Check"
  }
}

resource "aws_route53_record" "primary" {
  provider = aws.primary
  zone_id  = aws_route53_zone.main.zone_id
  name     = "api.openmeet.ai"
  type     = "A"

  failover_routing_policy {
    type = "PRIMARY"
  }

  set_identifier  = "primary"
  health_check_id = aws_route53_health_check.primary.id

  alias {
    name                   = module.eks_primary.load_balancer_dns
    zone_id                = module.eks_primary.load_balancer_zone_id
    evaluate_target_health = true
  }
}

resource "aws_route53_record" "secondary" {
  provider = aws.primary
  zone_id  = aws_route53_zone.main.zone_id
  name     = "api.openmeet.ai"
  type     = "A"

  failover_routing_policy {
    type = "SECONDARY"
  }

  set_identifier  = "secondary"
  health_check_id = aws_route53_health_check.secondary.id

  alias {
    name                   = module.eks_secondary.load_balancer_dns
    zone_id                = module.eks_secondary.load_balancer_zone_id
    evaluate_target_health = true
  }
}

###############################################################################
# Cross-Region Database Replication (RDS PostgreSQL)
###############################################################################

resource "aws_db_instance" "primary" {
  provider = aws.primary

  identifier     = "${var.project_name}-${var.environment}-primary"
  engine         = "postgres"
  engine_version = "15.4"
  instance_class = "db.r6g.xlarge"

  allocated_storage     = 100
  max_allocated_storage = 1000
  storage_encrypted     = true
  storage_type          = "gp3"

  db_name  = "openmeet"
  username = "postgres"
  password = random_password.db_password.result

  multi_az               = true
  backup_retention_period = 30
  backup_window          = "03:00-04:00"
  maintenance_window     = "mon:04:00-mon:05:00"

  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]

  deletion_protection = true
  skip_final_snapshot = false
  final_snapshot_identifier = "${var.project_name}-final-snapshot-${formatdate("YYYY-MM-DD-hhmm", timestamp())}"

  tags = {
    Name        = "Primary PostgreSQL Database"
    Environment = var.environment
    Region      = var.primary_region
  }
}

resource "aws_db_instance_automated_backups_replication" "secondary" {
  provider = aws.secondary

  source_db_instance_arn = aws_db_instance.primary.arn
  retention_period       = 30
}

resource "aws_db_instance" "read_replica_secondary" {
  provider = aws.secondary

  identifier     = "${var.project_name}-${var.environment}-secondary-replica"
  replicate_source_db = aws_db_instance.primary.arn

  instance_class = "db.r6g.xlarge"

  auto_minor_version_upgrade = true
  storage_encrypted          = true

  tags = {
    Name        = "Secondary PostgreSQL Read Replica"
    Environment = var.environment
    Region      = var.secondary_region
  }
}

###############################################################################
# S3 Cross-Region Replication for Backups
###############################################################################

resource "aws_s3_bucket" "backups_primary" {
  provider = aws.primary
  bucket   = "${var.project_name}-backups-${var.primary_region}"

  tags = {
    Name        = "Primary Backups Bucket"
    Environment = var.environment
  }
}

resource "aws_s3_bucket_versioning" "backups_primary" {
  provider = aws.primary
  bucket   = aws_s3_bucket.backups_primary.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket" "backups_secondary" {
  provider = aws.secondary
  bucket   = "${var.project_name}-backups-${var.secondary_region}"

  tags = {
    Name        = "Secondary Backups Bucket"
    Environment = var.environment
  }
}

resource "aws_s3_bucket_versioning" "backups_secondary" {
  provider = aws.secondary
  bucket   = aws_s3_bucket.backups_secondary.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_replication_configuration" "primary_to_secondary" {
  provider = aws.primary
  bucket   = aws_s3_bucket.backups_primary.id
  role     = aws_iam_role.replication.arn

  rule {
    id     = "replicate-all"
    status = "Enabled"

    destination {
      bucket        = aws_s3_bucket.backups_secondary.arn
      storage_class = "STANDARD_IA"

      replication_time {
        status = "Enabled"
        time {
          minutes = 15
        }
      }

      metrics {
        status = "Enabled"
        event_threshold {
          minutes = 15
        }
      }
    }
  }
}

###############################################################################
# CloudWatch Alarms for Failover Monitoring
###############################################################################

resource "aws_cloudwatch_metric_alarm" "primary_health" {
  provider = aws.primary

  alarm_name          = "${var.project_name}-primary-health"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 2
  metric_name         = "HealthCheckStatus"
  namespace           = "AWS/Route53"
  period              = 60
  statistic           = "Minimum"
  threshold           = 1
  alarm_description   = "Primary region health check failed"
  treat_missing_data  = "breaching"

  dimensions = {
    HealthCheckId = aws_route53_health_check.primary.id
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
}

resource "aws_sns_topic" "alerts" {
  provider = aws.primary
  name     = "${var.project_name}-dr-alerts"
}

###############################################################################
# Outputs
###############################################################################

output "primary_cluster_endpoint" {
  value = module.eks_primary.cluster_endpoint
}

output "secondary_cluster_endpoint" {
  value = module.eks_secondary.cluster_endpoint
}

output "global_endpoint" {
  value = "https://api.openmeet.ai"
}

output "primary_db_endpoint" {
  value     = aws_db_instance.primary.endpoint
  sensitive = true
}

output "secondary_db_endpoint" {
  value     = aws_db_instance.read_replica_secondary.endpoint
  sensitive = true
}

###############################################################################
# Random Password for Database
###############################################################################

resource "random_password" "db_password" {
  length  = 32
  special = true
}

###############################################################################
# IAM Role for S3 Replication
###############################################################################

resource "aws_iam_role" "replication" {
  provider = aws.primary
  name     = "${var.project_name}-s3-replication"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "s3.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy" "replication" {
  provider = aws.primary
  role     = aws_iam_role.replication.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "s3:GetReplicationConfiguration",
          "s3:ListBucket"
        ]
        Effect = "Allow"
        Resource = [
          aws_s3_bucket.backups_primary.arn
        ]
      },
      {
        Action = [
          "s3:GetObjectVersionForReplication",
          "s3:GetObjectVersionAcl",
          "s3:GetObjectVersionTagging"
        ]
        Effect = "Allow"
        Resource = [
          "${aws_s3_bucket.backups_primary.arn}/*"
        ]
      },
      {
        Action = [
          "s3:ReplicateObject",
          "s3:ReplicateDelete",
          "s3:ReplicateTags"
        ]
        Effect = "Allow"
        Resource = [
          "${aws_s3_bucket.backups_secondary.arn}/*"
        ]
      }
    ]
  })
}
