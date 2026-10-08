import { signInWithGoogle } from './cloud.js'

const CANONICAL_ORIGIN='https://zaia.nethanel.com.br'
const LEGACY_ORIGIN='https://nethanel-beauty.vercel.app'
const CANONICAL=`${CANONICAL_ORIGIN}/loja`

if(location.origin===LEGACY_ORIGIN){
  location.replace(CANONICAL_ORIGIN+location.pathname+location.search+location.hash)
}

function ensureMerchantLinks(){
  document.querySelectorAll('a[href="/"]').forEach(a=>{
    if(a.closest('.auth-client-entry'))return
    if(a.textContent?.toLowerCase().includes('cliente'))return
    a.setAttribute('href','/loja')
  })

  const brandLoginUrl=document.querySelector('#brandLoginUrl')
  if(brandLoginUrl?.value){
    try{
      const url=new URL(brandLoginUrl.value,location.origin)
      if(url.origin===LEGACY_ORIGIN||url.origin===CANONICAL_ORIGIN){
        const loja=url.searchParams.get('loja')
        brandLoginUrl.value=loja?`${CANONICAL}?loja=${encodeURIComponent(loja)}`:CANONICAL
      }
    }catch{}
  }
}

document.addEventListener('click',e=>{
  const google=e.target.closest?.('#googleLogin')
  if(google){
    e.preventDefault()
    e.stopImmediatePropagation()
    signInWithGoogle(`${location.origin}/loja`)
    return
  }
  const home=e.target.closest?.('a[href="/"]')
  if(home&&!home.closest('.auth-client-entry')){
    e.preventDefault()
    location.href='/loja'
  }
},true)

const observer=new MutationObserver(ensureMerchantLinks)
observer.observe(document.documentElement,{childList:true,subtree:true})
ensureMerchantLinks()

if('serviceWorker' in navigator){
  window.addEventListener('load',async()=>{
    try{await navigator.serviceWorker.register('/sw-loja.js',{scope:'/loja'})}catch{}
  })
}
