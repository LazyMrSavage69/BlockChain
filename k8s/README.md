# Kubernetes Deployment for Azure Kubernetes Service (AKS)

This directory contains production-ready Kubernetes manifests for deploying the blockchain microservices application to Azure Kubernetes Service (AKS).

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [Detailed Deployment Steps](#detailed-deployment-steps)
- [Configuration](#configuration)
- [Troubleshooting](#troubleshooting)
- [Scaling](#scaling)
- [Monitoring](#monitoring)

## 🔧 Prerequisites

Before deploying, ensure you have:

1. **Azure Account** with an active subscription
2. **Azure CLI** installed and configured
3. **kubectl** installed and configured
4. **Docker** installed for building images
5. **Azure Container Registry (ACR)** or another container registry
6. **AKS Cluster** created and running
7. **NGINX Ingress Controller** installed in your AKS cluster

### Install NGINX Ingress Controller

```bash
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.1/deploy/static/provider/cloud/deploy.yaml
```

### Create AKS Cluster (if not already created)

```bash
# Create resource group
az group create --name blockchain-app-rg --location eastus

# Create AKS cluster
az aks create \
  --resource-group blockchain-app-rg \
  --name blockchain-aks \
  --node-count 3 \
  --node-vm-size Standard_D2s_v3 \
  --enable-managed-identity \
  --generate-ssh-keys

# Get credentials
az aks get-credentials --resource-group blockchain-app-rg --name blockchain-aks
```

## 🏗️ Architecture

The application consists of the following microservices:

- **Frontend** (Next.js) - User interface on port 3000
- **Gateway** (Go) - API Gateway on port 8000
- **Auth Service** (Go) - Authentication service on port 3060
- **Backend NestJS** - Main backend service on port 5000
- **MySQL** - Database for auth service
- **Hardhat Node** - Blockchain node on port 8545
- **Supabase** - External managed database (not deployed in cluster)

## 🚀 Quick Start

### 1. Build and Push Docker Images

First, create an Azure Container Registry:

```bash
# Create ACR
az acr create --resource-group blockchain-app-rg --name yourregistryname --sku Basic

# Login to ACR
az acr login --name yourregistryname

# Get ACR login server
az acr show --name yourregistryname --query loginServer --output table
```

Build and push images:

```bash
# Build and push auth service
cd ../auth
docker build -t yourregistryname.azurecr.io/auth-service:latest .
docker push yourregistryname.azurecr.io/auth-service:latest

# Build and push backend
cd ../backend_nest
docker build -t yourregistryname.azurecr.io/backend-nest:latest .
docker push yourregistryname.azurecr.io/backend-nest:latest

# Build and push gateway
cd ../gateway
docker build -t yourregistryname.azurecr.io/gateway:latest .
docker push yourregistryname.azurecr.io/gateway:latest

# Build and push frontend
cd ../frontend
docker build -t yourregistryname.azurecr.io/frontend:latest .
docker push yourregistryname.azurecr.io/frontend:latest
```

### 2. Configure AKS to Access ACR

```bash
az aks update --resource-group blockchain-app-rg --name blockchain-aks --attach-acr yourregistryname
```

### 3. Update Image References

Update all deployment files in `services/` directory to use your ACR images:

```yaml
image: yourregistryname.azurecr.io/service-name:latest
```

### 4. Configure Secrets

Create secrets with your actual credentials:

```bash
# Base64 encode your values
echo -n 'your-mysql-password' | base64
echo -n 'your-jwt-secret' | base64
echo -n 'https://your-project.supabase.co' | base64
echo -n 'your-supabase-anon-key' | base64
echo -n 'sk_live_your-stripe-key' | base64
echo -n 'whsec_your-webhook-secret' | base64
```

Update `secrets.yaml` with the base64-encoded values.

### 5. Deploy to AKS

**On Windows (PowerShell):**
```powershell
cd k8s
.\deploy.ps1
```

**On Linux/Mac (Bash):**
```bash
cd k8s
chmod +x deploy.sh
./deploy.sh
```

## 📝 Detailed Deployment Steps

### Step 1: Namespace

Creates an isolated namespace for all resources:

```bash
kubectl apply -f namespace.yaml
```

### Step 2: ConfigMaps

Deploy configuration for all services:

```bash
kubectl apply -f configmap.yaml
kubectl apply -f database/mysql-init-configmap.yaml
```

### Step 3: Secrets

Deploy sensitive credentials:

```bash
kubectl apply -f secrets.yaml
```

### Step 4: Storage

Create persistent volumes for MySQL and Hardhat:

```bash
kubectl apply -f storage/mysql-pvc.yaml
kubectl apply -f storage/hardhat-pvc.yaml
```

### Step 5: Database

Deploy MySQL with persistent storage:

```bash
kubectl apply -f database/mysql-deployment.yaml
kubectl apply -f database/mysql-service.yaml
```

Wait for MySQL to be ready:

```bash
kubectl wait --for=condition=ready pod -l app=mysql -n blockchain-app --timeout=300s
```

### Step 6: Microservices

Deploy all application services:

```bash
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
```

### Step 7: Ingress

Deploy Ingress for external access:

```bash
kubectl apply -f ingress/ingress.yaml
```

## ⚙️ Configuration

### Environment Variables

Update `configmap.yaml` to modify non-sensitive configuration:

- Service URLs
- Ports
- Node environment
- Feature flags

### Secrets

Update `secrets.yaml` with your actual credentials:

- MySQL passwords
- JWT secret
- Supabase credentials
- Stripe API keys

### Domain Configuration

Update `ingress/ingress.yaml` with your domain:

```yaml
spec:
  rules:
  - host: your-domain.com  # Replace with your domain
```

Then update `services/frontend-deployment.yaml`:

```yaml
- name: NEXT_PUBLIC_API_URL
  value: "https://your-domain.com"  # Replace with your domain
```

## 🔍 Troubleshooting

### Check Pod Status

```bash
kubectl get pods -n blockchain-app
kubectl describe pod <pod-name> -n blockchain-app
kubectl logs <pod-name> -n blockchain-app
```

### Check Services

```bash
kubectl get svc -n blockchain-app
```

### Check Ingress

```bash
kubectl get ingress -n blockchain-app
kubectl describe ingress app-ingress -n blockchain-app
```

### Common Issues

**Pods in CrashLoopBackOff:**
- Check logs: `kubectl logs <pod-name> -n blockchain-app`
- Verify secrets are correctly configured
- Ensure database is ready before dependent services start

**ImagePullBackOff:**
- Verify ACR is attached to AKS
- Check image names are correct
- Ensure images are pushed to ACR

**Ingress not working:**
- Verify NGINX Ingress Controller is installed
- Check Ingress external IP: `kubectl get ingress -n blockchain-app`
- Verify DNS is pointing to Ingress IP

### Access Logs

```bash
# Auth service logs
kubectl logs -f deployment/auth-service -n blockchain-app

# Backend logs
kubectl logs -f deployment/backend-nest -n blockchain-app

# Gateway logs
kubectl logs -f deployment/gateway -n blockchain-app

# Frontend logs
kubectl logs -f deployment/frontend -n blockchain-app

# MySQL logs
kubectl logs -f statefulset/mysql -n blockchain-app
```

## 📊 Scaling

### Manual Scaling

```bash
# Scale frontend
kubectl scale deployment frontend --replicas=3 -n blockchain-app

# Scale backend
kubectl scale deployment backend-nest --replicas=3 -n blockchain-app

# Scale gateway
kubectl scale deployment gateway --replicas=3 -n blockchain-app
```

### Auto-scaling (HPA)

Create Horizontal Pod Autoscaler:

```bash
kubectl autoscale deployment frontend --cpu-percent=70 --min=2 --max=10 -n blockchain-app
kubectl autoscale deployment backend-nest --cpu-percent=70 --min=2 --max=10 -n blockchain-app
kubectl autoscale deployment gateway --cpu-percent=70 --min=2 --max=10 -n blockchain-app
```

## 📈 Monitoring

### View Resource Usage

```bash
kubectl top pods -n blockchain-app
kubectl top nodes
```

### Azure Monitor

Enable Container Insights for your AKS cluster:

```bash
az aks enable-addons --resource-group blockchain-app-rg --name blockchain-aks --addons monitoring
```

## 🔒 SSL/TLS Configuration

### Install cert-manager

```bash
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml
```

### Create ClusterIssuer

```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: your-email@example.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
```

Then uncomment TLS section in `ingress/ingress.yaml`.

## 🧹 Cleanup

To remove all resources:

```bash
kubectl delete namespace blockchain-app
```

To delete the entire AKS cluster:

```bash
az aks delete --resource-group blockchain-app-rg --name blockchain-aks --yes --no-wait
az group delete --name blockchain-app-rg --yes --no-wait
```

## 📚 Additional Resources

- [AKS Documentation](https://docs.microsoft.com/en-us/azure/aks/)
- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [NGINX Ingress Controller](https://kubernetes.github.io/ingress-nginx/)
- [cert-manager Documentation](https://cert-manager.io/docs/)

## 🆘 Support

For issues or questions:
1. Check pod logs
2. Review Kubernetes events: `kubectl get events -n blockchain-app`
3. Verify all prerequisites are met
4. Ensure all configuration values are correct
