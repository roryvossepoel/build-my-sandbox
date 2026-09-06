export {};

type ScrollSnapshot = {
  pageX: number;
  pageY: number;
  toyboxTop: number;
};

let pending: ScrollSnapshot | null = null;
let restoreQueued = false;

function captureScroll() {
  const toybox = document.querySelector<HTMLElement>('.toybox-categories');
  pending = {
    pageX: window.scrollX,
    pageY: window.scrollY,
    toyboxTop: toybox?.scrollTop ?? 0,
  };
}

function restoreScroll() {
  restoreQueued = false;
  if (!pending) return;

  const snapshot = pending;
  pending = null;

  // main.ts rerenders synchronously in the same event task. A microtask runs
  // after those handlers have finished, but before the browser paints the new
  // frame. Restoring here prevents the Toy Box/page from visibly jumping and
  // then snapping back a frame later.
  window.scrollTo({ left: snapshot.pageX, top: snapshot.pageY, behavior: 'auto' });
  const toybox = document.querySelector<HTMLElement>('.toybox-categories');
  if (toybox) toybox.scrollTop = snapshot.toyboxTop;
}

function queueRestore() {
  if (restoreQueued) return;
  restoreQueued = true;
  queueMicrotask(restoreScroll);
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
  queueRestore();
}, true);

document.addEventListener('change', (event) => {
  if (!isBuilderMutationTarget(event.target)) return;
  captureScroll();
  queueRestore();
}, true);

document.addEventListener('drop', (event) => {
  const element = event.target instanceof Element ? event.target : null;
  if (!element?.closest('#sandbox-dropzone')) return;
  captureScroll();
  queueRestore();
}, true);
