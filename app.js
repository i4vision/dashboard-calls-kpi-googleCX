/* ==========================================================================
   CallIntelligence AI - Application Logic
   ========================================================================== */

// Supabase Configuration
const SUPABASE_URL = "https://supabase01.i4vision.us";
const SUPABASE_ANON_KEY = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc1NTA2NzUwMCwiZXhwIjo0OTEwNzQxMTAwLCJyb2xlIjoiYW5vbiJ9.zH718o3A3kfe14xc_PdXqtkanZNtyWwedRi1KVpDL_I";

// Application State
let state = {
  allCalls: [],
  filteredCalls: [],
  activeCall: null,
  categories: [],
  charts: {
    sentiment: null,
    categoryRisk: null,
    agentScore: null,
    callsHour: null,
    callsDay: null,
    sentimentTrend: null,
    resolutionTrend: null
  },
  activeTheme: 'dark',
  gcsFiles: [],
  filteredGcsFiles: [],
  supabaseSettingsEnabled: true,
  gcsTranscriptsMap: {},
  selectedGcsFiles: new Set(),
  gcsTranscriptObjects: [],
  ongoingAnalysis: {},
  analysisStartTimes: {},
  lang: 'en',
  predefinedQuestions: [],
  agentMappings: {},
  scoreThresholdFilter: null
};

// ==========================================================================
// Translation Dictionary & Language Toggle Engine
// ==========================================================================
const TRANSLATIONS = {
  en: {
    brandName: "i4vision Calls",
    liveConnected: "Live Supabase Connected",
    btnExportExcelHeader: '<i class="fa-solid fa-file-excel"></i> Export Excel',
    btnOpenAudioSidebar: '<i class="fa-solid fa-folder-open"></i> Recordings',
    btnOpenChat: '<i class="fa-solid fa-comments"></i> Ask AI',
    btnOpenSettingsTitle: "General Settings",
    themeToggleTitle: "Toggle Theme",
    
    kpiTotalCalls: "Total Calls",
    kpiAvgScore: "Avg Agent Score",
    kpiResolution: "Resolution Rate",
    kpiCost: "Total Cost",
    kpiRealTime: '<i class="fa-solid fa-arrow-trend-up"></i> Real-time sync',
    kpiScale: '<i class="fa-solid fa-star" style="color: var(--color-warning); margin-right: 0.25rem;"></i> Scale 0 to 10',
    kpiResolvedCalls: "Resolved calls",
    kpiAvgCostCall: '<i class="fa-solid fa-coins"></i> Avg cost/call',
    
    tabOverview: '<i class="fa-solid fa-chart-pie"></i> Overview Analytics',
    tabTrends: '<i class="fa-solid fa-chart-line"></i> Temporal Trends',
    
    titleSentiment: '<i class="fa-solid fa-face-smile"></i> Sentiment Breakdown',
    titleCategoryRisk: '<i class="fa-solid fa-triangle-exclamation"></i> Category & Risk Matrix',
    titleLeaderboard: '<i class="fa-solid fa-ranking-star"></i> Agent Performance Leaderboard',
    titleAvgScoreCategory: '<i class="fa-solid fa-chart-simple"></i> Average Agent Score by Category',
    
    titleTrafficHour: '<i class="fa-solid fa-clock"></i> Traffic by Hour',
    titleCallsTime: '<i class="fa-solid fa-calendar-day"></i> Calls over Time',
    titleSentimentTrend: '<i class="fa-solid fa-chart-line"></i> Sentiment Trend',
    titleResolutionTrend: '<i class="fa-solid fa-square-poll-vertical"></i> Resolution Rate Trend',
    
    titleExplorer: '<i class="fa-solid fa-list"></i> Call Records Explorer',
    resetBtn: '<i class="fa-solid fa-rotate-left"></i> Reset',
    
    labelSearch: "Search",
    labelSearchAudio: "Search Audio File",
    labelSentiment: "Sentiment",
    labelRisk: "Risk Level",
    labelResolution: "Resolution",
    labelCategory: "Category",
    labelLength: "Call Length",
    
    placeholderSearch: "Search transcripts, audio files, issues, categories...",
    placeholderSearchAudio: "Search by MP3 name...",
    
    optAllSentiments: "All Sentiments",
    optPositive: "Positive",
    optNeutral: "Neutral",
    optNegative: "Negative",
    optAllRisks: "All Risks",
    optLow: "Low",
    optMedium: "Medium",
    optHigh: "High",
    optAllStatuses: "All Statuses",
    optResolved: "Resolved",
    optUnresolved: "Unresolved",
    optAllCategories: "All Categories",
    optAllDurations: "All Durations",
    optShort: "Short (< 30s)",
    optMediumDuration: "Medium (30s - 2m)",
    optLong: "Long (2m - 5m)",
    optExtended: "Extended (> 5m)",
    
    thIdName: "ID & Name",
    thCategory: "Category",
    thSentiment: "Sentiment",
    thRisk: "Risk Level",
    thResolution: "Resolution",
    thScore: "Agent Score",
    thCost: "Cost",
    thCreatedAt: "Created At",
    
    loadingRecords: "Loading call records from Supabase...",
    noRecordsFound: "No matching records found",
    tryAdjusting: "Try adjusting your search query or removing filters.",
    
    // Details Drawer
    detailHeaderTitle: "Call Analytics Detail",
    detailSecPerformance: "Performance Metrics",
    detailSecCost: "Cost & Usage Metrics",
    detailSecSummary: "Executive Summary",
    detailSecKeyPoints: "Key Points Analyzed",
    detailSecAction: "Recommended Next Action",
    detailSecEntities: "Extracted Entities",
    detailSecIntents: "Extracted Intents",
    detailSecTranscript: "Call Transcript",
    
    detailLabelScore: "Agent Score",
    detailLabelCost: "Total Cost (USD)",
    detailLabelAudioDuration: "Audio Duration",
    detailLabelSTTEngine: "Speech-to-Text (STT) Engine",
    detailLabelLLMModel: "OpenAI LLM Model",
    detailLabelAudioFile: "MP3 Audio File",
    detailLabelSTTTime: "STT Processing Time",
    detailLabelLLMUsage: "LLM Token Usage",
    detailLabelBilling: "Billing Status",
    detailCostBreakdown: '<i class="fa-solid fa-calculator"></i> Cost Breakdown (USD)',
    detailLabelSummary: "Call Summary",
    detailLabelIssue: "Customer Issue Identified",
    
    // GCS Drawer
    gcsHeaderTitle: "GCS Call Recordings",
    gcsSecParams: '<i class="fa-solid fa-sliders" style="color: var(--accent-primary);"></i> Processing Parameters',
    gcsLabelMinLen: "Min Length (sec)",
    gcsLabelMaxLen: "Max Length (sec)",
    gcsLabelEngine: "STT Engine Selection",
    gcsOptEngineNova: "Chirp-2 (Nova-2 equivalent - Highly Optimized)",
    gcsOptEngineDefault: "Standard Speech-to-Text (Default model)",
    gcsOptEngineMedical: "Medical Speech-to-Text (Specialized vocabulary)",
    gcsLabelBulk: '<i class="fa-solid fa-list-check" style="color: var(--accent-primary);"></i> Bulk Actions & Selection',
    gcsBtnBulkReset: '<i class="fa-solid fa-rotate-left"></i> Reset Selected Analysis',
    gcsBtnBulkAnalyze: '<i class="fa-solid fa-wand-magic-sparkles"></i> Analyze Selected',
    
    // Ask AI
    aiHeaderTitle: "AI Analytics Chat",
    aiNoKeyWarning: 'Please open <strong>Settings <i class="fa-solid fa-gear"></i></strong> above to save your OpenAI API Key before chatting.',
    aiOpenAIConfigTitle: "OpenAI Connection Config",
    aiLabelKey: "OPENAI API KEY",
    aiLabelModel: "LLM MODEL",
    aiBtnSaveConnect: '<i class="fa-solid fa-floppy-disk"></i> Save & Connect',
    aiSavedStatus: '<i class="fa-solid fa-circle-check"></i> Connection config saved locally!',
    aiPredefinedTitle: '<i class="fa-solid fa-list-check" style="color: var(--accent-secondary);"></i> Predefined Questions',
    aiLabelCustomQ: "Add Custom Question",
    aiLabelShort: "SHORT LABEL (E.G., Summarize issues)",
    aiLabelPrompt: "ACTUAL PROMPT TEXT",
    aiBtnAddQ: '<i class="fa-solid fa-plus"></i> Add Question',
    aiPlaceholderInput: "Ask a question about the calls...",
    
    // General Settings
    settingsHeaderTitle: "General Settings",
    settingsLangTitle: '<i class="fa-solid fa-language" style="color: var(--accent-secondary);"></i> Language Settings',
    settingsLangSub: "Choose the display language for the dashboard frontend interface.",
    settingsLangLabel: "INTERFACE LANGUAGE",
    settingsAgentTitle: '<i class="fa-solid fa-users-gear" style="color: var(--accent-secondary);"></i> Agent Name Mapping',
    settingsAgentSub: "The system extracts the agent identifier from the MP3 filename (e.g. <code>1245</code> from <code>..._1245.mp3</code>). Map these numbers to actual names below.",
    settingsActiveMappings: "Active Mappings",
    settingsAddNewMapping: "Add New Mapping",
    settingsLabelAgentId: "AGENT ID (E.G., 1245)",
    settingsLabelRealName: "REAL NAME",
    settingsBtnAddMap: '<i class="fa-solid fa-plus"></i> Add Mapping',
    settingsBtnSave: '<i class="fa-solid fa-floppy-disk"></i> Save Mappings',
    settingsSavedStatus: '<i class="fa-solid fa-circle-check"></i> Agent mappings saved successfully!'
  },
  es: {
    brandName: "Llamadas i4vision",
    liveConnected: "Conectado a Supabase en Vivo",
    btnExportExcelHeader: '<i class="fa-solid fa-file-excel"></i> Exportar Excel',
    btnOpenAudioSidebar: '<i class="fa-solid fa-folder-open"></i> Grabaciones',
    btnOpenChat: '<i class="fa-solid fa-comments"></i> Preguntar a IA',
    btnOpenSettingsTitle: "Configuración General",
    themeToggleTitle: "Cambiar Tema",
    
    kpiTotalCalls: "Llamadas Totales",
    kpiAvgScore: "Puntaje Promedio",
    kpiResolution: "Tasa de Resolución",
    kpiCost: "Costo Total",
    kpiRealTime: '<i class="fa-solid fa-arrow-trend-up"></i> Sincronización en vivo',
    kpiScale: '<i class="fa-solid fa-star" style="color: var(--color-warning); margin-right: 0.25rem;"></i> Escala 0 a 10',
    kpiResolvedCalls: "Llamadas resueltas",
    kpiAvgCostCall: '<i class="fa-solid fa-coins"></i> Costo prom./llamada',
    
    tabOverview: '<i class="fa-solid fa-chart-pie"></i> Análisis General',
    tabTrends: '<i class="fa-solid fa-chart-line"></i> Tendencias Temporales',
    
    titleSentiment: '<i class="fa-solid fa-face-smile"></i> Distribución de Sentimiento',
    titleCategoryRisk: '<i class="fa-solid fa-triangle-exclamation"></i> Matriz de Categoría y Riesgo',
    titleLeaderboard: '<i class="fa-solid fa-ranking-star"></i> Tabla de Rendimiento de Agentes',
    titleAvgScoreCategory: '<i class="fa-solid fa-chart-simple"></i> Puntaje Promedio de Agente por Categoría',
    
    titleTrafficHour: '<i class="fa-solid fa-clock"></i> Tráfico por Hora',
    titleCallsTime: '<i class="fa-solid fa-calendar-day"></i> Llamadas en el Tiempo',
    titleSentimentTrend: '<i class="fa-solid fa-chart-line"></i> Tendencia de Sentimiento',
    titleResolutionTrend: '<i class="fa-solid fa-square-poll-vertical"></i> Tendencia de Tasa de Resolución',
    
    titleExplorer: '<i class="fa-solid fa-list"></i> Explorador de Registro de Llamadas',
    resetBtn: '<i class="fa-solid fa-rotate-left"></i> Restablecer',
    
    labelSearch: "Buscar",
    labelSearchAudio: "Buscar Archivo de Audio",
    labelSentiment: "Sentimiento",
    labelRisk: "Nivel de Riesgo",
    labelResolution: "Resolución",
    labelCategory: "Categoría",
    labelLength: "Duración de Llamada",
    
    placeholderSearch: "Buscar transcripciones, audios, problemas, categorías...",
    placeholderSearchAudio: "Buscar por nombre de MP3...",
    
    optAllSentiments: "Todos los Sentimientos",
    optPositive: "Positivo",
    optNeutral: "Neutro",
    optNegative: "Negativo",
    optAllRisks: "Todos los Riesgos",
    optLow: "Bajo",
    optMedium: "Medio",
    optHigh: "Alto",
    optAllStatuses: "Todos los Estados",
    optResolved: "Resuelto",
    optUnresolved: "No Resuelto",
    optAllCategories: "Todas las Categorías",
    optAllDurations: "Todas las Duraciones",
    optShort: "Corto (< 30s)",
    optMediumDuration: "Medio (30s - 2m)",
    optLong: "Largo (2m - 5m)",
    optExtended: "Extendido (> 5m)",
    
    thIdName: "ID y Nombre",
    thCategory: "Categoría",
    thSentiment: "Sentimiento",
    thRisk: "Nivel de Riesgo",
    thResolution: "Resolución",
    thScore: "Puntaje Agente",
    thCost: "Costo",
    thCreatedAt: "Creado en",
    
    loadingRecords: "Cargando registros de llamadas desde Supabase...",
    noRecordsFound: "No se encontraron registros coincidentes",
    tryAdjusting: "Intente ajustar su búsqueda o eliminar filtros.",
    
    // Details Drawer
    detailHeaderTitle: "Detalle de Análisis de Llamada",
    detailSecPerformance: "Métricas de Rendimiento",
    detailSecCost: "Métricas de Costo y Uso",
    detailSecSummary: "Resumen Ejecutivo",
    detailSecKeyPoints: "Puntos Clave Analizados",
    detailSecAction: "Siguiente Acción Recomendada",
    detailSecEntities: "Entidades Extraídas",
    detailSecIntents: "Intenciones Extraídas",
    detailSecTranscript: "Transcripción de la Llamada",
    
    detailLabelScore: "Puntaje de Agente",
    detailLabelCost: "Costo Total (USD)",
    detailLabelAudioDuration: "Duración del Audio",
    detailLabelSTTEngine: "Motor de Speech-to-Text (STT)",
    detailLabelLLMModel: "Modelo OpenAI LLM",
    detailLabelAudioFile: "Archivo de Audio MP3",
    detailLabelSTTTime: "Tiempo de Procesamiento STT",
    detailLabelLLMUsage: "Uso de Tokens LLM",
    detailLabelBilling: "Estado de Facturación",
    detailCostBreakdown: '<i class="fa-solid fa-calculator"></i> Desglose de Costos (USD)',
    detailLabelSummary: "Resumen de la Llamada",
    detailLabelIssue: "Problema del Cliente Identificado",
    
    // GCS Drawer
    gcsHeaderTitle: "Grabaciones de Llamadas en GCS",
    gcsSecParams: '<i class="fa-solid fa-sliders" style="color: var(--accent-primary);"></i> Parámetros de Procesamiento',
    gcsLabelMinLen: "Duración Mín. (seg)",
    gcsLabelMaxLen: "Duración Máx. (seg)",
    gcsLabelEngine: "Selección del Motor STT",
    gcsOptEngineNova: "Chirp-2 (equivalente a Nova-2 - Altamente Optimizado)",
    gcsOptEngineDefault: "Speech-to-Text Estándar (Modelo predeterminado)",
    gcsOptEngineMedical: "Speech-to-Text Médico (Vocabulario especializado)",
    gcsLabelBulk: '<i class="fa-solid fa-list-check" style="color: var(--accent-primary);"></i> Acciones por Lote y Selección',
    gcsBtnBulkReset: '<i class="fa-solid fa-rotate-left"></i> Restablecer Análisis Seleccionados',
    gcsBtnBulkAnalyze: '<i class="fa-solid fa-wand-magic-sparkles"></i> Analizar Seleccionados',
    
    // Ask AI
    aiHeaderTitle: "Chat de Análisis con IA",
    aiNoKeyWarning: 'Por favor abra la **Configuración <i class="fa-solid fa-gear"></i>** arriba para guardar su API Key de OpenAI antes de chatear.',
    aiOpenAIConfigTitle: "Configuración de Conexión OpenAI",
    aiLabelKey: "API KEY DE OPENAI",
    aiLabelModel: "MODELO LLM",
    aiBtnSaveConnect: '<i class="fa-solid fa-floppy-disk"></i> Guardar y Conectar',
    aiSavedStatus: '<i class="fa-solid fa-circle-check"></i> ¡Configuración de conexión guardada localmente!',
    aiPredefinedTitle: '<i class="fa-solid fa-list-check" style="color: var(--accent-secondary);"></i> Preguntas Predeterminadas',
    aiLabelCustomQ: "Agregar Pregunta Personalizada",
    aiLabelShort: "ETIQUETA CORTA (EJ., Resumir problemas)",
    aiLabelPrompt: "TEXTO DE PREGUNTA ACTUAL",
    aiBtnAddQ: '<i class="fa-solid fa-plus"></i> Agregar Pregunta',
    aiPlaceholderInput: "Haga una pregunta sobre las llamadas...",
    
    // General Settings
    settingsHeaderTitle: "Configuración General",
    settingsLangTitle: '<i class="fa-solid fa-language" style="color: var(--accent-secondary);"></i> Configuración de Idioma',
    settingsLangSub: "Seleccione el idioma de visualización de la interfaz del panel.",
    settingsLangLabel: "IDIOMA DE LA INTERFAZ",
    settingsAgentTitle: '<i class="fa-solid fa-users-gear" style="color: var(--accent-secondary);"></i> Mapeo de Nombres de Agentes',
    settingsAgentSub: "El sistema extrae el identificador del agente del archivo MP3 (ej., <code>1245</code> de <code>..._1245.mp3</code>). Mapee estos números a nombres reales a continuación.",
    settingsActiveMappings: "Mapeos Activos",
    settingsAddNewMapping: "Agregar Nuevo Mapeo",
    settingsLabelAgentId: "ID DE AGENTE (EJ., 1245)",
    settingsLabelRealName: "NOMBRE REAL",
    settingsBtnAddMap: '<i class="fa-solid fa-plus"></i> Agregar Mapeo',
    settingsBtnSave: '<i class="fa-solid fa-floppy-disk"></i> Guardar Mapeos',
    settingsSavedStatus: '<i class="fa-solid fa-circle-check"></i> ¡Mapeos de agentes guardados exitosamente!'
  }
};

