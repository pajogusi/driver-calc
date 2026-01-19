"use strict";

/* =========================
   Driver Calc - app.js
   - Neutral calculator + local log
   - PRO unlock (trust-based) + localStorage
   - PRO Reports modal + Export CSV
========================= */

// ---------- Helpers ----------
const byId = (id) => document.getElementById(id);

const num = (v) => {
  const x = Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(x) ? x : 0;
};

const money = (v) => {
  const x = Number(v) || 0;
  return "£" + x.toFixed(2);
};

function fmtTime(ts) {
  try {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

// ---------- Storage ----------
const LOG_KEY = "dc_log_v1";
let log = [];

function load() {
  try {
    const raw = localStorage.getItem(LOG_KEY);
    log = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(log)) log = [];
  } catch {
    log = [];
  }
}

function save() {
  localStorage.setItem(LOG_KEY, JSON.stringify(log));
}

// ---------- PRO ----------
const PAYPAL_URL = "const PAYPAL_URL = "https://www.paypal.me/calculadora1970/2";
"; // <-- mete o teu link

// Hash do código DC2-WEEK01 (já confirmado por ti)
const PRO_CODE_HASHES = [
  "b472c978d30c88c877037275f7c96cbf46a81b9570bad4a8ba6619375e59606e"
];

const PRO_KEY = "dc_pro_unlocked_v1";

function normCode(s) {
  return (s || "").trim().toUpperCase().replace(/\s+/g, "");
}

async function sha256Hex(str) {
  const data = new TextEncoder().encode(str);
  const hashBuf = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(hashBuf)].map(b => b.toString(16).padStart(2, "0")).join("");
}

function isProUnlocked() {
  return localStorage.getItem(PRO_KEY) === "1";
}

function setProUnlocked(on) {
  localStorage.setItem(PRO_KEY, on ? "1" : "0");
  refreshProUI();
}

// ---------- Calculator ----------
function calcOne() {
  const pay = num(byId("pay")?.value);
  const mins = num(byId("mins")?.value);
  const dist = num(byId("dist")?.value);
  const cpm = num(byId("cpm")?.value);

  const hours = mins / 60;
  const gph = hours > 0 ? pay / hours : 0;

  // custo estimado só por distância (por agora)
  const cost = dist * cpm;

  const net = pay - cost;
  const nph = hours > 0 ? net / hours : 0;

  return { pay, mins, dist, cpm, gph, cost, net, nph };
}

function showCalc(res) {
  const k_gph = byId("k_gph");
  const k_cost = byId("k_cost");
  const k_net  = byId("k_net");
  const k_nph  = byId("k_nph");

  if (k_gph) k_gph.textContent = money(res.gph);
  if (k_cost) k_cost.textContent = money(res.cost);
  if (k_net)  k_net.textContent  = money(res.net);
  if (k_nph)  k_nph.textContent  = money(res.nph);
}

function addToLog() {
  const r = calcOne();

  const entry = {
    ts: Date.now(),
    pay: r.pay,
    minutes: r.mins,
    distance: r.dist,
    cpm: r.cpm,
    cost: r.cost,
    net: r.net,
    grossPerHour: r.gph,
    netPerHour: r.nph
  };

  log.push(entry);
  save();
  render();
}

// ---------- Rendering (Today + Summary) ----------
function isSameDay(a, b) {
  const da = new Date(a);
  const db = new Date(b);
  return da.getFullYear() === db.getFullYear() &&
         da.getMonth() === db.getMonth() &&
         da.getDate() === db.getDate();
}

function sum(items, key) {
  return items.reduce((acc, x) => acc + (Number(x[key]) || 0), 0);
}

function filterToday(items) {
  const now = Date.now();
  return items.filter(x => isSameDay(x.ts || 0, now));
}

function filterLastDays(items, days) {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return items.filter(x => (x.ts || 0) >= cutoff);
}

