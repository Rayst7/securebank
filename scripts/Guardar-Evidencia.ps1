# Copia capturas, videos, reportes y documentos a una carpeta única por corrida.
# Ejecutar desde el directorio raíz del repositorio.
param(
  [Parameter(Mandatory=$true)][string]$Origen,
  [Parameter(Mandatory=$true)][string]$Tipo,
  [string]$Caso = 'ejecucion'
)
$ErrorActionPreference = 'Stop'
if (-not (Test-Path $Origen)) { throw "No existe la ruta de evidencias: $Origen" }
$fecha = Get-Date -Format 'yyyyMMdd_HHmmss'
$seguro = ($Caso -replace '[^a-zA-Z0-9_-]', '_')
$carpeta = Join-Path 'reports/qa-evidence' "$fecha-$Tipo-$seguro"
New-Item -ItemType Directory -Force -Path $carpeta | Out-Null
Copy-Item -Path $Origen -Destination (Join-Path $carpeta 'artefactos') -Recurse -Force
$commit = try { (git rev-parse --short HEAD 2>$null) } catch { 'sin-git' }
$meta = @"
Fecha: $(Get-Date -Format o)
Commit: $commit
Tipo: $Tipo
Caso: $Caso
Fuente: $Origen
Resultado: PENDIENTE DE CONSIGNAR; revisar artefactos y exit code.
NOTA: revisar y retirar secretos, tokens, datos personales y cuentas reales antes de compartir.
"@
$meta | Set-Content -Path (Join-Path $carpeta 'metadata.txt') -Encoding utf8
Write-Host "Evidencia preservada en $carpeta" -ForegroundColor Green
