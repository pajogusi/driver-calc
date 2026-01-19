function money(n){ return "£" + n.toFixed(2); }

function keyToday(){
  const d=new Date();
  return `dc_${d.toISOString().slice(0,10)}`;
}

function getLog(){
  return JSON.parse(localStorage.getItem(keyToday())||"[]");
}

function saveLog(arr){
  localStorage.setItem(keyToday(),JSON.stringify(arr));
}

function calc(){
  const pay=+payEl.value, mins=+minsEl.value;
  const dist=+distEl.value, cpm=+cpmEl.value;
  if(!pay||!mins) return null;
  const h=mins/60;
  const cost=dist*cpm;
  return {
    pay, net:pay-cost, nph:(pay-cost)/h
  };
}

const payEl=pay, minsEl=mins, distEl=dist, cpmEl=cpm;

btnCalc.onclick=()=>{
  const r=calc(); if(!r) return;
  k_gph.textContent=money(r.pay/(minsEl.value/60));
  k_cost.textContent=money(r.pay-r.net);
  k_net.textContent=money(r.net);
  k_nph.textContent=money(r.nph);
};

btnAdd.onclick=()=>{
  const r=calc(); if(!r) return;
  const log=getLog();
  log.unshift({...r,time:new Date().toLocaleTimeString()});
  saveLog(log);
  render();
};

function render(){
  const log=getLog();
  tbody.innerHTML="";
  let gross=0, net=0, hours=0;

  log.forEach(o=>{
    gross+=o.pay; net+=o.net; hours+=o.pay/o.nph;
    tbody.innerHTML+=`<tr>
      <td>${o.time}</td>
      <td>${money(o.pay)}</td>
      <td>${money(o.net)}</td>
      <td>${money(o.nph)}</td>
    </tr>`;
  });

  d_orders.textContent=log.length;
  d_gross.textContent=money(gross);
  d_net.textContent=money(net);
  s_day_orders.textContent=log.length;
  s_day_net.textContent=money(net);
  s_day_avg.textContent=hours?money(net/hours):"£0.00";
}

render();
// =====================
// PRO UNLOCK (PayPal + Code) - trust based, local only
// =====================

// 1) Mete aqui o teu link PayPal (podes usar PayPal.me ou um botão PayPal)
const PAYPAL_URL = "https://www.paypal.me/TEU_LINK/2"; // <-- ALTERA ISTO

// 2) Lista de hashes SHA-256 dos códigos válidos (um por linha)
//    Não metas os códigos em texto aqui, mete só os hashes.
const PRO_CODE_HASHES = ["b472c978d30c88c877037275f7c96cbf46a81b9570bad4a8ba6619375e59606e"];

// 3) Chave local para o browser
const PRO_KEY = "dc_pro_unlocked_v1";

// Helpers
function setProUnlocked(on){
  localStorage.setItem(PRO_KEY, on ? "1" : "0");
  refreshProUI();
}

function isProUnlocked(){
  return localStorage.getItem(PRO_KEY) === "1";
}

// SHA-256 (Web Crypto) -> hex
async function sha256Hex(str){
  const data = new TextEncoder().encode(str);
  const hashBuf = await crypto.subtle.digest("SHA-256", data);
  const hashArr = Array.from(new Uint8Array(hashBuf));
  return hashArr.map(b => b.toString(16).padStart(2, "0")).join("");
}

function normCode(s){
  return (s || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/[^A-Z0-9-]/g, "");
}

function byId(id){ return document.getElementById(id); }

function refreshProUI(){
  const card = byId("proCard");
  const pill = byId("proPill");
  const status = byId("proStatus");
  const btnReport = byId("btnProReport");
  const btnExport = byId("btnProExport");
  const paypalBtn = byId("paypalBtn");

  if (paypalBtn) paypalBtn.href = PAYPAL_URL;

  const on = isProUnlocked();

  if (card) {
    card.classList.toggle("locked", !on);
    card.classList.toggle("unlocked", on);
  }
  if (pill) pill.textContent = on ? "UNLOCKED" : "LOCKED";

  if (btnReport) btnReport.disabled = !on;
  if (btnExport) btnExport.disabled = !on;

  if (status){
    status.classList.remove("ok","bad");
    status.textContent = on ? "PRO unlocked on this device." : "PRO is locked.";
    status.classList.add(on ? "ok" : "bad");
  }
}

// Eventos
async function handleUnlock(){
  const input = byId("proCode");
  const status = byId("proStatus");
  const code = normCode(input ? input.value : "");

  if (!code){
    if (status){
      status.classList.remove("ok");
      status.classList.add("bad");
      status.textContent = "Enter a PRO code.";
    }
    return;
  }

  const h = await sha256Hex(code);
  const ok = PRO_CODE_HASHES.includes(h);

  if (ok){
    setProUnlocked(true);
    if (input) input.value = "";
  } else {
    if (status){
      status.classList.remove("ok");
      status.classList.add("bad");
      status.textContent = "Invalid code.";
    }
  }
  }

function wireProUI(){
  const unlockBtn = byId("btnUnlock");
  const lockBtn = byId("btnLock");
  const input = byId("proCode");

  if (unlockBtn) unlockBtn.addEventListener("click", handleUnlock);
  if (lockBtn) lockBtn.addEventListener("click", () => setProUnlocked(false));
  if (input) input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") handleUnlock();
  });

  // placeholders (depois ligamos a features reais)
  const btnReport = byId("btnProReport");
  const btnExport = byId("btnProExport");
  if (btnReport) btnReport.addEventListener("click", () => alert("PRO Reports: next step"));
  if (btnExport) btnExport.addEventListener("click", () => alert("PRO CSV Export: next step"));
}

// Arranque
wireProUI();
refreshProUI();
