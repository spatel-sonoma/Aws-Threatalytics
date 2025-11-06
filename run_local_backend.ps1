# 🚀 Run Local Backend and Test
# Complete guide to run and test the backend locally

Write-Host "=" -NoNewline; Write-Host ("=" * 69)
Write-Host "🚀 Threatalytics Local Backend Testing" -ForegroundColor Cyan
Write-Host "=" -NoNewline; Write-Host ("=" * 69)

Write-Host "`n📋 Step-by-Step Guide:" -ForegroundColor Yellow
Write-Host ""

# Step 1: Set environment variables
Write-Host "STEP 1: Setting environment variables..." -ForegroundColor Green
$env:AWS_DEFAULT_REGION = "us-east-1"
$env:ADMIN_SECRET_KEY = "threatalytics-admin-secret-2025"

Write-Host "   ✅ AWS_DEFAULT_REGION = us-east-1" -ForegroundColor Green
Write-Host "   ✅ ADMIN_SECRET_KEY = threatalytics-admin-secret-2025" -ForegroundColor Green

# Optional: Set API keys if you want to test those endpoints
$openaiKey = $env:OPENAI_API_KEY
$stripeKey = $env:STRIPE_SECRET_KEY

if ($openaiKey) {
    Write-Host "   ✅ OPENAI_API_KEY is set" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  OPENAI_API_KEY not set (Analyze/Redact/Report/Drill endpoints won't work)" -ForegroundColor Yellow
}

if ($stripeKey) {
    Write-Host "   ✅ STRIPE_SECRET_KEY is set" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  STRIPE_SECRET_KEY not set (Subscription endpoints won't work)" -ForegroundColor Yellow
}

Write-Host "`nSTEP 2: Starting local API server..." -ForegroundColor Green
Write-Host "   Server will run on http://localhost:8000" -ForegroundColor Cyan
Write-Host "   Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host ""

# Start the server
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; `$env:AWS_DEFAULT_REGION='us-east-1'; `$env:ADMIN_SECRET_KEY='threatalytics-admin-secret-2025'; python local_api_server.py"

Write-Host "   ⏳ Waiting for server to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

Write-Host "`n✅ Server should be running now!" -ForegroundColor Green
Write-Host ""
Write-Host "=" -NoNewline; Write-Host ("=" * 69)
Write-Host "🧪 Testing Endpoints" -ForegroundColor Cyan
Write-Host "=" -NoNewline; Write-Host ("=" * 69)

# Test 1: Admin Login
Write-Host "`nTest 1: Admin Login" -ForegroundColor Yellow
Write-Host "----------------------------------------------------------------------"

try {
    $loginBody = @{
        action = "login"
        email = "admin@threatalyticsai.com"
        password = "admin123"
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "http://localhost:8000/admin/auth" `
        -Method POST `
        -Body $loginBody `
        -ContentType "application/json" `
        -ErrorAction Stop
    
    Write-Host "✅ Status: SUCCESS" -ForegroundColor Green
    Write-Host "Response:" -ForegroundColor Cyan
    $response | ConvertTo-Json -Depth 5 | Write-Host
    
    # Save token for other tests
    $global:authToken = $response.token
    
} catch {
    Write-Host "❌ Failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2: Verify Token
if ($global:authToken) {
    Write-Host "`nTest 2: Verify Token" -ForegroundColor Yellow
    Write-Host "----------------------------------------------------------------------"
    
    try {
        $verifyBody = @{
            action = "verify_token"
            token = $global:authToken
        } | ConvertTo-Json
        
        $response = Invoke-RestMethod -Uri "http://localhost:8000/admin/auth" `
            -Method POST `
            -Body $verifyBody `
            -ContentType "application/json" `
            -ErrorAction Stop
        
        Write-Host "✅ Status: SUCCESS" -ForegroundColor Green
        Write-Host "Token is valid!" -ForegroundColor Green
        
    } catch {
        Write-Host "❌ Failed: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Test 3: Usage Tracker (if AWS is configured)
Write-Host "`nTest 3: Usage Tracker" -ForegroundColor Yellow
Write-Host "----------------------------------------------------------------------"

try {
    $usageBody = @{
        action = "get"
        user_id = "test-user-123"
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "http://localhost:8000/usage" `
        -Method POST `
        -Body $usageBody `
        -ContentType "application/json" `
        -ErrorAction Stop
    
    Write-Host "✅ Status: SUCCESS" -ForegroundColor Green
    Write-Host "Response:" -ForegroundColor Cyan
    $response | ConvertTo-Json -Depth 5 | Write-Host
    
} catch {
    Write-Host "⚠️  Skipped: Requires AWS DynamoDB connection" -ForegroundColor Yellow
    Write-Host "   To enable: Configure AWS credentials with 'aws configure'" -ForegroundColor Gray
}

Write-Host "`n" + ("=" * 70)
Write-Host "✅ Testing Complete!" -ForegroundColor Green
Write-Host ("=" * 70)

Write-Host "`n📚 Available Endpoints:" -ForegroundColor Cyan
Write-Host ""
Write-Host "   🔐 Admin Auth:       POST http://localhost:8000/admin/auth"
Write-Host "   🔍 Threat Analysis:  POST http://localhost:8000/analyze"
Write-Host "   🔒 PII Redaction:    POST http://localhost:8000/redact"
Write-Host "   📊 Generate Report:  POST http://localhost:8000/report"
Write-Host "   🎯 Simulate Drill:   POST http://localhost:8000/drill"
Write-Host "   📈 Usage Tracker:    POST http://localhost:8000/usage"
Write-Host "   💳 Subscription:     POST http://localhost:8000/subscription"

Write-Host "`n💡 Quick Commands:" -ForegroundColor Cyan
Write-Host ""
Write-Host "   # Test admin login again:"
Write-Host "   `$body = @{action='login';email='admin@threatalyticsai.com';password='admin123'} | ConvertTo-Json"
Write-Host "   Invoke-RestMethod -Uri 'http://localhost:8000/admin/auth' -Method POST -Body `$body -ContentType 'application/json'"
Write-Host ""
Write-Host "   # Open in browser:"
Write-Host "   start http://localhost:8000"
Write-Host ""

Write-Host "🔧 To stop the server: Close the server window or press Ctrl+C in it" -ForegroundColor Yellow
Write-Host ""
