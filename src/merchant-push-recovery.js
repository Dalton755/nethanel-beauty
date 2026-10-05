import {
  loadCloudState,
  businessPushStatus,
  businessRegisterPush,
  getZaiaPushPublicKey,
  sendBusinessPushTest,
} from './cloud.js'

const BANNER_ID='zaiaPushRecoveryBanner'
const registeredKey=id=>`zaia_business_push_registered_v2_${id}`

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

function showBanner(establishment,{denied=false}={}){
  if(document.getElementById(BANNER_ID))return
  const box=document.createElement('div')
  box.id=BANNER_ID
  box.className='zaia-push-recovery-banner'
  box.innerHTML=`
    <div class="zaia-push-recovery-icon">🔔</div>
    <div class="zaia-push-recovery-copy">
      <strong>${denied?'Notificações bloqueadas neste aparelho':'Receba novos agendamentos em tempo real'}</strong>
      <span>${denied?'Libere as notificações do ZAIA nas configurações do navegador e abra a loja novamente.':'Ative este aparelho para receber agendamentos, cancelamentos e avisos da loja.'}</span>
    </div>
    ${denied?'':`<button type="button" id="zaiaPushRecoveryActivate">Ativar</button>`}
    <button type="button" class="zaia-push-recovery-close" aria-label="Fechar">×</button>`
  document.body.appendChild(box)
  box.querySelector('.zaia-push-recovery-close')?.addEventListener('click',removeBanner)
  box.querySelector('#zaiaPushRecoveryActivate')?.addEventListener('click',async event=>{
    const button=event.currentTarget
    button.disabled=true
    button.textContent='Ativando...'
    try{
      await ensureCurrentDevice(establishment,true,true)
      removeBanner()
    }catch(error){
      button.disabled=false
      button.textContent='Ativar'
      alert(String(error?.message||error))
    }
  })
}

async function subscribeCurrentDevice(establishment){
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
  localStorage.setItem(registeredKey(establishment.id),json.endpoint)
  return json.endpoint
}

async function ensureCurrentDevice(establishment,interactive=false,sendTest=false){
  if(!supported())return false
  let permission=Notification.permission
  if(permission==='denied'){
    if(interactive)showBanner(establishment,{denied:true})
    return false
  }
  if(permission==='default'){
    if(!interactive)return false
    permission=await Notification.requestPermission()
  }
  if(permission!=='granted')return false
  await subscribeCurrentDevice(establishment)
  if(sendTest)await sendBusinessPushTest(establishment.id)
  document.dispatchEvent(new CustomEvent('zaia:business-push-ready',{detail:{establishmentId:establishment.id}}))
  return true
}

async function init(){
  if(!supported())return
  // O app principal autentica/carrega a loja em paralelo. Damos um pequeno tempo
  // para a sessão ser estabilizada antes de validar a inscrição deste aparelho.
  await new Promise(resolve=>setTimeout(resolve,900))
  let loaded
  try{loaded=await loadCloudState()}catch{return}
  if(!loaded?.authenticated||!loaded?.setup||!loaded?.establishment?.id)return
  const est=loaded.establishment
  if(est.planCode!=='PRO'||est.storePushEnabled===false)return

  let status=null
  try{status=await businessPushStatus(est.id)}catch{return}

  if(Notification.permission==='granted'){
    try{
      // Regrava a associação em cada aparelho autorizado. É idempotente e corrige
      // migrações de domínio, troca de loja e inscrições removidas no servidor.
      await ensureCurrentDevice(est,false,false)
      removeBanner()
      return
    }catch{}
  }

  // A loja pode estar configurada para Push e mesmo assim este aparelho não ter
  // uma inscrição. Nunca pedimos permissão sem gesto do usuário; mostramos um CTA.
  if(Number(status?.devices||0)===0){
    showBanner(est,{denied:Notification.permission==='denied'})
  }
}

const style=document.createElement('style')
style.textContent=`
.zaia-push-recovery-banner{position:fixed;left:14px;right:14px;bottom:calc(92px + env(safe-area-inset-bottom));z-index:14000;display:grid;grid-template-columns:auto 1fr auto auto;gap:10px;align-items:center;padding:13px 14px;border:1px solid rgba(70,35,45,.14);border-radius:20px;background:rgba(255,252,249,.98);box-shadow:0 14px 38px rgba(40,20,30,.18);color:#24191f;font-family:inherit}
.zaia-push-recovery-icon{width:38px;height:38px;border-radius:13px;display:grid;place-items:center;background:#f2ebe7;font-size:19px}
.zaia-push-recovery-copy{display:flex;flex-direction:column;gap:2px;min-width:0}.zaia-push-recovery-copy strong{font-size:13px;line-height:1.25}.zaia-push-recovery-copy span{font-size:11px;line-height:1.35;color:#766a70}
.zaia-push-recovery-banner>button:not(.zaia-push-recovery-close){border:0;border-radius:13px;padding:10px 13px;background:var(--brand,#3b172b);color:white;font-weight:800;font-size:11px}
.zaia-push-recovery-close{border:0;background:transparent;color:#857980;font-size:23px;line-height:1;padding:4px}
@media(max-width:520px){.zaia-push-recovery-banner{grid-template-columns:auto 1fr auto}.zaia-push-recovery-banner>button:not(.zaia-push-recovery-close){grid-column:2;justify-self:start}.zaia-push-recovery-close{grid-column:3;grid-row:1}}
`
document.head.appendChild(style)

init()
