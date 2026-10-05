import {
  loadCloudState,
  businessPushStatus,
  businessRegisterPush,
  getZaiaPushPublicKey,
  sendBusinessPushTest,
} from './cloud.js'

const BANNER_ID='zaiaPushRecoveryBanner'
const SW_URL=new URL('./sw.js',import.meta.url).pathname
let currentEstablishment=null
let recovering=false
let lastRecoveryAt=0
let lastSuccessfulEndpoint=''
let initTimer=null

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

function showBanner(establishment,{denied=false,error=false,message=''}={}){
  currentEstablishment=establishment||currentEstablishment
  document.getElementById(BANNER_ID)?.remove()
  const box=document.createElement('div')
  box.id=BANNER_ID
  box.className='zaia-push-recovery-banner'
  const title=denied?'Notificações bloqueadas neste aparelho':error?'Reconecte as notificações':'Receba novos agendamentos em tempo real'
  const text=message||(
    denied
      ?'Libere as notificações do ZAIA nas configurações do navegador e volte para a loja.'
      :error
        ?'Este aparelho não está conectado ao Push da loja. Toque para reconectar e validar agora.'
        :'Ative este aparelho para receber agendamentos, cancelamentos, estoque e avisos da loja.'
  )
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
      const est=currentEstablishment||await resolveEstablishment()
      const ok=await ensureCurrentDevice(est,true,true)
      if(ok){
        button.textContent='Ativado ✓'
        setTimeout(removeBanner,500)
      }else{
        button.disabled=false
        button.textContent='Tentar novamente'
      }
    }catch(err){
      console.warn('ZAIA Push loja: falha ao ativar',err)
      button.disabled=false
      button.textContent='Tentar novamente'
      showBanner(currentEstablishment,{error:true,message:String(err?.message||err)})
    }
  })
}

async function withTimeout(promise,ms,message){
  let timer
  try{
    return await Promise.race([
      promise,
      new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error(message)),ms)}),
    ])
  }finally{
    clearTimeout(timer)
  }
}

async function currentServiceWorker(){
  // Não dependemos mais de um registro fire-and-forget feito por outro módulo.
  // Este fluxo registra/atualiza o SW que realmente será usado pelo Push deste origin.
  const registration=await navigator.serviceWorker.register(SW_URL,{updateViaCache:'none'})
  try{await registration.update()}catch{}
  if(registration.active)return registration
  return withTimeout(
    navigator.serviceWorker.ready,
    12000,
    'O serviço de notificações não ficou pronto. Feche e abra o ZAIA e tente novamente.'
  )
}

async function subscribeCurrentDevice(establishment){
  if(!establishment?.id)throw new Error('Estabelecimento não identificado.')
  const registration=await currentServiceWorker()
  let subscription=await registration.pushManager.getSubscription()
  if(!subscription){
    const publicKey=await getZaiaPushPublicKey()
    subscription=await registration.pushManager.subscribe({
      userVisibleOnly:true,
      applicationServerKey:urlBase64ToUint8Array(publicKey),
    })
  }

  const json=subscription.toJSON()
  if(!json.endpoint||!json.keys?.p256dh||!json.keys?.auth){
    throw new Error('Não foi possível criar a inscrição Push neste aparelho.')
  }

  // Sempre regrava a inscrição. Isso reativa no banco um endpoint que o navegador
  // ainda possui, mas que havia sido marcado como inativo após falha/migração.
  await businessRegisterPush(establishment.id,{endpoint:json.endpoint,keys:json.keys})

  const status=await businessPushStatus(establishment.id)
  if(Number(status?.devices||0)<1){
    throw new Error('O ZAIA criou a inscrição, mas o servidor ainda não confirmou este aparelho.')
  }

  lastSuccessfulEndpoint=json.endpoint
  return {endpoint:json.endpoint,status,registration}
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
    if(!interactive){
      showBanner(establishment)
      return false
    }
    permission=await Notification.requestPermission()
    if(permission==='denied'){
      showBanner(establishment,{denied:true})
      return false
    }
  }

  if(permission!=='granted')return false

  const result=await subscribeCurrentDevice(establishment)
  lastRecoveryAt=Date.now()
  if(sendTest)await sendBusinessPushTest(establishment.id)
  document.dispatchEvent(new CustomEvent('zaia:business-push-ready',{
    detail:{establishmentId:establishment.id,devices:Number(result.status?.devices||0),endpoint:result.endpoint}
  }))
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

