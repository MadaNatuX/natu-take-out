$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$editRoot = Join-Path $projectRoot "vue3-pic"

if (-not (Test-Path $editRoot)) {
  throw "Folder not found: $editRoot"
}

$targets = @{
  "src-assets" = Join-Path $projectRoot "natu-vue3\src\assets"
  "public" = Join-Path $projectRoot "natu-vue3\public"
}

foreach ($key in $targets.Keys) {
  if (-not (Test-Path $targets[$key])) {
    throw "Folder not found: $($targets[$key])"
  }
}

$files = Get-ChildItem $editRoot -Recurse -File | Where-Object {
  $_.Extension -match '^\.(png|jpe?g|gif|webp|svg|bmp|ico)$'
}

$mappingPath = Join-Path $editRoot "_mapping.txt"
$copied = 0

function Get-TargetRelativePath {
  param (
    [string]$Prefix,
    [string]$Relative
  )

  if ($Prefix -eq "src-assets") {
    return "natu-vue3\src\assets\$Relative"
  }

  return "natu-vue3\public\$Relative"
}

$files | Sort-Object FullName | ForEach-Object {
  $relativeToEdit = $_.FullName.Replace($editRoot + "\", "")
  $parts = $relativeToEdit -split '[\\/]'
  $prefix = $parts[0]
  $relative = ($parts | Select-Object -Skip 1) -join "\"

  if (-not $targets.ContainsKey($prefix)) {
    throw "Unknown asset group: $prefix"
  }

  "vue3-pic\$relativeToEdit => $(Get-TargetRelativePath -Prefix $prefix -Relative $relative)"
} | Set-Content -Encoding UTF8 $mappingPath

foreach ($file in $files) {
  $relativeToEdit = $file.FullName.Replace($editRoot + "\", "")
  $parts = $relativeToEdit -split '[\\/]'
  $prefix = $parts[0]
  $relative = ($parts | Select-Object -Skip 1) -join "\"

  if (-not $targets.ContainsKey($prefix)) {
    throw "Unknown asset group: $prefix"
  }

  $target = Join-Path $targets[$prefix] $relative
  $targetDir = Split-Path $target -Parent
  if (-not (Test-Path $targetDir)) {
    New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
  }

  Copy-Item $file.FullName $target -Force
  $copied++
}

Write-Output "Copied: $copied"
Write-Output "Mapping updated: $mappingPath"
