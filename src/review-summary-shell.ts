export {};

let switchingToWsb = false;

function simplifyReviewSection() {
  const review = document.querySelector<HTMLElement>('.review-playground');
  if (!review) return;

  const description = review.querySelector<HTMLElement>('.play-section-title p');
  if (description && description.textContent !== 'Inspect the generated WSB and PowerShell before download.') {
    description.textContent = 'Inspect the generated WSB and PowerShell before download.';
  }

  const tabs = review.querySelector<HTMLElement>('.playful-tabs');
  const summaryButton = tabs?.querySelector<HTMLButtonElement>('[data-tab="summary"]');
  const summaryWasActive = summaryButton?.classList.contains('active') === true;
  summaryButton?.remove();

  if (summaryWasActive && !switchingToWsb) {
    const wsbButton = tabs?.querySelector<HTMLButtonElement>('[data-tab="wsb"]');
    if (!wsbButton) return;

    switchingToWsb = true;
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    wsbButton.click();
    requestAnimationFrame(() => {
      window.scrollTo({ left: scrollX, top: scrollY, behavior: 'auto' });
      switchingToWsb = false;
    });
  }
}

simplifyReviewSection();

const appRoot = document.querySelector('#app');
if (appRoot) {
  new MutationObserver(() => simplifyReviewSection()).observe(appRoot, { childList: true, subtree: true });
}
