const STOCKS = [
["2330","台積電",2150,2300,2600,2700],["2308","台達電",1400,1550,1800,1900],
["2454","聯發科",3000,3250,3700,3900],["2317","鴻海",210,225,250,270],
["3711","日月光投控",500,540,620,680],["2303","聯電",105,115,130,140],
["2891","中信金",42,45,50,52],["2885","元大金",32,35,39,41],
["2412","中華電",125,130,140,145],["1216","統一",65,70,78,82],
["2002","中鋼",17,18.5,21,23],["2606","裕民",50,55,65,70],
["2382","廣達",250,275,310,340],["6669","緯穎",2800,3100,3600,4000],
["3017","奇鋐",850,950,1150,1300],["2383","台光電",850,950,1150,1300],
["2345","智邦",700,780,950,1050],["2882","國泰金",55,60,67,72],
["2892","第一金",28,30,34,36],["3008","大立光",2200,2400,2800,3100],
["2912","統一超",220,230,250,265],["1301","台塑",38,42,48,52]
];

let holdings = JSON.parse(localStorage.getItem("tw_holdings_v2") || "null") || [
["0056","元大高股息",7000,40.93,51.05],["2317","鴻海",2410,163.76,260],
["2303","聯電",3400,43,116],["2330","台積電",500,921.72,2370],
["2884","玉山金",1119,23.31,38.15],["2887","台新新光金",2000,15.90,35.15],
["2002","中鋼",1000,18.92,19.05],["3481","群創",6760,21.46,47.55],
["ETF?","元大台灣領航N",3000,9.71,26.55]
];
let prices = {};
let autoRefresh = false;

