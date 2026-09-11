export {};

import Prism from 'prismjs';
import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-powershell';

type ReviewTab = 'wsb' | 'powershell';
type Language = 'markup' | 'powershell';

let previewOpen = false;
let requestedOpen: ReviewTab | null = null;
let restoringScroll = false;

function activeTab(): ReviewTab | null {
  const active = document.querySelector<HTMLButtonElement>('.playful-tabs [data-tab].active');
  const tab = active?.dataset.tab;
  return tab === 'wsb' || tab === 'powershell' ? tab : null;
}

function languageFor(tab: ReviewTab): Language {
  return tab === 'wsb' ? 'markup' : 'powershell';
}

function tabLabel(tab: ReviewTab) {
  return tab === 'wsb' ? 'WSB' : 'PowerShell';
}

function tabDescription(tab: ReviewTab) {
  return tab === 'wsb' ? 'Windows Sandbox configuration' : 'Generated bootstrap script';
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
  scroller.scrollTop = 0;
  requestAnimationFrame(() => {
    scroller.scrollLeft = 0;
    scroller.scrollTop = 0;
  });
}

function restoreScrollAfterRender(x: number, y: number) {
  if (restoringScroll) return;
  restoringScroll = true;
  requestAnimationFrame(() => {
    window.scrollTo({ left: x, top: y, behavior: 'auto' });
    requestAnimationFrame(() => {
      window.scrollTo({ left: x, top: y, behavior: 'auto' });
      restoringScroll = false;
    });
  });
}

function updatePickerState() {
  const current = activeTab();
  document.querySelectorAll<HTMLButtonElement>('[data-review-preview]').forEach((button) => {
    const tab = button.dataset.reviewPreview as ReviewTab;
    const selected = tab === current;
    const expanded = selected && previewOpen;
    button.classList.toggle('selected', selected);
    button.classList.toggle('expanded', expanded);
    button.setAttribute('aria-expanded', expanded ? 'true' : 'false');
  });

  const preview = document.querySelector<HTMLElement>('.playful-preview');
  if (preview) preview.classList.toggle('bms-preview-collapsed', !previewOpen);
}

function ensurePreviewPicker() {
  const review = document.querySelector<HTMLElement>('.review-playground');
  const tabs = review?.querySelector<HTMLElement>('.playful-tabs');
  const preview = review?.querySelector<HTMLElement>('.playful-preview');
  if (!review || !tabs || !preview) return;

  tabs.classList.add('bms-original-tabs-hidden');

  let picker = review.querySelector<HTMLElement>('.bms-review-picker');
  if (!picker) {
    picker = document.createElement('div');
    picker.className = 'bms-review-picker';
    picker.innerHTML = (['wsb', 'powershell'] as ReviewTab[]).map((tab) => `
      <button type="button" class="bms-review-choice" data-review-preview="${tab}" aria-expanded="false">
        <span class="bms-review-choice-copy">
          <strong>${tabLabel(tab)}</strong>
          <small>${tabDescription(tab)}</small>
        </span>
        <span class="bms-review-choice-chevron" aria-hidden="true"></span>
      </button>
    `).join('');
    tabs.insertAdjacentElement('afterend', picker);

    picker.querySelectorAll<HTMLButtonElement>('[data-review-preview]').forEach((button) => {
      button.addEventListener('click', () => {
        const target = button.dataset.reviewPreview as ReviewTab;
        const current = activeTab();

        if (target === current) {
          previewOpen = !previewOpen;
          updatePickerState();
          if (previewOpen) {
            requestAnimationFrame(() => {
              const body = document.querySelector<HTMLElement>('.bms-code-body');
              if (body) resetCodeScroll(body);
            });
          }
          return;
        }

        const targetTab = tabs.querySelector<HTMLButtonElement>(`[data-tab="${target}"]`);
        if (!targetTab) return;

        requestedOpen = target;
        previewOpen = true;
        const x = window.scrollX;
        const y = window.scrollY;
        targetTab.click();
        restoreScrollAfterRender(x, y);
      });
    });
  }

  updatePickerState();
}

function enhanceCodeViewer() {
  const tab = activeTab();
  if (!tab) return;

  const preview = document.querySelector<HTMLElement>('.playful-preview');
  const pre = preview?.querySelector<HTMLPreElement>('pre');
  const code = pre?.querySelector<HTMLElement>('code');
  if (!preview || !pre || !code || pre.closest('.bms-code-viewer')) return;

  const language = languageFor(tab);
  const source = code.textContent ?? '';
  const lines = source.split(/\r?\n/);
  const grammar = Prism.languages[language];

  const viewer = document.createElement('div');
  viewer.className = 'bms-code-viewer';

  const toolbar = document.createElement('div');
  toolbar.className = 'bms-code-toolbar';
  toolbar.innerHTML = `
    <div class="bms-code-language">
      <span>${tab === 'wsb' ? 'WSB · XML' : 'PowerShell'}</span>
      <small>${lines.length} lines</small>
    </div>
    <div class="bms-code-actions">
      <button type="button" class="bms-wrap-code" aria-pressed="false" title="Wrap long lines">Wrap</button>
      <button type="button" class="bms-copy-code">Copy</button>
    </div>
  `;

  const body = document.createElement('div');
  body.className = 'bms-code-body';
  body.setAttribute('tabindex', '0');
  body.setAttribute('aria-label', `${tabLabel(tab)} source code, ${lines.length} lines`);

  const rows = document.createElement('div');
  rows.className = 'bms-code-lines';
  rows.innerHTML = lines.map((line, index) => {
    const highlighted = line.length ? Prism.highlight(line, grammar, language) : '&nbsp;';
    return `
      <div class="bms-code-row">
        <span class="bms-code-line-number" aria-hidden="true">${index + 1}</span>
        <code class="bms-code-line language-${language}">${highlighted}</code>
      </div>
    `;
  }).join('');

  pre.replaceWith(viewer);
  viewer.appendChild(toolbar);
  viewer.appendChild(body);
  body.appendChild(rows);

  const wrapButton = toolbar.querySelector<HTMLButtonElement>('.bms-wrap-code');
  const copyButton = toolbar.querySelector<HTMLButtonElement>('.bms-copy-code');

  copyButton?.addEventListener('click', () => copyText(source, copyButton));
  wrapButton?.addEventListener('click', () => {
    const wrap = !viewer.classList.contains('wrap-code');
    viewer.classList.toggle('wrap-code', wrap);
    wrapButton.classList.toggle('active', wrap);
    wrapButton.setAttribute('aria-pressed', wrap ? 'true' : 'false');
    wrapButton.title = wrap ? 'Show exact source lines' : 'Wrap long lines';
    resetCodeScroll(body);
  });

  if (requestedOpen === tab) {
    previewOpen = true;
    requestedOpen = null;
  }

  updatePickerState();
  if (previewOpen) requestAnimationFrame(() => resetCodeScroll(body));
}

function enhanceReview() {
  ensurePreviewPicker();
  enhanceCodeViewer();
  updatePickerState();
}

enhanceReview();

const appRoot = document.querySelector('#app');
if (appRoot) {
  new MutationObserver(() => enhanceReview()).observe(appRoot, { childList: true });
}
