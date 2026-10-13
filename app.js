/* RevBid calculation module. Replace mock values with VIN, market, and auction API data at the adapter boundary below. */
const COST_FIELDS = ['parts','labor','bodyPaint','mechanical','contingency','buyerFee','gateFee','transport','titleCosts','otherCosts'];
const REPAIR_FIELDS = ['parts','labor','bodyPaint','mechanical','contingency'];
const money = value => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(Math.round(value || 0));
const num = value => Math.max(0, Number(value) || 0);
const uid = () => `deal-${Date.now()}`;

function calculate(values) {
  const salePrice = num(values.salePrice), desiredProfit = num(values.desiredProfit), targetRoi = num(values.targetRoi) / 100;
  const repairTotal = REPAIR_FIELDS.reduce((sum,key)=>sum + num(values[key]),0);
  const nonBidCosts = COST_FIELDS.reduce((sum,key)=>sum + num(values[key]),0);
  // ROI is profit / total investment. Solve sale - costs - bid >= ROI * (bid + costs).
  const roiRequiredProfit = targetRoi ? Math.max(0, (salePrice - nonBidCosts) * targetRoi / (1 + targetRoi)) : 0;
  const requiredProfit = Math.max(desiredProfit, roiRequiredProfit);
  const maximumBid = Math.max(0, salePrice - nonBidCosts - requiredProfit);
  const totalInvestment = maximumBid + nonBidCosts;
  const projectedProfit = salePrice - totalInvestment;
  const roi = totalInvestment ? projectedProfit / totalInvestment * 100 : 0;
  return { repairTotal, nonBidCosts, requiredProfit, maximumBid, totalInvestment, projectedProfit, roi };
}

