$machinePath = [Environment]::GetEnvironmentVariable('PATH', 'Machine')
$fixedPath = $machinePath -replace 'C:\\Program Files\\nodejs\\node_modules\\npm\\bin;', ''
$fixedPath = $fixedPath -replace 'C:\\Program Files\\nodejs\\node_modules\\npm\\bin', ''
[Environment]::SetEnvironmentVariable('PATH', $fixedPath, 'Machine')

$userPath = [Environment]::GetEnvironmentVariable('PATH', 'User')
Write-Host "User PATH length: $($userPath.Length)"
Write-Host "Path contains wrong npm entry: $($userPath.Contains('node_modules\npm\bin'))"