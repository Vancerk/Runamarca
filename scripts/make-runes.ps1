Add-Type -AssemblyName System.Drawing
$root = Split-Path $PSScriptRoot -Parent
$energyIcons = [Drawing.Image]::FromFile((Join-Path $root 'public\energies.png'))
$decks = @(
  @{slug='igni'; title='RUNA DE RUPTURA'; bg='#2B1718'; accent='#DC6957'; subtitle='ENERGIA DE RUPTURA'; iconY=48},
  @{slug='ventus'; title='RUNA DE FORJA'; bg='#2B2514'; accent='#D4A53B'; subtitle='ENERGIA DE FORJA'; iconY=498},
  @{slug='glacies'; title='RUNA DE FLUXO'; bg='#16283C'; accent='#78B8E7'; subtitle='ENERGIA DE FLUXO'; iconY=198}
)
foreach ($deck in $decks) {
  $bitmap = [Drawing.Bitmap]::new(600,840)
  $graphics = [Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $accent = [Drawing.ColorTranslator]::FromHtml($deck.accent)
  $background = [Drawing.ColorTranslator]::FromHtml($deck.bg)
  $cream = [Drawing.ColorTranslator]::FromHtml('#E9DBC0')
  $format = [Drawing.StringFormat]::new()
  $format.Alignment = [Drawing.StringAlignment]::Center
  $brush = [Drawing.Drawing2D.LinearGradientBrush]::new([Drawing.Rectangle]::new(0,0,600,840),$background,[Drawing.Color]::Black,35)
  $graphics.FillRectangle($brush,0,0,600,840)
  $frame = [Drawing.Pen]::new($accent,10)
  $fine = [Drawing.Pen]::new([Drawing.Color]::FromArgb(140,$accent),2)
  $graphics.DrawRectangle($frame,18,18,564,804)
  $graphics.DrawRectangle($fine,34,34,532,772)
  $graphics.DrawEllipse($fine,115,208,370,370)
  $graphics.DrawEllipse($frame,145,238,310,310)
  $graphics.DrawLine($fine,300,175,300,614)
  $graphics.DrawLine($fine,80,393,520,393)
  $orb = [Drawing.SolidBrush]::new([Drawing.Color]::FromArgb(95,$accent))
  $graphics.FillEllipse($orb,190,283,220,220)
  $graphics.DrawEllipse($frame,190,283,220,220)
  $titleFont = [Drawing.Font]::new('Georgia',32,[Drawing.FontStyle]::Bold)
  $subtitleFont = [Drawing.Font]::new('Georgia',23,[Drawing.FontStyle]::Regular)
  $creamBrush = [Drawing.SolidBrush]::new($cream)
  $accentBrush = [Drawing.SolidBrush]::new($accent)
  $graphics.DrawString($deck.title,$titleFont,$creamBrush,[Drawing.RectangleF]::new(30,72,540,70),$format)
  $clipState = $graphics.Save()
  $graphics.SetClip([Drawing.Rectangle]::new(210,305,180,180))
  $clipCircle = [Drawing.Drawing2D.GraphicsPath]::new()
  $clipCircle.AddEllipse(210,305,180,180)
  $graphics.SetClip($clipCircle,[Drawing.Drawing2D.CombineMode]::Replace)
  $graphics.DrawImage($energyIcons,[Drawing.Rectangle]::new(205,300,190,190),[Drawing.Rectangle]::new(18,$deck.iconY,84,84),[Drawing.GraphicsUnit]::Pixel)
  $graphics.Restore($clipState)
  $clipCircle.Dispose()
  $graphics.DrawString($deck.subtitle,$subtitleFont,$accentBrush,[Drawing.RectangleF]::new(40,651,520,50),$format)
  $graphics.DrawString('VIRE: ADICIONE 1 ENERGIA',$subtitleFont,$creamBrush,[Drawing.RectangleF]::new(20,716,560,45),$format)
  $path = Join-Path $root ('public\decks\'+$deck.slug+'\runa.png')
  $bitmap.Save($path,[Drawing.Imaging.ImageFormat]::Png)
  $accentBrush.Dispose(); $creamBrush.Dispose(); $subtitleFont.Dispose(); $titleFont.Dispose()
  $orb.Dispose(); $fine.Dispose(); $frame.Dispose(); $brush.Dispose(); $format.Dispose(); $graphics.Dispose(); $bitmap.Dispose()
  Write-Output $path
}
$energyIcons.Dispose()
