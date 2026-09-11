# Build My Sandbox - Google Chrome architecture-aware installer
$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

try {
    $osArchitecture = [System.Runtime.InteropServices.RuntimeInformation]::OSArchitecture.ToString()
} catch {
    $osArchitecture = $env:PROCESSOR_ARCHITECTURE
}

switch ($osArchitecture.ToUpperInvariant()) {
    'ARM64' {
        $downloadUrl = 'https://dl.google.com/tag/s/dl/chrome/install/googlechromestandaloneenterprise_arm64.msi'
        $packageName = 'GoogleChromeStandaloneEnterpriseARM64.msi'
    }
    'X64' {
        $downloadUrl = 'https://dl.google.com/dl/chrome/install/googlechromestandaloneenterprise64.msi'
        $packageName = 'GoogleChromeStandaloneEnterprise64.msi'
    }
    'AMD64' {
        $downloadUrl = 'https://dl.google.com/dl/chrome/install/googlechromestandaloneenterprise64.msi'
        $packageName = 'GoogleChromeStandaloneEnterprise64.msi'
    }
    default {
        throw "Google Chrome is not configured for Windows architecture '$osArchitecture'."
    }
}

$packagePath = Join-Path $env:TEMP $packageName
Remove-Item -LiteralPath $packagePath -Force -ErrorAction SilentlyContinue

Write-Output "Downloading Google Chrome for $osArchitecture..."
if (Get-Command curl.exe -ErrorAction SilentlyContinue) {
    & curl.exe -L --fail --silent --show-error --connect-timeout 30 --max-time 300 -o $packagePath $downloadUrl
    if ($LASTEXITCODE -ne 0) {
        throw "Google Chrome download failed with curl exit code $LASTEXITCODE."
    }
} else {
    Invoke-WebRequest -Uri $downloadUrl -OutFile $packagePath -UseBasicParsing -TimeoutSec 300 -ErrorAction Stop
}

if (-not (Test-Path -LiteralPath $packagePath) -or (Get-Item -LiteralPath $packagePath).Length -le 0) {
    throw 'Google Chrome download is missing or empty.'
}

Write-Output 'Installing Google Chrome...'
$process = Start-Process -FilePath 'msiexec.exe' -ArgumentList @('/i', $packagePath, '/qn', '/norestart') -Wait -PassThru
if ($process.ExitCode -notin @(0, 3010)) {
    throw "Google Chrome installer failed with exit code $($process.ExitCode)."
}

Write-Output "Google Chrome installation completed for $osArchitecture."
