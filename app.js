const CHAMPION_LIST_ID = "championList";
const DRAFT_DATA_URL = "draft-pool.json";

const DEMO = {
  top: "Ornn",
  jungle: "Vi",
  mid: "Ahri",
  adc: "Jinx",
  support: "Lulu",
};

const FALLBACK_CHAMPIONS = [
  "Aatrox", "Ahri", "Akali", "Alistar", "Amumu", "Annie", "Ashe", "Aurelion Sol",
  "Braum", "Caitlyn", "Camille", "Darius", "Diana", "Dr. Mundo", "Ekko", "Ezreal",
  "Fiora", "Garen", "Gragas", "Janna", "Jax", "Jinx", "Karma", "Kayn", "Leona",
  "Lulu", "Lux", "Malphite", "Morgana", "Nami", "Nautilus", "Nocturne", "Orianna",
  "Ornn", "Rakan", "Sejuani", "Sett", "Sivir", "Thresh", "Tristana", "Vi", "Viego",
  "Wukong", "Xayah", "Yasuo", "Zed", "Zeri", "Ziggs", "Zyra",
];

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
  championList: document.getElementById(CHAMPION_LIST_ID),
};

let draftData = null;

function setStatus(text) {
  els.statusPill.textContent = text;
}

function setBusy(isBusy) {
  els.analyzeBtn.disabled = isBusy;
  els.demoBtn.disabled = isBusy;
  setStatus(isBusy ? "Analizando..." : "Listo");
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

function renderList(items) {
  return Array.isArray(items) && items.length
    ? `<ul class="list">${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
    : `<div class="empty-small">-</div>`;
}

function roleLabel(key) {
  return {
    top: "Top",
    jungle: "Jungle",
    mid: "Mid",
    adc: "ADC",
    support: "Support",
  }[key] || key;
}

function renderAnalysis(data) {
  els.result.className = "result-box";
  els.result.innerHTML = `
    <div class="badge-row">
      <span class="badge">${escapeHtml(data.identity || "Sin identidad")}</span>
      ${typeof data.score === "number" ? `<span class="badge warn">${escapeHtml(data.score)}%</span>` : ""}
    </div>

    <div class="result-grid">
      <div class="metric">
        <span class="label">Resumen</span>
        <div class="value">${escapeHtml(data.summary || "-")}</div>
      </div>
      <div class="metric">
        <span class="label">Condición de victoria</span>
        <div class="value">${escapeHtml(data.win_condition || "-")}</div>
      </div>
    </div>

    <div class="result-grid">
      <div class="metric">
        <span class="label">Fortalezas</span>
        ${renderList(data.strengths)}
      </div>
      <div class="metric">
        <span class="label">Debilidades</span>
        ${renderList(data.weaknesses)}
      </div>
    </div>

    <div class="result-grid">
      <div class="metric">
        <span class="label">Roles que faltan</span>
        ${renderList((data.missing_roles || []).map(roleLabel))}
      </div>
      <div class="metric">
        <span class="label">Notas</span>
        ${renderList(data.notes)}
      </div>
    </div>
  `;
}

function renderChampionOptions(names) {
  if (!els.championList) return;
  els.championList.innerHTML = names.map((name) => `<option value="${escapeHtml(name)}"></option>`).join("");
}

async function loadChampionOptions() {
  try {
    const versionsResponse = await fetch("https://ddragon.leagueoflegends.com/api/versions.json");
    const versions = await versionsResponse.json();
    const version = Array.isArray(versions) && versions.length ? versions[0] : null;
    if (!version) throw new Error("No Data Dragon version");

    const championsResponse = await fetch(
      `https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/champion.json`
    );
    const champions = await championsResponse.json();
    const names = Object.values(champions?.data || {})
      .map((champion) => champion.name)
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));

    renderChampionOptions(names.length ? names : FALLBACK_CHAMPIONS);
  } catch {
    renderChampionOptions(FALLBACK_CHAMPIONS);
  }
}

function findDuplicateChampion(comp) {
  const seen = new Set();
  for (const champion of Object.values(comp)) {
    if (!champion) continue;
    const key = champion.toLowerCase();
    if (seen.has(key)) return champion;
    seen.add(key);
  }
  return null;
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function compositionKey(comp) {
  return [comp.top, comp.jungle, comp.mid, comp.adc, comp.support].map(normalizeText).join("|");
}

function fallbackAnalysis(comp) {
  return {
    identity: "Motor local",
    score: null,
    summary: "La app ya no usa IA. Falta cargar la base del Excel exportada a JSON para replicar las fórmulas de Composiciones.",
    strengths: ["Entrada sin duplicados", "Estructura preparada para datos del Excel"],
    weaknesses: ["No hay motor de fórmulas cargado", "El Excel aún no está convertido a JSON"],
    missing_roles: Object.entries(comp).filter(([, champ]) => !champ).map(([role]) => role),
    notes: ["Añade draft-pool.json con las tablas y fórmulas exportadas.", "Después se puede calcular igual que en la hoja Composiciones."],
    win_condition: "Cargar la base de datos del draft",
  };
}

function analyzeLocal(comp) {
  if (!draftData || !Array.isArray(draftData.compositions)) {
    return fallbackAnalysis(comp);
  }

  const key = compositionKey(comp);
  const match = draftData.compositions.find((row) => normalizeText(row.key) === key);

  if (match) {
    return {
      identity: match.identity || "Sin identidad",
      score: typeof match.score === "number" ? match.score : null,
      summary: match.summary || "",
      strengths: Array.isArray(match.strengths) ? match.strengths : [],
      weaknesses: Array.isArray(match.weaknesses) ? match.weaknesses : [],
      missing_roles: Array.isArray(match.missing_roles) ? match.missing_roles : [],
      notes: Array.isArray(match.notes) ? match.notes : [],
      win_condition: match.win_condition || "",
    };
  }

  return {
    ...fallbackAnalysis(comp),
    summary: "No se ha encontrado una composición exacta en la base local.",
  };
}

async function loadDraftData() {
  try {
    const response = await fetch(DRAFT_DATA_URL, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    draftData = await response.json();
    setStatus("Base cargada");
  } catch {
    draftData = null;
    setStatus("Sin base");
    renderEmpty("No se ha cargado la base del Excel todavía.");
  }
}

async function analyze() {
  const comp = readComposition();
  const hasAnyChampion = Object.values(comp).some(Boolean);

  if (!hasAnyChampion) {
    renderEmpty("Escribe al menos un campeón para analizar el draft.");
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
  renderEmpty("Analizando...");

  try {
    renderAnalysis(analyzeLocal(comp));
    setStatus("Listo");
  } catch (error) {
    renderEmpty(`No se pudo analizar: ${escapeHtml(error.message || "error desconocido")}`);
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
}

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  try {
    await navigator.serviceWorker.register("sw.js");
  } catch {
    // ignore
  }
}

els.analyzeBtn.addEventListener("click", analyze);
els.demoBtn.addEventListener("click", fillDemo);

loadChampionOptions();
loadDraftData();
registerServiceWorker();
renderEmpty("Aquí aparecerá el análisis.");