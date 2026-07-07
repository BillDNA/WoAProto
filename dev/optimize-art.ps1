# War of Attrition — art optimizer.
# Drop raw AI-generated art into game/art as <card-id>.png (or title/table/board.png),
# then run:  powershell -ExecutionPolicy Bypass -File dev\optimize-art.ps1
#
# It moves heavy originals to dynamic-scrum/planning/specs/original-specs/art-originals (gitignored), trims
# transparent margins, resizes, and writes web-weight files back into game/art:
#   title.png stays PNG (needs transparency), everything else becomes .jpg.
Add-Type -AssemblyName System.Drawing

$root = Split-Path $PSScriptRoot -Parent
$artDir = Join-Path $root 'game\art'
$origDir = Join-Path $root 'specs\original-specs\art-originals'
New-Item -ItemType Directory -Force $origDir | Out-Null

# 1) sweep heavy PNGs out of game/art into the originals folder
Get-ChildItem $artDir -Filter *.png | Where-Object { $_.Length -gt 500KB } | ForEach-Object {
    Move-Item $_.FullName (Join-Path $origDir $_.Name) -Force
    Write-Output ("moved original: " + $_.Name)
}

function Get-OpaqueBounds([System.Drawing.Bitmap]$img) {
    # scan a thumbnail for speed, then scale the box back up
    $tw = 220
    $th = [Math]::Max(1, [int]($img.Height * $tw / $img.Width))
    $thumb = New-Object System.Drawing.Bitmap $tw, $th
    $g = [System.Drawing.Graphics]::FromImage($thumb)
    $g.Clear([System.Drawing.Color]::Transparent)
    $g.DrawImage($img, 0, 0, $tw, $th)
    $g.Dispose()
    $minX = $tw; $minY = $th; $maxX = -1; $maxY = -1
    for ($y = 0; $y -lt $th; $y++) {
        for ($x = 0; $x -lt $tw; $x++) {
            if ($thumb.GetPixel($x, $y).A -gt 12) {
                if ($x -lt $minX) { $minX = $x }
                if ($x -gt $maxX) { $maxX = $x }
                if ($y -lt $minY) { $minY = $y }
                if ($y -gt $maxY) { $maxY = $y }
            }
        }
    }
    $thumb.Dispose()
    if ($maxX -lt 0) { return [System.Drawing.Rectangle]::new(0, 0, $img.Width, $img.Height) }
    $sx = $img.Width / $tw; $sy = $img.Height / $th
    $x0 = [Math]::Max(0, [int](($minX - 1) * $sx)); $y0 = [Math]::Max(0, [int](($minY - 1) * $sy))
    $x1 = [Math]::Min($img.Width, [int](($maxX + 2) * $sx)); $y1 = [Math]::Min($img.Height, [int](($maxY + 2) * $sy))
    return [System.Drawing.Rectangle]::new($x0, $y0, $x1 - $x0, $y1 - $y0)
}

function Optimize($inPath, $outPath, [int]$maxW, [bool]$keepAlpha, [long]$quality) {
    $img = [System.Drawing.Bitmap]::FromFile($inPath)
    $box = Get-OpaqueBounds $img
    $w = [Math]::Min($maxW, $box.Width)
    $h = [int]($box.Height * $w / $box.Width)
    $out = New-Object System.Drawing.Bitmap $w, $h
    $g = [System.Drawing.Graphics]::FromImage($out)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    if (-not $keepAlpha) { $g.Clear([System.Drawing.Color]::FromArgb(255, 232, 220, 192)) } # parchment under any stray alpha
    $g.DrawImage($img, [System.Drawing.Rectangle]::new(0, 0, $w, $h), $box, [System.Drawing.GraphicsUnit]::Pixel)
    $g.Dispose()
    if (Test-Path $outPath) { Remove-Item $outPath -Force }
    if ($keepAlpha) {
        $out.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    } else {
        $enc = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
        $ep = New-Object System.Drawing.Imaging.EncoderParameters 1
        $ep.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter ([System.Drawing.Imaging.Encoder]::Quality, $quality)
        $out.Save($outPath, $enc, $ep)
    }
    $out.Dispose(); $img.Dispose()
    $kb = [int]((Get-Item $outPath).Length / 1KB)
    Write-Output ("optimized: " + (Split-Path $outPath -Leaf) + "  " + $w + "x" + $h + "  " + $kb + " KB")
}

Get-ChildItem $origDir -Filter *.png | ForEach-Object {
    $name = $_.BaseName
    $src = $_.FullName   # ($_ gets rebound inside switch)
    switch ($name) {
        'title' { Optimize $src (Join-Path $artDir 'title.png') 900 $true 0 }
        'table' { Optimize $src (Join-Path $artDir 'table.jpg') 1600 $false 80 }
        'board' { Optimize $src (Join-Path $artDir 'board.jpg') 1200 $false 80 }
        default { Optimize $src (Join-Path $artDir ($name + '.jpg')) 560 $false 82 }
    }
}
Write-Output 'done.'
