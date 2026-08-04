#!/bin/bash

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/deploy-env.sh"
require_ssh_pass

# 🚀 Deploy Parenta to Hostinger Shared Hosting
# Based on your stagecards.com deployment pattern

set -e  # Exit on any error

echo "🚀 Deploy Parenta to Hostinger Shared Hosting"
echo "================================================"
echo ""
echo "⚠️  IMPORTANT: Before running this script:"
echo "   1. Enable Node.js 18 in hPanel (https://hpanel.hostinger.com/)"
echo "   2. Go to: Websites → parenta.com.mx → Advanced → Node.js"
echo "   3. Create Node.js application"
echo ""
echo "SSH: uses SSH_PASS from scripts/.deploy-secrets (not printed)"
echo ""
echo "Press ENTER to continue..."
read

# SSH Details
REMOTE_PATH="domains/parenta.com.mx"
APP_NAME="parenta-app"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo -e "${BLUE}📍 Current directory: $(pwd)${NC}"
echo ""

# Verify we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: Not in Next.js project root (package.json not found)${NC}"
    echo "Please run from: /Users/adrianestopace/Documents/oneph/parenta-nextjs"
    exit 1
fi

echo -e "${GREEN}✅ Confirmed: In correct directory${NC}"
echo ""

# Build the application
echo "=========================================="
echo -e "${BLUE}PHASE 1: Building Application${NC}"
echo "=========================================="
echo ""

echo -e "${YELLOW}Building Next.js application...${NC}"
npm run build

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Build successful${NC}"
else
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
fi
echo ""

# Create deployment package
echo "=========================================="
echo -e "${BLUE}PHASE 2: Creating Deployment Package${NC}"
echo "=========================================="
echo ""

DEPLOY_DIR="deploy-package"
rm -rf $DEPLOY_DIR
mkdir -p $DEPLOY_DIR

echo -e "${YELLOW}Copying files to deployment package...${NC}"

# Copy necessary files
cp -r .next $DEPLOY_DIR/
cp -r public $DEPLOY_DIR/
cp -r src $DEPLOY_DIR/
cp package.json $DEPLOY_DIR/
cp package-lock.json $DEPLOY_DIR/
cp next.config.ts $DEPLOY_DIR/
cp tsconfig.json $DEPLOY_DIR/
cp .env.production $DEPLOY_DIR/.env.production

# Create server.js for standalone mode
cat > $DEPLOY_DIR/server.js << 'SERVERJS'
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const dev = false;
const hostname = process.env.HOSTNAME || 'localhost';
const port = process.env.PORT || 3030;

const app = next({ dev, hostname, port, dir: __dirname });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  })
  .listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://${hostname}:${port}`);
  })
  .on('error', (err) => {
    console.error('Server error:', err);
    process.exit(1);
  });
});
SERVERJS

# Create package.json with correct start script
cat > $DEPLOY_DIR/package.json << 'PACKAGEJSON'
{
  "name": "parenta-nextjs",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev -p 3030",
    "build": "next build",
    "start": "node server.js",
    "lint": "next lint"
  },
  "dependencies": {
    "@types/archiver": "^6.0.3",
    "@types/bcryptjs": "^2.4.6",
    "@types/pg": "^8.15.4",
    "@types/qrcode": "^1.5.5",
    "archiver": "^7.0.1",
    "bcryptjs": "^3.0.2",
    "chart.js": "^4.4.9",
    "clsx": "^2.1.1",
    "date-fns": "^4.1.0",
    "date-fns-tz": "^3.2.0",
    "lucide-react": "^0.513.0",
    "next": "15.3.3",
    "next-auth": "^4.24.11",
    "pg": "^8.16.0",
    "qrcode": "^1.5.4",
    "react": "^19.0.0",
    "react-chartjs-2": "^5.3.0",
    "react-dom": "^19.0.0",
    "react-hot-toast": "^2.5.2",
    "recharts": "^2.15.3",
    "tailwind-merge": "^3.3.0"
  }
}
PACKAGEJSON

echo -e "${GREEN}✅ Deployment package created${NC}"
echo ""

