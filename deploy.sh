#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

echo "🚀 Starting deployment to Firebase..."

# Check if firebase CLI is installed
if ! npx firebase --version &> /dev/null
then
    echo "❌ Firebase CLI could not be found."
    echo "Please install it using: npm install -g firebase-tools or run npm install"
    exit 1
fi

echo "📦 Building the project using Vite..."
npx vite build

echo "✅ Build successful!"

echo "☁️ Deploying to Firebase Hosting..."
# If you haven't logged in, run 'npx firebase login' first
# If you haven't initialized the project, run 'npx firebase use --add' to select your project
npx firebase deploy --only hosting

echo "🎉 Deployment complete!"
