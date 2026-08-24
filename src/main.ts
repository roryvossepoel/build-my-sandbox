import JSZip from 'jszip';
import './styles.css';
import './playground.css';
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
let advancedMode = false;
let activeTab: 'summary' | 'wsb' | 'powershell' = 'summary';
let draggedAppId: string | null = null;

const root = document.querySelector<HTMLDivElement>('#app')!;
if (!root || !profile) throw new Error('Windows Sandbox Builder could not initialize.');

const safeName = (value: string) => value.trim().replace(/[^a-z0-9-_]+/gi, '-').replace(/^-+|-+$/g, '') || 'Windows-Sandbox';
const cloneProfile = (value: SandboxProfile) => structuredClone(value);
const boolText = (value: boolean | undefined) => (value === false ? 'Off' : 'On');

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

function addApp(id: string) {
  if (!catalog.has(id) || profile.apps.includes(id)) return;
  profile.apps = [...profile.apps, id];
}

function removeApp(id: string) {
  profile.apps = profile.apps.filter((item) => item !== id);
}

function categoryEmoji(category: string) {
  const name = category.toLowerCase();
  if (name.includes('develop')) return '🧩';
  if (name.includes('trouble')) return '🧰';
  if (name.includes('pack')) return '📦';
  if (name.includes('runtime')) return '⚙️';
  if (name.includes('windows')) return '🪟';
  return '✨';
}

function summaryMarkup(selectedApps: AppManifest[]) {
  const dependencyCount = selectedApps.filter((app) => !profile.apps.includes(app.id)).length;
  return `
    <div class="summary-grid playful-summary">
      <div class="summary-card"><span>Memory</span><strong>${profile.sandbox.memoryMB ?? 4096} MB</strong></div>
      <div class="summary-card"><span>Networking</span><strong>${boolText(profile.sandbox.networking)}</strong></div>
      <div class="summary-card"><span>Clipboard</span><strong>${boolText(profile.sandbox.clipboard)}</strong></div>
      <div class="summary-card"><span>vGPU</span><strong>${boolText(profile.sandbox.vGpu)}</strong></div>
    </div>
    <div class="summary-list">
      <div><span>Tools you picked</span><strong>${profile.apps.length}</strong></div>
      <div><span>Helpful dependencies</span><strong>${dependencyCount}</strong></div>
      <div><span>Total tools in the sandbox</span><strong>${selectedApps.length}</strong></div>
      <div><span>Built where?</span><strong>Right here in your browser</strong></div>
    </div>
  `;
}

