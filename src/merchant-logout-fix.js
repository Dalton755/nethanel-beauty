const SESSION_KEY='beauty_os_cloud_session_v2'
const SCOPED_SESSION_KEY=`${SESSION_KEY}:merchant`
const BRAND_CACHE_KEY='zaia_last_business_brand_v1'
let leaving=false

function nativeRemove(key){
  try{
    const native=window.ZAIA_SESSION_STORAGE_NATIVE?.removeItem
    if(native)return native(key)
  }catch{}
  try{localStorage.removeItem(key)}catch{}
}

function clearMerchantSession(){
  // Remove tanto a sessão nova quanto a chave antiga. A chave antiga poderia
  // ser migrada novamente no reload e fazer o app parecer travado no loading.
  nativeRemove(SCOPED_SESSION_KEY)
  nativeRemove(SESSION_KEY)
  nativeRemove(BRAND_CACHE_KEY)
  try{sessionStorage.removeItem('zaia_after_google')}catch{}
  try{sessionStorage.removeItem('zaia_merchant_logout_pending')}catch{}
}

function resetMerchantTheme(){
  const root=document.documentElement
  root.style.setProperty('--brand','#3b172b')
  root.style.setProperty('--brand-2','#6b3149')
  root.style.setProperty('--champagne','#c89a61')
  document.body?.classList.remove('business-branded')
}

// Intercepta antes do handler antigo do app, encerra a sessão de forma atômica
// e só então recarrega a tela institucional de login.
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
  try{sessionStorage.setItem('zaia_merchant_logout_done','1')}catch{}
  location.replace('/loja?logout=1')
},true)
