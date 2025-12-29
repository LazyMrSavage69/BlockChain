# Kubernetes Deployment Script for Blockchain App on AKS (PowerShell)
# This script deploys all Kubernetes resources in the correct order

$ErrorActionPreference = "Stop"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Deploying Blockchain App to AKS" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

function Print-Status {
    param([string]$Message)
    Write-Host "✓ $Message" -ForegroundColor Green
}

function Print-Warning {
    param([string]$Message)
    Write-Host "⚠ $Message" -ForegroundColor Yellow
}

function Print-Error {
    param([string]$Message)
    Write-Host "✗ $Message" -ForegroundColor Red
}

# Check if kubectl is installed
try {
    kubectl version --client | Out-Null
    Print-Status "kubectl is installed"
} catch {
    Print-Error "kubectl is not installed. Please install kubectl first."
    exit 1
}

# Check if connected to a cluster
try {
    kubectl cluster-info | Out-Null
    Print-Status "Connected to Kubernetes cluster"
} catch {
    Print-Error "Not connected to a Kubernetes cluster. Please configure kubectl."
    exit 1
}

# Step 1: Create Namespace
Write-Host ""
Write-Host "Step 1: Creating namespace..." -ForegroundColor Cyan
kubectl apply -f namespace.yaml
Print-Status "Namespace created"

# Step 2: Create ConfigMaps
Write-Host ""
Write-Host "Step 2: Creating ConfigMaps..." -ForegroundColor Cyan
kubectl apply -f configmap.yaml
kubectl apply -f database/mysql-init-configmap.yaml
Print-Status "ConfigMaps created"

# Step 3: Create Secrets
Write-Host ""
Write-Host "Step 3: Creating Secrets..." -ForegroundColor Cyan
Print-Warning "Make sure you have updated secrets.yaml with your actual credentials!"
$response = Read-Host "Have you updated the secrets with real values? (y/n)"
if ($response -ne "y" -and $response -ne "Y") {
    Print-Error "Please update secrets.yaml with your actual credentials before deploying"
    exit 1
}
kubectl apply -f secrets.yaml
Print-Status "Secrets created"

# Step 4: Create Persistent Volume Claims
Write-Host ""
Write-Host "Step 4: Creating Persistent Volume Claims..." -ForegroundColor Cyan
kubectl apply -f storage/mysql-pvc.yaml
kubectl apply -f storage/hardhat-pvc.yaml
Print-Status "PVCs created"

# Wait for PVCs to be bound
Write-Host "Waiting for PVCs to be bound..." -ForegroundColor Yellow
kubectl wait --for=condition=Bound pvc/mysql-pvc -n blockchain-app --timeout=120s
kubectl wait --for=condition=Bound pvc/hardhat-pvc -n blockchain-app --timeout=120s
Print-Status "PVCs are bound"

# Step 5: Deploy Database
Write-Host ""
Write-Host "Step 5: Deploying MySQL database..." -ForegroundColor Cyan
kubectl apply -f database/mysql-deployment.yaml
kubectl apply -f database/mysql-service.yaml
Print-Status "MySQL deployed"

# Wait for MySQL to be ready
Write-Host "Waiting for MySQL to be ready..." -ForegroundColor Yellow
kubectl wait --for=condition=ready pod -l app=mysql -n blockchain-app --timeout=300s
Print-Status "MySQL is ready"

# Step 6: Deploy Microservices
Write-Host ""
Write-Host "Step 6: Deploying microservices..." -ForegroundColor Cyan
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
Print-Status "Microservices deployed"

# Wait for deployments to be ready
Write-Host "Waiting for deployments to be ready..." -ForegroundColor Yellow
kubectl wait --for=condition=available deployment/auth-service -n blockchain-app --timeout=300s
kubectl wait --for=condition=available deployment/backend-nest -n blockchain-app --timeout=300s
kubectl wait --for=condition=available deployment/gateway -n blockchain-app --timeout=300s
kubectl wait --for=condition=available deployment/frontend -n blockchain-app --timeout=300s
kubectl wait --for=condition=available deployment/hardhat-node -n blockchain-app --timeout=300s
Print-Status "All deployments are ready"

# Step 7: Deploy Ingress
Write-Host ""
Write-Host "Step 7: Deploying Ingress..." -ForegroundColor Cyan
Print-Warning "Make sure NGINX Ingress Controller is installed in your cluster!"
kubectl apply -f ingress/ingress.yaml
Print-Status "Ingress deployed"

# Display deployment status
Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Deployment Summary" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Pods:" -ForegroundColor Yellow
kubectl get pods -n blockchain-app
Write-Host ""
Write-Host "Services:" -ForegroundColor Yellow
kubectl get svc -n blockchain-app
Write-Host ""
Write-Host "Ingress:" -ForegroundColor Yellow
kubectl get ingress -n blockchain-app
Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Print-Status "Deployment completed successfully!"
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Print-Warning "Next Steps:"
Write-Host "1. Get the Ingress external IP: kubectl get ingress -n blockchain-app"
Write-Host "2. Update your DNS to point to the Ingress IP"
Write-Host "3. Update NEXT_PUBLIC_API_URL in frontend-deployment.yaml with your domain"
Write-Host "4. Configure SSL/TLS with cert-manager if needed"
Write-Host ""
