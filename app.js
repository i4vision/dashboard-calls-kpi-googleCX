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
  categories: [],
  charts: {
    sentiment: null,
    categoryRisk: null,
    agentScore: null,
    silencePerformance: null,
    callsHour: null,
    callsDay: null,
    sentimentTrend: null,
    resolutionTrend: null,
    silenceTrend: null
  },
  activeTheme: 'dark',
  gcsFiles: [],
  filteredGcsFiles: [],
  supabaseSettingsEnabled: true,
  gcsTranscriptsMap: {},
  selectedGcsFiles: new Set(),
  gcsTranscriptObjects: []
};

// Initialize Application
document.addEventListener("DOMContentLoaded", async () => {
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
  // Keep the first default option
  select.innerHTML = '<option value="all">All Categories</option>';
  
  state.categories.forEach(cat => {
    const opt = document.createElement("option");
    opt.value = cat;
    opt.textContent = formatString(cat);
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
    const sentimentMatch = sentimentFilter === "all" || call.sentiment === sentimentFilter;

    // Risk Filter
    const riskMatch = riskFilter === "all" || call.risk_level === riskFilter;

    // Resolution Filter
    const resolutionMatch = resolutionFilter === "all" || call.resolution_status === resolutionFilter;

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

    return searchMatch && audioSearchMatch && sentimentMatch && riskMatch && resolutionMatch && categoryMatch && durationMatch;
  });

  updateDashboardUI();
}

function resetFilters() {
  document.getElementById("searchBar").value = "";
  document.getElementById("searchAudio").value = "";
  document.getElementById("filterSentiment").value = "all";
  document.getElementById("filterRisk").value = "all";
  document.getElementById("filterResolution").value = "all";
  document.getElementById("filterCategory").value = "all";
  document.getElementById("filterDuration").value = "all";
  
  state.filteredCalls = [...state.allCalls];
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
    document.getElementById("kpiSilencePercentage").textContent = "N/A";
    document.getElementById("kpiTotalCost").textContent = "N/A";
    return;
  }

  // 1. Average Agent Score (Scale 0-10)
  const validScores = state.filteredCalls.map(c => Number(c.agent_score)).filter(s => !isNaN(s));
  const avgScore = validScores.reduce((acc, curr) => acc + curr, 0) / validScores.length;
  document.getElementById("kpiAvgScore").textContent = avgScore.toFixed(1);

  // 2. Resolution Rate
  const resolvedCount = state.filteredCalls.filter(c => c.resolution_status === "resolved").length;
  const resolutionRate = (resolvedCount / count) * 100;
  document.getElementById("kpiResolutionRate").textContent = `${resolutionRate.toFixed(1)}%`;
  document.getElementById("kpiResolutionSubtext").innerHTML = `<i class="fa-solid fa-check"></i> ${resolvedCount} of ${count} resolved`;

  // 3. Average Silence Percentage
  const silencePercentages = state.filteredCalls.map(c => Number(c.silence_percentage)).filter(p => !isNaN(p));
  const avgSilence = (silencePercentages.reduce((acc, curr) => acc + curr, 0) / silencePercentages.length) * 100;
  document.getElementById("kpiSilencePercentage").textContent = `${avgSilence.toFixed(1)}%`;

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
  const sentimentCounts = { positive: 0, neutral: 0, negative: 0 };
  data.forEach(c => {
    if (c.sentiment && sentimentCounts[c.sentiment.toLowerCase()] !== undefined) {
      sentimentCounts[c.sentiment.toLowerCase()]++;
    }
  });

  if (state.charts.sentiment) state.charts.sentiment.destroy();
  state.charts.sentiment = new Chart(document.getElementById("chartSentiment").getContext("2d"), {
    type: "doughnut",
    data: {
      labels: ["Positive", "Neutral", "Negative"],
      datasets: [{
        data: [sentimentCounts.positive, sentimentCounts.neutral, sentimentCounts.negative],
        backgroundColor: ["#10b981", "#6b7280", "#f43f5e"],
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
    lowRiskData.push(catCalls.filter(c => c.risk_level === "low").length);
    medRiskData.push(catCalls.filter(c => c.risk_level === "medium").length);
    highRiskData.push(catCalls.filter(c => c.risk_level === "high").length);
  });

  const catLabelsFormatted = cats;

  if (state.charts.categoryRisk) state.charts.categoryRisk.destroy();
  state.charts.categoryRisk = new Chart(document.getElementById("chartCategoryRisk").getContext("2d"), {
    type: "bar",
    data: {
      labels: catLabelsFormatted,
      datasets: [
        { label: "Low Risk", data: lowRiskData, backgroundColor: "#10b981" },
        { label: "Medium Risk", data: medRiskData, backgroundColor: "#f59e0b" },
        { label: "High Risk", data: highRiskData, backgroundColor: "#f43f5e" }
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
    if (agent.startsWith("Agent #")) return; // Exclude anonymous calls from the leaderboard
    
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

  const formattedCats = categoriesList;

  if (state.charts.silencePerformance) state.charts.silencePerformance.destroy();
  state.charts.silencePerformance = new Chart(document.getElementById("chartSilencePerformance").getContext("2d"), {
    type: "bar",
    data: {
      labels: formattedCats,
      datasets: [{
        label: "Average Score (0-10)",
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
  countSpan.textContent = `Showing ${state.filteredCalls.length} calls`;

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
    const category = formatString(call.category || "General");

    // Sentiment badge
    const sentiment = call.sentiment || "neutral";
    const sentimentClass = `badge-sentiment-${sentiment.toLowerCase()}`;
    const sentimentHtml = `<span class="badge ${sentimentClass}">${sentiment}</span>`;

    // Risk badge
    const risk = call.risk_level || "low";
    const riskClass = `badge-risk-${risk.toLowerCase()}`;
    const riskHtml = `<span class="badge ${riskClass}">${risk}</span>`;

    // Resolution badge
    const res = call.resolution_status || "unresolved";
    const resClass = `badge-status-${res.toLowerCase()}`;
    const resHtml = `<span class="badge ${resClass}">${res}</span>`;

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
  const drawer = document.getElementById("callDrawer");
  const backdrop = document.getElementById("drawerBackdrop");
  
  // Set Text Contents (Agent name and Call ID)
  const assignedAgent = getAgentName(call);
  document.getElementById("drawerConversationName").innerHTML = `Agent: ${assignedAgent} <span style="display: block; font-size: 0.75rem; opacity: 0.6; font-family: var(--font-mono); font-weight: normal; margin-top: 0.25rem;">Call ID: ${call.conversation_name}</span>`;
  document.getElementById("drawerConversationName").title = call.conversation_name;
  
  // Set Badges
  const sentiment = document.getElementById("drawerSentiment");
  sentiment.className = `badge badge-sentiment-${call.sentiment.toLowerCase()}`;
  sentiment.textContent = call.sentiment;

  const risk = document.getElementById("drawerRisk");
  risk.className = `badge badge-risk-${call.risk_level.toLowerCase()}`;
  risk.textContent = `${call.risk_level} Risk`;

  const resolution = document.getElementById("drawerResolution");
  resolution.className = `badge badge-status-${call.resolution_status.toLowerCase()}`;
  resolution.textContent = call.resolution_status;

  const category = document.getElementById("drawerCategory");
  const parentCat = getParentCategory(call.category);
  const rawCat = call.category ? formatString(call.category) : "General";
  category.textContent = `${parentCat} (${rawCat})`;

  // Performance stats
  const drawerScoreNum = Number(call.agent_score);
  document.getElementById("drawerScore").textContent = !isNaN(drawerScoreNum) ? `${drawerScoreNum.toFixed(1)} / 10` : "N/A";
  const silenceSecs = call.silence_seconds || "0s";
  const silencePercentage = (Number(call.silence_percentage) * 100).toFixed(1);
  document.getElementById("drawerSilence").textContent = `${silenceSecs} (${silencePercentage}%)`;

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
  document.getElementById("drawerBillingStatus").textContent = `${isEstimated ? 'Estimated' : 'Final'} (${calcAt})`;

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
  document.getElementById("drawerSummary").textContent = call.summary || "No summary provided.";
  document.getElementById("drawerCustomerIssue").textContent = call.customer_issue || "No customer issue reported.";

  // Next Actions
  const nextActionBox = document.getElementById("drawerNextAction");
  if (call.next_action) {
    nextActionBox.style.display = "block";
    nextActionBox.innerHTML = `
      <div style="font-weight: 700; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.35rem; color: var(--color-warning)">
        <i class="fa-solid fa-arrow-right"></i> Next Step
      </div>
      <div>${call.next_action}</div>
      ${call.follow_up_required ? '<div style="margin-top: 0.5rem; font-size: 0.75rem; font-weight: 600; color: var(--color-negative)"><i class="fa-solid fa-flag"></i> Direct Follow-up Required</div>' : ''}
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
  const entitiesCloud = document.getElementById("drawerEntities");
  entitiesCloud.innerHTML = "";
  
  let entityList = [];
  let typeList = [];
  
  if (call.entities) {
    entityList = call.entities.split(",").map(e => e.trim());
  }
  if (call.entity_types) {
    typeList = call.entity_types.split(",").map(t => t.trim());
  }

  if (entityList.length > 0) {
    entityList.forEach((ent, idx) => {
      const type = typeList[idx] || "OTHER";
      const tag = document.createElement("span");
      
      let typeClass = "tag-other";
      let icon = "fa-tag";
      
      const typeLower = type.toLowerCase();
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
      tag.innerHTML = `<i class="fa-solid ${icon}" style="font-size: 0.75rem;"></i> ${ent} <span style="font-size: 0.65rem; opacity: 0.6; margin-left: 0.25rem;">${type}</span>`;
      entitiesCloud.appendChild(tag);
    });
  } else {
    entitiesCloud.innerHTML = '<span style="color: var(--text-muted); font-size: 0.9rem;">No entities extracted.</span>';
  }

  // Interactive Transcript Dialog
  renderTranscript(call.transcript);

  // Open Drawer
  drawer.classList.add("active");
  backdrop.classList.add("active");
  drawer.setAttribute("aria-hidden", "false");
}

function closeDrawer() {
  const drawer = document.getElementById("callDrawer");
  const backdrop = document.getElementById("drawerBackdrop");
  
  if (drawer.classList.contains("active")) {
    drawer.classList.remove("active");
    backdrop.classList.remove("active");
    drawer.setAttribute("aria-hidden", "true");
  }
}

// Alternating Chat Bubbles Transcript Renderer
function renderTranscript(text) {
  const container = document.getElementById("drawerTranscript");
  container.innerHTML = "";

  if (!text) {
    container.innerHTML = '<div style="color: var(--text-muted); font-size: 0.9rem; text-align: center; padding: 1rem;">No transcript transcript available.</div>';
    return;
  }

  // Regex splitting by sentences
  const sentences = text.match(/[^.!?]+[.!?]+(\s|$)/g);
  
  if (!sentences || sentences.length === 0) {
    // Fallback if match fails: render whole text in one bubble
    appendBubble(container, "Customer", text, true);
    return;
  }

  // We alternate sentences between Customer and Agent
  // Andrea starts in the sample (Hello. Hey my name is Andrea...), so Customer starts.
  let isCustomer = true;
  
  sentences.forEach((sentence) => {
    const trimmed = sentence.trim();
    if (trimmed.length > 0) {
      appendBubble(container, isCustomer ? "Customer" : "Agent", trimmed, isCustomer);
      isCustomer = !isCustomer; // Alternate
    }
  });
}

function appendBubble(container, speaker, text, isCustomer) {
  const bubbleContainer = document.createElement("div");
  bubbleContainer.className = `chat-bubble-container ${isCustomer ? 'customer' : 'agent'}`;

  const speakerLabel = document.createElement("span");
  speakerLabel.className = "chat-speaker";
  speakerLabel.innerHTML = isCustomer 
    ? `<i class="fa-solid fa-circle-user"></i> Customer` 
    : `<i class="fa-solid fa-headset"></i> Support Agent`;

  const bubble = document.createElement("div");
  bubble.className = `chat-bubble ${isCustomer ? 'customer' : 'agent'}`;
  bubble.textContent = text;

  bubbleContainer.appendChild(speakerLabel);
  bubbleContainer.appendChild(bubble);
  container.appendChild(bubbleContainer);
}

// ==========================================================================
// Formatting Helpers
// ==========================================================================
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

// Extract Agent Name from Entities or Transcript (falling back to Hashed Deterministic Names if not found)
function getAgentName(call) {
  if (!call) return "Unknown Agent";
  
  // Combine transcript and entities for search (case-insensitive)
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
  if (!conversationName) return "Unknown Agent";
  const shortId = formatConvName(conversationName);
  const lastFour = shortId.slice(-4);
  return `Agent #${lastFour}`;
}

// Map unique AI-generated categories into 6 clean, high-level parent categories
function getParentCategory(rawCategory) {
  if (!rawCategory) return "General Inquiry";
  const cat = rawCategory.toLowerCase();
  
  if (cat.includes("technical") || cat.includes("it support") || cat.includes("license") || 
      cat.includes("lock") || cat.includes("wifi") || cat.includes("internet") || 
      cat.includes("app") || cat.includes("activation") || cat.includes("access") || 
      cat.includes("security") || cat.includes("door")) {
    return "Technical & IT Support";
  }
  
  if (cat.includes("billing") || cat.includes("payment") || cat.includes("pricing") || 
      cat.includes("charge") || cat.includes("credit") || cat.includes("dispute") || 
      cat.includes("invoice") || cat.includes("cost")) {
    return "Billing & Payments";
  }

  if (cat.includes("maintenance") || cat.includes("plumbing") || cat.includes("property") || 
      cat.includes("inspection") || cat.includes("certification") || cat.includes("vehicle") || 
      cat.includes("cleaning") || cat.includes("trash") || cat.includes("noise") || 
      cat.includes("outage") || cat.includes("abandoned")) {
    return "Maintenance & Property";
  }

  if (cat.includes("scheduling") || cat.includes("appointment") || cat.includes("logistics") || 
      cat.includes("shipment") || cat.includes("order") || cat.includes("status") || 
      cat.includes("delivery") || cat.includes("flight")) {
    return "Scheduling & Logistics";
  }
  
  if (cat.includes("booking") || cat.includes("reservation") || cat.includes("refund") || 
      cat.includes("check-in") || cat.includes("cancellation") || cat.includes("dissatisfaction") || 
      cat.includes("complaint") || cat.includes("retention") || cat.includes("greeting") || 
      cat.includes("inquiry") || cat.includes("customer service") || cat.includes("customer support") || 
      cat.includes("communication") || cat.includes("engagement") || cat.includes("handling")) {
    return "Customer Service & Booking";
  }

  return "General Inquiry";
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
    const s = c.sentiment ? c.sentiment.toLowerCase() : 'neutral';
    if (s === 'positive') return 1;
    if (s === 'negative') return -1;
    return 0;
  });

  if (state.charts.sentimentTrend) state.charts.sentimentTrend.destroy();
  state.charts.sentimentTrend = new Chart(document.getElementById("chartSentimentTrend").getContext("2d"), {
    type: "line",
    data: {
      labels: timeLabels,
      datasets: [{
        label: "Sentiment Value",
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
              if (value === 1) return "Positive";
              if (value === 0) return "Neutral";
              if (value === -1) return "Negative";
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
    if (c.resolution_status === 'resolved') {
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
        label: "Cumulative Resolution Rate (%)",
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

  // 5. Average Silence Trend
  const silencePercentages = data.map(c => Number(c.silence_percentage) * 100);

  if (state.charts.silenceTrend) state.charts.silenceTrend.destroy();
  state.charts.silenceTrend = new Chart(document.getElementById("chartSilenceTrend").getContext("2d"), {
    type: "line",
    data: {
      labels: timeLabels,
      datasets: [{
        label: "Silence Percentage (%)",
        data: silencePercentages,
        borderColor: "#f43f5e",
        backgroundColor: "rgba(244, 63, 94, 0.05)",
        borderWidth: 2.5,
        tension: 0.35,
        pointBackgroundColor: "#f43f5e",
        pointRadius: 3
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
        return;
      }
      
      const settings = data[0];
      
      if (settings.gcs_service_account) {
        localStorage.setItem("gcs_service_account", settings.gcs_service_account);
      } else {
        localStorage.removeItem("gcs_service_account");
      }
      
      if (settings.gcs_access_token) {
        localStorage.setItem("gcs_access_token", settings.gcs_access_token);
      } else {
        localStorage.removeItem("gcs_access_token");
      }
      
      if (settings.gcs_token_expiry) {
        localStorage.setItem("gcs_token_expiry", settings.gcs_token_expiry);
      } else {
        localStorage.removeItem("gcs_token_expiry");
      }
      
      if (settings.gcs_manual_token_flag) {
        localStorage.setItem("gcs_manual_token_flag", settings.gcs_manual_token_flag);
      } else {
        localStorage.removeItem("gcs_manual_token_flag");
      }

      if (settings.min_call_length !== null && settings.min_call_length !== undefined) {
        localStorage.setItem("gcs_min_call_length", String(settings.min_call_length));
      } else {
        localStorage.removeItem("gcs_min_call_length");
      }

      if (settings.max_call_length !== null && settings.max_call_length !== undefined) {
        localStorage.setItem("gcs_max_call_length", String(settings.max_call_length));
      } else {
        localStorage.removeItem("gcs_max_call_length");
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
      gcs_max_call_length: "max_call_length"
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
      gcs_max_call_length: "max_call_length"
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
      // Remove service account so we don't loop fail
      localStorage.removeItem("gcs_service_account");
      await deleteSettingFromSupabase("gcs_service_account");
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
  });

  audio.addEventListener("pause", () => {
    visualizer.classList.remove("playing");
    const activeIcon = document.querySelector(".gcs-file-item.active .gcs-file-play i");
    if (activeIcon) activeIcon.className = "fa-solid fa-play";
  });

  audio.addEventListener("ended", () => {
    visualizer.classList.remove("playing");
    const activeIcon = document.querySelector(".gcs-file-item.active .gcs-file-play i");
    if (activeIcon) activeIcon.className = "fa-solid fa-play";
  });
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
    if (fileStatus === "analyzed") {
      statusBadge = `<span class="gcs-status-badge badge-analyzed"><i class="fa-solid fa-circle-check"></i> Analyzed</span>`;
    } else if (fileStatus === "transcribed") {
      statusBadge = `<span class="gcs-status-badge badge-transcribed"><i class="fa-solid fa-file-invoice"></i> Transcribed</span>`;
    } else {
      statusBadge = `<span class="gcs-status-badge badge-pending"><i class="fa-solid fa-circle-notch"></i> Pending</span>`;
    }

    item.innerHTML = `
      <div class="gcs-checkbox-wrapper" style="margin-right: 0.5rem; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
        <input type="checkbox" class="gcs-item-checkbox" data-name="${file.name}" ${state.selectedGcsFiles.has(file.name) ? 'checked' : ''} style="cursor: pointer; width: 15px; height: 15px;">
      </div>
      <div class="gcs-file-info" style="flex: 1; min-width: 0;">
        <span class="gcs-file-name" title="${displayName}" style="display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${displayName}</span>
        <span class="gcs-file-meta" style="display: block; margin-top: 0.15rem;">${sizeStr} &bull; ${updatedDate}</span>
        <div class="gcs-file-status-row" style="margin-top: 0.4rem; display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
          ${statusBadge}
          ${matchedCall ? `<button class="gcs-view-details-btn" title="Open Call Analytics Details"><i class="fa-solid fa-chart-simple"></i> Analytics</button>` : ''}
          ${fileStatus !== "pending" ? `<button class="gcs-delete-recording-btn" title="Reset recording: Delete transcript and analysis data"><i class="fa-solid fa-trash-can"></i> Reset</button>` : ''}
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
  
  // Disable checkboxes visually during processing
  document.querySelectorAll(".gcs-item-checkbox").forEach(cb => cb.disabled = true);
  
  // Fire webhook requests in parallel
  const promises = filesToAnalyze.map(async (file) => {
    const displayName = file.name.substring(GCS_PREFIX.length);
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
      
      if (response.ok || response.status === 200 || response.status === 201) {
        successful++;
        state.selectedGcsFiles.delete(file.name);
      }
    } catch (err) {
      console.error("Error triggering analysis for file:", file.name, err);
    } finally {
      completed++;
      btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Triggering (${completed}/${total})...`;
    }
  });
  
  await Promise.all(promises);
  
  btn.innerHTML = `<i class="fa-solid fa-circle-check"></i> Triggered ${successful}/${total}`;
  
  setTimeout(() => {
    btn.disabled = false;
    btn.innerHTML = originalHtml;
    if (selectAllCheckbox) selectAllCheckbox.disabled = false;
    
    renderGCSFileList();
    updateBulkActionUI();
  }, 3500);
}

function convertToCSV(arr) {
  const headers = [
    "Call ID", "Audio Filename", "Agent Name", "Duration (Min)", 
    "Sentiment", "Risk Level", "Resolution Status", "Agent Score (0-10)", 
    "Silence (Seconds)", "Silence (%)", "Total Cost (USD)", "Category", 
    "STT Provider", "STT Model", "STT Minutes", "STT Cost (USD)", "Total Processing Cost (USD)", "Created At"
  ];
  
  const rows = arr.map(c => {
    const agentName = getAgentName(c);
    const silencePct = c.silence_percentage ? (Number(c.silence_percentage) * 100).toFixed(1) + "%" : "0.0%";
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
      c.silence_seconds || "",
      silencePct,
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
  
  const btnChatApiKeyVisibility = document.getElementById("btnChatApiKeyVisibility");
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
  
  // API Key visibility toggle
  if (btnChatApiKeyVisibility && chatApiKeyInput) {
    btnChatApiKeyVisibility.addEventListener("click", () => {
      const isPassword = chatApiKeyInput.type === "password";
      chatApiKeyInput.type = isPassword ? "text" : "password";
      btnChatApiKeyVisibility.innerHTML = isPassword ? '<i class="fa-solid fa-eye-slash"></i>' : '<i class="fa-solid fa-eye"></i>';
    });
  }
  
  // Save credentials config
  if (btnSaveChatConfig) {
    btnSaveChatConfig.addEventListener("click", () => {
      const keyVal = chatApiKeyInput.value.trim();
      const modelVal = chatModelSelect.value;
      
      localStorage.setItem("gcs_openai_api_key", keyVal);
      localStorage.setItem("gcs_openai_model", modelVal);
      
      state.openaiApiKey = keyVal;
      state.openaiModel = modelVal;
      
      if (keyVal) {
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
  
  if (chatApiKeyInput) chatApiKeyInput.value = savedKey;
  if (chatModelSelect) chatModelSelect.value = savedModel;
  
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
  
  // Bind quick action chips
  const chips = document.querySelectorAll(".chat-chip");
  chips.forEach(chip => {
    chip.addEventListener("click", () => {
      const prompt = chip.getAttribute("data-prompt");
      if (chatInput) {
        chatInput.value = prompt;
        handleChatSend();
      }
    });
  });
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
  md += "| Call ID | Agent | Date | Category | Sentiment | Risk | Score | Silence % | Cost (USD) | Summary |\n";
  md += "|---|---|---|---|---|---|---|---|---|---|\n";
  
  limitedCalls.forEach(call => {
    const id = call.conversation_name || "N/A";
    const agent = getAgentName(call);
    const date = call.created_at ? call.created_at.substring(0, 10) : "N/A";
    const cat = call.category || "N/A";
    const sent = call.sentiment || "N/A";
    const risk = call.risk_level || "N/A";
    const score = call.agent_score !== null && call.agent_score !== undefined ? `${call.agent_score}/10` : "N/A";
    const silence = call.silence_percentage !== null && call.silence_percentage !== undefined ? `${(Number(call.silence_percentage) * 100).toFixed(0)}%` : "N/A";
    const cost = call.total_cost_usd !== null && call.total_cost_usd !== undefined ? `$${Number(call.total_cost_usd).toFixed(3)}` : "N/A";
    const sum = call.summary ? call.summary.replace(/\n/g, " ").substring(0, 100) + "..." : "No summary";
    
    md += `| ${id} | ${agent} | ${date} | ${cat} | ${sent} | ${risk} | ${score} | ${silence} | ${cost} | ${sum} |\n`;
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
      if (line.match(/^\|[\s:-|]*\|$/)) {
        lines[i] = "";
        continue;
      }
      const cells = line.split("|").slice(1, -1).map(c => c.trim());
      tableRows.push(cells);
      lines[i] = "";
    } else {
      if (inTable) {
        let tableHtml = "<table><thead><tr>";
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
        tableHtml += "</tbody></table>";
        lines[i - tableRows.length - 1] = tableHtml;
        inTable = false;
      }
    }
  }
  
  if (inTable) {
    let tableHtml = "<table><thead><tr>";
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
    tableHtml += "</tbody></table>";
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
    if (block.startsWith("<table") || block.startsWith("<pre") || block.startsWith("<ul") || block.startsWith("<ol") || block.startsWith("<li>")) {
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
1. CURATED METADATA (OKF): A clean Markdown table containing structural metadata of the calls (IDs, scores, sentiments, silence %, categories, summaries).
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
