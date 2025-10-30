# Threatalytics API Testing Script (PowerShell)

param(
    [string]$ApiUrl,
    [string]$ApiKey
)

if (-not $ApiUrl -or -not $ApiKey) {
    Write-Host "Usage: .\test_endpoints.ps1 -ApiUrl <api-url> -ApiKey <api-key>"
    Write-Host "Example: .\test_endpoints.ps1 -ApiUrl https://api.threatalyticsai.com -ApiKey your-api-key"
    exit 1
}

Write-Host "Testing Threatalytics API Endpoints"
Write-Host "API URL: $ApiUrl"
Write-Host "API Key: $ApiKey"
Write-Host ""

$headers = @{
    "x-api-key" = $ApiKey
    "Content-Type" = "application/json"
}

# Test demo endpoint (no auth required)
Write-Host "Testing /demo endpoint (public)..."
try {
    $body = '{"text": "Sample threat: User accessed restricted files repeatedly"}'
    $response = Invoke-RestMethod -Uri "$ApiUrl/demo" -Method Post -Body $body -ContentType "application/json"
    if ($response.demo -and $response.analysis) {
        Write-Host "/demo: SUCCESS"
    } else {
        Write-Host "/demo: FAILED - No demo response"
    }
} catch {
    Write-Host "/demo: FAILED - $($_.Exception.Message)"
}

Write-Host ""

# Test /analyze endpoint
Write-Host "Testing /analyze endpoint..."
try {
    $body = '{"text": "User john.doe@email.com accessed restricted files 5 times in one hour"}'
    $response = Invoke-RestMethod -Uri "$ApiUrl/analyze" -Method Post -Headers $headers -Body $body
    if ($response.analysis) {
        Write-Host "/analyze: SUCCESS"
    } else {
        Write-Host "/analyze: FAILED - No analysis field"
    }
} catch {
    Write-Host "/analyze: FAILED - $($_.Exception.Message)"
}

Write-Host ""

# Test /redact endpoint
Write-Host "Testing /redact endpoint..."
try {
    $body = '{"text": "Contact John Smith at 555-123-4567 or email john.smith@company.com"}'
    $response = Invoke-RestMethod -Uri "$ApiUrl/redact" -Method Post -Headers $headers -Body $body
    if ($response.redacted) {
        Write-Host "/redact: SUCCESS"
    } else {
        Write-Host "/redact: FAILED - No redacted field"
    }
} catch {
    Write-Host "/redact: FAILED - $($_.Exception.Message)"
}

Write-Host ""

# Test /generate-report endpoint
Write-Host "Testing /generate-report endpoint..."
try {
    $body = '{"data": "Multiple failed login attempts from IP 192.168.1.100 detected over 24 hours"}'
    $response = Invoke-RestMethod -Uri "$ApiUrl/generate-report" -Method Post -Headers $headers -Body $body
    if ($response.report) {
        Write-Host "/generate-report: SUCCESS"
    } else {
        Write-Host "/generate-report: FAILED - No report field"
    }
} catch {
    Write-Host "/generate-report: FAILED - $($_.Exception.Message)"
}

Write-Host ""

# Test /simulate-drill endpoint
Write-Host "Testing /simulate-drill endpoint..."
try {
    $body = '{"scenario": "Simulate ransomware attack on employee workstations with lateral movement"}'
    $response = Invoke-RestMethod -Uri "$ApiUrl/simulate-drill" -Method Post -Headers $headers -Body $body
    if ($response.simulation) {
        Write-Host "/simulate-drill: SUCCESS"
    } else {
        Write-Host "/simulate-drill: FAILED - No simulation field"
    }
} catch {
    Write-Host "/simulate-drill: FAILED - $($_.Exception.Message)"
}

Write-Host ""
Write-Host "API Testing completed!"
Write-Host "Check AWS CloudWatch logs for detailed execution logs"
Write-Host "Check S3 bucket threatalytics-logs-{account-id} for structured logs"