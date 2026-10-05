import {
  loadCloudState,
  businessRegisterPush,
  getZaiaPushPublicKey,
  sendBusinessPushTest,
} from './cloud.js'

const BANNER_ID='zaiaPushRecoveryBanner'
let currentEstablishment=null
let recovering=false
let lastRecoveryAt=0

function urlBase64ToUint8Array(base64String){
  const padding='='.repeat((4-base64String.length%4)%4)
  const base64=(base64String+padding).replace(/-/g,'+').replace(/_/g,'/')
  const raw=atob(base64)
  return Uint8Array.from([...raw].map(c=>c.charCodeAt(0)))
}

function supported(){
  return 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window
}

function removeBanner(){document.getElementById(BANNER_ID)?.remove()}

function showBanner(establishment,{denied=false,error=false}={}){
  currentEstablishment=establishment||currentEstablishment
  let box=document.getElementById(BANNER_ID)
  if(box)box.remove()
  box=document.createElement('div')
  box.id=BANNER_ID
  box.className='zaia-push-recovery-banner'
  const title=denied?'Notificações bloqueadas neste aparelho':error?'Reconecte as notificações':'Receba novos agendamentos em tempo real'
  const text=denied
    ?'Libere as notificações do ZAIA nas configurações do navegador e volte para a loja.'
    :error
      ?'Este aparelho perdeu a conexão Push. Toque para reconectar e validar agora.'
      :'Ative este aparelho para receber agendamentos, cancelamentos, estoque e avisos da loja.'
  box.innerHTML=`
    <div class="zaia-push-recovery-icon">🔔</div>
    <div class="zaia-push-recovery-copy"><strong>${title}</strong><span>${text}</span></div>
    ${denied?'':`<button type="button" id="zaiaPushRecoveryActivate">${error?'Reconectar':'Ativar'}</button>`}
    <button type="button" class="zaia-push-recovery-close" aria-label="Fechar">×</button>`
  document.body.appendChild(box)
  box.querySelector('.zaia-push-recovery-close')?.addEventListener('click',removeBanner)
  box.querySelector('#zaiaPushRecoveryActivate')?.addEventListener('click',async event=>{
    const button=event.currentTarget
    button.disabled=true
    button.textContent='Ativando...'
    try{
      const ok=await ensureCurrentDevice(currentEstablishment,true,true)
      if(ok)removeBanner()
    }catch(err){
      console.warn('ZAIA Push loja: falha ao ativar',err)
      button.disabled=false
      button.textContent='Tentar novamente'
      alert(String(err?.message||err))
    }
  })
}

async function subscribeCurrentDevice(establishment){
  if(!establishment?.id)throw new Error('Estabelecimento não identificado.')
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
  await businessRegisterPush(establishment.id,{endpoint:json.endpoint,keys:json.keys})
  return json.endpoint
}

async function ensureCurrentDevice(establishment,interactive=false,sendTest=false){
  if(!supported()||!establishment?.id)return false
  currentEstablishment=establishment
  let permission=Notification.permission
  if(permission==='denied'){
    showBanner(establishment,{denied:true})
    return false
  }
  if(permission==='default'){
    if(!interactive){showBanner(establishment);return false}
    permission=await Notification.requestPermission()
    if(permission==='denied'){showBanner(establishment,{denied:true});return false}
  }
  if(permission!=='granted')return false
  await subscribeCurrentDevice(establishment)
  lastRecoveryAt=Date.now()
  if(sendTest)await sendBusinessPushTest(establishment.id)
  document.dispatchEvent(new CustomEvent('zaia:business-push-ready',{detail:{establishmentId:establishment.id}}))
  removeBanner()
  return true
}

async function resolveEstablishment(){
  const loaded=await loadCloudState()
  if(!loaded?.authenticated||!loaded?.setup||!loaded?.establishment?.id)return null
  const est=loaded.establishment
  if(est.planCode!=='PRO'||est.storePushEnabled===false)return null
  currentEstablishment=est
  return est
}

async function recover({interactive=false,force=false}={}){
  if(!supported()||recovering)return false
  if(!force&&Date.now()-lastRecoveryAt<30000)return true
  recovering=true
  try{
    const est=currentEstablishment||await resolveEstablishment()
    if(!est)return false
    return await ensureCurrentDevice(est,interactive,false)
  }catch(error){
    console.warn('ZAIA Push loja: recuperação falhou',error)
    if(currentEstablishment)showBanner(currentEstablishment,{error:true})
    return false
  }finally{
    recovering=false
  }
}

async function init(){
  if(!supported())return
  await new Promise(resolve=>setTimeout(resolve,900))
  try{
    const est=await resolveEstablishment()
    if(!est)return
    if(Notification.permission==='granted'){
      const ok=await recover({force:true})
      if(!ok)showBanner(est,{error:true})
      return
    }
    showBanner(est,{denied:Notification.permission==='denied'})
  }catch(error){
    console.warn('ZAIA Push loja: inicialização falhou',error)
  }
}

window.addEventListener('focus',()=>recover({force:true}))
window.addEventListener('pageshow',()=>recover({force:true}))
document.addEventListener('visibilitychange',()=>{if(!document.hidden)recover({force:true})})
setInterval(()=>recover(),5*60*1000)

const style=document.createElement('style')
style.textContent=`
.zaia-push-recovery-banner{position:fixed;left:14px;right:14px;bottom:calc(92px + env(safe-area-inset-bottom));z-index:14000;display:grid;grid-template-columns:auto 1fr auto auto;gap:10px;align-items:center;padding:13px 14px;border:1px solid rgba(70,35,45,.14);border-radius:20px;background:rgba(255,252,249,.98);box-shadow:0 14px 38px rgba(40,20,30,.18);color:#24191f;font-family:inherit}
.zaia-push-recovery-icon{width:38px;height:38px;border-radius:13px;display:grid;place-items:center;background:#f2ebe7;font-size:19px}.zaia-push-recovery-copy{display:flex;flex-direction:column;gap:2px;min-width:0}.zaia-push-recovery-copy strong{font-size:13px;line-height:1.25}.zaia-push-recovery-copy span{font-size:11px;line-height:1.35;color:#766a70}.zaia-push-recovery-banner>button:not(.zaia-push-recovery-close){border:0;border-radius:13px;padding:10px 13px;background:var(--brand,#3b172b);color:white;font-weight:800;font-size:11px}.zaia-push-recovery-close{border:0;background:transparent;color:#857980;font-size:23px;line-height:1;padding:4px}@media(max-width:520px){.zaia-push-recovery-banner{grid-template-columns:auto 1fr auto}.zaia-push-recovery-banner>button:not(.zaia-push-recovery-close){grid-column:2;justify-self:start}.zaia-push-recovery-close{grid-column:3;grid-row:1}}
`
document.head.appendChild(style)

init()
