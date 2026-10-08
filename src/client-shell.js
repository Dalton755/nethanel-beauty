import { signInWithGoogle } from './cloud.js'

const CANONICAL_ORIGIN='https://zaia.nethanel.com.br'
const LEGACY_ORIGIN='https://nethanel-beauty.vercel.app'
const CANONICAL=`${CANONICAL_ORIGIN}/cliente`

if(location.origin===LEGACY_ORIGIN){
  location.replace(CANONICAL_ORIGIN+location.pathname+location.search+location.hash)
}

function ensureClientLinks(){
  document.querySelectorAll('.client-business-link').forEach(a=>a.setAttribute('href','/loja'))
}

document.addEventListener('click',e=>{
  const google=e.target.closest?.('#clientGoogleLogin')
  if(google){
    e.preventDefault()
    e.stopImmediatePropagation()
    localStorage.setItem('zaia_google_return_to',location.pathname+location.search)
    window.zaiaCaptureBooking?.()
    signInWithGoogle(`${location.origin}/cliente`)
    return
  }
  const merchant=e.target.closest?.('.client-business-link')
  if(merchant){
    e.preventDefault()
    location.href='/loja'
  }
},true)

const observer=new MutationObserver(ensureClientLinks)
observer.observe(document.documentElement,{childList:true,subtree:true})
ensureClientLinks()

if('serviceWorker' in navigator){
  window.addEventListener('load',async()=>{
    try{await navigator.serviceWorker.register('/sw-cliente.js',{scope:'/cliente'})}catch{}
  })
}
