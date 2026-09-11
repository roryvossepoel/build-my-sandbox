export {};

import './share.css';

const SHARE_TITLE = 'Build My Sandbox';
const SHARE_TEXT = 'Build a disposable Windows Sandbox with the tools you need.';

const strokeIcon = (body: string) =>
  `<span class="wsb-share-icon wsb-share-icon-stroke" aria-hidden="true"><svg viewBox="0 0 24 24">${body}</svg></span>`;

const fillIcon = (path: string) =>
  `<span class="wsb-share-icon wsb-share-icon-fill" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="${path}"/></svg></span>`;

const icons = {
  link: strokeIcon('<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>'),
  share: strokeIcon('<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.59 13.51 6.83 3.98"/><path d="m15.41 6.51-6.82 3.98"/>'),
  x: fillIcon('M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.66-9.896L0 1.154h7.594l5.243 6.932L18.901 1.153Zm-1.292 19.492h2.039L6.486 3.24H4.298l13.311 17.405Z'),
  bluesky: fillIcon('M12 10.8c-1.087-2.114-4.046-6.053-6.798-7.995C2.566.944 1.561 1.266.902 1.565.139 1.908 0 3.08 0 3.768c0 .69.378 5.65.624 6.479.815 2.736 3.713 3.66 6.383 3.364-4.56.672-5.544 2.89-3.115 5.108 4.572 4.16 6.63-.679 7.2-2.264.57 1.585 2.173 6.312 6.818 2.264 2.432-2.118 1.44-4.426-3.03-5.1 2.67.296 5.568-.628 6.383-3.364.246-.829.624-5.79.624-6.478 0-.69-.139-1.861-.902-2.206-.659-.298-1.665-.62-4.3 1.24C16.046 4.747 13.087 8.686 12 10.8Z'),
  linkedin: fillIcon('M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 1 1 0-4.124 2.062 2.062 0 0 1 0 4.124zM6.814 20.452H3.861V9h2.953v11.452z'),
  email: strokeIcon('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>'),
};

function shareUrl() {
  return window.location.href;
}

function openShareUrl(url: string) {
  window.open(url, '_blank', 'noopener,noreferrer,width=760,height=640');
}

async function copyLink(button: HTMLButtonElement) {
  const url = shareUrl();
  try {
    await navigator.clipboard.writeText(url);
  } catch {
    const input = document.createElement('textarea');
    input.value = url;
    input.setAttribute('readonly', '');
    input.style.position = 'fixed';
    input.style.opacity = '0';
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    input.remove();
  }

  const previous = button.innerHTML;
  button.innerHTML = `${strokeIcon('<path d="m5 12 4 4L19 6"/>')}<strong>Copied link</strong>`;
  button.classList.add('copied');
  window.setTimeout(() => {
    button.innerHTML = previous;
    button.classList.remove('copied');
  }, 1600);
}

function closeShareMenus(except?: HTMLElement) {
  document.querySelectorAll<HTMLElement>('.wsb-share.open').forEach((share) => {
    if (share === except) return;
    share.classList.remove('open');
    share.querySelector<HTMLButtonElement>('[data-share-toggle]')?.setAttribute('aria-expanded', 'false');
  });
}

function closeMobileMenus(except?: HTMLElement) {
  document.querySelectorAll<HTMLElement>('.wsb-product-nav.mobile-open').forEach((nav) => {
    if (nav === except) return;
    nav.classList.remove('mobile-open');
    const toggle = nav.querySelector<HTMLButtonElement>('[data-mobile-menu-toggle]');
    toggle?.setAttribute('aria-expanded', 'false');
    toggle?.setAttribute('aria-label', 'Open navigation');
  });
}