function render() {
  const { selectedApps, runner, wsb } = artifactSet();
  const resolvedIds = new Set(selectedApps.map((app) => app.id));
  const categories = [...new Set(apps.map((app) => app.category))];
  const dependencyApps = selectedApps.filter((app) => !profile.apps.includes(app.id));

  root.innerHTML = `
    <div class="playground-decor decor-a"></div>
    <div class="playground-decor decor-b"></div>
    <div class="playground-decor decor-c"></div>

    <header class="topbar playground-topbar">
      <a class="brand" href="#playground" aria-label="Windows Sandbox Builder home">
        <span class="brand-mark sand-logo">🏖️</span>
        <span><strong>Windows Sandbox Builder</strong><small>Build a Windows playground worth playing in.</small></span>
      </a>
      <div class="topbar-actions">
        <div class="mode-switch" role="group" aria-label="Builder mode">
          <button class="${advancedMode ? '' : 'active'}" data-mode="basic">Play mode</button>
          <button class="${advancedMode ? 'active' : ''}" data-mode="advanced">Advanced</button>
        </div>
        <a class="github-link" href="https://github.com/roryvossepoel/windows-sandbox-builder" target="_blank" rel="noreferrer">GitHub ↗</a>
      </div>
    </header>

    <main id="playground" class="playground-shell">
      <section class="hero-playground">
        <div class="hero-copy">
          <span class="hero-kicker">PICK · DROP · BUILD · PLAY</span>
          <h1>Build your perfect<br><span>Windows Sandbox.</span></h1>
          <p>Choose a starting point, toss in your favorite tools and generate a disposable Windows playground in seconds.</p>
          <div class="hero-actions">
            <button class="hero-primary" data-scroll-to="builder-zone">Start playing ↓</button>
            <button class="hero-secondary" data-profile-shortcut="sandbox-elite">Load Sandbox Elite ✨</button>
          </div>
        </div>
        <div class="sandbox-illustration" aria-hidden="true">
          <div class="sun"></div>
          <div class="cloud cloud-one"></div>
          <div class="cloud cloud-two"></div>
          <div class="floating-tool tool-one">PS</div>
          <div class="floating-tool tool-two">7Z</div>
          <div class="floating-tool tool-three">VS</div>
          <div class="sandpit">
            <span class="bucket">🪣</span>
            <span class="spade">🛠️</span>
            <strong>YOUR<br>SANDBOX</strong>
          </div>
        </div>
      </section>

      <section class="preset-strip">
        <div class="strip-copy"><span>CHOOSE A STARTING POINT</span><strong>Pick a preset, then make it yours.</strong></div>
        <div class="preset-pills">
          ${profiles.map((item, index) => `
            <button class="preset-pill color-${(index % 4) + 1} ${item.id === profile.id ? 'selected' : ''}" data-profile="${item.id}">
              <span>${item.id === 'sandbox-elite' ? '✨' : index === 0 ? '🌱' : '🧱'}</span>
              <strong>${item.name}</strong>
              <small>${item.apps.length} tools</small>
            </button>`).join('')}
        </div>
      </section>

      <section id="builder-zone" class="builder-playground">
        <aside class="toybox-card">
          <div class="play-section-title">
            <span class="step-bubble">1</span>
            <div><span class="mini-kicker">THE TOY BOX</span><h2>Pick your tools</h2><p>Drag them into your sandbox — or just tap one.</p></div>
          </div>
          <div class="toybox-search-wrap"><span>⌕</span><input id="tool-search" placeholder="Find a tool..." autocomplete="off"></div>
          <div class="toybox-categories">
            ${categories.map((category) => `
              <div class="toy-category" data-category="${escapeHtml(category)}">
                <h3>${categoryEmoji(category)} ${category}</h3>
                <div class="toy-grid">
                  ${apps.filter((app) => app.category === category).map((app, index) => {
                    const selected = profile.apps.includes(app.id);
                    return `<button class="toy-card ${selected ? 'in-sandbox' : ''} toy-color-${(index % 5) + 1}" draggable="true" data-drag-app="${app.id}" data-app-add="${app.id}" data-search="${escapeHtml(`${app.name} ${app.publisher ?? ''} ${app.category}`.toLowerCase())}">
                      <span class="toy-icon">${appInitials(app.name)}</span>
                      <span class="toy-copy"><strong>${app.name}</strong><small>${app.publisher ?? app.category}</small></span>
                      <span class="toy-add">${selected ? '✓' : '+'}</span>
                    </button>`;
                  }).join('')}
                </div>
              </div>`).join('')}
          </div>
        </aside>

        <section class="sandbox-stage-card">
          <div class="play-section-title">
            <span class="step-bubble coral">2</span>
            <div><span class="mini-kicker">MY SANDBOX</span><h2>Drop your tools here</h2><p>This is your disposable Windows playground.</p></div>
          </div>

          <div id="sandbox-dropzone" class="sandbox-dropzone ${profile.apps.length ? 'has-tools' : 'empty'}">
            <div class="sand-texture"></div>
            ${profile.apps.length === 0 ? `
              <div class="empty-sandbox">
                <div class="empty-bucket">🪣</div>
                <strong>Your sandbox is waiting.</strong>
                <span>Drag in a few tools and make some sandcastles.</span>
              </div>` : `
              <div class="sandbox-tools">
                ${profile.apps.map((id, index) => {
                  const app = catalog.get(id);
                  if (!app) return '';
                  return `<article class="sandbox-tool tool-color-${(index % 5) + 1}" draggable="true">
                    <span class="sandbox-tool-icon">${appInitials(app.name)}</span>
                    <span><strong>${app.name}</strong><small>${app.publisher ?? app.category}</small></span>
                    <button data-app-remove="${app.id}" aria-label="Remove ${escapeHtml(app.name)}">×</button>
                  </article>`;
                }).join('')}
              </div>`}
          </div>

          ${dependencyApps.length ? `<div class="dependency-shelf"><span>🧩 We quietly added:</span>${dependencyApps.map((app) => `<span class="dependency-chip">${app.name}</span>`).join('')}</div>` : ''}

          <div class="quick-settings">
            <label class="quick-card"><span class="quick-icon">🧠</span><span><strong>Memory</strong><small>Room to play</small></span><select id="memory">${[4096, 6144, 8192, 12288, 16384].map((value) => `<option value="${value}" ${value === (profile.sandbox.memoryMB ?? 4096) ? 'selected' : ''}>${value / 1024} GB</option>`).join('')}</select></label>
            ${[
              ['networking', '🌐', 'Networking', 'Let it explore the web'],
              ['clipboard', '📋', 'Clipboard', 'Copy & paste with the host'],
            ].map(([key, icon, title, description]) => `<label class="quick-card toggle-setting"><span class="quick-icon">${icon}</span><span><strong>${title}</strong><small>${description}</small></span><input type="checkbox" data-setting="${key}" ${(profile.sandbox as Record<string, unknown>)[key] !== false ? 'checked' : ''}><span class="switch"></span></label>`).join('')}
          </div>

          ${advancedMode ? `
            <div class="advanced-drawer">
              <div class="advanced-heading"><div><span>🧪 ADVANCED PLAYGROUND</span><strong>More knobs. More switches. More fun.</strong></div><small>For builders who want to peek behind the curtain.</small></div>
              <div class="advanced-grid">
                ${[
                  ['vGpu', '🎮', 'vGPU', 'Virtualized GPU acceleration'],
                  ['audioInput', '🎙️', 'Audio input', 'Share microphone input'],
                  ['videoInput', '📷', 'Video input', 'Share camera input'],
                  ['printerRedirection', '🖨️', 'Printers', 'Redirect host printers'],
                  ['protectedClient', '🛡️', 'Protected client', 'Extra isolation mode'],
                ].map(([key, icon, title, description]) => `<label class="advanced-option toggle-setting"><span>${icon}</span><div><strong>${title}</strong><small>${description}</small></div><input type="checkbox" data-setting="${key}" ${(profile.sandbox as Record<string, unknown>)[key] === true ? 'checked' : ''}><span class="switch"></span></label>`).join('')}
              </div>
            </div>` : ''}
        </section>

        <aside class="build-card">
          <div class="play-section-title compact-title">
            <span class="step-bubble mint">3</span>
            <div><span class="mini-kicker">PACK IT UP</span><h2>Ready to play?</h2></div>
          </div>
          <div class="sandbox-name"><span>Current build</span><strong>${profile.name}</strong><p>${profile.description ?? 'A custom Windows Sandbox playground.'}</p></div>
          <div class="build-stats">
            <div><span>🧸 Tools</span><strong>${selectedApps.length}</strong></div>
            <div><span>🧩 Dependencies</span><strong>${dependencyApps.length}</strong></div>
            <div><span>🧠 Memory</span><strong>${(profile.sandbox.memoryMB ?? 4096) / 1024} GB</strong></div>
            <div><span>🌐 Network</span><strong>${boolText(profile.sandbox.networking)}</strong></div>
          </div>
          <div class="ready-card"><span>✓</span><div><strong>Your sandbox is ready to play.</strong><small>No backend. No account. Built locally in your browser.</small></div></div>
          <button id="download-wsb" class="big-play-button">🏖️ Build my .WSB</button>
          <button id="download-bundle" class="bundle-play-button">📦 Take the whole bundle</button>
          <small class="bundle-note">Includes the .wsb, runner.ps1 and configuration.json.</small>
        </aside>
      </section>

      <section class="review-playground">
        <div class="play-section-title">
          <span class="step-bubble violet">4</span>
          <div><span class="mini-kicker">PEEK UNDER THE HOOD</span><h2>What’s in your sandbox?</h2><p>Curious builders can inspect everything before launch.</p></div>
        </div>
        <div class="tabs playful-tabs">
          <button data-tab="summary" class="${activeTab === 'summary' ? 'active' : ''}">Quick look</button>
          <button data-tab="wsb" class="${activeTab === 'wsb' ? 'active' : ''}">WSB</button>
          <button data-tab="powershell" class="${activeTab === 'powershell' ? 'active' : ''}">PowerShell</button>
        </div>
        <div class="preview-panel playful-preview">
          ${activeTab === 'summary' ? summaryMarkup(selectedApps) : `<pre><code>${escapeHtml(activeTab === 'wsb' ? wsb : runner)}</code></pre>`}
        </div>
      </section>
    </main>
  `;

  wireEvents();
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[character] ?? character);
}

