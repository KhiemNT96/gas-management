# Fix corrupted Node.js PATH entry (has stray " /f at the end)
$machinePath = [Environment]::GetEnvironmentVariable('PATH', 'Machine')
Write-Host "Original machine PATH (nodejs parts):"
$machinePath -split ';' | Where-Object { $_ -match 'nodejs' } | ForEach-Object { Write-Host "  $_" }

# Fix: replace the corrupted entry 'C:\Program Files\nodejs" /f' with 'C:\Program Files\nodejs'
$fixedPath = $machinePath -replace 'C:\\Program Files\\nodejs" /f', 'C:\Program Files\nodejs'
$fixedPath = $fixedPath -replace 'C:\\Program Files\\nodejs\\;', 'C:\Program Files\nodejs\;'

Write-Host "`nFixed machine PATH (nodejs parts):"
$fixedPath -split ';' | Where-Object { $_ -match 'nodejs' } | ForEach-Object { Write-Host "  $_" }

[Environment]::SetEnvironmentVariable('PATH', $fixedPath, 'Machine')

Write-Host "`nDone! Corrupted entry fixed."
Write-Host "Please RESTART VS Code and your terminal for changes to take effect."