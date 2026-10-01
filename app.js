const STORAGE_KEY = "lol-team-analyzer-settings";
const DEMO = {
  top: "Ornn",
  jungle: "Vi",
  mid: "Ahri",
  adc: "Jinx",
  support: "Lulu",
};

const DEFAULT_MODEL = "gpt-4o-2024-08-06";

const ANALYSIS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    identity: { type: "string" },
    playstyle: { type: "string" },
    summary: { type: "string" },
    strengths: {
      type: "array",
      items: { type: "string" },
      minItems: 1,
      maxItems: 3,
    },
    weaknesses: {
      type: "array",
      items: { type: "string" },
      minItems: 1,
      maxItems: 3,
    },
    missing_roles: {
      type: "array",
      items: { type: "string" },
      maxItems: 5,
    },
    recommended_picks: {
      type: "array",
      items: { type: "string" },
      maxItems: 3,
    },
    win_condition: { type: "string" },
    main_threat: { type: "string" },
    difficulty: {
      type: "string",
      enum: ["Easy", "Medium", "Hard"],
    },
  },
  required: [
    "identity",
    "playstyle",
    "summary",
    "strengths",
    "weaknesses",
    "missing_roles",
    "recommended_picks",
    "win_condition",
    "main_threat",
    "difficulty",
  ],
};

const els = {
  apiKey: document.getElementById("apiKey"),
  modelName: document.getElementById("modelName"),
  top: document.getElementById("top"),
  jungle: document.getElementById("jungle"),
  mid: document.getElementById("mid"),
  adc: document.getElementById("adc"),
  support: document.getElementById("support"),
  analyzeBtn: document.getElementById("analyzeBtn"),
  demoBtn: document.getElementById("demoBtn"),
  result: document.getElementById("result"),
  statusPill: document.getElementById("statusPill"),
};

const SYSTEM_PROMPT = `Eres un analista experto de League of Legends.
Responde siempre en español, de forma breve y precisa.

Analiza la composición actual, aunque esté incompleta.
Si faltan roles, explica qué falta y recomienda picks útiles para completar el draft.
Si la composición está completa, céntrate en la lectura final del equipo.

Devuelve solo JSON válido y exactamente con esta estructura:
{
  "identity": "string",
  "playstyle": "string",
  "summary": "string",
  "strengths": ["string", "string", "string"],
  "weaknesses": ["string", "string", "string"],
  "missing_roles": ["string"],
  "recommended_picks": ["string"],
  "win_condition": "string",
  "main_threat": "string",
  "difficulty": "Easy|Medium|Hard"
}

Reglas:
- Máximo 3 puntos por lista.
- Frases cortas.
- summary: una sola frase muy clara, máximo 18 palabras.
- playstyle: una etiqueta breve, por ejemplo "Front to Back", "Pick", "Dive", "Poke" o "Skirmish".
- missing_roles: lista corta con los roles que faltan, o vacía si no falta ninguno.
- recommended_picks: hasta 3 campeones útiles para completar el draft, o vacía si no aplica.
- win_condition: una frase práctica y concreta.
- Sin markdown.
- Sin explicaciones.
- Sin campos extra.
- Prioriza teamfights, sinergias, curva de poder y condición de victoria.`;

function loadSettings() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    if (data.apiKey) els.apiKey.value = data.apiKey;
    if (data.modelName) els.modelName.value = data.modelName;
    if (!data.modelName) els.modelName.value = DEFAULT_MODEL;
  } catch {
    els.modelName.value = DEFAULT_MODEL;
  }
}

function saveSettings() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      apiKey: els.apiKey.value.trim(),
      modelName: els.modelName.value.trim() || DEFAULT_MODEL,
    })
  );
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
      <span class="badge warn">${escapeHtml(data.playstyle || "Playstyle")}</span>
      <span class="badge red">Dificultad: ${escapeHtml(data.difficulty || "Medium")}</span>
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
        <span class="label">Amenaza principal</span>
        <div class="value">${escapeHtml(data.main_threat || "-")}</div>
      </div>
      <div class="metric">
        <span class="label">Faltan roles</span>
        ${renderList(data.missing_roles && data.missing_roles.map(roleLabel))}
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
        <span class="label">Picks recomendados</span>
        ${renderList(data.recommended_picks)}
      </div>
      <div class="metric">
        <span class="label">Lectura rápida</span>
        <div class="value">${escapeHtml(data.summary || data.playstyle || "-")}</div>
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
  const lines = [
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
  ];
  return lines.join("\n");
}

function normalizeAnalysis(raw) {
  return {
    identity: String(raw?.identity || "Sin identidad"),
    playstyle: String(raw?.playstyle || ""),
    summary: String(raw?.summary || ""),
    strengths: Array.isArray(raw?.strengths) ? raw.strengths.slice(0, 3).map(String) : [],
    weaknesses: Array.isArray(raw?.weaknesses) ? raw.weaknesses.slice(0, 3).map(String) : [],
    missing_roles: Array.isArray(raw?.missing_roles) ? raw.missing_roles.slice(0, 5).map(String) : [],
    recommended_picks: Array.isArray(raw?.recommended_picks) ? raw.recommended_picks.slice(0, 3).map(String) : [],
    win_condition: String(raw?.win_condition || ""),
    main_threat: String(raw?.main_threat || ""),
    difficulty: ["Easy", "Medium", "Hard"].includes(raw?.difficulty) ? raw.difficulty : "Medium",
  };
}

async function analyze() {
  const apiKey = els.apiKey.value.trim();
  const model = els.modelName.value.trim() || DEFAULT_MODEL;
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
        model,
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
        playstyle: "",
        summary: rawText || "No se pudo leer la respuesta.",
        strengths: [],
        weaknesses: [],
        missing_roles: [],
        recommended_picks: [],
        win_condition: "",
        main_threat: "",
        difficulty: "Medium",
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
els.modelName.addEventListener("change", saveSettings);

loadSettings();
registerServiceWorker();
renderEmpty("Aquí aparecerá el análisis.");