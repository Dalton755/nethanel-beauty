import {
  ensureSession,
  customerDashboard,
  customerRegisterPush,
  getZaiaPushPublicKey,
  sendZaiaPushTest,
} from './cloud.js'

let busy=false
let lastSignature=''
let initialized=false
let pushBusy=false
let lastPushRecoveryAt=0
const PUSH_BANNER_ID='zaiaCustomerPushRecovery'

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
    if(!card.dataset.zaiaAppointmentId&&upcoming[index]?.id)card.dataset.zaiaAppointmentId=String(upcoming[index].id)
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

function pushSupported(){
  return 'Notification' in window&&'serviceWorker' in navigator&&'PushManager' in window
}

function urlBase64ToUint8Array(base64String){
  const padding='='.repeat((4-base64String.length%4)%4)
  const base64=(base64String+padding).replace(/-/g,'+').replace(/_/g,'/')
  const raw=atob(base64)
  return Uint8Array.from([...raw].map(c=>c.charCodeAt(0)))
}

function removePushBanner(){document.getElementById(PUSH_BANNER_ID)?.remove()}

function showPushBanner({denied=false,error=false}={}){
  let box=document.getElementById(PUSH_BANNER_ID)
  if(box)box.remove()
  box=document.createElement('div')
  box.id=PUSH_BANNER_ID
  box.className='zaia-customer-push-recovery'
  const title=denied?'Notificações bloqueadas':error?'Reconecte seus lembretes':'Ative seus lembretes'
  const text=denied
    ?'Libere as notificações do ZAIA nas configurações do navegador e volte para o app.'
    :error
      ?'Este aparelho perdeu a conexão Push. Reconecte para continuar recebendo seus horários.'
      :'Receba confirmações, alterações, cancelamentos e lembretes dos seus agendamentos.'
  box.innerHTML=`<div class="zaia-customer-push-icon">🔔</div><div><strong>${title}</strong><span>${text}</span></div>${denied?'':`<button type="button" data-customer-push-activate>${error?'Reconectar':'Ativar'}</button>`}<button type="button" class="zaia-customer-push-close" aria-label="Fechar">×</button>`
  document.body.appendChild(box)
  box.querySelector('.zaia-customer-push-close')?.addEventListener('click',removePushBanner)
  box.querySelector('[data-customer-push-activate]')?.addEventListener('click',async event=>{
    const button=event.currentTarget
    button.disabled=true
    button.textContent='Ativando...'
    try{
      const ok=await recoverCustomerPush({interactive:true,sendTest:true,force:true})
      if(ok)removePushBanner()
    }catch(err){
      console.warn('ZAIA Push cliente: falha ao ativar',err)
      button.disabled=false
      button.textContent='Tentar novamente'
      alert(String(err?.message||err))
    }
  })
}

async function registerCustomerDevice(){
  const registration=await navigator.serviceWorker.ready
  let subscription=await registration.pushManager.getSubscription()
  if(!subscription){
    const publicKey=await getZaiaPushPublicKey()
    subscription=await registration.pushManager.subscribe({
      userVisibleOnly:true,
      applicationServerKey:urlBase64ToUint8Array(publicKey),
    })
  }
  const json=subscription.toJSON()
  if(!json.endpoint||!json.keys?.p256dh||!json.keys?.auth)throw new Error('Não foi possível criar a inscrição Push neste aparelho.')
  await customerRegisterPush({endpoint:json.endpoint,keys:json.keys})
  return json.endpoint
}

async function recoverCustomerPush({interactive=false,sendTest=false,force=false}={}){
  if(!pushSupported()||pushBusy)return false
  if(!force&&Date.now()-lastPushRecoveryAt<30000)return true
  const session=await ensureSession()
  if(!session){removePushBanner();return false}
  pushBusy=true
  try{
    let permission=Notification.permission
    if(permission==='denied'){
      showPushBanner({denied:true})
      return false
    }
    if(permission==='default'){
      if(!interactive){showPushBanner();return false}
      permission=await Notification.requestPermission()
      if(permission==='denied'){showPushBanner({denied:true});return false}
    }
    if(permission!=='granted')return false
    await registerCustomerDevice()
    lastPushRecoveryAt=Date.now()
    if(sendTest)await sendZaiaPushTest()
    removePushBanner()
    return true
  }catch(error){
    console.warn('ZAIA Push cliente: recuperação falhou',error)
    showPushBanner({error:true})
    return false
  }finally{
    pushBusy=false
  }
}

window.addEventListener('focus',()=>{refreshLive();recoverCustomerPush({force:true})})
window.addEventListener('pageshow',()=>{refreshLive();recoverCustomerPush({force:true})})
document.addEventListener('visibilitychange',()=>{if(!document.hidden){refreshLive();recoverCustomerPush({force:true})}})
new MutationObserver(()=>{if(isAgendaVisible())setTimeout(refreshLive,80)}).observe(document.documentElement,{childList:true,subtree:true})
setTimeout(refreshLive,900)
setInterval(refreshLive,5000)
setTimeout(()=>recoverCustomerPush({force:true}),1200)
setInterval(()=>recoverCustomerPush(),5*60*1000)

const pushStyle=document.createElement('style')
pushStyle.textContent=`
.zaia-customer-push-recovery{position:fixed;left:14px;right:14px;bottom:calc(88px + env(safe-area-inset-bottom));z-index:14000;display:grid;grid-template-columns:auto 1fr auto auto;gap:10px;align-items:center;padding:13px 14px;border:1px solid rgba(70,35,45,.14);border-radius:20px;background:rgba(255,252,249,.98);box-shadow:0 14px 38px rgba(40,20,30,.18);color:#24191f;font-family:inherit}.zaia-customer-push-icon{width:38px;height:38px;border-radius:13px;display:grid;place-items:center;background:#f2ebe7;font-size:19px}.zaia-customer-push-recovery>div:nth-child(2){display:flex;flex-direction:column;gap:2px;min-width:0}.zaia-customer-push-recovery strong{font-size:13px;line-height:1.25}.zaia-customer-push-recovery span{font-size:11px;line-height:1.35;color:#766a70}.zaia-customer-push-recovery>button:not(.zaia-customer-push-close){border:0;border-radius:13px;padding:10px 13px;background:var(--brand,#3b172b);color:#fff;font-weight:800;font-size:11px}.zaia-customer-push-close{border:0;background:transparent;color:#857980;font-size:23px;line-height:1;padding:4px}@media(max-width:520px){.zaia-customer-push-recovery{grid-template-columns:auto 1fr auto}.zaia-customer-push-recovery>button:not(.zaia-customer-push-close){grid-column:2;justify-self:start}.zaia-customer-push-close{grid-column:3;grid-row:1}}
`
document.head.appendChild(pushStyle)