function updateUILanguage() {
  const lang = state.lang || localStorage.getItem("gcs_lang") || "en";
  state.lang = lang;
  
  // Set lang attribute on html tag
  document.documentElement.setAttribute("lang", lang);
  
  const dict = TRANSLATIONS[lang] || TRANSLATIONS.en;
  
  // 1. Header elements
  const elBrand = document.querySelector(".brand-name");
  if (elBrand) elBrand.textContent = dict.brandName;
  
  const elSync = document.querySelector(".sync-status span");
  if (elSync) elSync.textContent = dict.liveConnected;
  
  const btnExport = document.getElementById("btnExportExcelHeader");
  if (btnExport) btnExport.innerHTML = dict.btnExportExcelHeader;
  
  const btnOpenAudio = document.getElementById("btnOpenAudioSidebar");
  if (btnOpenAudio) btnOpenAudio.innerHTML = dict.btnOpenAudioSidebar;
  
  const btnOpenChat = document.getElementById("btnOpenChat");
  if (btnOpenChat) btnOpenChat.innerHTML = dict.btnOpenChat;
  
  const btnOpenSettings = document.getElementById("btnOpenSettings");
  if (btnOpenSettings) btnOpenSettings.setAttribute("title", dict.btnOpenSettingsTitle);
  
  const themeToggle = document.getElementById("themeToggle");
  if (themeToggle) themeToggle.setAttribute("title", dict.themeToggleTitle);
  
  // 2. KPI Titles
  const kpiTitles = document.querySelectorAll(".kpi-title");
  if (kpiTitles.length >= 4) {
    kpiTitles[0].textContent = dict.kpiTotalCalls;
    kpiTitles[1].textContent = dict.kpiAvgScore;
    kpiTitles[2].textContent = dict.kpiResolution;
    kpiTitles[3].textContent = dict.kpiCost;
  }
  
  // KPI Subtexts
  const kpiChanges = document.querySelectorAll(".kpi-change");
  if (kpiChanges.length >= 4) {
    kpiChanges[0].innerHTML = dict.kpiRealTime;
    kpiChanges[1].innerHTML = dict.kpiScale;
    kpiChanges[2].textContent = dict.kpiResolvedCalls;
    kpiChanges[3].innerHTML = dict.kpiAvgCostCall;
  }
  
  // 3. Tab Buttons
  const tabBtns = document.querySelectorAll(".tab-btn");
  tabBtns.forEach(btn => {
    const target = btn.getAttribute("data-target");
    if (target === "overviewCharts") btn.innerHTML = dict.tabOverview;
    if (target === "trendCharts") btn.innerHTML = dict.tabTrends;
  });
  
  // 4. Chart Headers (need to be careful to select correctly)
  const chartCards = document.querySelectorAll(".chart-card");
  chartCards.forEach(card => {
    const titleEl = card.querySelector(".chart-title");
    if (!titleEl) return;
    
    // We can check what icon/canvas is inside the card
    const canvas = card.querySelector("canvas");
    if (!canvas) return;
    const canvasId = canvas.id;
    
    if (canvasId === "chartSentiment") titleEl.innerHTML = dict.titleSentiment;
    if (canvasId === "chartCategoryRisk") titleEl.innerHTML = dict.titleCategoryRisk;
    if (canvasId === "chartAgentScore") titleEl.innerHTML = dict.titleLeaderboard;
    if (canvasId === "chartSilencePerformance") titleEl.innerHTML = dict.titleAvgScoreCategory;
    
    if (canvasId === "chartCallsByHour") titleEl.innerHTML = dict.titleTrafficHour;
    if (canvasId === "chartCallsByDay") titleEl.innerHTML = dict.titleCallsTime;
    if (canvasId === "chartSentimentTrend") titleEl.innerHTML = dict.titleSentimentTrend;
    if (canvasId === "chartResolutionTrend") titleEl.innerHTML = dict.titleResolutionTrend;
    if (canvasId === "chartSilenceTrend") titleEl.innerHTML = dict.titleSilenceTrend;
  });
  
  // Explorer card
  const explorerCard = document.querySelector(".explorer-card");
  if (explorerCard) {
    const titleEl = explorerCard.querySelector(".chart-title");
    if (titleEl) titleEl.innerHTML = dict.titleExplorer;
  }
  
  const resetBtn = document.getElementById("resetFilters");
  if (resetBtn) resetBtn.innerHTML = dict.resetBtn;
  
  const btnExportTable = document.getElementById("btnExportExcel");
  if (btnExportTable) btnExportTable.innerHTML = `<i class="fa-solid fa-file-excel"></i> ` + (lang === "es" ? "Exportar Excel" : "Export Excel");
  
  // Filter labels
  const filterGroups = document.querySelectorAll(".filter-strip .filter-group");
  filterGroups.forEach(fg => {
    const label = fg.querySelector(".filter-label");
    if (!label) return;
    
    const control = fg.querySelector(".filter-control");
    if (!control) return;
    
    const id = control.id;
    if (id === "searchBar") {
      label.textContent = dict.labelSearch;
      control.setAttribute("placeholder", dict.placeholderSearch);
    }
    if (id === "searchAudio") {
      label.textContent = dict.labelSearchAudio;
      control.setAttribute("placeholder", dict.placeholderSearchAudio);
    }
    if (id === "filterSentiment") {
      label.textContent = dict.labelSentiment;
      fg.querySelectorAll("option").forEach(opt => {
        if (opt.value === "all") opt.textContent = dict.optAllSentiments;
        if (opt.value === "positive") opt.textContent = dict.optPositive;
        if (opt.value === "neutral") opt.textContent = dict.optNeutral;
        if (opt.value === "negative") opt.textContent = dict.optNegative;
      });
    }
    if (id === "filterRisk") {
      label.textContent = dict.labelRisk;
      fg.querySelectorAll("option").forEach(opt => {
        if (opt.value === "all") opt.textContent = dict.optAllRisks;
        if (opt.value === "low") opt.textContent = dict.optLow;
        if (opt.value === "medium") opt.textContent = dict.optMedium;
        if (opt.value === "high") opt.textContent = dict.optHigh;
      });
    }
    if (id === "filterResolution") {
      label.textContent = dict.labelResolution;
      fg.querySelectorAll("option").forEach(opt => {
        if (opt.value === "all") opt.textContent = dict.optAllStatuses;
        if (opt.value === "resolved") opt.textContent = dict.optResolved;
        if (opt.value === "unresolved") opt.textContent = dict.optUnresolved;
      });
    }
    if (id === "filterCategory") {
      label.textContent = dict.labelCategory;
      const firstOpt = control.querySelector("option[value='all']");
      if (firstOpt) firstOpt.textContent = dict.optAllCategories;
    }
    if (id === "filterDuration") {
      label.textContent = dict.labelLength;
      fg.querySelectorAll("option").forEach(opt => {
        if (opt.value === "all") opt.textContent = dict.optAllDurations;
        if (opt.value === "0-30") opt.textContent = dict.optShort;
        if (opt.value === "30-120") opt.textContent = dict.optMediumDuration;
        if (opt.value === "120-300") opt.textContent = dict.optLong;
        if (opt.value === "300-999999") opt.textContent = dict.optExtended;
      });
    }
  });
  
  // Table headers
  const tableHeaders = document.querySelectorAll(".call-table th");
  if (tableHeaders.length >= 8) {
    tableHeaders[0].textContent = dict.thIdName;
    tableHeaders[1].textContent = dict.thCategory;
    tableHeaders[2].textContent = dict.thSentiment;
    tableHeaders[3].textContent = dict.thRisk;
    tableHeaders[4].textContent = dict.thResolution;
    tableHeaders[5].textContent = dict.thScore;
    tableHeaders[6].textContent = dict.thCost;
    tableHeaders[7].textContent = dict.thCreatedAt;
  }
  
  // Loader & empty states
  const tableLoaderMsg = document.querySelector("#tableLoader span");
  if (tableLoaderMsg) tableLoaderMsg.textContent = dict.loadingRecords;
  
  const emptyStateTitle = document.querySelector("#tableEmptyState h3");
  if (emptyStateTitle) emptyStateTitle.textContent = dict.noRecordsFound;
  
  const emptyStateText = document.querySelector("#tableEmptyState p");
  if (emptyStateText) emptyStateText.textContent = dict.tryAdjusting;
  
  // 5. Details Drawer
  const detailTitle = document.querySelector("#callDrawer .drawer-title");
  if (detailTitle) detailTitle.textContent = dict.detailHeaderTitle;
  
  const detailSecTitles = document.querySelectorAll("#callDrawer .drawer-section-title");
  detailSecTitles.forEach(title => {
    const txt = title.textContent.trim().toLowerCase();
    if (txt.includes("performance") || txt.includes("rendimiento")) title.textContent = dict.detailSecPerformance;
    else if (txt.includes("cost") || txt.includes("costo")) title.textContent = dict.detailSecCost;
    else if (txt.includes("summary") || txt.includes("resumen")) title.textContent = dict.detailSecSummary;
    else if (txt.includes("points") || txt.includes("puntos")) title.textContent = dict.detailSecKeyPoints;
    else if (txt.includes("action") || txt.includes("acción")) title.textContent = dict.detailSecAction;
    else if (txt.includes("entities") || txt.includes("entidades")) title.textContent = dict.detailSecEntities;
    else if (txt.includes("intents") || txt.includes("intenciones")) title.textContent = dict.detailSecIntents;
    else if (txt.includes("transcript") || txt.includes("transcripción")) title.textContent = dict.detailSecTranscript;
  });
  
  const detailLabels = document.querySelectorAll("#callDrawer .details-item-label");
  detailLabels.forEach(lbl => {
    const text = lbl.textContent.trim();
    if (text.startsWith("Agent Score") || text.startsWith("Puntaje de Agente")) lbl.textContent = dict.detailLabelScore;
    if (text.startsWith("Silence Ratio") || text.startsWith("Proporción de Silencio")) lbl.textContent = dict.detailLabelSilence;
    if (text.startsWith("Total Cost") || text.startsWith("Costo Total")) lbl.textContent = dict.detailLabelCost;
    if (text.startsWith("Audio Duration") || text.startsWith("Duración del Audio")) lbl.textContent = dict.detailLabelAudioDuration;
    if (text.startsWith("Speech-to-Text") || text.startsWith("Motor de Speech-to-Text")) lbl.textContent = dict.detailLabelSTTEngine;
    if (text.startsWith("OpenAI LLM") || text.startsWith("Modelo OpenAI LLM")) lbl.textContent = dict.detailLabelLLMModel;
    if (text.startsWith("MP3 Audio") || text.startsWith("Archivo de Audio")) lbl.textContent = dict.detailLabelAudioFile;
    if (text.startsWith("STT Processing") || text.startsWith("Tiempo de Procesamiento")) lbl.textContent = dict.detailLabelSTTTime;
    if (text.startsWith("LLM Token") || text.startsWith("Uso de Tokens")) lbl.textContent = dict.detailLabelLLMUsage;
    if (text.startsWith("Billing Status") || text.startsWith("Estado de Facturación")) lbl.textContent = dict.detailLabelBilling;
  });
  
  const costBreakdownTitle = document.querySelector(".cost-breakdown-title");
  if (costBreakdownTitle) costBreakdownTitle.innerHTML = dict.detailCostBreakdown;
  
  const costRows = document.querySelectorAll(".cost-breakdown-row span:first-child");
  costRows.forEach(span => {
    const text = span.textContent.trim();
    if (text.startsWith("CX Insights") || text.startsWith("CX Insights")) span.textContent = (lang === "es" ? "Análisis de CX Insights:" : "CX Insights Analysis:");
    if (text.startsWith("Storage Cost") || text.startsWith("Costo de Almacenamiento")) span.textContent = (lang === "es" ? "Costo de Almacenamiento:" : "Storage Cost:");
    if (text.startsWith("Speech-to-Text") || text.startsWith("Speech-to-Text")) span.textContent = "Speech-to-Text (STT):";
    if (text.startsWith("OpenAI API") || text.startsWith("OpenAI API")) span.textContent = "OpenAI API (LLM):";
  });
  
  const costTotalLabel = document.querySelector(".cost-breakdown-total span:first-child");
  if (costTotalLabel) costTotalLabel.textContent = (lang === "es" ? "Costo Total de Procesamiento:" : "Total Processing Cost:");
  
  const summaryLabel = document.querySelector("#callDrawer .drawer-section:nth-of-type(3) .details-item:first-child .details-item-label");
  if (summaryLabel) summaryLabel.textContent = dict.detailLabelSummary;
  const issueLabel = document.querySelector("#callDrawer .drawer-section:nth-of-type(3) .details-item:last-child .details-item-label");
  if (issueLabel) issueLabel.textContent = dict.detailLabelIssue;
  
  // 6. GCS Drawer
  const gcsTitle = document.querySelector("#audioSidebar .drawer-title");
  if (gcsTitle) gcsTitle.textContent = dict.gcsHeaderTitle;
  
  const gcsParamsTitle = document.getElementById("gcsParametersCard");
  if (gcsParamsTitle) {
    const tEl = gcsParamsTitle.querySelector("div");
    if (tEl) tEl.innerHTML = dict.gcsSecParams;
  }
  
  const gcsInputs = document.querySelectorAll("#audioSidebar .gcs-input-label");
  gcsInputs.forEach(lbl => {
    const text = lbl.textContent.trim();
    if (text.startsWith("Min Length") || text.startsWith("Duración Mín")) lbl.textContent = dict.gcsLabelMinLen;
    if (text.startsWith("Max Length") || text.startsWith("Duración Máx")) lbl.textContent = dict.gcsLabelMaxLen;
    if (text.startsWith("STT Engine") || text.startsWith("Selección del Motor")) lbl.textContent = dict.gcsLabelEngine;
  });
  
  const engineSelect = document.getElementById("paramSTTEngine");
  if (engineSelect) {
    engineSelect.querySelectorAll("option").forEach(opt => {
      if (opt.value === "nova-2") opt.textContent = dict.gcsOptEngineNova;
      if (opt.value === "default") opt.textContent = dict.gcsOptEngineDefault;
      if (opt.value === "medical") opt.textContent = dict.gcsOptEngineMedical;
    });
  }
  
  const bulkActionsTitle = document.querySelector("#gcsExplorer > div:nth-child(2) div:first-child");
  if (bulkActionsTitle) bulkActionsTitle.innerHTML = dict.gcsLabelBulk;
  
  const bulkResetBtn = document.getElementById("btnBulkResetRecordings");
  if (bulkResetBtn) bulkResetBtn.innerHTML = dict.gcsBtnBulkReset;
  
  const bulkAnalyzeBtn = document.getElementById("btnBulkCallAnalysis");
  if (bulkAnalyzeBtn) bulkAnalyzeBtn.innerHTML = dict.gcsBtnBulkAnalyze;
  
  // 7. Ask AI Drawer
  const aiTitle = document.querySelector("#chatDrawer .drawer-title");
  if (aiTitle) aiTitle.textContent = dict.aiHeaderTitle;
  
  const aiConfigTitle = document.querySelector("#chatConfigSection div:first-child");
  if (aiConfigTitle) aiConfigTitle.textContent = dict.aiOpenAIConfigTitle;
  
  const aiLabels = document.querySelectorAll("#chatConfigSection label");
  if (aiLabels.length >= 4) {
    aiLabels[0].textContent = dict.aiLabelKey;
    aiLabels[1].textContent = dict.aiLabelModel;
    aiLabels[2].textContent = dict.aiLabelShort;
    aiLabels[3].textContent = dict.aiLabelPrompt;
  }
  
  const saveChatConfigBtn = document.getElementById("btnSaveChatConfig");
  if (saveChatConfigBtn) saveChatConfigBtn.innerHTML = dict.aiBtnSaveConnect;
  
  const chatConfigSaveStatus = document.getElementById("chatConfigSaveStatus");
  if (chatConfigSaveStatus) chatConfigSaveStatus.innerHTML = dict.aiSavedStatus;
  
  const predefinedTitle = document.querySelector("#chatConfigSection div[style*='dashed'] div:first-child");
  if (predefinedTitle) predefinedTitle.innerHTML = dict.aiPredefinedTitle;
  
  const addQuestionTitle = document.querySelector("#chatConfigSection div[style*='dashed'] div[style*='dashed'] div:first-child");
  if (addQuestionTitle) addQuestionTitle.textContent = dict.aiLabelCustomQ;
  
  const addQuestionBtn = document.getElementById("btnChatAddQuestion");
  if (addQuestionBtn) addQuestionBtn.innerHTML = dict.aiBtnAddQ;
  
  const chatInput = document.getElementById("chatInput");
  if (chatInput) chatInput.setAttribute("placeholder", dict.aiPlaceholderInput);
  
  // 8. General Settings Drawer
  const settingsTitle = document.querySelector("#settingsDrawer .drawer-title");
  if (settingsTitle) settingsTitle.textContent = dict.settingsHeaderTitle;
  
  const settingsLangTitleEl = document.getElementById("settingsLangCardTitle");
  if (settingsLangTitleEl) settingsLangTitleEl.innerHTML = dict.settingsLangTitle;
  
  const settingsLangSubEl = document.getElementById("settingsLangCardSub");
  if (settingsLangSubEl) settingsLangSubEl.textContent = dict.settingsLangSub;
  
  const settingsLangLabelEl = document.getElementById("settingsLangCardLabel");
  if (settingsLangLabelEl) settingsLangLabelEl.textContent = dict.settingsLangLabel;
  
  const settingsAgentTitleEl = document.querySelector("#settingsDrawer .settings-card:last-child h3");
  if (settingsAgentTitleEl) settingsAgentTitleEl.innerHTML = dict.settingsAgentTitle;
  
  const settingsAgentSubEl = document.querySelector("#settingsDrawer .settings-card:last-child p");
  if (settingsAgentSubEl) settingsAgentSubEl.innerHTML = dict.settingsAgentSub;
  
  const settingsActiveMappingsEl = document.querySelector("#settingsDrawer .settings-card:last-child div div");
  if (settingsActiveMappingsEl) settingsActiveMappingsEl.textContent = dict.settingsActiveMappings;
  
  const settingsAddNewMappingEl = document.querySelector("#settingsDrawer .settings-card:last-child div[style*='dashed'] div");
  if (settingsAddNewMappingEl) settingsAddNewMappingEl.textContent = dict.settingsAddNewMapping;
  
  const settingsLabels = document.querySelectorAll("#settingsDrawer .settings-card:last-child label");
  if (settingsLabels.length >= 2) {
    settingsLabels[0].textContent = dict.settingsLabelAgentId;
    settingsLabels[1].textContent = dict.settingsLabelRealName;
  }
  
  const addAgentMapBtn = document.getElementById("btnAddAgentMapping");
  if (addAgentMapBtn) addAgentMapBtn.innerHTML = dict.settingsBtnAddMap;
  
  const saveGeneralSettingsBtn = document.getElementById("btnSaveGeneralSettings");
  if (saveGeneralSettingsBtn) saveGeneralSettingsBtn.innerHTML = dict.settingsBtnSave;
  
  const saveGeneralSettingsStatus = document.getElementById("generalSettingsSaveStatus");
  if (saveGeneralSettingsStatus) saveGeneralSettingsStatus.innerHTML = dict.settingsSavedStatus;

  // Refresh Call Details Drawer if it's currently open
  if (state.activeCall) {
    openDrawer(state.activeCall);
  }
}

// Redundant state declaration removed

let analysisPollingInterval = null;

// Initialize Application
document.addEventListener("DOMContentLoaded", async () => {
  // Load local mappings as early as possible on page startup
  const localMappings = localStorage.getItem("gcs_agent_mappings");
  if (localMappings) {
    try {
      state.agentMappings = JSON.parse(localMappings);
    } catch (e) {
      state.agentMappings = {};
    }
  } else {
    state.agentMappings = {};
  }

  // Load local predefined questions as early as possible
  const localPredefined = localStorage.getItem("gcs_predefined_questions");
  if (localPredefined) {
    try {
      state.predefinedQuestions = JSON.parse(localPredefined);
    } catch (e) {
      state.predefinedQuestions = getDefaultPredefinedQuestions();
    }
  } else {
    state.predefinedQuestions = getDefaultPredefinedQuestions();
  }

  // Load local language selection and update UI language
  state.lang = localStorage.getItem("gcs_lang") || "en";
  updateUILanguage();

  initTheme();
  setupTabNavigation();
  setupEventListeners();
  checkGoogleAuth();
  setupGCSEventListeners();
  fetchCallData();
  await syncGCSSettingsWithSupabase();
  renderGCSAuth();
});

// ==========================================================================
// Theme Management
// ==========================================================================
function initTheme() {
  const savedTheme = localStorage.getItem("theme") || "dark";
  state.activeTheme = savedTheme;
  document.documentElement.setAttribute("data-theme", savedTheme);
  updateThemeToggleIcon();
}

function toggleTheme() {
  state.activeTheme = state.activeTheme === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", state.activeTheme);
  localStorage.setItem("theme", state.activeTheme);
  updateThemeToggleIcon();
  
  // Re-render charts to adjust text/border colors based on theme
  if (state.allCalls.length > 0) {
    const isTrendsActive = document.querySelector(".tab-btn[data-target='trendCharts']").classList.contains("active");
    if (isTrendsActive) {
      renderTrendCharts();
    } else {
      renderOverviewCharts();
    }
  }
}

function updateThemeToggleIcon() {
  const toggleBtn = document.getElementById("themeToggle");
  if (toggleBtn) {
    toggleBtn.innerHTML = state.activeTheme === "dark" 
      ? '<i class="fa-solid fa-sun"></i>' 
      : '<i class="fa-solid fa-moon"></i>';
  }
}

// ==========================================================================
// Event Listeners Setup
// ==========================================================================
function setupEventListeners() {
  // Theme toggle
  document.getElementById("themeToggle").addEventListener("click", toggleTheme);

  // Filters
  document.getElementById("searchBar").addEventListener("input", debounce(applyFilters, 250));
  document.getElementById("searchAudio").addEventListener("input", debounce(applyFilters, 250));
  document.getElementById("filterSentiment").addEventListener("change", applyFilters);
  document.getElementById("filterRisk").addEventListener("change", applyFilters);
  document.getElementById("filterResolution").addEventListener("change", applyFilters);
  document.getElementById("filterCategory").addEventListener("change", applyFilters);
  document.getElementById("filterDuration").addEventListener("change", applyFilters);
  
  // Reset filters
  document.getElementById("resetFilters").addEventListener("click", resetFilters);

  // Drawer Close
  document.getElementById("drawerClose").addEventListener("click", closeDrawer);
  document.getElementById("drawerBackdrop").addEventListener("click", closeDrawer);
  
  // Press Escape to close drawer
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeDrawer();
      closeChatDrawer();
      closeChatTableModal();
    }
  });

  // Export Excel listeners
  const btnExportExcel = document.getElementById("btnExportExcel");
  if (btnExportExcel) {
    btnExportExcel.addEventListener("click", exportCallDataToExcel);
  }
  const btnExportExcelHeader = document.getElementById("btnExportExcelHeader");
  if (btnExportExcelHeader) {
    btnExportExcelHeader.addEventListener("click", exportCallDataToExcel);
  }

  // Setup Chat Drawer triggers and keys
  setupChatDrawer();

  // Setup General Settings Drawer triggers and keys
  setupSettingsDrawer();
}

// Helper: Debounce search input
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// ==========================================================================
// Data Fetching
// ==========================================================================
async function fetchCallData() {
  showTableLoading(true);
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/call_analytics_results?select=*`, {
      method: "GET",
      headers: {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`
      }
    });

    if (!response.ok) {
      throw new Error(`Supabase API responded with status ${response.status}`);
    }

    const data = await response.json();
    state.allCalls = data;
    state.canonicalAgents = null; // Reset cache to force recalculation of canonical agent names
    state.filteredCalls = [...data];
    
    // Extract unique parent categories
    state.categories = [...new Set(data.map(item => getParentCategory(item.category)))].sort();
    
    populateCategoryDropdown();
    updateDashboardUI();
    if (state.gcsFiles && state.gcsFiles.length > 0) {
      filterGCSFiles();
    }
    
  } catch (error) {
    console.error("Error fetching call analytics data:", error);
    showTableError(error.message);
  } finally {
    showTableLoading(false);
  }
}

function showTableLoading(isLoading) {
  const loader = document.getElementById("tableLoader");
  const tbody = document.getElementById("callTableBody");
  
  if (isLoading) {
    loader.style.display = "flex";
    tbody.style.display = "none";
  } else {
    loader.style.display = "none";
    tbody.style.display = "table-row-group";
  }
}

function showTableError(message) {
  const tbody = document.getElementById("callTableBody");
  tbody.innerHTML = `
    <tr>
      <td colspan="7" style="text-align: center; color: var(--color-negative); padding: 2rem; font-weight: 500;">
        <i class="fa-solid fa-circle-exclamation" style="margin-right: 0.5rem;"></i>
        Failed to fetch data: ${message}. Please check your connection and configuration.
      </td>
    </tr>
  `;
}

// Populate Category Dropdown Dynamically
function populateCategoryDropdown() {
  const select = document.getElementById("filterCategory");
  const lang = state.lang || localStorage.getItem("gcs_lang") || "en";
  select.innerHTML = `<option value="all">${lang === 'es' ? 'Todas las Categorías' : 'All Categories'}</option>`;
  
  state.categories.forEach(cat => {
    const opt = document.createElement("option");
    opt.value = cat;
    opt.textContent = getLocalizedCategory(cat);
    select.appendChild(opt);
  });
}

// ==========================================================================
// Filtering Engine
// ==========================================================================
function applyFilters() {
  const searchQuery = document.getElementById("searchBar").value.toLowerCase().trim();
  const audioSearchQuery = document.getElementById("searchAudio").value.toLowerCase().trim();
  const sentimentFilter = document.getElementById("filterSentiment").value;
  const riskFilter = document.getElementById("filterRisk").value;
  const resolutionFilter = document.getElementById("filterResolution").value;
  const categoryFilter = document.getElementById("filterCategory").value;
  const durationFilter = document.getElementById("filterDuration").value;

  state.filteredCalls = state.allCalls.filter(call => {
    // Search Filter (Generic query)
    const searchMatch = !searchQuery || 
      (call.conversation_name && call.conversation_name.toLowerCase().includes(searchQuery)) ||
      (call.audio_file_name && call.audio_file_name.toLowerCase().includes(searchQuery)) ||
      (call.customer_issue && call.customer_issue.toLowerCase().includes(searchQuery)) ||
      (call.summary && call.summary.toLowerCase().includes(searchQuery)) ||
      (call.transcript && call.transcript.toLowerCase().includes(searchQuery)) ||
      (call.category && call.category.toLowerCase().includes(searchQuery)) ||
      (call.entities && call.entities.toLowerCase().includes(searchQuery)) ||
      (call.next_action && call.next_action.toLowerCase().includes(searchQuery));

    // Audio File Name Search Filter
    const audioSearchMatch = !audioSearchQuery ||
      (call.audio_file_name && call.audio_file_name.toLowerCase().includes(audioSearchQuery));

    // Sentiment Filter
    const sentimentMatch = sentimentFilter === "all" || getNormalizedSentiment(call.sentiment) === sentimentFilter;

    // Risk Filter
    const riskMatch = riskFilter === "all" || getNormalizedRisk(call.risk_level) === riskFilter;

    // Resolution Filter
    const resolutionMatch = resolutionFilter === "all" || getNormalizedResolution(call.resolution_status) === resolutionFilter;

    // Category Filter
    const categoryMatch = categoryFilter === "all" || getParentCategory(call.category) === categoryFilter;

    // Duration Filter
    let durationMatch = true;
    if (durationFilter !== "all") {
      const durationSec = Number(call.audio_duration_seconds);
      if (isNaN(durationSec)) {
        durationMatch = false;
      } else {
        const [min, max] = durationFilter.split("-").map(Number);
        durationMatch = durationSec >= min && durationSec < max;
      }
    }

    // Score threshold filter (agents with average performance score <= threshold)
    let scoreMatch = true;
    if (state.scoreThresholdFilter !== null && state.scoreThresholdFilter !== undefined) {
      const agent = getAgentName(call);
      const avgScore = getAgentAverageScore(agent);
      scoreMatch = avgScore <= state.scoreThresholdFilter;
    }

    return searchMatch && audioSearchMatch && sentimentMatch && riskMatch && resolutionMatch && categoryMatch && durationMatch && scoreMatch;
  });

  renderActiveFilterBadges();
  updateDashboardUI();
}

