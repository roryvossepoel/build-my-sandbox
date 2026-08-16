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

function encodePowerShell(script: string): string {
  const bytes = new Uint8Array(script.length * 2);
  for (let index = 0; index < script.length; index += 1) {
    const code = script.charCodeAt(index);
    bytes[index * 2] = code & 0xff;
    bytes[index * 2 + 1] = code >> 8;
  }

  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function generateWsb(profile: SandboxProfile, runner?: string): string {
  const memory = profile.sandbox.memoryMB ?? 4096;
  const networking = boolSetting(profile.sandbox.networking, 'Enable', 'Disable');
  const clipboard = boolSetting(profile.sandbox.clipboard, 'Enable', 'Disable');
  const vGpu = boolSetting(profile.sandbox.vGpu, 'Enable', 'Disable');

  const mappedFolders = (profile.mappedFolders ?? []).length
    ? `\n  <MappedFolders>\n${(profile.mappedFolders ?? [])
        .map(
          (folder) => `    <MappedFolder>\n      <HostFolder>${escapeXml(folder.hostFolder)}</HostFolder>\n      <SandboxFolder>${escapeXml(folder.sandboxFolder)}</SandboxFolder>\n      <ReadOnly>${folder.readOnly ? 'true' : 'false'}</ReadOnly>\n    </MappedFolder>`,
        )
        .join('\n')}\n  </MappedFolders>`
    : '';

  const command = runner
    ? `powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -EncodedCommand ${encodePowerShell(runner)}`
    : 'powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File C:\\SandboxBuilder\\runner.ps1';

  return `<Configuration>\n  <MemoryInMB>${memory}</MemoryInMB>\n  <Networking>${networking}</Networking>\n  <ClipboardRedirection>${clipboard}</ClipboardRedirection>\n  <VGpu>${vGpu}</VGpu>${mappedFolders}\n  <LogonCommand>\n    <Command>${escapeXml(command)}</Command>\n  </LogonCommand>\n</Configuration>\n`;
}
