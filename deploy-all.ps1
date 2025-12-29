# Login to Azure Container Registry
az acr login --name blockchainacr

# Build and Push Container Images
Write-Host "Building and Pushing Frontend..."
docker build -t blockchainacr.azurecr.io/frontend:latest ./frontend
docker push blockchainacr.azurecr.io/frontend:latest

Write-Host "Building and Pushing Auth Service..."
docker build -t blockchainacr.azurecr.io/auth-service:latest ./auth
docker push blockchainacr.azurecr.io/auth-service:latest

Write-Host "Building and Pushing Gateway Service..."
docker build -t blockchainacr.azurecr.io/gateway-service:latest ./gateway
docker push blockchainacr.azurecr.io/gateway-service:latest

Write-Host "Building and Pushing Backend Nest Service..."
docker build -t blockchainacr.azurecr.io/backend-nest:latest ./backend_nest
docker push blockchainacr.azurecr.io/backend-nest:latest

# Apply Kubernetes Configurations
Write-Host "Applying Kubernetes Configurations..."
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/services/

# Restart Deployments
Write-Host "Restarting Deployments..."
kubectl rollout restart deployment -n blockchain-app

Write-Host "Deployment Update Complete!"
kubectl get pods -n blockchain-app
