export {};

type ExportedSandboxConfig = {
  version: 1;
  exportedAt: string;
  apps: string[];
  sandbox: {
    memoryMB: number;
    networking: boolean;
    clipboard: boolean;
    vGpu?: boolean;
    audioInput?: boolean;
    videoInput?: boolean;
    printerRedirection?: boolean;
    protectedClient?: boolean;
  };
};

const waitForRender = () => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

function selectedAppIds() {
  return [...document.querySelectorAll<HTMLButtonElement>('[data-app-remove]')]
    .map((button) => button.dataset.appRemove)
    .filter((id): id is string => Boolean(id));
}

function currentSetting(key: string, fallback: boolean) {
  const input = document.querySelector<HTMLInputElement>(`[data-setting="${key}"]`);
  return input ? input.checked : fallback;
}

function collectConfiguration(): ExportedSandboxConfig {
  const memory = Number(document.querySelector<HTMLSelectElement>('#memory')?.value ?? 8192);
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    apps: selectedAppIds(),
    sandbox: {
      memoryMB: memory,
      networking: currentSetting('networking', true),
      clipboard: currentSetting('clipboard', true),
      vGpu: currentSetting('vGpu', false),
      audioInput: currentSetting('audioInput', false),
      videoInput: currentSetting('videoInput', false),
      printerRedirection: currentSetting('printerRedirection', false),
      protectedClient: currentSetting('protectedClient', false),
    },
  };
}

