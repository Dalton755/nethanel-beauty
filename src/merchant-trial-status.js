import { loadCloudState, getMerchantSubscription } from './cloud.js'

const BRAND_CACHE='zaia_last_business_brand_v1'
let busy=false
let lastSignature=''

const q=(s,r=document)=>r.querySelector(s)
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))
const fmtDate=value=>{
  if(!value)return '—'
  const d=new Date(value)
  if(Number.isNaN(d.getTime()))return '—'
  return d.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric'})
}
function daysRemaining(value){
  const end=new Date(value)
  if(Number.isNaN(end.getTime()))return null
  return Math.max(0,Math.ceil((end.getTime()-Date.now())/86400000))
}
function cachedEstablishmentId(){
  try{return JSON.parse(localStorage.getItem(BRAND_CACHE)||'null')?.id||null}catch{return null}
}
async function establishmentId(){
  const cached=cachedEstablishmentId()
  if(cached)return cached
  const cloud=await loadCloudState()
  return cloud?.establishment?.id||null
}
function plansScreen(){return !!q('.plans-heading')}
function ensureStyle(){
  if(q('#zaiaTrialStatusStyles'))return
  const style=document.createElement('style')
  style.id='zaiaTrialStatusStyles'
  style.textContent=`
    .zaia-trial-status-card{margin:14px 0 18px;border:1px solid #ead8c7;border-radius:22px;padding:18px;background:linear-gradient(145deg,#fff8ed,#fffdf9);box-shadow:0 10px 30px rgba(73,42,31,.055)}
    .zaia-trial-status-card .eyebrow{color:#9a651b}
    .zaia-trial-status-card h2{margin:5px 0 6px;font-size:22px;letter-spacing:-.025em;color:var(--ink,#241a20)}
    .zaia-trial-status-card p{margin:0;color:var(--muted,#777381);font-size:13px;line-height:1.5}
    .zaia-trial-status-card strong{color:var(--ink,#241a20)}
    .zaia-trial-status-note{margin-top:11px;padding-top:11px;border-top:1px solid rgba(154,101,27,.14);font-size:11px!important}
    .zaia-trial-used-card{background:linear-gradient(145deg,#faf7f5,#fff);border-color:#e6ded9}
    .zaia-trial-used-card .eyebrow{color:var(--brand,#3b172b)}
  `
  document.head.appendChild(style)
}
function removeCard(){q('#zaiaTrialStatusCard')?.remove()}
function disableTrialActions(){
  document.querySelectorAll('button').forEach(button=>{
    const text=String(button.textContent||'').trim()
    if(!/teste\s*(gr[aá]tis|pro)|iniciar\s*teste|testar\s*pro/i.test(text))return
    button.disabled=true
    button.textContent='Teste já utilizado'
    button.setAttribute('aria-disabled','true')
  })
}
function renderTrial(sub){
  ensureStyle()
  const status=String(sub?.status||'').toUpperCase()
  const host=q('.subscription-status-card')||q('.plans-heading')
  if(!host)return
  removeCard()

  if(status==='TRIAL'&&sub?.trial_ends_at){
    const left=daysRemaining(sub.trial_ends_at)
    const ending=left===0?'Termina hoje':left===1?'Falta 1 dia':`Faltam ${left} dias`
    const section=document.createElement('section')
    section.id='zaiaTrialStatusCard'
    section.className='zaia-trial-status-card'
    section.innerHTML=`<span class="eyebrow">TESTE PRO EM ANDAMENTO</span><h2>Seu teste vai até ${esc(fmtDate(sub.trial_ends_at))}</h2><p><strong>${esc(ending)}</strong> para aproveitar os recursos PRO liberados para esta loja.</p><p class="zaia-trial-status-note">A data final deste teste foi definida quando ele começou e não muda se a duração oferecida para novos testes for alterada depois.</p>`
    host.insertAdjacentElement('afterend',section)
    const detail=q('.subscription-status-card p')
    if(detail)detail.textContent=`Teste grátis até ${fmtDate(sub.trial_ends_at)} • ${ending}`
    return
  }

  if(status==='FREE'&&sub?.trial_used){
    const section=document.createElement('section')
    section.id='zaiaTrialStatusCard'
    section.className='zaia-trial-status-card zaia-trial-used-card'
    section.innerHTML='<span class="eyebrow">TESTE GRATUITO</span><h2>Teste já utilizado nesta loja</h2><p>O período gratuito é liberado uma única vez por estabelecimento. Alterações futuras na duração do teste não criam um novo período gratuito para quem já utilizou o benefício.</p>'
    host.insertAdjacentElement('afterend',section)
    disableTrialActions()
  }
}
async function enhance(force=false){
  if(busy||!plansScreen())return
  busy=true
  try{
    const id=await establishmentId();if(!id)return
    const sub=await getMerchantSubscription(id)
    const signature=JSON.stringify([sub?.status,sub?.trial_ends_at,sub?.trial_used,sub?.current_period_end])
    if(!force&&signature===lastSignature&&q('#zaiaTrialStatusCard'))return
    lastSignature=signature
    renderTrial(sub)
  }catch(error){console.warn('[ZAIA TRIAL STATUS]',error)}finally{busy=false}
}

if(location.pathname.startsWith('/loja')){
  const start=()=>{
    const app=q('#app')
    if(app)new MutationObserver(()=>queueMicrotask(()=>enhance())).observe(app,{childList:true,subtree:true})
    setTimeout(()=>enhance(true),350)
    setTimeout(()=>enhance(true),1400)
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true})
  else start()
  window.addEventListener('pageshow',()=>enhance(true))
  window.addEventListener('focus',()=>enhance(true))
}
