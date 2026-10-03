import { loadCloudState, listBusinessNotifications } from './cloud.js'

const POLL_MS=9000
const RECENT_MS=20*60*1000
let establishmentId=null
let polling=false
let timer=null
let pending=null
let initialized=false

const q=(s,r=document)=>r.querySelector(s)
const esc=(v='')=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
const fmtDate=iso=>new Date(iso+'T12:00:00').toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'long'}).replace(/^./,m=>m.toUpperCase())
const fmtPhone=v=>{const d=String(v||'').replace(/\D/g,'');if(d.length===11)return`(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;if(d.length===10)return`(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`;return v||''}
const seenKey=id=>`zaia_public_booking_modal_seen_${id}`
function readSeen(id){try{return new Set(JSON.parse(localStorage.getItem(seenKey(id))||'[]'))}catch{return new Set()}}
function writeSeen(id,set){localStorage.setItem(seenKey(id),JSON.stringify([...set].slice(-80)))}

function closeModal(){q('#zaiaPublicBookingModal')?.remove()}

async function bookingDetails(notification){
  try{
    const data=await loadCloudState()
    const appointment=(data.appointments||[]).find(a=>a.id===notification?.data?.appointment_id)
    if(!appointment)return null
    const client=(data.clients||[]).find(c=>c.id===appointment.clientId)
    const service=(data.services||[]).find(s=>s.id===appointment.serviceId)
    const professional=(data.professionals||[]).find(p=>p.id===appointment.professionalId)
    return {appointment,client,service,professional}
  }catch{return null}
}

async function showModal(notification){
  if(q('#zaiaPublicBookingModal')||q('.modal-backdrop')){pending=notification;return}
  const detail=await bookingDetails(notification)
  const a=detail?.appointment,c=detail?.client,s=detail?.service,p=detail?.professional
  const customer=c?.name||String(notification.body||'').split(' agendou ')[0]||'Cliente'
  const service=s?.name||'Serviço agendado'
  const professional=p?.name||'Profissional'
  const phone=c?.phone||''
  const date=a?.date?fmtDate(a.date):''
  const time=a?.time||''
  const end=a?.endTime||''
  const price=a?.price!=null?Number(a.price).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}):''
  const modal=document.createElement('div')
  modal.id='zaiaPublicBookingModal'
  modal.className='zaia-booking-modal-backdrop'
  modal.innerHTML=`<section class="zaia-booking-modal" role="dialog" aria-modal="true" aria-labelledby="zaiaBookingTitle"><button class="zaia-booking-close" data-booking-close aria-label="Fechar">×</button><div class="zaia-booking-icon">✓</div><span class="zaia-booking-kicker">NOVO AGENDAMENTO ONLINE</span><h2 id="zaiaBookingTitle">Novo horário recebido</h2><p class="zaia-booking-lead">O cliente acabou de reservar um atendimento pela ZAIA.</p><div class="zaia-booking-client"><div class="zaia-booking-avatar">${esc(customer.slice(0,1).toUpperCase())}</div><div><strong>${esc(customer)}</strong>${phone?`<span>${esc(fmtPhone(phone))}</span>`:''}</div></div><div class="zaia-booking-grid"><div><span>Serviço</span><strong>${esc(service)}</strong></div><div><span>Profissional</span><strong>${esc(professional)}</strong></div>${date?`<div><span>Data</span><strong>${esc(date)}</strong></div>`:''}${time?`<div><span>Horário</span><strong>${esc(time)}${end?'–'+esc(end):''}</strong></div>`:''}${price?`<div><span>Valor</span><strong>${esc(price)}</strong></div>`:''}<div><span>Origem</span><strong>ZAIA Online</strong></div></div><div class="zaia-booking-actions"><button class="zaia-booking-primary" data-booking-agenda>Ver na agenda</button>${phone?`<button class="zaia-booking-secondary" data-booking-whatsapp="${esc(phone)}">WhatsApp</button>`:''}<button class="zaia-booking-secondary" data-booking-close>Fechar</button></div></section>`
  document.body.appendChild(modal)
  requestAnimationFrame(()=>modal.classList.add('show'))
  if(navigator.vibrate)navigator.vibrate([80,40,80])
}

async function poll(){
  if(polling||!establishmentId||document.hidden)return
  polling=true
  try{
    const notifications=await listBusinessNotifications(establishmentId,20)
    const bookings=(notifications||[]).filter(n=>n.type==='PUBLIC_BOOKING')
    const seen=readSeen(establishmentId)
    const now=Date.now()
    if(!initialized){
      initialized=true
      const latest=bookings.find(n=>now-new Date(n.createdAt).getTime()<=5*60*1000&&!seen.has(n.id))
      bookings.filter(n=>!latest||n.id!==latest.id).forEach(n=>seen.add(n.id))
      writeSeen(establishmentId,seen)
      if(latest){pending=latest;await showModal(latest);seen.add(latest.id);writeSeen(establishmentId,seen)}
      return
    }
    const fresh=bookings.filter(n=>!seen.has(n.id)&&now-new Date(n.createdAt).getTime()<=RECENT_MS).sort((a,b)=>new Date(a.createdAt)-new Date(b.createdAt))[0]
    if(fresh){
      pending=fresh
      await showModal(fresh)
      seen.add(fresh.id);writeSeen(establishmentId,seen)
    }
  }catch(error){console.warn('ZAIA new booking modal',error)}finally{polling=false}
}

async function init(){
  if(!location.pathname.startsWith('/loja'))return
  try{
    const data=await loadCloudState()
    establishmentId=data?.establishment?.id||null
    if(!establishmentId)return
    await poll()
    timer=setInterval(poll,POLL_MS)
  }catch(error){console.warn('ZAIA booking modal init',error)}
}

document.addEventListener('click',e=>{
  if(e.target.closest('[data-booking-close]')){closeModal();pending=null;return}
  if(e.target.closest('[data-booking-agenda]')){
    closeModal();pending=null
    const button=q('[data-page="agenda"]')
    if(button)button.click();else location.assign('/loja?page=agenda')
    return
  }
  const wa=e.target.closest('[data-booking-whatsapp]')
  if(wa){const phone=String(wa.dataset.bookingWhatsapp||'').replace(/\D/g,'');window.open(`https://wa.me/55${phone.replace(/^55/,'')}`,'_blank','noopener');return}
})

new MutationObserver(()=>{
  if(pending&&!q('#zaiaPublicBookingModal')&&!q('.modal-backdrop'))showModal(pending)
}).observe(document.documentElement,{childList:true,subtree:true})

document.addEventListener('visibilitychange',()=>{if(!document.hidden)poll()})
window.addEventListener('focus',poll)
window.addEventListener('beforeunload',()=>{if(timer)clearInterval(timer)})
setTimeout(init,900)
