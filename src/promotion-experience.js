import { publicPromotions, loadCloudState } from './cloud.js'

const CLIENT_PATH='/cliente'
const q=(s,r=document)=>r.querySelector(s)
const qa=(s,r=document)=>[...r.querySelectorAll(s)]
const esc=(v='')=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
let clientBusy=false
let merchantBusy=false
let lastClientSignature=''
let lastMerchantSignature=''

function dateKey(date,timeZone='America/Sao_Paulo'){
  return new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).format(date)
}
function timeLabel(iso,timeZone='America/Sao_Paulo'){
  return new Intl.DateTimeFormat('pt-BR',{timeZone,hour:'2-digit',minute:'2-digit'}).format(new Date(iso))
}
function dayLabel(iso,timeZone='America/Sao_Paulo'){
  const date=new Date(iso),now=new Date()
  const key=dateKey(date,timeZone),today=dateKey(now,timeZone)
  const tomorrowDate=new Date(now.getTime()+86400000),tomorrow=dateKey(tomorrowDate,timeZone)
  if(key===today)return 'Hoje'
  if(key===tomorrow)return 'Amanhã'
  return new Intl.DateTimeFormat('pt-BR',{timeZone,day:'2-digit',month:'2-digit'}).format(date)
}
function promotionState(p){
  if(p?.active===false)return 'INACTIVE'
  const now=Date.now(),start=new Date(p.starts_at||p.startsAt).getTime(),end=new Date(p.ends_at||p.endsAt).getTime()
  if(Number.isFinite(end)&&end<now)return 'ENDED'
  if(Number.isFinite(start)&&start>now)return 'UPCOMING'
  return 'ACTIVE'
}
function clientCard(p){
  const state=promotionState(p)
  const tz=p.timezone||'America/Sao_Paulo'
  const when=`${dayLabel(p.starts_at,tz)} • ${timeLabel(p.starts_at,tz)}–${timeLabel(p.ends_at,tz)}`
  const stateLabel=state==='ACTIVE'?'Ativa agora':'Em breve'
  const service=p.service_name?`<span class="zaia-promo-service">${esc(p.service_name)}</span>`:''
  const distance=p.distance_km!=null?`<small>${String(p.distance_km).replace('.',',')} km de você</small>`:''
  return `<button class="zaia-client-promo-card ${state==='ACTIVE'?'is-active':'is-upcoming'}" data-zaia-promo-store="${esc(p.establishment_id)}">
    <div class="zaia-client-promo-top"><span class="zaia-promo-state">${stateLabel}</span><span class="zaia-promo-when">${esc(when)}</span></div>
    <div class="zaia-client-promo-store">${esc(p.establishment_name)}</div>
    <h3>${esc(p.title)}</h3>
    <strong class="zaia-client-promo-offer">${esc(p.offer_text)}</strong>
    ${p.description?`<p>${esc(p.description)}</p>`:''}
    <div class="zaia-client-promo-bottom">${service}<b>Ver estabelecimento →</b></div>
    ${distance}
  </button>`
}
async function renderClientPromotions(){
  if(clientBusy||!location.pathname.startsWith(CLIENT_PATH))return
  const main=q('.client-account-main')
  if(!main)return
  const heading=q('.client-account-head h1',main)
  if(!heading||!/promoções/i.test(heading.textContent||''))return
  clientBusy=true
  try{
    const rows=await publicPromotions({radiusKm:50})||[]
    const signature=rows.map(p=>`${p.id}:${p.starts_at}:${p.ends_at}:${p.promotion_state}`).join('|')
    if(signature===lastClientSignature&&q('.zaia-client-promotions',main))return
    lastClientSignature=signature
    q('.client-promotions-grid',main)?.remove()
    const oldEmpty=q('.client-empty',main)
    oldEmpty?.remove()
    q('.zaia-client-promotions',main)?.remove()
    const wrap=document.createElement('section')
    wrap.className='zaia-client-promotions'
    if(rows.length){
      const active=rows.filter(p=>promotionState(p)==='ACTIVE')
      const upcoming=rows.filter(p=>promotionState(p)==='UPCOMING')
      wrap.innerHTML=`${active.length?`<div class="zaia-promo-section-title"><span>AGORA</span><h2>Ofertas ativas</h2></div><div class="zaia-client-promo-list">${active.map(clientCard).join('')}</div>`:''}${upcoming.length?`<div class="zaia-promo-section-title future"><span>EM BREVE</span><h2>Próximas ofertas</h2></div><div class="zaia-client-promo-list">${upcoming.map(clientCard).join('')}</div>`:''}`
    }else{
      wrap.innerHTML='<div class="client-empty zaia-promo-empty"><strong>Nenhuma promoção disponível agora.</strong><p>Ofertas ativas e programadas para os próximos dias aparecerão aqui.</p></div>'
    }
    heading.closest('.client-account-head')?.insertAdjacentElement('afterend',wrap)
  }catch(error){console.warn('ZAIA promotions client',error)}finally{clientBusy=false}
}

function merchantStateLabel(p){
  const state=promotionState(p)
  return state==='ACTIVE'?'Ativa agora':state==='UPCOMING'?'Agendada':state==='ENDED'?'Encerrada':'Inativa'
}
async function decorateMerchantPromotions(){
  if(merchantBusy||!location.pathname.startsWith('/loja'))return
  const cards=qa('.promotion-admin-card')
  if(!cards.length)return
  merchantBusy=true
  try{
    const data=await loadCloudState()
    const promos=data?.promotions||[]
    const signature=promos.map(p=>`${p.id}:${p.startsAt}:${p.endsAt}:${p.active}`).join('|')
    if(signature===lastMerchantSignature&&cards.every(c=>c.dataset.promoStatusDone==='1'))return
    lastMerchantSignature=signature
    cards.forEach(card=>{
      const id=q('[data-promotion-edit]',card)?.dataset.promotionEdit
      const p=promos.find(x=>x.id===id)
      if(!p)return
      const state=promotionState(p),pill=q('.product-tags .pill',card)
      if(pill){
        pill.textContent=merchantStateLabel(p)
        pill.classList.remove('good','zaia-promo-upcoming','zaia-promo-ended','zaia-promo-inactive')
        if(state==='ACTIVE')pill.classList.add('good')
        if(state==='UPCOMING')pill.classList.add('zaia-promo-upcoming')
        if(state==='ENDED')pill.classList.add('zaia-promo-ended')
        if(state==='INACTIVE')pill.classList.add('zaia-promo-inactive')
      }
      card.dataset.promoStatusDone='1'
    })
    const subtitle=q('.page-heading .subtitle')
    if(subtitle&&q('.page-heading .title')?.textContent?.trim()==='Promoções')subtitle.textContent='Crie ofertas, programe campanhas futuras e acompanhe quando cada promoção entra no ar.'
  }catch(error){console.warn('ZAIA promotions merchant',error)}finally{merchantBusy=false}
}

function schedule(){
  requestAnimationFrame(()=>{renderClientPromotions();decorateMerchantPromotions()})
}

document.addEventListener('click',e=>{
  const card=e.target.closest('[data-zaia-promo-store]')
  if(card){location.assign(`/cliente?loja=${encodeURIComponent(card.dataset.zaiaPromoStore)}`)}
})
new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true})
window.addEventListener('focus',schedule)
window.addEventListener('pageshow',schedule)
setInterval(schedule,60000)
setTimeout(schedule,300)
