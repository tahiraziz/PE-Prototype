#!/bin/bash

# PE Rule-Out Frontend Startup Script

echo "================================================"
echo "  PE Rule-Out SMART on FHIR Demo - Frontend"
echo "================================================"
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "❌ Node modules not found."
    echo "Please run: npm install"
    exit 1
fi

# Start development server
echo "🚀 Starting Vite development server..."
echo "   Frontend UI: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop"
echo ""

npm run dev

