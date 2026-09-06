export {};

import Prism from 'prismjs';
import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-powershell';

function activeLanguage(): 'markup' | 'powershell' | null {
  const active = document.querySelector<HTMLButtonElement>('.playful-tabs [data-tab].active');
  const tab = active?.dataset.tab;
  if (tab === 'wsb') return 'markup';
  if (tab === 'powershell') return 'powershell';
  return null;
}

function copyText(text: string, button: HTMLButtonElement) {
  void navigator.clipboard.writeText(text).then(() => {
    const previous = button.textContent;
    button.textContent = 'Copied ✓';
    button.classList.add('copied');
    window.setTimeout(() => {
      button.textContent = previous;
      button.classList.remove('copied');
    }, 1600);
  });
}

function resetCodeScroll(scroller: HTMLElement) {
  scroller.scrollLeft = 0;
  requestAnimationFrame(() => {
    scroller.scrollLeft = 0;
  });
}

function enhanceCodeViewer() {
  const language = activeLanguage();
  if (!language) return;

  const preview = document.querySelector<HTMLElement>('.playful-preview');
  const pre = preview?.querySelector<HTMLPreElement>('pre');
  const code = pre?.querySelector<HTMLElement>('code');
  if (!preview || !pre || !code || pre.closest('.bms-code-viewer')) return;

  const source = code.textContent ?? '';
  const lines = source.split(/\r?\n/);
  const grammar = Prism.languages[language];
  code.className = `language-${language}`;
  code.innerHTML = Prism.highlight(source, grammar, language);
  pre.className = `language-${language}`;

  const viewer = document.createElement('div');
  viewer.className = 'bms-code-viewer';

  const toolbar = document.createElement('div');
  toolbar.className = 'bms-code-toolbar';
  toolbar.innerHTML = `
    <div class="bms-code-language">
      <span>${language === 'markup' ? 'WSB · XML' : 'PowerShell'}</span>
      <small>${lines.length} lines</small>
    </div>
    <button type="button" class="bms-copy-code">Copy</button>
  `;

  toolbar.querySelector<HTMLButtonElement>('.bms-copy-code')?.addEventListener('click', (event) => {
    copyText(source, event.currentTarget as HTMLButtonElement);
  });

  const body = document.createElement('div');
  body.className = 'bms-code-body';

  const gutter = document.createElement('div');
  gutter.className = 'bms-code-gutter';
  gutter.setAttribute('aria-hidden', 'true');
  gutter.innerHTML = lines.map((_, index) => `<span>${index + 1}</span>`).join('');

  pre.replaceWith(viewer);
  viewer.appendChild(toolbar);
  viewer.appendChild(body);
  body.appendChild(gutter);
  body.appendChild(pre);
  resetCodeScroll(body);
}

enhanceCodeViewer();

const appRoot = document.querySelector('#app');
if (appRoot) {
  new MutationObserver(() => enhanceCodeViewer()).observe(appRoot, { childList: true });
}

document.addEventListener('click', (event) => {
  const target = event.target as HTMLElement | null;
  if (!target?.closest('.playful-tabs [data-tab]')) return;
  requestAnimationFrame(() => {
    const body = document.querySelector<HTMLElement>('.bms-code-body');
    if (body) resetCodeScroll(body);
  });
});
