# Quick Start Guide - Kubernetes Deployment

## Where to Run Commands

You'll run all `kubectl` commands on your **local machine** (Windows PC) where you have:
1. `kubectl` installed
2. Azure CLI (`az`) installed
3. Connection to your AKS cluster configured

## Prerequisites Setup

### 1. Install Required Tools

**Install Azure CLI:**
```powershell
# Download and install from: https://aka.ms/installazurecliwindows
# Or use winget:
winget install -e --id Microsoft.AzureCLI
```

**Install kubectl:**
```powershell
az aks install-cli
```

### 2. Connect to Your AKS Cluster

```powershell
# Login to Azure
az login

# Get AKS credentials (this configures kubectl)
az aks get-credentials --resource-group blockchain-app-rg --name blockchain-aks
```

### 3. Verify Connection

```powershell
# Check if kubectl is connected
kubectl cluster-info

# Check nodes
kubectl get nodes
```

## Before Deploying

### Step 1: Build and Push Docker Images to ACR

```powershell
# Navigate to your project
cd C:\Users\MrSavage\Desktop\MiniprojetV0

# Login to Azure Container Registry
az acr login --name yourregistryname

# Build and push auth service
cd auth
docker build -t yourregistryname.azurecr.io/auth-service:latest .
docker push yourregistryname.azurecr.io/auth-service:latest

# Build and push backend
cd ..\backend_nest
docker build -t yourregistryname.azurecr.io/backend-nest:latest .
docker push yourregistryname.azurecr.io/backend-nest:latest

# Build and push gateway
cd ..\gateway
docker build -t yourregistryname.azurecr.io/gateway:latest .
docker push yourregistryname.azurecr.io/gateway:latest

# Build and push frontend
cd ..\frontend
docker build -t yourregistryname.azurecr.io/frontend:latest .
docker push yourregistryname.azurecr.io/frontend:latest
```

### Step 2: Update Kubernetes Manifests

1. **Update image references** in all `k8s/services/*-deployment.yaml` files:
   - Replace `your-registry.azurecr.io` with your actual ACR name

2. **Update secrets** in `k8s/secrets.yaml`:
   - Base64 encode your actual credentials
   - Replace placeholder values

3. **Update domain** in `k8s/ingress/ingress.yaml`:
   - Replace `your-domain.com` with your actual domain

## Deploy to AKS

### Option 1: Use Deployment Script (Recommended)

```powershell
# Navigate to k8s directory
cd C:\Users\MrSavage\Desktop\MiniprojetV0\k8s

# Run deployment script
.\deploy.ps1
```

### Option 2: Manual Deployment

```powershell
# Navigate to k8s directory
cd C:\Users\MrSavage\Desktop\MiniprojetV0\k8s

# Apply manifests in order
kubectl apply -f namespace.yaml
kubectl apply -f configmap.yaml
kubectl apply -f database/mysql-init-configmap.yaml
kubectl apply -f secrets.yaml
kubectl apply -f storage/
kubectl apply -f database/
kubectl apply -f services/
kubectl apply -f ingress/
```

## Verify Deployment

```powershell
# Check all resources
kubectl get all -n blockchain-app

# Check pods status
kubectl get pods -n blockchain-app

# Check services
kubectl get svc -n blockchain-app

# Check ingress
kubectl get ingress -n blockchain-app

# View logs
kubectl logs -f deployment/frontend -n blockchain-app
kubectl logs -f deployment/backend-nest -n blockchain-app
```

## Dry Run (Validation)

To validate manifests WITHOUT applying them:

```powershell
cd C:\Users\MrSavage\Desktop\MiniprojetV0\k8s

# Validate all manifests
kubectl apply --dry-run=client -f namespace.yaml
kubectl apply --dry-run=client -f configmap.yaml
kubectl apply --dry-run=client -f secrets.yaml
kubectl apply --dry-run=client -f storage/
kubectl apply --dry-run=client -f database/
kubectl apply --dry-run=client -f services/
kubectl apply --dry-run=client -f ingress/
```

## Common Commands

```powershell
# Watch pod status
kubectl get pods -n blockchain-app -w

# Describe a pod
kubectl describe pod <pod-name> -n blockchain-app

# View logs
kubectl logs <pod-name> -n blockchain-app

# Execute command in pod
kubectl exec -it <pod-name> -n blockchain-app -- /bin/sh

# Port forward for testing
kubectl port-forward svc/frontend-service 3000:3000 -n blockchain-app

# Delete everything
kubectl delete namespace blockchain-app
```

## Troubleshooting

**If kubectl is not recognized:**
```powershell
# Add to PATH or use full path
$env:PATH += ";C:\Users\MrSavage\.azure-kubectl"
```

**If not connected to cluster:**
```powershell
# Re-authenticate
az login
az aks get-credentials --resource-group blockchain-app-rg --name blockchain-aks
```

**Check current context:**
```powershell
kubectl config current-context
kubectl config get-contexts
```

## Summary

> **Answer to your question:** You run `kubectl apply --dry-run=client -f k8s/` on your **local Windows machine** in PowerShell or Command Prompt, after:
> 1. Installing kubectl and Azure CLI
> 2. Logging in to Azure (`az login`)
> 3. Getting AKS credentials (`az aks get-credentials`)
> 4. Navigating to your project directory

The `k8s/` directory is now created at: `C:\Users\MrSavage\Desktop\MiniprojetV0\k8s\`
