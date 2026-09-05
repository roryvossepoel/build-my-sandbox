export {};

import Prism from 'prismjs';
import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-powershell';
import 'prismjs/plugins/line-numbers/prism-line-numbers';
import 'prismjs/plugins/line-numbers/prism-line-numbers.css';

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

function enhanceCodeViewer() {
  const language = activeLanguage();
  if (!language) return;

  const preview = document.querySelector<HTMLElement>('.playful-preview');
  const pre = preview?.querySelector<HTMLPreElement>('pre');
  const code = pre?.querySelector<HTMLElement>('code');
  if (!preview || !pre || !code || pre.closest('.bms-code-viewer')) return;

  const source = code.textContent ?? '';
  pre.classList.add('line-numbers', `language-${language}`);
  code.className = `language-${language}`;
  Prism.highlightElement(code);

  const viewer = document.createElement('div');
  viewer.className = 'bms-code-viewer';

  const toolbar = document.createElement('div');
  toolbar.className = 'bms-code-toolbar';
  toolbar.innerHTML = `
    <div class="bms-code-language">
      <span>${language === 'markup' ? 'WSB · XML' : 'PowerShell'}</span>
      <small>${source.split(/\r?\n/).length} lines</small>
    </div>
    <button type="button" class="bms-copy-code">Copy</button>
  `;

  toolbar.querySelector<HTMLButtonElement>('.bms-copy-code')?.addEventListener('click', (event) => {
    copyText(source, event.currentTarget as HTMLButtonElement);
  });

  pre.replaceWith(viewer);
  viewer.appendChild(toolbar);
  viewer.appendChild(pre);
}

enhanceCodeViewer();

const appRoot = document.querySelector('#app');
if (appRoot) {
  new MutationObserver(() => enhanceCodeViewer()).observe(appRoot, { childList: true });
}
