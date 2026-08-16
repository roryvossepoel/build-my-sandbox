import JSZip from 'jszip';
import './styles.css';
import type { AppManifest, SandboxProfile } from './types.js';
import { resolveAppDependencies } from './generator/dependencies.js';
import { generateRunner } from './generator/runner.js';
import { generateWsb } from './generator/wsb.js';

const appModules = import.meta.glob('../apps/*.json', { eager: true, import: 'default' }) as Record<string, AppManifest>;
const profileModules = import.meta.glob('../profiles/*.json', { eager: true, import: 'default' }) as Record<string, SandboxProfile>;

const apps = Object.values(appModules).sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
const profiles = Object.values(profileModules).sort((a, b) => a.name.localeCompare(b.name));
const catalog = new Map(apps.map((app) => [app.id, app]));

let profile = structuredClone(profiles.find((item) => item.id === 'sandbox-elite') ?? profiles[0]);
let activeTab: 'summary' | 'wsb' | 'powershell' = 'summary';

const root = document.querySelector<HTMLDivElement>('#app');
if (!root || !profile) throw new Error('Windows Sandbox Builder could not initialize.');

const safeName = (value: string) => value.trim().replace(/[^a-z0-9-_]+/gi, '-').replace(/^-+|-+$/g, '') || 'Windows-Sandbox';
const cloneProfile = (value: SandboxProfile) => structuredClone(value);
const boolText = (value: boolean | undefined) => (value === false ? 'Disabled' : 'Enabled');

function resolvedApps() {
  const ids = resolveAppDependencies(profile.apps, catalog);
  return ids.map((id) => catalog.get(id)).filter((app): app is AppManifest => Boolean(app));
}

function artifactSet() {
  const selectedApps = resolvedApps();
  const runner = generateRunner(selectedApps);
  const wsb = generateWsb(profile, runner);
  return { selectedApps, runner, wsb };
}

