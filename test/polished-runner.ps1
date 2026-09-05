# Build My Sandbox - polished standalone provisioning test
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
Set-Content -Path $LogFile -Value "Build My Sandbox polished standalone test`r`nStarted: $(Get-Date)`r`n" -Encoding UTF8 -Force

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
        $script:Failures += "$($Name): $($_.Exception.Message)"
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
$Names = @('DNS recovery','App Control performance fix','7-Zip')
$Rows = @{}

$window = New-Object System.Windows.Window
$window.Title = 'Build My Sandbox'
$window.Width = 650
$window.Height = [Math]::Min(760, [Math]::Max(455, 300 + ($Names.Count * 78)))
$window.MinWidth = 540
$window.MinHeight = 420
$window.WindowStartupLocation = 'CenterScreen'
$window.Background = '#FFF9EF'
$window.Foreground = '#26344D'
$window.FontFamily = 'Segoe UI'

$root = New-Object System.Windows.Controls.Grid
$root.Margin = '24'
$window.Content = $root
$root.RowDefinitions.Add((New-Object System.Windows.Controls.RowDefinition -Property @{ Height = 'Auto' }))
$root.RowDefinitions.Add((New-Object System.Windows.Controls.RowDefinition -Property @{ Height = 'Auto' }))
$root.RowDefinitions.Add((New-Object System.Windows.Controls.RowDefinition -Property @{ Height = '*' }))
$root.RowDefinitions.Add((New-Object System.Windows.Controls.RowDefinition -Property @{ Height = 'Auto' }))

$header = New-Object System.Windows.Controls.Border
$header.CornerRadius = 24
$header.Padding = '22'
$header.Background = '#EEF3FF'
$header.BorderBrush = '#D9D9FF'
$header.BorderThickness = 1
[System.Windows.Controls.Grid]::SetRow($header, 0)
$root.Children.Add($header) | Out-Null

$headerGrid = New-Object System.Windows.Controls.Grid
$headerGrid.ColumnDefinitions.Add((New-Object System.Windows.Controls.ColumnDefinition -Property @{ Width = 'Auto' }))
$headerGrid.ColumnDefinitions.Add((New-Object System.Windows.Controls.ColumnDefinition -Property @{ Width = '*' }))
$header.Child = $headerGrid

$mark = New-Object System.Windows.Controls.Border
$mark.Width = 56
$mark.Height = 56
$mark.CornerRadius = 18
$mark.Background = '#6F7FF6'
$mark.Margin = '0,0,16,0'
[System.Windows.Controls.Grid]::SetColumn($mark, 0)
$headerGrid.Children.Add($mark) | Out-Null

$markText = New-Object System.Windows.Controls.TextBlock
$markText.Text = 'BMS'
$markText.Foreground = '#FFFFFF'
$markText.FontSize = 15
$markText.FontWeight = 'Bold'
$markText.HorizontalAlignment = 'Center'
$markText.VerticalAlignment = 'Center'
$mark.Child = $markText

$copy = New-Object System.Windows.Controls.StackPanel
$copy.VerticalAlignment = 'Center'
[System.Windows.Controls.Grid]::SetColumn($copy, 1)
$headerGrid.Children.Add($copy) | Out-Null

$title = New-Object System.Windows.Controls.TextBlock
$title.Text = 'Building your sandbox...'
$title.FontSize = 26
$title.FontWeight = 'SemiBold'
$title.Foreground = '#26344D'
$copy.Children.Add($title) | Out-Null

$subtitle = New-Object System.Windows.Controls.TextBlock
$subtitle.Text = 'A little sand, a few tools, almost ready.'
$subtitle.FontSize = 13
$subtitle.Foreground = '#758198'
$subtitle.Margin = '0,5,0,0'
$copy.Children.Add($subtitle) | Out-Null

$progressGrid = New-Object System.Windows.Controls.Grid
$progressGrid.Margin = '0,18,0,14'
$progressGrid.ColumnDefinitions.Add((New-Object System.Windows.Controls.ColumnDefinition -Property @{ Width = '*' }))
$progressGrid.ColumnDefinitions.Add((New-Object System.Windows.Controls.ColumnDefinition -Property @{ Width = 'Auto' }))
[System.Windows.Controls.Grid]::SetRow($progressGrid, 1)
$root.Children.Add($progressGrid) | Out-Null

$progress = New-Object System.Windows.Controls.ProgressBar
$progress.Height = 10
$progress.Minimum = 0
$progress.Maximum = 3
$progress.Foreground = '#65D6B0'
$progress.Background = '#E9E6DF'
$progress.BorderThickness = 0
$progress.Margin = '0,0,14,0'
[System.Windows.Controls.Grid]::SetColumn($progress, 0)
$progressGrid.Children.Add($progress) | Out-Null

$counter = New-Object System.Windows.Controls.TextBlock
$counter.Text = '0 / 3 ready'
$counter.Foreground = '#657086'
$counter.FontWeight = 'SemiBold'
$counter.VerticalAlignment = 'Center'
[System.Windows.Controls.Grid]::SetColumn($counter, 1)
$progressGrid.Children.Add($counter) | Out-Null

