# Deploy Subscription Manager
Write-Host "Deploying subscriptionManager Lambda function..." -ForegroundColor Cyan

cd E:\SONOMA\Aws-Threatalytics

# Deploy the function
serverless deploy function -f subscriptionManager --verbose

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✓ Deployment successful!" -ForegroundColor Green
    Write-Host "`nNow test the payment flow:" -ForegroundColor Yellow
    Write-Host "1. Click 'Upgrade Now' on any plan" -ForegroundColor White
    Write-Host "2. Complete payment on Stripe" -ForegroundColor White
    Write-Host "3. You'll be redirected back with session_id" -ForegroundColor White
    Write-Host "4. Database will update automatically" -ForegroundColor White
    Write-Host "`nOr use the manual verification tool:" -ForegroundColor Yellow
    Write-Host "start manual-verify-payment.html" -ForegroundColor Cyan
} else {
    Write-Host "`n✗ Deployment failed!" -ForegroundColor Red
    Write-Host "Check the error above" -ForegroundColor Red
}
