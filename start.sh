#!/bin/bash

# Build and start all services
docker-compose up --build -d

# Wait for services to be ready
echo "Waiting for services to be ready..."
sleep 10

# Run database migrations
echo "Running database migrations..."
for service in auth-service product-service order-service notification-service payment-service; do
  echo "Running migrations for $service..."
  docker-compose exec $service npx prisma migrate deploy
done

echo "All services are up and running!"
echo "API Gateway: http://localhost"
echo "Grafana: http://localhost:3000"
echo "Prometheus: http://localhost:9090"
echo "RabbitMQ Management: http://localhost:15672" 