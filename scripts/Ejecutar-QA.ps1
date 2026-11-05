<#
 Ejecutar desde PowerShell: .\scripts\Ejecutar-QA.ps1 -Tipo api
 Perfiles: unit, api, web, audit-backend, audit-frontend, load, stress, spike.
 Requiere servidores/servicios levantados y variables locales QA configuradas.
 Usa exit code real del comando. Los logs pueden contener datos sensibles: revisar antes de compartir.
#>
param(
  [ValidateSet('unit','api','web','audit-backend','audit-frontend','load','stress','spike')]
  [Parameter(Mandatory=$true)]
  [string]$Tipo
)
$ErrorActionPreference = 'Stop'
$root = Resolve-Path (Join-Path $PSScriptRoot '..')
Push-Location $root
try {
  $stamp = Get-Date -Format 'yyyyMMdd_HHmmss'
  $dir = Join-Path 'reports/qa-evidence' "$stamp-$Tipo"
  New-Item -Path $dir -ItemType Directory -Force | Out-Null
  $log = Join-Path (Join-Path $root $dir) 'consola.log'
  $env:QA_API_URL = if ($env:QA_API_URL) { $env:QA_API_URL } else { 'http://127.0.0.1:3000' }
  $env:QA_WEB_URL = if ($env:QA_WEB_URL) { $env:QA_WEB_URL } else { 'http://127.0.0.1:5173' }
  $exe = ''
  $argv = @()
  switch ($Tipo) {
    'unit' { Push-Location backend; $exe='npm.cmd'; $argv=@('run','test:cov','--','--runInBand') }
    'api' { $exe='node.exe'; $argv=@('--test','tests/api/bank.api.test.mjs') }
    'web' { $exe='npx.cmd'; $argv=@('cypress','run') }
    'audit-backend' { Push-Location backend; $exe='npm.cmd'; $argv=@('audit','--json') }
    'audit-frontend' { Push-Location frontend; $exe='npm.cmd'; $argv=@('audit','--json') }
    'load' { $env:QA_MODE='load'; $exe='k6.exe'; $argv=@('run','--summary-export',"$dir/summary.json",'tests/performance/securebank.js') }
    'stress' { $env:QA_MODE='stress'; $exe='k6.exe'; $argv=@('run','--summary-export',"$dir/summary.json",'tests/performance/securebank.js') }
    'spike' { $env:QA_MODE='spike'; $exe='k6.exe'; $argv=@('run','--summary-export',"$dir/summary.json",'tests/performance/securebank.js') }
  }
  $started = Get-Date
  Write-Host "[$Tipo] Ejecutando: $exe $($argv -join ' ')" -ForegroundColor Cyan
  try {
    # En Windows PowerShell 5.1, la salida stderr de Node.js (p. ej. ExperimentalWarning)
    # puede convertirse en NativeCommandError si ErrorActionPreference='Stop'.
    # La tratamos como salida registrable, SIN ocultar el codigo de salida real.
    $prevErrorActionPreference = $ErrorActionPreference
    try {
      $ErrorActionPreference = 'Continue'
      & $exe @argv 2>&1 |
        ForEach-Object { $_.ToString() } |
        Tee-Object -FilePath $log
      $exitCode = $LASTEXITCODE
      if ($null -eq $exitCode) { $exitCode = 1 }
    }
    finally {
      $ErrorActionPreference = $prevErrorActionPreference
    }
  }
  finally {
    if ($Tipo -in @('unit','audit-backend','audit-frontend')) { Pop-Location }
  }
  $sha = (git rev-parse HEAD 2>$null)
  @"
Tipo=$Tipo
Inicio=$($started.ToString('o'))
Fin=$((Get-Date).ToString('o'))
Commit=$sha
ExitCode=$exitCode
NOTA=No mostrar logs completos sin revisar tokens y credenciales.
"@ | Set-Content -Path (Join-Path (Join-Path $root $dir) 'metadata.txt') -Encoding UTF8
  Write-Host "Evidencia en $dir ; exit code $exitCode" -ForegroundColor Yellow
  exit $exitCode
} finally { Pop-Location }
