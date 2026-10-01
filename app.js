const STORAGE_KEY = "lol-team-analyzer-settings";
const DEMO = {
  top: "Ornn",
  jungle: "Vi",
  mid: "Ahri",
  adc: "Jinx",
  support: "Lulu",
};

const ANALYSIS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    identity: { type: "string" },
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
    win_condition: { type: "string" },
    main_threat: { type: "string" },
    difficulty: {
      type: "string",
      enum: ["Easy", "Medium", "Hard"],
    },
  },
  required: ["identity", "strengths", "weaknesses", "win_condition", "main_threat", "difficulty"],
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

Analiza una composición de 5 campeones.
Devuelve solo JSON válido y exactamente con esta estructura:
{
  "identity": "string",
  "strengths": ["string", "string", "string"],
  "weaknesses": ["string", "string", "string"],
  "win_condition": "string",
  "main_threat": "string",
  "difficulty": "Easy|Medium|Hard"
}

Reglas:
- Máximo 3 puntos por lista.
- Frases cortas.
- Sin markdown.
- Sin explicaciones.
- Sin campos extra.
- Si no estás seguro, prioriza una lectura útil para draft y teamfights.`;

function loadSettings() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    if (data.apiKey) els.apiKey.value = data.apiKey;
    if (data.modelName) els.modelName.value = data.modelName;
  } catch {
    // ignore
  }
}

function saveSettings() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      apiKey: els.apiKey.value.trim(),
      modelName: els.modelName.value.trim() || "gpt-5.4",
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
      <span class="badge warn">Dificultad: ${escapeHtml(data.difficulty || "Medium")}</span>
    </div>

    <div class="result-grid">
      <div class="metric">
        <span class="label">Condición de victoria</span>
        <div class="value">${escapeHtml(data.win_condition || "-")}</div>
      </div>
      <div class="metric">
        <span class="label">Amenaza principal</span>
        <div class="value">${escapeHtml(data.main_threat || "-")}</div>
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
  return `Analiza esta composición de League of Legends:\n\nTop: ${comp.top}\nJungle: ${comp.jungle}\nMid: ${comp.mid}\nADC: ${comp.adc}\nSupport: ${comp.support}\n\nQuiero un análisis sencillo, claro y breve.`;
}

function extractText(data) {
  const output = Array.isArray(data?.output) ? data.output : [];
  for (const item of output) {
    const content = Array.isArray(item?.content) ? item.content : [];
    for (const part of content) {
      if (typeof part?.text === "string") return part.text;
    }
  }
  return "";
}

function normalizeAnalysis(raw) {
  return {
    identity: String(raw?.identity || "Sin identidad"),
    strengths: Array.isArray(raw?.strengths) ? raw.strengths.slice(0, 3).map(String) : [],
    weaknesses: Array.isArray(raw?.weaknesses) ? raw.weaknesses.slice(0, 3).map(String) : [],
    win_condition: String(raw?.win_condition || ""),
    main_threat: String(raw?.main_threat || ""),
    difficulty: ["Easy", "Medium", "Hard"].includes(raw?.difficulty) ? raw.difficulty : "Medium",
  };
}

async function analyze() {
  const apiKey = els.apiKey.value.trim();
  const model = els.modelName.value.trim() || "gpt-5.4";
  const comp = readComposition();

  if (!apiKey) {
    renderEmpty("Falta la API key. Escríbela arriba para poder analizar.");
    setStatus("Sin API key");
    return;
  }

  if (!Object.values(comp).every(Boolean)) {
    renderEmpty("Completa los cinco roles antes de analizar.");
    setStatus("Faltan campeones");
    return;
  }

  saveSettings();
  setBusy(true);
  renderEmpty("Analizando...");

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        input: [
          {
            role: "system",
            content: [{ type: "text", text: SYSTEM_PROMPT }],
          },
          {
            role: "user",
            content: [{ type: "text", text: buildUserPrompt(comp) }],
          },
        ],
        text: {
          format: {
            type: "json_schema",
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

    const rawText = data.output_text || extractText(data) || "";
    let parsed;

    try {
      parsed = JSON.parse(rawText);
    } catch {
      parsed = {
        identity: "Respuesta no estructurada",
        strengths: [rawText || "No se pudo leer la respuesta."],
        weaknesses: [],
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
