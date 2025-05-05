#!/bin/bash

# Function to run database migrations for a service
migrate_db() {
    local service=$1
    echo "Running database migrations for $service..."
    cd "packages/$service" && npx prisma migrate dev --name init && cd ../..
}

# Run database migrations for each service
migrate_db "auth-service"
migrate_db "product-service"
migrate_db "order-service"
migrate_db "notification-service"
migrate_db "payment-service"

echo "All database migrations have been completed!" 