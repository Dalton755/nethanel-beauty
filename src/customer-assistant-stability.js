const ASSISTANT_SEARCH_KEY='zaia_assistant_pending_search'
let attempts=0
let running=false
let verifyTimer=null

function q(sel){return document.querySelector(sel)}
function pending(){return sessionStorage.getItem(ASSISTANT_SEARCH_KEY)||''}

function submitSearch(term){
  const input=q('#clientSearch')
  const form=q('#clientSearchForm')
  if(!input||!form)return false

  input.value=term
  input.dispatchEvent(new Event('input',{bubbles:true}))

  // Aguarda o client.js terminar de ligar os listeners do formulário.
  setTimeout(()=>{
    const currentForm=q('#clientSearchForm')
    const currentInput=q('#clientSearch')
    if(!currentForm||!currentInput)return
    currentInput.value=term
    currentInput.dispatchEvent(new Event('input',{bubbles:true}))
    if(typeof currentForm.requestSubmit==='function')currentForm.requestSubmit()
    else currentForm.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}))
  },120)
  return true
}

function verify(term){
  clearTimeout(verifyTimer)
  verifyTimer=setTimeout(()=>{
    const input=q('#clientSearch')
    const loading=q('.client-loading')
    const stillPending=pending()

    // A busca foi incorporada pelo estado do app quando o campo reaparece
    // com o termo correto após o render dos resultados.
    if(input&&input.value.trim()===term&&!loading){
      sessionStorage.removeItem(ASSISTANT_SEARCH_KEY)
      attempts=0
      running=false
      return
    }

    if(stillPending&&attempts<30){
      running=false
      run()
    }
  },800)
}

function run(){
  const term=pending()
  if(!term||running||!location.pathname.startsWith('/cliente'))return
  running=true

  const tick=()=>{
    const current=pending()
    if(!current){running=false;return}
    const input=q('#clientSearch')
    const form=q('#clientSearchForm')
    const loading=q('.client-loading')

    if(input&&form&&!loading){
      attempts++
      submitSearch(current)
      running=false
      verify(current)
      return
    }

    if(attempts++>=30){running=false;return}
    setTimeout(tick,250)
  }

  tick()
}

const observer=new MutationObserver(()=>{
  if(pending())setTimeout(run,180)
})
observer.observe(document.documentElement,{childList:true,subtree:true})

window.addEventListener('pageshow',()=>{if(pending())setTimeout(run,500)})
window.addEventListener('focus',()=>{if(pending())setTimeout(run,250)})

if(location.pathname.startsWith('/cliente')&&pending())setTimeout(run,650)