function getAgentAverageScore(agentName) {
  if (!state.allCalls) return 0;
  const agentCalls = state.allCalls.filter(c => getAgentName(c) === agentName);
  const scores = agentCalls.map(c => Number(c.agent_score)).filter(s => !isNaN(s));
  if (scores.length === 0) return 0;
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

function renderActiveFilterBadges() {
  const container = document.getElementById("activeFilterBadges");
  if (!container) return;
  container.innerHTML = "";

  if (state.scoreThresholdFilter !== null && state.scoreThresholdFilter !== undefined) {
    const badge = document.createElement("span");
    badge.className = "badge";
    badge.style.cssText = "background: rgba(244, 63, 94, 0.12); color: #f43f5e; border-color: rgba(244, 63, 94, 0.25); display: inline-flex; align-items: center; gap: 0.5rem; font-weight: 500; font-size: 0.75rem; padding: 0.25rem 0.50rem; border-radius: var(--radius-sm); cursor: pointer; border: 1px solid;";
    
    const lang = state.lang || localStorage.getItem("gcs_lang") || "en";
    const label = lang === "es" 
      ? `Promedio Agente <= ${state.scoreThresholdFilter}`
      : `Agent Avg Score <= ${state.scoreThresholdFilter}`;
      
    badge.innerHTML = `${label} <i class="fa-solid fa-xmark" style="font-size: 0.85rem; margin-left: 0.25rem;"></i>`;
    badge.addEventListener("click", () => {
      state.scoreThresholdFilter = null;
      applyFilters();
    });
    container.appendChild(badge);
  }
}

function resetFilters() {
  document.getElementById("searchBar").value = "";
  document.getElementById("searchAudio").value = "";
  document.getElementById("filterSentiment").value = "all";
  document.getElementById("filterRisk").value = "all";
  document.getElementById("filterResolution").value = "all";
  document.getElementById("filterCategory").value = "all";
  document.getElementById("filterDuration").value = "all";
  state.scoreThresholdFilter = null;
  
  state.filteredCalls = [...state.allCalls];
  renderActiveFilterBadges();
  updateDashboardUI();
}

// ==========================================================================
// UI Rendering & Analytics Updates
// ==========================================================================
function updateDashboardUI() {
  updateKPIs();
  
  const isTrendsActive = document.querySelector(".tab-btn[data-target='trendCharts']").classList.contains("active");
  if (isTrendsActive) {
    renderTrendCharts();
  } else {
    renderOverviewCharts();
  }
  
  renderTable();
}

function updateKPIs() {
  const count = state.filteredCalls.length;
  document.getElementById("kpiTotalCalls").textContent = count;

  if (count === 0) {
    document.getElementById("kpiAvgScore").textContent = "N/A";
    document.getElementById("kpiResolutionRate").textContent = "N/A";
    document.getElementById("kpiTotalCost").textContent = "N/A";
    return;
  }

  // 1. Average Agent Score (Scale 0-10)
  const validScores = state.filteredCalls.map(c => Number(c.agent_score)).filter(s => !isNaN(s));
  const avgScore = validScores.reduce((acc, curr) => acc + curr, 0) / validScores.length;
  document.getElementById("kpiAvgScore").textContent = avgScore.toFixed(1);

  // 2. Resolution Rate
  const lang = state.lang || localStorage.getItem("gcs_lang") || "en";
  const resolvedCount = state.filteredCalls.filter(c => getNormalizedResolution(c.resolution_status) === "resolved").length;
  const resolutionRate = (resolvedCount / count) * 100;
  document.getElementById("kpiResolutionRate").textContent = `${resolutionRate.toFixed(1)}%`;
  
  const subtextStr = lang === "es" 
    ? `<i class="fa-solid fa-check"></i> ${resolvedCount} de ${count} resueltas`
    : `<i class="fa-solid fa-check"></i> ${resolvedCount} of ${count} resolved`;
  document.getElementById("kpiResolutionSubtext").innerHTML = subtextStr;

  // 4. Total and Average Processing Cost
  const validCosts = state.filteredCalls.map(c => Number(c.total_cost_usd)).filter(p => !isNaN(p));
  const totalCostVal = validCosts.reduce((acc, curr) => acc + curr, 0);
  const avgCostVal = validCosts.length > 0 ? (totalCostVal / validCosts.length) : 0;

  document.getElementById("kpiTotalCost").textContent = `$${totalCostVal.toFixed(3)}`;
  document.getElementById("kpiAvgCostSubtext").innerHTML = `<i class="fa-solid fa-coins"></i> Avg: $${avgCostVal.toFixed(4)}/call`;
}

// Helper: Get Theme CSS Variable
function getThemeColor(variableName) {
  return getComputedStyle(document.documentElement).getPropertyValue(variableName).trim();
}

function renderOverviewCharts() {
  const data = state.filteredCalls;

  // Chart Text/Grid Colors based on active theme
  const textColor = getThemeColor('--text-primary') || '#f3f4f6';
  const mutedColor = getThemeColor('--text-muted') || '#6b7280';
  const gridColor = getThemeColor('--border-color') || 'rgba(255, 255, 255, 0.08)';

  // ---------------------------------------------------------
  // 1. Sentiment Breakdown Chart (Doughnut)
  // ---------------------------------------------------------
  const sentimentCounts = { positive: 0, neutral: 0, negative: 0, mixed: 0 };
  data.forEach(c => {
    const sNorm = getNormalizedSentiment(c.sentiment);
    if (sentimentCounts[sNorm] !== undefined) {
      sentimentCounts[sNorm]++;
    }
  });

  const lang = state.lang || localStorage.getItem("gcs_lang") || "en";
  const labelPositive = lang === "es" ? "Positivo" : "Positive";
  const labelNeutral = lang === "es" ? "Neutral" : "Neutral";
  const labelNegative = lang === "es" ? "Negativo" : "Negative";
  const labelMixed = lang === "es" ? "Mixto" : "Mixed";

  if (state.charts.sentiment) state.charts.sentiment.destroy();
  state.charts.sentiment = new Chart(document.getElementById("chartSentiment").getContext("2d"), {
    type: "doughnut",
    data: {
      labels: [labelPositive, labelNeutral, labelNegative, labelMixed],
      datasets: [{
        data: [sentimentCounts.positive, sentimentCounts.neutral, sentimentCounts.negative, sentimentCounts.mixed],
        backgroundColor: ["#10b981", "#6b7280", "#f43f5e", "#f59e0b"],
        borderWidth: 2,
        borderColor: getThemeColor('--bg-secondary') || '#111827'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: { color: textColor, font: { family: "Inter", size: 11 } }
        }
      }
    }
  });

  // ---------------------------------------------------------
  // 2. Category & Risk Matrix (Stacked Bar)
  // ---------------------------------------------------------
  const cats = [...new Set(data.map(c => getParentCategory(c.category)))].sort();
  const lowRiskData = [];
  const medRiskData = [];
  const highRiskData = [];

  cats.forEach(cat => {
    const catCalls = data.filter(c => getParentCategory(c.category) === cat);
    lowRiskData.push(catCalls.filter(c => getNormalizedRisk(c.risk_level) === "low").length);
    medRiskData.push(catCalls.filter(c => getNormalizedRisk(c.risk_level) === "medium").length);
    highRiskData.push(catCalls.filter(c => getNormalizedRisk(c.risk_level) === "high").length);
  });

  const catLabelsFormatted = cats.map(c => getLocalizedCategory(c));

  const labelLowRisk = lang === "es" ? "Riesgo Bajo" : "Low Risk";
  const labelMedRisk = lang === "es" ? "Riesgo Medio" : "Medium Risk";
  const labelHighRisk = lang === "es" ? "Riesgo Alto" : "High Risk";

  if (state.charts.categoryRisk) state.charts.categoryRisk.destroy();
  state.charts.categoryRisk = new Chart(document.getElementById("chartCategoryRisk").getContext("2d"), {
    type: "bar",
    data: {
      labels: catLabelsFormatted,
      datasets: [
        { label: labelLowRisk, data: lowRiskData, backgroundColor: "#10b981" },
        { label: labelMedRisk, data: medRiskData, backgroundColor: "#f59e0b" },
        { label: labelHighRisk, data: highRiskData, backgroundColor: "#f43f5e" }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: 'y',
      scales: {
        x: {
          stacked: true,
          grid: { color: gridColor },
          ticks: { color: mutedColor, font: { family: "Inter" } }
        },
        y: {
          stacked: true,
          grid: { display: false },
          ticks: { color: textColor, font: { family: "Inter", weight: '500' }, autoSkip: false }
        }
      },
      plugins: {
        legend: {
          position: "bottom",
          labels: { color: textColor, font: { family: "Inter", size: 11 } }
        }
      }
    }
  });

  // ---------------------------------------------------------
  // 3. Agent Performance Leaderboard (Horizontal Bar)
  // ---------------------------------------------------------
  const agentScores = {};
  data.forEach(c => {
    const agent = getAgentName(c);
    
    if (!agentScores[agent]) {
      agentScores[agent] = { total: 0, count: 0 };
    }
    const score = Number(c.agent_score);
    if (!isNaN(score)) {
      agentScores[agent].total += score;
      agentScores[agent].count++;
    }
  });

  const sortedAgents = Object.keys(agentScores).map(agent => {
    const item = agentScores[agent];
    const avg = item.count > 0 ? (item.total / item.count) : 0;
    return { name: agent, average: avg };
  }).sort((a, b) => b.average - a.average);

  const agentLabels = sortedAgents.map(a => a.name);
  const agentDataValues = sortedAgents.map(a => a.average);

  if (state.charts.agentScore) state.charts.agentScore.destroy();
  state.charts.agentScore = new Chart(document.getElementById("chartAgentScore").getContext("2d"), {
    type: "bar",
    data: {
      labels: agentLabels,
      datasets: [{
        label: "Average Performance Score",
        data: agentDataValues,
        backgroundColor: [
          "rgba(139, 92, 246, 0.85)", // Indigo
          "rgba(59, 130, 246, 0.85)",  // Blue
          "rgba(16, 185, 129, 0.85)",  // Green
          "rgba(245, 158, 11, 0.85)",  // Yellow
          "rgba(244, 63, 94, 0.85)"    // Red
        ],
        borderWidth: 1,
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: 'y', // Horizontal bars
      scales: {
        x: {
          min: 0,
          max: 10,
          grid: { color: gridColor },
          ticks: { color: mutedColor, font: { family: "Inter" } }
        },
        y: {
          grid: { display: false },
          ticks: { color: textColor, font: { family: "Inter", weight: "500" } }
        }
      },
      plugins: {
        legend: { display: false }
      }
    }
  });

  // Bind native click event listener to the canvas to bypass Chart.js inner area restrictions and capture clicks on ticks/labels
  const canvas = document.getElementById("chartAgentScore");
  if (canvas && !canvas.dataset.clickBound) {
    canvas.dataset.clickBound = "true";
    
    canvas.addEventListener("click", (e) => {
      const chart = state.charts.agentScore;
      if (!chart) return;
      
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const xAxis = chart.scales.x;
      if (xAxis && x >= xAxis.left && x <= xAxis.right) {
        // Ticks and labels are drawn at the bottom axis region (below xAxis.top - 15px)
        if (y >= xAxis.top - 15) {
          const clickedValue = xAxis.getValueForPixel(x);
          const scoreVal = Math.round(clickedValue);
          if (scoreVal >= 0 && scoreVal <= 10) {
            // When 10 is clicked, it should reset the filter
            if (scoreVal === 10) {
              state.scoreThresholdFilter = null;
            } else {
              state.scoreThresholdFilter = scoreVal;
            }
            applyFilters();
          }
        }
      }
    });

    canvas.addEventListener("mousemove", (e) => {
      const chart = state.charts.agentScore;
      if (!chart) return;
      
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const xAxis = chart.scales.x;
      if (xAxis && x >= xAxis.left && x <= xAxis.right && y >= xAxis.top - 15) {
        canvas.style.cursor = "pointer";
      } else {
        canvas.style.cursor = "default";
      }
    });
  }

  // ---------------------------------------------------------
  // 4. Average Agent Score by Category (Bar)
  // ---------------------------------------------------------
  const categoryScores = {};
  data.forEach(c => {
    const parentCat = getParentCategory(c.category);
    if (!categoryScores[parentCat]) {
      categoryScores[parentCat] = { total: 0, count: 0 };
    }
    const score = Number(c.agent_score);
    if (!isNaN(score)) {
      categoryScores[parentCat].total += score;
      categoryScores[parentCat].count++;
    }
  });

  const categoriesList = Object.keys(categoryScores).sort();
  const avgScores = categoriesList.map(cat => {
    const item = categoryScores[cat];
    return item.count > 0 ? (item.total / item.count) : 0;
  });

  const formattedCats = categoriesList.map(cat => getLocalizedCategory(cat));
  const scoreLabel = lang === "es" ? "Puntaje Promedio (0-10)" : "Average Score (0-10)";

  if (state.charts.silencePerformance) state.charts.silencePerformance.destroy();
  state.charts.silencePerformance = new Chart(document.getElementById("chartSilencePerformance").getContext("2d"), {
    type: "bar",
    data: {
      labels: formattedCats,
      datasets: [{
        label: scoreLabel,
        data: avgScores,
        backgroundColor: "rgba(59, 130, 246, 0.85)",
        borderColor: "#3b82f6",
        borderWidth: 1.5,
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: textColor, font: { family: "Inter" } }
        },
        y: {
          grid: { color: gridColor },
          min: 0,
          max: 10,
          ticks: { color: mutedColor, stepSize: 1, font: { family: "Inter" } }
        }
      },
      plugins: {
        legend: { display: false }
      }
    }
  });
}

// ==========================================================================
// Table Rendering
// ==========================================================================
function renderTable() {
  const tbody = document.getElementById("callTableBody");
  const countSpan = document.getElementById("tableRecordCount");
  const emptyState = document.getElementById("tableEmptyState");
  
  tbody.innerHTML = "";
  const lang = state.lang || localStorage.getItem("gcs_lang") || "en";
  if (lang === "es") {
    countSpan.textContent = `Mostrando ${state.filteredCalls.length} llamadas`;
  } else {
    countSpan.textContent = `Showing ${state.filteredCalls.length} calls`;
  }

  if (state.filteredCalls.length === 0) {
    emptyState.style.display = "flex";
    return;
  }
  
  emptyState.style.display = "none";

  state.filteredCalls.forEach(call => {
    const tr = document.createElement("tr");
    tr.dataset.id = call.id;
    
    // Assigned Agent and Short Call ID
    const agentName = getAgentName(call);
    const shortId = formatConvName(call.conversation_name);
    const displayName = `${agentName} <span style="font-family: var(--font-mono); font-size: 0.75rem; opacity: 0.6; display: block; margin-top: 0.25rem;">ID: #${shortId}</span>`;
    
    // Category representation
    const category = getLocalizedCategory(getParentCategory(call.category));

    // Sentiment badge
    const sentimentNorm = getNormalizedSentiment(call.sentiment);
    const sentimentClass = `badge-sentiment-${sentimentNorm}`;
    const sentimentHtml = `<span class="badge ${sentimentClass}">${getLocalizedSentiment(call.sentiment)}</span>`;

    // Risk badge
    const riskNorm = getNormalizedRisk(call.risk_level);
    const riskClass = `badge-risk-${riskNorm}`;
    const riskHtml = `<span class="badge ${riskClass}">${getLocalizedRisk(call.risk_level)}</span>`;

    // Resolution badge
    const resNorm = getNormalizedResolution(call.resolution_status);
    const resClass = `badge-status-${resNorm}`;
    const resHtml = `<span class="badge ${resClass}">${getLocalizedResolution(call.resolution_status)}</span>`;

    // Agent score pill representation
    const scoreNum = Number(call.agent_score);
    const scoreHtml = !isNaN(scoreNum)
      ? `<span class="badge" style="background: rgba(139, 92, 246, 0.12); color: var(--accent-secondary); border-color: rgba(139, 92, 246, 0.25); font-family: var(--font-mono); font-weight: bold; font-size: 0.85rem;">${scoreNum.toFixed(1)} / 10</span>`
      : `<span style="color: var(--text-muted); font-size: 0.85rem;">-</span>`;

    // Total Cost
    const totalCost = Number(call.total_cost_usd);
    const costHtml = !isNaN(totalCost)
      ? `<span class="badge" style="background: rgba(16, 185, 129, 0.08); color: var(--color-positive); border-color: rgba(16, 185, 129, 0.2); font-family: var(--font-mono); font-weight: 500; font-size: 0.8rem;">$${totalCost.toFixed(4)}</span>`
      : `<span style="color: var(--text-muted); font-size: 0.85rem;">-</span>`;

    // Created date
    const dateFormatted = call.create_time ? new Date(call.create_time).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }) : "-";

    tr.innerHTML = `
      <td class="conv-name-cell" title="${call.conversation_name}" style="max-width: 220px; white-space: normal; line-height: 1.3;">${displayName}</td>
      <td style="font-weight: 500;">${category}</td>
      <td>${sentimentHtml}</td>
      <td>${riskHtml}</td>
      <td>${resHtml}</td>
      <td>${scoreHtml}</td>
      <td>${costHtml}</td>
      <td style="color: var(--text-secondary); font-size: 0.85rem;">${dateFormatted}</td>
    `;
    
    tr.addEventListener("click", () => openDrawer(call));
    tbody.appendChild(tr);
  });
}

// ==========================================================================
// Call Details Drawer Logic
// ==========================================================================
function openDrawer(call) {
  state.activeCall = call;
  const drawer = document.getElementById("callDrawer");
  const backdrop = document.getElementById("drawerBackdrop");
  
  // Set Text Contents (Agent name and Call ID)
  const lang = state.lang || localStorage.getItem("gcs_lang") || "en";
  const assignedAgent = getAgentName(call);
  const agentLabel = lang === "es" ? "Agente" : "Agent";
  document.getElementById("drawerConversationName").innerHTML = `${agentLabel}: ${assignedAgent} <span style="display: block; font-size: 0.75rem; opacity: 0.6; font-family: var(--font-mono); font-weight: normal; margin-top: 0.25rem;">Call ID: ${call.conversation_name}</span>`;
  document.getElementById("drawerConversationName").title = call.conversation_name;
  
  // Set Badges
  const sentiment = document.getElementById("drawerSentiment");
  const sentimentNorm = getNormalizedSentiment(call.sentiment);
  sentiment.className = `badge badge-sentiment-${sentimentNorm}`;
  sentiment.textContent = getLocalizedSentiment(call.sentiment);

  const risk = document.getElementById("drawerRisk");
  const riskNorm = getNormalizedRisk(call.risk_level);
  risk.className = `badge badge-risk-${riskNorm}`;
  const localizedRiskText = getLocalizedRisk(call.risk_level);
  risk.textContent = lang === "es" ? `Riesgo ${localizedRiskText}` : `${localizedRiskText} Risk`;

  const resolution = document.getElementById("drawerResolution");
  const resNorm = getNormalizedResolution(call.resolution_status);
  resolution.className = `badge badge-status-${resNorm}`;
  resolution.textContent = getLocalizedResolution(call.resolution_status);

  const category = document.getElementById("drawerCategory");
  const parentCat = getParentCategory(call.category);
  const localizedParent = getLocalizedCategory(parentCat);
  const rawCat = call.category ? formatString(call.category) : "General";
  category.textContent = `${localizedParent} (${rawCat})`;

  // Performance stats
  const drawerScoreNum = Number(call.agent_score);
  document.getElementById("drawerScore").textContent = !isNaN(drawerScoreNum) ? `${drawerScoreNum.toFixed(1)} / 10` : "N/A";

  // Cost & Usage stats
  const totalCost = Number(call.total_cost_usd);
  const durationMin = Number(call.audio_duration_minutes);
  let costPerMinStr = "";
  
  if (!isNaN(totalCost) && !isNaN(durationMin) && durationMin > 0) {
    const costPerMin = totalCost / durationMin;
    costPerMinStr = ` ($${costPerMin.toFixed(4)}/min)`;
  }
  
  const totalCostText = !isNaN(totalCost) ? `$${totalCost.toFixed(5)}${costPerMinStr}` : "N/A";
  document.getElementById("drawerTotalCost").textContent = totalCostText;
  document.getElementById("drawerTotalCostSum").textContent = totalCostText;

  const durationSec = Number(call.audio_duration_seconds);
  if (!isNaN(durationSec)) {
    document.getElementById("drawerAudioDuration").textContent = `${durationSec.toFixed(1)}s (${durationMin.toFixed(2)}m)`;
  } else {
    document.getElementById("drawerAudioDuration").textContent = "N/A";
  }

  document.getElementById("drawerAudioFileName").textContent = call.audio_file_name || "N/A";
  
  const btnDrawerPlayAudio = document.getElementById("btnDrawerPlayAudio");
  const scrubberContainer = document.getElementById("drawerAudioScrubberContainer");
  const scrubber = document.getElementById("drawerAudioScrubber");
  const currentTimeText = document.getElementById("drawerAudioCurrentTime");
  const durationTimeText = document.getElementById("drawerAudioDurationTime");
  const audioEl = document.getElementById("gcsAudioElement");

  if (btnDrawerPlayAudio) {
    if (call.audio_file_name) {
      btnDrawerPlayAudio.style.display = "inline-flex";
      if (scrubberContainer) scrubberContainer.style.display = "flex";

      // Clone button to strip old event listeners
      const newBtn = btnDrawerPlayAudio.cloneNode(true);
      btnDrawerPlayAudio.parentNode.replaceChild(newBtn, btnDrawerPlayAudio);
      
      newBtn.addEventListener("click", () => {
        playGCSAudio({ name: GCS_PREFIX + call.audio_file_name });
      });
      
      const isPlaying = audioEl.src && audioEl.src.includes(encodeURIComponent(GCS_PREFIX + call.audio_file_name)) && !audioEl.paused;
      newBtn.innerHTML = `<i class="fa-solid ${isPlaying ? 'fa-pause' : 'fa-play'}"></i>`;
      newBtn.title = isPlaying ? "Pause recording" : "Play recording";

      // Initialize scrubber state
      const isCurrentAudio = audioEl.src && audioEl.src.includes(encodeURIComponent(GCS_PREFIX + call.audio_file_name));
      if (isCurrentAudio) {
        if (currentTimeText) currentTimeText.textContent = formatAudioTime(audioEl.currentTime);
        if (durationTimeText) durationTimeText.textContent = formatAudioTime(audioEl.duration || 0);
        if (scrubber) {
          scrubber.max = Math.floor(audioEl.duration || 0);
          scrubber.value = Math.floor(audioEl.currentTime);
        }
      } else {
        if (currentTimeText) currentTimeText.textContent = "0:00";
        const durationSec = Number(call.audio_duration_seconds) || 0;
        if (durationTimeText) durationTimeText.textContent = formatAudioTime(durationSec);
        if (scrubber) {
          scrubber.max = Math.floor(durationSec);
          scrubber.value = 0;
        }
      }
    } else {
      btnDrawerPlayAudio.style.display = "none";
      if (scrubberContainer) scrubberContainer.style.display = "none";
    }
  }

  const btnDrawerDownloadAudio = document.getElementById("btnDrawerDownloadAudio");
  if (btnDrawerDownloadAudio) {
    if (call.audio_file_name) {
      btnDrawerDownloadAudio.style.display = "inline-flex";
      
      // Clone button to strip old event listeners
      const newDlBtn = btnDrawerDownloadAudio.cloneNode(true);
      btnDrawerDownloadAudio.parentNode.replaceChild(newDlBtn, btnDrawerDownloadAudio);
      
      newDlBtn.addEventListener("click", () => {
        downloadGCSFile({ name: GCS_PREFIX + call.audio_file_name });
      });
    } else {
      btnDrawerDownloadAudio.style.display = "none";
    }
  }

  const sttProcSec = Number(call.stt_processing_seconds);
  if (!isNaN(sttProcSec) && call.stt_processing_seconds !== null && call.stt_processing_seconds !== undefined) {
    document.getElementById("drawerSTTProcessingSeconds").textContent = `${sttProcSec.toFixed(1)}s`;
  } else {
    document.getElementById("drawerSTTProcessingSeconds").textContent = "N/A";
  }

  const provider = call.stt_provider ? formatString(call.stt_provider) : "N/A";
  const model = call.stt_model || "";
  const engineText = model ? `${provider} (${model})` : provider;
  document.getElementById("drawerSTTEngine").textContent = engineText;

  document.getElementById("drawerOpenAIModel").textContent = call.openai_model || "N/A";

  const inputTokens = call.openai_input_tokens;
  const outputTokens = call.openai_output_tokens;
  const totalTokens = call.openai_total_tokens;
  if (totalTokens !== undefined && totalTokens !== null) {
    document.getElementById("drawerOpenAITokens").textContent = `${totalTokens} (In: ${inputTokens || 0} / Out: ${outputTokens || 0})`;
  } else {
    document.getElementById("drawerOpenAITokens").textContent = "N/A";
  }

  const isEstimated = call.cost_is_estimated !== false; // default to true
  const calcAt = call.cost_calculated_at ? new Date(call.cost_calculated_at).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }) : "N/A";
  const billingLabel = isEstimated 
    ? (lang === "es" ? "Estimada" : "Estimated") 
    : (lang === "es" ? "Final" : "Final");
  document.getElementById("drawerBillingStatus").textContent = `${billingLabel} (${calcAt})`;

  // Itemized costs
  const sttCost = Number(call.stt_cost_usd);
  const cxCost = Number(call.cx_insights_cost_usd);
  const aiCost = Number(call.openai_cost_usd);
  const storageCost = Number(call.storage_cost_usd);

  document.getElementById("drawerSTTCost").textContent = !isNaN(sttCost) ? `$${sttCost.toFixed(5)}` : "$0.00000";
  document.getElementById("drawerCXInsightsCost").textContent = !isNaN(cxCost) ? `$${cxCost.toFixed(5)}` : "$0.00000";
  document.getElementById("drawerOpenAICost").textContent = !isNaN(aiCost) ? `$${aiCost.toFixed(5)}` : "$0.00000";
  document.getElementById("drawerStorageCost").textContent = !isNaN(storageCost) ? `$${storageCost.toFixed(5)}` : "$0.00000";

  // Summary & Issue
  document.getElementById("drawerSummary").textContent = call.summary || (lang === "es" ? "No se proporcionó resumen." : "No summary provided.");
  document.getElementById("drawerCustomerIssue").textContent = call.customer_issue || (lang === "es" ? "No se reportaron problemas del cliente." : "No customer issue reported.");

  // Next Actions
  const nextActionBox = document.getElementById("drawerNextAction");
  if (call.next_action) {
    nextActionBox.style.display = "block";
    const nextStepLabel = lang === "es" ? "Siguiente Paso" : "Next Step";
    const followUpLabel = lang === "es" ? "Seguimiento Directo Requerido" : "Direct Follow-up Required";
    nextActionBox.innerHTML = `
      <div style="font-weight: 700; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.35rem; color: var(--color-warning)">
        <i class="fa-solid fa-arrow-right"></i> ${nextStepLabel}
      </div>
      <div>${call.next_action}</div>
      ${call.follow_up_required ? `<div style="margin-top: 0.5rem; font-size: 0.75rem; font-weight: 600; color: var(--color-negative)"><i class="fa-solid fa-flag"></i> ${followUpLabel}</div>` : ''}
    `;
  } else {
    nextActionBox.style.display = "none";
  }

  // Key Points List
  const keyPointsList = document.getElementById("drawerKeyPoints");
  keyPointsList.innerHTML = "";
  
  let points = [];
  if (Array.isArray(call.key_points)) {
    points = call.key_points;
  } else if (typeof call.key_points === 'string') {
    try {
      points = JSON.parse(call.key_points);
    } catch (e) {
      // Split by newline or standard bullet characters
      points = call.key_points.split(/[•\n]+/).map(p => p.trim()).filter(Boolean);
    }
  }

  if (points.length > 0) {
    points.forEach(pt => {
      const li = document.createElement("li");
      li.textContent = pt;
      keyPointsList.appendChild(li);
    });
  } else {
    keyPointsList.innerHTML = '<li style="list-style: none; color: var(--text-muted);">No key points analyzed.</li>';
  }

  // Entities Tag Cloud
  // Parsers and renders for Entities & Intents comparison
  function parseEntities(entitiesField, typesField) {
    let result = [];
    if (!entitiesField) return result;
    
    if (typeof entitiesField === 'string') {
      const entityList = entitiesField.split(",").map(e => e.trim()).filter(Boolean);
      const typeList = typeof typesField === 'string' ? typesField.split(",").map(t => t.trim()) : [];
      entityList.forEach((ent, idx) => {
        result.push({
          name: ent,
          type: typeList[idx] || "OTHER"
        });
      });
      return result;
    }
    
    if (Array.isArray(entitiesField)) {
      entitiesField.forEach((item, idx) => {
        if (typeof item === 'string') {
          let type = "OTHER";
          if (Array.isArray(typesField)) {
            type = typesField[idx] || "OTHER";
          } else if (typeof typesField === 'string') {
            const typeList = typesField.split(",").map(t => t.trim());
            type = typeList[idx] || "OTHER";
          }
          result.push({ name: item, type: type });
        } else if (item && typeof item === 'object') {
          const name = item.text || item.entity || item.name || item.value || JSON.stringify(item);
          const type = item.type || item.category || "OTHER";
          result.push({ name: name, type: type });
        }
      });
      return result;
    }
    
    if (typeof entitiesField === 'object') {
      Object.keys(entitiesField).forEach(key => {
        const val = entitiesField[key];
        if (Array.isArray(val)) {
          val.forEach(item => {
            result.push({ name: String(item), type: key });
          });
        } else {
          result.push({ name: String(val), type: key });
        }
      });
    }
    
    return result;
  }

  function parseCustomIntents(intentsField) {
    let result = [];
    if (!intentsField) return result;
    
    if (typeof intentsField === 'string') {
      return intentsField.split(",").map(i => i.trim()).filter(Boolean);
    }
    
    if (Array.isArray(intentsField)) {
      intentsField.forEach(item => {
        if (typeof item === 'string') {
          result.push(item);
        } else if (item && typeof item === 'object') {
          const name = item.text || item.intent || item.name || item.value || JSON.stringify(item);
          result.push(name);
        }
      });
      return result;
    }
    
    if (typeof intentsField === 'object') {
      Object.keys(intentsField).forEach(key => {
        result.push(`${key}: ${JSON.stringify(intentsField[key])}`);
      });
    }
    
    return result;
  }

  function renderEntityTags(containerId, entitiesField, typesField, placeholder) {
    const container = document.getElementById(containerId);
    if (!container) return 0;
    container.innerHTML = "";
    
    const parsed = parseEntities(entitiesField, typesField);
    if (parsed.length > 0) {
      parsed.forEach(item => {
        const tag = document.createElement("span");
        let typeClass = "tag-other";
        let icon = "fa-tag";
        
        const typeLower = (item.type || "").toLowerCase();
        if (typeLower.includes("person")) {
          typeClass = "tag-person";
          icon = "fa-user";
        } else if (typeLower.includes("location")) {
          typeClass = "tag-location";
          icon = "fa-location-dot";
        } else if (typeLower.includes("org")) {
          typeClass = "tag-org";
          icon = "fa-building";
        }
        
        tag.className = `tag ${typeClass}`;
        tag.innerHTML = `<i class="fa-solid ${icon}" style="font-size: 0.75rem;"></i> ${item.name} <span style="font-size: 0.65rem; opacity: 0.6; margin-left: 0.25rem;">${item.type}</span>`;
        container.appendChild(tag);
      });
    } else {
      container.innerHTML = `<span style="color: var(--text-muted); font-size: 0.85rem;">${placeholder}</span>`;
    }
    return parsed.length;
  }

  function renderIntentTags(containerId, intentsField, placeholder) {
    const container = document.getElementById(containerId);
    if (!container) return 0;
    container.innerHTML = "";
    
    const parsed = parseCustomIntents(intentsField);
    if (parsed.length > 0) {
      parsed.forEach(item => {
        const tag = document.createElement("span");
        tag.className = "tag tag-other";
        tag.style.cssText = "background: rgba(139, 92, 246, 0.12); color: var(--accent-secondary); border-color: rgba(139, 92, 246, 0.25);";
        tag.innerHTML = `<i class="fa-solid fa-bullseye" style="font-size: 0.75rem;"></i> ${item}`;
        container.appendChild(tag);
      });
    } else {
      container.innerHTML = `<span style="color: var(--text-muted); font-size: 0.85rem;">${placeholder}</span>`;
    }
    return parsed.length;
  }

  // Render entities comparison
  const geminiEntCount = renderEntityTags("drawerGeminiEntities", call.gemini_entities, call.gemini_entity_types, "No Gemini entities extracted.");
  document.getElementById("drawerGeminiEntityCount").textContent = call.gemini_entity_count !== null && call.gemini_entity_count !== undefined ? call.gemini_entity_count : geminiEntCount;
  
  const googleCXEntCount = renderEntityTags("drawerGoogleCXEntities", call.entities, call.entity_types, "No Google Cloud CX entities extracted.");
  document.getElementById("drawerGoogleCXEntityCount").textContent = call.entity_count !== null && call.entity_count !== undefined ? call.entity_count : googleCXEntCount;

  // Render intents comparison
  const geminiIntCount = renderIntentTags("drawerGeminiIntents", call.gemini_intents, "No Gemini intents extracted.");
  document.getElementById("drawerGeminiAnnotationCount").textContent = call.gemini_annotation_count !== null && call.gemini_annotation_count !== undefined ? call.gemini_annotation_count : geminiIntCount;
  
  const googleCXIntCount = renderIntentTags("drawerGoogleCXIntents", call.intents, "No Google Cloud CX intents extracted.");
  document.getElementById("drawerGoogleCXAnnotationCount").textContent = call.annotation_count !== null && call.annotation_count !== undefined ? call.annotation_count : googleCXIntCount;

  // Interactive Transcript Dialog
  renderTranscript(call);

  // Open Drawer
  drawer.classList.add("active");
  backdrop.classList.add("active");
  drawer.setAttribute("aria-hidden", "false");
}

