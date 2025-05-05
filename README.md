# E-commerce Microservices Platform

A scalable e-commerce platform built with microservices architecture.

## Services

- **Auth Service**: User authentication and authorization
- **Product Service**: Product catalog and inventory management
- **Order Service**: Order processing and management
- **Notification Service**: Email and SMS notifications
- **Payment Service**: Payment processing with Stripe
- **API Gateway**: Nginx-based API gateway with load balancing

## Tech Stack

- **Backend**: Node.js, Express
- **Database**: PostgreSQL with Prisma ORM
- **Message Broker**: RabbitMQ
- **Cache**: Redis
- **API Gateway**: Nginx
- **Monitoring**: Prometheus, Grafana
- **Containerization**: Docker
- **CI/CD**: GitHub Actions

## Prerequisites

- Docker and Docker Compose
- Node.js 18+
- npm
- OpenSSL
- htpasswd (apache2-utils)

## Setup

1. Clone the repository:

   ```bash
   git clone https://github.com/yourusername/e-commerce.git
   cd e-commerce
   ```

2. Make the setup script executable:

   ```bash
   chmod +x setup.sh
   ```

3. Run the setup script:

   ```bash
   ./setup.sh
   ```

4. Configure environment variables:
   - Copy `.env.example` to `.env` in each service directory
   - Update the values in each `.env` file

## Development

1. Start all services:

   ```bash
   docker-compose up -d
   ```

2. View logs:

   ```bash
   docker-compose logs -f [service-name]
   ```

3. Access services:
   - API Gateway: http://localhost
   - Grafana: http://localhost:3000
   - Prometheus: http://localhost:9090
   - RabbitMQ Management: http://localhost:15672

## API Documentation

### Auth Service

- POST /api/auth/register - Register a new user
- POST /api/auth/login - User login
- GET /api/auth/profile - Get user profile

### Product Service

- GET /api/products - List products
- GET /api/products/:id - Get product details
- POST /api/products - Create product (admin only)
- PUT /api/products/:id - Update product (admin only)

### Order Service

- POST /api/orders - Create order
- GET /api/orders/:id - Get order details
- GET /api/orders/user/orders - Get user orders
- PATCH /api/orders/:id/status - Update order status

### Notification Service

- POST /api/notifications/email - Send email
- POST /api/notifications/sms - Send SMS
- GET /api/notifications/history - Get notification history

### Payment Service

- POST /api/payments/create - Create payment
- GET /api/payments/:id - Get payment status
- POST /api/payments/webhook - Stripe webhook

## Monitoring

The platform includes comprehensive monitoring with Prometheus and Grafana:

1. **Metrics**: Each service exposes Prometheus metrics at `/metrics`
2. **Dashboards**: Pre-configured Grafana dashboards for:
   - Service health
   - Order processing
   - Payment processing
   - Notification delivery
   - System resources

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
