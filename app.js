const WORKBOOK_URL = encodeURI("Draft Pool.xlsx");

const SHEET_MAP = {
  top: "Tabla Top",
  jungle: "Tabla Jungla",
  mid: "Tabla Mid",
  botline: "Tabla Botline",
  support: "Tabla Support",
};

const ROLE_ORDER = [
  { key: "top", label: "TOP" },
  { key: "jungle", label: "JUNGLA" },
  { key: "mid", label: "MID" },
  { key: "botline", label: "BOTLINE" },
  { key: "support", label: "SUPPORT" },
];

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
  analyzeBtn: document.getElementById("analyzeBtn"),
  demoBtn: document.getElementById("demoBtn"),
  result: document.getElementById("result"),
  statusPill: document.getElementById("statusPill"),
  championList: document.getElementById("championList"),
};

let draftData = null;

function setStatus(text) {
  els.statusPill.textContent = text;
}

function setBusy(isBusy) {
  els.analyzeBtn.disabled = isBusy;
  els.demoBtn.disabled = isBusy;
  setStatus(isBusy ? "Cargando..." : "Listo");
}

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/["'`´’]/g, "")
    .trim()
    .toLowerCase();
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

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderEmpty(message) {
  els.result.className = "result-empty";
  els.result.innerHTML = message;
}

function findDuplicateChampion(comp) {
  const seen = new Set();
  for (const champion of Object.values(comp)) {
    if (!champion) continue;
    const key = normalizeText(champion);
    if (seen.has(key)) return champion;
    seen.add(key);
  }
  return null;
}

function roleInputKey(roleKey) {
  return roleKey === "botline" ? "adc" : roleKey;
}

function buildChampionList() {
  const champions = new Set();

  for (const sheetRows of Object.values(draftData?.roles || {})) {
    for (const row of sheetRows || []) {
      if (row?.champion) champions.add(row.champion);
    }
  }

  return [...champions].sort((a, b) => a.localeCompare(b, "es"));
}

function renderChampionOptions() {
  if (!els.championList) return;
  const names = buildChampionList();
  els.championList.innerHTML = names
    .map((name) => `<option value="${escapeHtml(name)}"></option>`)
    .join("");
}

function findRoleRow(roleKey, championName) {
  const roleRows = draftData?.roles?.[roleKey];
  if (!Array.isArray(roleRows) || !championName) return null;

  const target = normalizeText(championName);
  return roleRows.find((row) => normalizeText(row?.champion) === target) || null;
}

function renderComposition(comp) {
  const rows = ROLE_ORDER.map((role) => {
    const champ = comp[roleInputKey(role.key)];
    const data = findRoleRow(role.key, champ);
    const missing = champ && !data;

    return `
      <tr class="${missing ? "is-missing" : ""}">
        <td class="role-cell">${escapeHtml(role.label)}</td>
        <td>${escapeHtml(champ || "—")}</td>
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
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
  `;
}

function analyze() {
  const comp = readComposition();
  const hasAnyChampion = Object.values(comp).some(Boolean);

  if (!hasAnyChampion) {
    renderEmpty("Escribe al menos un campeón para mostrar la tabla.");
    setStatus("Faltan campeones");
    return;
  }

  const duplicate = findDuplicateChampion(comp);
  if (duplicate) {
    renderEmpty(`No repitas campeones. Corrige ${escapeHtml(duplicate)}.`);
    setStatus("Campeón repetido");
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

function fillDemo() {
  els.top.value = DEMO.top;
  els.jungle.value = DEMO.jungle;
  els.mid.value = DEMO.mid;
  els.adc.value = DEMO.adc;
  els.support.value = DEMO.support;
  setStatus("Ejemplo cargado");
  analyze();
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
    renderChampionOptions();
    setStatus("Base cargada");
  } catch (error) {
    draftData = null;
    renderChampionOptions();
    setStatus("Sin base");
    renderEmpty(`No se ha podido leer el Excel: ${escapeHtml(error.message || "error")}`);
  }
}

els.analyzeBtn.addEventListener("click", analyze);
els.demoBtn.addEventListener("click", fillDemo);

renderEmpty("Aquí aparecerá la tabla Composición.");
loadWorkbook();