async function recover({interactive=false,force=false,sendTest=false}={}){
  if(!supported()||recovering)return false
  if(!force&&Date.now()-lastRecoveryAt<30000)return true
  recovering=true
  try{
    const est=currentEstablishment||await resolveEstablishment()
    if(!est)return false
    return await ensureCurrentDevice(est,interactive,sendTest)
  }catch(error){
    console.warn('ZAIA Push loja: recuperação falhou',error)
    if(currentEstablishment){
      showBanner(currentEstablishment,{error:true,message:String(error?.message||error)})
    }
    return false
  }finally{
    recovering=false
  }
}

async function initAttempt(attempt=0){
  if(!supported())return
  try{
    const est=currentEstablishment||await resolveEstablishment()
    if(!est){
      // O módulo pode carregar alguns milissegundos antes da sessão/loja terminar
      // de hidratar. Antes havia uma única tentativa; agora aguardamos a loja ficar pronta.
      if(attempt<10){
        clearTimeout(initTimer)
        initTimer=setTimeout(()=>initAttempt(attempt+1),1200+attempt*350)
      }
      return
    }

    if(Notification.permission==='granted'){
      const ok=await recover({force:true})
      if(!ok)showBanner(est,{error:true})
      return
    }

    showBanner(est,{denied:Notification.permission==='denied'})
  }catch(error){
    console.warn('ZAIA Push loja: inicialização falhou',error)
    if(attempt<10){
      clearTimeout(initTimer)
      initTimer=setTimeout(()=>initAttempt(attempt+1),1500+attempt*350)
    }
  }
}

async function diagnostics(){
  const result={supported:supported(),permission:supported()?Notification.permission:'unsupported',establishmentId:currentEstablishment?.id||null,lastRecoveryAt,lastSuccessfulEndpoint:lastSuccessfulEndpoint||null}
  if(!supported())return result
  try{
    const reg=await navigator.serviceWorker.getRegistration(SW_URL)
    result.serviceWorker={scope:reg?.scope||null,active:Boolean(reg?.active),waiting:Boolean(reg?.waiting),installing:Boolean(reg?.installing)}
    const sub=reg?await reg.pushManager.getSubscription():null
    result.browserSubscription=Boolean(sub)
    result.endpoint=sub?.endpoint||null
  }catch(error){result.browserError=String(error?.message||error)}
  try{
    const est=currentEstablishment||await resolveEstablishment()
    if(est?.id)result.serverStatus=await businessPushStatus(est.id)
  }catch(error){result.serverError=String(error?.message||error)}
  return result
}

window.zaiaPushDiagnostics=diagnostics
window.zaiaReconnectBusinessPush=()=>recover({interactive:true,force:true,sendTest:true})
window.addEventListener('focus',()=>recover({force:true}))
window.addEventListener('pageshow',()=>recover({force:true}))
document.addEventListener('visibilitychange',()=>{if(!document.hidden)recover({force:true})})
document.addEventListener('zaia:business-state-ready',()=>recover({force:true}))
setInterval(()=>recover(),5*60*1000)

const style=document.createElement('style')
style.textContent=`
.zaia-push-recovery-banner{position:fixed;left:14px;right:14px;bottom:calc(92px + env(safe-area-inset-bottom));z-index:14000;display:grid;grid-template-columns:auto 1fr auto auto;gap:10px;align-items:center;padding:13px 14px;border:1px solid rgba(70,35,45,.14);border-radius:20px;background:rgba(255,252,249,.98);box-shadow:0 14px 38px rgba(40,20,30,.18);color:#24191f;font-family:inherit}
.zaia-push-recovery-icon{width:38px;height:38px;border-radius:13px;display:grid;place-items:center;background:#f2ebe7;font-size:19px}.zaia-push-recovery-copy{display:flex;flex-direction:column;gap:2px;min-width:0}.zaia-push-recovery-copy strong{font-size:13px;line-height:1.25}.zaia-push-recovery-copy span{font-size:11px;line-height:1.35;color:#766a70}.zaia-push-recovery-banner>button:not(.zaia-push-recovery-close){border:0;border-radius:13px;padding:10px 13px;background:var(--brand,#3b172b);color:white;font-weight:800;font-size:11px}.zaia-push-recovery-close{border:0;background:transparent;color:#857980;font-size:23px;line-height:1;padding:4px}@media(max-width:520px){.zaia-push-recovery-banner{grid-template-columns:auto 1fr auto}.zaia-push-recovery-banner>button:not(.zaia-push-recovery-close){grid-column:2;justify-self:start}.zaia-push-recovery-close{grid-column:3;grid-row:1}}
`
document.head.appendChild(style)

initAttempt()
