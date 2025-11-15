#!/bin/bash

# Deployment script for InvyteOnly Backend
# Run this script on your EC2 instance after initial setup

echo "🚀 Starting deployment..."

# Navigate to project directory
cd /home/ubuntu/invyteonly-backend || exit

# Pull latest code from GitHub
echo "📥 Pulling latest code..."
git pull origin main

# Install/update dependencies
echo "📦 Installing dependencies..."
npm install --production

# Restart PM2 process
echo "🔄 Restarting application..."
pm2 restart invyteonly-backend

# Show PM2 status
echo "📊 Application status:"
pm2 status

echo "✅ Deployment complete!"

