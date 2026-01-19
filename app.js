/* Driver Calc (MVP) - app.js
   - Neutral order calculator + local log
   - PRO unlock (trust-based: PayPal + code) stored in localStorage
   - PRO Reports (modal) + Export CSV
*/

"use strict";

// =====================
// Helpers
// =====================
const byId = (id) => document.getElementById(id);

const num = (v) => {
  const x = Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(x) ? x : 0;
};

const money = (v) => {
  const x = Number(v) || 0;
  return "£" + x.toFixed(2);
};

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

function fmtTime(ts) {
  try {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  } catch {
    return "";
  }
}

// =====================
// Storage
// =====================
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

// =====================
// Inputs / outputs IDs
// (estes IDs têm de existir no teu index.html)
// =====================
const IDs = {
  pay: "pay",
  minutes: "minutes",
  distance: "distance",
  cpm: "cpm", // cost per mile/km
  fixed: "fixed", // fixed cost per order (optional)

  btnCalc: "btnCalc",
  btnAdd: "btnAdd",

  outGrossPH: "out_gph",
  outCost: "out_cost",
  outNet: "out_net",
  outNetPH: "out_nph",

  // Today
  todayOrders: "s_day_orders",
  todayGross: "s_day_gross",
  todayNet: "s_day_net",
  todayAvg: "s_day_avg",
  todayTable: "t_body",

  // Summary
  sumOrders: "s_sum_orders",
  sumDayNet: "s_sum_net",
  sumAvgDay: "s_sum_avgday",
  sumLast7: "s_sum_7d",

  // PRO UI
  btnUnlock: "btnUnlock",
  btnLock: "btnLock",
  proCode: "proCode",
  proStatus: "proStatus",
  proBadge: "proBadge",

  // PRO feature buttons
  btnProReport: "btnProReport",
  btnProExport: "btnProExport",

  // PRO modal
  proModal: "proModal",
  proModalClose: "proModalClose",
  proModalX: "proModalX",
  proPeriod: "proPeriod",
  r_orders: "r_orders",
  r_minutes: "r_minutes",
  r_gross: "r_gross",
  r_costs: "r_costs",
  r_net: "r_net",
  r_nph: "r_nph",
};

// =====================
// Core calc
// =====================
function calcOne() {
  const pay = num(byId(IDs.pay)?.value);
  const minutes = num(byId(IDs.minutes)?.value);
  const distance = num(byId(IDs.distance)?.value);
  const cpm = num(byId(IDs.cpm)?.value);
  const fixed = num(byId(IDs.fixed)?.value);

  const hours = minutes / 60;
  const grossPerHour = hours > 0 ? pay / hours : 0;

  const cost = (distance * cpm) + fixed;
  const net = pay - cost;
  const netPerHour = hours > 0 ? net / hours : 0;

  return { pay, minutes, distance, cpm, fixed, grossPerHour, cost, net, netPerHour };
}

function showCalc(res) {
  const gph = byId(IDs.outGrossPH);
  const cost = byId(IDs.outCost);
  const net = byId(IDs.outNet);
  const nph = byId(IDs.outNetPH);

  if (gph) gph.textContent = money(res.grossPerHour) + "/hour gross";
  if (cost) cost.textContent = money(res.cost) + " Cost est.";
  if (net) net.textContent = money(res.net) + " Net est.";
  if (nph) nph.textContent = money(res.netPerHour) + "/hour net";
}

function addToLog() {
  const res = calcOne();

  // guarda mesmo se tiver valores baixos – a decisão é do driver
  const entry = {
    ts: Date.now(),
    pay: res.pay,
    minutes: res.minutes,
    distance: res.distance,
    cpm: res.cpm,
    fixed: res.fixed,
    grossPerHour: res.grossPerHour,
    cost: res.cost,
    net: res.net,
    netPerHour: res.netPerHour,
  };

  log.push(entry);
  save();
  render();
}

// =====================
// Today / Summary
// =====================
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
  const tbody = byId(IDs.todayTable);
  if (!tbody) return;

  tbody.innerHTML = "";

  // últimos primeiro
  const arr = [...items].slice(-50).reverse();

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
  // Calculator preview
  showCalc(calcOne());

  // Today
  const today = filterToday(log);
  const t_orders = today.length;
  const t_gross = sum(today, "pay");
  const t_net = sum(today, "net");
  const t_minutes = sum(today, "minutes");
  const t_hours = t_minutes / 60;
  const t_avg = t_hours > 0 ? (t_net / t_hours) : 0;

  const s_day_orders = byId(IDs.todayOrders);
  const s_day_gross = byId(IDs.todayGross);
  const s_day_net = byId(IDs.todayNet);
  const s_day_avg = byId(IDs.todayAvg);

  if (s_day_orders) s_day_orders.textContent = String(t_orders) + " Orders";
  if (s_day_gross) s_day_gross.textContent = money(t_gross) + " Gross";
  if (s_day_net) s_day_net.textContent = money(t_net) + " Net est.";
  if (s_day_avg) s_day_avg.textContent = money(t_avg) + " Avg £/h day";

  renderTodayTable(today);

  // Summary
  const last7 = filterLastDays(log, 7);
  const s_orders = log.length;
  const s_net = sum(log, "net");
  const s_minutes = sum(log, "minutes");
  const s_hours = s_minutes / 60;
  const s_avgday = s_hours > 0 ? (s_net / s_hours) : 0;

  const s7_net = sum(last7, "net");

  const s_sum_orders = byId(IDs.sumOrders);
  const s_sum_net = byId(IDs.sumDayNet);
  const s_sum_avgday = byId(IDs.sumAvgDay);
  const s_sum_7d = byId(IDs.sumLast7);

  if (s_sum_orders) s_sum_orders.textContent = String(s_orders) + " Day orders";
  if (s_sum_net) s_sum_net.textContent = money(s_net) + " Day net";
  if (s_sum_avgday) s_sum_avgday.textContent = money(s_avgday) + " Avg £/h day";
  if (s_sum_7d) s_sum_7d.textContent = money(s7_net) + " Last 7 days";

  refreshProUI();
}

