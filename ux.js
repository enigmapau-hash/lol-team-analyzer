(() => {
  const body = document.body;
  const result = document.getElementById('result');
  const status = document.getElementById('statusPill');
  const inputIds = ['top', 'jungle', 'mid', 'adc', 'support'];
  const inputs = inputIds
    .map((id) => document.getElementById(id))
    .filter((input) => Boolean(input));

  function detectState() {
    const statusText = String(status?.textContent || '').trim().toLowerCase();
    const resultIsReady = Boolean(result?.classList.contains('result-box'));
    const resultIsEmpty = Boolean(result?.classList.contains('result-empty'));

    if (statusText.includes('cargando')) return 'loading';
    if (statusText.includes('error') || statusText.includes('sin base')) return 'error';
    if (statusText.includes('campeón repetido') || statusText.includes('faltan') || statusText.includes('selecciona') || statusText.includes('no válido')) {
      return 'warning';
    }
    if (resultIsReady) return 'ready';
    if (resultIsEmpty) return 'idle';
    return 'idle';
  }

  function sync() {
    const uiState = detectState();
    const hasSelection = inputs.some((input) => String(input.value || '').trim().length > 0);

    body.dataset.uiState = uiState;
    body.dataset.hasSelection = hasSelection ? 'true' : 'false';

    if (result) {
      result.setAttribute('aria-busy', uiState === 'loading' ? 'true' : 'false');
    }

    if (status) {
      status.dataset.state = uiState;
      status.title = status.textContent || '';
    }
  }

  function observe(node) {
    if (!node) return;
    const observer = new MutationObserver(sync);
    observer.observe(node, {
      attributes: true,
      childList: true,
      subtree: true,
      characterData: true,
    });
  }

  function init() {
    body.classList.add('enhanced-ui');
    window.requestAnimationFrame(() => body.classList.add('enhanced-ui--ready'));

    observe(result);
    observe(status);

    for (const input of inputs) {
      input.addEventListener('input', sync, { passive: true });
      input.addEventListener('change', sync, { passive: true });
      input.addEventListener('blur', sync, { passive: true });
    }

    document.addEventListener('visibilitychange', sync, { passive: true });
    window.addEventListener('focus', sync, { passive: true });
    window.addEventListener('resize', sync, { passive: true });

    sync();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();