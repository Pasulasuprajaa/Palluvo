Add-Type -AssemblyName System.Drawing

$baseDir = Join-Path $PSScriptRoot "..\..\client\public\images"
$baseDir = [System.IO.Path]::GetFullPath($baseDir)
$thumbBaseDir = Join-Path $baseDir "thumbnails"

Write-Output "Generating thumbnails from $baseDir into $thumbBaseDir..."

$subDirs = @("categories", "occasions", "sarees", "social")
$codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq "image/jpeg" }
$encParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
$encParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]80)

$count = 0
foreach ($sub in $subDirs) {
    $srcSub = Join-Path $baseDir $sub
    $destSub = Join-Path $thumbBaseDir $sub
    if (-not (Test-Path $destSub)) {
        New-Item -ItemType Directory -Path $destSub -Force | Out-Null
    }

    $files = Get-ChildItem -Path $srcSub -Filter "*.jpg"
    foreach ($file in $files) {
        $destFile = Join-Path $destSub $file.Name
        $img = [System.Drawing.Image]::FromFile($file.FullName)
        
        $thumbWidth = 180
        $thumbHeight = [int]($img.Height * ($thumbWidth / $img.Width))
        $thumb = New-Object System.Drawing.Bitmap($thumbWidth, $thumbHeight)
        $g = [System.Drawing.Graphics]::FromImage($thumb)
        $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $g.DrawImage($img, 0, 0, $thumbWidth, $thumbHeight)
        
        $thumb.Save($destFile, $codec, $encParams)
        $g.Dispose()
        $thumb.Dispose()
        $img.Dispose()
        
        $srcSize = [math]::Round($file.Length / 1024, 1)
        $destSize = [math]::Round((Get-Item $destFile).Length / 1024, 1)
        Write-Output "Generated: $sub/$($file.Name) (${srcSize}KB -> ${destSize}KB)"
        $count++
    }
}

Write-Output "Successfully generated $count thumbnails."
