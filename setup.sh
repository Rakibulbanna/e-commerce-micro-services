#!/bin/bash

# Create necessary directories
mkdir -p nginx/ssl
mkdir -p prometheus
mkdir -p grafana/provisioning/dashboards

# Generate SSL certificates for development
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/server.key \
  -out nginx/ssl/server.crt \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"

# Create .htpasswd for metrics authentication
htpasswd -bc /etc/nginx/.htpasswd admin admin123

# Create environment files for each service
for service in auth-service product-service order-service notification-service payment-service; do
  cp packages/$service/.env.example packages/$service/.env
done

# Install dependencies for all services
for service in auth-service product-service order-service notification-service payment-service; do
  echo "Installing dependencies for $service..."
  cd packages/$service
  npm install
  cd ../..
done

# Generate Prisma client for services using Prisma
for service in auth-service product-service order-service notification-service payment-service; do
  if [ -f "packages/$service/prisma/schema.prisma" ]; then
    echo "Generating Prisma client for $service..."
    cd packages/$service
    npx prisma generate
    cd ../..
  fi
done

# Start the services
echo "Starting services..."
docker-compose up -d

# Wait for services to be ready
echo "Waiting for services to be ready..."
sleep 10

# Run database migrations
for service in auth-service product-service order-service notification-service payment-service; do
  if [ -f "packages/$service/prisma/schema.prisma" ]; then
    echo "Running migrations for $service..."
    cd packages/$service
    npx prisma migrate deploy
    cd ../..
  fi
done

echo "Setup completed! Services are running at:"
echo "API Gateway: http://localhost"
echo "Grafana: http://localhost:3000"
echo "Prometheus: http://localhost:9090"
echo "RabbitMQ Management: http://localhost:15672" 