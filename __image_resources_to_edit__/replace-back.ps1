$ErrorActionPreference = 'Stop'

$packRoot = $PSScriptRoot
$repoRoot = Split-Path -Parent $packRoot

$files = Get-ChildItem -LiteralPath $packRoot -Recurse -File | Where-Object {
  $_.FullName -ne $PSCommandPath
}

foreach ($f in $files) {
  $relativePath = $f.FullName.Substring($packRoot.Length).TrimStart('\')
  $destPath = Join-Path $repoRoot $relativePath
  $destDir = Split-Path -Parent $destPath
  New-Item -ItemType Directory -Path $destDir -Force | Out-Null
  Copy-Item -LiteralPath $f.FullName -Destination $destPath -Force
}

Write-Host ("Replaced files: {0}" -f $files.Count)
