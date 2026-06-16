# Fix User PATH - remove wrong npm entries
$userPath = [Environment]::GetEnvironmentVariable('PATH', 'User')
Write-Host "Current User PATH contains node_modules entries:"
$userPath -split ';' | Where-Object { $_ -match 'node_modules' } | ForEach-Object { Write-Host "  $_" }

# Remove wrong npm bin entries from User PATH
$fixedPath = $userPath -replace 'C:\\Program Files\\nodejs\\node_modules\\npm\\bin;', ''
$fixedPath = $fixedPath -replace 'C:\\Program Files\\nodejs\\node_modules\\npm\\bin', ''
$fixedPath = $fixedPath -replace ';+', ';'
$fixedPath = $fixedPath.TrimEnd(';')

[Environment]::SetEnvironmentVariable('PATH', $fixedPath, 'User')
Write-Host "`nFixed! Wrong npm entries have been removed from User PATH."
Write-Host "Please close and reopen your terminal/VS Code for changes to take effect."