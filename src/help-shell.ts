function enhanceProductShell() {
  const actions = document.querySelector<HTMLElement>('.topbar-actions');
  if (actions && !actions.querySelector('.wsb-product-nav')) {
    const existingGithub = actions.querySelector<HTMLAnchorElement>('.github-link');
    const nav = document.createElement('nav');
    nav.className = 'wsb-product-nav';
    nav.setAttribute('aria-label', 'Product navigation');
    nav.innerHTML = `
      <button type="button" data-nav-build>Build</button>
      <button type="button" data-nav-help>Help</button>
      <a href="https://github.com/roryvossepoel/windows-sandbox-builder" target="_blank" rel="noreferrer">GitHub ↗</a>
    `;
    if (existingGithub) existingGithub.hidden = true;
    actions.appendChild(nav);

    nav.querySelector<HTMLButtonElement>('[data-nav-build]')?.addEventListener('click', () => {
      document.querySelector('#builder-zone')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

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

const appRoot = document.querySelector('#app');
if (appRoot) {
  new MutationObserver(() => enhanceProductShell()).observe(appRoot, { childList: true, subtree: true });
}