function ensureMobileMenu(nav: HTMLElement) {
  if (nav.querySelector(':scope > .bms-mobile-menu-toggle')) return;

  const panel = document.createElement('div');
  panel.className = 'bms-mobile-menu-panel';
  while (nav.firstChild) panel.appendChild(nav.firstChild);

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'bms-mobile-menu-toggle';
  toggle.setAttribute('data-mobile-menu-toggle', '');
  toggle.setAttribute('aria-label', 'Open navigation');
  toggle.setAttribute('aria-expanded', 'false');
  toggle.innerHTML = '<span></span><span></span><span></span>';
  toggle.addEventListener('click', (event) => {
    event.stopPropagation();
    const open = !nav.classList.contains('mobile-open');
    closeMobileMenus(nav);
    closeShareMenus();
    nav.classList.toggle('mobile-open', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    toggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  });

  nav.append(toggle, panel);
}

function bindShareMenu(share: HTMLElement) {
  if (share.dataset.bound === 'true') return;
  share.dataset.bound = 'true';

  const toggle = share.querySelector<HTMLButtonElement>('[data-share-toggle]');
  const copy = share.querySelector<HTMLButtonElement>('[data-share-copy]');
  const native = share.querySelector<HTMLButtonElement>('[data-share-native]');
  const x = share.querySelector<HTMLButtonElement>('[data-share-x]');
  const bluesky = share.querySelector<HTMLButtonElement>('[data-share-bluesky]');
  const linkedin = share.querySelector<HTMLButtonElement>('[data-share-linkedin]');
  const email = share.querySelector<HTMLButtonElement>('[data-share-email]');

  toggle?.addEventListener('click', (event) => {
    event.stopPropagation();
    const open = !share.classList.contains('open');
    closeShareMenus(share);
    share.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  });

  copy?.addEventListener('click', () => void copyLink(copy));

  if (!navigator.share) native?.remove();
  else {
    native?.addEventListener('click', async () => {
      try {
        await navigator.share({ title: SHARE_TITLE, text: SHARE_TEXT, url: shareUrl() });
        closeShareMenus();
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
      }
    });
  }

  x?.addEventListener('click', () => {
    openShareUrl(`https://x.com/intent/post?text=${encodeURIComponent(`${SHARE_TEXT} ${shareUrl()}`)}`);
  });

  bluesky?.addEventListener('click', () => {
    openShareUrl(`https://bsky.app/intent/compose?text=${encodeURIComponent(`${SHARE_TEXT}\n${shareUrl()}`)}`);
  });

  linkedin?.addEventListener('click', () => {
    openShareUrl(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl())}`);
  });

  email?.addEventListener('click', () => {
    window.location.href = `mailto:?subject=${encodeURIComponent(SHARE_TITLE)}&body=${encodeURIComponent(`${SHARE_TEXT}\n\n${shareUrl()}`)}`;
  });
}

function ensureShareMenu() {
  const nav = document.querySelector<HTMLElement>('.wsb-product-nav');
  if (!nav) return;

  ensureMobileMenu(nav);
  const panel = nav.querySelector<HTMLElement>(':scope > .bms-mobile-menu-panel') ?? nav;

  let share = panel.querySelector<HTMLElement>('.wsb-share');
  if (!share) {
    share = document.createElement('div');
    share.className = 'wsb-share';
    share.innerHTML = `
      <button type="button" class="wsb-share-toggle" data-share-toggle aria-haspopup="menu" aria-expanded="false">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.59 13.51 6.83 3.98"/><path d="m15.41 6.51-6.82 3.98"/></svg>
        <span>Share</span>
      </button>
      <div class="wsb-share-menu" role="menu" aria-label="Share Build My Sandbox">
        <div class="wsb-share-menu-heading">
          <strong>Share Build My Sandbox</strong>
          <span>Share this builder with someone else.</span>
        </div>
        <button type="button" role="menuitem" data-share-copy>${icons.link}<strong>Copy link</strong></button>
        <button type="button" role="menuitem" data-share-native>${icons.share}<strong>Share…</strong></button>
        <div class="wsb-share-divider"></div>
        <button type="button" role="menuitem" data-share-x>${icons.x}<strong>X</strong></button>
        <button type="button" role="menuitem" data-share-bluesky>${icons.bluesky}<strong>Bluesky</strong></button>
        <button type="button" role="menuitem" data-share-linkedin>${icons.linkedin}<strong>LinkedIn</strong></button>
        <button type="button" role="menuitem" data-share-email>${icons.email}<strong>Email</strong></button>
      </div>
    `;

    const github = panel.querySelector<HTMLElement>('.wsb-github-icon');
    if (github) panel.insertBefore(share, github);
    else panel.appendChild(share);
  }

  bindShareMenu(share);
}

function ensureChangelogLink() {
  const productColumn = [...document.querySelectorAll<HTMLElement>('.wsb-footer-column')]
    .find((column) => column.querySelector('h3')?.textContent?.trim() === 'Build My Sandbox');
  if (!productColumn || productColumn.querySelector('[data-changelog-link]')) return;

  const link = document.createElement('a');
  link.href = './changelog.html';
  link.dataset.changelogLink = 'true';
  link.textContent = 'Changelog';

  const github = [...productColumn.querySelectorAll<HTMLAnchorElement>('a')]
    .find((anchor) => anchor.href.includes('github.com/roryvossepoel/build-my-sandbox'));
  if (github) productColumn.insertBefore(link, github);
  else productColumn.appendChild(link);
}

function ensureFaqFixAnchor() {
  if (!window.location.pathname.endsWith('/faq.html')) return;
  const headings = [...document.querySelectorAll<HTMLElement>('.faq-section-heading')];
  const heading = headings.find((item) => item.querySelector('span')?.textContent?.trim() === 'TROUBLESHOOTING & FIXES');
  const section = heading?.closest<HTMLElement>('.faq-section');
  if (!section) return;

  section.id = 'fixes';
  if (window.location.hash === '#fixes' && section.dataset.anchorScrolled !== 'true') {
    section.dataset.anchorScrolled = 'true';
    requestAnimationFrame(() => section.scrollIntoView({ block: 'start' }));
  }
}

function enhanceSharedShell() {
  ensureShareMenu();
  ensureChangelogLink();
  ensureFaqFixAnchor();
}

enhanceSharedShell();

const appRoot = document.querySelector('#app');
if (appRoot) new MutationObserver(() => enhanceSharedShell()).observe(appRoot, { childList: true, subtree: true });

document.addEventListener('click', (event) => {
  const target = event.target as HTMLElement | null;
  if (target?.closest('.wsb-share')) return;
  if (target?.closest('.bms-mobile-menu-panel')) {
    if (target.closest('a')) closeMobileMenus();
    return;
  }
  closeShareMenus();
  closeMobileMenus();
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    closeShareMenus();
    closeMobileMenus();
  }
});
