#!/bin/bash

# Function to install dependencies for a service
install_deps() {
    local service=$1
    echo "Installing dependencies for $service..."
    cd "packages/$service" && npm install && cd ../..
}

# Install dependencies for each service
install_deps "auth-service"
install_deps "product-service"
install_deps "order-service"
install_deps "notification-service"
install_deps "payment-service"

echo "All dependencies have been installed!" 