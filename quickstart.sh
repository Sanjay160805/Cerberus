#!/bin/bash
# SENTINEL Quick Start Script
# Automates setup and initialization

set -e

echo "🚀 SENTINEL Quick Start Setup"
echo "════════════════════════════════════════════════════════════════"

# Check Node.js
echo "✓ Checking Node.js version..."
node_version=$(node -v)
echo "  $node_version"

# Install dependencies
echo "✓ Installing dependencies..."
npm install

# Check for .env
if [ ! -f .env ]; then
  echo "⚠️  .env not found!"
  echo "  Copying .env.example → .env"
  cp .env.example .env
  echo "  IMPORTANT: Edit .env with your Hedera credentials and OpenAI API key"
  echo "  Then run: npm run dev"
  exit 0
fi

# Build TypeScript
echo "✓ Building TypeScript..."
npm run build

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env with your credentials:"
echo "   - HEDERA_ACCOUNT_ID=0.0.XXXXX"
echo "   - HEDERA_PRIVATE_KEY=302e020100..."
echo "   - OPENAI_API_KEY=sk-..."
echo ""
echo "2. Start the server:"
echo "   npm run dev"
echo ""
echo "3. Open browser to:"
echo "   http://localhost:3000"
echo ""
