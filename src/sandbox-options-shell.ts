export {};

type OptionDefinition = {
  key: string;
  title: string;
  description: string;
  note: string;
  icon: string;
};

const fixes: OptionDefinition[] = [
  {
    key: 'bms.fix.dnsRecovery',
    title: 'DNS recovery',
    description: 'Repair DNS only when name resolution is broken.',
    note: 'Microsoft probe first · PowerShell first · netsh fallback · 8.8.8.8',
    icon: '🌐',
  },
  {
    key: 'bms.fix.disableSmartAppControl',
    title: 'App Control performance fix',
    description: 'Disable Smart App Control in this disposable Sandbox before installing tools.',
    note: 'Sandbox only · refreshes Code Integrity with CiTool.exe -r',
    icon: '⚡',
  },
];

const advancedSummaryOptions = [
  { key: 'vGpu', icon: '🎮', label: 'vGPU' },
  { key: 'audioInput', icon: '🎙️', label: 'Audio input' },
  { key: 'videoInput', icon: '📷', label: 'Video input' },
  { key: 'printerRedirection', icon: '🖨️', label: 'Printers' },
  { key: 'protectedClient', icon: '🛡️', label: 'Protected client' },
] as const;

function readFlag(key: string): boolean {
  try { return localStorage.getItem(key) === 'true'; } catch { return false; }
}

function writeFlag(key: string, value: boolean) {
  try { localStorage.setItem(key, value ? 'true' : 'false'); } catch { }
}

function makeSwitch(key: string, checked: boolean, disabled = false) {
  return `<input type="checkbox" data-bms-option="${key}" ${checked ? 'checked' : ''} ${disabled ? 'disabled' : ''}><span class="switch"></span>`;
}

function ensureOptionsUi() {
  const drawer = document.querySelector<HTMLElement>('.advanced-drawer');
  if (!drawer || drawer.querySelector('.bms-extra-options')) return;

  const downloadsEnabled = readFlag('bms.map.hostDownloads');
  const downloadsWrite = readFlag('bms.map.hostDownloadsWrite');

  const wrapper = document.createElement('div');
  wrapper.className = 'bms-extra-options';
  wrapper.innerHTML = `
    <section class="bms-option-section">
      <div class="bms-option-heading">
        <div><span>📂 HOST SHARING</span><strong>Bring your Downloads folder into the sandbox.</strong></div>
        <small>Off by default.</small>
      </div>
      <div class="bms-option-grid">
        <label class="bms-option-card ${downloadsEnabled ? 'enabled' : ''}">
          <span class="bms-option-icon">📥</span>
          <span class="bms-option-copy"><strong>Map host Downloads</strong><small>Maps <code>%USERPROFILE%\\Downloads</code> to <code>Downloads\\Host Downloads</code> inside Windows Sandbox.</small><em>Read-only by default</em></span>
          ${makeSwitch('bms.map.hostDownloads', downloadsEnabled)}
        </label>
        <label class="bms-option-card ${downloadsWrite ? 'enabled' : ''} ${downloadsEnabled ? '' : 'disabled'}">
          <span class="bms-option-icon write">✍️</span>
          <span class="bms-option-copy"><strong>Allow writes to Downloads</strong><small>Lets files created in the Sandbox be written back to your host Downloads folder.</small><em>Enable only when you actually need it</em></span>
          ${makeSwitch('bms.map.hostDownloadsWrite', downloadsWrite, !downloadsEnabled)}
        </label>
      </div>
    </section>

    <section class="bms-option-section bms-fixes" id="optional-fixes">
      <div class="bms-option-heading">
        <div><span>🩹 OPTIONAL FIXES</span><strong>Only use these when your Sandbox needs a little help.</strong></div>
        <a href="./faq.html#fixes">What do these do? ↗</a>
      </div>
      <div class="bms-option-grid">
        ${fixes.map((fix) => `
          <label class="bms-option-card ${readFlag(fix.key) ? 'enabled' : ''}">
            <span class="bms-option-icon">${fix.icon}</span>
            <span class="bms-option-copy"><strong>${fix.title}</strong><small>${fix.description}</small><em>${fix.note}</em></span>
            ${makeSwitch(fix.key, readFlag(fix.key))}
          </label>`).join('')}
      </div>
    </section>
  `;

  drawer.appendChild(wrapper);
  bindOptions(wrapper);
}

