export {};

type ScrollSnapshot = {
  pageX: number;
  pageY: number;
  toyboxTop: number;
};

let pending: ScrollSnapshot | null = null;

function captureScroll() {
  const toybox = document.querySelector<HTMLElement>('.toybox-categories');
  pending = {
    pageX: window.scrollX,
    pageY: window.scrollY,
    toyboxTop: toybox?.scrollTop ?? 0,
  };
}

function restoreScroll() {
  if (!pending) return;
  const snapshot = pending;
  pending = null;

  const restore = () => {
    window.scrollTo({ left: snapshot.pageX, top: snapshot.pageY, behavior: 'auto' });
    const toybox = document.querySelector<HTMLElement>('.toybox-categories');
    if (toybox) toybox.scrollTop = snapshot.toyboxTop;
  };

  // main.ts rerenders synchronously and then intentionally calls scrollIntoView.
  // Restore after that work, and once more after helper shells have reacted.
  queueMicrotask(restore);
  requestAnimationFrame(() => {
    restore();
    requestAnimationFrame(restore);
  });
}

function isBuilderMutationTarget(target: EventTarget | null) {
  const element = target instanceof Element ? target : null;
  if (!element) return false;
  return Boolean(
    element.closest('[data-app-add]') ||
    element.closest('[data-app-remove]') ||
    element.closest('[data-setting]') ||
    element.closest('#memory') ||
    element.closest('[data-mode]')
  );
}

document.addEventListener('click', (event) => {
  if (!isBuilderMutationTarget(event.target)) return;
  captureScroll();
  setTimeout(restoreScroll, 0);
}, true);

document.addEventListener('change', (event) => {
  if (!isBuilderMutationTarget(event.target)) return;
  captureScroll();
  setTimeout(restoreScroll, 0);
}, true);

document.addEventListener('drop', (event) => {
  const element = event.target instanceof Element ? event.target : null;
  if (!element?.closest('#sandbox-dropzone')) return;
  captureScroll();
  setTimeout(restoreScroll, 0);
}, true);
