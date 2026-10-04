const ZAIA_LOGIN_LOGO='<img src="/zaia-logo.svg" alt="ZAIA" style="max-width:190px;width:100%;height:auto">'
const DEFAULT_PRIMARY='#3b172b'
const DEFAULT_SECONDARY='#6b3149'
const DEFAULT_ACCENT='#c89a61'

function hasMerchantSession(){
  try{
    const session=JSON.parse(localStorage.getItem('beauty_os_cloud_session_v2')||'null')
    return Boolean(session?.access_token)
  }catch{return false}
}

function resetZaiaTheme(){
  const root=document.documentElement
  root.style.setProperty('--brand',DEFAULT_PRIMARY)
  root.style.setProperty('--brand-2',DEFAULT_SECONDARY)
  root.style.setProperty('--champagne',DEFAULT_ACCENT)
  document.body?.classList.remove('business-branded')
}

function enforceZaiaLogin(){
  if(hasMerchantSession())return
  const auth=document.querySelector('.zaia-auth')
  if(!auth)return

  resetZaiaTheme()
  auth.classList.remove('merchant-auth')
  auth.querySelectorAll('.auth-brand,.mobile-auth-brand').forEach(el=>{el.innerHTML=ZAIA_LOGIN_LOGO})

  const panel=auth.querySelector('.auth-panel')
  const panelStep=panel?.querySelector('.step')
  const panelTitle=panel?.querySelector('h1')
  const panelSubtitle=panel?.querySelector('.subtitle')
  if(panelStep)panelStep.textContent='BEM-VINDO À ZAIA'
  if(panelTitle)panelTitle.textContent='Entre no seu espaço.'
  if(panelSubtitle)panelSubtitle.textContent='Sua operação organizada, elegante e sempre à mão.'

  const visual=auth.querySelector('.auth-visual')
  const visualStep=visual?.querySelector('.step')
  const visualTitle=visual?.querySelector('h1')
  const visualText=visual?.querySelector('p')
  const visualPowered=visual?.querySelector('.auth-powered')
  if(visualStep)visualStep.textContent='GESTÃO PARA NEGÓCIOS DE BELEZA'
  if(visualTitle)visualTitle.innerHTML='Mais que beleza.<br>Mais possibilidades.'
  if(visualText)visualText.textContent='Agenda, equipe, clientes, estoque e inteligência em uma experiência feita para o seu negócio.'
  if(visualPowered)visualPowered.textContent='by Nethanel'

  const helper=auth.querySelector('.auth-helper')
  if(helper)helper.textContent='No primeiro acesso, a ZAIA monta uma base inicial de acordo com o segmento do estabelecimento.'
  const mobilePowered=auth.querySelector('.mobile-powered')
  if(mobilePowered)mobilePowered.textContent='by Nethanel'
}

// A tela é renderizada dinamicamente pelo app. Mantemos a identidade ZAIA
// sempre que não houver sessão autenticada de estabelecimento.
new MutationObserver(enforceZaiaLogin).observe(document.documentElement,{childList:true,subtree:true})
window.addEventListener('pageshow',enforceZaiaLogin)
setTimeout(enforceZaiaLogin,0)
setTimeout(enforceZaiaLogin,400)
