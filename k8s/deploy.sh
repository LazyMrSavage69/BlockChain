#!/bin/bash

# Kubernetes Deployment Script for Blockchain App on AKS
# This script deploys all Kubernetes resources in the correct order

set -e  # Exit on any error

echo "=========================================="
echo "Deploying Blockchain App to AKS"
echo "=========================================="

# Color codes for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check if kubectl is installed
if ! command -v kubectl &> /dev/null; then
    print_error "kubectl is not installed. Please install kubectl first."
    exit 1
fi

# Check if connected to a cluster
if ! kubectl cluster-info &> /dev/null; then
    print_error "Not connected to a Kubernetes cluster. Please configure kubectl."
    exit 1
fi

print_status "Connected to Kubernetes cluster"

# Step 1: Create Namespace
echo ""
echo "Step 1: Creating namespace..."
kubectl apply -f namespace.yaml
print_status "Namespace created"

# Step 2: Create ConfigMaps
echo ""
echo "Step 2: Creating ConfigMaps..."
kubectl apply -f configmap.yaml
kubectl apply -f database/mysql-init-configmap.yaml
print_status "ConfigMaps created"

# Step 3: Create Secrets
echo ""
echo "Step 3: Creating Secrets..."
print_warning "Make sure you have updated secrets.yaml with your actual credentials!"
read -p "Have you updated the secrets with real values? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_error "Please update secrets.yaml with your actual credentials before deploying"
    exit 1
fi
kubectl apply -f secrets.yaml
print_status "Secrets created"

# Step 4: Create Persistent Volume Claims
echo ""
echo "Step 4: Creating Persistent Volume Claims..."
kubectl apply -f storage/mysql-pvc.yaml
kubectl apply -f storage/hardhat-pvc.yaml
print_status "PVCs created"

# Wait for PVCs to be bound
echo "Waiting for PVCs to be bound..."
kubectl wait --for=condition=Bound pvc/mysql-pvc -n blockchain-app --timeout=120s
kubectl wait --for=condition=Bound pvc/hardhat-pvc -n blockchain-app --timeout=120s
print_status "PVCs are bound"

# Step 5: Deploy Database
echo ""
echo "Step 5: Deploying MySQL database..."
kubectl apply -f database/mysql-deployment.yaml
kubectl apply -f database/mysql-service.yaml
print_status "MySQL deployed"

# Wait for MySQL to be ready
echo "Waiting for MySQL to be ready..."
kubectl wait --for=condition=ready pod -l app=mysql -n blockchain-app --timeout=300s
print_status "MySQL is ready"

# Step 6: Deploy Microservices
echo ""
echo "Step 6: Deploying microservices..."
kubectl apply -f services/auth-deployment.yaml
kubectl apply -f services/auth-service.yaml
kubectl apply -f services/backend-deployment.yaml
kubectl apply -f services/backend-service.yaml
kubectl apply -f services/gateway-deployment.yaml
kubectl apply -f services/gateway-service.yaml
kubectl apply -f services/frontend-deployment.yaml
kubectl apply -f services/frontend-service.yaml
kubectl apply -f services/hardhat-deployment.yaml
kubectl apply -f services/hardhat-service.yaml
print_status "Microservices deployed"

# Wait for deployments to be ready
echo "Waiting for deployments to be ready..."
kubectl wait --for=condition=available deployment/auth-service -n blockchain-app --timeout=300s
kubectl wait --for=condition=available deployment/backend-nest -n blockchain-app --timeout=300s
kubectl wait --for=condition=available deployment/gateway -n blockchain-app --timeout=300s
kubectl wait --for=condition=available deployment/frontend -n blockchain-app --timeout=300s
kubectl wait --for=condition=available deployment/hardhat-node -n blockchain-app --timeout=300s
print_status "All deployments are ready"

# Step 7: Deploy Ingress
echo ""
echo "Step 7: Deploying Ingress..."
print_warning "Make sure NGINX Ingress Controller is installed in your cluster!"
kubectl apply -f ingress/ingress.yaml
print_status "Ingress deployed"

# Display deployment status
echo ""
echo "=========================================="
echo "Deployment Summary"
echo "=========================================="
echo ""
echo "Pods:"
kubectl get pods -n blockchain-app
echo ""
echo "Services:"
kubectl get svc -n blockchain-app
echo ""
echo "Ingress:"
kubectl get ingress -n blockchain-app
echo ""
echo "=========================================="
print_status "Deployment completed successfully!"
echo "=========================================="
echo ""
print_warning "Next Steps:"
echo "1. Get the Ingress external IP: kubectl get ingress -n blockchain-app"
echo "2. Update your DNS to point to the Ingress IP"
echo "3. Update NEXT_PUBLIC_API_URL in frontend-deployment.yaml with your domain"
echo "4. Configure SSL/TLS with cert-manager if needed"
echo ""
