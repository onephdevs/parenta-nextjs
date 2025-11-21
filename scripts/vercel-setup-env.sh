#!/bin/bash

# ========================================
# Vercel Environment Variables Setup Script
# ========================================
# This script helps you add all required environment variables to Vercel via CLI
# ========================================

echo ""
echo "🚀 Vercel Environment Variables Setup"
echo "======================================"
echo ""
echo "This script will guide you through adding all 8 environment variables to Vercel."
echo ""

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found!"
    echo ""
    echo "Install it with:"
    echo "  npm install -g vercel"
    echo ""
    exit 1
fi

echo "✅ Vercel CLI found"
echo ""

# Check if logged in
if ! vercel whoami &> /dev/null; then
    echo "⚠️  Not logged in to Vercel"
    echo ""
    echo "Logging you in..."
    vercel login
    echo ""
fi

echo "✅ Logged in to Vercel"
echo ""

# Prompt for which environments
echo "Which environments do you want to configure?"
echo "1) Production only"
echo "2) Production + Preview + Development (recommended)"
echo ""
read -p "Enter choice (1 or 2): " env_choice

case $env_choice in
    1)
        ENVS="production"
        ;;
    2)
        ENVS="production preview development"
        ;;
    *)
        echo "Invalid choice. Using Production + Preview + Development"
        ENVS="production preview development"
        ;;
esac

echo ""
echo "📝 Will add variables to: $ENVS"
echo ""
echo "Press Enter to continue..."
read

# Function to add env var
add_env() {
    local var_name=$1
    local var_description=$2
    local is_optional=$3
    
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "➡️  Adding: $var_name"
    echo "    $var_description"
    
    if [ "$is_optional" = "true" ]; then
        echo "    (Optional - press Ctrl+C to skip)"
    fi
    
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    # Add the environment variable
    vercel env add "$var_name" $ENVS
    
    if [ $? -eq 0 ]; then
        echo "✅ Added $var_name successfully"
    else
        echo "⚠️  Failed to add $var_name (may already exist)"
    fi
}

echo ""
echo "🔑 REQUIRED VARIABLES (5)"
echo "========================="
echo ""

# 1. DATABASE_URL
add_env "DATABASE_URL" \
    "PostgreSQL connection string from Supabase" \
    false

# 2. NEXTAUTH_SECRET
add_env "NEXTAUTH_SECRET" \
    "Authentication secret (generate with: openssl rand -base64 32)" \
    false

# 3. NEXTAUTH_URL
add_env "NEXTAUTH_URL" \
    "Your app URL (e.g., https://parenta-nextjs.vercel.app)" \
    false

# 4. NODE_ENV
add_env "NODE_ENV" \
    "Environment type (production)" \
    false

# 5. PORT
add_env "PORT" \
    "Port number (3030)" \
    false

echo ""
echo "📧 OPTIONAL - EMAIL VARIABLES (3)"
echo "=================================="
echo ""
echo "These are needed for email notifications (payment reminders, etc.)"
echo "Press Ctrl+C to skip if you don't want email features yet."
echo ""
read -p "Press Enter to continue or Ctrl+C to skip..." 

# 6. GMAIL_USER
add_env "GMAIL_USER" \
    "Your Gmail address" \
    true

# 7. GMAIL_APP_PASSWORD
add_env "GMAIL_APP_PASSWORD" \
    "Gmail App Password (from Google Account settings)" \
    true

# 8. EMAIL_FROM
add_env "EMAIL_FROM" \
    "Display name for sent emails" \
    true

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ SETUP COMPLETE!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Summary:"
echo "  ✅ Environment variables added to: $ENVS"
echo ""
echo "🚀 Next Steps:"
echo "  1. Deploy to production:"
echo "     vercel --prod"
echo ""
echo "  2. Check your deployment:"
echo "     vercel ls"
echo ""
echo "  3. View environment variables:"
echo "     vercel env ls"
echo ""
echo "  4. Test your app at the Vercel URL"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

