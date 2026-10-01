const WORKBOOK_URL = encodeURI("Draft Pool.xlsx");
const DDragonVersionsURL = "https://ddragon.leagueoflegends.com/api/versions.json";
const DDragonChampionDataURL = (version) =>
  `https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/champion.json`;
const DDragonIconURL = (version, id) =>
  `https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${id}.png`;

const ROLE_FIELDS = [
  { key: "top", label: "TOP", inputId: "top", menuId: "topMenu" },
  { key: "jungle", label: "JUNGLA", inputId: "jungle", menuId: "jungleMenu" },
  { key: "mid", label: "MID", inputId: "mid", menuId: "midMenu" },
  { key: "botline", label: "BOTLINE", inputId: "adc", menuId: "botlineMenu" },
  { key: "support", label: "SUPPORT", inputId: "support", menuId: "supportMenu" },
];

const SHEET_MAP = {
  top: "Tabla Top",
  jungle: "Tabla Jungla",
  mid: "Tabla Mid",
  botline: "Tabla Botline",
  support: "Tabla Support",
};

const DEMO = {
  top: "Aatrox",
  jungle: "Briar",
  mid: "Anivia",
  adc: "Draven",
  support: "Janna",
};

const els = {
  top: document.getElementById("top"),
  jungle: document.getElementById("jungle"),
  mid: document.getElementById("mid"),
  adc: document.getElementById("adc"),
  support: document.getElementById("support"),
  topMenu: document.getElementById("topMenu"),
  jungleMenu: document.getElementById("jungleMenu"),
  midMenu: document.getElementById("midMenu"),
  botlineMenu: document.getElementById("botlineMenu"),
  supportMenu: document.getElementById("supportMenu"),
  analyzeBtn: document.getElementById("analyzeBtn"),
  demoBtn: document.getElementById("demoBtn"),
  result: document.getElementById("result"),
  statusPill: document.getElementById("statusPill"),
};

let draftData = null;
let championMeta = new Map();
let workbookReady = false;
let analyzeQueued = false;
let activeRoleKey = null;

function roleInput(roleKey) {
  return els[roleKey === "botline" ? "adc" : roleKey] || null;
}

function roleMenu(roleKey) {
  return els[`${roleKey === "botline" ? "botline" : roleKey}Menu`] || null;
}

function setStatus(text) {
  els.statusPill.textContent = text;
}

