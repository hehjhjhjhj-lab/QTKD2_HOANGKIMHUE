# ==============================================================================
# LIGHTWEIGHT POWERSHELL HTTP SERVER (TCPLISTENER)
# ==============================================================================
param(
    [int]$Port = 8080
)

$ip = [System.Net.IPAddress]::Loopback
$server = New-Object System.Net.Sockets.TcpListener($ip, $Port)

try {
    $server.Start()
} catch {
    $Port = 8888
    $server = New-Object System.Net.Sockets.TcpListener($ip, $Port)
    $server.Start()
}

$baseDir = "c:\Users\admin\Documents\New folder"
Write-Output "HTTP Server listening on http://localhost:$Port/"
Write-Output "Serving files from: $baseDir"

$running = $true
while ($running) {
    try {
        $client = $server.AcceptTcpClient()
        $stream = $client.GetStream()
        $reader = New-Object System.IO.StreamReader($stream, [System.Text.Encoding]::UTF8)
        
        $requestLine = $reader.ReadLine()
        if (-not $requestLine) {
            $client.Close()
            continue
        }
        
        # Parse GET /path HTTP/1.1
        $tokens = $requestLine.Split(' ')
        $method = $tokens[0]
        $rawUrl = if ($tokens.Length -gt 1) { $tokens[1] } else { "/" }
        
        # Read remaining headers
        while (($line = $reader.ReadLine()) -and ($line.Trim() -ne "")) { }
        
        $cleanPath = $rawUrl.Split('?')[0].TrimStart('/')
        if ($cleanPath -eq "" -or $cleanPath -eq "/") {
            $cleanPath = "index.html"
        }
        
        $cleanPath = [System.Uri]::UnescapeDataString($cleanPath).Replace('/', '\')
        $targetFile = Join-Path $baseDir $cleanPath
        
        if (Test-Path $targetFile -PathType Leaf) {
            $bytes = [System.IO.File]::ReadAllBytes($targetFile)
            $ext = [System.IO.Path]::GetExtension($targetFile).ToLower()
            
            $mime = "application/octet-stream"
            switch ($ext) {
                ".html" { $mime = "text/html; charset=utf-8" }
                ".htm"  { $mime = "text/html; charset=utf-8" }
                ".css"  { $mime = "text/css; charset=utf-8" }
                ".js"   { $mime = "application/javascript; charset=utf-8" }
                ".json" { $mime = "application/json; charset=utf-8" }
                ".png"  { $mime = "image/png" }
                ".jpg"  { $mime = "image/jpeg" }
                ".csv"  { $mime = "text/csv; charset=utf-8" }
                ".xlsx" { $mime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }
                ".xls"  { $mime = "application/vnd.ms-excel" }
                ".docx" { $mime = "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }
                ".doc"  { $mime = "application/msword" }
                ".md"   { $mime = "text/markdown; charset=utf-8" }
                ".sql"  { $mime = "text/plain; charset=utf-8" }
            }
            
            $header = "HTTP/1.1 200 OK`r`nContent-Type: $mime`r`nContent-Length: $($bytes.Length)`r`nAccess-Control-Allow-Origin: *`r`nConnection: close`r`n`r`n"
            $headerBytes = [System.Text.Encoding]::UTF8.GetBytes($header)
            
            $stream.Write($headerBytes, 0, $headerBytes.Length)
            $stream.Write($bytes, 0, $bytes.Length)
            $stream.Flush()
        } else {
            $msg = "404 Not Found: $rawUrl"
            $bodyBytes = [System.Text.Encoding]::UTF8.GetBytes($msg)
            $header = "HTTP/1.1 404 Not Found`r`nContent-Type: text/plain; charset=utf-8`r`nContent-Length: $($bodyBytes.Length)`r`nConnection: close`r`n`r`n"
            $headerBytes = [System.Text.Encoding]::UTF8.GetBytes($header)
            $stream.Write($headerBytes, 0, $headerBytes.Length)
            $stream.Write($bodyBytes, 0, $bodyBytes.Length)
            $stream.Flush()
        }
        
        $client.Close()
    } catch {
        # Handle client connection reset or close
    }
}
$server.Stop()

