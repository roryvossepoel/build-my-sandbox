# Build My Sandbox - standalone provisioning test
$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$Root = 'C:\SandboxToolbox'
$Downloads = Join-Path $Root 'Downloads'
$Logs = Join-Path $Root 'Logs'
$StateFile = Join-Path $Logs 'ProvisioningState.log'
$LogFile = Join-Path ([Environment]::GetFolderPath('Desktop')) 'Build-My-Sandbox-Test.log'
$UiScript = Join-Path $Root 'BuildMySandboxUI.ps1'
$script:Failures = @()

foreach ($path in @($Root,$Downloads,$Logs)) {
    New-Item -Path $path -ItemType Directory -Force | Out-Null
}
Set-Content -Path $StateFile -Value '' -Encoding UTF8 -Force
Set-Content -Path $LogFile -Value "Build My Sandbox standalone test`r`nStarted: $(Get-Date)`r`n" -Encoding UTF8 -Force

function Log {
    param([string]$Message)
    $line = "[{0}] {1}" -f (Get-Date -Format 'HH:mm:ss'), $Message
    Add-Content -Path $LogFile -Value $line -Encoding UTF8
    Write-Host $line
}

function Write-StepState {
    param([string]$Name,[string]$Status)
    Add-Content -Path $StateFile -Value "$Name|$Status" -Encoding UTF8
}

function Invoke-Step {
    param([string]$Name,[scriptblock]$Action)
    Write-StepState $Name 'INSTALLING'
    Log "START: $Name"
    try {
        & $Action
        Write-StepState $Name 'READY'
        Log "READY: $Name"
    }
    catch {
        $script:Failures += "$Name: $($_.Exception.Message)"
        Write-StepState $Name 'FAILED'
        Log "FAILED: $Name - $($_.Exception.Message)"
    }
}

$ui = @'
$ErrorActionPreference = 'SilentlyContinue'
Add-Type -AssemblyName PresentationFramework
Add-Type -AssemblyName PresentationCore
Add-Type -AssemblyName WindowsBase

$StateFile = 'C:\SandboxToolbox\Logs\ProvisioningState.log'
$Names = @('App Control performance fix','7-Zip')
$Rows = @{}

$window = New-Object System.Windows.Window
$window.Title = 'Build My Sandbox'
$window.Width = 620
$window.Height = 420
$window.WindowStartupLocation = 'CenterScreen'
$window.Background = '#FFF9EF'
$window.FontFamily = 'Segoe UI'

$root = New-Object System.Windows.Controls.StackPanel
$root.Margin = '24'
$window.Content = $root

$title = New-Object System.Windows.Controls.TextBlock
$title.Text = 'Building your sandbox...'
$title.FontSize = 26
$title.FontWeight = 'SemiBold'
$title.Foreground = '#26344D'
$root.Children.Add($title) | Out-Null

$subtitle = New-Object System.Windows.Controls.TextBlock
$subtitle.Text = 'A little sand, a few tools, almost ready.'
$subtitle.FontSize = 13
$subtitle.Foreground = '#758198'
$subtitle.Margin = '0,6,0,18'
$root.Children.Add($subtitle) | Out-Null

foreach ($name in $Names) {
    $card = New-Object System.Windows.Controls.Border
    $card.CornerRadius = 16
    $card.Padding = '14'
    $card.Margin = '0,0,0,10'
    $card.Background = '#FFFFFF'
    $card.BorderBrush = '#E7DFD2'
    $card.BorderThickness = 1

    $grid = New-Object System.Windows.Controls.Grid
    $grid.ColumnDefinitions.Add((New-Object System.Windows.Controls.ColumnDefinition -Property @{ Width = '*' }))
    $grid.ColumnDefinitions.Add((New-Object System.Windows.Controls.ColumnDefinition -Property @{ Width = 'Auto' }))
    $card.Child = $grid

    $label = New-Object System.Windows.Controls.TextBlock
    $label.Text = $name
    $label.FontSize = 14
    $label.FontWeight = 'SemiBold'
    $label.Foreground = '#40506A'
    [System.Windows.Controls.Grid]::SetColumn($label, 0)
    $grid.Children.Add($label) | Out-Null

    $badge = New-Object System.Windows.Controls.Border
    $badge.CornerRadius = 10
    $badge.Padding = '9,4'
    $badge.Background = '#F3F0EA'
    [System.Windows.Controls.Grid]::SetColumn($badge, 1)
    $grid.Children.Add($badge) | Out-Null

    $badgeText = New-Object System.Windows.Controls.TextBlock
    $badgeText.Text = 'PENDING'
    $badgeText.FontSize = 10
    $badgeText.FontWeight = 'Bold'
    $badgeText.Foreground = '#8C8790'
    $badge.Child = $badgeText

    $Rows[$name] = [pscustomobject]@{ Badge = $badge; Text = $badgeText }
    $root.Children.Add($card) | Out-Null
}