const sampleDeals = [
  {id:'sample-1',year:2021,make:'Toyota',model:'4Runner SR5',mileage:42000,titleStatus:'Clean',auction:'Copart',lot:'74820136',vin:'JTEMU5JR4M5901423',salePrice:31000,marketValue:33500,desiredProfit:4500,targetRoi:18,parts:1800,labor:1100,bodyPaint:700,mechanical:450,contingency:500,buyerFee:720,gateFee:99,transport:650,titleCosts:320,otherCosts:280,status:'Watching'},
  {id:'sample-2',year:2020,make:'Ford',model:'F-150 XLT',mileage:68400,titleStatus:'Clean',auction:'Manheim',lot:'MZ-29018',vin:'1FTEW1E52LFB23419',salePrice:29200,marketValue:30500,desiredProfit:4000,targetRoi:16,parts:950,labor:750,bodyPaint:0,mechanical:600,contingency:350,buyerFee:650,gateFee:75,transport:425,titleCosts:300,otherCosts:250,status:'Bid'},
  {id:'sample-3',year:2019,make:'Honda',model:'CR-V EX-L',mileage:51900,titleStatus:'Rebuilt',auction:'IAA',lot:'42699821',vin:'7FARW2H8XKE042911',salePrice:21800,marketValue:23900,desiredProfit:3200,targetRoi:15,parts:1100,labor:900,bodyPaint:950,mechanical:300,contingency:400,buyerFee:580,gateFee:99,transport:550,titleCosts:280,otherCosts:225,status:'Repairing'}
];
const store = { get(){try{return JSON.parse(localStorage.getItem('revbid-deals')) || sampleDeals}catch{return sampleDeals}}, set(deals){localStorage.setItem('revbid-deals',JSON.stringify(deals))} };
let deals = store.get(), editingId = null;
const form = document.querySelector('#dealForm');
function formValues(){ return Object.fromEntries(new FormData(form).entries()); }
function title(d){return `${d.year || ''} ${d.make || ''} ${d.model || ''}`.trim() || 'Untitled vehicle'}
function statusClass(status){return status.replaceAll(' ','-')}
function updateResultPanel(){ const r = calculate(formValues()); document.querySelector('#maximumBid').textContent=money(r.maximumBid); document.querySelector('#totalInvestment').textContent=money(r.totalInvestment); document.querySelector('#projectedProfit').textContent=money(r.projectedProfit); document.querySelector('#calculatedRoi').textContent=`${r.roi.toFixed(1)}%`; document.querySelector('#nonBidCosts').textContent=money(r.nonBidCosts); document.querySelector('#repairTotal').textContent=money(r.repairTotal); }
function dealRow(d){const r=calculate(d); return `<tr><td><div class="vehicle-name">${title(d)}</div><div class="vehicle-meta">${Number(d.mileage||0).toLocaleString()} mi · ${d.auction || 'No auction'}</div></td><td><span class="status ${statusClass(d.status)}">${d.status}</span></td><td>${money(r.maximumBid)}</td><td class="${r.projectedProfit >= 0 ? 'profit-positive':'profit-negative'}">${money(r.projectedProfit)}</td><td><button class="text-button edit-deal" data-id="${d.id}">Open →</button></td></tr>`}
function dealCard(d){const r=calculate(d);return `<article class="deal-card edit-deal" data-id="${d.id}"><div class="card-kicker"><span>${d.auction || 'No auction'} · ${d.lot || 'No lot'}</span><span class="status ${statusClass(d.status)}">${d.status}</span></div><h3>${title(d)}</h3><p class="details">${Number(d.mileage||0).toLocaleString()} miles · ${d.titleStatus || 'Title unknown'}</p><div class="card-financials"><div><span>MAX BID</span><strong>${money(r.maximumBid)}</strong></div><div><span>PROJECTED PROFIT</span><strong class="${r.projectedProfit>=0?'profit-positive':'profit-negative'}">${money(r.projectedProfit)}</strong></div></div></article>`}
function render(){const active=deals.filter(d=>!['Sold','Ready for Sale'].includes(d.status)), figures=active.map(calculate), profit=figures.reduce((s,r)=>s+r.projectedProfit,0), roi=figures.length?figures.reduce((s,r)=>s+r.roi,0)/figures.length:0; document.querySelector('#dealCount').textContent=deals.length; document.querySelector('#pipelineValue').textContent=money(active.reduce((s,d)=>s+num(d.salePrice),0));document.querySelector('#pipelineCount').textContent=active.length;document.querySelector('#activeDeals').textContent=active.length;document.querySelector('#expectedProfit').textContent=money(profit);document.querySelector('#averageRoi').textContent=`${roi.toFixed(1)}%`;document.querySelector('#attentionCount').textContent=figures.filter(r=>r.roi<10).length;document.querySelector('#recentDeals').innerHTML=deals.slice(0,4).map(dealRow).join('') || '<tr><td colspan="5">No saved deals yet.</td></tr>'; const filter=document.querySelector('#statusFilter').value;document.querySelector('#dealCards').innerHTML=deals.filter(d=>filter==='All'||d.status===filter).map(dealCard).join('') || '<p>No deals match this status.</p>';}
function switchView(view){document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id===view));document.querySelectorAll('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.view===view));const titles={dashboard:['DEAL INTELLIGENCE','Your deal desk'],calculator:['DEAL CALCULATOR','Deal Desk'],deals:['DEAL LIBRARY','Saved deals']};document.querySelector('#pageEyebrow').textContent=titles[view][0];document.querySelector('#pageTitle').textContent=titles[view][1];window.scrollTo({top:0,behavior:'smooth'});}
function openNew(){ editingId=null;form.reset();form.elements.year.value=new Date().getFullYear()-2;form.elements.status.value='Watching';form.elements.targetRoi.value=18;form.elements.desiredProfit.value=4000;document.querySelector('#formHeading').textContent='Build your bid';updateResultPanel();switchView('calculator');}
function edit(id){const d=deals.find(x=>x.id===id);if(!d)return;editingId=id;Object.entries(d).forEach(([k,v])=>{if(form.elements[k])form.elements[k].value=v});document.querySelector('#formHeading').textContent=`Editing ${title(d)}`;updateResultPanel();switchView('calculator');}
function toast(text){const el=document.querySelector('#toast');el.textContent=text;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),2600)}
document.querySelectorAll('.nav-item').forEach(b=>b.addEventListener('click',()=>switchView(b.dataset.view)));document.querySelectorAll('[data-view-link]').forEach(b=>b.addEventListener('click',()=>switchView(b.dataset.viewLink)));document.querySelectorAll('.new-deal').forEach(b=>b.addEventListener('click',openNew));form.addEventListener('input',updateResultPanel);document.querySelector('#resetForm').addEventListener('click',openNew);document.querySelector('#statusFilter').addEventListener('change',render);document.addEventListener('click',e=>{const el=e.target.closest('.edit-deal');if(el)edit(el.dataset.id)});document.querySelector('#showFormula').addEventListener('click',()=>document.querySelector('#formulaDialog').showModal());document.querySelector('.modal-close').addEventListener('click',()=>document.querySelector('#formulaDialog').close());
form.addEventListener('submit',e=>{e.preventDefault();if(!form.checkValidity()){form.reportValidity();return}const data={...formValues(),id:editingId||uid()};deals=editingId?deals.map(d=>d.id===editingId?data:d):[data,...deals];store.set(deals);render();toast(editingId?'Deal updated':'Deal saved to your library');switchView('deals')});
render();updateResultPanel();
