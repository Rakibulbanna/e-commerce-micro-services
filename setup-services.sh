#!/bin/bash

# Function to setup a service
setup_service() {
  local service=$1
  echo "Setting up $service..."
  
  cd "packages/$service"
  
  # Install dependencies
  npm install
  
  # Generate Prisma client if schema exists
  if [ -f "prisma/schema.prisma" ]; then
    npx prisma generate
  fi
  
  # Build the service
  npm run build
  
  cd ../..
}

# Create necessary directories
mkdir -p packages/{auth-service,product-service,order-service,notification-service,payment-service}/src/{controllers,services,models,middleware,lib,routes}

# Setup each service
setup_service "auth-service"
setup_service "product-service"
setup_service "order-service"
setup_service "notification-service"
setup_service "payment-service"

echo "All services have been set up!" 