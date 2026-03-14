#!/bin/bash

echo "🚀 AgentRAG - Quick Start Script"
echo "================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if .env exists in backend
if [ ! -f "backend/.env" ]; then
    echo -e "${YELLOW}⚠️  backend/.env not found${NC}"
    echo "Creating from template..."
    cat > backend/.env << 'EOF'
MONGODB_URI=mongodb://localhost:27017/agentrag
PORT=3000
NODE_ENV=development
PINECONE_API_KEY=your-pinecone-api-key-here
PINECONE_INDEX_NAME=agentrag-notes
GEMINI_API_KEY=your-gemini-api-key-here
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
RAG_SERVICE_URL=http://localhost:8000
CORS_ORIGIN=http://localhost:5173
EOF
    echo -e "${GREEN}✅ Created backend/.env${NC}"
    echo -e "${YELLOW}⚠️  Please edit backend/.env and add your API keys${NC}"
else
    echo -e "${GREEN}✅ backend/.env exists${NC}"
fi

# Check if .env exists in frontend
if [ ! -f "frontend/.env" ]; then
    echo "Creating frontend/.env..."
    echo "VITE_API_BASE_URL=http://localhost:3000/api" > frontend/.env
    echo -e "${GREEN}✅ Created frontend/.env${NC}"
else
    echo -e "${GREEN}✅ frontend/.env exists${NC}"
fi

# Check if .env exists in RAG
if [ ! -f "backend/RAG/.env" ]; then
    echo -e "${YELLOW}⚠️  backend/RAG/.env not found${NC}"
    echo "Creating from template..."
    cat > backend/RAG/.env << 'EOF'
GROQ_API_KEY=your-groq-api-key-here
GEMINI_API_KEY=your-gemini-api-key-here
SERPER_API_KEY=your-serper-api-key-here
RAG_SERVICE_PORT=8000
RAG_SERVICE_HOST=0.0.0.0
EOF
    echo -e "${GREEN}✅ Created backend/RAG/.env${NC}"
    echo -e "${YELLOW}⚠️  Please edit backend/RAG/.env and add your API keys${NC}"
else
    echo -e "${GREEN}✅ backend/RAG/.env exists${NC}"
fi

echo ""
echo "📦 Installing dependencies..."
echo ""

# Install backend dependencies
echo "Installing backend dependencies..."
cd backend && npm install
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Backend dependencies installed${NC}"
else
    echo -e "${RED}❌ Failed to install backend dependencies${NC}"
    exit 1
fi

cd ..

# Install frontend dependencies
echo "Installing frontend dependencies..."
cd frontend && npm install
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Frontend dependencies installed${NC}"
else
    echo -e "${RED}❌ Failed to install frontend dependencies${NC}"
    exit 1
fi

cd ..

# Setup Python virtual environment
echo "Setting up Python RAG service..."
cd backend/RAG

if [ ! -d "venv" ]; then
    python3 -m venv venv
    echo -e "${GREEN}✅ Python virtual environment created${NC}"
fi

source venv/bin/activate
pip install -r requirements.txt > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Python dependencies installed${NC}"
else
    echo -e "${RED}❌ Failed to install Python dependencies${NC}"
    exit 1
fi

cd ../..

echo ""
echo -e "${GREEN}🎉 Setup complete!${NC}"
echo ""
echo "📝 Next steps:"
echo "1. Edit backend/.env and add your API keys"
echo "2. Edit backend/RAG/.env and add your API keys"
echo "3. Start MongoDB (if using local)"
echo "4. Run: npm run dev (in backend directory)"
echo "5. Run: python api.py (in backend/RAG directory with venv activated)"
echo "6. Run: npm run dev (in frontend directory)"
echo ""
echo "📖 See README.md for full documentation"
