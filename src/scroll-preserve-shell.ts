export {};

type ScrollSnapshot = {
  pageX: number;
  pageY: number;
  toyboxTop: number;
};

let pending: ScrollSnapshot | null = null;
let suppressBuilderScroll = false;

const nativeScrollIntoView = Element.prototype.scrollIntoView;

Element.prototype.scrollIntoView = function scrollIntoView(options?: boolean | ScrollIntoViewOptions) {
  if (suppressBuilderScroll && this instanceof HTMLElement && this.id === 'builder-zone') return;
  nativeScrollIntoView.call(this, options as ScrollIntoViewOptions);
};

function captureScroll() {
  const toybox = document.querySelector<HTMLElement>('.toybox-categories');
  pending = {
    pageX: window.scrollX,
    pageY: window.scrollY,
    toyboxTop: toybox?.scrollTop ?? 0,
  };
  suppressBuilderScroll = true;
}

function restoreScroll() {
  if (!pending) {
    suppressBuilderScroll = false;
    return;
  }

  const snapshot = pending;
  pending = null;

  window.scrollTo({ left: snapshot.pageX, top: snapshot.pageY, behavior: 'auto' });
  const toybox = document.querySelector<HTMLElement>('.toybox-categories');
  if (toybox) toybox.scrollTop = snapshot.toyboxTop;

  suppressBuilderScroll = false;
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

function preserveForMutation() {
  captureScroll();
  // main.ts handles these interactions synchronously. Restore immediately after
  // that handler finishes, before the browser gets a chance to paint.
  queueMicrotask(restoreScroll);
}

document.addEventListener('click', (event) => {
  if (!isBuilderMutationTarget(event.target)) return;
  preserveForMutation();
}, true);

document.addEventListener('change', (event) => {
  if (!isBuilderMutationTarget(event.target)) return;
  preserveForMutation();
}, true);

document.addEventListener('drop', (event) => {
  const element = event.target instanceof Element ? event.target : null;
  if (!element?.closest('#sandbox-dropzone')) return;
  preserveForMutation();
}, true);
