(() => {
  const ROLES = [
    { key: "top", label: "Top", inputId: "top" },
    { key: "jungle", label: "Jungla", inputId: "jungle" },
    { key: "mid", label: "Mid", inputId: "mid" },
    { key: "botline", label: "Botline", inputId: "adc" },
    { key: "support", label: "Support", inputId: "support" },
  ];

  const DDragonVersionsURL = "https://ddragon.leagueoflegends.com/api/versions.json";
  const DDragonChampionDataURL = (version) =>
    `https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/champion.json`;
  const DDragonIconURL = (version, id) =>
    `https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${id}.png`;

  const championMeta = new Map();
  let refreshQueued = false;

  const normalize = (value) =>
    String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[\"'`´’]/g, "")
      .trim()
      .toLowerCase();

  const escapeHtml = (value) =>
    String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");

  function getInput(role) {
    return document.getElementById(role.inputId);
  }

  function getPreview(role) {
    return document.querySelector(`[data-selected-preview="${role.key}"]`);
  }

  function buildPreview(role) {
    const input = getInput(role);
    const shell = input?.closest(".picker-shell");
    if (!shell) return null;

    const existing = getPreview(role);
    if (existing) return existing;

    const preview = document.createElement("div");
    preview.className = "selected-champion is-empty";
    preview.dataset.selectedPreview = role.key;
    preview.setAttribute("aria-live", "polite");
    preview.innerHTML = `
      <span class="selected-champion__icon placeholder" aria-hidden="true">—</span>
      <span class="selected-champion__text">Sin campeón</span>
    `;

    shell.insertAdjacentElement("afterend", preview);
    return preview;
  }

  function ensurePreviews() {
    for (const role of ROLES) {
      buildPreview(role);
    }
  }

  function renderPreview(role) {
    const input = getInput(role);
    const preview = getPreview(role) || buildPreview(role);
    if (!input || !preview) return;

    const rawValue = input.value.trim();
    const meta = championMeta.get(normalize(rawValue)) || null;
    const displayName = meta?.name || rawValue;

    preview.classList.toggle("is-empty", !rawValue);
    preview.setAttribute(
      "aria-label",
      rawValue ? `${role.label}: ${displayName}` : `${role.label}: Sin campeón`
    );

    if (!rawValue) {
      preview.innerHTML = `
        <span class="selected-champion__icon placeholder" aria-hidden="true">—</span>
        <span class="selected-champion__text">Sin campeón</span>
      `;
      return;
    }

    const iconMarkup = meta
      ? `<img class="selected-champion__icon" src="${escapeHtml(meta.iconUrl)}" alt="" loading="lazy" />`
      : `<span class="selected-champion__icon placeholder" aria-hidden="true">${escapeHtml(
          displayName.slice(0, 2).toUpperCase() || "?"
        )}</span>`;

    preview.innerHTML = `
      ${iconMarkup}
      <span class="selected-champion__text">${escapeHtml(displayName || rawValue)}</span>
    `;
  }

  function renderAllPreviews() {
    ensurePreviews();
    for (const role of ROLES) {
      renderPreview(role);
    }
  }

  function scheduleRender() {
    if (refreshQueued) return;
    refreshQueued = true;
    window.requestAnimationFrame(() => {
      refreshQueued = false;
      renderAllPreviews();
    });
  }

  async function loadMeta() {
    try {
      const versionsResponse = await fetch(DDragonVersionsURL, { cache: "no-store" });
      if (!versionsResponse.ok) throw new Error(`HTTP ${versionsResponse.status}`);
      const versions = await versionsResponse.json();
      const version = Array.isArray(versions) && versions.length ? versions[0] : null;
      if (!version) throw new Error("No se encontró versión de Data Dragon");

      const response = await fetch(DDragonChampionDataURL(version), { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      const data = Object.values(payload?.data || {});

      championMeta.clear();
      for (const champ of data) {
        const name = String(champ?.name || "").trim();
        const id = String(champ?.id || "").trim();
        if (!name || !id) continue;
        championMeta.set(normalize(name), {
          name,
          id,
          iconUrl: DDragonIconURL(version, id),
        });
      }
    } catch {
      championMeta.clear();
    } finally {
      renderAllPreviews();
    }
  }

  function bindInputs() {
    for (const role of ROLES) {
      const input = getInput(role);
      if (!input) continue;
      input.addEventListener("input", scheduleRender);
      input.addEventListener("change", scheduleRender);
      input.addEventListener("blur", scheduleRender);
    }

    document.addEventListener("pointerdown", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (target.closest(".picker-item") || target.closest("#demoBtn")) {
        window.requestAnimationFrame(renderAllPreviews);
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === "Escape") {
        window.requestAnimationFrame(renderAllPreviews);
      }
    });
  }

  function observeDemoButton() {
    const demoBtn = document.getElementById("demoBtn");
    if (!demoBtn) return;
    demoBtn.addEventListener("click", () => {
      window.requestAnimationFrame(renderAllPreviews);
    });
  }

  function init() {
    ensurePreviews();
    bindInputs();
    observeDemoButton();
    renderAllPreviews();
    loadMeta();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();