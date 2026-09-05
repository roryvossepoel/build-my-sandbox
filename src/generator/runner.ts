import type { AppManifest } from '../types.js';

const psQuote = (value: string) => `'${value.replaceAll("'", "''")}'`;

function readFlag(key: string): boolean {
  try {
    return globalThis.localStorage?.getItem(key) === 'true';
  } catch {
    return false;
  }
}

function utf8Base64(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function generateInstallBlock(app: AppManifest): string {
  const fileName = app.install.fileName ?? `${app.id}.download`;
  const downloadPath = `C:\\SandboxToolbox\\Downloads\\${fileName}`;

  const lines: string[] = [
    `Download-File -Url ${psQuote(app.install.url)} -Output ${psQuote(downloadPath)} -Description ${psQuote(app.name)}`,
  ];

  switch (app.install.type) {
    case 'zip':
      if (!app.install.extractTo) throw new Error(`${app.id}: zip install requires extractTo`);
      lines.push(`Expand-Zip -ZipPath ${psQuote(downloadPath)} -DestinationPath ${psQuote(app.install.extractTo)}`);
      break;
    case 'portable':
      if (!app.install.extractTo) throw new Error(`${app.id}: portable install requires extractTo`);
      lines.push(`New-Item -Path ${psQuote(app.install.extractTo)} -ItemType Directory -Force | Out-Null`);
      lines.push(`Copy-Item -Path ${psQuote(downloadPath)} -Destination (Join-Path ${psQuote(app.install.extractTo)} ${psQuote(fileName)}) -Force`);
      break;
    case 'exe':
      lines.push(`$p = Start-Process -FilePath ${psQuote(downloadPath)} -ArgumentList ${psQuote(app.install.silentArgs ?? '')} -Wait -PassThru`);
      lines.push(`if ($p.ExitCode -ne 0) { throw ${psQuote(`${app.name} installer failed`)} }`);
      break;
    case 'msi':
      lines.push(`$p = Start-Process -FilePath 'msiexec.exe' -ArgumentList @('/i', ${psQuote(downloadPath)}, ${psQuote(app.install.silentArgs ?? '/qn /norestart')}) -Wait -PassThru`);
      lines.push(`if ($p.ExitCode -notin @(0,3010)) { throw ${psQuote(`${app.name} installer failed`)} }`);
      break;
    case 'script':
      lines.push(`& powershell.exe -NoProfile -ExecutionPolicy Bypass -File ${psQuote(downloadPath)}`);
      break;
  }

  if (app.install.postInstall?.length) lines.push(...app.install.postInstall);
  return lines.join('\n');
}

function generateProvisioningUi(stepNames: string[]): string {
  const names = stepNames.map(psQuote).join(', ');
  return `
$ErrorActionPreference = 'SilentlyContinue'
Add-Type -AssemblyName PresentationFramework
Add-Type -AssemblyName PresentationCore
Add-Type -AssemblyName WindowsBase

$StateFile = 'C:\\SandboxToolbox\\Logs\\ProvisioningState.log'
$Names = @(${names})
$Rows = @{}

$window = New-Object System.Windows.Window
$window.Title = 'Build My Sandbox'
$window.Width = 650
$window.Height = 700
$window.MinWidth = 520
$window.MinHeight = 540
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
$progress.Maximum = [Math]::Max($Names.Count, 1)
$progress.Foreground = '#65D6B0'
$progress.Background = '#E9E6DF'
$progress.BorderThickness = 0
$progress.Margin = '0,0,14,0'
[System.Windows.Controls.Grid]::SetColumn($progress, 0)
$progressGrid.Children.Add($progress) | Out-Null
$counter = New-Object System.Windows.Controls.TextBlock
$counter.Text = "0 / $($Names.Count) ready"
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

if ($Names.Count -eq 0) {
    $empty = New-Object System.Windows.Controls.Border
    $empty.CornerRadius = 18
    $empty.Padding = '22'
    $empty.Background = '#FFF3CC'
    $empty.BorderBrush = '#F0D58A'
    $empty.BorderThickness = 1
    $emptyText = New-Object System.Windows.Controls.TextBlock
    $emptyText.Text = 'No tools selected. Your empty sandbox is ready to play.'
    $emptyText.Foreground = '#775F2B'
    $emptyText.FontSize = 14
    $emptyText.TextWrapping = 'Wrap'
    $empty.Child = $emptyText
    $stack.Children.Add($empty) | Out-Null
}

function Refresh-State {
    $latest = @{}
    if (Test-Path $StateFile) {
        foreach ($line in (Get-Content -Path $StateFile -ErrorAction SilentlyContinue)) {
            $parts = $line -split '\\|', 2
            if ($parts.Count -eq 2) { $latest[$parts[0]] = $parts[1] }
        }
    }

    $ready = 0
    foreach ($name in $Names) {
        $state = if ($latest.ContainsKey($name)) { $latest[$name] } else { 'PENDING' }
        $row = $Rows[$name]
        if ($state -eq 'INSTALLING') {
            $row.Dot.Fill = '#5EA8FF'; $row.Badge.Background = '#E7F2FF'; $row.Text.Foreground = '#357ABF'; $row.Text.Text = 'INSTALLING'
        } elseif ($state -eq 'READY') {
            $ready++; $row.Dot.Fill = '#65D6B0'; $row.Badge.Background = '#E5F8F1'; $row.Text.Foreground = '#2E8B70'; $row.Text.Text = 'READY'
        } elseif ($state -eq 'FAILED') {
            $row.Dot.Fill = '#FF8A7A'; $row.Badge.Background = '#FFF0ED'; $row.Text.Foreground = '#C85A4D'; $row.Text.Text = 'FAILED'
        } else {
            $row.Dot.Fill = '#C9C5BD'; $row.Badge.Background = '#F3F0EA'; $row.Text.Foreground = '#8C8790'; $row.Text.Text = 'PENDING'
        }
    }

    $progress.Value = $ready
    $counter.Text = "$ready / $($Names.Count) ready"
    if ($latest['__ALL__'] -eq 'READY') {
        $title.Text = 'Your sandbox is ready!'
        $subtitle.Text = 'Everything finished successfully. Time to play.'
    } elseif ($latest['__ALL__'] -eq 'FAILED') {
        $title.Text = 'Your sandbox is ready with a few bumps.'
        $subtitle.Text = 'One or more steps failed. You can still use the sandbox.'
    }
}

Refresh-State
$timer = New-Object System.Windows.Threading.DispatcherTimer
$timer.Interval = [TimeSpan]::FromSeconds(1)
$timer.Add_Tick({ Refresh-State })
$timer.Start()
$window.ShowDialog() | Out-Null
`;
}

export function generateRunner(apps: AppManifest[]): string {
  const dnsRecovery = readFlag('bms.fix.dnsRecovery');
  const disableSmartAppControl = readFlag('bms.fix.disableSmartAppControl');
  const fixSteps = [
    ...(dnsRecovery ? ['DNS recovery'] : []),
    ...(disableSmartAppControl ? ['App Control performance fix'] : []),
  ];
  const stepNames = [...fixSteps, ...apps.map((app) => app.name)];
  const uiScript = generateProvisioningUi(stepNames);
  const uiBase64 = utf8Base64(uiScript);
  const pendingLines = stepNames.map((name) => `Write-StepState -Name ${psQuote(name)} -Status 'PENDING'`).join('\n');

  const appBlocks = apps
    .map((app) => `Invoke-ProvisionStep -Name ${psQuote(app.name)} -Action {\n${generateInstallBlock(app)}\n}`)
    .join('\n\n');

  const dnsBlock = dnsRecovery ? `Invoke-ProvisionStep -Name 'DNS recovery' -Action { Invoke-DnsRecovery }` : '';
  const sacBlock = disableSmartAppControl ? `Invoke-ProvisionStep -Name 'App Control performance fix' -Action { Disable-SandboxSmartAppControl }` : '';

  return `# Generated by Build My Sandbox
$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$Root = 'C:\\SandboxToolbox'
$Downloads = Join-Path $Root 'Downloads'
$Tools = Join-Path $Root 'Tools'
$Logs = Join-Path $Root 'Logs'
$StateFile = Join-Path $Logs 'ProvisioningState.log'
$UiScript = Join-Path $Root 'BuildMySandboxUI.ps1'
$script:Failures = @()
foreach ($path in @($Root,$Downloads,$Tools,$Logs)) { New-Item -Path $path -ItemType Directory -Force | Out-Null }
Set-Content -Path $StateFile -Value '' -Encoding UTF8 -Force

function Write-StepState { param([string]$Name,[string]$Status) Add-Content -Path $StateFile -Value "$Name|$Status" -Encoding UTF8 }
function Download-File {
  param([string]$Url,[string]$Output,[string]$Description)
  $oldProgress = $ProgressPreference
  $ProgressPreference = 'SilentlyContinue'
  try {
    for ($attempt = 1; $attempt -le 3; $attempt++) {
      try {
        Remove-Item -Path $Output -Force -ErrorAction SilentlyContinue
        Invoke-WebRequest -Uri $Url -OutFile $Output -UseBasicParsing -ErrorAction Stop
        if (-not (Test-Path $Output) -or (Get-Item $Output).Length -le 0) { throw 'Downloaded file is empty.' }
        return
      } catch {
        if ($attempt -eq 3) { throw }
        Start-Sleep -Seconds 1
      }
    }
  } finally { $ProgressPreference = $oldProgress }
}
function Expand-Zip {
  param([string]$ZipPath,[string]$DestinationPath)
  if (Test-Path $DestinationPath) { Remove-Item $DestinationPath -Recurse -Force }
  New-Item $DestinationPath -ItemType Directory -Force | Out-Null
  Add-Type -AssemblyName System.IO.Compression.FileSystem -ErrorAction Stop
  [System.IO.Compression.ZipFile]::ExtractToDirectory($ZipPath,$DestinationPath)
}
function Invoke-ProvisionStep {
  param([string]$Name,[scriptblock]$Action)
  Write-StepState -Name $Name -Status 'INSTALLING'
  try { & $Action; Write-StepState -Name $Name -Status 'READY' }
  catch { $script:Failures += "$Name: $($_.Exception.Message)"; Write-StepState -Name $Name -Status 'FAILED'; Write-Warning "$Name failed: $($_.Exception.Message)" }
}
function Test-MicrosoftDnsProbe {
  try { return [bool](Resolve-DnsName 'www.microsoft.com' -Type A -QuickTimeout -ErrorAction Stop) } catch { return $false }
}
function Test-GoogleDnsDirect {
  try { return [bool](Resolve-DnsName 'www.microsoft.com' -Server '8.8.8.8' -Type A -QuickTimeout -ErrorAction Stop) } catch { return $false }
}
function Invoke-DnsRecovery {
  if (Test-MicrosoftDnsProbe) {
    Write-Host 'Microsoft DNS probe already resolves; no DNS change is needed.'
    return
  }

  $dnsServer = '8.8.8.8'
  if (-not (Test-GoogleDnsDirect)) {
    throw 'The current DNS resolver is broken and a direct query to 8.8.8.8 also failed. This looks like a wider networking problem.'
  }

  $configured = $false

  try {
    $adapter = Get-NetAdapter -ErrorAction Stop |
      Where-Object { $_.Status -eq 'Up' } |
      Select-Object -First 1

    if (-not $adapter) { throw 'No active adapter found.' }

    Write-Host "Trying PowerShell DNS recovery on $($adapter.Name), ifIndex $($adapter.ifIndex)."
    Set-DnsClientServerAddress -InterfaceIndex $adapter.ifIndex -ServerAddresses $dnsServer -ErrorAction Stop
    ipconfig /flushdns | Out-Null
    Start-Sleep -Seconds 1

    if (Test-MicrosoftDnsProbe) {
      Write-Host 'DNS recovery succeeded with PowerShell network cmdlets.'
      $configured = $true
    } else {
      Write-Warning 'PowerShell DNS configuration completed, but DNS still does not resolve. Trying netsh fallback.'
    }
  } catch {
    Write-Warning "PowerShell DNS recovery failed: $($_.Exception.Message). Trying netsh fallback."
  }

  if (-not $configured) {
    $rawInterfaces = netsh interface ipv4 show interfaces 2>&1
    $candidateIndexes = @()

    foreach ($line in $rawInterfaces) {
      if ($line -match '^\\s*(\\d+)\\s+\\d+\\s+\\d+\\s+connected\\s+(.+)$') {
        $idx = [int]$Matches[1]
        $name = $Matches[2].Trim()
        if ($idx -gt 1 -and $name -notmatch 'Loopback' -and $candidateIndexes -notcontains $idx) {
          $candidateIndexes += $idx
        }
      }
    }

    if ($candidateIndexes.Count -eq 0) {
      throw 'netsh could not identify a connected non-loopback IPv4 interface.'
    }

    foreach ($idx in $candidateIndexes) {
      Write-Host "Trying netsh DNS recovery on interface index $idx."
      & netsh.exe interface ipv4 set dnsservers name="$idx" source=static address=$dnsServer validate=no | Out-Null

      if ($LASTEXITCODE -ne 0) {
        Write-Warning "netsh returned exit code $LASTEXITCODE for interface $idx."
        continue
      }

      ipconfig /flushdns | Out-Null
      Start-Sleep -Seconds 1

      if (Test-MicrosoftDnsProbe) {
        Write-Host "DNS recovery succeeded with netsh on interface index $idx."
        $configured = $true
        break
      }
    }
  }

  if (-not $configured) {
    throw 'DNS recovery failed with both PowerShell network cmdlets and netsh.'
  }
}
function Disable-SandboxSmartAppControl {
  # Disposable Sandbox only. Do not apply this workaround to normal managed endpoints.
  Set-ItemProperty -Path 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\CI\\Policy' -Name 'VerifiedAndReputablePolicyState' -Value 0 -ErrorAction Stop
  cmd /c "echo.| CiTool.exe -r" | Out-Null
}

[IO.File]::WriteAllBytes($UiScript, [Convert]::FromBase64String('${uiBase64}'))
${pendingLines}
Start-Process -FilePath 'powershell.exe' -ArgumentList @('-NoLogo','-NoProfile','-WindowStyle','Hidden','-ExecutionPolicy','Bypass','-File',$UiScript) -WindowStyle Hidden

${dnsBlock}
${sacBlock}
${appBlocks}

if ($script:Failures.Count -eq 0) { Write-StepState -Name '__ALL__' -Status 'READY' }
else { Write-StepState -Name '__ALL__' -Status 'FAILED' }
`;
}
