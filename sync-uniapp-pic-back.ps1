$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$editRoot = Join-Path $projectRoot "uniapp-pic"
$srcRoot = Join-Path $projectRoot "natu-uniapp\src\static"
$distRoot = Join-Path $projectRoot "natu-uniapp\dist\dev\mp-weixin\static"

if (-not (Test-Path $editRoot)) {
  throw "Folder not found: $editRoot"
}

if (-not (Test-Path $srcRoot)) {
  throw "Folder not found: $srcRoot"
}

$files = Get-ChildItem $editRoot -Recurse -File | Where-Object {
  $_.Extension -match '^\.(png|jpe?g|gif|webp|svg|bmp|ico)$'
}

$mappingPath = Join-Path $editRoot "_mapping.txt"
$files | Sort-Object FullName | ForEach-Object {
  $relative = $_.FullName.Replace($editRoot + "\", "")
  "uniapp-pic\$relative => natu-uniapp\src\static\$relative"
} | Set-Content -Encoding UTF8 $mappingPath

$copiedToSrc = 0
$copiedToDist = 0
$hasDist = Test-Path $distRoot

foreach ($file in $files) {
  $relative = $file.FullName.Replace($editRoot + "\", "")

  $srcTarget = Join-Path $srcRoot $relative
  $srcDir = Split-Path $srcTarget -Parent
  if (-not (Test-Path $srcDir)) {
    New-Item -ItemType Directory -Path $srcDir -Force | Out-Null
  }
  Copy-Item $file.FullName $srcTarget -Force
  $copiedToSrc++

  if ($hasDist) {
    $distTarget = Join-Path $distRoot $relative
    $distDir = Split-Path $distTarget -Parent
    if (-not (Test-Path $distDir)) {
      New-Item -ItemType Directory -Path $distDir -Force | Out-Null
    }
    Copy-Item $file.FullName $distTarget -Force
    $copiedToDist++
  }
}

Write-Output "Copied to src: $copiedToSrc"
if ($hasDist) {
  Write-Output "Copied to dist: $copiedToDist"
} else {
  Write-Output "Dist folder not found, skipped dist sync."
}
Write-Output "Mapping updated: $mappingPath"