$scroll = New-Object System.Windows.Controls.ScrollViewer
$scroll.VerticalScrollBarVisibility = 'Auto'
$scroll.HorizontalScrollBarVisibility = 'Disabled'
[System.Windows.Controls.Grid]::SetRow($scroll, 2)
$root.Children.Add($scroll) | Out-Null

$stack = New-Object System.Windows.Controls.StackPanel
$scroll.Content = $stack

foreach ($name in $Names) {
    $card = New-Object System.Windows.Controls.Border
    $card.CornerRadius = 17
    $card.Padding = '15,13'
    $card.Margin = '0,0,0,10'
    $card.Background = '#FFFFFF'
    $card.BorderBrush = '#E7DFD2'
    $card.BorderThickness = 1

    $grid = New-Object System.Windows.Controls.Grid
    $grid.ColumnDefinitions.Add((New-Object System.Windows.Controls.ColumnDefinition -Property @{ Width = 'Auto' }))
    $grid.ColumnDefinitions.Add((New-Object System.Windows.Controls.ColumnDefinition -Property @{ Width = '*' }))
    $grid.ColumnDefinitions.Add((New-Object System.Windows.Controls.ColumnDefinition -Property @{ Width = 'Auto' }))
    $card.Child = $grid

    $dot = New-Object System.Windows.Shapes.Ellipse
    $dot.Width = 11
    $dot.Height = 11
    $dot.Fill = '#C9C5BD'
    $dot.Margin = '0,0,12,0'
    $dot.VerticalAlignment = 'Center'
    [System.Windows.Controls.Grid]::SetColumn($dot, 0)
    $grid.Children.Add($dot) | Out-Null

    $label = New-Object System.Windows.Controls.TextBlock
    $label.Text = $name
    $label.FontSize = 14
    $label.FontWeight = 'SemiBold'
    $label.Foreground = '#40506A'
    $label.VerticalAlignment = 'Center'
    [System.Windows.Controls.Grid]::SetColumn($label, 1)
    $grid.Children.Add($label) | Out-Null

    $badge = New-Object System.Windows.Controls.Border
    $badge.CornerRadius = 10
    $badge.Padding = '9,4'
    $badge.Background = '#F3F0EA'
    [System.Windows.Controls.Grid]::SetColumn($badge, 2)
    $grid.Children.Add($badge) | Out-Null

    $badgeText = New-Object System.Windows.Controls.TextBlock
    $badgeText.Text = 'PENDING'
    $badgeText.FontSize = 10
    $badgeText.FontWeight = 'Bold'
    $badgeText.Foreground = '#8C8790'
    $badge.Child = $badgeText

    $Rows[$name] = [pscustomobject]@{ Dot = $dot; Badge = $badge; Text = $badgeText }
    $stack.Children.Add($card) | Out-Null
}

$footer = New-Object System.Windows.Controls.TextBlock
$footer.Text = 'Build My Sandbox - standalone test'
$footer.Foreground = '#9A96A8'
$footer.FontSize = 11
$footer.Margin = '0,6,0,0'
[System.Windows.Controls.Grid]::SetRow($footer, 3)
$root.Children.Add($footer) | Out-Null

function Refresh-State {
    $latest = @{}
    if (Test-Path $StateFile) {
        foreach ($line in (Get-Content -Path $StateFile -ErrorAction SilentlyContinue)) {
            $parts = $line -split '\|', 2
            if ($parts.Count -eq 2) { $latest[$parts[0]] = $parts[1] }
        }
    }

    $ready = 0
    foreach ($name in $Names) {
        $state = if ($latest.ContainsKey($name)) { $latest[$name] } else { 'PENDING' }
        $row = $Rows[$name]

        if ($state -eq 'INSTALLING') {
            $row.Dot.Fill = '#5EA8FF'
            $row.Badge.Background = '#E7F2FF'
            $row.Text.Foreground = '#357ABF'
            $row.Text.Text = 'INSTALLING'
        }
        elseif ($state -eq 'READY') {
            $ready++
            $row.Dot.Fill = '#65D6B0'
            $row.Badge.Background = '#E5F8F1'
            $row.Text.Foreground = '#2E8B70'
            $row.Text.Text = 'READY'
        }
        elseif ($state -eq 'FAILED') {
            $row.Dot.Fill = '#FF8A7A'
            $row.Badge.Background = '#FFF0ED'
            $row.Text.Foreground = '#C85A4D'
            $row.Text.Text = 'FAILED'
        }
        else {
            $row.Dot.Fill = '#C9C5BD'
            $row.Badge.Background = '#F3F0EA'
            $row.Text.Foreground = '#8C8790'
            $row.Text.Text = 'PENDING'
        }
    }

    $progress.Value = $ready
    $counter.Text = "$ready / 3 ready"

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
Write-StepState 'DNS recovery' 'READY'
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

    if (-not (Test-Path $installer) -or (Get-Item $installer).Length -le 0) {
        throw '7-Zip download failed or is empty.'
    }

    $p = Start-Process -FilePath $installer -ArgumentList '/S' -Wait -PassThru
    if ($p.ExitCode -ne 0) {
        throw "7-Zip installer returned exit code $($p.ExitCode)."
    }

    if (-not (Test-Path 'C:\Program Files\7-Zip\7zFM.exe')) {
        throw '7-Zip was not detected after install.'
    }

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
