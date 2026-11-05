<# Ejecuta pruebas reales contra un vhost RabbitMQ QA aislado.
   Conserva logs y metadatos. Nunca guarda credenciales ni URLs en el reporte. #>
$ErrorActionPreference = 'Stop'
if ($env:QA_DB_ISOLATED -ne 'YES') { throw 'Debes definir QA_DB_ISOLATED=YES' }
if (-not $env:QA_RABBITMQ_URL) { throw 'Debes definir QA_RABBITMQ_URL' }
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$stamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$evidence = Join-Path $root "reports\qa-evidence\$stamp-rabbitmq"
New-Item -ItemType Directory -Force -Path $evidence | Out-Null
$start = Get-Date
Push-Location (Join-Path $root 'backend')
try {
    # cmd centraliza stderr/stdout evitando NativeCommandError de PowerShell 5.1.
    & cmd.exe /d /s /c 'npx.cmd tsx scripts\qa-rabbitmq-real.ts 2>&1' |
        ForEach-Object { $_.ToString() } |
        Tee-Object -FilePath (Join-Path $evidence 'consola.log')
    $code = $LASTEXITCODE
} finally { Pop-Location }
if ($null -eq $code) { $code = 1 }
$sha = (& git -C $root rev-parse --short HEAD 2>$null)
@"
Tipo=RabbitMQ integracion real (vhost securebank_qa)
Inicio=$($start.ToString('o'))
Fin=$((Get-Date).ToString('o'))
Commit=$sha
ExitCode=$code
Nota=La DLQ QA conserva un mensaje sintético tras PASS. Nunca subir tokens ni contraseñas.
"@ | Set-Content -Path (Join-Path $evidence 'metadata.txt') -Encoding UTF8
Write-Host "Evidencia: $evidence ; ExitCode=$code"
if ($code -ne 0) { exit $code }
