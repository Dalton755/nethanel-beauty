import { ensureSession, customerDashboard } from './cloud.js'

let busy=false
let lastSignature=''
let initialized=false

const STATUS_LABELS={
  SCHEDULED:'AGENDADO',
  CONFIRMED:'CONFIRMADO',
  IN_SERVICE:'EM ATENDIMENTO',
  COMPLETED:'CONCLUÍDO',
  CANCELLED:'CANCELADO',
  NO_SHOW:'NÃO COMPARECEU',
}

function isAgendaVisible(){
  const title=document.querySelector('.client-account-head h1')?.textContent?.trim()||''
  return title==='Próximos agendamentos'
}

function signature(data){
  const rows=[...(data?.upcoming||[]),...(data?.history||[])]
    .map(a=>[a.id,a.status,a.starts_at,a.customer_on_way_at||'',a.customer_arrived_at||'',a.service_started_at||''])
    .sort((a,b)=>String(a[0]).localeCompare(String(b[0])))
  return JSON.stringify(rows)
}

function upcomingIds(data){return (data?.upcoming||[]).map(a=>String(a.id))}

function annotateCards(data){
  if(!isAgendaVisible())return
  const cards=[...document.querySelectorAll('.client-account-list .client-account-card')]
  const upcoming=data?.upcoming||[]
  cards.forEach((card,index)=>{
    if(!card.dataset.zaiaAppointmentId&&upcoming[index]?.id){
      card.dataset.zaiaAppointmentId=String(upcoming[index].id)
    }
  })
}

function patchAgenda(data){
  if(!isAgendaVisible())return
  annotateCards(data)
  const upcoming=data?.upcoming||[]
  const byId=new Map(upcoming.map(a=>[String(a.id),a]))
  const cards=[...document.querySelectorAll('.client-account-list .client-account-card')]
  const domIds=cards.map(c=>c.dataset.zaiaAppointmentId).filter(Boolean)
  const nextIds=upcomingIds(data)

  // Se entrou ou saiu um atendimento da agenda, deixamos o próprio app reconstruir
  // a lista inteira para não manter cards antigos na tela.
  if(domIds.length!==nextIds.length||nextIds.some(id=>!domIds.includes(id))){
    const target='/cliente?tab=agenda'
    if(location.pathname+location.search!==target)history.replaceState({},'',target)
    location.reload()
    return
  }

  cards.forEach(card=>{
    const id=card.dataset.zaiaAppointmentId
    const appt=byId.get(id)
    if(!appt)return
    const status=card.querySelector('.client-status')
    if(status)status.textContent=STATUS_LABELS[appt.status]||appt.status
    const cancel=card.querySelector('[data-client-cancel]')
    const canCancel=['SCHEDULED','CONFIRMED'].includes(appt.status)&&new Date(appt.starts_at)>new Date()
    if(cancel&&!canCancel)cancel.remove()
  })
}

async function refreshLive(){
  if(busy||document.hidden||!isAgendaVisible())return
  busy=true
  try{
    const session=await ensureSession()
    if(!session)return
    const data=await customerDashboard()
    const nextSignature=signature(data)
    if(!initialized){
      initialized=true
      lastSignature=nextSignature
      annotateCards(data)
      patchAgenda(data)
      return
    }
    if(nextSignature===lastSignature)return
    lastSignature=nextSignature
    patchAgenda(data)
    window.dispatchEvent(new Event('zaia:customer-refresh'))
  }catch(error){
    console.warn('ZAIA live customer sync',error)
  }finally{
    busy=false
  }
}

window.addEventListener('focus',refreshLive)
window.addEventListener('pageshow',refreshLive)
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshLive()})
new MutationObserver(()=>{if(isAgendaVisible())setTimeout(refreshLive,80)}).observe(document.documentElement,{childList:true,subtree:true})
setTimeout(refreshLive,900)
setInterval(refreshLive,5000)
