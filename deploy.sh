#!/bin/bash

# MIS Application Deployment Script
# This script automates the deployment process

set -e

echo "🚀 MIS Application Deployment Script"
echo "====================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${RED}Error: .env file not found!${NC}"
    echo "Please create a .env file with required environment variables."
    echo "See DOCKER_DEPLOYMENT.md for details."
    exit 1
fi

# Check if client/.env exists
if [ ! -f client/.env ]; then
    echo -e "${RED}Error: client/.env file not found!${NC}"
    echo "Please create client/.env with VITE_API_BASE_URL"
    exit 1
fi

echo -e "${GREEN}✓ Environment files found${NC}"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker is not installed!${NC}"
    echo "Please install Docker first."
    exit 1
fi

echo -e "${GREEN}✓ Docker is installed${NC}"

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}Error: Docker Compose is not installed!${NC}"
    echo "Please install Docker Compose first."
    exit 1
fi

echo -e "${GREEN}✓ Docker Compose is installed${NC}"

# Stop existing containers
echo -e "${YELLOW}Stopping existing containers...${NC}"
docker-compose down

# Build and start containers
echo -e "${YELLOW}Building and starting containers...${NC}"
docker-compose up -d --build

# Wait for services to be healthy
echo -e "${YELLOW}Waiting for services to start...${NC}"
sleep 10

# Check container status
echo -e "${YELLOW}Checking container status...${NC}"
docker-compose ps

# Show logs
echo -e "${GREEN}Deployment complete!${NC}"
echo ""
echo "📊 View logs with: docker-compose logs -f"
echo "🌐 Frontend: http://localhost"
echo "🔌 Backend: http://localhost:5000"
echo ""
echo "To initialize database, run:"
echo "  docker exec -it mis-backend node create_departments.js"
echo "  docker exec -it mis-backend node create_manager.js"
