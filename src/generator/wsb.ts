import type { SandboxProfile } from '../types.js';

const enabledByDefault = (value: boolean | undefined) =>
  value === false ? 'Disable' : 'Enable';

const disabledByDefault = (value: boolean | undefined) =>
  value === true ? 'Enable' : 'Disable';

const escapeXml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');

export function generateWsb(profile: SandboxProfile): string {
  const memory = profile.sandbox.memoryMB ?? 4096;
  const networking = enabledByDefault(profile.sandbox.networking);
  const clipboard = enabledByDefault(profile.sandbox.clipboard);
  const vGpu = disabledByDefault(profile.sandbox.vGpu);

  const mappedFolders = (profile.mappedFolders ?? []).length
    ? `\n  <MappedFolders>\n${(profile.mappedFolders ?? [])
        .map(
          (folder) => `    <MappedFolder>\n      <HostFolder>${escapeXml(folder.hostFolder)}</HostFolder>\n      <SandboxFolder>${escapeXml(folder.sandboxFolder)}</SandboxFolder>\n      <ReadOnly>${folder.readOnly ? 'true' : 'false'}</ReadOnly>\n    </MappedFolder>`,
        )
        .join('\n')}\n  </MappedFolders>`
    : '';

  return `<Configuration>\n  <MemoryInMB>${memory}</MemoryInMB>\n  <Networking>${networking}</Networking>\n  <ClipboardRedirection>${clipboard}</ClipboardRedirection>\n  <VGpu>${vGpu}</VGpu>${mappedFolders}\n  <LogonCommand>\n    <Command>powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File C:\\SandboxBuilder\\runner.ps1</Command>\n  </LogonCommand>\n</Configuration>\n`;
}
