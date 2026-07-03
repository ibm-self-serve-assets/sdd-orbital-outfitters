# Orbital Suppliers — AI-Powered Space Gear Store

A full-stack retail website with agentic product search powered by watsonx Orchestrate.

## Architecture

```
frontend/     React + Vite UI (port 5173)
backend/      Express API server (port 3001)
vector-db/    ChromaDB embeddings + Node.js embed script
agent/        watsonx Orchestrate agent (deploy separately)
rancher/      Docker Compose for containerized deployment
```

## Quick Start (Native)

### Prerequisites
- Node.js 20+
- Python 3.11+
- PostgreSQL (remote IBM Cloud — credentials in `.env`)

### 1. Set up Python venv
```bash
python3 -m venv venv
source venv/bin/activate
pip install chromadb psycopg2-binary python-dotenv
```

### 2. Seed the database
```bash
source venv/bin/activate
python backend/db/seed.py
```

### 3. Start ChromaDB + embed products
```bash
# Terminal 1
source venv/bin/activate
chroma run --path ./vector-db/chroma-data

# Terminal 2 (after ChromaDB is running)
cd vector-db && npm install && node embed.js
```

### 4. Start the backend
```bash
cd backend && npm install
npm start
# API: http://localhost:3001
# Swagger: http://localhost:3001/api-docs
```

### 5. Start the frontend
```bash
cd frontend && npm install
npm run dev
# UI: http://localhost:5173
```

## Quick Start (Containers)
```bash
./rancher/up.sh
# Frontend: http://localhost:5173
# Backend:  http://localhost:3001
# ChromaDB: http://localhost:8000
```

## Quick Start (OpenShift)
```bash
./openshift/deploy.sh prod
# App: https://<OCP_APP_HOSTNAME>
```

## Test Credentials
- Email: `james.smith@email.com`
- Password: `password`

## Key Features
- Product catalog with 175 space-themed items
- Shopping cart + checkout with JWT auth
- Order history
- AI-powered agentic product search (watsonx Orchestrate)
- Natural language search with vector similarity (ChromaDB + all-MiniLM-L6-v2)
