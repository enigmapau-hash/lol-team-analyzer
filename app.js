const STORAGE_KEY = "lol-team-analyzer-settings";
const DEFAULT_MODEL = "gpt-4o-2024-08-06";
const CHAMPION_LIST_ID = "championList";

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

const ANALYSIS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    identity: { type: "string" },
    summary: { type: "string" },
    strengths: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 3 },
    weaknesses: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 3 },
    missing_roles: { type: "array", items: { type: "string" }, maxItems: 5 },
    recommended_picks: { type: "array", items: { type: "string" }, maxItems: 3 },
    win_condition: { type: "string" },
  },
  required: [
    "identity",
    "summary",
    "strengths",
    "weaknesses",
    "missing_roles",
    "recommended_picks",
    "win_condition",
  ],
};

const els = {
  apiKey: document.getElementById("apiKey"),
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

const SYSTEM_PROMPT = `Eres un analista experto de League of Legends.
Responde siempre en español, breve y directo.

Analiza la composición actual, aunque esté incompleta.
Si faltan roles, explica qué falta y recomienda picks útiles para completar el draft.
Si la composición está completa, céntrate en la lectura final del equipo.

Devuelve solo JSON válido y exactamente con esta estructura:
{
  "identity": "string",
  "summary": "string",
  "strengths": ["string", "string", "string"],
  "weaknesses": ["string", "string", "string"],
  "missing_roles": ["string"],
  "recommended_picks": ["string"],
  "win_condition": "string"
}

Reglas:
- Máximo 3 puntos por lista.
- Frases cortas.
- identity debe ser una etiqueta breve, por ejemplo Front to Back, Dive, Pick, Poke, Protect Carry, Split Push, Wombo Combo o Skirmish.
- missing_roles: vacío si no falta nadie.
- recommended_picks: hasta 3 campeones útiles, o vacío si no aplica.
- Sin markdown.
- Sin explicaciones.
- Sin campos extra.`;

function loadSettings() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    if (data.apiKey) els.apiKey.value = data.apiKey;
  } catch {
    // ignore
  }
}

function saveSettings() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ apiKey: els.apiKey.value.trim() }));
}

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

function roleLabel(key) {
  return {
    top: "Top",
    jungle: "Jungle",
    mid: "Mid",
    adc: "ADC",
    support: "Support",
  }[key] || key;
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

function renderAnalysis(data) {
  els.result.className = "result-box";
  els.result.innerHTML = `
    <div class="badge-row">
      <span class="badge">${escapeHtml(data.identity || "Sin identidad")}</span>
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
        <span class="label">Picks recomendados</span>
        ${renderList(data.recommended_picks)}
      </div>
    </div>
  `;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildUserPrompt(comp) {
  return [
    "Analiza esta composición de League of Legends:",
    "",
    `Top: ${comp.top || "(vacío)"}`,
    `Jungle: ${comp.jungle || "(vacío)"}`,
    `Mid: ${comp.mid || "(vacío)"}`,
    `ADC: ${comp.adc || "(vacío)"}`,
    `Support: ${comp.support || "(vacío)"}`,
    "",
    "Si faltan roles, analiza el draft parcial y recomiéndalos.",
    "Quiero una lectura sencilla, clara y muy breve.",
  ].join("\n");
}

function normalizeAnalysis(raw) {
  return {
    identity: String(raw?.identity || "Sin identidad"),
    summary: String(raw?.summary || ""),
    strengths: Array.isArray(raw?.strengths) ? raw.strengths.slice(0, 3).map(String) : [],
    weaknesses: Array.isArray(raw?.weaknesses) ? raw.weaknesses.slice(0, 3).map(String) : [],
    missing_roles: Array.isArray(raw?.missing_roles) ? raw.missing_roles.slice(0, 5).map(String) : [],
    recommended_picks: Array.isArray(raw?.recommended_picks) ? raw.recommended_picks.slice(0, 3).map(String) : [],
    win_condition: String(raw?.win_condition || ""),
  };
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

async function analyze() {
  const apiKey = els.apiKey.value.trim();
  const comp = readComposition();
  const hasAnyChampion = Object.values(comp).some(Boolean);

  if (!apiKey) {
    renderEmpty("Falta la API key. Escríbela arriba para poder analizar.");
    setStatus("Sin API key");
    return;
  }

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

  saveSettings();
  setBusy(true);
  renderEmpty("Analizando...");

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: buildUserPrompt(comp) },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "team_analysis",
            strict: true,
            schema: ANALYSIS_SCHEMA,
          },
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const message = data?.error?.message || `Error HTTP ${response.status}`;
      throw new Error(message);
    }

    const rawText = data?.choices?.[0]?.message?.content || "";
    let parsed;

    try {
      parsed = JSON.parse(rawText);
    } catch {
      parsed = {
        identity: "Respuesta no estructurada",
        summary: rawText || "No se pudo leer la respuesta.",
        strengths: [],
        weaknesses: [],
        missing_roles: [],
        recommended_picks: [],
        win_condition: "",
      };
    }

    renderAnalysis(normalizeAnalysis(parsed));
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
els.apiKey.addEventListener("change", saveSettings);

loadSettings();
loadChampionOptions();
registerServiceWorker();
renderEmpty("Aquí aparecerá el análisis.");