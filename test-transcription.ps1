# Script simplificado para testar a transcrição de áudio
$uri = "http://127.0.0.1:3001/api/transcribe"
$audioFile = "audio_alines.mp3"

# Verificar se o arquivo existe
if (-not (Test-Path $audioFile)) {
    Write-Host "Arquivo de áudio não encontrado: $audioFile"
    exit 1
}

Write-Host "Enviando arquivo: $audioFile"
Write-Host "Tamanho do arquivo: $((Get-Item $audioFile).Length) bytes"

try {
    # Usar Add-Type para criar o formulário multipart
    Add-Type -AssemblyName System.Net.Http
    
    $httpClientHandler = New-Object System.Net.Http.HttpClientHandler
    $httpClient = New-Object System.Net.Http.HttpClient($httpClientHandler)
    
    $multipartFormContent = New-Object System.Net.Http.MultipartFormDataContent
    
    $fileStream = [System.IO.File]::OpenRead((Resolve-Path $audioFile).Path)
    $streamContent = New-Object System.Net.Http.StreamContent($fileStream)
    $streamContent.Headers.ContentType = [System.Net.Http.Headers.MediaTypeHeaderValue]::Parse("audio/mpeg")
    
    $multipartFormContent.Add($streamContent, "audio", $audioFile)
    
    $response = $httpClient.PostAsync($uri, $multipartFormContent).Result
    $responseContent = $response.Content.ReadAsStringAsync().Result
    
    Write-Host "Status: $($response.StatusCode)"
    Write-Host "Resposta:"
    Write-Host $responseContent
    
    $fileStream.Close()
    $httpClient.Dispose()
    
} catch {
    Write-Host "Erro na requisição:"
    Write-Host $_.Exception.Message
}