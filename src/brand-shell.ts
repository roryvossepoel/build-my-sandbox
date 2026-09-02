export {};

function unifyBrandIcon() {
  const headerMark = document.querySelector<HTMLElement>('.playground-topbar .sand-logo');
  if (!headerMark || headerMark.querySelector('img')) return;
  headerMark.innerHTML = '<img src="./favicon.svg" alt="" aria-hidden="true" />';
}

unifyBrandIcon();

const brandRoot = document.querySelector('#app');
if (brandRoot) {
  new MutationObserver(() => unifyBrandIcon()).observe(brandRoot, { childList: true });
}
