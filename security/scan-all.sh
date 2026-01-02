#!/bin/bash

# Security scan script for all Docker images
# Uses Trivy to scan for vulnerabilities

echo "🔒 Starting security scans for all Docker images..."

IMAGES=(
  "auth-service:latest"
  "backend_nest:latest"
  "frontend:latest"
  "gateway:latest"
)

for IMAGE in "${IMAGES[@]}"; do
  echo ""
  echo "📦 Scanning $IMAGE..."
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  
  # Run Trivy scan
  docker run --rm \
    -v /var/run/docker.sock:/var/run/docker.sock \
    aquasec/trivy:latest image \
    --severity HIGH,CRITICAL \
    --format table \
    $IMAGE
    
  if [ $? -eq 0 ]; then
    echo "✅ Scan completed for $IMAGE"
  else
    echo "❌ Scan failed for $IMAGE"
  fi
done

echo ""
echo "🎉 All security scans completed!"
echo ""
echo "💡 To generate a report, use:"
echo "docker run --rm aquasec/trivy image --format json -o report.json <image-name>"
