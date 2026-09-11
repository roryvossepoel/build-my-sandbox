export {};

let forcingAdvanced = false;

function unifySandboxSettings() {
  const advancedButton = document.querySelector<HTMLButtonElement>('[data-mode="advanced"]');
  const drawer = document.querySelector<HTMLElement>('.advanced-drawer');

  // The advanced options are now part of the normal settings surface. Force the
  // existing renderer into advanced mode once so those controls are available.
  if (!drawer) {
    if (!forcingAdvanced && advancedButton) {
      forcingAdvanced = true;
      advancedButton.click();
      queueMicrotask(() => { forcingAdvanced = false; });
    }
    return;
  }

  document.querySelector<HTMLElement>('.mode-switch')?.classList.add('bms-mode-hidden');

  const quickSettings = document.querySelector<HTMLElement>('.quick-settings');
  const advancedGrid = drawer.querySelector<HTMLElement>('.advanced-grid');
  if (!quickSettings || !advancedGrid) return;

  if (!document.querySelector('.bms-settings-heading')) {
    const heading = document.createElement('div');
    heading.className = 'bms-settings-heading';
    heading.innerHTML = `
      <span>🧪 SANDBOX SETTINGS</span>
      <div>
        <strong>Tune your sandbox.</strong>
        <small>Networking is required. Everything else is optional.</small>
      </div>
    `;
    quickSettings.insertAdjacentElement('beforebegin', heading);
  }

  [...advancedGrid.children].forEach((option) => {
    if (!(option instanceof HTMLElement)) return;
    option.classList.add('bms-unified-option');
    quickSettings.appendChild(option);
  });

  // Networking is the one required setting, so keep it first. Memory then sits
  // beside it in the two-column layout, followed by the optional toggles.
  const networking = quickSettings.querySelector<HTMLElement>('[data-setting="networking"]')?.closest<HTMLElement>('.quick-card');
  if (networking && quickSettings.firstElementChild !== networking) {
    quickSettings.prepend(networking);
  }

  drawer.classList.add('bms-host-only-drawer');
  drawer.querySelector<HTMLElement>('.advanced-heading')?.classList.add('bms-hide-advanced-heading');
  advancedGrid.classList.add('bms-advanced-grid-merged');
}

unifySandboxSettings();

const appRoot = document.querySelector('#app');
if (appRoot) {
  new MutationObserver(() => unifySandboxSettings()).observe(appRoot, { childList: true, subtree: true });
}
