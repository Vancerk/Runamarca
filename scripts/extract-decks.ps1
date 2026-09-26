param(
  [Parameter(Mandatory=$true)][string]$IgniDocx,
  [Parameter(Mandatory=$true)][string]$VentusDocx,
  [Parameter(Mandatory=$true)][string]$GlaciesDocx
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$root = Split-Path $PSScriptRoot -Parent
$catalog = [ordered]@{}
$sources = @(
  @{slug='igni'; path=$IgniDocx; creatures=10; title='Ruptura'; rune='Runa de Ruptura'},
  @{slug='ventus'; path=$VentusDocx; creatures=12; title='Forja'; rune='Runa de Forja'},
  @{slug='glacies'; path=$GlaciesDocx; creatures=11; title='Fluxo'; rune='Runa de Fluxo'}
)

foreach ($source in $sources) {
  $destination = Join-Path $root ('public\decks\' + $source.slug)
  New-Item -ItemType Directory -Force -Path $destination | Out-Null
  $zip = [IO.Compression.ZipFile]::OpenRead((Resolve-Path -LiteralPath $source.path))
  try {
    $reader = [IO.StreamReader]::new($zip.GetEntry('word/document.xml').Open())
    [xml]$document = $reader.ReadToEnd(); $reader.Dispose()
    $reader = [IO.StreamReader]::new($zip.GetEntry('word/_rels/document.xml.rels').Open())
    [xml]$relationships = $reader.ReadToEnd(); $reader.Dispose()
    $namespace = [Xml.XmlNamespaceManager]::new($document.NameTable)
    $namespace.AddNamespace('w','http://schemas.openxmlformats.org/wordprocessingml/2006/main')
    $namespace.AddNamespace('a','http://schemas.openxmlformats.org/drawingml/2006/main')
    $relNs = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
    $targets = @{}
    foreach ($relationship in $relationships.Relationships.Relationship) { $targets[$relationship.Id] = $relationship.Target }
    $cards = [Collections.Generic.List[object]]::new()
    $cards.Add([ordered]@{name=$source.rune;quantity=25;kind='rune';cost=[ordered]@{colored=0;generic=0};image=('/decks/'+$source.slug+'/runa.png')})
    $index = 0
    foreach ($row in $document.SelectNodes('//w:tr',$namespace)) {
      $blip = $row.SelectSingleNode('.//a:blip',$namespace)
      if (-not $blip) { continue }
      $index++
      $text = (($row.SelectNodes('.//w:t',$namespace) | ForEach-Object InnerText) -join ' ') -replace '\s+',' '
      if ($text -notmatch '^\s*(\d+)x\s+(.+?)\s*-\s*Custo\s*(\d+)(?:\s*/\s*(\d+))?') { throw "Não foi possível ler carta $index de $($source.slug): $text" }
      $quantity = [int]$Matches[1]
      $name = $Matches[2].Trim()
      $colored = [int]$Matches[3]
      $generic = if ($Matches[4]) { [int]$Matches[4] } else { 0 }
      # A arte é a referência quando a tabela de texto diverge da carta.
      if ($source.slug -eq 'igni' -and $index -eq 1) { $name = 'Emboscador Tardio' }
      if ($source.slug -eq 'ventus' -and $index -eq 1) { $generic = 1 }
      if ($source.slug -eq 'glacies') {
        switch ($index) {
          5 { $name = 'Vaelita Conjurador' }
          6 { $name = 'Octoprofeta, Aquele que Vê' }
          9 { $name = 'HidroNaja, a Regicida' }
          12 { $name = 'Todas Minhas!' }
          14 { $name = 'Tá com sono aí?' }
          17 { $generic = 1 }
        }
      }
      $target = $targets[$blip.GetAttribute('embed',$relNs)]
      $filename = [IO.Path]::GetFileName($target)
      $entry = $zip.GetEntry('word/' + $target)
      if (-not $entry) { throw "Imagem ausente: $target" }
      $output = Join-Path $destination $filename
      $inputStream = $entry.Open(); $outputStream = [IO.File]::Create($output)
      try { $inputStream.CopyTo($outputStream) } finally { $inputStream.Dispose(); $outputStream.Dispose() }
      $kind = if ($index -le $source.creatures) { 'creature' } else { 'spell' }
      $card = [ordered]@{name=$name;quantity=$quantity;kind=$kind;cost=[ordered]@{colored=$colored;generic=$generic};image=('/decks/'+$source.slug+'/'+$filename)}
      if ($kind -eq 'creature' -and $text -match '(?i)Estat\S*\s*:\s*(\d+)\s*/\s*(\d+)') { $card['power'] = [int]$Matches[1]; $card['health'] = [int]$Matches[2] }
      if (($source.slug -eq 'glacies' -and $index -in @(4,5,7,8,10,11)) -or ($source.slug -eq 'igni' -and $index -in @(8,9,10))) { $card.agile = $true }
      if ($source.slug -eq 'ventus' -and $index -eq 15) { $card.drawEffect = [ordered]@{trigger='turnStart';count=1;condition='powerAtLeast4'} }
      if ($source.slug -eq 'glacies') {
        switch ($index) {
          4  { $card.drawEffect = [ordered]@{trigger='enter';count=1} }
          11 { $card.drawEffect = [ordered]@{trigger='agileAttack';count=1} }
          12 { $card.drawEffect = [ordered]@{trigger='enter';count=7} }
          15 { $card.drawEffect = [ordered]@{trigger='enter';count=2}; $card.costDiscount = [ordered]@{condition='agileCreature';amount=1} }
        }
      }
      $cards.Add($card)
    }
    if ($cards.Count -ne 1 + $source.creatures + $(if ($source.slug -eq 'glacies') { 6 } elseif ($source.slug -eq 'igni') { 6 } else { 4 })) { throw "Quantidade inesperada de artes em $($source.slug)." }
    $total = ($cards | ForEach-Object { $_['quantity'] } | Measure-Object -Sum).Sum
    if ($total -ne 60) { throw "Deck $($source.slug) contém $total cartas, esperado 60." }
    $catalog[$source.slug] = [ordered]@{title=$source.title;color=$(switch($source.slug){'igni'{'red'} 'ventus'{'green'} 'glacies'{'blue'}});cards=@($cards)}
    Write-Output "$($source.title): $index artes, $total cartas"
  } finally { $zip.Dispose() }
}

$json = $catalog | ConvertTo-Json -Depth 8
[IO.File]::WriteAllText((Join-Path $root 'public\decks\catalog.json'), $json, [Text.UTF8Encoding]::new($false))