function downloadBlob(content: BlobPart, fileName: string, type: string) {
  const blob = content instanceof Blob ? content : new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function downloadBundle() {
  const { runner, wsb, selectedApps } = artifactSet();
  const base = safeName(profile.name);
  const zip = new JSZip();
  zip.file(`${base}.wsb`, wsb);
  zip.file('runner.ps1', runner);
  zip.file('configuration.json', JSON.stringify(profile, null, 2));
  zip.file(
    'README.txt',
    `Windows Sandbox Builder\n\nProfile: ${profile.name}\nApplications: ${selectedApps.length}\n\nThe .wsb file is self-contained and embeds the generated PowerShell bootstrap. runner.ps1 is included separately for review and customization.\n`,
  );
  const blob = await zip.generateAsync({ type: 'blob' });
  downloadBlob(blob, `${base}-bundle.zip`, 'application/zip');
}

function appInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function summaryMarkup(selectedApps: AppManifest[]) {
  const dependencyCount = selectedApps.filter((app) => !profile.apps.includes(app.id)).length;
  return `
    <div class="summary-grid">
      <div class="summary-card"><span>Memory</span><strong>${profile.sandbox.memoryMB ?? 4096} MB</strong></div>
      <div class="summary-card"><span>Networking</span><strong>${boolText(profile.sandbox.networking)}</strong></div>
      <div class="summary-card"><span>Clipboard</span><strong>${boolText(profile.sandbox.clipboard)}</strong></div>
      <div class="summary-card"><span>vGPU</span><strong>${boolText(profile.sandbox.vGpu)}</strong></div>
    </div>
    <div class="summary-list">
      <div><span>Selected applications</span><strong>${profile.apps.length}</strong></div>
      <div><span>Auto dependencies</span><strong>${dependencyCount}</strong></div>
      <div><span>Total provisioned apps</span><strong>${selectedApps.length}</strong></div>
      <div><span>Generation</span><strong>100% browser-side</strong></div>
    </div>
  `;
}

function render() {
  const { selectedApps, runner, wsb } = artifactSet();
  const resolvedIds = new Set(selectedApps.map((app) => app.id));
  const categories = [...new Set(apps.map((app) => app.category))];

  root.innerHTML = `
    <header class="topbar">
      <a class="brand" href="#" aria-label="Windows Sandbox Builder home">
        <span class="brand-mark">WSB</span>
        <span><strong>Windows Sandbox Builder</strong><small>Disposable Windows environments, built your way.</small></span>
      </a>
      <a class="github-link" href="https://github.com/roryvossepoel/windows-sandbox-builder" target="_blank" rel="noreferrer">Open source on GitHub ↗</a>
    </header>

    <main class="layout">
      <aside class="sidebar panel">
        <div class="eyebrow">BUILD</div>
        <nav>
          <a class="nav-item active" href="#preset">Preset <span>01</span></a>
          <a class="nav-item" href="#sandbox">Sandbox <span>02</span></a>
          <a class="nav-item" href="#applications">Applications <span>03</span></a>
          <a class="nav-item" href="#review">Review <span>04</span></a>
        </nav>
        <div class="sidebar-note">
          <strong>No backend. No account.</strong>
          <p>Your configuration stays in this browser and is generated locally.</p>
        </div>
      </aside>

      <section class="builder">
        <section id="preset" class="section-block">
          <div class="section-heading">
            <div><span class="eyebrow">STARTING POINT</span><h1>Build your Sandbox</h1><p>Choose a preset or customize every option yourself.</p></div>
          </div>
          <div class="preset-grid">
            ${profiles
              .map(
                (item) => `
                <button class="preset-card ${item.id === profile.id ? 'selected' : ''}" data-profile="${item.id}">
                  <span class="preset-badge">${item.id === 'sandbox-elite' ? 'SHOWCASE' : 'PRESET'}</span>
                  <strong>${item.name}</strong>
                  <p>${item.description ?? 'Ready-to-use Windows Sandbox configuration.'}</p>
                  <small>${item.apps.length} selected apps</small>
                </button>`,
              )
              .join('')}
          </div>
        </section>

        <section id="sandbox" class="section-block">
          <div class="section-heading"><div><span class="eyebrow">SANDBOX</span><h2>Runtime settings</h2><p>Control the resources and host integrations available to the Sandbox.</p></div></div>
          <div class="settings-grid">
            <label class="setting-card memory-setting"><span><strong>Memory</strong><small>RAM available to Windows Sandbox</small></span><select id="memory">${[4096, 6144, 8192, 12288, 16384].map((value) => `<option value="${value}" ${value === (profile.sandbox.memoryMB ?? 4096) ? 'selected' : ''}>${value / 1024} GB</option>`).join('')}</select></label>
            ${[
              ['networking', 'Networking', 'Allow network connectivity'],
              ['clipboard', 'Clipboard', 'Share clipboard with the host'],
              ['vGpu', 'vGPU', 'Enable virtualized GPU acceleration'],
            ]
              .map(([key, title, description]) => `<label class="setting-card toggle-setting"><span><strong>${title}</strong><small>${description}</small></span><input type="checkbox" data-setting="${key}" ${(profile.sandbox as Record<string, unknown>)[key] !== false ? 'checked' : ''}><span class="switch"></span></label>`)
              .join('')}
          </div>
        </section>

        <section id="applications" class="section-block">
          <div class="section-heading"><div><span class="eyebrow">APPLICATIONS</span><h2>Choose your tools</h2><p>Dependencies are detected and added automatically.</p></div><div class="app-count">${profile.apps.length} selected</div></div>
          ${categories
            .map(
              (category) => `
              <div class="category-block">
                <h3>${category}</h3>
                <div class="apps-grid">
                  ${apps
                    .filter((app) => app.category === category)
                    .map((app) => {
                      const selected = profile.apps.includes(app.id);
                      const automatic = resolvedIds.has(app.id) && !selected;
                      return `<label class="app-card ${selected || automatic ? 'selected' : ''} ${automatic ? 'automatic' : ''}">
                        <input type="checkbox" data-app="${app.id}" ${selected ? 'checked' : ''}>
                        <span class="app-icon">${appInitials(app.name)}</span>
                        <span class="app-copy"><strong>${app.name}</strong><small>${app.publisher ?? app.category}</small></span>
                        ${automatic ? '<span class="dependency-badge">DEPENDENCY</span>' : '<span class="checkmark">✓</span>'}
                      </label>`;
                    })
                    .join('')}
                </div>
              </div>`,
            )
            .join('')}
        </section>

        <section id="review" class="section-block review-block">
          <div class="section-heading"><div><span class="eyebrow">REVIEW</span><h2>Generated configuration</h2><p>Inspect exactly what will be downloaded before you launch it.</p></div></div>
          <div class="tabs">
            <button data-tab="summary" class="${activeTab === 'summary' ? 'active' : ''}">Summary</button>
            <button data-tab="wsb" class="${activeTab === 'wsb' ? 'active' : ''}">WSB</button>
            <button data-tab="powershell" class="${activeTab === 'powershell' ? 'active' : ''}">PowerShell</button>
          </div>
          <div class="preview-panel">
            ${activeTab === 'summary' ? summaryMarkup(selectedApps) : `<pre><code>${escapeHtml(activeTab === 'wsb' ? wsb : runner)}</code></pre>`}
          </div>
        </section>
      </section>

      <aside class="summary panel">
        <div class="summary-sticky">
          <span class="eyebrow">YOUR SANDBOX</span>
          <h2>${profile.name}</h2>
          <p>${profile.description ?? 'Custom Windows Sandbox configuration.'}</p>
          <div class="summary-list compact">
            <div><span>Memory</span><strong>${(profile.sandbox.memoryMB ?? 4096) / 1024} GB</strong></div>
            <div><span>Networking</span><strong>${boolText(profile.sandbox.networking)}</strong></div>
            <div><span>Clipboard</span><strong>${boolText(profile.sandbox.clipboard)}</strong></div>
            <div><span>Applications</span><strong>${selectedApps.length}</strong></div>
          </div>
          <div class="output-note"><span class="status-dot"></span><div><strong>Ready to generate</strong><small>Self-contained WSB · no server required</small></div></div>
          <button id="download-wsb" class="primary-action">Download .WSB</button>
          <button id="download-bundle" class="secondary-action">Download Bundle</button>
          <small class="bundle-note">Bundle includes .wsb, runner.ps1 and configuration.json.</small>
        </div>
      </aside>
    </main>
  `;

  wireEvents();
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[character] ?? character);
}