function wireEvents() {
  document.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach((button) => {
    button.addEventListener('click', () => {
      advancedMode = button.dataset.mode === 'advanced';
      render();
      document.querySelector('#builder-zone')?.scrollIntoView({ block: 'start' });
    });
  });

  document.querySelectorAll<HTMLButtonElement>('[data-profile], [data-profile-shortcut]').forEach((button) => {
    button.addEventListener('click', () => {
      const profileId = button.dataset.profile ?? button.dataset.profileShortcut;
      const next = profiles.find((item) => item.id === profileId);
      if (!next) return;
      profile = cloneProfile(next);
      render();
      document.querySelector('#builder-zone')?.scrollIntoView({ block: 'start' });
    });
  });

  document.querySelectorAll<HTMLButtonElement>('[data-scroll-to]').forEach((button) => {
    button.addEventListener('click', () => document.querySelector(`#${button.dataset.scrollTo}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  });

  document.querySelector<HTMLInputElement>('#tool-search')?.addEventListener('input', (event) => {
    const query = (event.currentTarget as HTMLInputElement).value.trim().toLowerCase();
    document.querySelectorAll<HTMLElement>('[data-search]').forEach((card) => {
      card.hidden = Boolean(query) && !(card.dataset.search ?? '').includes(query);
    });
  });

  document.querySelectorAll<HTMLButtonElement>('[data-app-add]').forEach((button) => {
    button.addEventListener('click', () => {
      const id = button.dataset.appAdd;
      if (!id) return;
      if (profile.apps.includes(id)) removeApp(id); else addApp(id);
      render();
      document.querySelector('#builder-zone')?.scrollIntoView({ block: 'start' });
    });
  });

  document.querySelectorAll<HTMLElement>('[data-drag-app]').forEach((card) => {
    card.addEventListener('dragstart', (event) => {
      draggedAppId = card.dataset.dragApp ?? null;
      if (draggedAppId) event.dataTransfer?.setData('text/plain', draggedAppId);
      event.dataTransfer?.setDragImage(card, 24, 24);
    });
    card.addEventListener('dragend', () => { draggedAppId = null; });
  });

  const dropzone = document.querySelector<HTMLElement>('#sandbox-dropzone');
  dropzone?.addEventListener('dragover', (event) => {
    event.preventDefault();
    dropzone.classList.add('drag-over');
  });
  dropzone?.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));
  dropzone?.addEventListener('drop', (event) => {
    event.preventDefault();
    dropzone.classList.remove('drag-over');
    const id = event.dataTransfer?.getData('text/plain') || draggedAppId;
    if (!id) return;
    addApp(id);
    render();
    document.querySelector('#builder-zone')?.scrollIntoView({ block: 'start' });
  });

  document.querySelectorAll<HTMLButtonElement>('[data-app-remove]').forEach((button) => {
    button.addEventListener('click', () => {
      const id = button.dataset.appRemove;
      if (!id) return;
      removeApp(id);
      render();
      document.querySelector('#builder-zone')?.scrollIntoView({ block: 'start' });
    });
  });

  document.querySelector<HTMLSelectElement>('#memory')?.addEventListener('change', (event) => {
    profile.sandbox.memoryMB = Number((event.currentTarget as HTMLSelectElement).value);
    render();
    document.querySelector('#builder-zone')?.scrollIntoView({ block: 'start' });
  });

  document.querySelectorAll<HTMLInputElement>('[data-setting]').forEach((input) => {
    input.addEventListener('change', () => {
      const key = input.dataset.setting as keyof SandboxProfile['sandbox'];
      (profile.sandbox[key] as boolean | undefined) = input.checked;
      render();
      document.querySelector('#builder-zone')?.scrollIntoView({ block: 'start' });
    });
  });

  document.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach((button) => {
    button.addEventListener('click', () => {
      activeTab = button.dataset.tab as typeof activeTab;
      render();
      document.querySelector('.review-playground')?.scrollIntoView({ block: 'start' });
    });
  });

  document.querySelector<HTMLButtonElement>('#download-wsb')?.addEventListener('click', () => {
    const { wsb } = artifactSet();
    downloadBlob(wsb, `${safeName(profile.name)}.wsb`, 'application/xml;charset=utf-8');
  });

  document.querySelector<HTMLButtonElement>('#download-bundle')?.addEventListener('click', () => void downloadBundle());
}

render();
