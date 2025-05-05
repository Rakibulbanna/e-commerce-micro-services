#!/bin/bash

# Function to build a service
build_service() {
    local service=$1
    echo "Building $service..."
    cd "packages/$service" && npm run build && cd ../..
}

# Build each service
build_service "auth-service"
build_service "product-service"
build_service "order-service"
build_service "notification-service"
build_service "payment-service"

echo "All services have been built!" 