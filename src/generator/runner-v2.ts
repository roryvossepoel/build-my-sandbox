import type { AppAction, AppManifest } from '../types.js';

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

function jsonBase64(value: unknown): string {
  return utf8Base64(JSON.stringify(value));
}

function actionMap(apps: AppManifest[]): Record<string, AppAction[]> {
  return Object.fromEntries(apps.map((app) => [app.name, app.actions ?? []]));
}

function launcherScript(action: AppAction): string {
  if (action.type === 'folder') {
    return `Start-Process -FilePath 'explorer.exe' -ArgumentList ${psQuote(action.path ?? '')}`;
  }

  const target = action.type === 'app' ? (action.path ?? '') : (action.command ?? '');
  const args = action.arguments ?? '';
  const verb = action.elevated ? " -Verb 'RunAs'" : '';
  return `$target = ${psQuote(target)}\n$args = ${psQuote(args)}\nStart-Process -FilePath $target -ArgumentList $args${verb}`;
}

function safeFileName(value: string): string {
  return value.replace(/[\\/:*?"<>|]/g, '-').trim();
}

function generateShortcutBlocks(apps: AppManifest[]): string {
  const blocks: string[] = [];
  for (const app of apps) {
    for (const action of app.actions ?? []) {
      if (action.startMenu === false) continue;
      const safe = safeFileName(action.name);
      const launcherPath = `C:\\SandboxToolbox\\Launchers\\${safe}.ps1`;
      const shortcutPath = `C:\\ProgramData\\Microsoft\\Windows\\Start Menu\\Programs\\Build My Sandbox\\${safe}.lnk`;
      const launcherB64 = utf8Base64(launcherScript(action));
      blocks.push(`[IO.File]::WriteAllBytes(${psQuote(launcherPath)}, [Convert]::FromBase64String('${launcherB64}'))`);
      blocks.push(`New-Shortcut -Path ${psQuote(shortcutPath)} -Target 'powershell.exe' -Arguments ${psQuote(`-NoLogo -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File "${launcherPath}"`)} -WorkingDirectory $Root`);
    }
  }
  return blocks.join('\n');
}

function generateInstallBlock(app: AppManifest): string {
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
      lines.push(`if ($p.ExitCode -notin @(0,3010)) { throw ${psQuote(`${app.name} installer failed`)} + " with exit code $($p.ExitCode)." }`);
      break;
    case 'msi':
      lines.push(`$p = Start-Process -FilePath 'msiexec.exe' -ArgumentList @('/i', ${psQuote(downloadPath)}, ${psQuote(app.install.silentArgs ?? '/qn /norestart')}) -Wait -PassThru`);
      lines.push(`if ($p.ExitCode -notin @(0,3010)) { throw ${psQuote(`${app.name} installer failed`)} + " with exit code $($p.ExitCode)." }`);
      break;
    case 'script':
      lines.push(`& powershell.exe -NoProfile -ExecutionPolicy Bypass -File ${psQuote(downloadPath)}`);
      lines.push(`if ($LASTEXITCODE -and $LASTEXITCODE -ne 0) { throw ${psQuote(`${app.name} script failed`)} }`);
      break;
  }

  if (app.install.postInstall?.length) lines.push(...app.install.postInstall);

  if (app.detection.type === 'file') {
    lines.push(`if (-not (Test-Path -LiteralPath ${psQuote(app.detection.value)})) { throw ${psQuote(`${app.name} was not detected after provisioning.`)} }`);
  } else if (app.detection.type === 'registry') {
    lines.push(`if (-not (Test-Path -LiteralPath ${psQuote(app.detection.value)})) { throw ${psQuote(`${app.name} registry detection failed after provisioning.`)} }`);
  } else {
    lines.push(`& powershell.exe -NoProfile -Command ${psQuote(app.detection.value)} | Out-Null; if ($LASTEXITCODE -ne 0) { throw ${psQuote(`${app.name} command detection failed after provisioning.`)} }`);
  }

  return lines.join('\n');
}

function generateUi(stepNames: string[], actions: Record<string, AppAction[]>): string {
  const names = stepNames.map(psQuote).join(', ');
  const actionsB64 = jsonBase64(actions);
  return `
$ErrorActionPreference = 'SilentlyContinue'
Add-Type -AssemblyName PresentationFramework
Add-Type -AssemblyName PresentationCore
Add-Type -AssemblyName WindowsBase

$StateFile = 'C:\\SandboxToolbox\\Logs\\ProvisioningState.log'
$LogFile = 'C:\\SandboxToolbox\\Logs\\BuildMySandbox.log'
$Names = @(${names})
$Rows = @{}
$ActionJson = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${actionsB64}'))
$ActionMap = ConvertFrom-Json $ActionJson

function Invoke-ToolAction {
  param($Action)
  try {
    if ($Action.type -eq 'folder') {
      Start-Process -FilePath 'explorer.exe' -ArgumentList ([string]$Action.path) | Out-Null
      return
    }
    $target = if ($Action.type -eq 'app') { [string]$Action.path } else { [string]$Action.command }
    $args = [string]$Action.arguments
    if ($Action.elevated -eq $true) {
      Start-Process -FilePath $target -ArgumentList $args -Verb RunAs | Out-Null
    } else {
      Start-Process -FilePath $target -ArgumentList $args | Out-Null
    }
  } catch {
    [System.Windows.MessageBox]::Show($_.Exception.Message, 'Build My Sandbox') | Out-Null
  }
}

$window = New-Object System.Windows.Window
$window.Title = 'Build My Sandbox'
$window.Width = 720
$window.Height = [Math]::Min(820, [Math]::Max(500, 330 + ($Names.Count * 82)))
$window.MinWidth = 600
$window.MinHeight = 460
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

  $actionButton = New-Object System.Windows.Controls.Button
  $actionButton.Visibility = 'Collapsed'
  $actionButton.Margin = '10,0,8,0'
  $actionButton.Padding = '10,5'
  $actionButton.Background = '#EEF3FF'
  $actionButton.Foreground = '#5265C9'
  $actionButton.BorderBrush = '#D9D9FF'
  [System.Windows.Controls.Grid]::SetColumn($actionButton, 2)
  $grid.Children.Add($actionButton) | Out-Null

  $actions = @()
  $property = $ActionMap.PSObject.Properties[$name]
  if ($property) { $actions = @($property.Value) | Where-Object { $_.ui -ne $false } }
  if ($actions.Count -eq 1) {
    $actionButton.Content = if ($actions[0].type -eq 'folder') { 'Open folder' } else { 'Launch' }
    $selectedAction = $actions[0]
    $actionButton.Add_Click(({ Invoke-ToolAction $selectedAction }).GetNewClosure())
  } elseif ($actions.Count -gt 1) {
    $actionButton.Content = "Actions ($($actions.Count))"
    $menu = New-Object System.Windows.Controls.ContextMenu
    foreach ($action in $actions) {
      $item = New-Object System.Windows.Controls.MenuItem
      $item.Header = $action.name
      $selectedAction = $action
      $item.Add_Click(({ Invoke-ToolAction $selectedAction }).GetNewClosure())
      $menu.Items.Add($item) | Out-Null
    }
    $actionButton.ContextMenu = $menu
    $actionButton.Add_Click({ param($sender,$eventArgs) $sender.ContextMenu.PlacementTarget = $sender; $sender.ContextMenu.IsOpen = $true })
  }

  $badge = New-Object System.Windows.Controls.Border
  $badge.CornerRadius = 10
  $badge.Padding = '9,4'
  $badge.Background = '#F3F0EA'
  [System.Windows.Controls.Grid]::SetColumn($badge, 3)
  $grid.Children.Add($badge) | Out-Null
  $badgeText = New-Object System.Windows.Controls.TextBlock
  $badgeText.Text = 'PENDING'
  $badgeText.FontSize = 10
  $badgeText.FontWeight = 'Bold'
  $badgeText.Foreground = '#8C8790'
  $badge.Child = $badgeText

  $Rows[$name] = [pscustomobject]@{ Dot = $dot; Badge = $badge; Text = $badgeText; Actions = $actionButton; HasActions = ($actions.Count -gt 0) }
  $stack.Children.Add($card) | Out-Null
}

$footer = New-Object System.Windows.Controls.StackPanel
$footer.Orientation = 'Horizontal'
$footer.HorizontalAlignment = 'Right'
$footer.Margin = '0,12,0,0'
[System.Windows.Controls.Grid]::SetRow($footer, 3)
$root.Children.Add($footer) | Out-Null
$toolboxButton = New-Object System.Windows.Controls.Button
$toolboxButton.Content = 'Open Toolbox'
$toolboxButton.Padding = '12,6'
$toolboxButton.Margin = '0,0,8,0'
$toolboxButton.Add_Click({ Start-Process explorer.exe -ArgumentList 'C:\\SandboxToolbox' | Out-Null })
$footer.Children.Add($toolboxButton) | Out-Null
$logButton = New-Object System.Windows.Controls.Button
$logButton.Content = 'Open log'
$logButton.Padding = '12,6'
$logButton.Add_Click({ if (Test-Path $LogFile) { Start-Process notepad.exe -ArgumentList $LogFile | Out-Null } })
$footer.Children.Add($logButton) | Out-Null

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
      $row.Dot.Fill = '#5EA8FF'; $row.Badge.Background = '#E7F2FF'; $row.Text.Foreground = '#357ABF'; $row.Text.Text = 'INSTALLING'; $row.Actions.Visibility = 'Collapsed'
    } elseif ($state -eq 'READY') {
      $ready++; $row.Dot.Fill = '#65D6B0'; $row.Badge.Background = '#E5F8F1'; $row.Text.Foreground = '#2E8B70'; $row.Text.Text = 'READY'; if ($row.HasActions) { $row.Actions.Visibility = 'Visible' }
    } elseif ($state -eq 'FAILED') {
      $row.Dot.Fill = '#FF8A7A'; $row.Badge.Background = '#FFF0ED'; $row.Text.Foreground = '#C85A4D'; $row.Text.Text = 'FAILED'; $row.Actions.Visibility = 'Collapsed'
    } else {
      $row.Dot.Fill = '#C9C5BD'; $row.Badge.Background = '#F3F0EA'; $row.Text.Foreground = '#8C8790'; $row.Text.Text = 'PENDING'; $row.Actions.Visibility = 'Collapsed'
    }
  }
  $progress.Value = $ready
  $counter.Text = "$ready / $($Names.Count) ready"
  if ($latest['__ALL__'] -eq 'READY') {
    $title.Text = 'Your sandbox is ready!'
    $subtitle.Text = 'Everything finished successfully. Time to play.'
  } elseif ($latest['__ALL__'] -eq 'FAILED') {
    $title.Text = 'Your sandbox is ready with a few bumps.'
    $subtitle.Text = 'One or more steps failed. Open the log for details.'
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
  const uiBase64 = utf8Base64(generateUi(stepNames, actionMap(apps)));
  const pendingLines = stepNames.map((name) => `Write-StepState -Name ${psQuote(name)} -Status 'PENDING'`).join('\n');
  const appBlocks = apps.map((app) => `Invoke-ProvisionStep -Name ${psQuote(app.name)} -Action {\n${generateInstallBlock(app)}\n}`).join('\n\n');
  const shortcutBlocks = generateShortcutBlocks(apps);
  const dnsBlock = dnsRecovery ? `Invoke-ProvisionStep -Name 'DNS recovery' -Action { Invoke-DnsRecovery }` : '';
  const sacBlock = disableSmartAppControl ? `Invoke-ProvisionStep -Name 'App Control performance fix' -Action { Disable-SandboxSmartAppControl }` : '';

  return `# Generated by Build My Sandbox
$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$Root = 'C:\\SandboxToolbox'
$Downloads = Join-Path $Root 'Downloads'
$Tools = Join-Path $Root 'Tools'
$Logs = Join-Path $Root 'Logs'
$Launchers = Join-Path $Root 'Launchers'
$StateFile = Join-Path $Logs 'ProvisioningState.log'
$LogFile = Join-Path $Logs 'BuildMySandbox.log'
$UiScript = Join-Path $Root 'BuildMySandboxUI.ps1'
$StartMenu = Join-Path $env:ProgramData 'Microsoft\\Windows\\Start Menu\\Programs\\Build My Sandbox'
$Desktop = [Environment]::GetFolderPath('Desktop')
$script:Failures = @()
foreach ($path in @($Root,$Downloads,$Tools,$Logs,$Launchers,$StartMenu)) { New-Item -Path $path -ItemType Directory -Force | Out-Null }
Set-Content -Path $StateFile -Value '' -Encoding UTF8 -Force
Set-Content -Path $LogFile -Value "Build My Sandbox provisioning log - $(Get-Date)" -Encoding UTF8 -Force
function Write-Log { param([string]$Message) Add-Content -Path $LogFile -Value ("[{0}] {1}" -f (Get-Date -Format 'HH:mm:ss'), $Message) -Encoding UTF8 }
function Write-StepState { param([string]$Name,[string]$Status) Add-Content -Path $StateFile -Value "$Name|$Status" -Encoding UTF8 }
function Download-File {
  param([string]$Url,[string]$Output,[string]$Description)
  Write-Log "Downloading $Description from $Url"
  $oldProgress = $ProgressPreference; $ProgressPreference = 'SilentlyContinue'
  try { Invoke-WebRequest -Uri $Url -OutFile $Output -UseBasicParsing -ErrorAction Stop } finally { $ProgressPreference = $oldProgress }
  if (-not (Test-Path $Output) -or (Get-Item $Output).Length -le 0) { throw 'Downloaded file is empty.' }
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
  Write-StepState -Name $Name -Status 'INSTALLING'; Write-Log "START: $Name"
  try { & $Action; Write-StepState -Name $Name -Status 'READY'; Write-Log "READY: $Name" }
  catch { $script:Failures += "$($Name): $($_.Exception.Message)"; Write-StepState -Name $Name -Status 'FAILED'; Write-Log "FAILED: $($Name) - $($_.Exception.Message)" }
}
function Test-MicrosoftDnsProbe { try { return [bool](Resolve-DnsName 'www.microsoft.com' -Type A -QuickTimeout -ErrorAction Stop) } catch { return $false } }
function Invoke-DnsRecovery {
  if (Test-MicrosoftDnsProbe) { return }
  try {
    $adapter = Get-NetAdapter -ErrorAction Stop | Where-Object { $_.Status -eq 'Up' } | Select-Object -First 1
    if (-not $adapter) { throw 'No active adapter found.' }
    Set-DnsClientServerAddress -InterfaceIndex $adapter.ifIndex -ServerAddresses '8.8.8.8' -ErrorAction Stop
  } catch {
    & netsh.exe interface ipv4 set dnsservers name='Ethernet' source=static address=8.8.8.8 validate=no | Out-Null
  }
  ipconfig /flushdns | Out-Null
  $deadline = (Get-Date).AddSeconds(30)
  do { if (Test-MicrosoftDnsProbe) { return }; Start-Sleep -Seconds 2 } while ((Get-Date) -lt $deadline)
  throw 'DNS recovery failed.'
}
function Disable-SandboxSmartAppControl {
  Set-ItemProperty -Path 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\CI\\Policy' -Name 'VerifiedAndReputablePolicyState' -Value 0 -ErrorAction Stop
  cmd /c "echo.| CiTool.exe -r" | Out-Null
}
function New-Shortcut {
  param([string]$Path,[string]$Target,[string]$Arguments='',[string]$WorkingDirectory='')
  $shell = New-Object -ComObject WScript.Shell
  $shortcut = $shell.CreateShortcut($Path)
  $shortcut.TargetPath = $Target
  $shortcut.Arguments = $Arguments
  if ($WorkingDirectory) { $shortcut.WorkingDirectory = $WorkingDirectory }
  $shortcut.Save()
}
New-Shortcut -Path (Join-Path $Desktop 'Build My Sandbox.lnk') -Target 'explorer.exe' -Arguments $Root -WorkingDirectory $Root
[IO.File]::WriteAllBytes($UiScript, [Convert]::FromBase64String('${uiBase64}'))
${pendingLines}
Start-Process -FilePath 'powershell.exe' -ArgumentList @('-NoLogo','-NoProfile','-WindowStyle','Hidden','-ExecutionPolicy','Bypass','-File',$UiScript) -WindowStyle Hidden
${dnsBlock}
${sacBlock}
${appBlocks}
${shortcutBlocks}
if ($script:Failures.Count -eq 0) { Write-StepState -Name '__ALL__' -Status 'READY'; Write-Log 'ALL STEPS READY.' }
else { Write-StepState -Name '__ALL__' -Status 'FAILED'; Write-Log ("Completed with failures: " + ($script:Failures -join ' | ')) }
`;
}
