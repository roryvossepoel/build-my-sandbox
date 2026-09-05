import { gzip } from 'pako';
import type { SandboxProfile } from '../types.js';

const boolSetting = (value: boolean | undefined, enabled: string, disabled: string) =>
  value === false ? disabled : enabled;

const escapeXml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');

function readFlag(key: string): boolean {
  try {
    return globalThis.localStorage?.getItem(key) === 'true';
  } catch {
    return false;
  }
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function compressRunner(runner: string): string {
  return bytesToBase64(gzip(new TextEncoder().encode(runner), { level: 9 }));
}

function buildBootstrap(runner: string): string {
  const payload = compressRunner(runner);
  const dnsRecovery = readFlag('bms.fix.dnsRecovery');

  const dnsBootstrap = dnsRecovery
    ? `try { $adapter = Get-NetAdapter -ErrorAction Stop | Where-Object { $_.Status -eq 'Up' } | Select-Object -First 1; if (-not $adapter) { throw 'No active adapter found' }; Set-DnsClientServerAddress -InterfaceIndex $adapter.ifIndex -ServerAddresses '8.8.8.8' -ErrorAction Stop } catch { Write-Host 'PowerShell network cmdlets failed - using netsh fallback'; netsh interface ipv4 set dnsservers name='Ethernet' source=static address=8.8.8.8 validate=no | Out-Null }; if (-not (Resolve-DnsName 'www.microsoft.com' -QuickTimeout -ErrorAction SilentlyContinue)) { netsh interface ipv4 set dnsservers name='Ethernet' source=static address=8.8.8.8 validate=no | Out-Null }; while (-not (Resolve-DnsName 'www.microsoft.com' -QuickTimeout -ErrorAction SilentlyContinue)) { Start-Sleep -Seconds 2 }; `
    : '';

  return `${dnsBootstrap}$root = 'C:\\SandboxToolbox'; New-Item -Path $root -ItemType Directory -Force | Out-Null; $runnerPath = Join-Path $root 'runner.ps1'; $bytes = [Convert]::FromBase64String('${payload}'); $input = [System.IO.MemoryStream]::new($bytes); $gzip = [System.IO.Compression.GZipStream]::new($input, [System.IO.Compression.CompressionMode]::Decompress); $reader = [System.IO.StreamReader]::new($gzip, [System.Text.Encoding]::UTF8); $script = $reader.ReadToEnd(); $reader.Dispose(); $gzip.Dispose(); $input.Dispose(); [System.IO.File]::WriteAllText($runnerPath, $script, [System.Text.Encoding]::UTF8); powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File $runnerPath`;
}

export function generateWsb(profile: SandboxProfile, runner?: string): string {
  const memory = profile.sandbox.memoryMB ?? 4096;
  const networking = boolSetting(profile.sandbox.networking, 'Enable', 'Disable');
  const clipboard = boolSetting(profile.sandbox.clipboard, 'Enable', 'Disable');
  const vGpu = boolSetting(profile.sandbox.vGpu, 'Enable', 'Disable');

  const mappedFolders = [...(profile.mappedFolders ?? [])];
  if (readFlag('bms.map.hostDownloads')) {
    mappedFolders.push({
      hostFolder: 'C:\\Users\\%username%\\Downloads',
      readOnly: !readFlag('bms.map.hostDownloadsWrite'),
    });
  }

  const mappedFoldersXml = mappedFolders.length
    ? `\n  <MappedFolders>\n${mappedFolders
        .map((folder) => {
          const sandboxFolderXml = folder.sandboxFolder
            ? `\n      <SandboxFolder>${escapeXml(folder.sandboxFolder)}</SandboxFolder>`
            : '';
          return `    <MappedFolder>\n      <HostFolder>${escapeXml(folder.hostFolder)}</HostFolder>${sandboxFolderXml}\n      <ReadOnly>${folder.readOnly ? 'true' : 'false'}</ReadOnly>\n    </MappedFolder>`;
        })
        .join('\n')}\n  </MappedFolders>`
    : '';

  const command = runner
    ? `powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -Command "${buildBootstrap(runner)}"`
    : 'powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File C:\\SandboxBuilder\\runner.ps1';

  return `<Configuration>\n  <MemoryInMB>${memory}</MemoryInMB>\n  <Networking>${networking}</Networking>\n  <ClipboardRedirection>${clipboard}</ClipboardRedirection>\n  <VGpu>${vGpu}</VGpu>${mappedFoldersXml}\n  <LogonCommand>\n    <Command>${escapeXml(command)}</Command>\n  </LogonCommand>\n</Configuration>\n`;
}
