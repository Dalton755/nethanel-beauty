const DEFAULT_PRIMARY='#3b172b'
const DEFAULT_SECONDARY='#6b3149'
const DEFAULT_ACCENT='#c89a61'
const ZAIA_LOGIN_LOGO_SRC='/zaia-logo.svg'
let scheduled=false

function hasMerchantSession(){
  try{
    const session=JSON.parse(localStorage.getItem('beauty_os_cloud_session_v2')||'null')
    return Boolean(session?.access_token)
  }catch{return false}
}

function setText(el,value){
  if(el&&el.textContent!==value)el.textContent=value
}

function resetZaiaTheme(){
  const root=document.documentElement
  if(root.style.getPropertyValue('--brand')!==DEFAULT_PRIMARY)root.style.setProperty('--brand',DEFAULT_PRIMARY)
  if(root.style.getPropertyValue('--brand-2')!==DEFAULT_SECONDARY)root.style.setProperty('--brand-2',DEFAULT_SECONDARY)
  if(root.style.getPropertyValue('--champagne')!==DEFAULT_ACCENT)root.style.setProperty('--champagne',DEFAULT_ACCENT)
  document.body?.classList.remove('business-branded')
}

function ensureZaiaLogo(el){
  if(!el)return
  const img=el.querySelector('img')
  if(img?.getAttribute('src')===ZAIA_LOGIN_LOGO_SRC&&el.childElementCount===1)return
  el.replaceChildren(Object.assign(document.createElement('img'),{
    src:ZAIA_LOGIN_LOGO_SRC,
    alt:'ZAIA',
  }))
  const logo=el.querySelector('img')
  if(logo){logo.style.maxWidth='190px';logo.style.width='100%';logo.style.height='auto'}
}

function enforceZaiaLogin(){
  scheduled=false
  if(hasMerchantSession())return
  const auth=document.querySelector('.zaia-auth')
  if(!auth)return

  resetZaiaTheme()
  auth.classList.remove('merchant-auth')
  auth.querySelectorAll('.auth-brand,.mobile-auth-brand').forEach(ensureZaiaLogo)

  const panel=auth.querySelector('.auth-panel')
  setText(panel?.querySelector('.step'),'BEM-VINDO À ZAIA')
  setText(panel?.querySelector('h1'),'Entre no seu espaço.')
  setText(panel?.querySelector('.subtitle'),'Sua operação organizada, elegante e sempre à mão.')

  const visual=auth.querySelector('.auth-visual')
  setText(visual?.querySelector('.step'),'GESTÃO PARA NEGÓCIOS DE BELEZA')
  const visualTitle=visual?.querySelector('h1')
  if(visualTitle&&visualTitle.innerHTML!=='Mais que beleza.<br>Mais possibilidades.')visualTitle.innerHTML='Mais que beleza.<br>Mais possibilidades.'
  setText(visual?.querySelector('p'),'Agenda, equipe, clientes, estoque e inteligência em uma experiência feita para o seu negócio.')
  setText(visual?.querySelector('.auth-powered'),'by Nethanel')
  setText(auth.querySelector('.auth-helper'),'No primeiro acesso, a ZAIA monta uma base inicial de acordo com o segmento do estabelecimento.')
  setText(auth.querySelector('.mobile-powered'),'by Nethanel')
}

function scheduleEnforce(){
  if(scheduled)return
  scheduled=true
  requestAnimationFrame(enforceZaiaLogin)
}

new MutationObserver(scheduleEnforce).observe(document.documentElement,{childList:true,subtree:true})
window.addEventListener('pageshow',scheduleEnforce)
scheduleEnforce()
setTimeout(scheduleEnforce,400)