function bindOptions(root: HTMLElement) {
  root.querySelectorAll<HTMLInputElement>('[data-bms-option]').forEach((input) => {
    input.addEventListener('change', () => {
      const key = input.dataset.bmsOption;
      if (!key) return;
      writeFlag(key, input.checked);
      input.closest('.bms-option-card')?.classList.toggle('enabled', input.checked);

      if (key === 'bms.map.hostDownloads') {
        const writeInput = root.querySelector<HTMLInputElement>('[data-bms-option="bms.map.hostDownloadsWrite"]');
        const writeCard = writeInput?.closest('.bms-option-card');
        if (writeInput) {
          writeInput.disabled = !input.checked;
          if (!input.checked) {
            writeInput.checked = false;
            writeFlag('bms.map.hostDownloadsWrite', false);
            writeCard?.classList.remove('enabled');
          }
        }
        writeCard?.classList.toggle('disabled', !input.checked);
      }

      updateBuildSummary();
    });
  });
}

function updateAdvancedBuildStats() {
  const stats = document.querySelector<HTMLElement>('.build-card .build-stats');
  if (!stats) return;

  stats.querySelectorAll('.bms-advanced-stat, .bms-host-sharing-stat').forEach((row) => row.remove());

  for (const option of advancedSummaryOptions) {
    const input = document.querySelector<HTMLInputElement>(`[data-setting="${option.key}"]`);
    if (!input?.checked) continue;

    const row = document.createElement('div');
    row.className = 'bms-advanced-stat';
    row.innerHTML = `<span>${option.icon} ${option.label}</span><strong>On</strong>`;
    stats.appendChild(row);
  }

  if (readFlag('bms.map.hostDownloads')) {
    const hostRow = document.createElement('div');
    hostRow.className = 'bms-host-sharing-stat';
    const access = readFlag('bms.map.hostDownloadsWrite') ? 'Read / write' : 'Read-only';
    hostRow.innerHTML = `<span>📂 Host Downloads</span><strong>${access}</strong>`;
    stats.appendChild(hostRow);
  }
}

function updateBuildSummary() {
  const buildCard = document.querySelector<HTMLElement>('.build-card');
  if (!buildCard) return;

  updateAdvancedBuildStats();

  const enabledFixes = fixes.filter((fix) => readFlag(fix.key));
  let summary = buildCard.querySelector<HTMLElement>('.bms-options-summary');

  if (!enabledFixes.length) {
    summary?.remove();
    return;
  }

  if (!summary) {
    summary = document.createElement('div');
    summary.className = 'bms-options-summary';
    buildCard.querySelector('.build-stats')?.insertAdjacentElement('afterend', summary);
  }

  summary.innerHTML = enabledFixes
    .map((fix) => `<span>${fix.icon} <strong>${fix.title}</strong></span>`)
    .join('');
}

function ensureFaqLinks() {
  const nav = document.querySelector<HTMLElement>('.wsb-product-nav');
  if (nav && ![...nav.querySelectorAll('a')].some((link) => link.getAttribute('href') === './faq.html')) {
    const faq = document.createElement('a');
    faq.href = './faq.html';
    faq.textContent = 'FAQ';
    const github = [...nav.querySelectorAll('a')].find((link) => link.textContent?.includes('GitHub'));
    if (github) nav.insertBefore(faq, github); else nav.appendChild(faq);
  }

  const footerColumn = [...document.querySelectorAll<HTMLElement>('.wsb-footer-column')]
    .find((column) => column.querySelector('h3')?.textContent === 'Builder');
  if (footerColumn && ![...footerColumn.querySelectorAll('a')].some((link) => link.getAttribute('href') === './faq.html')) {
    const faq = document.createElement('a');
    faq.href = './faq.html';
    faq.textContent = 'FAQ & fixes';
    const github = [...footerColumn.querySelectorAll('a')].find((link) => link.textContent?.includes('GitHub'));
    if (github) footerColumn.insertBefore(faq, github); else footerColumn.appendChild(faq);
  }
}

function enhanceOptions() {
  ensureOptionsUi();
  ensureFaqLinks();
  updateBuildSummary();
}

enhanceOptions();

const appRoot = document.querySelector('#app');
if (appRoot) new MutationObserver(() => enhanceOptions()).observe(appRoot, { childList: true });