function Refresh-State {
    $latest = @{}
    if (Test-Path $StateFile) {
        foreach ($line in (Get-Content $StateFile -ErrorAction SilentlyContinue)) {
            $parts = $line -split '\|', 2
            if ($parts.Count -eq 2) { $latest[$parts[0]] = $parts[1] }
        }
    }

    foreach ($name in $Names) {
        $state = if ($latest.ContainsKey($name)) { $latest[$name] } else { 'PENDING' }
        $row = $Rows[$name]
        switch ($state) {
            'INSTALLING' { $row.Badge.Background = '#E7F2FF'; $row.Text.Foreground = '#357ABF'; $row.Text.Text = 'INSTALLING' }
            'READY'      { $row.Badge.Background = '#E5F8F1'; $row.Text.Foreground = '#2E8B70'; $row.Text.Text = 'READY' }
            'FAILED'     { $row.Badge.Background = '#FFF0ED'; $row.Text.Foreground = '#C85A4D'; $row.Text.Text = 'FAILED' }
            default      { $row.Badge.Background = '#F3F0EA'; $row.Text.Foreground = '#8C8790'; $row.Text.Text = 'PENDING' }
        }
    }

    if ($latest['__ALL__'] -eq 'READY') {
        $title.Text = 'Your sandbox is ready!'
        $subtitle.Text = 'Everything finished successfully. Time to play.'
    }
    elseif ($latest['__ALL__'] -eq 'FAILED') {
        $title.Text = 'Your sandbox is ready with a few bumps.'
        $subtitle.Text = 'One or more steps failed. Check the log on the desktop.'
    }
}

Refresh-State
$timer = New-Object System.Windows.Threading.DispatcherTimer
$timer.Interval = [TimeSpan]::FromSeconds(1)
$timer.Add_Tick({ Refresh-State })
$timer.Start()
$window.ShowDialog() | Out-Null
'@

Set-Content -Path $UiScript -Value $ui -Encoding UTF8 -Force
Write-StepState 'App Control performance fix' 'PENDING'
Write-StepState '7-Zip' 'PENDING'
Start-Process powershell.exe -ArgumentList @('-NoLogo','-NoProfile','-WindowStyle','Hidden','-ExecutionPolicy','Bypass','-File',$UiScript) -WindowStyle Hidden

Invoke-Step -Name 'App Control performance fix' -Action {
    Set-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Control\CI\Policy' -Name 'VerifiedAndReputablePolicyState' -Value 0 -ErrorAction Stop
    cmd /c "echo.| CiTool.exe -r" | Out-Null
    Log 'Smart App Control/App Control workaround applied.'
}

Invoke-Step -Name '7-Zip' -Action {
    $url = 'https://github.com/ip7z/7zip/releases/download/26.02/7z2602-x64.exe'
    $installer = Join-Path $Downloads '7z2602-x64.exe'
    Log 'Downloading 7-Zip...'
    $oldProgress = $ProgressPreference
    $ProgressPreference = 'SilentlyContinue'
    try {
        Invoke-WebRequest -Uri $url -OutFile $installer -UseBasicParsing -ErrorAction Stop
    }
    finally {
        $ProgressPreference = $oldProgress
    }
    if (-not (Test-Path $installer) -or (Get-Item $installer).Length -le 0) { throw '7-Zip download failed or is empty.' }
    $p = Start-Process -FilePath $installer -ArgumentList '/S' -Wait -PassThru
    if ($p.ExitCode -ne 0) { throw "7-Zip installer returned exit code $($p.ExitCode)." }
    if (-not (Test-Path 'C:\Program Files\7-Zip\7zFM.exe')) { throw '7-Zip was not detected after install.' }
    Log '7-Zip installed successfully.'
}

if ($script:Failures.Count -eq 0) {
    Write-StepState '__ALL__' 'READY'
    Log 'ALL STEPS READY.'
}
else {
    Write-StepState '__ALL__' 'FAILED'
    Log "Completed with failures: $($script:Failures -join ' | ')"
}

Log "Log file: $LogFile"
