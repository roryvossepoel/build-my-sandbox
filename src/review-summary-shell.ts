export {};

const advancedKeys = ['vGpu', 'audioInput', 'videoInput', 'printerRedirection', 'protectedClient'] as const;

function updateQuickLookAdvancedSummary() {
  const summaryCards = document.querySelectorAll<HTMLElement>('.playful-summary .summary-card');
  if (summaryCards.length < 4) return;

  const enabled = advancedKeys.filter((key) => {
    const input = document.querySelector<HTMLInputElement>(`[data-setting="${key}"]`);
    return input?.checked === true;
  }).length;

  const card = summaryCards[3];
  const label = card.querySelector<HTMLElement>('span');
  const value = card.querySelector<HTMLElement>('strong');
  const nextLabel = 'Advanced options';
  const nextValue = `${enabled} enabled`;

  // Do not rewrite identical text. This observer watches #app, so unnecessary
  // textContent writes would trigger the observer again and create a render loop.
  if (label && label.textContent !== nextLabel) label.textContent = nextLabel;
  if (value && value.textContent !== nextValue) value.textContent = nextValue;
}

updateQuickLookAdvancedSummary();

const appRoot = document.querySelector('#app');
if (appRoot) {
  new MutationObserver(() => updateQuickLookAdvancedSummary()).observe(appRoot, { childList: true, subtree: true });
}
