const ASSISTANT_SEARCH_KEY='zaia_assistant_pending_search'
let capturedTerm=sessionStorage.getItem(ASSISTANT_SEARCH_KEY)||''
let retryTimer=null
let attempts=0

function q(sel){return document.querySelector(sel)}

function capturePending(){
  const pending=sessionStorage.getItem(ASSISTANT_SEARCH_KEY)
  if(pending)capturedTerm=pending
}

function scheduleApply(delay=900){
  if(!capturedTerm)return
  clearTimeout(retryTimer)
  retryTimer=setTimeout(applyStableSearch,delay)
}

function applyStableSearch(){
  capturePending()
  if(!capturedTerm)return

  const input=q('#clientSearch')
  const form=q('#clientSearchForm')
  const loading=q('.client-loading')

  if(!input||!form||loading){
    if(attempts++<18)scheduleApply(350)
    return
  }

  const term=capturedTerm
  if(input.value.trim()!==term){
    input.value=term
    input.dispatchEvent(new Event('input',{bubbles:true}))
  }

  form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}))
  sessionStorage.removeItem(ASSISTANT_SEARCH_KEY)

  // O boot inicial do app também faz uma busca. Se ele terminar depois do
  // assistente, a consulta poderia desaparecer. Confirmamos após o render.
  setTimeout(()=>{
    const current=q('#clientSearch')
    if(!current)return
    if(current.value.trim()!==term&&attempts++<18){
      capturedTerm=term
      sessionStorage.setItem(ASSISTANT_SEARCH_KEY,term)
      scheduleApply(500)
      return
    }
    capturedTerm=''
    attempts=0
  },900)
}

capturePending()

const observer=new MutationObserver(()=>{
  capturePending()
  if(capturedTerm)scheduleApply(700)
})
observer.observe(document.documentElement,{childList:true,subtree:true})

window.addEventListener('pageshow',()=>{
  capturePending()
  if(capturedTerm)scheduleApply(1200)
})

if(location.pathname.startsWith('/cliente')&&capturedTerm)scheduleApply(1400)
