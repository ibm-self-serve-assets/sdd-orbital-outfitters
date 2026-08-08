// ==================== CONTACT DRAWER ====================
const drawer = document.getElementById('contactDrawer');
const overlay = document.getElementById('drawerOverlay');

function bindDrawer(options) {
  const trigger = document.getElementById(options.triggerId);
  const panel = document.getElementById(options.drawerId);
  const panelOverlay = document.getElementById(options.overlayId);
  const closeButton = document.getElementById(options.closeId);
  const cancelButton = options.cancelId ? document.getElementById(options.cancelId) : null;

  if (!trigger || !panel || !panelOverlay || !closeButton) return;

  function openDrawer() {
    panel.classList.add('is-open');
    panelOverlay.classList.add('is-open');
    panel.setAttribute('aria-hidden', 'false');
    trigger.setAttribute('aria-expanded', 'true');
    document.body.classList.add('drawer-open');
  }

  function closeDrawer() {
    panel.classList.remove('is-open');
    panelOverlay.classList.remove('is-open');
    panel.setAttribute('aria-hidden', 'true');
    trigger.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('drawer-open');
  }

  trigger.addEventListener('click', openDrawer);
  closeButton.addEventListener('click', closeDrawer);
  panelOverlay.addEventListener('click', closeDrawer);

  if (cancelButton) {
    cancelButton.addEventListener('click', closeDrawer);
  }
}

bindDrawer({
  triggerId: 'contactBtn',
  drawerId: 'contactDrawer',
  overlayId: 'drawerOverlay',
  closeId: 'drawerClose',
  cancelId: 'drawerCancel'
});

bindDrawer({
  triggerId: 'demoExplainerBtn',
  drawerId: 'demoExplainerDrawer',
  overlayId: 'demoExplainerOverlay',
  closeId: 'demoExplainerClose'
});

// ==================== DEMO EXPLAINER COPY BUTTON ====================
const demoExplainerCopyBtn = document.getElementById('demoExplainerCopyBtn');
if (demoExplainerCopyBtn) {
  demoExplainerCopyBtn.addEventListener('click', function () {
    const body = document.getElementById('demoExplainerBody');
    const text = Array.from(body.querySelectorAll('.demo-explainer-paragraph'))
      .map(p => p.textContent.trim())
      .join('\n\n');

    navigator.clipboard.writeText(text).then(function () {
      const copyIcon = demoExplainerCopyBtn.querySelector('.copy-icon');
      const checkIcon = demoExplainerCopyBtn.querySelector('.copy-check-icon');
      const label = demoExplainerCopyBtn.querySelector('.demo-explainer-copy-label');

      copyIcon.style.display = 'none';
      checkIcon.style.display = '';
      label.textContent = 'Copied!';
      demoExplainerCopyBtn.classList.add('is-copied');

      setTimeout(function () {
        copyIcon.style.display = '';
        checkIcon.style.display = 'none';
        label.textContent = 'Copy';
        demoExplainerCopyBtn.classList.remove('is-copied');
      }, 2000);
    });
  });
}
