#!/bin/bash

# Function to generate Prisma client for a service
generate_prisma() {
    local service=$1
    echo "Generating Prisma client for $service..."
    cd "packages/$service" && npx prisma generate && cd ../..
}

# Generate Prisma clients for each service
generate_prisma "auth-service"
generate_prisma "product-service"
generate_prisma "order-service"
generate_prisma "notification-service"
generate_prisma "payment-service"

echo "All Prisma clients have been generated!" 