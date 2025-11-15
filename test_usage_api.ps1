# Test Usage API
$token = Read-Host "Enter your access token"

Write-Host "`nTesting GET /usage endpoint..." -ForegroundColor Cyan
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

try {
    $response = Invoke-RestMethod -Uri "https://authapi.threatalyticsai.com/usage" -Method GET -Headers $headers
    Write-Host "Success!" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 5
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Status Code: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
}

Write-Host "`n`nTesting POST /usage/track endpoint..." -ForegroundColor Cyan
$body = @{
    endpoint = "analyze"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "https://authapi.threatalyticsai.com/usage/track" -Method POST -Headers $headers -Body $body
    Write-Host "Success!" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 5
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Status Code: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
}
