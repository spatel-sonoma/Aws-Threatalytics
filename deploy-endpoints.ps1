# Threatalytics Deployment Script (PowerShell)
# Run this script to deploy all endpoints

Write-Host "🚀 Threatalytics Deployment Script" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan
Write-Host ""

# Check if AWS credentials are configured
Write-Host "Checking AWS credentials..." -ForegroundColor Yellow
$awsCheck = aws sts get-caller-identity 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ AWS credentials not configured!" -ForegroundColor Red
    Write-Host "Run: aws configure" -ForegroundColor Yellow
    exit 1
}
Write-Host "✅ AWS credentials found" -ForegroundColor Green
Write-Host ""

# Check if Cognito credentials are set (optional for first deployment)
Write-Host "Checking environment variables..." -ForegroundColor Yellow
if (-not $env:COGNITO_USER_POOL_ID) {
    Write-Host "⚠️  COGNITO_USER_POOL_ID not set (required for auth endpoints)" -ForegroundColor Yellow
    Write-Host "   Continue with basic deployment? (Y/N)" -ForegroundColor Yellow
    $response = Read-Host
    if ($response -ne "Y" -and $response -ne "y") {
        exit 0
    }
}
Write-Host ""

# Deploy serverless
Write-Host "📦 Deploying serverless stack..." -ForegroundColor Cyan
serverless deploy

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Deployment successful!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Next Steps:" -ForegroundColor Cyan
    Write-Host "1. Copy API Gateway URLs from above" -ForegroundColor White
    Write-Host "2. Update website/index.html with the base URL" -ForegroundColor White
    Write-Host "3. Update website/auth.js with the base URL" -ForegroundColor White
    Write-Host ""
    
    if (-not $env:COGNITO_USER_POOL_ID) {
        Write-Host "⚠️  To enable authentication:" -ForegroundColor Yellow
        Write-Host "1. Follow AWS_SETUP_AUTHENTICATION.md to create Cognito" -ForegroundColor White
        Write-Host "2. Set environment variables (COGNITO_USER_POOL_ID, COGNITO_CLIENT_ID)" -ForegroundColor White
        Write-Host "3. Run: serverless deploy (again)" -ForegroundColor White
        Write-Host ""
    }
} else {
    Write-Host ""
    Write-Host "❌ Deployment failed!" -ForegroundColor Red
    Write-Host "Check errors above for details" -ForegroundColor Yellow
    exit 1
}
