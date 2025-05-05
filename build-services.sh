#!/bin/bash

# Function to build and push a service
build_service() {
    local service=$1
    local port=$2
    
    echo "Building $service..."
    
    # Build the service image
    docker build \
        --build-arg PORT=$port \
        -t localhost:5000/$service:latest \
        -f packages/$service/Dockerfile \
        packages/$service
    
    # Push to local registry
    docker push localhost:5000/$service:latest
    
    echo "$service built and pushed successfully"
}

# Build and push each service
build_service "auth-service" "3001"
build_service "product-service" "3002"
build_service "order-service" "3003"
build_service "notification-service" "3004"
build_service "payment-service" "3005"

echo "All services have been built and pushed to the local registry!" 