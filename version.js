(() => {
  const badge = document.getElementById('versionBadge');
  const panel = document.getElementById('versionPanel');
  const VERSION_URL = 'version.json';

  if (!badge || !panel) return;

  const fallback = {
    version: 'v0.0.0',
    track: 'Pendiente',
    label: 'Revisión',
    updated: '',
    summary: [],
    pending: [],
  };

  function render(data) {
    const version = String(data.version || fallback.version);
    const track = String(data.track || fallback.track);
    const label = String(data.label || fallback.label);
    const updated = String(data.updated || fallback.updated);
    const summary = Array.isArray(data.summary) ? data.summary : [];
    const pending = Array.isArray(data.pending) ? data.pending : [];

    badge.querySelector('.version-badge__version').textContent = version;
    badge.querySelector('.version-badge__label').textContent = label;

    panel.innerHTML = `
      <div class="version-panel__title">
        <h2>${version}</h2>
        <p class="version-panel__meta">${track}</p>
      </div>
      ${updated ? `<p class="version-panel__meta">Actualizado: ${updated}</p>` : ''}
      ${summary.length ? `
        <div class="version-panel__section">
          <h3>Hecho</h3>
          <ul>${summary.map((item) => `<li>${item}</li>`).join('')}</ul>
        </div>
      ` : ''}
      ${pending.length ? `
        <div class="version-panel__section">
          <h3>Pendiente</h3>
          <ul>${pending.map((item) => `<li>${item}</li>`).join('')}</ul>
        </div>
      ` : ''}
      <button class="version-panel__close" type="button" data-close-version-panel>Cerrar</button>
    `;
  }

  function setOpen(isOpen) {
    badge.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    panel.hidden = !isOpen;
  }

  async function loadVersion() {
    try {
      const response = await fetch(VERSION_URL, { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      render(data || fallback);
    } catch {
      render(fallback);
    }
  }

  function closePanel() {
    setOpen(false);
  }

  function togglePanel() {
    setOpen(panel.hidden);
  }

  badge.addEventListener('click', togglePanel);
  document.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (target.closest('[data-close-version-panel]')) {
      closePanel();
      return;
    }
    if (panel.hidden) return;
    if (target === badge || badge.contains(target) || panel.contains(target)) return;
    closePanel();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !panel.hidden) closePanel();
  });

  panel.hidden = true;
  setOpen(false);
  loadVersion();
})();