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
  activeTheme: 'dark'
};

// Initialize Application
document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  setupTabNavigation();
  setupEventListeners();
  fetchCallData();
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
  document.getElementById("filterSentiment").addEventListener("change", applyFilters);
  document.getElementById("filterRisk").addEventListener("change", applyFilters);
  document.getElementById("filterResolution").addEventListener("change", applyFilters);
  document.getElementById("filterCategory").addEventListener("change", applyFilters);
  
  // Reset filters
  document.getElementById("resetFilters").addEventListener("click", resetFilters);

  // Drawer Close
  document.getElementById("drawerClose").addEventListener("click", closeDrawer);
  document.getElementById("drawerBackdrop").addEventListener("click", closeDrawer);
  
  // Press Escape to close drawer
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeDrawer();
  });
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
  const sentimentFilter = document.getElementById("filterSentiment").value;
  const riskFilter = document.getElementById("filterRisk").value;
  const resolutionFilter = document.getElementById("filterResolution").value;
  const categoryFilter = document.getElementById("filterCategory").value;

  state.filteredCalls = state.allCalls.filter(call => {
    // Search Filter
    const searchMatch = !searchQuery || 
      (call.conversation_name && call.conversation_name.toLowerCase().includes(searchQuery)) ||
      (call.customer_issue && call.customer_issue.toLowerCase().includes(searchQuery)) ||
      (call.summary && call.summary.toLowerCase().includes(searchQuery)) ||
      (call.transcript && call.transcript.toLowerCase().includes(searchQuery)) ||
      (call.category && call.category.toLowerCase().includes(searchQuery)) ||
      (call.entities && call.entities.toLowerCase().includes(searchQuery)) ||
      (call.next_action && call.next_action.toLowerCase().includes(searchQuery));

    // Sentiment Filter
    const sentimentMatch = sentimentFilter === "all" || call.sentiment === sentimentFilter;

    // Risk Filter
    const riskMatch = riskFilter === "all" || call.risk_level === riskFilter;

    // Resolution Filter
    const resolutionMatch = resolutionFilter === "all" || call.resolution_status === resolutionFilter;

    // Category Filter
    const categoryMatch = categoryFilter === "all" || getParentCategory(call.category) === categoryFilter;

    return searchMatch && sentimentMatch && riskMatch && resolutionMatch && categoryMatch;
  });

  updateDashboardUI();
}

function resetFilters() {
  document.getElementById("searchBar").value = "";
  document.getElementById("filterSentiment").value = "all";
  document.getElementById("filterRisk").value = "all";
  document.getElementById("filterResolution").value = "all";
  document.getElementById("filterCategory").value = "all";
  
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
