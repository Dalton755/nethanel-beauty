import { signInWithGoogle } from './cloud.js'

const CANONICAL='https://nethanel-beauty.vercel.app/loja'

function ensureMerchantLinks(){
  document.querySelectorAll('a[href="/"]').forEach(a=>{
    if(a.closest('.auth-client-entry'))return
    if(a.textContent?.toLowerCase().includes('cliente'))return
    a.setAttribute('href','/loja')
  })
}

document.addEventListener('click',e=>{
  const google=e.target.closest?.('#googleLogin')
  if(google){
    e.preventDefault()
    e.stopImmediatePropagation()
    signInWithGoogle(CANONICAL)
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