function exportConfiguration() {
  const configuration = collectConfiguration();
  const blob = new Blob([JSON.stringify(configuration, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'windows-sandbox-builder-config.json';
  anchor.click();
  URL.revokeObjectURL(url);
  showConfigNotice('Configuration exported.');
}

function showConfigNotice(message: string, kind: 'success' | 'warning' = 'success') {
  document.querySelector('.wsb-config-notice')?.remove();
  const notice = document.createElement('div');
  notice.className = `wsb-config-notice ${kind}`;
  notice.textContent = message;
  document.body.appendChild(notice);
  window.setTimeout(() => notice.remove(), 4200);
}

async function setCheckbox(key: string, value: boolean) {
  const input = document.querySelector<HTMLInputElement>(`[data-setting="${key}"]`);
  if (!input || input.checked === value) return;
  input.checked = value;
  input.dispatchEvent(new Event('change', { bubbles: true }));
  await waitForRender();
}

async function importConfiguration(file: File) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(await file.text());
  } catch {
    showConfigNotice('That file is not valid JSON.', 'warning');
    return;
  }

  if (!parsed || typeof parsed !== 'object') {
    showConfigNotice('That file is not a Windows Sandbox Builder configuration.', 'warning');
    return;
  }

  const candidate = parsed as Partial<ExportedSandboxConfig>;
  if (candidate.version !== 1 || !Array.isArray(candidate.apps) || !candidate.sandbox || typeof candidate.sandbox !== 'object') {
    showConfigNotice('Unsupported configuration format.', 'warning');
    return;
  }

  const desiredApps = [...new Set(candidate.apps.filter((id): id is string => typeof id === 'string'))];

  for (const id of selectedAppIds()) {
    if (desiredApps.includes(id)) continue;
    document.querySelector<HTMLButtonElement>(`[data-app-remove="${CSS.escape(id)}"]`)?.click();
    await waitForRender();
  }

  const unknown: string[] = [];
  for (const id of desiredApps) {
    if (selectedAppIds().includes(id)) continue;
    const addButton = document.querySelector<HTMLButtonElement>(`[data-app-add="${CSS.escape(id)}"]`);
    if (!addButton) {
      unknown.push(id);
      continue;
    }
    addButton.click();
    await waitForRender();
  }

  const memory = Number(candidate.sandbox.memoryMB);
  const memorySelect = document.querySelector<HTMLSelectElement>('#memory');
  if (memorySelect && Number.isFinite(memory) && [...memorySelect.options].some((option) => Number(option.value) === memory)) {
    memorySelect.value = String(memory);
    memorySelect.dispatchEvent(new Event('change', { bubbles: true }));
    await waitForRender();
  }

  await setCheckbox('networking', candidate.sandbox.networking !== false);
  await setCheckbox('clipboard', candidate.sandbox.clipboard !== false);

  const advancedValues = ['vGpu', 'audioInput', 'videoInput', 'printerRedirection', 'protectedClient'] as const;
  for (const key of advancedValues) {
    const value = candidate.sandbox[key];
    if (typeof value === 'boolean') await setCheckbox(key, value);
  }

  document.querySelector('#builder-zone')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  showConfigNotice(unknown.length ? `Configuration imported. ${unknown.length} unknown tool(s) were skipped.` : 'Configuration imported successfully.', unknown.length ? 'warning' : 'success');
}

function ensureImportInput() {
  let input = document.querySelector<HTMLInputElement>('#wsb-config-import');
  if (input) return input;
  input = document.createElement('input');
  input.id = 'wsb-config-import';
  input.type = 'file';
  input.accept = '.json,application/json';
  input.hidden = true;
  input.addEventListener('change', () => {
    const file = input?.files?.[0];
    if (file) void importConfiguration(file);
    if (input) input.value = '';
  });
  document.body.appendChild(input);
  return input;
}

function ensureAdvancedVisible() {
  if (document.querySelector('.advanced-drawer')) return;

  const advancedButton = document.querySelector<HTMLButtonElement>('[data-mode="advanced"]');
  if (!advancedButton) return;

  const scrollX = window.scrollX;
  const scrollY = window.scrollY;
  advancedButton.click();
  window.scrollTo({ left: scrollX, top: scrollY, behavior: 'auto' });
}

function ensureConfigActions() {
  const buildCard = document.querySelector<HTMLElement>('.build-card');
  const bundleButton = document.querySelector<HTMLButtonElement>('#download-bundle');
  if (!buildCard || !bundleButton || buildCard.querySelector('.wsb-config-actions')) return;

  const wrapper = document.createElement('div');
  wrapper.className = 'wsb-config-actions';
  wrapper.innerHTML = `
    <div class="wsb-config-actions-heading">
      <strong>Save your setup</strong>
      <span>Keep building later or share it with someone else.</span>
    </div>
    <div class="wsb-config-actions-buttons">
      <button type="button" data-card-import><span>⇧</span> Import config</button>
      <button type="button" data-card-export><span>⇩</span> Export config</button>
    </div>
  `;

  const bundleNote = buildCard.querySelector('.bundle-note');
  if (bundleNote) buildCard.insertBefore(wrapper, bundleNote);
  else bundleButton.insertAdjacentElement('afterend', wrapper);

  wrapper.querySelector<HTMLButtonElement>('[data-card-import]')?.addEventListener('click', () => ensureImportInput().click());
  wrapper.querySelector<HTMLButtonElement>('[data-card-export]')?.addEventListener('click', exportConfiguration);
}

function ensureToolRequestLink() {
  const toybox = document.querySelector<HTMLElement>('.toybox-card');
  const search = toybox?.querySelector<HTMLElement>('.toybox-search-wrap');
  if (!toybox || !search || toybox.querySelector('.wsb-tool-request')) return;

  const request = document.createElement('div');
  request.className = 'wsb-tool-request';
  request.innerHTML = `
    <span>Missing a tool?</span>
    <a href="https://github.com/roryvossepoel/build-my-sandbox/issues/new?template=tool-request.yml" target="_blank" rel="noreferrer">Request a tool ↗</a>
  `;
  search.insertAdjacentElement('afterend', request);
}

function ensureDependencyOnlyTools() {
  document.querySelector<HTMLElement>('[data-app-add="webview2"]')?.remove();

  const shelf = document.querySelector<HTMLElement>('.dependency-shelf');
  if (!shelf) return;

  if (!shelf.classList.contains('dependency-auto')) shelf.classList.add('dependency-auto');

  const label = shelf.querySelector<HTMLElement>('span:first-child');
  const nextLabel = '🧩 Added automatically because a selected tool needs it:';
  if (label && label.textContent !== nextLabel) label.textContent = nextLabel;

  shelf.querySelectorAll<HTMLElement>('.dependency-chip').forEach((chip) => {
    if (chip.getAttribute('title') !== 'Automatically included dependency') {
      chip.setAttribute('title', 'Automatically included dependency');
    }
  });
}

function enhanceProductShell() {
  ensureAdvancedVisible();
  ensureConfigActions();
  ensureToolRequestLink();
  ensureDependencyOnlyTools();

  const actions = document.querySelector<HTMLElement>('.topbar-actions');
  if (actions && !actions.querySelector('.wsb-product-nav')) {
    const existingGithub = actions.querySelector<HTMLAnchorElement>('.github-link');
    const nav = document.createElement('nav');
    nav.className = 'wsb-product-nav';
    nav.setAttribute('aria-label', 'Product navigation');
    nav.innerHTML = `
      <button type="button" data-nav-help>Help</button>
      <a href="./learn.html">Learn</a>
      <a href="./faq.html">FAQ</a>
      <a href="https://github.com/roryvossepoel/build-my-sandbox" target="_blank" rel="noreferrer">GitHub ↗</a>
    `;
    if (existingGithub) existingGithub.hidden = true;
    actions.appendChild(nav);

    nav.querySelector<HTMLButtonElement>('[data-nav-help]')?.addEventListener('click', () => {
      const details = document.querySelector<HTMLDetailsElement>('.wsb-walkthrough');
      if (!details) return;
      details.open = !details.open;
      if (details.open) details.querySelector<HTMLElement>('.wsb-walkthrough-panel')?.focus();
    });
  }

  const details = document.querySelector<HTMLDetailsElement>('.wsb-walkthrough');
  const close = document.querySelector<HTMLButtonElement>('[data-help-close]');
  if (details && close && !close.dataset.bound) {
    close.dataset.bound = 'true';
    close.addEventListener('click', () => { details.open = false; });
  }
}

enhanceProductShell();
ensureImportInput();

const appRoot = document.querySelector('#app');
if (appRoot) {
  new MutationObserver(() => enhanceProductShell()).observe(appRoot, { childList: true });
}
