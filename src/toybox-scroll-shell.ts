export {};

let restorePending = false;
let restoreFrame = 0;
let savedTop = 0;
let savedLeft = 0;
let savedPageX = 0;
let savedPageY = 0;

function restoreToyboxScroll() {
  if (!restorePending) return;

  const scroller = document.querySelector<HTMLElement>('.toybox-categories');
  if (scroller) {
    scroller.scrollTop = savedTop;
    scroller.scrollLeft = savedLeft;
  }

  window.scrollTo({ left: savedPageX, top: savedPageY, behavior: 'auto' });
  restorePending = false;

  if (restoreFrame) {
    cancelAnimationFrame(restoreFrame);
    restoreFrame = 0;
  }
}

function captureToyboxScroll() {
  const scroller = document.querySelector<HTMLElement>('.toybox-categories');
  if (!scroller) return;

  savedTop = scroller.scrollTop;
  savedLeft = scroller.scrollLeft;
  savedPageX = window.scrollX;
  savedPageY = window.scrollY;
  restorePending = true;

  // Fallback for interactions that do not cause main.ts to render.
  if (restoreFrame) cancelAnimationFrame(restoreFrame);
  restoreFrame = requestAnimationFrame(() => restoreToyboxScroll());
}

document.addEventListener('click', (event) => {
  const target = event.target as HTMLElement | null;
  if (!target?.closest('[data-app-add], [data-app-remove]')) return;
  captureToyboxScroll();
}, true);

document.addEventListener('drop', (event) => {
  const target = event.target as HTMLElement | null;
  if (!target?.closest('#sandbox-dropzone')) return;
  captureToyboxScroll();
}, true);

const appRoot = document.querySelector('#app');
if (appRoot) {
  // main.ts replaces the direct children of #app synchronously on selection.
  // Restore the Toy Box position in the mutation microtask, before the browser
  // gets a chance to paint the freshly rendered list at scrollTop 0.
  new MutationObserver(() => restoreToyboxScroll()).observe(appRoot, { childList: true });
}
