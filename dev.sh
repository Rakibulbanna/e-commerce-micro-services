#!/bin/bash

# Function to start a service
start_service() {
    local service=$1
    echo "Starting $service..."
    cd "packages/$service" && npm run dev &
    cd ../..
}

# Start each service
start_service "auth-service"
start_service "product-service"
start_service "order-service"
start_service "notification-service"
start_service "payment-service"

# Wait for all background processes to complete
wait

echo "All services have been started!" 