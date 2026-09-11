import type { AppManifest } from '../types.js';

export function resolveAppDependencies(
  selectedIds: string[],
  catalog: Map<string, AppManifest>,
): string[] {
  const resolved: string[] = [];
  const visiting = new Set<string>();
  const visited = new Set<string>();

  // PsExec is optional for PowerShell 7. Only expose the SYSTEM action when
  // the user explicitly selected PsExec as part of the same build.
  const powerShell7 = catalog.get('powershell7');
  if (powerShell7) {
    const actions = (powerShell7.actions ?? []).filter((action) => action.name !== 'PowerShell 7 - SYSTEM');
    if (selectedIds.includes('pstools')) {
      actions.push({
        name: 'PowerShell 7 - SYSTEM',
        type: 'command',
        command: 'C:\\SandboxToolbox\\Tools\\PsTools\\PsExec64.exe',
        arguments: '-accepteula -s -i "C:\\Program Files\\PowerShell\\7\\pwsh.exe" -NoLogo -NoExit',
        elevated: true,
        startMenu: false,
        uiLabel: 'PowerShell 7 as SYSTEM',
      });
    }
    powerShell7.actions = actions;
  }

  const visit = (id: string) => {
    if (visited.has(id)) return;
    if (visiting.has(id)) throw new Error(`Dependency cycle detected at ${id}`);

    const app = catalog.get(id);
    if (!app) throw new Error(`Unknown application: ${id}`);

    visiting.add(id);
    for (const dependency of app.dependencies ?? []) visit(dependency);
    visiting.delete(id);
    visited.add(id);
    resolved.push(id);
  };

  for (const id of selectedIds) visit(id);

  // When both were explicitly selected, PsExec must be available before
  // PowerShell 7 becomes READY so its SYSTEM launch action can work immediately.
  const psToolsIndex = resolved.indexOf('pstools');
  const powerShell7Index = resolved.indexOf('powershell7');
  if (psToolsIndex !== -1 && powerShell7Index !== -1 && psToolsIndex > powerShell7Index) {
    const [psTools] = resolved.splice(psToolsIndex, 1);
    resolved.splice(powerShell7Index, 0, psTools);
  }

  return resolved;
}
