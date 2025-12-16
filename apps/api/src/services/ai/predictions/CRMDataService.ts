/**
 * CRM Data Service
 *
 * Provides unified access to CRM data from multiple sources:
 * - Local database (Deal, DealMeeting models)
 * - Salesforce integration
 * - HubSpot integration
 *
 * This service abstracts CRM data retrieval and provides
 * consistent interfaces for AI prediction services.
 */

import { PrismaClient, Deal, DealStage } from '@prisma/client';
import winston from 'winston';
import { CacheService } from '../../cache';
import jsforce from 'jsforce';
import axios from 'axios';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: { service: 'crm-data-service' },
  transports: [new winston.transports.Console()],
});

export interface CRMDeal {
  id: string;
  name: string;
  amount?: number;
  stage: string;
  probability: number;
  expectedCloseDate?: Date;
  actualCloseDate?: Date;
  contactEmail?: string;
  contactName?: string;
  ownerId?: string;
  crmProvider?: string;
  externalId?: string;
  accountId?: string;
}

export interface CRMContact {
  id: string;
  email: string;
  name?: string;
  title?: string;
  company?: string;
  phone?: string;
  accountId?: string;
  lastContactDate?: Date;
}

export interface CRMAccount {
  id: string;
  name: string;
  industry?: string;
  revenue?: number;
  employeeCount?: number;
  website?: string;
  renewalDate?: Date;
  contractValue?: number;
  healthScore?: number;
}

export interface CRMSupportTicket {
  id: string;
  subject: string;
  status: string;
  priority: string;
  createdAt: Date;
  resolvedAt?: Date;
  customerId: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description?: string;
  category?: string;
}

export interface CRMContractData {
  accountId: string;
  contractValue: number;
  renewalDate: Date;
  autoRenewal: boolean;
  contractTerm: number; // months
  lastRenewalDate?: Date;
  expansionPotential?: number;
}

export class CRMDataService {
  private prisma: PrismaClient;
  private cacheService?: CacheService;
  private cacheTTL: number = 300; // 5 minutes

  constructor(prisma: PrismaClient, cacheService?: CacheService) {
    this.prisma = prisma;
    this.cacheService = cacheService;
  }

  /**
   * Get deal data from local database or CRM
   */
  async getDeal(dealId: string, organizationId: string): Promise<CRMDeal | null> {
    // Check cache first
    if (this.cacheService) {
      const cached = await this.cacheService.get<CRMDeal>('crm:deal', dealId);
      if (cached) return cached;
    }

    try {
      // First try local database
      const localDeal = await this.prisma.deal.findFirst({
        where: {
          id: dealId,
          organizationId,
        },
      });

      if (localDeal) {
        const deal = this.mapLocalDealToCRM(localDeal);

        // Cache the result
        if (this.cacheService) {
          await this.cacheService.set('crm:deal', dealId, deal, this.cacheTTL);
        }

        return deal;
      }

      // If not found locally, check Salesforce sync
      const sfSync = await this.prisma.salesforceMeetingSync.findFirst({
        where: { salesforceOpportunityId: dealId },
      });

      if (sfSync) {
        // Fetch from Salesforce integration
        const sfDeal = await this.fetchSalesforceDeal(dealId, organizationId);
        if (sfDeal) {
          if (this.cacheService) {
            await this.cacheService.set('crm:deal', dealId, sfDeal, this.cacheTTL);
          }
          return sfDeal;
        }
      }

      // Check HubSpot sync
      const hsSync = await this.prisma.hubspotMeetingSync.findFirst({
        where: { hubspotDealId: dealId },
      });

      if (hsSync) {
        // Fetch from HubSpot integration
        const hsDeal = await this.fetchHubSpotDeal(dealId, organizationId);
        if (hsDeal) {
          if (this.cacheService) {
            await this.cacheService.set('crm:deal', dealId, hsDeal, this.cacheTTL);
          }
          return hsDeal;
        }
      }

      return null;
    } catch (error) {
      logger.error('Failed to get deal:', error);
      return null;
    }
  }

