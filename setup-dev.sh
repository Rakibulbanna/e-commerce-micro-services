#!/bin/bash

# Function to setup a service
setup_service() {
  local service=$1
  local port=$2
  
  echo "Setting up $service..."
  
  # Create package.json
  cat > "packages/$service/package.json" << EOF
{
  "name": "$service",
  "version": "1.0.0",
  "description": "$service for e-commerce platform",
  "main": "dist/index.js",
  "scripts": {
    "start": "node dist/index.js",
    "dev": "nodemon src/index.ts",
    "build": "tsc",
    "lint": "eslint . --ext .ts",
    "format": "prettier --write \"src/**/*.ts\""
  },
  "dependencies": {
    "@prisma/client": "^5.10.0",
    "ajv": "^8.12.0",
    "amqplib": "^0.10.3",
    "cors": "^2.8.5",
    "dotenv": "^16.4.0",
    "express": "^4.18.0",
    "express-rate-limit": "^7.1.0",
    "helmet": "^7.1.0",
    "jsonwebtoken": "^9.0.0",
    "morgan": "^1.10.0",
    "prom-client": "^15.1.0",
    "winston": "^3.11.0"
  },
  "devDependencies": {
    "@types/amqplib": "^0.10.0",
    "@types/cors": "^2.8.0",
    "@types/express": "^4.17.0",
    "@types/jsonwebtoken": "^9.0.0",
    "@types/morgan": "^1.9.0",
    "@types/node": "^20.0.0",
    "@typescript-eslint/eslint-plugin": "^7.0.0",
    "@typescript-eslint/parser": "^7.0.0",
    "eslint": "^8.0.0",
    "nodemon": "^3.0.0",
    "prettier": "^3.0.0",
    "prisma": "^5.10.0",
    "ts-node": "^10.9.0",
    "typescript": "^5.0.0"
  }
}
EOF

  # Create tsconfig.json
  cat > "packages/$service/tsconfig.json" << EOF
{
  "compilerOptions": {
    "target": "es2020",
    "module": "commonjs",
    "lib": ["es2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "declaration": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
EOF

  # Create .env
  cat > "packages/$service/.env" << EOF
PORT=$port
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/${service}_db?schema=public"
RABBITMQ_URL="amqp://localhost"
JWT_SECRET="your-secret-key"
REDIS_URL="redis://localhost:6379"
EOF

  # Install dependencies
  cd "packages/$service"
  npm install
  cd ../..
}

# Create necessary directories
mkdir -p packages/{auth-service,product-service,order-service,notification-service,payment-service}/src/{controllers,services,models,middleware,lib,routes}

# Setup each service
setup_service "auth-service" "3001"
setup_service "product-service" "3002"
setup_service "order-service" "3003"
setup_service "notification-service" "3004"
setup_service "payment-service" "3005"

echo "All services have been set up!" 