export {};

function enforceRequiredNetworking() {
  const networking = document.querySelector<HTMLInputElement>('[data-setting="networking"]');
  if (networking) {
    networking.checked = true;
    networking.disabled = true;
    networking.setAttribute('aria-readonly', 'true');
    networking.setAttribute('aria-disabled', 'true');

    const card = networking.closest<HTMLElement>('.quick-card');
    if (card) {
      card.classList.add('bms-required-setting');
      card.style.cursor = 'not-allowed';
      card.style.opacity = '.55';
      card.setAttribute('title', 'Networking is required to download the selected tools.');
    }

    const description = card?.querySelector<HTMLElement>('small');
    if (description) description.textContent = 'Required to download selected tools';

    const switchElement = networking.nextElementSibling as HTMLElement | null;
    if (switchElement?.classList.contains('switch')) {
      switchElement.style.cursor = 'not-allowed';
    }
  }

  const networkStat = [...document.querySelectorAll<HTMLElement>('.build-card .build-stats > div')]
    .find((row) => row.textContent?.includes('Network'));
  const value = networkStat?.querySelector<HTMLElement>('strong');
  if (value) value.textContent = 'On';
}

enforceRequiredNetworking();

const appRoot = document.querySelector('#app');
if (appRoot) {
  new MutationObserver(() => enforceRequiredNetworking()).observe(appRoot, { childList: true });
}
