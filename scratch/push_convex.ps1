$cfgPath = Join-Path $env:USERPROFILE ".convex\config.json"
$cfg = Get-Content $cfgPath | ConvertFrom-Json
$tok = $cfg.accessToken
Write-Host "Token: $($tok.Substring(0,20))..."

# Try Convex Big Brain API (the one the CLI uses)
$headers = @{ 
    "Authorization" = "Bearer $tok"
    "Content-Type" = "application/json"
}

# Get projects
try {
    $resp = Invoke-WebRequest -Uri "https://api.convex.dev/api/0.1.0/instances/enchanted-hamster-869/deploy_key" -Headers $headers -UseBasicParsing
    Write-Host "Deploy key response: $($resp.Content)"
} catch {
    Write-Host "Error: $($_.Exception.Response.StatusCode) - $_"
}

# Try the dashboard API
try {
    $resp2 = Invoke-WebRequest -Uri "https://console.convex.dev/api/instances/enchanted-hamster-869" -Headers $headers -UseBasicParsing
    Write-Host "Dashboard response: $($resp2.Content.Substring(0,[Math]::Min(500,$resp2.Content.Length)))"
} catch {
    Write-Host "Dashboard error: $($_.Exception.Response.StatusCode)"
}
