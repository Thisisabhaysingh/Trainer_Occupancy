#!/bin/bash

# Production Deployment Script for MIS Application
# This script builds and prepares the application for production deployment

set -e

echo "🚀 MIS Application Production Build Script"
echo "==========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${RED}Error: .env file not found!${NC}"
    echo "Please create a .env file with required environment variables."
    exit 1
fi

# Check if client/.env exists
if [ ! -f client/.env ]; then
    echo -e "${RED}Error: client/.env file not found!${NC}"
    echo "Please create client/.env with VITE_API_BASE_URL"
    exit 1
fi

echo -e "${GREEN}✓ Environment files found${NC}"

# Install server dependencies
echo -e "${YELLOW}Installing server dependencies...${NC}"
npm install --only=production

# Install client dependencies and build
echo -e "${YELLOW}Installing client dependencies and building...${NC}"
cd client
npm install
npm run build
cd ..

# Create logs directory if it doesn't exist
echo -e "${YELLOW}Creating logs directory...${NC}"
mkdir -p logs

echo -e "${GREEN}✓ Production build completed successfully!${NC}"
echo ""
echo "📦 Files ready for deployment:"
echo "  - Built frontend in: client/dist/"
echo "  - Server files ready"
echo "  - Logs directory created"
echo ""
echo "🚀 Deployment options:"
echo "  1. Using PM2: pm2 start ecosystem.config.js"
echo "  2. Using Docker: docker-compose up -d --build"
echo "  3. Using Node directly: NODE_ENV=production npm start"
echo ""
echo "🔧 Environment variables needed:"
echo "  - NODE_ENV=production"
echo "  - PORT (optional, defaults to 5001)"
echo "  - Database connection variables"
echo "  - JWT_SECRET and SESSION_SECRET"
