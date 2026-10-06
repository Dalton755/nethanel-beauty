import { loadCloudState } from './cloud.js'

const BANNER_ID='zaiaMerchantPwaInstall'
let deferredInstallPrompt=null
let currentEstablishment=null
let manifestReady=false

const isStandalone=()=>window.matchMedia?.('(display-mode: standalone)')?.matches===true||window.navigator.standalone===true
const isIOS=()=>/iphone|ipad|ipod/i.test(navigator.userAgent)||((navigator.platform==='MacIntel'||navigator.userAgent.includes('Macintosh'))&&navigator.maxTouchPoints>1)

function appBase(){
  const match=location.pathname.match(/^\/([^/]+)\/(?:loja|cliente|funcionario)(?:\/|$)/)
  return match?`/${match[1]}`:''
}

function cleanColor(value,fallback){
  const raw=String(value||'').trim()
  return /^#[0-9a-f]{6}$/i.test(raw)?raw:fallback
}

function safeLogo(value){
  const raw=String(value||'').trim()
  if(!raw)return ''
  try{
    const url=new URL(raw,location.origin)
    if(url.protocol==='https:'||url.origin===location.origin)return url.href
  }catch{}
  return ''
}

function escapeHtml(value){
  return String(value??'').replace(/[&<>'"]/g,ch=>({
    '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'
  })[ch])
}

function ensureMeta(name,content){
  let meta=document.querySelector(`meta[name="${name}"]`)
  if(!meta){
    meta=document.createElement('meta')
    meta.name=name
    document.head.appendChild(meta)
  }
  meta.content=content
  return meta
}

async function ensureWorker(){
  if(!('serviceWorker' in navigator))return false
  const base=appBase()
  try{
    await navigator.serviceWorker.register(`${base}/sw.js`,{scope:`${base}/`})
    await navigator.serviceWorker.ready
    if(navigator.serviceWorker.controller)return true
    await new Promise(resolve=>{
      let done=false
      const finish=()=>{if(done)return;done=true;resolve()}
      navigator.serviceWorker.addEventListener('controllerchange',finish,{once:true})
      setTimeout(finish,2500)
    })
    return Boolean(navigator.serviceWorker.controller)
  }catch(error){
    console.warn('ZAIA PWA: service worker indisponível',error)
    return false
  }
}

function manifestUrl(est){
  const base=appBase()
  const params=new URLSearchParams({
    est:String(est.id||''),
    name:String(est.name||'ZAIA Negócios'),
    logo:safeLogo(est.brandLogoUrl),
    primary:cleanColor(est.brandPrimaryColor,'#351523'),
    secondary:cleanColor(est.brandSecondaryColor,'#f7f1ed'),
  })
  return `${base}/manifest-loja-personalizado.webmanifest?${params.toString()}`
}

async function applyStoreIdentity(est){
  if(!est?.id)return false
  const controlled=await ensureWorker()
  if(!controlled)return false

  let manifest=document.getElementById('zaiaMerchantManifest')
  if(!manifest){
    manifest=document.createElement('link')
    manifest.rel='manifest'
    manifest.id='zaiaMerchantManifest'
    document.head.appendChild(manifest)
  }
  manifest.href=manifestUrl(est)

  const logo=safeLogo(est.brandLogoUrl)
  if(logo){
    let favicon=document.querySelector('link[rel="icon"]')
    if(!favicon){favicon=document.createElement('link');favicon.rel='icon';document.head.appendChild(favicon)}
    favicon.href=logo
    favicon.removeAttribute('type')

    // iOS prioriza apple-touch-icon na instalação pela Tela de Início.
    let appleIcon=document.querySelector('link[rel="apple-touch-icon"]')
    if(!appleIcon){
      appleIcon=document.createElement('link')
      appleIcon.rel='apple-touch-icon'
      document.head.appendChild(appleIcon)
    }
    appleIcon.href=logo
  }

  const appName=String(est.name||'ZAIA Negócios').trim()||'ZAIA Negócios'
  const theme=cleanColor(est.brandPrimaryColor,'#351523')
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content',theme)
  ensureMeta('apple-mobile-web-app-capable','yes')
  ensureMeta('apple-mobile-web-app-title',appName)
  ensureMeta('apple-mobile-web-app-status-bar-style','default')
  document.title=`${appName} — ZAIA`
  manifestReady=true
  return true
}

function removeBanner(){document.getElementById(BANNER_ID)?.remove()}

