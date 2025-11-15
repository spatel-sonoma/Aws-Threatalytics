# Deploy Stripe and Usage Fixes
# Run this script to deploy all updated Lambda functions

Write-Host "=== Deploying Stripe & Usage Tracking Fixes ===" -ForegroundColor Cyan
Write-Host ""

# Navigate to project directory
cd e:\SONOMA\Aws-Threatalytics

Write-Host "1. Deploying subscriptionManager Lambda..." -ForegroundColor Yellow
serverless deploy function -f subscriptionManager
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✓ subscriptionManager deployed successfully" -ForegroundColor Green
} else {
    Write-Host "   ✗ subscriptionManager deployment failed" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "2. Deploying stripeWebhook Lambda..." -ForegroundColor Yellow
serverless deploy function -f stripeWebhook
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✓ stripeWebhook deployed successfully" -ForegroundColor Green
} else {
    Write-Host "   ✗ stripeWebhook deployment failed" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "3. Deploying usageTracker Lambda..." -ForegroundColor Yellow
serverless deploy function -f usageTracker
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✓ usageTracker deployed successfully" -ForegroundColor Green
} else {
    Write-Host "   ✗ usageTracker deployment failed" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=== Deployment Complete ===" -ForegroundColor Green
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "1. Test plan selection (Starter $29, Professional $99, Enterprise $499)"
Write-Host "2. Complete a test payment"
Write-Host "3. Verify plan updates in database"
Write-Host "4. Check usage tracking works correctly"
Write-Host ""
Write-Host "Documentation: See STRIPE_USAGE_FIXES.md for detailed testing guide"