function renderTodayTable(items) {
  const tbody = byId("tbody");
  if (!tbody) return;

  tbody.innerHTML = "";
  const arr = [...items].slice(-80).reverse();

  for (const x of arr) {
    const tr = document.createElement("tr");

    const tdTime = document.createElement("td");
    tdTime.textContent = fmtTime(x.ts || 0);

    const tdPay = document.createElement("td");
    tdPay.textContent = money(x.pay || 0);

    const tdNet = document.createElement("td");
    tdNet.textContent = money(x.net || 0);

    const tdNph = document.createElement("td");
    tdNph.textContent = money(x.netPerHour || 0);

    tr.appendChild(tdTime);
    tr.appendChild(tdPay);
    tr.appendChild(tdNet);
    tr.appendChild(tdNph);

    tbody.appendChild(tr);
  }
}

function render() {
  // live preview
  showCalc(calcOne());

  // Today section
  const today = filterToday(log);
  const orders = today.length;
  const gross = sum(today, "pay");
  const net = sum(today, "net");

  const d_orders = byId("d_orders");
  const d_gross = byId("d_gross");
  const d_net = byId("d_net");

  if (d_orders) d_orders.textContent = String(orders);
  if (d_gross) d_gross.textContent = money(gross);
  if (d_net) d_net.textContent = money(net);

  renderTodayTable(today);

  // Summary section
  const minutesAll = sum(log, "minutes");
  const hoursAll = minutesAll / 60;
  const netAll = sum(log, "net");
  const avgDay = hoursAll > 0 ? (netAll / hoursAll) : 0;

  const s_day_orders = byId("s_day_orders");
  const s_day_net = byId("s_day_net");
  const s_day_avg = byId("s_day_avg");
  const s_week_net = byId("s_week_net");

  const last7 = filterLastDays(log, 7);
  const net7 = sum(last7, "net");

  if (s_day_orders) s_day_orders.textContent = String(log.length);
  if (s_day_net) s_day_net.textContent = money(netAll);
  if (s_day_avg) s_day_avg.textContent = money(avgDay);
  if (s_week_net) s_week_net.textContent = money(net7);

  refreshProUI();
}

// ---------- PRO UI ----------
function refreshProUI() {
  const pill = byId("proPill");
  const status = byId("proStatus");
  const proCard = byId("proCard");
  const btnReport = byId("btnProReport");
  const btnExport = byId("btnProExport");

  const unlocked = isProUnlocked();

  if (pill) pill.textContent = unlocked ? "UNLOCKED" : "LOCKED";

  if (proCard) {
    if (unlocked) proCard.classList.remove("locked");
    else proCard.classList.add("locked");
  }

  if (status) {
    status.classList.remove("ok", "bad");
    status.textContent = unlocked ? "PRO is unlocked." : "PRO is locked.";
  }

  if (btnReport) btnReport.disabled = !unlocked;
  if (btnExport) btnExport.disabled = !unlocked;
}

async function handleUnlock() {
  const input = byId("proCode");
  const status = byId("proStatus");
  const code = normCode(input ? input.value : "");

  if (!code) {
    if (status) {
      status.classList.remove("ok");
      status.classList.add("bad");
      status.textContent = "Enter a PRO code.";
    }
    return;
  }

  const h = await sha256Hex(code);
  const ok = PRO_CODE_HASHES.includes(h);

  if (ok) {
    setProUnlocked(true);
    if (input) input.value = "";
    if (status) {
      status.classList.remove("bad");
      status.classList.add("ok");
      status.textContent = "Unlocked.";
    }
  } else {
    if (status) {
      status.classList.remove("ok");
      status.classList.add("bad");
      status.textContent = "Invalid code.";
    }
  }
}

// ---------- PRO Reports modal ----------
function showProModal(on) {
  const m = byId("proModal");
  if (!m) return;

  if (on) {
    m.classList.remove("hidden");
    m.setAttribute("aria-hidden", "false");
    updateProReport();
  } else {
    m.classList.add("hidden");
    m.setAttribute("aria-hidden", "true");
  }
}

