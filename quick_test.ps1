# Quick Test Script for Lambda Functions (PowerShell)
# Run: .\quick_test.ps1

Write-Host "=" -NoNewline; Write-Host ("=" * 69)
Write-Host "🧪 Threatalytics Lambda Function Tests" -ForegroundColor Cyan
Write-Host "=" -NoNewline; Write-Host ("=" * 69)

# Check if Python is available
try {
    $pythonVersion = python --version 2>&1
    Write-Host "`n✅ Python: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "`n❌ Python not found. Please install Python first." -ForegroundColor Red
    exit 1
}

# Check environment variables
Write-Host "`n🔧 Environment Variables:" -ForegroundColor Yellow
$envVars = @(
    "OPENAI_API_KEY",
    "STRIPE_SECRET_KEY",
    "ADMIN_SECRET_KEY"
)

foreach ($var in $envVars) {
    $value = [Environment]::GetEnvironmentVariable($var)
    if ($value) {
        Write-Host "   ✅ $var is set" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  $var not set (some tests may fail)" -ForegroundColor Yellow
    }
}

# Set default admin secret if not set
if (-not $env:ADMIN_SECRET_KEY) {
    $env:ADMIN_SECRET_KEY = "threatalytics-admin-secret-2025"
    Write-Host "`n💡 Using default ADMIN_SECRET_KEY for testing" -ForegroundColor Cyan
}

Write-Host "`n" + ("=" * 70)
Write-Host "Test 1: Admin Authentication" -ForegroundColor Yellow
Write-Host ("=" * 70)

Write-Host "`nRunning test_admin_auth_local.py..."
python test_admin_auth_local.py

Write-Host "`n" + ("=" * 70)
Write-Host "Test 2: Usage Tracker" -ForegroundColor Yellow
Write-Host ("=" * 70)

Write-Host "`nRunning test_usage_local.py..."
python test_usage_local.py

Write-Host "`n" + ("=" * 70)
Write-Host "✅ All Tests Complete!" -ForegroundColor Green
Write-Host ("=" * 70)

Write-Host "`n💡 Next Steps:" -ForegroundColor Cyan
Write-Host "   1. Start local API server: python local_api_server.py"
Write-Host "   2. Test with HTTP requests"
Write-Host "   3. Deploy to AWS: serverless deploy"
Write-Host ""