function closeDrawer() {
  state.activeCall = null;
  const drawer = document.getElementById("callDrawer");
  const backdrop = document.getElementById("drawerBackdrop");
  
  if (drawer.classList.contains("active")) {
    drawer.classList.remove("active");
    backdrop.classList.remove("active");
    drawer.setAttribute("aria-hidden", "true");
  }
}

// Call Transcript Renderer
function renderTranscript(call) {
  const container = document.getElementById("drawerTranscript");
  container.innerHTML = "";

  const lang = state.lang || localStorage.getItem("gcs_lang") || "en";
  if (!call || (!call.transcript && !call.segments)) {
    container.innerHTML = `<div style="color: var(--text-muted); font-size: 0.9rem; text-align: center; padding: 1rem;">${lang === 'es' ? 'No hay transcripción disponible.' : 'No transcript available.'}</div>`;
    return;
  }

  // Parse segments if it is a JSON string or an array
  let rawSegments = null;
  if (call.segments) {
    if (typeof call.segments === 'string') {
      try {
        rawSegments = JSON.parse(call.segments);
      } catch (e) {
        console.warn("Could not parse segments string:", e);
      }
    } else if (Array.isArray(call.segments)) {
      rawSegments = call.segments;
    }
  }

  let segments = [];
  if (Array.isArray(rawSegments)) {
    rawSegments.forEach((item, idx) => {
      // 1. Google STT alternatives structure mapping
      if (item.alternatives && Array.isArray(item.alternatives) && item.alternatives.length > 0) {
        const alt = item.alternatives[0];
        const text = alt.transcript || "";
        
        let speakerVal = null;
        if (alt.words && Array.isArray(alt.words) && alt.words.length > 0) {
          const firstWord = alt.words[0];
          if (firstWord.speakerTag !== undefined && firstWord.speakerTag !== null) {
            speakerVal = `SPEAKER_0${firstWord.speakerTag}`;
          }
        }
        if (!speakerVal && item.channelTag !== undefined && item.channelTag !== null) {
          speakerVal = `SPEAKER_0${item.channelTag}`;
        }
        if (!speakerVal) {
          speakerVal = "SPEAKER_00";
        }

        let startSec = 0;
        let endSec = 0;
        if (alt.words && Array.isArray(alt.words) && alt.words.length > 0) {
          const firstWord = alt.words[0];
          const lastWord = alt.words[alt.words.length - 1];
          if (firstWord.startOffset) {
            startSec = parseFloat(firstWord.startOffset.toString().replace("s", ""));
          }
          if (lastWord.endOffset) {
            endSec = parseFloat(lastWord.endOffset.toString().replace("s", ""));
          }
        }
        if (!endSec && item.resultEndOffset) {
          endSec = parseFloat(item.resultEndOffset.toString().replace("s", ""));
        }
        if (!startSec && idx > 0 && segments[idx - 1]) {
          startSec = segments[idx - 1].end;
        }

        segments.push({
          id: idx,
          start: isNaN(startSec) ? 0 : startSec,
          end: isNaN(endSec) ? 0 : endSec,
          text: text,
          speaker: speakerVal
        });
      } else {
        // 2. Standard format or fallback
        const startVal = item.start !== undefined ? parseFloat(item.start.toString().replace("s", "")) : 0;
        const endVal = item.end !== undefined ? parseFloat(item.end.toString().replace("s", "")) : 0;
        segments.push({
          id: item.id !== undefined ? item.id : idx,
          start: isNaN(startVal) ? 0 : startVal,
          end: isNaN(endVal) ? 0 : endVal,
          text: item.text || "",
          speaker: item.speaker || null
        });
      }
    });
  }

  if (segments && segments.length > 0) {
    // Determine the agent speaker tag. The agent is always the one who speaks the most (highest cumulative character count).
    const speakerTally = {};
    segments.forEach(seg => {
      if (seg.speaker && seg.text) {
        speakerTally[seg.speaker] = (speakerTally[seg.speaker] || 0) + seg.text.trim().length;
      }
    });

    let agentSpeaker = null;
    let maxContentLength = 0;
    Object.keys(speakerTally).forEach(speaker => {
      if (speakerTally[speaker] > maxContentLength) {
        maxContentLength = speakerTally[speaker];
        agentSpeaker = speaker;
      }
    });

    // Fallback if tally is empty
    if (!agentSpeaker) {
      for (let i = 0; i < segments.length; i++) {
        if (segments[i].speaker) {
          agentSpeaker = segments[i].speaker;
          break;
        }
      }
    }

    const agentName = getAgentName(call) || (lang === 'es' ? 'Agente de Soporte' : 'Support Agent');

    segments.forEach(seg => {
      if (!seg.text || !seg.text.trim()) return;

      const isAgent = seg.speaker === agentSpeaker;
      const speakerName = isAgent ? agentName : (lang === 'es' ? 'Cliente' : 'Customer');
      
      const bubbleContainer = document.createElement("div");
      bubbleContainer.className = `chat-bubble-container ${isAgent ? 'agent' : 'customer'}`;
      
      const speakerLabel = document.createElement("span");
      speakerLabel.className = "chat-speaker";
      speakerLabel.innerHTML = isAgent 
        ? `<i class="fa-solid fa-headset"></i> ${speakerName}` 
        : `<i class="fa-solid fa-circle-user"></i> ${speakerName}`;
      
      const bubble = document.createElement("div");
      bubble.className = `chat-bubble ${isAgent ? 'agent' : 'customer'}`;
      
      const textSpan = document.createElement("span");
      textSpan.textContent = seg.text.trim();
      bubble.appendChild(textSpan);

      // Add timestamp seeker
      if (seg.start !== undefined && seg.start !== null) {
        const timeStr = ` <span style="font-size: 0.68rem; opacity: 0.5; margin-left: 0.35rem; font-family: monospace;">[${formatAudioTime(seg.start)}]</span>`;
        const timeSpan = document.createElement("span");
        timeSpan.innerHTML = timeStr;
        bubble.appendChild(timeSpan);
        
        // Setup click playhead seeking
        bubble.style.cursor = "pointer";
        bubble.title = lang === 'es' ? "Haga clic para reproducir este segmento" : "Click to play this segment";
        bubble.addEventListener("click", () => {
          const audioEl = document.getElementById("gcsAudioElement");
          const isCurrentAudio = audioEl.src && audioEl.src.includes(encodeURIComponent(GCS_PREFIX + call.audio_file_name));
          if (isCurrentAudio) {
            audioEl.currentTime = seg.start;
            if (audioEl.paused) {
              audioEl.play().catch(err => console.error("Error seeking audio play:", err));
            }
          } else {
            // Load and play the GCS audio first
            playGCSAudio({ name: GCS_PREFIX + call.audio_file_name }).then(() => {
              setTimeout(() => {
                audioEl.currentTime = seg.start;
              }, 400);
            });
          }
        });
      }
      
      bubbleContainer.appendChild(speakerLabel);
      bubbleContainer.appendChild(bubble);
      container.appendChild(bubbleContainer);
    });
  } else if (call.transcript) {
    // Fallback: render the entire transcript text block as pre-wrap
    const textBlock = document.createElement("div");
    textBlock.className = "transcript-text-block";
    textBlock.style.fontSize = "0.88rem";
    textBlock.style.lineHeight = "1.6";
    textBlock.style.color = "var(--text-primary)";
    textBlock.style.whiteSpace = "pre-wrap";
    textBlock.style.padding = "0.25rem";
    textBlock.textContent = call.transcript.trim();

    container.appendChild(textBlock);
  }
}

// ==========================================================================
// Formatting Helpers
// ==========================================================================
function formatAudioTime(seconds) {
  if (isNaN(seconds) || seconds === Infinity) return "0:00";
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
}

function formatString(str) {
  if (!str) return "";
  return str
    .replace(/_/g, " ")
    .replace(/\b\w/g, c => c.toUpperCase());
}

function formatConvName(name) {
  if (!name) return "Unknown Call";
  const parts = name.split("/");
  return parts[parts.length - 1] || name;
}

function getAgentIdFromFilename(audioFileName) {
  if (!audioFileName) return null;
  // Strip off path and extension
  const baseName = audioFileName.split("/").pop().replace(/\.mp3$/i, "").trim();
  const lastUnderscore = baseName.lastIndexOf("_");
  if (lastUnderscore === -1) return null;
  const agentId = baseName.substring(lastUnderscore + 1).trim();
  return agentId || null;
}

// Compute canonical names for each agent ID based on the loaded calls data
function computeCanonicalAgents(calls) {
  state.canonicalAgents = {};
  if (!calls || !Array.isArray(calls)) return;

  const agentIdNames = {};

  calls.forEach(call => {
    const parsedId = getAgentIdFromFilename(call.audio_file_name);
    if (!parsedId) return;

    if (!agentIdNames[parsedId]) {
      agentIdNames[parsedId] = [];
    }

    // Candidate 1: Supabase agent column
    if (call.agent && call.agent.trim()) {
      agentIdNames[parsedId].push(call.agent.trim());
    }

    // Candidate 2: Transcript/Entities search fallbacks
    const text = ((call.transcript || "") + " " + (call.entities || "")).toLowerCase();
    if (text.includes("marcelo")) {
      agentIdNames[parsedId].push("Marcelo");
    } else if (text.includes("andrea")) {
      agentIdNames[parsedId].push("Andrea");
    } else if (text.includes("geordi") || text.includes("yordy") || text.includes("jordy")) {
      agentIdNames[parsedId].push("Yordy");
    } else if (text.includes("carol") || text.includes("cruise")) {
      agentIdNames[parsedId].push("Carol");
    }
  });

  const lang = state.lang || localStorage.getItem("gcs_lang") || "en";
  const mappings = state.agentMappings || {};

  Object.keys(agentIdNames).forEach(agentId => {
    // 1. Manually mapped name takes priority
    if (mappings[agentId]) {
      state.canonicalAgents[agentId] = mappings[agentId];
      return;
    }

    const candidates = agentIdNames[agentId];
    if (candidates.length === 0) {
      state.canonicalAgents[agentId] = (lang === 'es' ? 'Agente #' : 'Agent #') + agentId;
      return;
    }

    // 2. Find the most common name candidate
    const frequency = {};
    let maxFreq = 0;
    let bestCandidate = candidates[0];

    candidates.forEach(name => {
      const normalizedName = name.replace(/\.$/, "").trim();
      frequency[normalizedName] = (frequency[normalizedName] || 0) + 1;
      if (frequency[normalizedName] > maxFreq) {
        maxFreq = frequency[normalizedName];
        bestCandidate = normalizedName;
      }
    });

    state.canonicalAgents[agentId] = bestCandidate;
  });
}

// Extract Agent Name from Entities or Transcript (falling back to Hashed Deterministic Names if not found)
function getAgentName(call) {
  const lang = state.lang || localStorage.getItem("gcs_lang") || "en";
  const unknownLabel = lang === 'es' ? 'Agente Desconocido' : 'Unknown Agent';
  if (!call) return unknownLabel;

  const parsedId = getAgentIdFromFilename(call.audio_file_name);
  
  // If we have an agent ID, check our canonical agents map first
  if (parsedId) {
    if (!state.canonicalAgents) {
      computeCanonicalAgents(state.allCalls || [call]);
    }
    if (state.canonicalAgents && state.canonicalAgents[parsedId]) {
      return state.canonicalAgents[parsedId];
    }
  }

  // 0. Use the new Supabase agent column if populated
  if (call.agent && call.agent.trim()) {
    return call.agent.trim();
  }
  
  // 1. First, check if we can parse the agent identifier from the MP3 filename
  if (parsedId) {
    const mappings = state.agentMappings || {};
    if (mappings[parsedId]) {
      return mappings[parsedId];
    }
    return (lang === 'es' ? 'Agente #' : 'Agent #') + parsedId;
  }
  
  // 2. Fallback: Combine transcript and entities for search (case-insensitive)
  const text = ((call.transcript || "") + " " + (call.entities || "")).toLowerCase();
  
  if (text.includes("marcelo")) {
    return "Marcelo";
  }
  if (text.includes("andrea")) {
    return "Andrea";
  }
  if (text.includes("geordi") || text.includes("yordy") || text.includes("jordy")) {
    return "Yordy";
  }
  if (text.includes("carol") || text.includes("cruise")) {
    return "Carol";
  }
  
  // Fallback: Hashed deterministic name based on conversation ID
  return getFallbackAgentName(call.conversation_name);
}

function getFallbackAgentName(conversationName) {
  const lang = state.lang || localStorage.getItem("gcs_lang") || "en";
  if (!conversationName) return lang === 'es' ? 'Agente Desconocido' : 'Unknown Agent';
  const shortId = formatConvName(conversationName);
  const lastFour = shortId.slice(-4);
  return (lang === 'es' ? 'Agente #' : 'Agent #') + lastFour;
}

// Map categories into 8 clean, high-level parent categories: venta, seguimiento, consulta, soporte, reclamo, retención, información, otro
function getParentCategory(rawCategory) {
  if (!rawCategory) return "otro";
  const cat = rawCategory.toLowerCase().trim();
  
  if (cat.includes("venta") || cat.includes("sales") || cat.includes("sale") || cat.includes("marketing") || cat.includes("comprar")) {
    return "venta";
  }
  if (cat.includes("seguimiento") || cat.includes("follow-up") || cat.includes("followup") || cat.includes("scheduling") || cat.includes("logistics") || cat.includes("delivery") || cat.includes("entrega") || cat.includes("agenda") || cat.includes("cita")) {
    return "seguimiento";
  }
  if (cat.includes("consulta") || cat.includes("inquiry") || cat.includes("booking") || cat.includes("reservation") || cat.includes("reserva") || cat.includes("pregunt") || cat.includes("duda")) {
    return "consulta";
  }
  if (cat.includes("soporte") || cat.includes("support") || cat.includes("technical") || cat.includes("it support") || cat.includes("maintenance") || cat.includes("plumbing") || cat.includes("wifi") || cat.includes("mantenimiento") || cat.includes("daño") || cat.includes("averia")) {
    return "soporte";
  }
  if (cat.includes("reclamo") || cat.includes("complaint") || cat.includes("dispute") || cat.includes("dissatisfaction") || cat.includes("queja") || cat.includes("inconformidad")) {
    return "reclamo";
  }
  if (cat.includes("retención") || cat.includes("retencion") || cat.includes("retention") || cat.includes("cancel") || cat.includes("devolucion") || cat.includes("reembolso") || cat.includes("refund")) {
    return "retención";
  }
  if (cat.includes("información") || cat.includes("informacion") || cat.includes("information") || cat.includes("billing") || cat.includes("payment") || cat.includes("pricing") || cat.includes("factura") || cat.includes("pago") || cat.includes("precio") || cat.includes("costo")) {
    return "información";
  }
  
  return "otro";
}

// Normalizers to convert English or Spanish database values into standard lowercase English tags
function getNormalizedSentiment(sentimentVal) {
  if (!sentimentVal) return "neutral";
  const val = sentimentVal.toLowerCase().trim();
  if (val.includes("positiv") || val === "positive") return "positive";
  if (val.includes("negativ") || val === "negative") return "negative";
  if (val.includes("mixt") || val === "mixed") return "mixed";
  return "neutral";
}

function getNormalizedRisk(riskVal) {
  if (!riskVal) return "low";
  const val = riskVal.toLowerCase().trim();
  if (val === "high" || val === "alto") return "high";
  if (val === "medium" || val === "medio") return "medium";
  return "low";
}

function getNormalizedResolution(resVal) {
  if (!resVal) return "unknown";
  const val = resVal.toLowerCase().trim();
  if (val === "resolved" || val === "resuelto") return "resolved";
  if (val === "unresolved" || val === "no_resuelto" || val === "no resuelto") return "unresolved";
  if (val === "partially_resolved" || val === "parcialmente_resuelto" || val === "parcialmente resuelto") return "partially_resolved";
  return "unknown";
}

// Localized Display Formatters (support bilingual EN/ES)
function getLocalizedSentiment(sentimentVal) {
  const lang = state.lang || localStorage.getItem("gcs_lang") || "en";
  if (!sentimentVal) return "";
  const val = sentimentVal.toLowerCase().trim();
  const dict = {
    positive: { en: "Positive", es: "Positivo" },
    positivo: { en: "Positive", es: "Positivo" },
    neutral: { en: "Neutral", es: "Neutral" },
    negative: { en: "Negative", es: "Negativo" },
    negativo: { en: "Negative", es: "Negativo" },
    mixed: { en: "Mixed", es: "Mixto" },
    mixto: { en: "Mixed", es: "Mixto" }
  };
  return (dict[val] && dict[val][lang]) || sentimentVal;
}

function getLocalizedRisk(riskVal) {
  const lang = state.lang || localStorage.getItem("gcs_lang") || "en";
  if (!riskVal) return "";
  const val = riskVal.toLowerCase().trim();
  const dict = {
    low: { en: "Low", es: "Bajo" },
    bajo: { en: "Low", es: "Bajo" },
    medium: { en: "Medium", es: "Medio" },
    medio: { en: "Medium", es: "Medio" },
    high: { en: "High", es: "Alto" },
    alto: { en: "High", es: "Alto" }
  };
  return (dict[val] && dict[val][lang]) || riskVal;
}

function getLocalizedResolution(resVal) {
  const lang = state.lang || localStorage.getItem("gcs_lang") || "en";
  if (!resVal) return "";
  const val = resVal.toLowerCase().trim();
  const dict = {
    resolved: { en: "Resolved", es: "Resuelto" },
    resuelto: { en: "Resolved", es: "Resuelto" },
    unresolved: { en: "Unresolved", es: "No Resuelto" },
    no_resuelto: { en: "Unresolved", es: "No Resuelto" },
    partially_resolved: { en: "Partially Resolved", es: "Parcialmente Resuelto" },
    parcialmente_resuelto: { en: "Partially Resolved", es: "Parcialmente Resuelto" },
    unknown: { en: "Unknown", es: "Desconocido" },
    desconocido: { en: "Unknown", es: "Desconocido" }
  };
  return (dict[val] && dict[val][lang]) || resVal;
}

function getLocalizedCategory(catVal) {
  const lang = state.lang || localStorage.getItem("gcs_lang") || "en";
  if (!catVal) return lang === "es" ? "Otro" : "Other";
  const val = catVal.toLowerCase().trim();
  const dict = {
    venta: { en: "Sales", es: "Venta" },
    seguimiento: { en: "Follow-up", es: "Seguimiento" },
    consulta: { en: "Inquiry", es: "Consulta" },
    soporte: { en: "Support", es: "Soporte" },
    reclamo: { en: "Complaint", es: "Reclamo" },
    retención: { en: "Retention", es: "Retención" },
    retencion: { en: "Retention", es: "Retención" },
    información: { en: "Information", es: "Información" },
    informacion: { en: "Information", es: "Información" },
    otro: { en: "Other", es: "Otro" }
  };
  return (dict[val] && dict[val][lang]) || catVal;
}

// ==========================================================================
// Tabbed Navigation Setup
// ==========================================================================
function setupTabNavigation() {
  const tabs = document.querySelectorAll(".tab-btn");
  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      tabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      
      const target = tab.dataset.target;
      if (target === "overviewCharts") {
        document.getElementById("overviewCharts").style.display = "grid";
        document.getElementById("trendCharts").style.display = "none";
        renderOverviewCharts();
      } else {
        document.getElementById("overviewCharts").style.display = "none";
        document.getElementById("trendCharts").style.display = "grid";
        renderTrendCharts();
      }
    });
  });
}

