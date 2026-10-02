(() => {
  const result = document.getElementById("result");
  if (!result) return;

  let refreshQueued = false;

  const text = (node) => node?.textContent?.trim() || "";

  function clearSummary() {
    delete result.dataset.summarySignature;
    const existing = result.querySelector(".result-summary");
    if (existing) existing.remove();
  }

  function buildSummary() {
    const table = result.querySelector(".composition-table");
    if (!table) {
      clearSummary();
      return;
    }

    const rows = Array.from(table.querySelectorAll("tbody tr"));
    if (!rows.length) {
      clearSummary();
      return;
    }

    const items = rows.map((row) => {
      const role = text(row.querySelector('[data-label="Rol"]'));
      const champion = text(row.querySelector('[data-label="Campeón"] .champion-name'));
      const identity = text(row.querySelector('[data-label="Identidad"]'));
      const functionLabel = text(row.querySelector('[data-label="Función"]'));
      const tempo = text(row.querySelector('[data-label="Ritmo"]'));
      const missing = row.classList.contains("is-missing");
      const unknown = row.classList.contains("is-unknown");
      const icon = row.querySelector(".champion-icon")?.outerHTML || "";

      return { role, champion, identity, functionLabel, tempo, missing, unknown, icon };
    });

    const signature = items
      .map((item) => [item.role, item.champion, item.identity, item.functionLabel, item.tempo, item.missing, item.unknown].join("|"))
      .join(";");

    if (result.dataset.summarySignature === signature) return;
    result.dataset.summarySignature = signature;

    const previous = result.querySelector(".result-summary");
    if (previous) previous.remove();

    const completed = items.filter((item) => item.champion && item.champion !== "—" && !item.missing).length;
    const problems = items.filter((item) => item.missing || item.unknown || !item.champion || item.champion === "—").length;
    const ready = problems === 0;

    const summary = document.createElement("section");
    summary.className = `result-summary${ready ? " is-ready" : " is-pending"}`;
    summary.innerHTML = `
      <div class="result-summary__header">
        <div>
          <p class="result-summary__eyebrow">Vista rápida</p>
          <h3>${ready ? "Composición lista" : "Composición en revisión"}</h3>
          <p class="result-summary__subhead">${completed}/5 campeones detectados · ${problems} incidencias</p>
        </div>
        <div class="result-summary__stats">
          <span class="result-summary__stat">
            <strong>${completed}/5</strong>
            <small>Campeones</small>
          </span>
          <span class="result-summary__stat${ready ? " is-good" : " is-warning"}">
            <strong>${ready ? "OK" : problems}</strong>
            <small>${ready ? "Sin errores" : "Revisar"}</small>
          </span>
        </div>
      </div>
      <div class="result-summary__roles">
        ${items
          .map((item) => {
            const status = item.missing || item.unknown || !item.champion || item.champion === "—" ? "is-issue" : "is-ok";
            const champion = item.champion || "—";
            const identity = item.identity || (ready ? "Listo" : "Pendiente");
            const functionLabel = item.functionLabel || (ready ? "Listo" : "Pendiente");
            const icon = item.icon || `<span class="result-summary__icon placeholder" aria-hidden="true">${champion.slice(0, 2).toUpperCase()}</span>`;

            return `
              <article class="result-summary__role ${status}">
                <div class="result-summary__role-icon">${icon}</div>
                <div class="result-summary__role-copy">
                  <span class="result-summary__role-label">${item.role || "Rol"}</span>
                  <strong>${champion}</strong>
                  <div class="result-summary__role-meta">
                    <small><span class="result-summary__role-k">Identidad</span>${identity}</small>
                    <small><span class="result-summary__role-k">Función</span>${functionLabel}</small>
                  </div>
                </div>
              </article>
            `;
          })
          .join("")}
      </div>
    `;

    table.parentElement?.insertBefore(summary, table);
  }

  function scheduleBuild() {
    if (refreshQueued) return;
    refreshQueued = true;
    window.requestAnimationFrame(() => {
      refreshQueued = false;
      buildSummary();
    });
  }

  const observer = new MutationObserver(scheduleBuild);
  observer.observe(result, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class"],
  });

  scheduleBuild();
})();