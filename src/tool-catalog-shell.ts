export {};

import type { AppManifest } from './types.js';

const MAX_TOOLS = 20;
const LARGE_BUILD_THRESHOLD = 15;
const repositoryBase = 'https://github.com/roryvossepoel/build-my-sandbox/blob/main/';

const appModules = import.meta.glob('../apps/*.json', { eager: true, import: 'default' }) as Record<string, AppManifest>;
const apps = Object.values(appModules);
const catalog = new Map(apps.map((app) => [app.id, app]));
const manifestPaths = new Map<string, string>();

for (const [modulePath, app] of Object.entries(appModules)) {
  manifestPaths.set(app.id, modulePath.replace(/^\.\.\//, ''));
}

function selectedIds() {
  return [...document.querySelectorAll<HTMLButtonElement>('[data-app-remove]')]
    .map((button) => button.dataset.appRemove)
    .filter((id): id is string => Boolean(id));
}

function toolCount() {
  return selectedIds().length;
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('');
}

function downloadHost(url: string) {
  try { return new URL(url).hostname.replace(/^www\./, ''); }
  catch { return 'Generated locally'; }
}

function dependencyNames(app: AppManifest) {
  if (!app.dependencies?.length) return 'None';
  return app.dependencies.map((id) => catalog.get(id)?.name ?? id).join(', ');
}

function showLimitNotice(message: string) {
  document.querySelector('.bms-tool-limit-toast')?.remove();
  const notice = document.createElement('div');
  notice.className = 'bms-tool-limit-toast';
  notice.textContent = message;
  document.body.appendChild(notice);
  window.setTimeout(() => notice.remove(), 3200);
}

function ensureLimitStatus() {
  const toybox = document.querySelector<HTMLElement>('.toybox-card');
  const search = toybox?.querySelector<HTMLElement>('.toybox-search-wrap');
  if (!toybox || !search) return;

  let status = toybox.querySelector<HTMLElement>('.bms-tool-limit-status');
  if (!status) {
    status = document.createElement('div');
    status.className = 'bms-tool-limit-status';
    const request = toybox.querySelector<HTMLElement>('.wsb-tool-request');
    if (request) request.insertAdjacentElement('afterend', status);
    else search.insertAdjacentElement('afterend', status);
  }

  const count = toolCount();
  const state = count >= MAX_TOOLS ? 'full' : count >= LARGE_BUILD_THRESHOLD ? 'warning' : 'normal';
  status.classList.toggle('warning', state === 'warning');
  status.classList.toggle('full', state === 'full');

  const nextHtml = state === 'full'
    ? `<strong>${count} / ${MAX_TOOLS} tools</strong><span>Limit reached · remove a tool to add another.</span>`
    : state === 'warning'
      ? `<strong>${count} / ${MAX_TOOLS} tools</strong><span>Large build · provisioning may take longer.</span>`
      : `<strong>${count} / ${MAX_TOOLS} tools</strong><span>Dependencies are added automatically and do not count toward this limit.</span>`;

  const stateKey = `${state}:${count}`;
  if (status.dataset.state !== stateKey) {
    status.innerHTML = nextHtml;
    status.dataset.state = stateKey;
  }
}

function updateLimitState() {
  const count = toolCount();
  const full = count >= MAX_TOOLS;
  const selected = new Set(selectedIds());

  document.querySelectorAll<HTMLButtonElement>('[data-app-add]').forEach((card) => {
    const id = card.dataset.appAdd;
    const blocked = full && Boolean(id) && !selected.has(id!);
    card.classList.toggle('bms-tool-limit-disabled', blocked);
    if (blocked) {
      card.setAttribute('aria-disabled', 'true');
      card.draggable = false;
    } else {
      card.removeAttribute('aria-disabled');
      card.draggable = true;
    }
  });

  ensureLimitStatus();
}

function closeToolDetails() {
  document.querySelector('.bms-tool-modal-backdrop')?.remove();
}

function showToolDetails(id: string) {
  const app = catalog.get(id);
  if (!app) return;
  closeToolDetails();

  const path = manifestPaths.get(id);
  const architectures = app.architectures?.length ? app.architectures.join(' · ') : 'Not specified';
  const method = app.install.type.toUpperCase();
  const sourceHost = downloadHost(app.install.url);

  const backdrop = document.createElement('div');
  backdrop.className = 'bms-tool-modal-backdrop';
  backdrop.innerHTML = `
    <section class="bms-tool-modal" role="dialog" aria-modal="true" aria-labelledby="bms-tool-modal-title">
      <button type="button" class="bms-tool-modal-close" aria-label="Close tool details">×</button>
      <div class="bms-tool-modal-header">
        <span class="bms-tool-modal-icon">${initials(app.name)}</span>
        <div>
          <span class="bms-tool-modal-kicker">TOOL DETAILS</span>
          <h2 id="bms-tool-modal-title">${app.name}</h2>
          <p>${app.publisher ?? 'Publisher not specified'}</p>
        </div>
      </div>
      ${app.description ? `<p class="bms-tool-modal-description">${app.description}</p>` : ''}
      <div class="bms-tool-meta-grid">
        <div><span>Publisher</span><strong>${app.publisher ?? 'Not specified'}</strong></div>
        <div><span>Install method</span><strong>${method}</strong></div>
        <div><span>Architecture</span><strong>${architectures}</strong></div>
        <div><span>Dependencies</span><strong>${dependencyNames(app)}</strong></div>
        <div class="wide"><span>Download host</span><strong>${sourceHost}</strong></div>
      </div>
      <div class="bms-tool-modal-actions">
        ${app.homepage ? `<a href="${app.homepage}" target="_blank" rel="noreferrer">Official page ↗</a>` : ''}
        ${path ? `<a href="${repositoryBase}${path}" target="_blank" rel="noreferrer">View manifest ↗</a>` : ''}
      </div>
      <p class="bms-tool-modal-note">Build My Sandbox uses the manifest above to generate the download and installation step. Review the generated PowerShell before launch if you want to inspect the exact command.</p>
    </section>
  `;

  document.body.appendChild(backdrop);
  backdrop.querySelector<HTMLButtonElement>('.bms-tool-modal-close')?.focus();
  backdrop.querySelector<HTMLButtonElement>('.bms-tool-modal-close')?.addEventListener('click', closeToolDetails);
  backdrop.addEventListener('click', (event) => {
    if (event.target === backdrop) closeToolDetails();
  });
}

function ensureToolDetailsButtons() {
  document.querySelectorAll<HTMLButtonElement>('.toy-card[data-app-add]').forEach((card) => {
    if (card.closest('.bms-tool-card-shell')) return;
    const id = card.dataset.appAdd;
    if (!id || !catalog.has(id)) return;

    const shell = document.createElement('div');
    shell.className = 'bms-tool-card-shell';
    card.parentElement?.insertBefore(shell, card);
    shell.appendChild(card);

    const info = document.createElement('button');
    info.type = 'button';
    info.className = 'bms-tool-info';
    info.setAttribute('aria-label', `Show details for ${catalog.get(id)?.name ?? id}`);
    info.setAttribute('title', 'Publisher, source, install method and dependencies');
    info.innerHTML = '<span aria-hidden="true">i</span>';
    info.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      showToolDetails(id);
    });
    shell.appendChild(info);
  });
}

