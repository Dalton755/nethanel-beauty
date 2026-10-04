const SESSION_KEY='beauty_os_cloud_session_v2'
const cfg=()=>window.BEAUTY_CONFIG||{}
const baseUrl=()=>String(cfg().supabaseUrl||'').replace(/\/$/,'')
const apiKey=()=>cfg().supabasePublishableKey||''
const schema=()=>cfg().schema||'beleza'
const money=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})
const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))
let rangePreset='month'
let loading=false
let lastEstablishmentId=null
let lastRoster=[]

function session(){try{return JSON.parse(localStorage.getItem(SESSION_KEY))}catch{return null}}
async function ensureSession(){
  let current=session();if(!current?.access_token)return null
  if((current.expires_at||0)-Math.floor(Date.now()/1000)>60)return current
  if(!current.refresh_token)return current
  const res=await fetch(`${baseUrl()}/auth/v1/token?grant_type=refresh_token`,{method:'POST',headers:{apikey:apiKey(),'Content-Type':'application/json'},body:JSON.stringify({refresh_token:current.refresh_token})})
  if(!res.ok)return current
  const data=await res.json();current={access_token:data.access_token,refresh_token:data.refresh_token||current.refresh_token,expires_at:Math.floor(Date.now()/1000)+Number(data.expires_in||3600),user:data.user||current.user||null};localStorage.setItem(SESSION_KEY,JSON.stringify(current));return current
}
async function rest(path,{method='GET',body}={}){
  const s=await ensureSession();if(!s?.access_token)throw new Error('Sem sessão ativa.')
  const res=await fetch(`${baseUrl()}/rest/v1/${path}`,{method,headers:{apikey:apiKey(),Authorization:`Bearer ${s.access_token}`,'Content-Type':'application/json','Accept-Profile':schema(),'Content-Profile':schema()},body:body===undefined?undefined:JSON.stringify(body)})
  const text=await res.text();let data=null;try{data=text?JSON.parse(text):null}catch{data=text}
  if(!res.ok)throw new Error(data?.message||data?.hint||'Falha ao carregar comissões.')
  return data
}
function iso(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function rangeFor(preset){
  const now=new Date(),end=new Date(now),start=new Date(now)
  if(preset==='month'){start.setDate(1);return {start:iso(start),end:iso(new Date(now.getFullYear(),now.getMonth()+1,0)),label:'Mês atual'}}
  const days=Number(preset||30);start.setDate(end.getDate()-Math.max(0,days-1));return {start:iso(start),end:iso(end),label:`Últimos ${days} dias`}
}
async function merchantContext(){
  const establishments=await rest('establishments?select=id,name&active=eq.true&order=created_at.asc&limit=1')
  const est=establishments?.[0];if(!est)return null
  if(lastEstablishmentId!==est.id||!lastRoster.length){
    lastEstablishmentId=est.id
    lastRoster=await rest(`professionals?select=id,name,job_title,commission_type,commission_value,active&establishment_id=eq.${encodeURIComponent(est.id)}&active=eq.true&order=name.asc`)
  }
  return {est,roster:lastRoster}
}
function commissionRule(p){
  if(!p||p.commission_type==='NONE'||!Number(p.commission_value))return 'Sem comissão'
  if(p.commission_type==='PERCENT')return `${Number(p.commission_value).toLocaleString('pt-BR',{maximumFractionDigits:2})}% por atendimento`
  return `${money(p.commission_value)} por atendimento`
}
function panelHtml(dashboard,roster,range){
  const stats=dashboard?.professionals||[];const byId=new Map(stats.map(x=>[x.id,x]));const rows=(roster||[]).map(p=>({p,s:byId.get(p.id)||{appointments:0,revenue:0,commission:0,contribution:0}})).sort((a,b)=>Number(b.s.commission||0)-Number(a.s.commission||0)||Number(b.s.revenue||0)-Number(a.s.revenue||0));const total=rows.reduce((sum,r)=>sum+Number(r.s.commission||0),0);const totalRevenue=rows.reduce((sum,r)=>sum+Number(r.s.revenue||0),0);const segments=total>0?rows.filter(r=>Number(r.s.commission)>0).map((r,i)=>`<i class="zaia-commission-segment" style="width:${Math.max(.5,Number(r.s.commission)/total*100)}%;--seg-opacity:${Math.max(.42,.98-i*.11)}" title="${esc(r.p.name)}"></i>`).join(''):''
  return `<section class="zaia-commission-panel" id="zaiaCommissionVisual"><div class="zaia-commission-head"><div><span class="eyebrow">COMISSÕES DA EQUIPE</span><h2>Distribuição por profissional</h2><p>Quanto cada profissional gerou de faturamento e comissão no período.</p></div><div class="zaia-commission-total"><span>TOTAL EM COMISSÕES</span><strong>${money(total)}</strong><small>${range.label} • faturamento ${money(totalRevenue)}</small></div></div><div class="zaia-commission-range"><button data-workforce-range="month" class="${rangePreset==='month'?'on':''}">Mês</button><button data-workforce-range="30" class="${rangePreset==='30'?'on':''}">30 dias</button><button data-workforce-range="90" class="${rangePreset==='90'?'on':''}">90 dias</button></div><div class="zaia-commission-bar">${segments}</div><div class="zaia-commission-list">${rows.length?rows.map(({p,s})=>{const commission=Number(s.commission||0),share=total>0?commission/total*100:0;return `<div class="zaia-commission-row"><span class="zaia-commission-avatar">${esc((p.name||'P')[0].toUpperCase())}</span><div class="zaia-commission-info"><strong>${esc(p.name)}</strong><span>${esc(p.job_title||'Profissional')} • ${commissionRule(p)} • ${Number(s.appointments||0)} atendimento${Number(s.appointments||0)===1?'':'s'}</span></div><div class="zaia-commission-values"><strong>${money(commission)}</strong><span>${share.toLocaleString('pt-BR',{maximumFractionDigits:1})}% das comissões • receita ${money(s.revenue)}</span></div></div>`}).join(''):`<div class="zaia-commission-empty"><strong>Nenhum profissional ativo</strong>Cadastre sua equipe para distribuir comissões.</div>`}</div>${total===0&&rows.length?`<div class="zaia-commission-empty" style="margin-top:10px"><strong>Nenhuma comissão gerada neste período</strong>Isso pode estar correto: profissionais sem comissão ou sem atendimentos concluídos aparecem com R$ 0,00.</div>`:''}</section>`
}
function clarifyFinanceCosts(dashboard){
  const stack=document.querySelector('.finance-profit-card .finance-cost-stack');if(!stack)return
  const rows=[...stack.children];const row=rows.find(item=>item.querySelector('span')?.textContent.trim()==='Despesas do período');if(!row)return
  const summary=dashboard?.summary||{};const accrued=Number(summary.expenses_accrued||0);const commissions=Number(summary.commissions||0);const otherExpenses=Math.max(0,accrued-commissions)
  const label=row.querySelector('span');const value=row.querySelector('b');if(label)label.textContent='Outras despesas';if(value)value.textContent=money(otherExpenses)
  row.title='Despesas do período sem as comissões, que já aparecem na linha acima.'
}
async function loadCommissionPanel(force=false){
  const anchor=document.querySelector('.finance-performance-grid');if(!anchor||loading)return
  if(document.querySelector('#zaiaCommissionVisual')&&!force)return
  loading=true
  try{
    const ctx=await merchantContext();if(!ctx)return
    const range=rangeFor(rangePreset);const dashboard=await rest('rpc/finance_dashboard',{method:'POST',body:{p_establishment_id:ctx.est.id,p_start_date:range.start,p_end_date:range.end}})
    document.querySelector('#zaiaCommissionVisual')?.remove()
    anchor.insertAdjacentHTML('beforebegin',panelHtml(dashboard,ctx.roster,range))
    clarifyFinanceCosts(dashboard)
    document.querySelectorAll('[data-workforce-range]').forEach(btn=>btn.addEventListener('click',async()=>{rangePreset=btn.dataset.workforceRange;document.querySelector('#zaiaCommissionVisual')?.remove();loading=false;await loadCommissionPanel(true)}))
  }catch(error){console.warn('ZAIA commission visual unavailable',error)}finally{loading=false}
}
function employeeAccessCard(){
  const main=document.querySelector('main.content');if(!main||document.querySelector('#zaiaEmployeeAccess'))return
  const title=[...main.querySelectorAll('h1.title')].find(el=>el.textContent.trim()==='Profissionais');if(!title)return
  const toolbar=main.querySelector('.toolbar');if(!toolbar)return
  const card=document.createElement('section');card.className='zaia-employee-access-card';card.id='zaiaEmployeeAccess';card.innerHTML=`<div><span class="eyebrow">ZAIA PROFISSIONAL</span><h2>Um app só para quem atende.</h2><p>Cada profissional acessa a própria agenda, confirma e conclui atendimentos, organiza seus serviços, duração, jornada e bloqueios — sem enxergar estoque, caixa ou gestão da empresa.</p><div class="zaia-employee-access-note">O vínculo é feito pelo mesmo e-mail cadastrado no perfil do profissional.</div></div><a href="/funcionario/" target="_blank" rel="noopener">Abrir app do funcionário</a>`;toolbar.before(card)
}
function ensureEnhancements(){
  if(document.querySelector('.finance-performance-grid'))loadCommissionPanel()
  employeeAccessCard()
}
const observer=new MutationObserver(()=>queueMicrotask(ensureEnhancements));observer.observe(document.documentElement,{subtree:true,childList:true});
window.addEventListener('focus',ensureEnhancements);ensureEnhancements()
