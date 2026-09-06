export {};

const repositoryUrl = 'https://github.com/roryvossepoel/build-my-sandbox';

function applyBrand() {
  document.title = 'Build My Sandbox — Windows Sandbox Builder';

  const headerMark = document.querySelector<HTMLElement>('.playground-topbar .sand-logo');
  if (headerMark && !headerMark.querySelector('img')) {
    headerMark.innerHTML = '<img src="./favicon.svg" alt="" aria-hidden="true" />';
  }

  const headerTitle = document.querySelector<HTMLElement>('.playground-topbar .brand strong');
  if (headerTitle && headerTitle.textContent !== 'Build My Sandbox') headerTitle.textContent = 'Build My Sandbox';

  const hero = document.querySelector<HTMLElement>('.sandbox-illustration');
  if (hero) {
    if (!hero.querySelector('.bms-hero-image')) {
      hero.innerHTML = '<img class="bms-hero-image" src="./hero-sandbox.webp" alt="Build My Sandbox illustration" />';
    }

    hero.style.setProperty('background', 'none', 'important');
    hero.style.setProperty('min-height', '0');
    hero.style.setProperty('aspect-ratio', '1672 / 941');

    const image = hero.querySelector<HTMLImageElement>('.bms-hero-image');
    if (image) {
      image.style.setProperty('display', 'block', 'important');
      image.style.setProperty('width', '100%');
      image.style.setProperty('height', '100%');
      image.style.setProperty('object-fit', 'cover');
      image.style.setProperty('border-radius', 'inherit');
    }
  }

  document.querySelectorAll<HTMLAnchorElement>('a[href*="windows-sandbox-builder"], a[href*="build-my-sandbox"]').forEach((link) => {
    if (link.href.includes('github.com/roryvossepoel/')) link.href = repositoryUrl;
  });

  const footerTitle = document.querySelector<HTMLElement>('.wsb-footer-brand strong');
  if (footerTitle && footerTitle.textContent !== 'Build My Sandbox') footerTitle.textContent = 'Build My Sandbox';

  const footerCopyright = [...document.querySelectorAll<HTMLElement>('.wsb-footer-bottom span')]
    .find((item) => item.textContent?.includes('© 2026'));
  if (footerCopyright && footerCopyright.textContent !== '© 2026 Build My Sandbox') {
    footerCopyright.textContent = '© 2026 Build My Sandbox';
  }
}

applyBrand();

const brandRoot = document.querySelector('#app');
if (brandRoot) new MutationObserver(() => applyBrand()).observe(brandRoot, { childList: true });