# Upload files via SCP
echo "=========================================="
echo -e "${BLUE}PHASE 3: Uploading Files to Server${NC}"
echo "=========================================="
echo ""

echo -e "${YELLOW}Creating remote application directory...${NC}"
sshpass -p "$SSH_PASS" ssh -p $SSH_PORT ${SSH_USER}@${SSH_HOST} "mkdir -p ${REMOTE_PATH}/nodejs-app"

echo -e "${YELLOW}Uploading deployment package...${NC}"
echo -e "${YELLOW}This may take a few minutes...${NC}"
echo ""

cd $DEPLOY_DIR
tar -czf ../parenta-app.tar.gz .
cd ..

sshpass -p "$SSH_PASS" scp -P $SSH_PORT parenta-app.tar.gz ${SSH_USER}@${SSH_HOST}:${REMOTE_PATH}/nodejs-app/

echo -e "${GREEN}✅ Files uploaded${NC}"
echo ""

# Extract and setup on server
echo "=========================================="
echo -e "${BLUE}PHASE 4: Setting Up Application on Server${NC}"
echo "=========================================="
echo ""

sshpass -p "$SSH_PASS" ssh -p $SSH_PORT ${SSH_USER}@${SSH_HOST} << 'ENDSSH'
cd domains/parenta.com.mx/nodejs-app

echo "📦 Extracting files..."
tar -xzf parenta-app.tar.gz
rm parenta-app.tar.gz

echo "✅ Files extracted"
echo ""

echo "🔍 Checking Node.js availability..."
if command -v node &> /dev/null; then
    node --version
    npm --version
    echo "✅ Node.js is available"
else
    echo "⚠️  Node.js not found in PATH"
    echo ""
    echo "=========================================="
    echo "⚠️  REQUIRED: Enable Node.js in hPanel"
    echo "=========================================="
    echo ""
    echo "Steps:"
    echo "1. Go to: https://hpanel.hostinger.com/"
    echo "2. Select: parenta.com.mx"
    echo "3. Advanced → Node.js"
    echo "4. Create Node.js Application:"
    echo "   - Application Root: domains/parenta.com.mx/nodejs-app"
    echo "   - Application URL: https://parenta.com.mx"
    echo "   - Application Startup File: server.js"
    echo "   - Node.js Version: 18 or higher"
    echo ""
    echo "5. After creating, run: npm install"
    echo "6. Then start the application in hPanel"
    echo ""
    exit 1
fi

echo ""
echo "📦 Installing dependencies..."
npm install --production

if [ $? -eq 0 ]; then
    echo "✅ Dependencies installed"
else
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo ""
echo "✅ Application setup complete!"
echo ""
echo "=========================================="
echo "Next Steps in hPanel:"
echo "=========================================="
echo "1. Go to: https://hpanel.hostinger.com/"
echo "2. Websites → parenta.com.mx → Advanced → Node.js"
echo "3. Click 'Restart' or 'Start' application"
echo "4. Add environment variables if not done"
echo "5. Test at: https://parenta.com.mx"

ENDSSH

echo ""
echo "=========================================="
echo -e "${GREEN}🎉 DEPLOYMENT COMPLETE!${NC}"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Go to hPanel: https://hpanel.hostinger.com/"
echo "2. Navigate to: Websites → parenta.com.mx → Advanced → Node.js"
echo ""
echo "If Node.js app not created yet:"
echo "   - Click 'Create Application'"
echo "   - Application Root: domains/parenta.com.mx/nodejs-app"
echo "   - Startup File: server.js"
echo "   - Node.js Version: 18+"
echo ""
echo "Then:"
echo "   - Add Environment Variables (DATABASE_URL, NEXTAUTH_SECRET, etc.)"
echo "   - Click 'Restart' to start the app"
echo "   - Test at: https://parenta.com.mx"
echo ""
echo "✅ All files uploaded successfully!"
echo ""

# Cleanup
rm -rf deploy-package
rm -f parenta-app.tar.gz

echo -e "${GREEN}✅ Cleanup complete${NC}"
echo ""

