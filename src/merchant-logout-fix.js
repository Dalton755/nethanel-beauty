const SESSION_KEY='beauty_os_cloud_session_v2'
const BRAND_CACHE_KEY='zaia_last_business_brand_v1'
let leaving=false

function clearMerchantSession(){
  try{localStorage.removeItem(SESSION_KEY)}catch{}
  try{localStorage.removeItem(BRAND_CACHE_KEY)}catch{}
  try{sessionStorage.removeItem('zaia_after_google')}catch{}
}

function resetMerchantTheme(){
  const root=document.documentElement
  root.style.setProperty('--brand','#3b172b')
  root.style.setProperty('--brand-2','#6b3149')
  root.style.setProperty('--champagne','#c89a61')
  document.body?.classList.remove('business-branded')
}

// Intercepta antes do handler antigo do app para evitar renderização intermediária
// com estado vazio enquanto outros observadores ainda estão ativos.
document.addEventListener('click',event=>{
  const button=event.target.closest?.('#logoutBtn')
  if(!button||leaving)return
  leaving=true
  event.preventDefault()
  event.stopImmediatePropagation()
  button.disabled=true
  button.textContent='Saindo...'
  clearMerchantSession()
  resetMerchantTheme()
  location.replace('/loja')
},true)