// ==========================================================================
// Trend Charts Rendering
// ==========================================================================
function renderTrendCharts() {
  const data = [...state.filteredCalls].sort((a, b) => new Date(a.create_time) - new Date(b.create_time));

  const textColor = getThemeColor('--text-primary') || '#f3f4f6';
  const mutedColor = getThemeColor('--text-muted') || '#6b7280';
  const gridColor = getThemeColor('--border-color') || 'rgba(255, 255, 255, 0.08)';

  // 1. Traffic by Hour (Bar)
  const hourCounts = Array(24).fill(0);
  data.forEach(c => {
    if (c.create_time) {
      const hour = new Date(c.create_time).getHours();
      if (hour >= 0 && hour < 24) hourCounts[hour]++;
    }
  });

  const hourLabels = [
    "12 AM", "1 AM", "2 AM", "3 AM", "4 AM", "5 AM", "6 AM", "7 AM", "8 AM", "9 AM", "10 AM", "11 AM",
    "12 PM", "1 PM", "2 PM", "3 PM", "4 PM", "5 PM", "6 PM", "7 PM", "8 PM", "9 PM", "10 PM", "11 PM"
  ];

  if (state.charts.callsHour) state.charts.callsHour.destroy();
  state.charts.callsHour = new Chart(document.getElementById("chartCallsByHour").getContext("2d"), {
    type: "bar",
    data: {
      labels: hourLabels,
      datasets: [{
        label: "Number of Calls",
        data: hourCounts,
        backgroundColor: "rgba(59, 130, 246, 0.8)",
        borderColor: "#3b82f6",
        borderWidth: 1.5,
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: mutedColor, font: { family: "Inter", size: 10 } }
        },
        y: {
          grid: { color: gridColor },
          ticks: { color: mutedColor, stepSize: 1, font: { family: "Inter" } }
        }
      },
      plugins: {
        legend: { display: false }
      }
    }
  });

  // 2. Calls over Time (By Day)
  let dateLabels = [];
  let dateCounts = [];
  const uniqueDates = [...new Set(data.map(c => new Date(c.create_time).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})))];

  if (uniqueDates.length <= 1) {
    const targetDate = data.length > 0 ? new Date(data[0].create_time) : new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(targetDate);
      d.setDate(targetDate.getDate() - i);
      const dateStr = d.toLocaleDateString(undefined, {month: 'short', day: 'numeric'});
      dateLabels.push(dateStr);

      const count = data.filter(c => {
        const callDate = new Date(c.create_time).toLocaleDateString(undefined, {month: 'short', day: 'numeric'});
        return callDate === dateStr;
      }).length;
      dateCounts.push(count);
    }
  } else {
    dateLabels = uniqueDates;
    dateCounts = dateLabels.map(dateStr => {
      return data.filter(c => new Date(c.create_time).toLocaleDateString(undefined, {month: 'short', day: 'numeric'}) === dateStr).length;
    });
  }

  if (state.charts.callsDay) state.charts.callsDay.destroy();
  state.charts.callsDay = new Chart(document.getElementById("chartCallsByDay").getContext("2d"), {
    type: "line",
    data: {
      labels: dateLabels,
      datasets: [{
        label: "Calls",
        data: dateCounts,
        borderColor: "#10b981",
        backgroundColor: "rgba(16, 185, 129, 0.1)",
        borderWidth: 3,
        fill: true,
        tension: 0.35,
        pointBackgroundColor: "#10b981",
        pointRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: textColor, font: { family: "Inter", weight: '500' } }
        },
        y: {
          grid: { color: gridColor },
          ticks: { color: mutedColor, stepSize: 1, font: { family: "Inter" } }
        }
      },
      plugins: {
        legend: { display: false }
      }
    }
  });

  // 3. Avg Sentiment Trend
  const timeLabels = data.map(c => new Date(c.create_time).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }));

  const sentimentValues = data.map(c => {
    const s = getNormalizedSentiment(c.sentiment);
    if (s === 'positive') return 1;
    if (s === 'negative') return -1;
    return 0;
  });

  const lang = state.lang || localStorage.getItem("gcs_lang") || "en";
  const sentimentLabel = lang === "es" ? "Valor de Sentimiento" : "Sentiment Value";
  const resolutionLabel = lang === "es" ? "Tasa de Resolución Acumulada (%)" : "Cumulative Resolution Rate (%)";

  if (state.charts.sentimentTrend) state.charts.sentimentTrend.destroy();
  state.charts.sentimentTrend = new Chart(document.getElementById("chartSentimentTrend").getContext("2d"), {
    type: "line",
    data: {
      labels: timeLabels,
      datasets: [{
        label: sentimentLabel,
        data: sentimentValues,
        borderColor: "#3b82f6",
        backgroundColor: "rgba(59, 130, 246, 0.05)",
        borderWidth: 3,
        tension: 0.3,
        pointBackgroundColor: function(context) {
          const val = context.raw;
          if (val > 0) return "#10b981";
          if (val < 0) return "#f43f5e";
          return "#9ca3af";
        },
        pointRadius: 5,
        pointHoverRadius: 7
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: mutedColor, font: { family: "Inter", size: 9 } }
        },
        y: {
          grid: { color: gridColor },
          min: -1.2,
          max: 1.2,
          ticks: {
            stepSize: 1,
            color: textColor,
            font: { family: "Inter", weight: 'bold' },
            callback: function(value) {
              if (value === 1) return lang === "es" ? "Positivo" : "Positive";
              if (value === 0) return lang === "es" ? "Neutral" : "Neutral";
              if (value === -1) return lang === "es" ? "Negativo" : "Negative";
              return "";
            }
          }
        }
      },
      plugins: {
        legend: { display: false }
      }
    }
  });

  // 4. Resolution Rate Trend
  let runningResolved = 0;
  const resolutionRates = data.map((c, idx) => {
    if (getNormalizedResolution(c.resolution_status) === 'resolved') {
      runningResolved++;
    }
    return (runningResolved / (idx + 1)) * 100;
  });

  if (state.charts.resolutionTrend) state.charts.resolutionTrend.destroy();
  state.charts.resolutionTrend = new Chart(document.getElementById("chartResolutionTrend").getContext("2d"), {
    type: "line",
    data: {
      labels: timeLabels,
      datasets: [{
        label: resolutionLabel,
        data: resolutionRates,
        borderColor: "#8b5cf6",
        backgroundColor: "rgba(139, 92, 246, 0.1)",
        borderWidth: 3,
        fill: true,
        tension: 0.25,
        pointBackgroundColor: "#8b5cf6",
        pointRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: mutedColor, font: { family: "Inter", size: 9 } }
        },
        y: {
          grid: { color: gridColor },
          min: 0,
          max: 100,
          ticks: { color: mutedColor, font: { family: "Inter" } }
        }
      },
      plugins: {
        legend: { display: false }
      }
    }
  });


}

// ==========================================================================
// Google Cloud Storage Audio Recordings Explorer
// ==========================================================================

const GCS_CLIENT_ID = "729307029133-87bfsmpllr8idqqsng557mt9fl316un4.apps.googleusercontent.com";
const GCS_BUCKET = "business-call-analytics";
const GCS_PREFIX = "audio/";

// check for oauth access token in URL hash (implicit flow redirect)
function checkGoogleAuth() {
  const hash = window.location.hash;
  if (hash && hash.includes("access_token=")) {
    // Parse key-value pairs from URL hash
    const hashData = {};
    hash.substring(1).split("&").forEach(part => {
      const kv = part.split("=");
      if (kv.length === 2) hashData[kv[0]] = decodeURIComponent(kv[1]);
    });
    
    const token = hashData["access_token"];
    const expiresSec = Number(hashData["expires_in"] || 3600);
    
    if (token) {
      const expiryTime = Date.now() + expiresSec * 1000;
      localStorage.setItem("gcs_access_token", token);
      localStorage.setItem("gcs_token_expiry", `v3_${expiryTime}`);
      
      // Clean URL hash so it looks nice
      window.history.replaceState(null, null, window.location.pathname);
    }
  }
}

async function syncGCSSettingsWithSupabase() {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/dashboard_settings?id=eq.1`, {
      headers: {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`
      }
    });
    if (response.ok) {
      const data = await response.json();
      state.supabaseSettingsEnabled = true;
      
      let settings = {};
      if (data.length === 0) {
        // Create initial settings row
        await fetch(`${SUPABASE_URL}/rest/v1/dashboard_settings`, {
          method: "POST",
          headers: {
            "apikey": SUPABASE_ANON_KEY,
            "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ id: 1 })
        });
      } else {
        settings = data[0];
      }

      const keysToSync = [
        { localKey: "gcs_service_account", dbCol: "gcs_service_account" },
        { localKey: "gcs_access_token", dbCol: "gcs_access_token" },
        { localKey: "gcs_token_expiry", dbCol: "gcs_token_expiry" },
        { localKey: "gcs_manual_token_flag", dbCol: "gcs_manual_token_flag" },
        { localKey: "gcs_min_call_length", dbCol: "min_call_length" },
        { localKey: "gcs_max_call_length", dbCol: "max_call_length" },
        { localKey: "gcs_agent_mappings", dbCol: "agent_mappings" },
        { localKey: "gcs_predefined_questions", dbCol: "predefined_questions" }
      ];

      const updatesToSend = {};
      let needsUpload = false;

      keysToSync.forEach(k => {
        const dbVal = settings[k.dbCol];
        const localVal = localStorage.getItem(k.localKey);

        if (dbVal !== null && dbVal !== undefined && dbVal !== "") {
          // Database has it, write to local storage
          localStorage.setItem(k.localKey, String(dbVal));
        } else if (localVal !== null && localVal !== undefined && localVal !== "") {
          // Database is missing it, but local storage has it: queue upload to database to self-heal
          updatesToSend[k.dbCol] = localVal;
          needsUpload = true;
        }
      });

      // Self-heal the database row with local credentials if database is empty/cleared
      if (needsUpload) {
        try {
          await fetch(`${SUPABASE_URL}/rest/v1/dashboard_settings?id=eq.1`, {
            method: "PATCH",
            headers: {
              "apikey": SUPABASE_ANON_KEY,
              "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify(updatesToSend)
          });
        } catch (e) {
          console.warn("Could not self-heal Supabase settings row:", e);
        }
      }

      // Populate local state
      const mappingsRaw = localStorage.getItem("gcs_agent_mappings");
      if (mappingsRaw) {
        try {
          state.agentMappings = JSON.parse(mappingsRaw);
        } catch (e) {
          state.agentMappings = {};
        }
      } else {
        state.agentMappings = {};
      }

      const predefinedRaw = localStorage.getItem("gcs_predefined_questions");
      if (predefinedRaw) {
        try {
          state.predefinedQuestions = JSON.parse(predefinedRaw);
        } catch (e) {
          state.predefinedQuestions = getDefaultPredefinedQuestions();
        }
      } else {
        state.predefinedQuestions = getDefaultPredefinedQuestions();
      }
    } else {
      state.supabaseSettingsEnabled = false;
    }
  } catch (err) {
    console.warn("Supabase settings sync failed (table might not exist):", err);
    state.supabaseSettingsEnabled = false;
  }
}

async function saveSettingToSupabase(key, value) {
  try {
    const colMap = {
      gcs_service_account: "gcs_service_account",
      gcs_access_token: "gcs_access_token",
      gcs_token_expiry: "gcs_token_expiry",
      gcs_manual_token_flag: "gcs_manual_token_flag",
      gcs_min_call_length: "min_call_length",
      gcs_max_call_length: "max_call_length",
      agent_mappings: "agent_mappings",
      predefined_questions: "predefined_questions"
    };
    const colName = colMap[key] || key;
    
    let valToSend = value;
    if ((colName === "min_call_length" || colName === "max_call_length") && value !== null) {
      const num = Number(value);
      valToSend = isNaN(num) || value === "" ? null : num;
    }

    await fetch(`${SUPABASE_URL}/rest/v1/dashboard_settings?id=eq.1`, {
      method: "PATCH",
      headers: {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ [colName]: valToSend })
    });
  } catch (err) {
    console.warn(`Could not save setting ${key} to Supabase:`, err);
  }
}

async function deleteSettingFromSupabase(key) {
  try {
    const colMap = {
      gcs_service_account: "gcs_service_account",
      gcs_access_token: "gcs_access_token",
      gcs_token_expiry: "gcs_token_expiry",
      gcs_manual_token_flag: "gcs_manual_token_flag",
      gcs_min_call_length: "min_call_length",
      gcs_max_call_length: "max_call_length",
      agent_mappings: "agent_mappings",
      predefined_questions: "predefined_questions"
    };
    const colName = colMap[key] || key;
    
    await fetch(`${SUPABASE_URL}/rest/v1/dashboard_settings?id=eq.1`, {
      method: "PATCH",
      headers: {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ [colName]: null })
    });
  } catch (err) {
    console.warn(`Could not delete setting ${key} from Supabase:`, err);
  }
}

async function getGoogleAccessToken() {
  const token = localStorage.getItem("gcs_access_token");
  const expiryRaw = localStorage.getItem("gcs_token_expiry");
  
  if (token && expiryRaw) {
    const parts = expiryRaw.split("_");
    if (parts.length === 2 && parts[0] === "v3") {
      const expiry = Number(parts[1]);
      if (Date.now() < expiry - 30000) {
        return token;
      }
    }
  }
  
  // Clean up if expired, missing, or scope mismatched
  localStorage.removeItem("gcs_access_token");
  localStorage.removeItem("gcs_token_expiry");
  
  // Check if we have a service account JSON stored
  const saJsonStr = localStorage.getItem("gcs_service_account");
  if (saJsonStr) {
    try {
      const saJson = JSON.parse(saJsonStr);
      const data = await getAccessTokenFromServiceAccount(saJson);
      
      const newExpiry = Date.now() + (data.expires_in || 3600) * 1000;
      localStorage.setItem("gcs_access_token", data.access_token);
      localStorage.setItem("gcs_token_expiry", `v3_${newExpiry}`);
      
      // Save refreshed credentials to database
      await saveSettingToSupabase("gcs_access_token", data.access_token);
      await saveSettingToSupabase("gcs_token_expiry", `v3_${newExpiry}`);
      
      return data.access_token;
    } catch (err) {
      console.error("Auto-refreshing access token using Service Account failed:", err);
      // Do NOT delete the credentials. Simply return null so the UI shows disconnected temporarily.
      // This prevents temporary network issues or container restarts from wiping user credentials.
      return null;
    }
  }
  
  return null;
}

async function getAccessTokenFromServiceAccount(saJson) {
  const header = { alg: "RS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: saJson.client_email,
    scope: "https://www.googleapis.com/auth/cloud-platform",
    aud: saJson.token_uri || "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now
  };
  
  const base64url = (source) => {
    let base64;
    if (typeof source === "string") {
      base64 = btoa(unescape(encodeURIComponent(source)));
    } else {
      base64 = btoa(unescape(encodeURIComponent(JSON.stringify(source))));
    }
    return base64.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  };
  
  const stringToSign = `${base64url(header)}.${base64url(payload)}`;
  const privateKeyPem = saJson.private_key;
  const pemHeader = "-----BEGIN PRIVATE KEY-----";
  const pemFooter = "-----END PRIVATE KEY-----";
  
  const startIdx = privateKeyPem.indexOf(pemHeader);
  const endIdx = privateKeyPem.indexOf(pemFooter);
  
  if (startIdx === -1 || endIdx === -1) {
    throw new Error("Invalid private key format in Service Account JSON.");
  }
  
  const pemContents = privateKeyPem.substring(startIdx + pemHeader.length, endIdx);
  const cleanPem = pemContents.replace(/\s+/g, "");
  
  const binaryDerString = atob(cleanPem);
  const binaryDer = new Uint8Array(binaryDerString.length);
  for (let i = 0; i < binaryDerString.length; i++) {
    binaryDer[i] = binaryDerString.charCodeAt(i);
  }
  
  const key = await crypto.subtle.importKey(
    "pkcs8",
    binaryDer.buffer,
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: { name: "SHA-256" }
    },
    false,
    ["sign"]
  );
  
  const encoder = new TextEncoder();
  const dataToSign = encoder.encode(stringToSign);
  
  const signatureBuffer = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    dataToSign
  );
  
  const signatureArray = new Uint8Array(signatureBuffer);
  let binary = "";
  const len = signatureArray.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(signatureArray[i]);
  }
  const signatureEncoded = btoa(binary)
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
    
  const assertion = `${stringToSign}.${signatureEncoded}`;
  
  const response = await fetch(saJson.token_uri || "https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: assertion
    })
  });
  
  if (!response.ok) {
    const errorBody = await response.text();
    let parsedErr;
    try {
      parsedErr = JSON.parse(errorBody);
    } catch(e) {}
    const detail = parsedErr && parsedErr.error_description ? parsedErr.error_description : errorBody;
    throw new Error(`Google token exchange failed: ${detail}`);
  }
  
  return await response.json();
}

function loginGoogle() {
  const redirectUri = window.location.origin + window.location.pathname;
  const scope = "https://www.googleapis.com/auth/cloud-platform";
  const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GCS_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=${encodeURIComponent(scope)}`;
  window.location.href = url;
}

async function logoutGoogle() {
  localStorage.removeItem("gcs_access_token");
  localStorage.removeItem("gcs_token_expiry");
  localStorage.removeItem("gcs_service_account");
  localStorage.removeItem("gcs_manual_token_flag");
  
  // Delete settings from Supabase
  await deleteSettingFromSupabase("gcs_access_token");
  await deleteSettingFromSupabase("gcs_token_expiry");
  await deleteSettingFromSupabase("gcs_service_account");
  await deleteSettingFromSupabase("gcs_manual_token_flag");
  
  state.gcsFiles = [];
  state.filteredGcsFiles = [];
  
  // stop audio
  const audio = document.getElementById("gcsAudioElement");
  if (audio) {
    audio.pause();
    audio.src = "";
  }
  document.getElementById("gcsAudioPlayerSection").style.display = "none";
  
  renderGCSAuth();
}

function setupGCSEventListeners() {
  // Toggle Sidebar
  document.getElementById("btnOpenAudioSidebar").addEventListener("click", () => {
    document.getElementById("audioSidebar").classList.add("active");
    document.getElementById("audioSidebarBackdrop").classList.add("active");
    document.getElementById("audioSidebar").setAttribute("aria-hidden", "false");
    document.body.classList.add("audio-sidebar-open");
    
    // Populate parameters values
    const minVal = localStorage.getItem("gcs_min_call_length") || "";
    const maxVal = localStorage.getItem("gcs_max_call_length") || "";
    const minInput = document.getElementById("paramMinCallLength");
    const maxInput = document.getElementById("paramMaxCallLength");
    if (minInput) minInput.value = minVal;
    if (maxInput) maxInput.value = maxVal;
  });

  const closeSidebar = () => {
    document.getElementById("audioSidebar").classList.remove("active");
    document.getElementById("audioSidebarBackdrop").classList.remove("active");
    document.getElementById("audioSidebar").setAttribute("aria-hidden", "true");
    document.body.classList.remove("audio-sidebar-open");
  };

  document.getElementById("audioSidebarClose").addEventListener("click", closeSidebar);
  document.getElementById("audioSidebarBackdrop").addEventListener("click", closeSidebar);

  // Close audio player listener
  const btnCloseAudioPlayer = document.getElementById("btnCloseAudioPlayer");
  if (btnCloseAudioPlayer) {
    btnCloseAudioPlayer.addEventListener("click", () => {
      const audio = document.getElementById("gcsAudioElement");
      if (audio) {
        audio.pause();
        audio.src = "";
      }
      document.getElementById("gcsAudioPlayerSection").style.display = "none";
      renderGCSFileList();
    });
  }

  // Search and status filter inputs
  document.getElementById("gcsSearchInput").addEventListener("input", filterGCSFiles);
  document.getElementById("gcsFilterStatus").addEventListener("change", filterGCSFiles);

  // Close GCS Error banner listener
  const btnCloseGcsErrorBanner = document.getElementById("btnCloseGcsErrorBanner");
  const gcsAnalysisErrorBanner = document.getElementById("gcsAnalysisErrorBanner");
  if (btnCloseGcsErrorBanner && gcsAnalysisErrorBanner) {
    btnCloseGcsErrorBanner.addEventListener("click", () => {
      gcsAnalysisErrorBanner.style.display = "none";
    });
  }

  // Bulk selection listener
  const selectAllCheckbox = document.getElementById("gcsSelectAllCheckbox");
  if (selectAllCheckbox) {
    selectAllCheckbox.addEventListener("change", (e) => {
      const checked = e.target.checked;
      if (checked) {
        state.filteredGcsFiles.forEach(file => {
          state.selectedGcsFiles.add(file.name);
        });
      } else {
        state.filteredGcsFiles.forEach(file => {
          state.selectedGcsFiles.delete(file.name);
        });
      }
      renderGCSFileList();
      updateBulkActionUI();
    });
  }

  // Bulk analyze button listener
  const btnBulkAnalyze = document.getElementById("btnBulkAnalyze");
  if (btnBulkAnalyze) {
    btnBulkAnalyze.addEventListener("click", triggerBulkCallAnalysisWebhook);
  }

  // Bulk reset button listener
  const btnBulkReset = document.getElementById("btnBulkReset");
  if (btnBulkReset) {
    btnBulkReset.addEventListener("click", triggerBulkCallReset);
  }

  // STT Engine Dropdowns Setup
  const STT_MODELS = {
    google: [
      { value: "chirp", label: "chirp (Recommended)" },
      { value: "latest_long", label: "latest_long" },
      { value: "latest_short", label: "latest_short" }
    ],
    openai: [
      { value: "whisper-1", label: "whisper-1 (Recommended)" }
    ],
    gemini: [
      { value: "gemini-3.5-flash", label: "gemini-3.5-flash" }
    ],
    local: [
      { value: "local_whisper", label: "local_whisper" },
      { value: "parakeet", label: "parakeet" },
      { value: "whisperx", label: "whisperx" }
    ]
  };

  const sttProviderSelect = document.getElementById("sttProviderSelect");
  const sttModelSelect = document.getElementById("sttModelSelect");

  function updateSTTModelsList() {
    if (!sttProviderSelect || !sttModelSelect) return;
    const provider = sttProviderSelect.value;
    sttModelSelect.innerHTML = "";
    
    const models = STT_MODELS[provider] || [];
    models.forEach(model => {
      const opt = document.createElement("option");
      opt.value = model.value;
      opt.textContent = model.label;
      sttModelSelect.appendChild(opt);
    });
    
    localStorage.setItem("gcs_stt_provider", provider);
    localStorage.setItem("gcs_stt_model", sttModelSelect.value);
  }

  if (sttProviderSelect && sttModelSelect) {
    sttProviderSelect.addEventListener("change", updateSTTModelsList);
    sttModelSelect.addEventListener("change", () => {
      localStorage.setItem("gcs_stt_model", sttModelSelect.value);
    });

    // Load saved settings
    const savedProvider = localStorage.getItem("gcs_stt_provider") || "google";
    const savedModel = localStorage.getItem("gcs_stt_model");
    
    sttProviderSelect.value = savedProvider;
    updateSTTModelsList();
    
    if (savedModel && Array.from(sttModelSelect.options).some(o => o.value === savedModel)) {
      sttModelSelect.value = savedModel;
    }
  }

  // Save parameters listener
  const btnSaveParams = document.getElementById("btnSaveParameters");
  if (btnSaveParams) {
    btnSaveParams.addEventListener("click", async () => {
      const minVal = document.getElementById("paramMinCallLength").value.trim();
      const maxVal = document.getElementById("paramMaxCallLength").value.trim();
      
      localStorage.setItem("gcs_min_call_length", minVal);
      localStorage.setItem("gcs_max_call_length", maxVal);
      
      // Save parameters in Supabase settings
      if (minVal) {
        await saveSettingToSupabase("gcs_min_call_length", minVal);
      } else {
        await deleteSettingFromSupabase("gcs_min_call_length");
      }
      
      if (maxVal) {
        await saveSettingToSupabase("gcs_max_call_length", maxVal);
      } else {
        await deleteSettingFromSupabase("gcs_max_call_length");
      }
      
      // Show success alert
      const statusLabel = document.getElementById("paramSaveStatus");
      if (statusLabel) {
        statusLabel.style.display = "block";
        setTimeout(() => {
          statusLabel.style.display = "none";
        }, 3000);
      }
    });
  }

  // Audio elements events (sync CSS visualizer and active card icon)
  const audio = document.getElementById("gcsAudioElement");
  const visualizer = document.getElementById("waveVisualizer");

  audio.addEventListener("play", () => {
    visualizer.classList.add("playing");
    const activeIcon = document.querySelector(".gcs-file-item.active .gcs-file-play i");
    if (activeIcon) activeIcon.className = "fa-solid fa-pause";
    
    const drawerPlayBtn = document.getElementById("btnDrawerPlayAudio");
    if (drawerPlayBtn && drawerPlayBtn.style.display !== "none") {
      drawerPlayBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
      drawerPlayBtn.title = "Pause recording";
    }
  });

  audio.addEventListener("pause", () => {
    visualizer.classList.remove("playing");
    const activeIcon = document.querySelector(".gcs-file-item.active .gcs-file-play i");
    if (activeIcon) activeIcon.className = "fa-solid fa-play";
    
    const drawerPlayBtn = document.getElementById("btnDrawerPlayAudio");
    if (drawerPlayBtn && drawerPlayBtn.style.display !== "none") {
      drawerPlayBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
      drawerPlayBtn.title = "Play recording";
    }
  });

  audio.addEventListener("ended", () => {
    visualizer.classList.remove("playing");
    const activeIcon = document.querySelector(".gcs-file-item.active .gcs-file-play i");
    if (activeIcon) activeIcon.className = "fa-solid fa-play";
    
    const drawerPlayBtn = document.getElementById("btnDrawerPlayAudio");
    if (drawerPlayBtn && drawerPlayBtn.style.display !== "none") {
      drawerPlayBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
      drawerPlayBtn.title = "Play recording";
    }
    
    // Reset scrubber on end
    const scrubber = document.getElementById("drawerAudioScrubber");
    const currentTimeText = document.getElementById("drawerAudioCurrentTime");
    if (scrubber) scrubber.value = 0;
    if (currentTimeText) currentTimeText.textContent = "0:00";
  });

  // Track playback progress inside Details Drawer scrubber bar
  audio.addEventListener("timeupdate", () => {
    const scrubberContainer = document.getElementById("drawerAudioScrubberContainer");
    const scrubber = document.getElementById("drawerAudioScrubber");
    const currentTimeText = document.getElementById("drawerAudioCurrentTime");
    const durationTimeText = document.getElementById("drawerAudioDurationTime");
    
    if (scrubberContainer && scrubberContainer.style.display !== "none") {
      const curTime = audio.currentTime;
      const duration = audio.duration || 0;
      
      if (currentTimeText) currentTimeText.textContent = formatAudioTime(curTime);
      if (durationTimeText && duration > 0) durationTimeText.textContent = formatAudioTime(duration);
      
      if (scrubber && duration > 0) {
        scrubber.max = Math.floor(duration);
        scrubber.value = Math.floor(curTime);
      }
    }
  });

  // Seek audio when dragging scrubber range input
  const scrubber = document.getElementById("drawerAudioScrubber");
  if (scrubber) {
    scrubber.addEventListener("input", () => {
      audio.currentTime = scrubber.value;
      const currentTimeText = document.getElementById("drawerAudioCurrentTime");
      if (currentTimeText) {
        currentTimeText.textContent = formatAudioTime(scrubber.value);
      }
    });
  }
}

async function renderGCSAuth() {
  const token = await getGoogleAccessToken();
  const authCard = document.getElementById("gcsAuthCard");
  const explorerSection = document.getElementById("gcsExplorer");
  
  if (token) {
    const saJsonStr = localStorage.getItem("gcs_service_account");
    let connType = "Google OAuth";
    if (saJsonStr) {
      try {
        const sa = JSON.parse(saJsonStr);
        connType = `Service Account (${sa.client_email})`;
      } catch (e) {
        connType = "Service Account";
      }
    } else if (localStorage.getItem("gcs_manual_token_flag")) {
      connType = "Manual Access Token";
    }
    
    authCard.innerHTML = `
      <div style="font-weight: 700; font-size: 0.95rem; color: var(--color-positive); margin-bottom: 0.5rem;">
        <i class="fa-solid fa-circle-check"></i> Connected
      </div>
      <div class="gcs-auth-text" style="font-size: 0.78rem; margin-bottom: 0.75rem;">
        Method: <strong>${connType}</strong><br>
        Bucket: <strong>${GCS_BUCKET}/${GCS_PREFIX}</strong>
      </div>
      <button id="btnDisconnectGCS" class="btn-secondary" style="font-size: 0.75rem; padding: 0.35rem 0.75rem; width: 100%;">
        <i class="fa-solid fa-right-from-bracket"></i> Disconnect
      </button>
    `;
    document.getElementById("btnDisconnectGCS").addEventListener("click", logoutGoogle);
    
    explorerSection.style.display = "flex";
    loadGCSFiles(token);
  } else {
    authCard.innerHTML = `
      <div style="font-weight: 700; font-size: 0.95rem; color: var(--text-primary); margin-bottom: 0.75rem; display: flex; align-items: center; justify-content: space-between;">
        <span><i class="fa-solid fa-circle-xmark" style="color: var(--text-muted); margin-right: 0.35rem;"></i> Disconnected</span>
      </div>

      <div class="gcs-tabs">
        <button class="gcs-tab-btn active" data-tab="oauth">
          <i class="fa-brands fa-google"></i> Google Login
        </button>
        <button class="gcs-tab-btn" data-tab="sa">
          <i class="fa-solid fa-key"></i> Service Account
        </button>
        <button class="gcs-tab-btn" data-tab="token">
          <i class="fa-solid fa-ticket"></i> Access Token
        </button>
      </div>

      <!-- OAuth Tab Content -->
      <div id="tabContentOAuth" class="gcs-tab-content active">
        <div class="gcs-auth-text" style="font-size: 0.78rem;">
          Authenticate using Google's standard login. Note: Google OAuth requires accessing this dashboard via <code>localhost</code> or a secure domain. Raw IP addresses (e.g. 10.115.14.92) are blocked.
        </div>
        <button id="btnConnectGCS" class="btn-primary" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.65rem; font-size: 0.8rem;">
          <i class="fa-brands fa-google"></i> Connect Google Storage
        </button>
        <div class="gcs-help-box">
          <strong>How to use OAuth on a remote server:</strong>
          <div style="margin-top: 0.25rem;">
            Run SSH port-forwarding on your machine:<br>
            <code>ssh -L 42913:localhost:42913 user@10.115.14.92</code><br>
            Then open <a class="gcs-help-link" href="http://localhost:42913" target="_blank">http://localhost:42913</a>.
          </div>
        </div>
      </div>

      <!-- Service Account Tab Content -->
      <div id="tabContentSA" class="gcs-tab-content">
        <div class="gcs-auth-text" style="font-size: 0.78rem; margin-bottom: 0.75rem;">
          Upload or paste a Google Cloud Service Account private key JSON. Stored <strong>only inside your browser's local storage</strong> (and your private Supabase database if configured).
        </div>
        
        <div class="gcs-input-group">
          <label class="gcs-input-label">Upload JSON File</label>
          <label for="saFileInput" class="gcs-file-upload-label">
            <i class="fa-solid fa-file-import"></i> <span id="saUploadFileName">Choose JSON File</span>
          </label>
          <input type="file" id="saFileInput" accept=".json" style="display: none;">
        </div>
        
        <div class="gcs-input-group">
          <label class="gcs-input-label">Or Paste JSON Content</label>
          <textarea id="saTextarea" class="gcs-input" placeholder='{ "type": "service_account", ... }'></textarea>
        </div>
        
        <button id="btnConnectSA" class="btn-primary" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.65rem; font-size: 0.8rem;">
          <i class="fa-solid fa-plug"></i> Connect Service Account
        </button>
        
        <div id="saErrorMsg" style="color: var(--color-negative); font-size: 0.72rem; margin-top: 0.5rem; display: none; line-height: 1.3;"></div>
        
        ${!state.supabaseSettingsEnabled ? `
        <div class="gcs-help-box" style="border-left-color: var(--color-warning); background: rgba(230, 92, 0, 0.03); margin-top: 0.75rem; font-size: 0.68rem;">
          <i class="fa-solid fa-triangle-exclamation" style="color: var(--color-warning); margin-right: 0.25rem;"></i>
          <strong>Multi-PC Persistence (Optional):</strong> To stay connected persistently, run this SQL in your Supabase SQL Editor:
          <pre style="background: rgba(0, 0, 0, 0.2); padding: 0.4rem; border-radius: 3px; font-size: 0.62rem; margin: 0.35rem 0 0; overflow-x: auto; color: #fff; font-family: monospace;">DROP TABLE IF EXISTS dashboard_settings;

CREATE TABLE dashboard_settings (
  id integer PRIMARY KEY DEFAULT 1,
  gcs_service_account text,
  gcs_access_token text,
  gcs_token_expiry text,
  gcs_manual_token_flag text,
  min_call_length numeric,
  max_call_length numeric,
  agent_mappings text,
  predefined_questions text,
  CONSTRAINT single_row CHECK (id = 1)
);

INSERT INTO dashboard_settings (id) VALUES (1);</pre>
        </div>
        ` : ''}
      </div>

      <!-- Manual Token Tab Content -->
      <div id="tabContentToken" class="gcs-tab-content">
        <div class="gcs-auth-text" style="font-size: 0.78rem; margin-bottom: 0.75rem;">
          Paste a temporary OAuth access token directly. This token is short-lived (usually expires in 1 hour) but works on raw IP addresses.
        </div>
        
        <div class="gcs-input-group">
          <label class="gcs-input-label">OAuth Access Token</label>
          <input type="password" id="gcsManualTokenInput" class="gcs-input" placeholder="ya29.a0AfH6SMA...">
        </div>
        
        <button id="btnConnectManualToken" class="btn-primary" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.65rem; font-size: 0.8rem;">
          <i class="fa-solid fa-key"></i> Apply Access Token
        </button>
        
        <div class="gcs-help-box">
          <strong>How to generate a token:</strong>
          <div style="margin-top: 0.25rem;">
            If you have the Google Cloud SDK (gcloud) installed, run:<br>
            <code>gcloud auth print-access-token</code>
          </div>
        </div>
        
        <div id="manualTokenErrorMsg" style="color: var(--color-negative); font-size: 0.72rem; margin-top: 0.5rem; display: none; line-height: 1.3;"></div>
      </div>
    `;
    
    // Add event listeners for tabs
    const tabs = authCard.querySelectorAll(".gcs-tab-btn");
    tabs.forEach(tab => {
      tab.addEventListener("click", () => {
        tabs.forEach(t => t.classList.remove("active"));
        authCard.querySelectorAll(".gcs-tab-content").forEach(c => c.classList.remove("active"));
        
        tab.classList.add("active");
        const tabIdMap = {
          oauth: "tabContentOAuth",
          sa: "tabContentSA",
          token: "tabContentToken"
        };
        const contentId = tabIdMap[tab.dataset.tab];
        const content = document.getElementById(contentId);
        if (content) content.classList.add("active");
      });
    });
    
    // Google OAuth login event listener
    document.getElementById("btnConnectGCS").addEventListener("click", loginGoogle);
    
    // Service Account upload listeners
    const saFileInput = document.getElementById("saFileInput");
    const saUploadFileName = document.getElementById("saUploadFileName");
    const saTextarea = document.getElementById("saTextarea");
    const saErrorMsg = document.getElementById("saErrorMsg");
    
    saFileInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      saUploadFileName.textContent = file.name;
      const reader = new FileReader();
      reader.onload = (evt) => {
        saTextarea.value = evt.target.result;
      };
      reader.readAsText(file);
    });
    
    document.getElementById("btnConnectSA").addEventListener("click", async () => {
      saErrorMsg.style.display = "none";
      const saVal = saTextarea.value.trim();
      if (!saVal) {
        saErrorMsg.textContent = "Error: Please paste or upload a Service Account JSON key file.";
        saErrorMsg.style.display = "block";
        return;
      }
      
      try {
        const saJson = JSON.parse(saVal);
        if (!saJson.client_email || !saJson.private_key) {
          saErrorMsg.textContent = "Error: Invalid Service Account JSON. Missing client_email or private_key.";
          saErrorMsg.style.display = "block";
          return;
        }
        
        const hasSubtleCrypto = !!(window.crypto && window.crypto.subtle);
        if (!hasSubtleCrypto) {
          saErrorMsg.textContent = "Warning: Browser-based Service Account key signing requires a secure context (HTTPS or localhost) to use cryptography APIs. It is blocked on insecure HTTP IP addresses like this. Please use the 'Access Token' tab instead, or connect via localhost port forwarding.";
          saErrorMsg.style.display = "block";
          return;
        }
        
        // Save SA JSON locally
        localStorage.setItem("gcs_service_account", JSON.stringify(saJson));
        localStorage.removeItem("gcs_manual_token_flag");
        
        // Save to Supabase
        await saveSettingToSupabase("gcs_service_account", JSON.stringify(saJson));
        await deleteSettingFromSupabase("gcs_manual_token_flag");
        
        // Show loading spinner
        const btn = document.getElementById("btnConnectSA");
        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Authenticating...`;
        
        const testToken = await getGoogleAccessToken();
        if (testToken) {
          renderGCSAuth();
        } else {
          btn.disabled = false;
          btn.innerHTML = originalText;
          saErrorMsg.textContent = "Error: Failed to obtain access token from Google. Check your Service Account key permissions.";
          saErrorMsg.style.display = "block";
        }
      } catch (err) {
        console.error("Service Account Auth Error:", err);
        saErrorMsg.textContent = `Error: ${err.message || "Invalid JSON format"}`;
        saErrorMsg.style.display = "block";
      }
    });
    
    // Manual Token listener
    const manualTokenInput = document.getElementById("gcsManualTokenInput");
    const manualTokenErrorMsg = document.getElementById("manualTokenErrorMsg");
    
    document.getElementById("btnConnectManualToken").addEventListener("click", async () => {
      manualTokenErrorMsg.style.display = "none";
      const tokenVal = manualTokenInput.value.trim();
      if (!tokenVal) {
        manualTokenErrorMsg.textContent = "Error: Please enter an access token.";
        manualTokenErrorMsg.style.display = "block";
        return;
      }
      
      // Store token with 1 hour expiration
      const expiry = Date.now() + 3600 * 1000;
      localStorage.setItem("gcs_access_token", tokenVal);
      localStorage.setItem("gcs_token_expiry", `v3_${expiry}`);
      localStorage.setItem("gcs_manual_token_flag", "true");
      localStorage.removeItem("gcs_service_account");
      
      // Save to Supabase
      await saveSettingToSupabase("gcs_access_token", tokenVal);
      await saveSettingToSupabase("gcs_token_expiry", `v3_${expiry}`);
      await saveSettingToSupabase("gcs_manual_token_flag", "true");
      await deleteSettingFromSupabase("gcs_service_account");
      
      renderGCSAuth();
    });
    
    explorerSection.style.display = "none";
  }
}