function setBusy(isBusy) {
  els.analyzeBtn.disabled = isBusy;
  els.demoBtn.disabled = isBusy;
}

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/["'`´’]/g, "")
    .trim()
    .toLowerCase();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function readComposition() {
  return {
    top: els.top.value.trim(),
    jungle: els.jungle.value.trim(),
    mid: els.mid.value.trim(),
    adc: els.adc.value.trim(),
    support: els.support.value.trim(),
  };
}

function renderEmpty(message) {
  els.result.className = "result-empty";
  els.result.innerHTML = message;
}

function getRoleRows(roleKey) {
  return draftData?.roles?.[roleKey] || [];
}

function buildChampionList(roleKey) {
  const champions = new Set();
  for (const row of getRoleRows(roleKey)) {
    if (row?.champion) champions.add(row.champion);
  }
  return [...champions].sort((a, b) => a.localeCompare(b, "es"));
}

function getChampionMeta(name) {
  return championMeta.get(normalizeText(name)) || null;
}

function findRoleRow(roleKey, championName) {
  const roleRows = getRoleRows(roleKey);
  if (!Array.isArray(roleRows) || !championName) return null;

  const target = normalizeText(championName);
  return roleRows.find((row) => normalizeText(row?.champion) === target) || null;
}

function findDuplicateChampion(comp) {
  const seen = new Set();
  for (const champion of Object.values(comp)) {
    if (!champion) continue;
    const key = normalizeText(champion);
    if (!key) continue;
    if (seen.has(key)) return champion;
    seen.add(key);
  }
  return null;
}

function firstInvalidRole(comp) {
  for (const role of ROLE_FIELDS) {
    const champ = comp[role.key === "botline" ? "adc" : role.key];
    if (champ && !findRoleRow(role.key, champ)) {
      return { role: role.key, champion: champ };
    }
  }
  return null;
}

function setInputValidity(input, isInvalid) {
  if (!input) return;
  input.classList.toggle("input-error", Boolean(isInvalid));
  input.setAttribute("aria-invalid", isInvalid ? "true" : "false");
}

function clearInputValidity() {
  for (const role of ROLE_FIELDS) {
    setInputValidity(roleInput(role.key), false);
  }
}

function markDuplicateInputs(duplicateChampion) {
  const target = normalizeText(duplicateChampion);
  for (const role of ROLE_FIELDS) {
    const input = roleInput(role.key);
    setInputValidity(input, normalizeText(input?.value) === target);
  }
}

function closeRoleMenu(roleKey) {
  const menu = roleMenu(roleKey);
  const input = roleInput(roleKey);
  if (menu) menu.hidden = true;
  if (input) input.setAttribute("aria-expanded", "false");
  if (activeRoleKey === roleKey) activeRoleKey = null;
}

function closeAllMenus() {
  for (const role of ROLE_FIELDS) closeRoleMenu(role.key);
}

function renderRoleMenu(roleKey, query = "") {
  const menu = roleMenu(roleKey);
  const input = roleInput(roleKey);
  if (!menu || !input) return;

  const allNames = buildChampionList(roleKey);
  const normalizedQuery = normalizeText(query);
  const filtered = normalizedQuery
    ? allNames.filter((name) => normalizeText(name).includes(normalizedQuery))
    : allNames;

  const items = filtered.slice(0, 60);
  menu.innerHTML = items.length
    ? items
        .map(
          (name) => `
            <button type="button" class="picker-item" data-role="${escapeHtml(roleKey)}" data-champion="${escapeHtml(name)}">
              <span class="picker-name">${escapeHtml(name)}</span>
            </button>
          `
        )
        .join("")
    : `<div class="picker-empty">Sin resultados</div>`;

  menu.hidden = false;
  input.setAttribute("aria-expanded", "true");
  activeRoleKey = roleKey;
}

function renderChampionOptions() {
  for (const role of ROLE_FIELDS) {
    renderRoleMenu(role.key, "");
    closeRoleMenu(role.key);
  }
}

function openRoleMenu(roleKey) {
  const input = roleInput(roleKey);
  if (!input) return;
  renderRoleMenu(roleKey, input.value);
}

function selectChampion(roleKey, championName) {
  const input = roleInput(roleKey);
  if (!input) return;
  input.value = championName;
  closeAllMenus();
  scheduleAnalyze();
}

function renderComposition(comp) {
  const rows = ROLE_FIELDS.map((role) => {
    const champ = comp[role.key === "botline" ? "adc" : role.key];
    const data = findRoleRow(role.key, champ);
    const meta = champ ? getChampionMeta(champ) : null;
    const missing = Boolean(champ) && !data;

    const iconMarkup = meta
      ? `<img class="champion-icon" src="${escapeHtml(meta.iconUrl)}" alt="" loading="lazy" />`
      : `<div class="champion-icon placeholder" aria-hidden="true">${escapeHtml(
          champ ? champ.slice(0, 2).toUpperCase() : "—"
        )}</div>`;

    return `
      <tr class="${missing ? "is-missing" : ""}">
        <td class="role-cell">${escapeHtml(role.label)}</td>
        <td>
          <div class="champion-cell">
            ${iconMarkup}
            <div class="champion-copy">
              <div class="champion-name">${escapeHtml(champ || "—")}</div>
              ${meta?.id ? `<div class="champion-sub">${escapeHtml(meta.id)}</div>` : ""}
            </div>
          </div>
        </td>
        <td>${escapeHtml(data?.identity || (champ ? "No encontrado" : ""))}</td>
        <td>${escapeHtml(data?.function || "")}</td>
        <td>${escapeHtml(data?.tempo || "")}</td>
        <td>${escapeHtml(data?.strengths || "")}</td>
        <td>${escapeHtml(data?.weaknesses || "")}</td>
      </tr>
    `;
  }).join("");

  els.result.className = "result-box";
  els.result.innerHTML = `
    <div class="table-wrap">
      <table class="composition-table">
        <thead>
          <tr>
            <th>Rol</th>
            <th>Campeón</th>
            <th>Identidad</th>
            <th>Función</th>
            <th>Ritmo</th>
            <th>Fortalezas</th>
            <th>Debilidades</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function renderNeedMoreData() {
  renderEmpty("Cargando base del Excel...");
  setStatus("Cargando base...");
}

function analyze() {
  const comp = readComposition();
  const hasAnyChampion = Object.values(comp).some(Boolean);

  if (!hasAnyChampion) {
    clearInputValidity();
    closeAllMenus();
    renderEmpty("Selecciona un campeón en cada rol.");
    setStatus("Faltan campeones");
    return;
  }

  if (!workbookReady) {
    renderNeedMoreData();
    return;
  }

  const duplicate = findDuplicateChampion(comp);
  if (duplicate) {
    markDuplicateInputs(duplicate);
    renderEmpty(`No repitas campeones. Corrige ${escapeHtml(duplicate)}.`);
    setStatus("Campeón repetido");
    return;
  }

  clearInputValidity();
  const invalidRole = firstInvalidRole(comp);
  if (invalidRole) {
    const input = roleInput(invalidRole.role);
    setInputValidity(input, true);
    renderComposition(comp);
    setStatus(`No válido en ${invalidRole.role.toUpperCase()}: ${invalidRole.champion}`);
    return;
  }

  setBusy(true);
  try {
    renderComposition(comp);
    setStatus("Listo");
  } catch (error) {
    renderEmpty(`No se pudo cargar la composición: ${escapeHtml(error.message || "error desconocido")}`);
    setStatus("Error");
  } finally {
    setBusy(false);
  }
}

function scheduleAnalyze() {
  if (analyzeQueued) return;
  analyzeQueued = true;
  window.requestAnimationFrame(() => {
    analyzeQueued = false;
    analyze();
  });
}

function clearSelection() {
  for (const role of ROLE_FIELDS) {
    const input = roleInput(role.key);
    if (input) input.value = "";
    closeRoleMenu(role.key);
  }
  clearInputValidity();
  renderEmpty("Selecciona un campeón en cada rol.");
  setStatus("Selección limpia");
}

async function loadChampionMeta() {
  try {
    const versionsResponse = await fetch(DDragonVersionsURL);
    const versions = await versionsResponse.json();
    const version = Array.isArray(versions) && versions.length ? versions[0] : null;
    if (!version) throw new Error("No se encontró versión de Data Dragon");

    const response = await fetch(DDragonChampionDataURL(version));
    const payload = await response.json();
    const data = Object.values(payload?.data || {});

    championMeta = new Map(
      data.map((champ) => {
        const name = String(champ?.name || "").trim();
        const id = String(champ?.id || "").trim();
        return [
          normalizeText(name),
          {
            name,
            id,
            iconUrl: DDragonIconURL(version, id),
          },
        ];
      })
    );
  } catch {
    championMeta = new Map();
  }
}

async function loadWorkbook() {
  try {
    if (typeof XLSX === "undefined") {
      throw new Error("No se pudo cargar la librería XLSX");
    }

    const response = await fetch(WORKBOOK_URL, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const buffer = await response.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });

    const roles = {};
    for (const [roleKey, sheetName] of Object.entries(SHEET_MAP)) {
      const sheet = workbook.Sheets[sheetName];
      if (!sheet) {
        throw new Error(`Falta la hoja ${sheetName}`);
      }

      const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
      roles[roleKey] = rows
        .map((row) => ({
          champion: String(row["Campeón"] || "").trim(),
          identity: String(row["Identidad"] || "").trim(),
          function: String(row["Función"] || "").trim(),
          tempo: String(row["Ritmo"] || "").trim(),
          strengths: String(row["Fortalezas"] || "").trim(),
          weaknesses: String(row["Debilidades"] || "").trim(),
        }))
        .filter((row) => row.champion);
    }

    draftData = { roles };
    workbookReady = true;
    renderChampionOptions();
    setStatus("Base cargada");
    scheduleAnalyze();
  } catch (error) {
    draftData = null;
    workbookReady = false;
    renderChampionOptions();
    setStatus("Sin base");
    renderEmpty(`No se ha podido leer el Excel: ${escapeHtml(error.message || "error")}`);
  }
}

function bindPickers() {
  for (const role of ROLE_FIELDS) {
    const input = roleInput(role.key);
    const menu = roleMenu(role.key);
    if (!input || !menu) continue;

    input.addEventListener("focus", () => openRoleMenu(role.key));
    input.addEventListener("click", () => openRoleMenu(role.key));
    input.addEventListener("input", () => {
      openRoleMenu(role.key);
      scheduleAnalyze();
    });
    input.addEventListener("change", scheduleAnalyze);
    input.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeRoleMenu(role.key);
      }
      if (event.key === "Enter") {
        event.preventDefault();
        const firstOption = menu.querySelector(".picker-item");
        if (firstOption) {
          const championName = firstOption.getAttribute("data-champion") || "";
          if (championName) selectChampion(role.key, championName);
        } else {
          closeRoleMenu(role.key);
          scheduleAnalyze();
        }
      }
    });
    input.addEventListener("blur", () => {
      window.setTimeout(() => {
        if (activeRoleKey === role.key) closeRoleMenu(role.key);
      }, 120);
    });

    menu.addEventListener("mousedown", (event) => {
      const button = event.target.closest(".picker-item");
      if (!button) return;
      event.preventDefault();
      const championName = button.getAttribute("data-champion") || "";
      if (championName) selectChampion(role.key, championName);
    });
  }

  document.addEventListener("pointerdown", (event) => {
    if (!event.target.closest(".picker-shell")) {
      closeAllMenus();
    }
  });
}

els.analyzeBtn.addEventListener("click", analyze);
els.demoBtn.addEventListener("click", clearSelection);

bindPickers();
renderNeedMoreData();
loadChampionMeta();
loadWorkbook();