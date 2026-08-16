import type { AppManifest } from '../types.js';

export function resolveAppDependencies(
  selectedIds: string[],
  catalog: Map<string, AppManifest>,
): string[] {
  const resolved: string[] = [];
  const visiting = new Set<string>();
  const visited = new Set<string>();

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
  return resolved;
}
