#!/bin/bash

# PE Rule-Out Backend Startup Script

echo "================================================"
echo "  PE Rule-Out SMART on FHIR Demo - Backend"
echo "================================================"
echo ""

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "❌ Virtual environment not found."
    echo "Please run: python3.12 -m venv venv"
    exit 1
fi

# Activate virtual environment
echo "🔄 Activating virtual environment..."
source venv/bin/activate

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "⚠️  Warning: .env file not found"
    echo "   Copy .env.example to .env and configure your Epic credentials"
    echo ""
fi

# Load model (create dummy if needed)
echo "🧠 Checking model..."
if [ ! -f "output/pe_lr_features.json" ]; then
    echo "   Model not found. Creating dummy model for demo..."
    python export_model.py
fi

# Start server
echo ""
echo "🚀 Starting FastAPI server..."
echo "   Backend API: http://localhost:8000"
echo "   API Docs:    http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop"
echo ""

uvicorn main:app --reload --port 8000