function sortToyBoxByName() {
  const container = document.querySelector<HTMLElement>('.toybox-categories');
  if (!container) return;

  const shells = [...container.querySelectorAll<HTMLElement>('.bms-tool-card-shell')];
  shells.sort((left, right) => {
    const leftId = left.querySelector<HTMLButtonElement>('[data-app-add]')?.dataset.appAdd;
    const rightId = right.querySelector<HTMLButtonElement>('[data-app-add]')?.dataset.appAdd;
    const leftName = leftId ? catalog.get(leftId)?.name ?? leftId : '';
    const rightName = rightId ? catalog.get(rightId)?.name ?? rightId : '';
    return leftName.localeCompare(rightName, undefined, { sensitivity: 'base', numeric: true });
  });

  for (const shell of shells) container.appendChild(shell);
}

function enhanceToolCatalog() {
  ensureToolDetailsButtons();
  sortToyBoxByName();
  updateLimitState();
}

document.addEventListener('click', (event) => {
  const target = event.target as HTMLElement | null;
  const card = target?.closest<HTMLButtonElement>('[data-app-add]');
  if (!card) return;

  const id = card.dataset.appAdd;
  if (!id || selectedIds().includes(id)) return;
  if (toolCount() < MAX_TOOLS) return;

  event.preventDefault();
  event.stopImmediatePropagation();
  showLimitNotice(`A sandbox can contain up to ${MAX_TOOLS} selected tools. Remove one before adding another.`);
}, true);

document.addEventListener('drop', (event) => {
  const target = event.target as HTMLElement | null;
  if (!target?.closest('#sandbox-dropzone')) return;
  const id = event.dataTransfer?.getData('text/plain');
  if (id && selectedIds().includes(id)) return;
  if (toolCount() < MAX_TOOLS) return;

  event.preventDefault();
  event.stopImmediatePropagation();
  showLimitNotice(`A sandbox can contain up to ${MAX_TOOLS} selected tools. Remove one before adding another.`);
}, true);

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeToolDetails();
});

enhanceToolCatalog();
const appRoot = document.querySelector('#app');
if (appRoot) {
  // main.ts replaces the direct children of #app on every render. Watching only
  // that level is enough and prevents our own nested UI enhancements from
  // recursively triggering the observer.
  new MutationObserver(() => enhanceToolCatalog()).observe(appRoot, { childList: true });
}
