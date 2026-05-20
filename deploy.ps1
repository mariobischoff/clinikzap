# deploy.ps1
# Script to automate deployment of ClinikZap to Hetzner VPS

# Load environment variables from .env.prod
if (Test-Path .env.prod) {
    Get-Content .env.prod | Where-Object { $_ -match '=' -and $_ -notmatch '^#' } | ForEach-Object {
        $parts = $_.Split('=', 2)
        $name = $parts[0].Trim()
        $value = $parts[1].Trim().Trim('"').Trim("'")
        Set-Variable -Name $name -Value $value -Scope Script -ErrorAction SilentlyContinue
    }
}

if (-not $VPS_IP) {
    Write-Error "VPS_IP not found in .env.prod file!"
    exit 1
}

Write-Host "1. Packaging application..." -ForegroundColor Green
if (Test-Path clinikzap.tar.gz) {
    Remove-Item clinikzap.tar.gz
}
# Exclude node_modules, .next, git, env files, and tarball from package
tar --exclude="node_modules" --exclude=".next" --exclude=".git" --exclude="clinikzap.tar.gz" --exclude=".env.prod" --exclude=".env" -czf clinikzap.tar.gz *

Write-Host "2. Uploading package and environment files to VPS ($VPS_IP)..." -ForegroundColor Green
ssh -o StrictHostKeyChecking=no root@${VPS_IP} "mkdir -p /root/clinikzap"
scp -o StrictHostKeyChecking=no clinikzap.tar.gz root@${VPS_IP}:/root/
scp -o StrictHostKeyChecking=no .env.prod root@${VPS_IP}:/root/clinikzap/.env

Write-Host "3. Extracting and building on VPS..." -ForegroundColor Green
ssh -o StrictHostKeyChecking=no root@${VPS_IP} "tar -xzf /root/clinikzap.tar.gz -C /root/clinikzap && cd /root/clinikzap && docker compose -f docker-compose.prod.yml up -d --build"

Write-Host "4. Cleaning up local package..." -ForegroundColor Green
Remove-Item clinikzap.tar.gz

Write-Host "Deployment completed successfully!" -ForegroundColor Cyan
