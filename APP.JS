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