function money(n){return Number(n||0).toLocaleString("zh-TW",{maximumFractionDigits:2})}
function pct(n){return (n>=0?"+":"")+n.toFixed(2)+"%"}
function stockMeta(code){return STOCKS.find(x=>x[0]===code)}
function signalFor(s){
  const [code,name,buy,strongBuy,fair,avoid]=s, p=prices[code];
  if(!p) return ["watch","等待行情"];
  if(p<=strongBuy) return ["buy","🟢 強力買進"];
  if(p<=buy) return ["buy","🟢 分批買"];
  if(p<=fair) return ["watch","🟡 觀察"];
  if(p<=avoid) return ["hold","⚪ 持有"];
  return ["sell","🔴 不追／考慮減碼"];
}
async function fetchQuote(code){
  try{
    const url=`https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_AVG_ALL`;
    const r=await fetch(url,{cache:"no-store"}); const data=await r.json();
    const x=data.find(v=>String(v.Code||v.證券代號)===code);
    if(x){let p=parseFloat(String(x.ClosingPrice||x.收盤價).replace(/,/g,"")); if(Number.isFinite(p)) return p;}
  }catch(e){}
  return null;
}
async function refreshAll(){
  document.getElementById("marketText").textContent="更新行情中…";
  const codes=[...new Set(STOCKS.map(s=>s[0]).concat(holdings.map(h=>h[0]).filter(c=>/^\d+$/.test(c))))];
  const r=await Promise.all(codes.map(async c=>[c,await fetchQuote(c)]));
  r.forEach(([c,p])=>{if(p) prices[c]=p;});
  holdings=holdings.map(h=>{const p=prices[h[0]]||h[4]; return [h[0],h[1],h[2],h[3],p]});
  localStorage.setItem("tw_holdings_v2",JSON.stringify(holdings));
  render();
  document.getElementById("marketText").textContent=`最後更新：${new Date().toLocaleString("zh-TW")}。若官方 API 暫時無回應，畫面保留上次價格。`;
}
function render(){
  holdings.forEach(h=>{prices[h[0]]=prices[h[0]]||h[4]});
  const total=holdings.reduce((a,h)=>a+h[2]*h[4],0);
  const cost=holdings.reduce((a,h)=>a+h[2]*h[3],0);
  document.getElementById("totalValue").textContent="NT$ "+money(total);
  document.getElementById("totalPnl").textContent="NT$ "+money(total-cost)+" ("+pct((total/cost-1)*100)+")";
  const buys=STOCKS.map(signalFor).filter(x=>x[0]==="buy");
  document.getElementById("buyCount").textContent=buys.length;
  const sells=holdings.map(h=>holdingSignal(h)).filter(x=>x[0]==="sell");
  document.getElementById("sellCount").textContent=sells.length;
  document.getElementById("buyList").innerHTML=rankBuys().map(cardHTML).join("")||'<div class="alert">目前沒有進入強買區，保留現金。</div>';
  document.getElementById("sellList").innerHTML=sells.map(x=>`<div class="alert sell"><b>${x[1]}</b><div>${x[2]}</div></div>`).join("")||'<div class="alert">目前沒有必須賣出的持股。</div>';
  document.getElementById("topAlerts").innerHTML=topAlerts().map(x=>`<div class="alert ${x[0]}"><b>${x[1]}</b><div>${x[2]}</div></div>`).join("")||'<div class="small">目前沒有高優先警報。</div>';
  document.getElementById("switches").innerHTML=switchIdeas();
  document.getElementById("portfolioTable").innerHTML=holdings.map(h=>{
    const ret=(h[4]/h[3]-1)*100, hs=holdingSignal(h);
    return `<tr><td><b>${h[1]}</b><div class="small">${h[0]}</div></td><td class="right">${money(h[4])}</td><td class="right">${money(h[3])}</td><td class="right ${ret>=0?'pos':'neg'}">${pct(ret)}</td><td><span class="badge ${hs[0]}">${hs[1]}</span></td></tr>`;
  }).join("");
  document.getElementById("watchTable").innerHTML=STOCKS.map(s=>{
    const sig=signalFor(s); const p=prices[s[0]];
    return `<tr><td><b>${s[1]}</b><div class="small">${s[0]}</div></td><td class="right">${p?money(p):"--"}</td><td class="right">${s[2]} / ${s[3]}</td><td class="right">${s[4]}</td><td><span class="badge ${sig[0]}">${sig[1]}</span></td></tr>`;
  }).join("");
}
function holdingSignal(h){
  const [code,name,qty,cost,p]=h, ret=(p/cost-1)*100, value=p*qty;
  const meta=stockMeta(code);
  if(name.includes("群創")) return ret>100?["sell","🔴 減碼","你的報酬超過 120%，且高波動；建議分批鎖利。"]:["hold","⚪ 持有",""];
  if(code==="2330" && value>1000000 && ret>100) return ["sell","🟠 部位過重","台積電已是大型核心部位；可考慮減碼 10～20% 做資產再平衡。"];
  if(code==="2303" && ret>140) return ["sell","🟠 部分獲利","聯電已有大幅獲利，可考慮減碼 20～25%，其餘續抱。"];
  if(meta && p<=meta[3]) return ["buy","🟢 可加碼","價格進入你的安全邊際觀察區。"];
  return ["hold","⚪ 持有","基本面／價格未觸發主要警報。"];
}
function rankBuys(){
  return STOCKS.map(s=>({s, sig:signalFor(s)})).filter(x=>x.sig[0]==="buy").sort((a,b)=>{
    const pa=prices[a.s[0]]||999999,pb=prices[b.s[0]]||999999;
    return (pa/a.s[3])-(pb/b.s[3]);
  }).slice(0,8).map(x=>[x.s[1],x.s[0],prices[x.s[0]],x.s[2],x.s[3],x.s[4],x.sig[1]]);
}
function cardHTML(x){return `<div class="alert buy"><div class="row"><b>${x[0]}（${x[1]}）</b><span class="badge buy">${x[6]}</span></div><div class="small">現價 ${money(x[2])}｜強買區 ≤ ${x[3]}｜分批區 ≤ ${x[4]}｜合理上緣 ${x[5]}</div></div>`}
function topAlerts(){
  const a=[];
  holdings.forEach(h=>{const s=holdingSignal(h); if(s[0]==="sell") a.push([s[0],`${h[1]} ${s[1]}`,s[2]])});
  rankBuys().slice(0,3).forEach(x=>a.push(["buy",`${x[0]}：${x[6]}`,`現價 ${money(x[2])}，已進入設定的安全邊際。`]));
  return a.slice(0,6);
}
function switchIdeas(){
  const candidates=rankBuys().slice(0,3);
  const sells=holdings.map(h=>[h,holdingSignal(h)]).filter(x=>x[1][0]==="sell");
  if(!sells.length||!candidates.length) return '<div class="small">目前沒有明確的換股訊號。</div>';
  return sells.slice(0,2).map((x,i)=>`<div class="alert"><b>🔄 ${x[0][1]} → ${candidates[i%candidates.length][0]}</b><div class="small">原因：前者出現獲利／集中度警報，後者進入買進區。先比較估值與基本面，再決定是否換股。</div></div>`).join("");
}
function requestNotify(){if("Notification" in window) Notification.requestPermission().then(p=>alert(p==="granted"?"已允許通知。":"未允許通知，請在瀏覽器設定開啟。"));else alert("此瀏覽器不支援通知。")}
function toggleAutoRefresh(){autoRefresh=!autoRefresh; alert(autoRefresh?"已開啟：App 開啟期間每 5 分鐘更新。":"已關閉自動更新。")}
document.querySelectorAll("#tabs button").forEach(b=>b.onclick=()=>{document.querySelectorAll("#tabs button").forEach(x=>x.classList.remove("active"));b.classList.add("active");document.querySelectorAll(".tab").forEach(x=>x.classList.add("hidden"));document.getElementById(b.dataset.tab).classList.remove("hidden")});
setInterval(()=>{if(autoRefresh) refreshAll()},300000);
render();
