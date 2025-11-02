#!/bin/bash

# Financial Management System - Setup Script
# This script helps you set up the system quickly

echo "🚀 Financial Management System - Setup"
echo "======================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Node.js is installed
echo "Checking prerequisites..."
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi
echo -e "${GREEN}✓ Node.js installed:${NC} $(node --version)"

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo -e "${RED}❌ PostgreSQL is not installed${NC}"
    echo "Please install PostgreSQL from https://www.postgresql.org/download/"
    exit 1
fi
echo -e "${GREEN}✓ PostgreSQL installed:${NC} $(psql --version | head -n 1)"

echo ""
echo "Setting up environment..."

# Check if .env exists, if not copy from .env.example
if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        cp .env.example .env
        echo -e "${GREEN}✓ Created .env file from .env.example${NC}"
        echo -e "${YELLOW}⚠ Please edit .env file with your database credentials${NC}"
        echo ""
        read -p "Press enter to continue once you've configured .env..."
    else
        echo -e "${RED}❌ .env.example not found${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✓ .env file exists${NC}"
fi

echo ""
echo "Installing backend dependencies..."
npm install
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to install backend dependencies${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Backend dependencies installed${NC}"

echo ""
echo "Installing frontend dependencies..."
cd client
npm install
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to install frontend dependencies${NC}"
    exit 1
fi
cd ..
echo -e "${GREEN}✓ Frontend dependencies installed${NC}"

echo ""
echo "Database setup..."
echo "Do you want to create and initialize the database? (y/n)"
read -p "> " setup_db

if [ "$setup_db" = "y" ] || [ "$setup_db" = "Y" ]; then
    # Source .env to get database credentials
    if [ -f .env ]; then
        export $(cat .env | grep -v '^#' | xargs)
    fi

    echo "Creating database '$DB_NAME'..."
    createdb -U $DB_USER $DB_NAME 2>/dev/null
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Database created${NC}"
    else
        echo -e "${YELLOW}⚠ Database might already exist or check your credentials${NC}"
    fi

    echo "Initializing database schema..."
    npm run init-db
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Database initialized successfully${NC}"
    else
        echo -e "${RED}❌ Failed to initialize database${NC}"
        echo "Please run: npm run init-db"
        exit 1
    fi
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ Setup Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "To start the application:"
echo "  ${YELLOW}npm run dev${NC}"
echo ""
echo "Then open your browser to:"
echo "  ${YELLOW}http://localhost:3000${NC}"
echo ""
echo "For detailed instructions, see:"
echo "  - QUICKSTART.md (quick setup guide)"
echo "  - README.md (full documentation)"
echo "  - PROJECT_SUMMARY.md (project overview)"
echo ""
echo "Happy invoicing! 🎉"