function periodFilter(items, period) {
  const now = new Date();

  if (period === "all") return items;

  if (period === "week") {
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return items.filter(x => (x.ts || 0) >= cutoff);
  }

  if (period === "month") {
    const y = now.getFullYear();
    const m = now.getMonth();
    const start = new Date(y, m, 1).getTime();
    const end = new Date(y, m + 1, 1).getTime();
    return items.filter(x => (x.ts || 0) >= start && (x.ts || 0) < end);
  }

  return items;
}

function updateProReport() {
  if (!isProUnlocked()) return;

  const period = byId("proPeriod")?.value || "week";
  const items = periodFilter(log || [], period);

  const orders = items.length;
  const minutes = sum(items, "minutes");
  const gross = sum(items, "pay");
  const costs = sum(items, "cost");
  const net = sum(items, "net");
  const hours = minutes / 60;
  const nph = hours > 0 ? (net / hours) : 0;

  const set = (id, val) => {
    const el = byId(id);
    if (el) el.textContent = val;
  };

  set("r_orders", String(orders));
  set("r_minutes", String(Math.round(minutes)));
  set("r_gross", money(gross));
  set("r_costs", money(costs));
  set("r_net", money(net));
  set("r_nph", money(nph));
}

// ---------- Export CSV ----------
function downloadCSV(filename, rows) {
  const csv = rows.map(r =>
    r.map(x => `"${String(x ?? "").replace(/"/g, '""')}"`).join(",")
  ).join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function exportLogCSV() {
  if (!isProUnlocked()) return;

  const rows = [];
  rows.push(["ts","date","pay","minutes","distance","cpm","cost","net","gross_per_hour","net_per_hour"]);

  for (const x of (log || [])) {
    const ts = x.ts || 0;
    const d = ts ? new Date(ts).toISOString() : "";
    rows.push([
      ts,
      d,
      Number(x.pay || 0),
      Number(x.minutes || 0),
      Number(x.distance || 0),
      Number(x.cpm || 0),
      Number(x.cost || 0),
      Number(x.net || 0),
      Number(x.grossPerHour || 0),
      Number(x.netPerHour || 0),
    ]);
  }

  downloadCSV("driver-calc-log.csv", rows);
}

// ---------- Wire events ----------
function wire() {
  // Calculator buttons
  const btnCalc = byId("btnCalc");
  const btnAdd = byId("btnAdd");
  if (btnCalc) btnCalc.addEventListener("click", () => showCalc(calcOne()));
  if (btnAdd) btnAdd.addEventListener("click", addToLog);

  // live update on inputs
  ["pay","mins","dist","cpm"].forEach(id => {
    const el = byId(id);
    if (el) el.addEventListener("input", () => showCalc(calcOne()));
  });

  // PayPal link
  const pp = byId("paypalBtn");
  if (pp) pp.href = PAYPAL_URL;

  // PRO unlock
  const unlockBtn = byId("btnUnlock");
  const lockBtn = byId("btnLock");
  const codeInput = byId("proCode");
  if (unlockBtn) unlockBtn.addEventListener("click", handleUnlock);
  if (lockBtn) lockBtn.addEventListener("click", () => setProUnlocked(false));
  if (codeInput) codeInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") handleUnlock();
  });

  // PRO buttons
  const btnReport = byId("btnProReport");
  const btnExport = byId("btnProExport");
  if (btnReport) btnReport.addEventListener("click", () => showProModal(true));
  if (btnExport) btnExport.addEventListener("click", exportLogCSV);

  // modal close
  const closeBg = byId("proModalClose");
  const closeX = byId("proModalX");
  if (closeBg) closeBg.addEventListener("click", () => showProModal(false));
  if (closeX) closeX.addEventListener("click", () => showProModal(false));

  // period change
  const periodSel = byId("proPeriod");
  if (periodSel) periodSel.addEventListener("change", updateProReport);
}

// ---------- Boot (wait for DOM) ----------
document.addEventListener("DOMContentLoaded", () => {
  load();
  wire();
  render();
});


