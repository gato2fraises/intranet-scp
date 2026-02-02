#!/bin/bash

# Backend setup
cd backend
npm install
echo "✓ Backend dependencies installed"

# Create data directory
mkdir -p data

# Start backend dev server
echo "Starting backend server..."
npm run dev