function wireEvents() {
  document.querySelectorAll<HTMLButtonElement>('[data-profile]').forEach((button) => {
    button.addEventListener('click', () => {
      const next = profiles.find((item) => item.id === button.dataset.profile);
      if (!next) return;
      profile = cloneProfile(next);
      render();
    });
  });

  document.querySelector<HTMLSelectElement>('#memory')?.addEventListener('change', (event) => {
    profile.sandbox.memoryMB = Number((event.currentTarget as HTMLSelectElement).value);
    render();
  });

  document.querySelectorAll<HTMLInputElement>('[data-setting]').forEach((input) => {
    input.addEventListener('change', () => {
      const key = input.dataset.setting as 'networking' | 'clipboard' | 'vGpu';
      profile.sandbox[key] = input.checked;
      render();
    });
  });

  document.querySelectorAll<HTMLInputElement>('[data-app]').forEach((input) => {
    input.addEventListener('change', () => {
      const id = input.dataset.app;
      if (!id) return;
      profile.apps = input.checked ? [...new Set([...profile.apps, id])] : profile.apps.filter((item) => item !== id);
      render();
    });
  });

  document.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach((button) => {
    button.addEventListener('click', () => {
      activeTab = button.dataset.tab as typeof activeTab;
      render();
      document.querySelector('#review')?.scrollIntoView({ block: 'start' });
    });
  });

  document.querySelector<HTMLButtonElement>('#download-wsb')?.addEventListener('click', () => {
    const { wsb } = artifactSet();
    downloadBlob(wsb, `${safeName(profile.name)}.wsb`, 'application/xml;charset=utf-8');
  });

  document.querySelector<HTMLButtonElement>('#download-bundle')?.addEventListener('click', () => void downloadBundle());
}

render();