async function fetchAllGcsObjects(prefix, token) {
  let objects = [];
  let pageToken = "";
  
  do {
    let url = `https://storage.googleapis.com/storage/v1/b/${GCS_BUCKET}/o?prefix=${encodeURIComponent(prefix)}`;
    if (pageToken) {
      url += `&pageToken=${encodeURIComponent(pageToken)}`;
    }
    
    const resp = await fetch(url, {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });
    
    if (!resp.ok) {
      throw new Error(`Failed to list GCS objects for prefix ${prefix}: ${resp.status}`);
    }
    
    const data = await resp.json();
    if (data.items) {
      objects.push(...data.items);
    }
    pageToken = data.nextPageToken || "";
  } while (pageToken);
  
  return objects;
}

async function loadGCSFiles(token) {
  const listContainer = document.getElementById("gcsFileList");
  listContainer.innerHTML = `
    <div style="text-align: center; color: var(--text-secondary); padding: 2rem;">
      <i class="fa-solid fa-spinner fa-spin" style="font-size: 1.5rem; margin-bottom: 0.5rem; color: var(--accent-primary);"></i>
      <div>Listing GCS recordings & transcripts...</div>
    </div>
  `;

  try {
    const [audioItems, transItems, cxTransItems] = await Promise.all([
      fetchAllGcsObjects(GCS_PREFIX, token),
      fetchAllGcsObjects("transcripts/", token),
      fetchAllGcsObjects("cx-transcripts/", token)
    ]);

    const allTranscriptItems = [...transItems, ...cxTransItems];
    state.gcsTranscriptObjects = allTranscriptItems;
    state.gcsTranscriptsMap = {};
    
    allTranscriptItems.forEach(item => {
      if (!item.name || !item.name.endsWith(".json")) return;
      const basename = item.name.split("/").pop();
      if (basename.includes("_transcript_")) {
        const parts = basename.split("_transcript_");
        const audioPrefix = parts[0];
        const sessionId = parts[1].replace(".json", "");
        state.gcsTranscriptsMap[audioPrefix] = sessionId;
        state.gcsTranscriptsMap[audioPrefix.toLowerCase()] = sessionId;
      }
    });
    
    state.gcsFiles = audioItems.filter(item => {
      return item.name && item.name.toLowerCase().endsWith(".mp3") && item.name !== GCS_PREFIX;
    });
    
    state.filteredGcsFiles = [...state.gcsFiles];
    filterGCSFiles();
    
  } catch (error) {
    console.error("GCS list error:", error);
    listContainer.innerHTML = `
      <div style="text-align: center; color: var(--color-negative); padding: 1.5rem; border: 1px dashed rgba(244, 63, 94, 0.2); border-radius: var(--radius-md);">
        <i class="fa-solid fa-triangle-exclamation" style="font-size: 1.5rem; margin-bottom: 0.5rem;"></i>
        <div style="font-weight: bold; font-size: 0.85rem; margin-bottom: 0.25rem;">Failed to Load Files</div>
        <div style="font-size: 0.75rem; opacity: 0.8;">${error.message}</div>
      </div>
    `;
  }
}

function findMatchedCallForGCSFile(file) {
  const displayName = file.name.substring(GCS_PREFIX.length);
  
  // 1. Try matching using audio_file_name in Supabase (robust case-insensitive substring checks)
  let matchedCall = state.allCalls.find(c => {
    if (!c.audio_file_name) return false;
    const cleanDBName = c.audio_file_name.trim().toLowerCase();
    const cleanDisplay = displayName.trim().toLowerCase();
    const cleanFile = file.name.trim().toLowerCase();
    return cleanDBName === cleanDisplay || 
           cleanDBName === cleanFile ||
           cleanDBName.includes(cleanDisplay) ||
           cleanDisplay.includes(cleanDBName);
  });
  
  if (matchedCall) {
    return { matchedCall, status: "analyzed" };
  }
  
  // 2. Fallback to GCS transcript JSON name mappings
  const audioPrefix = displayName.replace(".mp3", "");
  const sessionId = state.gcsTranscriptsMap[audioPrefix] || state.gcsTranscriptsMap[audioPrefix.toLowerCase()];
  if (sessionId) {
    matchedCall = state.allCalls.find(c => {
      const callSessionId = formatConvName(c.conversation_name).toLowerCase();
      return callSessionId === sessionId.toLowerCase() || 
             c.conversation_name.toLowerCase().includes(sessionId.toLowerCase());
    });
    return {
      matchedCall,
      status: matchedCall ? "analyzed" : "transcribed"
    };
  }
  
  return { matchedCall: null, status: "pending" };
}

function filterGCSFiles() {
  const query = document.getElementById("gcsSearchInput").value.toLowerCase().trim();
  const status = document.getElementById("gcsFilterStatus").value;
  
  state.filteredGcsFiles = state.gcsFiles.filter(file => {
    // 1. Search text match
    const displayName = file.name.substring(GCS_PREFIX.length);
    const matchesSearch = displayName.toLowerCase().includes(query);
    if (!matchesSearch) return false;
    
    // 2. Status match
    if (status === "all") return true;
    
    const { status: fileStatus } = findMatchedCallForGCSFile(file);
    return fileStatus === status;
  });
  
  renderGCSFileList();
}

function viewCallAnalytics(call) {
  // Close recordings sidebar
  document.getElementById("audioSidebar").classList.remove("active");
  document.getElementById("audioSidebarBackdrop").classList.remove("active");
  document.getElementById("audioSidebar").setAttribute("aria-hidden", "true");
  document.body.classList.remove("audio-sidebar-open");
  
  // Open Call details drawer
  openDrawer(call);
}

function renderGCSFileList() {
  const container = document.getElementById("gcsFileList");
  container.innerHTML = "";

  if (state.filteredGcsFiles.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; color: var(--text-muted); padding: 2rem; font-size: 0.85rem;">
        No recordings found matching search.
      </div>
    `;
    return;
  }

  const audio = document.getElementById("gcsAudioElement");

  state.filteredGcsFiles.forEach(file => {
    const item = document.createElement("div");
    item.className = "gcs-file-item";
    item.dataset.name = file.name;

    const displayName = file.name.substring(GCS_PREFIX.length);
    
    const sizeBytes = Number(file.size);
    let sizeStr = "-";
    if (!isNaN(sizeBytes)) {
      if (sizeBytes < 1024 * 1024) {
        sizeStr = `${(sizeBytes / 1024).toFixed(1)} KB`;
      } else {
        sizeStr = `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
      }
    }

    const updatedDate = file.updated ? new Date(file.updated).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }) : "-";

    const isCurrentFile = audio.src && audio.src.includes(encodeURIComponent(file.name));
    const isPlaying = isCurrentFile && !audio.paused;
    
    let playIconClass = "fa-solid fa-play";
    let isActiveClass = "";
    if (isCurrentFile) {
      isActiveClass = "active";
      playIconClass = isPlaying ? "fa-solid fa-pause" : "fa-solid fa-play";
      if (audio.networkState === HTMLMediaElement.NETWORK_LOADING && audio.paused) {
        playIconClass = "fa-solid fa-spinner fa-spin";
      }
    }

    // Resolve analysis status & matched call
    const { matchedCall, status: fileStatus } = findMatchedCallForGCSFile(file);
    
    let statusBadge = "";
    const ongoing = state.ongoingAnalysis[file.name];
    if (ongoing === "pending") {
      statusBadge = `<span class="gcs-status-badge badge-processing"><i class="fa-solid fa-spinner fa-spin"></i> Processing</span>`;
    } else if (ongoing === "error") {
      statusBadge = `<span class="gcs-status-badge badge-error"><i class="fa-solid fa-circle-xmark"></i> Error</span>`;
    } else if (fileStatus === "analyzed") {
      statusBadge = `<span class="gcs-status-badge badge-analyzed"><i class="fa-solid fa-circle-check"></i> Analyzed</span>`;
    } else if (fileStatus === "transcribed") {
      statusBadge = `<span class="gcs-status-badge badge-transcribed"><i class="fa-solid fa-file-invoice"></i> Transcribed</span>`;
    } else {
      statusBadge = `<span class="gcs-status-badge badge-pending"><i class="fa-solid fa-circle-notch"></i> Pending</span>`;
    }

    const canReset = fileStatus !== "pending" && ongoing !== "pending";

    item.innerHTML = `
      <div class="gcs-checkbox-wrapper" style="margin-right: 0.5rem; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
        <input type="checkbox" class="gcs-item-checkbox" data-name="${file.name}" ${state.selectedGcsFiles.has(file.name) ? 'checked' : ''} style="cursor: pointer; width: 15px; height: 15px;" ${ongoing === "pending" ? 'disabled' : ''}>
      </div>
      <div class="gcs-file-info" style="flex: 1; min-width: 0;">
        <span class="gcs-file-name" title="${displayName}" style="display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${displayName}</span>
        <span class="gcs-file-meta" style="display: block; margin-top: 0.15rem;">${sizeStr} &bull; ${updatedDate}</span>
        <div class="gcs-file-status-row" style="margin-top: 0.4rem; display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
          ${statusBadge}
          ${matchedCall ? `<button class="gcs-view-details-btn" title="Open Call Analytics Details"><i class="fa-solid fa-chart-simple"></i> Analytics</button>` : ''}
          <button class="gcs-download-recording-btn" title="Download MP3 recording"><i class="fa-solid fa-cloud-arrow-down"></i> ${state.lang === 'es' ? 'Descargar' : 'Download'}</button>
          ${canReset ? `<button class="gcs-delete-recording-btn" title="Reset recording: Delete transcript and analysis data"><i class="fa-solid fa-trash-can"></i> Reset</button>` : ''}
        </div>
      </div>
      <div class="gcs-file-play" style="flex-shrink: 0; margin-left: 0.5rem;">
        <i class="${playIconClass}"></i>
      </div>
    `;

    if (matchedCall) {
      item.classList.add("analyzed-call");
      item.title = "Click to view analytics in dashboard, or click play icon to play recording";
    } else {
      item.title = "This call has not been analyzed yet (click checkbox to select, or play icon to play)";
    }

    if (isActiveClass) {
      item.classList.add("active");
    }

    // Bind card click (only if analyzed; non-analyzed cards do nothing on card body click)
    if (matchedCall) {
      item.addEventListener("click", () => {
        viewCallAnalytics(matchedCall);
      });
    }

    // Bind play button click (stops propagation to prevent card-level viewCallAnalytics click)
    const playBtn = item.querySelector(".gcs-file-play");
    if (playBtn) {
      playBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        playGCSAudio(file);
      });
      playBtn.title = isPlaying ? "Pause recording" : "Play recording";
    }

    // Bind checkbox change (stops propagation to prevent card click)
    const cb = item.querySelector(".gcs-item-checkbox");
    if (cb) {
      cb.addEventListener("click", (e) => {
        e.stopPropagation();
      });
      cb.addEventListener("change", (e) => {
        const checked = e.target.checked;
        if (checked) {
          state.selectedGcsFiles.add(file.name);
        } else {
          state.selectedGcsFiles.delete(file.name);
        }
        updateBulkActionUI();
      });
    }

    if (matchedCall) {
      const viewDetailsBtn = item.querySelector(".gcs-view-details-btn");
      if (viewDetailsBtn) {
        viewDetailsBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          viewCallAnalytics(matchedCall);
        });
      }
    }

    // Bind GCS item reset/delete click
    const deleteBtn = item.querySelector(".gcs-delete-recording-btn");
    if (deleteBtn) {
      deleteBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        resetRecordingData(file, deleteBtn);
      });
    }

    // Bind GCS item download click
    const downloadBtn = item.querySelector(".gcs-download-recording-btn");
    if (downloadBtn) {
      downloadBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        downloadGCSFile(file);
      });
    }

    container.appendChild(item);
  });

  // Update select all count and disabled states at the end of rendering
  updateBulkActionUI();
}

async function playGCSAudio(file) {
  const audio = document.getElementById("gcsAudioElement");
  const isCurrentFile = audio.src && audio.src.includes(encodeURIComponent(file.name));
  
  if (isCurrentFile) {
    if (audio.paused) {
      audio.play().catch(err => console.error("Audio playback error:", err));
    } else {
      audio.pause();
    }
    return;
  }

  // Set active class and play icon to spinner during loading
  document.querySelectorAll(".gcs-file-item").forEach(el => {
    el.classList.remove("active");
    const icon = el.querySelector(".gcs-file-play i");
    if (icon) icon.className = "fa-solid fa-play";
  });

  const activeEl = document.querySelector(`.gcs-file-item[data-name="${CSS.escape(file.name)}"]`);
  if (activeEl) {
    activeEl.classList.add("active");
    const icon = activeEl.querySelector(".gcs-file-play i");
    if (icon) icon.className = "fa-solid fa-spinner fa-spin";
  }

  const token = await getGoogleAccessToken();
  if (!token) {
    logoutGoogle();
    return;
  }

  const displayName = file.name.substring(GCS_PREFIX.length);
  document.getElementById("currentPlayerTitle").textContent = displayName;
  
  document.getElementById("gcsAudioPlayerSection").style.display = "block";

  const mediaUrl = `https://storage.googleapis.com/storage/v1/b/${GCS_BUCKET}/o/${encodeURIComponent(file.name)}?alt=media&access_token=${token}`;
  
  audio.src = mediaUrl;
  audio.load();
  audio.play().then(() => {
    const icon = activeEl ? activeEl.querySelector(".gcs-file-play i") : null;
    if (icon) icon.className = "fa-solid fa-pause";
  }).catch(err => {
    console.error("Audio playback error:", err);
    const icon = activeEl ? activeEl.querySelector(".gcs-file-play i") : null;
    if (icon) icon.className = "fa-solid fa-play";
  });
}

async function downloadGCSFile(file) {
  const token = await getGoogleAccessToken();
  if (!token) {
    logoutGoogle();
    return;
  }
  
  const displayName = file.name.substring(GCS_PREFIX.length);
  const mediaUrl = `https://storage.googleapis.com/storage/v1/b/${GCS_BUCKET}/o/${encodeURIComponent(file.name)}?alt=media&access_token=${token}`;
  
  // Find download button inside DOM to update its icon to spinner
  const dlBtn = document.querySelector(`.gcs-file-item[data-name="${CSS.escape(file.name)}"] .gcs-download-recording-btn`);
  const drawerDlBtn = document.getElementById("btnDrawerDownloadAudio");
  const isDrawerBtnActive = drawerDlBtn && drawerDlBtn.style.display !== "none" && file.name.endsWith(document.getElementById("drawerAudioFileName").textContent);

  const originalHtml = dlBtn ? dlBtn.innerHTML : "";
  const originalDrawerHtml = drawerDlBtn ? drawerDlBtn.innerHTML : "";

  if (dlBtn) {
    dlBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ${state.lang === 'es' ? 'Descargando' : 'Downloading'}`;
    dlBtn.disabled = true;
  }
  if (isDrawerBtnActive) {
    drawerDlBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i>`;
    drawerDlBtn.disabled = true;
  }

  try {
    const response = await fetch(mediaUrl);
    if (!response.ok) throw new Error("Failed to fetch file from storage");
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = displayName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Download failed:", error);
    alert(state.lang === 'es' ? "No se pudo descargar la grabación. Por favor intente de nuevo." : "Could not download the recording. Please try again.");
  } finally {
    if (dlBtn) {
      dlBtn.innerHTML = originalHtml;
      dlBtn.disabled = false;
    }
    if (drawerDlBtn) {
      drawerDlBtn.innerHTML = originalDrawerHtml;
      drawerDlBtn.disabled = false;
    }
  }
}

