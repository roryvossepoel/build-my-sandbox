import type { AppManifest } from '../types.js';
import { generateRunner as generateRunnerV2 } from './runner-v2.js';

function decodeUtf8Base64(value: string): string {
  const binary = atob(value);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function encodeUtf8Base64(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function patchProvisioningUi(ui: string): string {
  ui = ui.replace(
    "$Rows[$name] = [pscustomobject]@{ Dot = $dot; Badge = $badge; Text = $badgeText; Actions = $actionButton; HasActions = ($actions.Count -gt 0) }",
    "$Rows[$name] = [pscustomobject]@{ Dot = $dot; Badge = $badge; Text = $badgeText; Actions = $actionButton; HasActions = ($actions.Count -gt 0); Card = $card }",
  );

  ui = ui.replace(
    String.raw`      $parts = $line -split '\|', 2
      if ($parts.Count -eq 2) { $latest[$parts[0]] = $parts[1] }`,
    String.raw`      $parts = $line -split '\|', 3
      if ($parts.Count -ge 2) {
        $latest[$parts[0]] = [pscustomobject]@{
          Status = $parts[1]
          Message = if ($parts.Count -ge 3) { $parts[2] } else { '' }
        }
      }`,
  );

  ui = ui.replace(
    "$state = if ($latest.ContainsKey($name)) { $latest[$name] } else { 'PENDING' }",
    "$entry = if ($latest.ContainsKey($name)) { $latest[$name] } else { $null }\n    $state = if ($entry) { [string]$entry.Status } else { 'PENDING' }",
  );

  ui = ui.replace(
    "$row.Dot.Fill = '#FF8A7A'; $row.Badge.Background = '#FFF0ED'; $row.Text.Foreground = '#C85A4D'; $row.Text.Text = 'FAILED'; $row.Actions.Visibility = 'Collapsed'",
    "$row.Dot.Fill = '#FF8A7A'; $row.Badge.Background = '#FFF0ED'; $row.Text.Foreground = '#C85A4D'; $row.Text.Text = 'FAILED'; $row.Actions.Visibility = 'Collapsed'; $row.Card.ToolTip = if ($entry -and $entry.Message) { $entry.Message } else { 'Open the log for details.' }",
  );

  ui = ui.replace(
    "if ($latest['__ALL__'] -eq 'READY') {",
    "if ($latest.ContainsKey('__ALL__') -and $latest['__ALL__'].Status -eq 'READY') {",
  );

  ui = ui.replace(
    "} elseif ($latest['__ALL__'] -eq 'FAILED') {\n    $title.Text = 'Your sandbox is ready with a few bumps.'\n    $subtitle.Text = 'One or more steps failed. Open the log for details.'",
    "} elseif ($latest.ContainsKey('__ALL__') -and $latest['__ALL__'].Status -eq 'FAILED') {\n    $title.Text = 'Your sandbox is ready with a few bumps.'\n    $firstFailure = $Names | ForEach-Object { if ($latest.ContainsKey($_) -and $latest[$_].Status -eq 'FAILED') { [pscustomobject]@{ Name = $_; Message = $latest[$_].Message } } } | Select-Object -First 1\n    $subtitle.Text = if ($firstFailure -and $firstFailure.Message) { \"$($firstFailure.Name): $($firstFailure.Message)\" } else { 'One or more steps failed. Open the log for details.' }",
  );

  return ui;
}

export function generateRunner(apps: AppManifest[]): string {
  let runner = generateRunnerV2(apps);

  runner = runner.replace(
    "function Write-StepState { param([string]$Name,[string]$Status) Add-Content -Path $StateFile -Value \"$Name|$Status\" -Encoding UTF8 }",
    "function Write-StepState { param([string]$Name,[string]$Status,[string]$Message='') $safeMessage = ($Message -replace '[\\r\\n|]+',' '); Add-Content -Path $StateFile -Value \"$Name|$Status|$safeMessage\" -Encoding UTF8 }",
  );

  runner = runner.replace(
    "catch { $script:Failures += \"$($Name): $($_.Exception.Message)\"; Write-StepState -Name $Name -Status 'FAILED'; Write-Log \"FAILED: $($Name) - $($_.Exception.Message)\" }",
    "catch { $message = $_.Exception.Message; $script:Failures += \"$($Name): $message\"; Write-StepState -Name $Name -Status 'FAILED' -Message $message; Write-Log \"FAILED: $($Name) - $message\" }",
  );

  const uiMatch = runner.match(/\[IO\.File\]::WriteAllBytes\(\$UiScript, \[Convert\]::FromBase64String\('([^']+)'\)\)/);
  if (uiMatch?.[1]) {
    const patchedUi = patchProvisioningUi(decodeUtf8Base64(uiMatch[1]));
    const patchedBase64 = encodeUtf8Base64(patchedUi);
    runner = runner.replace(uiMatch[1], patchedBase64);
  }

  return runner;
}
