#!/bin/bash

###############################################################################
# Install Chaos Mesh for Chaos Engineering Tests
###############################################################################

set -euo pipefail

log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*"
}

log "Installing Chaos Mesh..."

# Add Chaos Mesh Helm repository
helm repo add chaos-mesh https://charts.chaos-mesh.org
helm repo update

# Create namespace
kubectl create namespace chaos-mesh --dry-run=client -o yaml | kubectl apply -f -

# Install Chaos Mesh
helm install chaos-mesh chaos-mesh/chaos-mesh \
    --namespace chaos-mesh \
    --version 2.6.0 \
    --set chaosDaemon.runtime=containerd \
    --set chaosDaemon.socketPath=/run/containerd/containerd.sock \
    --set dashboard.create=true \
    --set dashboard.securityMode=false

# Wait for Chaos Mesh to be ready
log "Waiting for Chaos Mesh to be ready..."
kubectl wait --for=condition=available --timeout=300s deployment --all -n chaos-mesh

# Get dashboard URL
log "Chaos Mesh installed successfully!"
log "Dashboard: http://localhost:2333"
log "To access dashboard: kubectl port-forward -n chaos-mesh svc/chaos-dashboard 2333:2333"

exit 0