function buildBanner(est,{manual=false}={}){
  if(isStandalone()||document.getElementById(BANNER_ID))return
  const dismissed=sessionStorage.getItem(`zaia_pwa_install_dismissed_${est.id}`)==='1'
  if(dismissed)return
  const logo=safeLogo(est.brandLogoUrl)
  const ios=isIOS()
  const manualText=ios
    ?'No iPhone, instale pela Tela de Início para usar o nome e a logo da loja e habilitar recursos do app.'
    :'Adicione à tela inicial para abrir como um app próprio da loja.'
  const box=document.createElement('div')
  box.id=BANNER_ID
  box.className='zaia-pwa-install-card'
  box.innerHTML=`
    <div class="zaia-pwa-install-logo">${logo?`<img src="${escapeHtml(logo)}" alt="">`:'<span>ZAIA</span>'}</div>
    <div class="zaia-pwa-install-copy">
      <strong>Instale ${escapeHtml(est.name||'o app da sua loja')}</strong>
      <span>${manual?manualText:'Tenha o app da loja na tela do celular com nome, cores e identidade do estabelecimento.'}</span>
    </div>
    <button class="zaia-pwa-install-action" type="button">${manual?'Como instalar':'Instalar app'}</button>
    <button class="zaia-pwa-install-close" type="button" aria-label="Fechar">×</button>`
  document.body.appendChild(box)
  box.querySelector('.zaia-pwa-install-close')?.addEventListener('click',()=>{
    sessionStorage.setItem(`zaia_pwa_install_dismissed_${est.id}`,'1')
    removeBanner()
  })
  box.querySelector('.zaia-pwa-install-action')?.addEventListener('click',async event=>{
    const button=event.currentTarget
    if(deferredInstallPrompt){
      button.disabled=true
      button.textContent='Abrindo...'
      try{
        deferredInstallPrompt.prompt()
        const choice=await deferredInstallPrompt.userChoice
        deferredInstallPrompt=null
        if(choice?.outcome==='accepted')removeBanner()
        else{button.disabled=false;button.textContent='Instalar app'}
      }catch(error){
        console.warn('ZAIA PWA: falha ao abrir instalação',error)
        button.disabled=false
        button.textContent='Instalar app'
      }
      return
    }
    if(isIOS()){
      alert('No Safari, toque em Compartilhar e escolha “Adicionar à Tela de Início”. Depois confirme em “Adicionar”. O app usará o nome e a logo desta loja.')
      return
    }
    alert('No Chrome, toque no menu ⋮ e escolha “Instalar app” ou “Adicionar à tela inicial”. O aplicativo será instalado com a identidade desta loja.')
  })
}

function maybeShowInstall(){
  if(!currentEstablishment||!manifestReady||isStandalone())return
  if(deferredInstallPrompt)buildBanner(currentEstablishment)
}

window.addEventListener('beforeinstallprompt',event=>{
  event.preventDefault()
  deferredInstallPrompt=event
  maybeShowInstall()
})

window.addEventListener('appinstalled',()=>{
  deferredInstallPrompt=null
  removeBanner()
  if(currentEstablishment?.id)localStorage.setItem(`zaia_pwa_installed_${currentEstablishment.id}`,'1')
})

async function init(){
  if(isStandalone())return
  try{
    const loaded=await loadCloudState()
    if(!loaded?.authenticated||!loaded?.setup||!loaded?.establishment?.id)return
    currentEstablishment=loaded.establishment
    const ok=await applyStoreIdentity(currentEstablishment)
    if(!ok)return
    maybeShowInstall()

    // Safari/iOS não expõe beforeinstallprompt. No Chrome, alguns aparelhos também
    // demoram a expor o evento após a troca dinâmica do manifesto.
    setTimeout(()=>{
      if(!isStandalone()&&!document.getElementById(BANNER_ID)&&!deferredInstallPrompt){
        buildBanner(currentEstablishment,{manual:true})
      }
    },4500)
  }catch(error){
    console.warn('ZAIA PWA: não foi possível preparar o app personalizado',error)
  }
}

const style=document.createElement('style')
style.textContent=`
.zaia-pwa-install-card{position:fixed;left:14px;right:14px;bottom:calc(92px + env(safe-area-inset-bottom));z-index:13950;display:grid;grid-template-columns:auto 1fr auto auto;align-items:center;gap:11px;padding:13px 14px;border:1px solid rgba(53,21,35,.12);border-radius:20px;background:rgba(255,252,249,.985);box-shadow:0 16px 42px rgba(35,16,25,.18);font-family:inherit;color:#24191f}.zaia-pwa-install-logo{width:44px;height:44px;border-radius:14px;display:grid;place-items:center;overflow:hidden;background:#f1e8e3;box-shadow:inset 0 0 0 1px rgba(53,21,35,.08)}.zaia-pwa-install-logo img{width:100%;height:100%;object-fit:cover}.zaia-pwa-install-logo span{font-size:9px;font-weight:900;color:#351523}.zaia-pwa-install-copy{display:flex;flex-direction:column;gap:3px;min-width:0}.zaia-pwa-install-copy strong{font-size:13px;line-height:1.25}.zaia-pwa-install-copy span{font-size:10.5px;line-height:1.35;color:#766a70}.zaia-pwa-install-action{border:0;border-radius:13px;padding:10px 13px;background:var(--brand,#351523);color:#fff;font:800 11px/1 inherit;white-space:nowrap}.zaia-pwa-install-action:disabled{opacity:.62}.zaia-pwa-install-close{border:0;background:transparent;color:#887b82;font-size:23px;line-height:1;padding:4px}@media(max-width:560px){.zaia-pwa-install-card{grid-template-columns:auto 1fr auto}.zaia-pwa-install-action{grid-column:2;justify-self:start}.zaia-pwa-install-close{grid-column:3;grid-row:1}}
`
document.head.appendChild(style)

init()