// =====================
// PRO UNLOCK (PayPal + Code) - trust based, local only
// =====================

// 1) Mete aqui o teu link PayPal (podes usar PayPal.me)
const PAYPAL_URL = "https://www.paypal.me/TEU_LINK/2"; // <-- ALTERA ISTO

// 2) Lista de hashes SHA-256 dos códigos válidos (um por linha)
// Exemplo atual: DC2-WEEK01 -> hash b472c978...
const PRO_CODE_HASHES = [
  "b472c978d30c88c877037275f7c96cbf46a81b9570bad4a8ba6619375e59606e"
];

// 3) Chave local para o browser
const PRO_KEY = "dc_pro_unlocked_v1";

// SHA-256 (Web Crypto) -> hex
async function sha256Hex(str) {
  const data = new TextEncoder().encode(str);
  const hashBuf = await crypto.subtle.digest("SHA-256", data);
  const hashArr = Array.from(new Uint8Array(hashBuf));
  return hashArr.map(b => b.toString(16).padStart(2, "0")).join("");
}

function normCode(s) {
  return (s || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ""); // remove espaços
}

function setProUnlocked(on) {
  localStorage.setItem(PRO_KEY, on ? "1" : "0");
  refreshProUI();
}

function isProUnlocked() {
  return localStorage.getItem(PRO_KEY) === "1";
}

function refreshProUI() {
  const badge = byId(IDs.proBadge);
  const status = byId(IDs.proStatus);

  const unlocked = isProUnlocked();

  if (badge) badge.textContent = unlocked ? "UNLOCKED" : "LOCKED";
  if (status) {
    status.classList.remove("ok", "bad");
    status.textContent = unlocked ? "PRO is unlocked." : "PRO is locked.";
  }

  // enable/disable pro buttons
  const br = byId(IDs.btnProReport);
  const be = byId(IDs.btnProExport);
  if (br) br.disabled = !unlocked;
  if (be) be.disabled = !unlocked;
}

async function handleUnlock() {
  const input = byId(IDs.proCode);
  const status = byId(IDs.proStatus);
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

// =====================
// PRO Reports (modal) + CSV export
// =====================
function showProModal(on) {
  const m = byId(IDs.proModal);
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

  const period = (byId(IDs.proPeriod)?.value) || "week";
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

  set(IDs.r_orders, String(orders));
  set(IDs.r_minutes, String(Math.round(minutes)));
  set(IDs.r_gross, money(gross));
  set(IDs.r_costs, money(costs));
  set(IDs.r_net, money(net));
  set(IDs.r_nph, money(nph));
}

function downloadCSV(filename, rows) {
  const csv = rows
    .map(r => r.map(x => {
      const s = String(x ?? "");
      return `"${s.replace(/"/g, '""')}"`;
    }).join(","))
    .join("\n");

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
  rows.push(["ts","date","pay","minutes","distance","cpm","fixed","cost","net","gross_per_hour","net_per_hour"]);

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
      Number(x.fixed || 0),
      Number(x.cost || 0),
      Number(x.net || 0),
      Number(x.grossPerHour || 0),
      Number(x.netPerHour || 0),
    ]);
  }

  downloadCSV("driver-calc-log.csv", rows);
}

// =====================
// Wire UI events
// =====================
function wire() {
  const btnCalc = byId(IDs.btnCalc);
  const btnAdd = byId(IDs.btnAdd);

  if (btnCalc) btnCalc.addEventListener("click", () => {
    showCalc(calcOne());
  });

  if (btnAdd) btnAdd.addEventListener("click", addToLog);

  // inputs -> live update
  for (const id of [IDs.pay, IDs.minutes, IDs.distance, IDs.cpm, IDs.fixed]) {
    const el = byId(id);
    if (!el) continue;
    el.addEventListener("input", () => showCalc(calcOne()));
  }
}

function wireProUI() {
  const unlockBtn = byId(IDs.btnUnlock);
  const lockBtn = byId(IDs.btnLock);
  const input = byId(IDs.proCode);

  if (unlockBtn) unlockBtn.addEventListener("click", handleUnlock);
  if (lockBtn) lockBtn.addEventListener("click", () => setProUnlocked(false));

  if (input) input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") handleUnlock();
  });

  // PayPal button/link (se tiveres um botão/anchor no HTML)
  // Se no teu HTML tens um botão com id="btnPayPal", descomenta:
  // const pp = byId("btnPayPal");
  // if (pp) pp.addEventListener("click", () => window.open(PAYPAL_URL, "_blank"));

  // PRO feature buttons
  const btnReport = byId(IDs.btnProReport);
  const btnExport = byId(IDs.btnProExport);
  if (btnReport) btnReport.addEventListener("click", () => showProModal(true));
  if (btnExport) btnExport.addEventListener("click", exportLogCSV);

  // modal close
  const closeBg = byId(IDs.proModalClose);
  const closeX = byId(IDs.proModalX);
  if (closeBg) closeBg.addEventListener("click", () => showProModal(false));
  if (closeX) closeX.addEventListener("click", () => showProModal(false));

  // period change
  const periodSel = byId(IDs.proPeriod);
  if (periodSel) periodSel.addEventListener("change", updateProReport);
}

// =====================
// Boot
// =====================
load();
wire();
wireProUI();
render();