  /**
   * Get deals by stage
   */
  async getDealsByStage(
    organizationId: string,
    stage?: DealStage,
    limit: number = 100
  ): Promise<CRMDeal[]> {
    const deals = await this.prisma.deal.findMany({
      where: {
        organizationId,
        ...(stage && { stage }),
      },
      orderBy: { expectedCloseDate: 'asc' },
      take: limit,
    });

    return deals.map(this.mapLocalDealToCRM);
  }

  /**
   * Get deals at risk based on various factors
   */
  async getDealsAtRisk(organizationId: string): Promise<CRMDeal[]> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Find deals with low probability or no recent activity
    const deals = await this.prisma.deal.findMany({
      where: {
        organizationId,
        OR: [
          { probability: { lt: 30 } },
          { updatedAt: { lt: thirtyDaysAgo } },
          {
            AND: [
              { stage: { in: ['proposal', 'negotiation'] } },
              { expectedCloseDate: { lt: new Date() } },
            ],
          },
        ],
        stage: { notIn: ['closed_won', 'closed_lost'] },
      },
      include: {
        meetings: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    return deals.map(this.mapLocalDealToCRM);
  }

  /**
   * Get support tickets for a customer
   */
  async getCustomerSupportTickets(
    customerId: string,
    organizationId: string,
    daysBack: number = 30
  ): Promise<CRMSupportTicket[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    // Check for support-related meetings (as proxy for tickets)
    const supportMeetings = await this.prisma.meeting.findMany({
      where: {
        organizationId,
        scheduledStartAt: { gte: startDate },
        OR: [
          { title: { contains: 'support', mode: 'insensitive' } },
          { title: { contains: 'issue', mode: 'insensitive' } },
          { title: { contains: 'problem', mode: 'insensitive' } },
        ],
        participants: {
          some: {
            email: customerId, // Using email as customer ID
          },
        },
      },
      include: {
        aiAnalyses: true,
      },
    });

    // Convert meetings to support tickets
    return supportMeetings.map(meeting => {
      const analysis = meeting.aiAnalyses?.[0];
      const sentiment = (analysis?.sentiment as any)?.overall || 0;

      return {
        id: meeting.id,
        subject: meeting.title,
        status: meeting.status === 'completed' ? 'resolved' : 'open',
        priority: sentiment < -0.5 ? 'high' : sentiment < 0 ? 'medium' : 'low',
        createdAt: meeting.createdAt,
        resolvedAt: meeting.status === 'completed' ? meeting.actualEndAt : undefined,
        customerId,
        severity: this.calculateSeverity(sentiment, meeting.title),
        description: meeting.description || undefined,
        category: this.categorizeSupport(meeting.title, meeting.metadata),
      };
    });
  }

  /**
   * Get contract renewal data for a customer
   */
  async getContractRenewalData(
    accountId: string,
    organizationId: string
  ): Promise<CRMContractData | null> {
    // First check local deals for contract info
    const activeDeals = await this.prisma.deal.findMany({
      where: {
        organizationId,
        crmAccountId: accountId,
        stage: { in: ['closed_won', 'negotiation'] },
      },
      orderBy: { expectedCloseDate: 'desc' },
      take: 1,
    });

    if (activeDeals.length > 0) {
      const deal = activeDeals[0];
      const renewalDate = deal.expectedCloseDate || new Date();
      renewalDate.setFullYear(renewalDate.getFullYear() + 1);

      return {
        accountId,
        contractValue: deal.amount || 0,
        renewalDate,
        autoRenewal: false,
        contractTerm: 12,
        lastRenewalDate: deal.actualCloseDate || undefined,
        expansionPotential: deal.probability,
      };
    }

    // Fallback to fetching from CRM integrations
    const sfData = await this.fetchSalesforceContractData(accountId, organizationId);
    if (sfData) return sfData;

    const hsData = await this.fetchHubSpotContractData(accountId, organizationId);
    if (hsData) return hsData;

    // Generate estimated contract data based on meetings
    const recentMeetings = await this.prisma.meeting.findMany({
      where: {
        organizationId,
        participants: {
          some: {
            metadata: {
              path: ['accountId'],
              equals: accountId,
            },
          },
        },
      },
      orderBy: { scheduledStartAt: 'desc' },
      take: 10,
    });

    if (recentMeetings.length > 0) {
      const estimatedRenewal = new Date();
      estimatedRenewal.setMonth(estimatedRenewal.getMonth() + 6);

      return {
        accountId,
        contractValue: 50000, // Default estimate
        renewalDate: estimatedRenewal,
        autoRenewal: false,
        contractTerm: 12,
        expansionPotential: 50,
      };
    }

    return null;
  }

  /**
   * Get account health metrics
   */
  async getAccountHealth(
    accountId: string,
    organizationId: string
  ): Promise<{
    healthScore: number;
    riskFactors: string[];
    opportunities: string[];
  }> {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    // Get recent meetings for sentiment analysis
    const meetings = await this.prisma.meeting.findMany({
      where: {
        organizationId,
        scheduledStartAt: { gte: ninetyDaysAgo },
        OR: [
          {
            participants: {
              some: {
                metadata: {
                  path: ['accountId'],
                  equals: accountId,
                },
              },
            },
          },
          {
            dealMeetings: {
              some: {
                deal: {
                  crmAccountId: accountId,
                },
              },
            },
          },
        ],
      },
      include: {
        aiAnalyses: true,
      },
    });

    // Calculate health metrics
    let totalSentiment = 0;
    let sentimentCount = 0;
    const riskFactors: string[] = [];
    const opportunities: string[] = [];

    meetings.forEach(meeting => {
      if (meeting.aiAnalyses?.length > 0) {
        const analysis = meeting.aiAnalyses[0];
        const sentiment = (analysis.sentiment as any)?.overall;

        if (typeof sentiment === 'number') {
          totalSentiment += sentiment;
          sentimentCount++;

          if (sentiment < -0.3) {
            riskFactors.push(`Negative sentiment in meeting: ${meeting.title}`);
          } else if (sentiment > 0.5) {
            opportunities.push(`Positive engagement in: ${meeting.title}`);
          }
        }

        // Check for risks and opportunities in analysis
        const risks = (analysis.risks as any[]) || [];
        const opps = (analysis.opportunities as any[]) || [];

        risks.forEach((risk: any) => {
          if (risk.impact === 'high') {
            riskFactors.push(risk.description);
          }
        });

        opps.forEach((opp: any) => {
          if (opp.potential === 'high') {
            opportunities.push(opp.description);
          }
        });
      }
    });

    // Calculate health score
    const avgSentiment = sentimentCount > 0 ? totalSentiment / sentimentCount : 0;
    const meetingFrequency = meetings.length / 13; // meetings per week
    const hasRecentActivity = meetings.some(m =>
      m.scheduledStartAt && m.scheduledStartAt > new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
    );

    let healthScore = 50; // Base score
    healthScore += avgSentiment * 20; // -20 to +20
    healthScore += Math.min(meetingFrequency * 10, 20); // Up to +20 for frequency
    healthScore += hasRecentActivity ? 10 : -10;
    healthScore -= riskFactors.length * 5;
    healthScore += opportunities.length * 3;

    // Clamp between 0 and 100
    healthScore = Math.max(0, Math.min(100, Math.round(healthScore)));

    return {
      healthScore,
      riskFactors: riskFactors.slice(0, 5),
      opportunities: opportunities.slice(0, 5),
    };
  }

  /**
   * Helper: Map local Deal to CRM format
   */
  private mapLocalDealToCRM(deal: Deal): CRMDeal {
    return {
      id: deal.id,
      name: deal.name,
      amount: deal.amount || undefined,
      stage: deal.stage,
      probability: deal.probability,
      expectedCloseDate: deal.expectedCloseDate || undefined,
      actualCloseDate: deal.actualCloseDate || undefined,
      contactEmail: deal.contactEmail || undefined,
      contactName: deal.contactName || undefined,
      ownerId: deal.ownerId || undefined,
      crmProvider: deal.crmProvider || undefined,
      externalId: deal.crmDealId || undefined,
      accountId: deal.crmAccountId || undefined,
    };
  }

  /**
   * Helper: Calculate support ticket severity
   */
  private calculateSeverity(
    sentiment: number,
    title: string
  ): 'low' | 'medium' | 'high' | 'critical' {
    const urgentKeywords = ['urgent', 'critical', 'asap', 'emergency', 'down', 'broken'];
    const hasUrgentKeyword = urgentKeywords.some(k =>
      title.toLowerCase().includes(k)
    );

    if (hasUrgentKeyword || sentiment < -0.7) return 'critical';
    if (sentiment < -0.3) return 'high';
    if (sentiment < 0) return 'medium';
    return 'low';
  }

  /**
   * Helper: Categorize support issue
   */
  private categorizeSupport(title: string, metadata?: any): string {
    // Extract tags from metadata if available
    const tags = metadata?.tags || [];
    if (tags.includes('bug') || title.toLowerCase().includes('bug')) return 'bug';
    if (tags.includes('feature') || title.toLowerCase().includes('feature')) return 'feature_request';
    if (title.toLowerCase().includes('performance')) return 'performance';
    if (title.toLowerCase().includes('integration')) return 'integration';
    if (title.toLowerCase().includes('billing')) return 'billing';
    return 'general';
  }

  /**
   * Fetch deal from Salesforce via jsforce
   */
  private async fetchSalesforceDeal(
    dealId: string,
    organizationId: string
  ): Promise<CRMDeal | null> {
    try {
      // Get Salesforce integration credentials
      const integration = await this.prisma.integration.findFirst({
        where: {
          organizationId,
          type: 'salesforce',
          isActive: true,
        },
      });

      if (!integration || !integration.accessToken) {
        logger.debug('No active Salesforce integration found', { organizationId });
        return null;
      }

      const settings = integration.settings as any;
      const credentials = {
        accessToken: integration.accessToken,
        refreshToken: integration.refreshToken || '',
        instanceUrl: settings?.instanceUrl || '',
      };

      // Create jsforce connection
      const conn = new jsforce.Connection({
        instanceUrl: credentials.instanceUrl,
        accessToken: credentials.accessToken,
      });

      // Fetch the opportunity from Salesforce
      const opportunity = await conn.sobject('Opportunity').retrieve(dealId) as {
        Id: string;
        Name: string;
        Amount?: number;
        StageName: string;
        Probability?: number;
        CloseDate?: string;
        ContactId?: string;
        OwnerId?: string;
        AccountId?: string;
      };

      if (!opportunity) {
        return null;
      }

      // Get contact details if available
      let contactEmail: string | undefined;
      let contactName: string | undefined;
      if (opportunity.ContactId) {
        try {
          const contact = await conn.sobject('Contact').retrieve(opportunity.ContactId) as {
            Email?: string;
            Name?: string;
          };
          contactEmail = contact.Email;
          contactName = contact.Name;
        } catch {
          logger.debug('Could not fetch contact details', { contactId: opportunity.ContactId });
        }
      }

      return {
        id: opportunity.Id,
        name: opportunity.Name,
        amount: opportunity.Amount,
        stage: opportunity.StageName,
        probability: opportunity.Probability || 0,
        expectedCloseDate: opportunity.CloseDate ? new Date(opportunity.CloseDate) : undefined,
        contactEmail,
        contactName,
        ownerId: opportunity.OwnerId,
        crmProvider: 'salesforce',
        externalId: opportunity.Id,
        accountId: opportunity.AccountId,
      };
    } catch (error) {
      logger.error('Failed to fetch Salesforce deal:', error);
      return null;
    }
  }

  /**
   * Fetch deal from HubSpot via REST API
   */
  private async fetchHubSpotDeal(
    dealId: string,
    organizationId: string
  ): Promise<CRMDeal | null> {
    try {
      // Get HubSpot integration credentials
      const integration = await this.prisma.integration.findFirst({
        where: {
          organizationId,
          type: 'hubspot',
          isActive: true,
        },
      });

      if (!integration || !integration.accessToken) {
        logger.debug('No active HubSpot integration found', { organizationId });
        return null;
      }

      const credentials = {
        accessToken: integration.accessToken,
        refreshToken: integration.refreshToken || '',
      };

      // Fetch deal from HubSpot API
      const dealResponse = await axios.get(
        `https://api.hubapi.com/crm/v3/objects/deals/${dealId}`,
        {
          headers: {
            Authorization: `Bearer ${credentials.accessToken}`,
            'Content-Type': 'application/json',
          },
          params: {
            properties: 'dealname,amount,dealstage,hs_deal_stage_probability,closedate,hubspot_owner_id',
            associations: 'contacts',
          },
        }
      );

      const deal = dealResponse.data;
      if (!deal) {
        return null;
      }

      // Get contact details if associated
      let contactEmail: string | undefined;
      let contactName: string | undefined;
      const contactAssociations = deal.associations?.contacts?.results;
      if (contactAssociations && contactAssociations.length > 0) {
        try {
          const contactId = contactAssociations[0].id;
          const contactResponse = await axios.get(
            `https://api.hubapi.com/crm/v3/objects/contacts/${contactId}`,
            {
              headers: {
                Authorization: `Bearer ${credentials.accessToken}`,
                'Content-Type': 'application/json',
              },
              params: {
                properties: 'email,firstname,lastname',
              },
            }
          );
          const contact = contactResponse.data;
          contactEmail = contact.properties?.email;
          contactName = [contact.properties?.firstname, contact.properties?.lastname]
            .filter(Boolean)
            .join(' ') || undefined;
        } catch {
          logger.debug('Could not fetch HubSpot contact details', { dealId });
        }
      }

      return {
        id: deal.id,
        name: deal.properties?.dealname || 'Untitled Deal',
        amount: deal.properties?.amount ? parseFloat(deal.properties.amount) : undefined,
        stage: deal.properties?.dealstage || 'unknown',
        probability: deal.properties?.hs_deal_stage_probability
          ? parseFloat(deal.properties.hs_deal_stage_probability)
          : 0,
        expectedCloseDate: deal.properties?.closedate
          ? new Date(deal.properties.closedate)
          : undefined,
        contactEmail,
        contactName,
        ownerId: deal.properties?.hubspot_owner_id,
        crmProvider: 'hubspot',
        externalId: deal.id,
      };
    } catch (error) {
      logger.error('Failed to fetch HubSpot deal:', error);
      return null;
    }
  }

  /**
   * Fetch contract data from Salesforce via jsforce
   */
  private async fetchSalesforceContractData(
    accountId: string,
    organizationId: string
  ): Promise<CRMContractData | null> {
    try {
      // Get Salesforce integration credentials
      const integration = await this.prisma.integration.findFirst({
        where: {
          organizationId,
          type: 'salesforce',
          isActive: true,
        },
      });

      if (!integration || !integration.accessToken) {
        logger.debug('No active Salesforce integration found', { organizationId });
        return null;
      }

      const settings = integration.settings as any;
      const credentials = {
        accessToken: integration.accessToken,
        refreshToken: integration.refreshToken || '',
        instanceUrl: settings?.instanceUrl || '',
      };

      // Create jsforce connection
      const conn = new jsforce.Connection({
        instanceUrl: credentials.instanceUrl,
        accessToken: credentials.accessToken,
      });

      // Query contracts for the account
      const contracts = await conn.query<{
        Id: string;
        ContractNumber: string;
        Status: string;
        StartDate: string;
        EndDate: string;
        ContractTerm: number;
        TotalContractValue?: number;
        AutoRenewal__c?: boolean;
      }>(`
        SELECT Id, ContractNumber, Status, StartDate, EndDate, ContractTerm,
               TotalContractValue__c, AutoRenewal__c
        FROM Contract
        WHERE AccountId = '${accountId}'
          AND Status = 'Activated'
        ORDER BY EndDate DESC
        LIMIT 1
      `);

      if (!contracts.records || contracts.records.length === 0) {
        logger.debug('No active contracts found for account', { accountId });
        return null;
      }

      const contract = contracts.records[0];
      const renewalDate = contract.EndDate ? new Date(contract.EndDate) : new Date();

      // Query recent closed-won opportunities for expansion potential
      const opportunities = await conn.query<{
        Amount: number;
        Probability: number;
      }>(`
        SELECT Amount, Probability
        FROM Opportunity
        WHERE AccountId = '${accountId}'
          AND StageName = 'Closed Won'
        ORDER BY CloseDate DESC
        LIMIT 5
      `);

      const avgDealSize = opportunities.records.length > 0
        ? opportunities.records.reduce((sum, opp) => sum + (opp.Amount || 0), 0) / opportunities.records.length
        : 0;

      return {
        accountId,
        contractValue: contract.TotalContractValue || 0,
        renewalDate,
        autoRenewal: contract.AutoRenewal__c || false,
        contractTerm: contract.ContractTerm || 12,
        lastRenewalDate: contract.StartDate ? new Date(contract.StartDate) : undefined,
        expansionPotential: avgDealSize > 0 ? Math.min(100, (avgDealSize / (contract.TotalContractValue || 1)) * 100) : 50,
      };
    } catch (error) {
      logger.error('Failed to fetch Salesforce contract data:', error);
      return null;
    }
  }

  /**
   * Fetch contract data from HubSpot via REST API
   */
  private async fetchHubSpotContractData(
    accountId: string,
    organizationId: string
  ): Promise<CRMContractData | null> {
    try {
      // Get HubSpot integration credentials
      const integration = await this.prisma.integration.findFirst({
        where: {
          organizationId,
          type: 'hubspot',
          isActive: true,
        },
      });

      if (!integration || !integration.accessToken) {
        logger.debug('No active HubSpot integration found', { organizationId });
        return null;
      }

      const credentials = {
        accessToken: integration.accessToken,
        refreshToken: integration.refreshToken || '',
      };

      // Fetch company (account) details including custom contract properties
      const companyResponse = await axios.get(
        `https://api.hubapi.com/crm/v3/objects/companies/${accountId}`,
        {
          headers: {
            Authorization: `Bearer ${credentials.accessToken}`,
            'Content-Type': 'application/json',
          },
          params: {
            properties: 'contract_value,contract_end_date,contract_start_date,auto_renewal,contract_term_months',
          },
        }
      );

      const company = companyResponse.data;
      if (!company?.properties) {
        logger.debug('No company found or missing properties', { accountId });
        return null;
      }

      const props = company.properties;

      // Get associated deals to calculate expansion potential
      const dealsResponse = await axios.get(
        `https://api.hubapi.com/crm/v3/objects/companies/${accountId}/associations/deals`,
        {
          headers: {
            Authorization: `Bearer ${credentials.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      let expansionPotential = 50; // Default
      if (dealsResponse.data?.results?.length > 0) {
        const dealIds = dealsResponse.data.results.slice(0, 5).map((d: { id: string }) => d.id);

        // Fetch deal amounts
        const dealDetailsPromises = dealIds.map((id: string) =>
          axios.get(`https://api.hubapi.com/crm/v3/objects/deals/${id}`, {
            headers: {
              Authorization: `Bearer ${credentials.accessToken}`,
            },
            params: {
              properties: 'amount,dealstage',
            },
          }).catch(() => null)
        );

        const dealDetails = await Promise.all(dealDetailsPromises);
        const closedDeals = dealDetails
          .filter(d => d?.data?.properties?.dealstage === 'closedwon')
          .map(d => parseFloat(d?.data?.properties?.amount || '0'));

        if (closedDeals.length > 0) {
          const avgDeal = closedDeals.reduce((a, b) => a + b, 0) / closedDeals.length;
          const contractValue = parseFloat(props.contract_value || '0');
          if (contractValue > 0) {
            expansionPotential = Math.min(100, (avgDeal / contractValue) * 100);
          }
        }
      }

      const renewalDate = props.contract_end_date
        ? new Date(props.contract_end_date)
        : new Date(Date.now() + 180 * 24 * 60 * 60 * 1000); // Default 6 months

      return {
        accountId,
        contractValue: parseFloat(props.contract_value || '0'),
        renewalDate,
        autoRenewal: props.auto_renewal === 'true' || props.auto_renewal === true,
        contractTerm: parseInt(props.contract_term_months || '12', 10),
        lastRenewalDate: props.contract_start_date ? new Date(props.contract_start_date) : undefined,
        expansionPotential,
      };
    } catch (error) {
      logger.error('Failed to fetch HubSpot contract data:', error);
      return null;
    }
  }
}

/**
 * Factory function to create CRMDataService
 */
export function createCRMDataService(
  prisma: PrismaClient,
  cacheService?: CacheService
): CRMDataService {
  return new CRMDataService(prisma, cacheService);
}