$ErrorActionPreference = 'Stop'
$root = (Resolve-Path -LiteralPath $PSScriptRoot).Path
$listener = [System.Net.HttpListener]::new()
$prefix = 'http://127.0.0.1:8080/'
$listener.Prefixes.Add($prefix)
$mimeTypes = @{
    '.html' = 'text/html; charset=utf-8'
    '.css' = 'text/css; charset=utf-8'
    '.js' = 'text/javascript; charset=utf-8'
    '.json' = 'application/json; charset=utf-8'
    '.webmanifest' = 'application/manifest+json; charset=utf-8'
    '.png' = 'image/png'
    '.svg' = 'image/svg+xml'
    '.ico' = 'image/x-icon'
    '.txt' = 'text/plain; charset=utf-8'
}
try {
    $listener.Start()
    Write-Host ''
    Write-Host 'BloomDay is running locally.' -ForegroundColor Magenta
    Write-Host ('Open: ' + $prefix) -ForegroundColor Cyan
    Write-Host 'Keep this window open while using the app. Press Ctrl+C to stop it.'
    Start-Process $prefix
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        try {
            $relativePath = [Uri]::UnescapeDataString($context.Request.Url.AbsolutePath.TrimStart('/'))
            if ([string]::IsNullOrWhiteSpace($relativePath)) { $relativePath = 'index.html' }
            $relativePath = $relativePath.Replace('/', [System.IO.Path]::DirectorySeparatorChar)
            $filePath = [System.IO.Path]::GetFullPath([System.IO.Path]::Combine($root, $relativePath))
            $rootPrefix = $root.TrimEnd([System.IO.Path]::DirectorySeparatorChar) + [System.IO.Path]::DirectorySeparatorChar
            if (-not ($filePath.StartsWith($rootPrefix, [System.StringComparison]::OrdinalIgnoreCase) -or $filePath.Equals((Join-Path $root 'index.html'), [System.StringComparison]::OrdinalIgnoreCase))) {
                $context.Response.StatusCode = 403
                $body = [System.Text.Encoding]::UTF8.GetBytes('Forbidden')
            } elseif (-not (Test-Path -LiteralPath $filePath -PathType Leaf)) {
                $context.Response.StatusCode = 404
                $body = [System.Text.Encoding]::UTF8.GetBytes('Not found')
            } else {
                $extension = [System.IO.Path]::GetExtension($filePath).ToLowerInvariant()
                if ($mimeTypes.ContainsKey($extension)) { $context.Response.ContentType = $mimeTypes[$extension] } else { $context.Response.ContentType = 'application/octet-stream' }
                $body = [System.IO.File]::ReadAllBytes($filePath)
                $context.Response.StatusCode = 200
            }
            $context.Response.ContentLength64 = $body.Length
            $context.Response.OutputStream.Write($body, 0, $body.Length)
        } catch {
            try { $context.Response.StatusCode = 500 } catch {}
        } finally {
            try { $context.Response.OutputStream.Close() } catch {}
            try { $context.Response.Close() } catch {}
        }
    }
} catch {
    Write-Host ('Could not start BloomDay: ' + $_.Exception.Message) -ForegroundColor Red
    Write-Host 'Check that port 8080 is free, then run this again.'
    Read-Host 'Press Enter to close'
} finally {
    if ($listener.IsListening) { $listener.Stop() }
    $listener.Close()
}
