$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$projectRoot = [System.IO.Path]::GetFullPath((Split-Path -Parent $PSScriptRoot))
$archivePath = [System.IO.Path]::GetFullPath((Join-Path $projectRoot 'RunaMarca-teste.zip'))
$temporaryPath = [System.IO.Path]::GetFullPath((Join-Path $projectRoot 'RunaMarca-teste.new.zip'))
if ((Split-Path -Parent $archivePath) -ne $projectRoot -or (Split-Path -Parent $temporaryPath) -ne $projectRoot) {
  throw 'O pacote precisa permanecer na pasta do projeto.'
}

$rootFiles = @('.dockerignore', '.gitignore', 'ANDAMENTO.md', 'COMO_TESTAR.md', 'Dockerfile', 'HOSPEDAGEM.md', 'INICIAR_WINDOWS.bat', 'package.json', 'README.md', 'server.js')
$files = foreach ($name in $rootFiles) { Get-Item -LiteralPath (Join-Path $projectRoot $name) }
foreach ($folder in @('public', 'scripts', 'test')) {
  $files += Get-ChildItem -LiteralPath (Join-Path $projectRoot $folder) -File -Recurse
}

if (Test-Path -LiteralPath $temporaryPath) { Remove-Item -LiteralPath $temporaryPath -Force }
$archive = [System.IO.Compression.ZipFile]::Open($temporaryPath, [System.IO.Compression.ZipArchiveMode]::Create)
try {
  foreach ($file in $files) {
    $relative = $file.FullName.Substring($projectRoot.Length + 1).Replace('\', '/')
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive, $file.FullName, $relative, [System.IO.Compression.CompressionLevel]::Optimal) | Out-Null
  }
} finally { $archive.Dispose() }

$check = [System.IO.Compression.ZipFile]::OpenRead($temporaryPath)
try {
  foreach ($required in @('server.js', 'Dockerfile', 'HOSPEDAGEM.md', 'public/editor.html', 'public/index.html', 'public/decks/catalog.json')) {
    if (-not $check.GetEntry($required)) { throw "Arquivo ausente do pacote: $required" }
  }
  Write-Host "Pacote com $($check.Entries.Count) arquivos."
} finally { $check.Dispose() }

Copy-Item -LiteralPath $temporaryPath -Destination $archivePath -Force
Remove-Item -LiteralPath $temporaryPath -Force
Write-Host $archivePath
