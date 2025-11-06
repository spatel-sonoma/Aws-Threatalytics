# ⚡ Quick Setup Script
# Run this after deploying Lambda functions

Write-Host "🚀 Threatalytics - Quick Backend Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if AWS CLI is installed
if (!(Get-Command "aws" -ErrorAction SilentlyContinue)) {
    Write-Host "❌ AWS CLI not found. Please install AWS CLI first." -ForegroundColor Red
    exit 1
}

Write-Host "✅ AWS CLI found" -ForegroundColor Green

# Prompt for Stripe Keys
Write-Host ""
Write-Host "📝 Enter your Stripe credentials:" -ForegroundColor Yellow
$stripeSecretKey = Read-Host "Stripe Secret Key (sk_live_... or sk_test_...)"
$stripePriceStarter = Read-Host "Stripe Price ID for Starter (price_...)"
$stripePricePro = Read-Host "Stripe Price ID for Professional (price_...)"
$stripeWebhookSecret = Read-Host "Stripe Webhook Secret (whsec_...)"

# Store Stripe secret in AWS Secrets Manager
Write-Host ""
Write-Host "💾 Storing Stripe secret in AWS Secrets Manager..." -ForegroundColor Yellow

$stripeSecret = @{
    STRIPE_SECRET_KEY = $stripeSecretKey
    STRIPE_WEBHOOK_SECRET = $stripeWebhookSecret
} | ConvertTo-Json

try {
    aws secretsmanager create-secret `
        --name threatalytics/stripe `
        --secret-string $stripeSecret `
        --region us-east-1 2>$null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Stripe secret stored successfully" -ForegroundColor Green
    } else {
        # Secret might already exist, try to update
        aws secretsmanager update-secret `
            --secret-id threatalytics/stripe `
            --secret-string $stripeSecret `
            --region us-east-1
        Write-Host "✅ Stripe secret updated successfully" -ForegroundColor Green
    }
} catch {
    Write-Host "⚠️  Error storing Stripe secret: $_" -ForegroundColor Yellow
}

# Create DynamoDB tables if they don't exist
Write-Host ""
Write-Host "📦 Creating DynamoDB tables..." -ForegroundColor Yellow

# Usage Table
Write-Host "Creating ThreatalyticsUsage table..."
aws dynamodb create-table `
    --table-name ThreatalyticsUsage `
    --attribute-definitions `
        AttributeName=user_id,AttributeType=S `
        AttributeName=timestamp,AttributeType=S `
    --key-schema `
        AttributeName=user_id,KeyType=HASH `
        AttributeName=timestamp,KeyType=RANGE `
    --billing-mode PAY_PER_REQUEST `
    --region us-east-1 2>$null

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ ThreatalyticsUsage table created" -ForegroundColor Green
} else {
    Write-Host "⚠️  ThreatalyticsUsage table might already exist" -ForegroundColor Yellow
}

# Subscriptions Table
Write-Host "Creating ThreatalyticsPlans table..."
aws dynamodb create-table `
    --table-name ThreatalyticsPlans `
    --attribute-definitions `
        AttributeName=user_id,AttributeType=S `
        AttributeName=subscription_id,AttributeType=S `
    --key-schema `
        AttributeName=user_id,KeyType=HASH `
        AttributeName=subscription_id,KeyType=RANGE `
    --billing-mode PAY_PER_REQUEST `
    --region us-east-1 2>$null

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ ThreatalyticsPlans table created" -ForegroundColor Green
} else {
    Write-Host "⚠️  ThreatalyticsPlans table might already exist" -ForegroundColor Yellow
}

# Create .env file for serverless
Write-Host ""
Write-Host "📝 Creating environment configuration..." -ForegroundColor Yellow

$envContent = @"
STRIPE_PRICE_ID_STARTER=$stripePriceStarter
STRIPE_PRICE_ID_PROFESSIONAL=$stripePricePro
STRIPE_PRICE_ID_ENTERPRISE=price_enterprise_custom
ADMIN_SECRET_KEY=threatalytics-admin-$(New-Guid)
"@

$envContent | Out-File -FilePath ".env" -Encoding UTF8
Write-Host "✅ Environment file created (.env)" -ForegroundColor Green

# Summary
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ Backend Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 Next Steps:" -ForegroundColor Yellow
Write-Host "1. Deploy Lambda functions: serverless deploy" -ForegroundColor White
Write-Host "2. Configure Stripe webhook with your API Gateway URL" -ForegroundColor White
Write-Host "3. Test admin login at /admin/login.html" -ForegroundColor White
Write-Host "4. Test user subscription at /upgrade.html" -ForegroundColor White
Write-Host ""
Write-Host "🔐 Default Admin Credentials:" -ForegroundColor Yellow
Write-Host "Email: admin@threatalyticsai.com" -ForegroundColor White
Write-Host "Password: admin123" -ForegroundColor White
Write-Host ""
Write-Host "⚠️  Remember to change admin password in production!" -ForegroundColor Red
Write-Host ""