function updateBulkActionUI() {
  const selectedCount = state.selectedGcsFiles.size;
  const countText = document.getElementById("gcsSelectedCountText");
  const bulkAnalyzeBtn = document.getElementById("btnBulkAnalyze");
  const bulkResetBtn = document.getElementById("btnBulkReset");
  const selectAllCheckbox = document.getElementById("gcsSelectAllCheckbox");
  
  if (countText) {
    countText.textContent = `${selectedCount} selected`;
  }
  
  if (bulkAnalyzeBtn) {
    const hasAnalyzable = state.filteredGcsFiles.some(file => 
      state.selectedGcsFiles.has(file.name) && findMatchedCallForGCSFile(file).status !== "analyzed"
    );
    bulkAnalyzeBtn.disabled = !hasAnalyzable;
  }
  
  if (bulkResetBtn) {
    const hasResettable = state.filteredGcsFiles.some(file => 
      state.selectedGcsFiles.has(file.name) && findMatchedCallForGCSFile(file).status !== "pending"
    );
    bulkResetBtn.disabled = !hasResettable;
  }
  
  if (selectAllCheckbox) {
    if (state.filteredGcsFiles.length === 0) {
      selectAllCheckbox.checked = false;
      selectAllCheckbox.disabled = true;
    } else {
      selectAllCheckbox.disabled = false;
      const allSelected = state.filteredGcsFiles.every(file => state.selectedGcsFiles.has(file.name));
      selectAllCheckbox.checked = allSelected;
    }
  }
}

async function triggerBulkCallAnalysisWebhook() {
  const btn = document.getElementById("btnBulkAnalyze");
  const selectAllCheckbox = document.getElementById("gcsSelectAllCheckbox");
  if (!btn) return;
  const originalHtml = btn.innerHTML;
  
  const filesToAnalyze = state.filteredGcsFiles.filter(file => state.selectedGcsFiles.has(file.name));
  if (filesToAnalyze.length === 0) return;
  
  const sttProvider = document.getElementById("sttProviderSelect") ? document.getElementById("sttProviderSelect").value : "google";
  const sttModel = document.getElementById("sttModelSelect") ? document.getElementById("sttModelSelect").value : "chirp";
  
  btn.disabled = true;
  if (selectAllCheckbox) selectAllCheckbox.disabled = true;
  
  const total = filesToAnalyze.length;
  let completed = 0;
  let successful = 0;
  
  btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Triggering (0/${total})...`;
  
  const webhookUrl = "https://n8n102.i4vision.us/webhook/cdf5e5e5-f8fb-42a6-902d-d5ca4c97d1a9";
  
  // Hide old error banner if visible
  const gcsAnalysisErrorBanner = document.getElementById("gcsAnalysisErrorBanner");
  if (gcsAnalysisErrorBanner) gcsAnalysisErrorBanner.style.display = "none";
  
  // Set all selected files to pending, track start times, and re-render sidebar immediately
  state.analysisStartTimes = state.analysisStartTimes || {};
  filesToAnalyze.forEach(file => {
    state.ongoingAnalysis[file.name] = "pending";
    state.analysisStartTimes[file.name] = Date.now();
  });
  renderGCSFileList();
  
  // Disable checkboxes visually during processing
  document.querySelectorAll(".gcs-item-checkbox").forEach(cb => cb.disabled = true);
  
  // Fire webhook requests in parallel
  const promises = filesToAnalyze.map(async (file) => {
    const displayName = file.name.substring(GCS_PREFIX.length);
    const startFetch = Date.now();
    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          audio_file_name: displayName,
          filename: displayName,
          file_name: displayName,
          gcs_path: file.name,
          stt_provider: sttProvider,
          stt_model: sttModel
        })
      });
      
      let isSuccess = false;
      if (response.ok || response.status === 200 || response.status === 201) {
        try {
          // Read response as text first to handle both JSON and plain text error payloads safely
          const rawText = await response.text();
          let parsedData = null;
          try {
            parsedData = JSON.parse(rawText);
          } catch (e) {}

          if (parsedData) {
            // Stringify and perform case-insensitive keyword search for errors
            const stringified = JSON.stringify(parsedData).toLowerCase();
            const hasErrorKeyword = stringified.includes("error") || 
                                    stringified.includes("fail") || 
                                    stringified.includes("exception") || 
                                    stringified.includes("reject") ||
                                    stringified.includes("invalid");
            
            // Check explicit properties
            const hasErrorProperty = !!(parsedData.error || 
                                        parsedData.status === "error" || 
                                        parsedData.status === "failed" ||
                                        parsedData.success === false || 
                                        parsedData.code === 500 || 
                                        parsedData.code === 400);

            if (hasErrorKeyword || hasErrorProperty) {
              isSuccess = false;
              console.error("n8n returned error payload for file:", file.name, parsedData);
            } else {
              isSuccess = true;
            }
          } else {
            // If response is not JSON, check for text warning terms
            const lowerText = rawText.toLowerCase();
            if (lowerText.includes("error") || lowerText.includes("fail") || lowerText.includes("exception") || lowerText.includes("reject")) {
              isSuccess = false;
              console.error("n8n returned text error for file:", file.name, rawText);
            } else {
              isSuccess = true;
            }
          }
        } catch (parseErr) {
          isSuccess = false;
          console.error("Could not parse n8n response:", file.name, parseErr);
        }
      }
      
      if (isSuccess) {
        state.ongoingAnalysis[file.name] = "success";
        successful++;
      } else {
        state.ongoingAnalysis[file.name] = "error";
      }
    } catch (err) {
      const duration = Date.now() - startFetch;
      // If the fetch took more than 40 seconds before failing/timing out, treat it as a proxy gateway timeout.
      // We keep it as "pending" so background database polling can resolve it synchronously!
      if (duration > 40000) {
        console.warn(`Webhook request for ${file.name} timed out after ${duration}ms. Retaining pending state for polling.`);
        // Keep status as pending
      } else {
        console.error("Error triggering analysis for file:", file.name, err);
        state.ongoingAnalysis[file.name] = "error";
      }
    } finally {
      completed++;
      btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Triggering (${completed}/${total})...`;
      renderGCSFileList();
    }
  });
  
  await Promise.all(promises);
  
  // Refresh Supabase & GCS tokens/files once immediately to reflect any instant webhook completions
  await fetchCallData();
  const freshToken = await getGoogleAccessToken();
  if (freshToken) {
    await loadGCSFiles(freshToken);
  }
  
  // Re-enable GCS checkboxes (excluding files that are actively polling)
  document.querySelectorAll(".gcs-item-checkbox").forEach(cb => {
    const name = cb.getAttribute("data-name");
    if (state.ongoingAnalysis[name] !== "pending") {
      cb.disabled = false;
    }
  });
  
  // Start GCS & Supabase polling in background to support 3-minute analysis executions
  startAnalysisPolling();
  
  // Evaluate immediate errors (marked as "error")
  let immediateErrors = 0;
  filesToAnalyze.forEach(file => {
    const ongoing = state.ongoingAnalysis[file.name];
    const { status: fileStatus } = findMatchedCallForGCSFile(file);
    const isSuccess = ongoing === "success" || fileStatus === "analyzed" || fileStatus === "transcribed";
    
    if (isSuccess) {
      state.selectedGcsFiles.delete(file.name);
      delete state.ongoingAnalysis[file.name];
      if (state.analysisStartTimes) delete state.analysisStartTimes[file.name];
    } else if (ongoing === "error") {
      immediateErrors++;
    }
  });
  
  let timeoutDuration = 2000;
  if (immediateErrors > 0) {
    timeoutDuration = 8000; // Show failure message on button for 8 seconds
    btn.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> Failed ${immediateErrors}/${total}`;
    btn.style.background = "var(--color-negative)";
    btn.style.borderColor = "var(--color-negative)";
    
    if (gcsAnalysisErrorBanner) {
      const errorText = document.getElementById("gcsAnalysisErrorText");
      if (errorText) {
        errorText.textContent = `Triggering failed for ${immediateErrors} recording(s). Check the red cards below.`;
      }
      gcsAnalysisErrorBanner.style.display = "flex";
    }
  } else {
    // If all tasks are successfully polling in background
    btn.innerHTML = `<i class="fa-solid fa-circle-check"></i> Dispatched ${total} job(s)`;
  }
  
  renderGCSFileList();
  updateBulkActionUI();
  
  setTimeout(() => {
    btn.disabled = false;
    btn.innerHTML = originalHtml;
    btn.style.background = "";
    btn.style.borderColor = "";
    if (selectAllCheckbox) selectAllCheckbox.disabled = false;
    
    renderGCSFileList();
    updateBulkActionUI();
  }, timeoutDuration);
}

function convertToCSV(arr) {
  const headers = [
    "Call ID", "Audio Filename", "Agent Name", "Duration (Min)", 
    "Sentiment", "Risk Level", "Resolution Status", "Agent Score (0-10)", 
    "Total Cost (USD)", "Category", 
    "STT Provider", "STT Model", "STT Minutes", "STT Cost (USD)", "Total Processing Cost (USD)", "Created At"
  ];
  
  const rows = arr.map(c => {
    const agentName = getAgentName(c);
    const score = c.agent_score ? Number(c.agent_score).toFixed(1) : "N/A";
    
    return [
      c.conversation_name || "",
      c.audio_file_name || "",
      agentName,
      c.audio_duration_minutes || "",
      c.sentiment || "",
      c.risk_level || "",
      c.resolution_status || "",
      score,
      c.total_cost_usd || "",
      c.category || "",
      c.stt_provider || "",
      c.stt_model || "",
      c.stt_minutes || "",
      c.stt_cost_usd || "",
      c.total_processing_cost_usd || "",
      c.created_at || ""
    ].map(val => {
      let str = String(val).replace(/"/g, '""');
      if (str.includes(",") || str.includes("\n") || str.includes('"')) {
        str = `"${str}"`;
      }
      return str;
    });
  });
  
  return [headers.join(","), ...rows.map(r => r.join(","))].join("\r\n");
}

function downloadCSV(csvContent, filename) {
  const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

async function exportCallDataToExcel(e) {
  const btn = e ? e.currentTarget : (document.getElementById("btnExportExcelHeader") || document.getElementById("btnExportExcel"));
  if (!btn) return;
  const originalHtml = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Exporting...`;
  
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/call_analytics_results?select=*`, {
      method: "GET",
      headers: {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`
      }
    });

    if (!response.ok) {
      throw new Error(`Supabase API responded with status ${response.status}`);
    }

    const data = await response.json();
    const csvContent = convertToCSV(data);
    const dateStr = new Date().toISOString().split("T")[0];
    downloadCSV(csvContent, `i4vision_calls_export_${dateStr}.csv`);
    
    btn.innerHTML = `<i class="fa-solid fa-circle-check"></i> Exported!`;
    setTimeout(() => {
      btn.disabled = false;
      btn.innerHTML = originalHtml;
    }, 2500);
  } catch (error) {
    console.error("Excel export error:", error);
    alert(`Failed to export data: ${error.message}`);
    btn.disabled = false;
    btn.innerHTML = originalHtml;
  }
}

async function resetRecordingData(file, btn) {
  const displayName = file.name.substring(GCS_PREFIX.length);
  
  // Double-check warning prompts
  const confirm1 = confirm(`Are you sure you want to reset this recording?\nThis will delete the Supabase analysis row and all GCS transcript JSON files.`);
  if (!confirm1) return;
  
  const confirm2 = confirm(`WARNING: This action is permanent and cannot be undone.\nOnly the raw audio file under 'audio/' in GCS will be preserved.\n\nDo you want to proceed?`);
  if (!confirm2) return;
  
  const originalHtml = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Resetting...`;
  
  try {
    // 1. Resolve matched call and sessionId
    const { matchedCall } = findMatchedCallForGCSFile(file);
    const audioPrefix = displayName.replace(".mp3", "");
    const sessionId = state.gcsTranscriptsMap[audioPrefix];
    
    // 2. Delete from Supabase
    // A: Delete by audio_file_name
    await fetch(`${SUPABASE_URL}/rest/v1/call_analytics_results?audio_file_name=eq.${encodeURIComponent(displayName)}`, {
      method: "DELETE",
      headers: {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`
      }
    });
    
    // B: Delete by conversation_name (Session ID)
    if (sessionId) {
      await fetch(`${SUPABASE_URL}/rest/v1/call_analytics_results?conversation_name=eq.${encodeURIComponent(sessionId)}`, {
        method: "DELETE",
        headers: {
          "apikey": SUPABASE_ANON_KEY,
          "Authorization": `Bearer ${SUPABASE_ANON_KEY}`
        }
      });
      
      // Also delete by full name path if it's there
      await fetch(`${SUPABASE_URL}/rest/v1/call_analytics_results?conversation_name=like.*${encodeURIComponent(sessionId)}`, {
        method: "DELETE",
        headers: {
          "apikey": SUPABASE_ANON_KEY,
          "Authorization": `Bearer ${SUPABASE_ANON_KEY}`
        }
      });
    }
    
    // 3. Delete from Google Cloud Storage
    const token = await getGoogleAccessToken();
    if (!token) {
      throw new Error("Google access token not available. Please reconnect GCS.");
    }
    
    // Search GCS directly using prefix matching for real-time accuracy and case safety
    const searchPrefixes = [
      `transcripts/${audioPrefix}`,
      `cx-transcripts/${audioPrefix}`
    ];
    
    const objectsToDelete = [];
    
    for (const prefix of searchPrefixes) {
      const gcsListUrl = `https://storage.googleapis.com/storage/v1/b/${GCS_BUCKET}/o?prefix=${encodeURIComponent(prefix)}`;
      try {
        const listResp = await fetch(gcsListUrl, {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
        if (listResp.ok) {
          const listData = await listResp.json();
          if (listData.items && listData.items.length > 0) {
            listData.items.forEach(item => {
              if (item.name && !objectsToDelete.includes(item.name)) {
                objectsToDelete.push(item.name);
              }
            });
          }
        }
      } catch (e) {
        console.error(`Error querying GCS prefix ${prefix}:`, e);
      }
    }
    
    // Safety net fallback: check in state.gcsTranscriptObjects case-insensitively
    if (state.gcsTranscriptObjects && state.gcsTranscriptObjects.length > 0) {
      const lowerPrefix = audioPrefix.toLowerCase();
      state.gcsTranscriptObjects.forEach(obj => {
        if (obj.name && obj.name.toLowerCase().includes(lowerPrefix)) {
          if (!objectsToDelete.includes(obj.name)) {
            objectsToDelete.push(obj.name);
          }
        }
      });
    }
    
    // Delete GCS objects in parallel
    const deletePromises = objectsToDelete.map(async (name) => {
      const deleteResp = await fetch(`https://storage.googleapis.com/storage/v1/b/${GCS_BUCKET}/o/${encodeURIComponent(name)}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (!deleteResp.ok && deleteResp.status !== 404) {
        const errorText = await deleteResp.text();
        throw new Error(`Google Cloud Storage rejected deletion of '${name}': Status ${deleteResp.status} - ${errorText}`);
      }
    });
    
    await Promise.all(deletePromises);
    
    // Clear selection state if this file was checked
    state.selectedGcsFiles.delete(file.name);
    
    // Success feedback
    btn.innerHTML = `<i class="fa-solid fa-circle-check"></i> Reset!`;
    
    // Reload dashboard call data and refresh GCS file listings
    setTimeout(async () => {
      btn.disabled = false;
      btn.innerHTML = originalHtml;
      
      // Refresh Supabase calls in UI
      await fetchCallData();
      
      // Re-load GCS files list to update display status
      const freshToken = await getGoogleAccessToken();
      if (freshToken) {
        await loadGCSFiles(freshToken);
      }
    }, 1500);
    
  } catch (error) {
    console.error("Error resetting recording:", error);
    alert(`Failed to reset recording: ${error.message}`);
    btn.disabled = false;
    btn.innerHTML = originalHtml;
  }
}

async function triggerBulkCallReset() {
  const btn = document.getElementById("btnBulkReset");
  const selectAllCheckbox = document.getElementById("gcsSelectAllCheckbox");
  if (!btn) return;
  const originalHtml = btn.innerHTML;
  
  const filesToReset = state.filteredGcsFiles.filter(file => 
    state.selectedGcsFiles.has(file.name) && findMatchedCallForGCSFile(file).status !== "pending"
  );
  if (filesToReset.length === 0) return;
  
  const total = filesToReset.length;
  const confirm1 = confirm(`Are you sure you want to reset all ${total} selected recordings?\nThis will delete their Supabase analysis rows and GCS transcript files.`);
  if (!confirm1) return;
  
  const confirm2 = confirm(`WARNING: This action is permanent and cannot be undone.\nOnly the raw audio files under 'audio/' in GCS will be preserved.\n\nDo you want to proceed with resetting ${total} recordings?`);
  if (!confirm2) return;
  
  btn.disabled = true;
  if (selectAllCheckbox) selectAllCheckbox.disabled = true;
  
  let completed = 0;
  let successful = 0;
  
  btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Resetting (0/${total})...`;
  
  // Disable checkboxes visually during processing
  document.querySelectorAll(".gcs-item-checkbox").forEach(cb => cb.disabled = true);
  
  const token = await getGoogleAccessToken();
  
  const promises = filesToReset.map(async (file) => {
    const displayName = file.name.substring(GCS_PREFIX.length);
    const audioPrefix = displayName.replace(".mp3", "");
    const sessionId = state.gcsTranscriptsMap[audioPrefix];
    
    try {
      // 1. Delete from Supabase (A: by audio_file_name)
      await fetch(`${SUPABASE_URL}/rest/v1/call_analytics_results?audio_file_name=eq.${encodeURIComponent(displayName)}`, {
        method: "DELETE",
        headers: {
          "apikey": SUPABASE_ANON_KEY,
          "Authorization": `Bearer ${SUPABASE_ANON_KEY}`
        }
      });
      
      // B: by conversation_name (Session ID)
      if (sessionId) {
        await fetch(`${SUPABASE_URL}/rest/v1/call_analytics_results?conversation_name=eq.${encodeURIComponent(sessionId)}`, {
          method: "DELETE",
          headers: {
            "apikey": SUPABASE_ANON_KEY,
            "Authorization": `Bearer ${SUPABASE_ANON_KEY}`
          }
        });
        
        await fetch(`${SUPABASE_URL}/rest/v1/call_analytics_results?conversation_name=like.*${encodeURIComponent(sessionId)}`, {
          method: "DELETE",
          headers: {
            "apikey": SUPABASE_ANON_KEY,
            "Authorization": `Bearer ${SUPABASE_ANON_KEY}`
          }
        });
      }
      
      // 2. Delete GCS objects
      if (token) {
        const searchPrefixes = [
          `transcripts/${audioPrefix}`,
          `cx-transcripts/${audioPrefix}`
        ];
        
        const objectsToDelete = [];
        
        for (const prefix of searchPrefixes) {
          const gcsListUrl = `https://storage.googleapis.com/storage/v1/b/${GCS_BUCKET}/o?prefix=${encodeURIComponent(prefix)}`;
          try {
            const listResp = await fetch(gcsListUrl, {
              headers: {
                "Authorization": `Bearer ${token}`
              }
            });
            if (listResp.ok) {
              const listData = await listResp.json();
              if (listData.items && listData.items.length > 0) {
                listData.items.forEach(item => {
                  if (item.name && !objectsToDelete.includes(item.name)) {
                    objectsToDelete.push(item.name);
                  }
                });
              }
            }
          } catch (e) {
            console.error(`Error querying GCS prefix ${prefix}:`, e);
          }
        }
        
        // Safety net fallback
        if (state.gcsTranscriptObjects && state.gcsTranscriptObjects.length > 0) {
          const lowerPrefix = audioPrefix.toLowerCase();
          state.gcsTranscriptObjects.forEach(obj => {
            if (obj.name && obj.name.toLowerCase().includes(lowerPrefix)) {
              if (!objectsToDelete.includes(obj.name)) {
                objectsToDelete.push(obj.name);
              }
            }
          });
        }
        
        const deletePromises = objectsToDelete.map(async (name) => {
          const deleteResp = await fetch(`https://storage.googleapis.com/storage/v1/b/${GCS_BUCKET}/o/${encodeURIComponent(name)}`, {
            method: "DELETE",
            headers: {
              "Authorization": `Bearer ${token}`
            }
          });
          if (!deleteResp.ok && deleteResp.status !== 404) {
            const errorText = await deleteResp.text();
            throw new Error(`Google Cloud Storage rejected deletion of '${name}': Status ${deleteResp.status} - ${errorText}`);
          }
        });
        await Promise.all(deletePromises);
      }
      
      successful++;
      state.selectedGcsFiles.delete(file.name);
    } catch (err) {
      console.error(`Error resetting file ${file.name}:`, err);
    } finally {
      completed++;
      btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Resetting (${completed}/${total})...`;
    }
  });
  
  await Promise.all(promises);
  
  btn.innerHTML = `<i class="fa-solid fa-circle-check"></i> Reset ${successful}/${total}`;
  
  setTimeout(async () => {
    btn.disabled = false;
    btn.innerHTML = originalHtml;
    if (selectAllCheckbox) selectAllCheckbox.disabled = false;
    
    // Refresh Supabase calls
    await fetchCallData();
    
    // Reload GCS files list
    const freshToken = await getGoogleAccessToken();
    if (freshToken) {
      await loadGCSFiles(freshToken);
    }
  }, 2500);
}

function setupSettingsDrawer() {
  const openBtn = document.getElementById("btnOpenSettings");
  const drawer = document.getElementById("settingsDrawer");
  const backdrop = document.getElementById("settingsSidebarBackdrop");
  const closeBtn = document.getElementById("settingsDrawerClose");
  const mappingsListContainer = document.getElementById("settingsAgentMappingsList");
  const addBtn = document.getElementById("btnAddAgentMapping");
  const saveBtn = document.getElementById("btnSaveGeneralSettings");
  const newAgentIdInput = document.getElementById("inputNewAgentId");
  const newAgentNameInput = document.getElementById("inputNewAgentName");
  const statusLabel = document.getElementById("generalSettingsSaveStatus");

  if (!drawer) return;

  function openSettings() {
    drawer.classList.add("active");
    backdrop.classList.add("active");
    drawer.setAttribute("aria-hidden", "false");
    
    // Set language selector value to active state
    const langSelect = document.getElementById("settingsLangSelect");
    if (langSelect) {
      langSelect.value = state.lang || "en";
    }

    // Load active mappings from state on open
    const localMappings = localStorage.getItem("gcs_agent_mappings");
    if (localMappings) {
      try {
        state.agentMappings = JSON.parse(localMappings);
      } catch (e) {
        state.agentMappings = {};
      }
    } else {
      state.agentMappings = {};
    }
    
    renderAgentMappingsList();
  }

  function closeSettings() {
    drawer.classList.remove("active");
    backdrop.classList.remove("active");
    drawer.setAttribute("aria-hidden", "true");
    if (statusLabel) statusLabel.style.display = "none";
  }

  if (openBtn) openBtn.addEventListener("click", openSettings);
  if (closeBtn) closeBtn.addEventListener("click", closeSettings);
  if (backdrop) backdrop.addEventListener("click", closeSettings);

  // Bind Escape key to close settings
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeSettings();
  });

  // Render list of active mappings
  function renderAgentMappingsList() {
    if (!mappingsListContainer) return;
    mappingsListContainer.innerHTML = "";
    
    const mappings = state.agentMappings || {};
    const keys = Object.keys(mappings).sort();

    if (keys.length === 0) {
      mappingsListContainer.innerHTML = `
        <div style="text-align: center; color: var(--text-muted); font-size: 0.72rem; padding: 1rem 0;">
          No active agent name mappings.
        </div>
      `;
      return;
    }

    keys.forEach(id => {
      const name = mappings[id];
      const item = document.createElement("div");
      item.className = "agent-mapping-item";
      item.innerHTML = `
        <div style="display: flex; align-items: center;">
          <span class="agent-mapping-key">${id}</span>
          <span class="agent-mapping-arrow"><i class="fa-solid fa-arrow-right"></i></span>
          <span class="agent-mapping-val">${name}</span>
        </div>
        <button class="btn-delete-mapping" data-id="${id}" title="Delete mapping">
          <i class="fa-solid fa-trash-can"></i>
        </button>
      `;
      
      // Bind delete button
      item.querySelector(".btn-delete-mapping").addEventListener("click", (e) => {
        const targetId = e.currentTarget.getAttribute("data-id");
        delete state.agentMappings[targetId];
        renderAgentMappingsList();
      });

      mappingsListContainer.appendChild(item);
    });
  }

  // Bind Add Mapping button
  if (addBtn) {
    addBtn.addEventListener("click", () => {
      const id = newAgentIdInput.value.trim();
      const name = newAgentNameInput.value.trim();

      if (!id || !name) {
        alert("Please fill in both the Agent ID and the Agent Name.");
        return;
      }

      state.agentMappings = state.agentMappings || {};
      state.agentMappings[id] = name;

      // Clear input fields
      newAgentIdInput.value = "";
      newAgentNameInput.value = "";

      renderAgentMappingsList();
    });
  }

  // Bind Save Mapping button
  if (saveBtn) {
    saveBtn.addEventListener("click", async () => {
      // 1. Process and save Language Selection
      const langSelect = document.getElementById("settingsLangSelect");
      if (langSelect) {
        const selectedLang = langSelect.value;
        localStorage.setItem("gcs_lang", selectedLang);
        state.lang = selectedLang;
        updateUILanguage();
      }

      // 2. Process and save Agent Mappings
      const mappingsStr = JSON.stringify(state.agentMappings || {});
      localStorage.setItem("gcs_agent_mappings", mappingsStr);

      // Save to Supabase (catch error if agent_mappings column does not exist yet)
      try {
        await saveSettingToSupabase("agent_mappings", mappingsStr);
      } catch (err) {
        console.warn("Could not persist agent mappings to database column:", err);
      }

      // Show success indicator
      if (statusLabel) {
        statusLabel.style.display = "block";
        setTimeout(() => {
          statusLabel.style.display = "none";
        }, 3000);
      }

      // Refresh calls and charts to apply the new names instantly!
      await fetchCallData();
      const token = await getGoogleAccessToken();
      if (token) {
        await loadGCSFiles(token);
      }
    });
  }
}

// ==========================================================================
// AI Analytics Chat Drawer & Hybrid OKF/RAG Logic
// ==========================================================================

function setupChatDrawer() {
  const btnOpenChat = document.getElementById("btnOpenChat");
  const chatDrawer = document.getElementById("chatDrawer");
  const chatDrawerClose = document.getElementById("chatDrawerClose");
  const chatSidebarBackdrop = document.getElementById("chatSidebarBackdrop");
  
  const btnChatSettingsToggle = document.getElementById("btnChatSettingsToggle");
  const chatConfigSection = document.getElementById("chatConfigSection");
  
  const chatApiKeyInput = document.getElementById("chatApiKeyInput");
  
  const btnSaveChatConfig = document.getElementById("btnSaveChatConfig");
  const chatModelSelect = document.getElementById("chatModelSelect");
  const chatConfigSaveStatus = document.getElementById("chatConfigSaveStatus");
  const chatNoKeyWarning = document.getElementById("chatNoKeyWarning");
  
  const btnChatSend = document.getElementById("btnChatSend");
  const chatInput = document.getElementById("chatInput");
  
  // Drawer visibility
  if (btnOpenChat) {
    btnOpenChat.addEventListener("click", openChatDrawer);
  }
  if (chatDrawerClose) {
    chatDrawerClose.addEventListener("click", closeChatDrawer);
  }
  if (chatSidebarBackdrop) {
    chatSidebarBackdrop.addEventListener("click", closeChatDrawer);
  }
  
  // Config Section Toggle
  if (btnChatSettingsToggle && chatConfigSection) {
    btnChatSettingsToggle.addEventListener("click", () => {
      const isHidden = chatConfigSection.style.display === "none";
      chatConfigSection.style.display = isHidden ? "block" : "none";
    });
  }
  
  // Save credentials config
  if (btnSaveChatConfig) {
    btnSaveChatConfig.addEventListener("click", () => {
      const keyVal = chatApiKeyInput.value.trim();
      const modelVal = chatModelSelect.value;
      
      localStorage.setItem("gcs_openai_model", modelVal);
      state.openaiModel = modelVal;
      
      // If user typed a new key, update it securely
      if (keyVal) {
        localStorage.setItem("gcs_openai_api_key", keyVal);
        state.openaiApiKey = keyVal;
        saveOpenAIKeyToSupabase(keyVal);
        
        chatApiKeyInput.value = "";
        chatApiKeyInput.placeholder = "•••••••••••• (Saved in Database)";
      }
      
      const currentKey = state.openaiApiKey || localStorage.getItem("gcs_openai_api_key") || "";
      if (currentKey) {
        if (chatNoKeyWarning) chatNoKeyWarning.style.display = "none";
      } else {
        if (chatNoKeyWarning) chatNoKeyWarning.style.display = "block";
      }
      
      if (chatConfigSaveStatus) chatConfigSaveStatus.style.display = "block";
      setTimeout(() => {
        if (chatConfigSaveStatus) chatConfigSaveStatus.style.display = "none";
        if (chatConfigSection) chatConfigSection.style.display = "none"; // auto close config on save
      }, 1500);
    });
  }
  
  // Load saved config on init
  const savedKey = localStorage.getItem("gcs_openai_api_key") || "";
  const savedModel = localStorage.getItem("gcs_openai_model") || "gpt-4o-mini";
  
  state.openaiApiKey = savedKey;
  state.openaiModel = savedModel;
  
  if (chatApiKeyInput) {
    chatApiKeyInput.value = "";
    if (savedKey) {
      chatApiKeyInput.placeholder = "•••••••••••• (Saved in Database)";
    } else {
      chatApiKeyInput.placeholder = "Enter OpenAI API Key...";
    }
  }
  if (chatModelSelect) chatModelSelect.value = savedModel;

  // Sync OpenAI Key from Supabase on init
  syncOpenAIKeyWithSupabase();
  
  // Send message on click
  if (btnChatSend) {
    btnChatSend.addEventListener("click", handleChatSend);
  }
  
  // Send message on Enter, permit new line on Shift+Enter
  if (chatInput) {
    chatInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleChatSend();
      }
    });
  }
  
  const predefinedSelect = document.getElementById("chatPredefinedSelect");
  
  // Renders the predefined questions dropdown select
  function renderPredefinedQuestionsDropdown() {
    if (!predefinedSelect) return;
    predefinedSelect.innerHTML = "";
    
    // Default placeholder option
    const defaultOpt = document.createElement("option");
    defaultOpt.value = "";
    defaultOpt.textContent = "💡 Choose a predefined question...";
    predefinedSelect.appendChild(defaultOpt);
    
    const questions = state.predefinedQuestions || [];
    questions.forEach((q, idx) => {
      const opt = document.createElement("option");
      opt.value = idx;
      opt.textContent = q.label;
      predefinedSelect.appendChild(opt);
    });
  }

  // Populate input when selecting a predefined question
  if (predefinedSelect) {
    predefinedSelect.addEventListener("change", (e) => {
      const idx = e.target.value;
      if (idx !== "") {
        const question = state.predefinedQuestions[idx];
        if (question && chatInput) {
          chatInput.value = question.prompt;
          chatInput.focus();
        }
        // Reset the selector back to the placeholder
        predefinedSelect.value = "";
      }
    });
  }

  // Settings predefined questions list elements
  const settingsQuestionsList = document.getElementById("chatSettingsQuestionsList");
  const addQuestionBtn = document.getElementById("btnChatAddQuestion");
  const newQuestionLabelInput = document.getElementById("inputNewQuestionLabel");
  const newQuestionPromptInput = document.getElementById("inputNewQuestionPrompt");

  // Render predefined questions list inside config/settings panel
  function renderSettingsQuestionsList() {
    if (!settingsQuestionsList) return;
    settingsQuestionsList.innerHTML = "";

    const questions = state.predefinedQuestions || [];
    if (questions.length === 0) {
      settingsQuestionsList.innerHTML = `
        <div style="text-align: center; color: var(--text-muted); font-size: 0.7rem; padding: 0.5rem 0;">
          No active predefined questions.
        </div>
      `;
      return;
    }

    questions.forEach((q, idx) => {
      const item = document.createElement("div");
      item.className = "predefined-question-item";
      item.innerHTML = `
        <div class="predefined-question-content">
          <span class="predefined-question-label">${q.label}</span>
          <span class="predefined-question-prompt">${q.prompt}</span>
        </div>
        <button class="btn-delete-mapping btn-delete-question" data-idx="${idx}" title="Delete question" style="margin-top: 2px; flex-shrink: 0;">
          <i class="fa-solid fa-trash-can"></i>
        </button>
      `;

      item.querySelector(".btn-delete-question").addEventListener("click", async (e) => {
        const targetIdx = Number(e.currentTarget.getAttribute("data-idx"));
        state.predefinedQuestions.splice(targetIdx, 1);
        
        // Save dynamically on deletion
        const qStr = JSON.stringify(state.predefinedQuestions);
        localStorage.setItem("gcs_predefined_questions", qStr);
        try {
          await saveSettingToSupabase("predefined_questions", qStr);
        } catch (err) {
          console.warn("Could not save updated predefined questions to Supabase on delete:", err);
        }
        
        renderSettingsQuestionsList();
        renderPredefinedQuestionsDropdown();
      });

      settingsQuestionsList.appendChild(item);
    });
  }

  // Bind Add Predefined Question button
  if (addQuestionBtn) {
    addQuestionBtn.addEventListener("click", async () => {
      const label = newQuestionLabelInput.value.trim();
      const prompt = newQuestionPromptInput.value.trim();

      if (!label || !prompt) {
        alert("Please enter both a label and the actual prompt text.");
        return;
      }

      state.predefinedQuestions = state.predefinedQuestions || [];
      state.predefinedQuestions.push({ label, prompt });

      // Clear inputs
      newQuestionLabelInput.value = "";
      newQuestionPromptInput.value = "";

      // Save dynamically on add
      const qStr = JSON.stringify(state.predefinedQuestions);
      localStorage.setItem("gcs_predefined_questions", qStr);
      try {
        await saveSettingToSupabase("predefined_questions", qStr);
      } catch (err) {
        console.warn("Could not save updated predefined questions to Supabase on add:", err);
      }

      renderSettingsQuestionsList();
      renderPredefinedQuestionsDropdown();
    });
  }

  // Initial renders
  renderPredefinedQuestionsDropdown();
  renderSettingsQuestionsList();

  // Table expansion event delegation
  const chatMessageLog = document.getElementById("chatMessageLog");
  if (chatMessageLog) {
    chatMessageLog.addEventListener("click", (e) => {
      const btn = e.target.closest(".btn-expand-table");
      if (btn) {
        const container = btn.closest(".chat-table-container");
        if (container) {
          const table = container.querySelector("table");
          if (table) {
            openChatTableModal(table.outerHTML);
          }
        }
      }
    });
  }

  // Expanded View Modal close handlers
  const btnCloseChatTableModal = document.getElementById("btnCloseChatTableModal");
  const chatTableModal = document.getElementById("chatTableModal");
  if (btnCloseChatTableModal) {
    btnCloseChatTableModal.addEventListener("click", closeChatTableModal);
  }
  if (chatTableModal) {
    chatTableModal.addEventListener("click", (e) => {
      if (e.target === chatTableModal) {
        closeChatTableModal();
      }
    });
  }
}

function openChatDrawer() {
  const chatDrawer = document.getElementById("chatDrawer");
  const chatSidebarBackdrop = document.getElementById("chatSidebarBackdrop");
  const chatNoKeyWarning = document.getElementById("chatNoKeyWarning");
  
  if (chatDrawer && chatSidebarBackdrop) {
    chatDrawer.classList.add("active");
    chatDrawer.setAttribute("aria-hidden", "false");
    chatSidebarBackdrop.classList.add("active");
    chatSidebarBackdrop.setAttribute("aria-hidden", "false");
  }
  
  const savedKey = localStorage.getItem("gcs_openai_api_key") || "";
  if (!savedKey && chatNoKeyWarning) {
    chatNoKeyWarning.style.display = "block";
  } else if (chatNoKeyWarning) {
    chatNoKeyWarning.style.display = "none";
  }
}

function closeChatDrawer() {
  const chatDrawer = document.getElementById("chatDrawer");
  const chatSidebarBackdrop = document.getElementById("chatSidebarBackdrop");
  
  if (chatDrawer && chatSidebarBackdrop) {
    chatDrawer.classList.remove("active");
    chatDrawer.setAttribute("aria-hidden", "true");
    chatSidebarBackdrop.classList.remove("active");
    chatSidebarBackdrop.setAttribute("aria-hidden", "true");
  }
}

function openChatTableModal(tableHtml) {
  const modal = document.getElementById("chatTableModal");
  const modalBody = document.getElementById("chatTableModalBody");
  if (modal && modalBody) {
    modalBody.innerHTML = tableHtml;
    modal.style.display = "flex";
  }
}

function closeChatTableModal() {
  const modal = document.getElementById("chatTableModal");
  const modalBody = document.getElementById("chatTableModalBody");
  if (modal) {
    modal.style.display = "none";
  }
  if (modalBody) {
    modalBody.innerHTML = "";
  }
}

function appendChatMessage(role, text) {
  const messageLog = document.getElementById("chatMessageLog");
  if (!messageLog) return null;
  
  const bubble = document.createElement("div");
  bubble.className = `chat-bubble ${role}`;
  
  if (role === "assistant") {
    bubble.innerHTML = formatMarkdown(text);
  } else {
    bubble.textContent = text;
  }
  
  messageLog.appendChild(bubble);
  messageLog.scrollTop = messageLog.scrollHeight;
  
  return bubble;
}

function retrieveTranscriptsForQuery(query) {
  if (!query || !state.allCalls || state.allCalls.length === 0) return "";
  
  const queryTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
  if (queryTerms.length === 0) return "";

  const scoredCalls = state.allCalls.map(call => {
    let score = 0;
    const textToSearch = ((call.transcript || "") + " " + (call.summary || "")).toLowerCase();
    
    queryTerms.forEach(term => {
      let index = textToSearch.indexOf(term);
      while (index !== -1) {
        score++;
        index = textToSearch.indexOf(term, index + term.length);
      }
    });
    
    return { call, score };
  });

  const matches = scoredCalls.filter(c => c.score > 0).sort((a, b) => b.score - a.score).slice(0, 3);
  if (matches.length === 0) return "";

  let context = "\n### RETRIEVED TRANSCRIPTS (RAG ARCHIVE)\n";
  matches.forEach((m, idx) => {
    const call = m.call;
    const cleanTranscript = (call.transcript || "").trim();
    const snippet = cleanTranscript.length > 800 ? cleanTranscript.substring(0, 800) + "..." : cleanTranscript;
    context += `\n**Match #${idx + 1}: Call ID ${call.conversation_name} (Agent: ${getAgentName(call)})**\n`;
    context += `> Transcript snippet: "${snippet}"\n`;
  });

  return context;
}

function compileOKFCallsContext() {
  const callsToInclude = state.filteredCalls || state.allCalls || [];
  if (callsToInclude.length === 0) {
    return "No calls are currently loaded in the dashboard.";
  }
  
  const limitedCalls = callsToInclude.slice(0, 80);
  
  let md = "## CURATED CALL METADATA (OKF CORE)\n";
  md += `Showing top ${limitedCalls.length} calls matching current active filters:\n\n`;
  md += "| Call ID | Agent | Date | Category | Sentiment | Risk | Score | Cost (USD) | Summary |\n";
  md += "|---|---|---|---|---|---|---|---|---|\n";
  
  limitedCalls.forEach(call => {
    let id = call.conversation_name || "N/A";
    if (id.includes("/conversations/")) {
      id = id.substring(id.lastIndexOf("/") + 1);
    }
    const agent = getAgentName(call);
    const date = call.created_at ? call.created_at.substring(0, 10) : "N/A";
    const cat = call.category || "N/A";
    const sent = call.sentiment || "N/A";
    const risk = call.risk_level || "N/A";
    const score = call.agent_score !== null && call.agent_score !== undefined ? `${call.agent_score}/10` : "N/A";
    const cost = call.total_cost_usd !== null && call.total_cost_usd !== undefined ? `$${Number(call.total_cost_usd).toFixed(3)}` : "N/A";
    const sum = call.summary ? call.summary.replace(/\n/g, " ").substring(0, 100) + "..." : "No summary";
    
    md += `| ${id} | ${agent} | ${date} | ${cat} | ${sent} | ${risk} | ${score} | ${cost} | ${sum} |\n`;
  });
  
  return md;
}

function formatMarkdown(text) {
  if (!text) return "";
  
  let html = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/__(.*?)__/g, "<strong>$1</strong>");

  html = html.replace(/```([\s\S]*?)```/g, "<pre><code>$1</code></pre>");
  html = html.replace(/`(.*?)`/g, "<code>$1</code>");

  const lines = html.split("\n");
  let inTable = false;
  let tableRows = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith("|") && line.endsWith("|")) {
      if (!inTable) {
        inTable = true;
        tableRows = [];
      }
      if (line.match(/^\|[\s:\-|]*\|$/)) {
        lines[i] = "";
        continue;
      }
      const cells = line.split("|").slice(1, -1).map(c => c.trim());
      tableRows.push(cells);
      lines[i] = "";
    } else {
      if (inTable) {
        let tableHtml = '<div class="chat-table-container"><button class="btn-expand-table" title="Expand view"><i class="fa-solid fa-expand"></i></button><div class="chat-table-wrapper"><table><thead><tr>';
        tableRows[0].forEach(cell => {
          tableHtml += `<th>${cell}</th>`;
        });
        tableHtml += "</tr></thead><tbody>";
        for (let r = 1; r < tableRows.length; r++) {
          tableHtml += "<tr>";
          tableRows[r].forEach(cell => {
            tableHtml += `<td>${cell}</td>`;
          });
          tableHtml += "</tr>";
        }
        tableHtml += "</tbody></table></div></div>";
        lines[i - tableRows.length - 1] = tableHtml;
        inTable = false;
      }
    }
  }
  
  if (inTable) {
    let tableHtml = '<div class="chat-table-container"><button class="btn-expand-table" title="Expand view"><i class="fa-solid fa-expand"></i></button><div class="chat-table-wrapper"><table><thead><tr>';
    tableRows[0].forEach(cell => {
      tableHtml += `<th>${cell}</th>`;
    });
    tableHtml += "</tr></thead><tbody>";
    for (let r = 1; r < tableRows.length; r++) {
      tableHtml += "<tr>";
      tableRows[r].forEach(cell => {
        tableHtml += `<td>${cell}</td>`;
      });
      tableHtml += "</tr>";
    }
    tableHtml += "</tbody></table></div></div>";
    lines[lines.length - 1] = tableHtml;
  }
  
  html = lines.filter(l => l !== "").join("\n");

  html = html.replace(/^\s*[-*]\s+(.*?)$/gm, "<li>$1</li>");
  html = html.replace(/(<li>.*?<\/li>)/gs, "<ul>$1<\/ul>");
  html = html.replace(/<\/ul>\s*<ul>/g, "");

  html = html.replace(/^\s*\d+\.\s+(.*?)$/gm, "<li>$1</li>");
  html = html.replace(/(<li>.*?<\/li>)/gs, "<ol>$1<\/ol>");
  html = html.replace(/<\/ol>\s*<ol>/g, "");

  const blocks = html.split("\n\n");
  html = blocks.map(block => {
    block = block.trim();
    if (block.startsWith("<div class=\"chat-table-container\"") || block.startsWith("<table") || block.startsWith("<pre") || block.startsWith("<ul") || block.startsWith("<ol") || block.startsWith("<li>")) {
      return block;
    }
    return `<p>${block.replace(/\n/g, "<br>")}</p>`;
  }).join("");

  return html;
}

async function handleChatSend() {
  const chatInput = document.getElementById("chatInput");
  if (!chatInput) return;
  
  const text = chatInput.value.trim();
  if (!text) return;
  
  chatInput.value = "";
  
  const apiKey = state.openaiApiKey || localStorage.getItem("gcs_openai_api_key") || "";
  if (!apiKey) {
    appendChatMessage("user", text);
    appendChatMessage("system-error", "Error: OpenAI API Key is missing. Please enter your API Key in the chat settings config panel (gear icon).");
    return;
  }
  
  appendChatMessage("user", text);
  
  const loadingBubble = document.createElement("div");
  loadingBubble.className = "chat-bubble system-loading";
  loadingBubble.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> AI is thinking...';
  const messageLog = document.getElementById("chatMessageLog");
  if (messageLog) {
    messageLog.appendChild(loadingBubble);
    messageLog.scrollTop = messageLog.scrollHeight;
  }
  
  try {
    const okfContext = compileOKFCallsContext();
    const ragContext = retrieveTranscriptsForQuery(text);
    
    const systemPrompt = `You are the Call Center Analytics AI Assistant. Your job is to answer questions about the call analytics database.
You are equipped with a hybrid analytics stack:
1. CURATED METADATA (OKF): A clean Markdown table containing structural metadata of the calls (IDs, scores, sentiments, categories, summaries).
2. TRANSCRIPT SNIPPETS (RAG): A selection of the top matching call transcripts based on the user's query context.

When answering:
- Be highly factual and deterministic. Rely first on the Curated Metadata (OKF) table for numbers, counts, and categories.
- If the user asks about specific quotes or dialogue details, search the Transcript Snippets (RAG) context.
- Format your response using markdown. Use bulleted lists, bold text, and HTML-like markdown tables where appropriate.
- If the user's question cannot be answered by the provided data, state that clearly.
- Keep your answers concise, professional, and directly actionable.
`;

    const model = state.openaiModel || localStorage.getItem("gcs_openai_model") || "gpt-4o-mini";
    
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Here is the call context:\n\n${okfContext}\n${ragContext}\n\nUser Question: ${text}` }
        ],
        temperature: 0.2
      })
    });
    
    loadingBubble.remove();
    
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const errMsg = errData.error?.message || `HTTP error ${response.status}`;
      appendChatMessage("system-error", `OpenAI API Error: ${errMsg}`);
      return;
    }
    
    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || "No reply received.";
    
    appendChatMessage("assistant", reply);
    
  } catch (err) {
    loadingBubble.remove();
    console.error("Chat completion request failed:", err);
    appendChatMessage("system-error", `Request Failed: ${err.message}`);
  }
}

async function syncOpenAIKeyWithSupabase() {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/ai_credentials?provider=eq.openai`, {
      headers: {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`
      }
    });
    if (response.ok) {
      const data = await response.json();
      if (data && data.length > 0) {
        const key = data[0].api_key;
        if (key) {
          localStorage.setItem("gcs_openai_api_key", key);
          state.openaiApiKey = key;
          
          const chatApiKeyInput = document.getElementById("chatApiKeyInput");
          if (chatApiKeyInput) {
            chatApiKeyInput.value = "";
            chatApiKeyInput.placeholder = "•••••••••••• (Saved in Database)";
          }
          
          const chatNoKeyWarning = document.getElementById("chatNoKeyWarning");
          if (chatNoKeyWarning) {
            chatNoKeyWarning.style.display = "none";
          }
        }
      }
    }
  } catch (err) {
    console.warn("Could not sync OpenAI credentials from Supabase:", err);
  }
}

async function saveOpenAIKeyToSupabase(key) {
  try {
    const patchResp = await fetch(`${SUPABASE_URL}/rest/v1/ai_credentials?provider=eq.openai`, {
      method: "PATCH",
      headers: {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
        "Prefer": "return=representation"
      },
      body: JSON.stringify({ api_key: key, updated_at: new Date().toISOString() })
    });
    
    if (patchResp.ok) {
      const data = await patchResp.json();
      if (data.length === 0) {
        await fetch(`${SUPABASE_URL}/rest/v1/ai_credentials`, {
          method: "POST",
          headers: {
            "apikey": SUPABASE_ANON_KEY,
            "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ provider: "openai", api_key: key })
        });
      }
    }
  } catch (err) {
    console.warn("Could not save OpenAI API Key to Supabase:", err);
  }
}

function startAnalysisPolling() {
  if (analysisPollingInterval) return;

  analysisPollingInterval = setInterval(async () => {
    const pendingFiles = Object.keys(state.ongoingAnalysis).filter(
      name => state.ongoingAnalysis[name] === "pending"
    );

    if (pendingFiles.length === 0) {
      clearInterval(analysisPollingInterval);
      analysisPollingInterval = null;
      return;
    }

    try {
      // 1. Refresh Supabase call data
      await fetchCallData();
      
      // 2. Refresh GCS file list in background
      const token = await getGoogleAccessToken();
      if (token) {
        const [audioItems, transItems, cxTransItems] = await Promise.all([
          fetchAllGcsObjects(GCS_PREFIX, token),
          fetchAllGcsObjects("transcripts/", token),
          fetchAllGcsObjects("cx-transcripts/", token)
        ]);
        
        state.gcsTranscriptObjects = [...transItems, ...cxTransItems];
        state.gcsTranscriptsMap = {};
        state.gcsTranscriptObjects.forEach(item => {
          if (!item.name || !item.name.endsWith(".json")) return;
          const basename = item.name.split("/").pop();
          if (basename.includes("_transcript_")) {
            const parts = basename.split("_transcript_");
            const audioPrefix = parts[0];
            const sessionId = parts[1].replace(".json", "");
            state.gcsTranscriptsMap[audioPrefix] = sessionId;
            state.gcsTranscriptsMap[audioPrefix.toLowerCase()] = sessionId;
          }
        });
      }

      let hasChanges = false;
      const now = Date.now();

      pendingFiles.forEach(name => {
        const fileObj = { name };
        const { status: fileStatus } = findMatchedCallForGCSFile(fileObj);

        if (fileStatus === "analyzed" || fileStatus === "transcribed") {
          // Success!
          delete state.ongoingAnalysis[name];
          state.selectedGcsFiles.delete(name);
          if (state.analysisStartTimes) delete state.analysisStartTimes[name];
          hasChanges = true;
        } else {
          // Check for 5-minute timeout
          const startTime = state.analysisStartTimes?.[name] || now;
          if (now - startTime > 300000) { // 5 minutes
            state.ongoingAnalysis[name] = "error";
            if (state.analysisStartTimes) delete state.analysisStartTimes[name];
            hasChanges = true;

            const gcsAnalysisErrorBanner = document.getElementById("gcsAnalysisErrorBanner");
            if (gcsAnalysisErrorBanner) {
              const errorText = document.getElementById("gcsAnalysisErrorText");
              if (errorText) {
                errorText.textContent = "Analysis timed out (exceeded 5 minutes) for some recordings.";
              }
              gcsAnalysisErrorBanner.style.display = "flex";
            }
          }
        }
      });

      if (hasChanges) {
        renderGCSFileList();
        updateBulkActionUI();
      }
    } catch (err) {
      console.warn("Error running analysis background status sync:", err);
    }
  }, 10000); // Poll every 10 seconds
}

function getDefaultPredefinedQuestions() {
  return [
    { label: "Summarize main issues", prompt: "Summarize the main issues mentioned in today's calls." },
    { label: "Lowest score summary", prompt: "Which agent has the lowest score and what are their next actions?" },
    { label: "Find risk calls", prompt: "Are there any calls with medium or high risk levels? Detail them." }
  ];
}
