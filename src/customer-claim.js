const CLAIM_SESSION_KEY='beauty_os_cloud_session_v2'
const CLAIM_PENDING_KEY='zaia_pending_customer_invite_v1'
const claimCfg=()=>window.BEAUTY_CONFIG||{}
const claimBaseUrl=()=>String(claimCfg().supabaseUrl||'').replace(/\/$/,'')
const claimApiKey=()=>claimCfg().supabasePublishableKey||''
const claimSchema=()=>claimCfg().schema||'beleza'
const claimEsc=value=>String(value||'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]))

function readClaimSession(){
  try{return JSON.parse(localStorage.getItem(CLAIM_SESSION_KEY)||'null')}catch{return null}
}

function currentInviteToken(){
  const fromUrl=new URLSearchParams(location.search).get('convite')
  if(fromUrl){
    localStorage.setItem(CLAIM_PENDING_KEY,fromUrl)
    return fromUrl
  }
  return localStorage.getItem(CLAIM_PENDING_KEY)||''
}

async function acceptCustomerInvite(token,accessToken){
  const res=await fetch(`${claimBaseUrl()}/rest/v1/rpc/customer_accept_invite`,{
    method:'POST',
    headers:{
      apikey:claimApiKey(),
      Authorization:`Bearer ${accessToken}`,
      'Content-Type':'application/json',
      'Accept-Profile':claimSchema(),
      'Content-Profile':claimSchema(),
    },
    body:JSON.stringify({p_token:token}),
  })
  const text=await res.text()
  let data=null
  try{data=text?JSON.parse(text):null}catch{data=text}
  if(!res.ok)throw new Error(data?.message||data?.hint||data?.details||'Não foi possível ativar seu cadastro.')
  return data
}

function injectClaimStyles(){
  if(document.getElementById('zaia-customer-claim-style'))return
  const style=document.createElement('style')
  style.id='zaia-customer-claim-style'
  style.textContent=`
    .zaia-claim-banner{position:fixed;left:16px;right:16px;top:max(16px,env(safe-area-inset-top));z-index:9998;margin:auto;max-width:520px;padding:14px 16px;border-radius:18px;background:#fff;box-shadow:0 18px 50px rgba(53,21,35,.18);border:1px solid rgba(53,21,35,.10);font-family:inherit}
    .zaia-claim-banner strong{display:block;color:#351523;font-size:.96rem;margin-bottom:4px}.zaia-claim-banner p{margin:0;color:#756970;font-size:.83rem;line-height:1.4}
    .zaia-claim-overlay{position:fixed;inset:0;z-index:10020;background:rgba(31,15,24,.48);display:grid;place-items:center;padding:22px}
    .zaia-claim-card{width:min(100%,440px);background:#fff;border-radius:24px;padding:24px;box-shadow:0 24px 70px rgba(25,9,17,.28);text-align:center}
    .zaia-claim-card img{width:54px;height:54px;margin-bottom:12px}.zaia-claim-card h2{margin:0 0 8px;color:#351523}.zaia-claim-card p{margin:0 0 18px;color:#766a70;line-height:1.5}.zaia-claim-card button{width:100%;min-height:48px;border:0;border-radius:14px;background:#351523;color:white;font-weight:800;font-size:.95rem}
    .zaia-claim-card.error button{background:#6b3149}
  `
  document.head.appendChild(style)
}

function showClaimBanner(message){
  injectClaimStyles()
  let banner=document.querySelector('.zaia-claim-banner')
  if(!banner){
    banner=document.createElement('div')
    banner.className='zaia-claim-banner'
    document.body.appendChild(banner)
  }
  if(banner.dataset.message===message)return
  banner.dataset.message=message
  banner.innerHTML=`<strong>Ativação do seu cadastro ZAIA</strong><p>${claimEsc(message)}</p>`
}

function showClaimResult({success,title,message}){
  injectClaimStyles()
  document.querySelector('.zaia-claim-banner')?.remove()
  document.querySelector('.zaia-claim-overlay')?.remove()
  const overlay=document.createElement('div')
  overlay.className='zaia-claim-overlay'
  overlay.innerHTML=`<div class="zaia-claim-card ${success?'':'error'}"><img src="/icon.svg" alt="ZAIA"><h2>${claimEsc(title)}</h2><p>${claimEsc(message)}</p><button type="button">${success?'Continuar no ZAIA':'Fechar'}</button></div>`
  document.body.appendChild(overlay)
  overlay.querySelector('button')?.addEventListener('click',()=>{
    if(success){
      localStorage.removeItem(CLAIM_PENDING_KEY)
      location.replace('/cliente?tab=agenda')
    }else{
      overlay.remove()
    }
  })
}

let claimBusy=false
let claimTerminal=false
let loginPrompted=false
async function processPendingInvite(){
  if(claimBusy||claimTerminal)return
  const token=currentInviteToken()
  if(!token)return

  const session=readClaimSession()
  if(!session?.access_token){
    showClaimBanner('Entre ou crie sua conta. Depois disso, seus vínculos e históricos serão conectados automaticamente.')
    if(!loginPrompted){
      const login=document.querySelector('#clientLogin')
      if(login){
        loginPrompted=true
        login.click()
      }
    }
    return
  }

  claimBusy=true
  showClaimBanner('Conectando seu cadastro e seus históricos à sua conta...')
  try{
    const result=await acceptCustomerInvite(token,session.access_token)
    if(!result?.accepted)throw new Error('O convite não pôde ser confirmado.')
    localStorage.removeItem(CLAIM_PENDING_KEY)
    claimTerminal=true
    showClaimResult({
      success:true,
      title:'Cadastro ativado',
      message:`${result.full_name||'Seu cadastro'} agora está conectado à sua conta ZAIA. Seus agendamentos e históricos vinculados ficam disponíveis em uma única conta.`,
    })
  }catch(error){
    const message=String(error?.message||error)
    if(/jwt|token.*expired|autentica/i.test(message)){
      claimBusy=false
      return
    }
    claimTerminal=true
    showClaimResult({success:false,title:'Não foi possível ativar',message})
  }
}

const inviteFromUrl=new URLSearchParams(location.search).get('convite')
if(inviteFromUrl)localStorage.setItem(CLAIM_PENDING_KEY,inviteFromUrl)

const claimObserver=new MutationObserver(()=>queueMicrotask(processPendingInvite))
claimObserver.observe(document.documentElement,{childList:true,subtree:true})
setInterval(processPendingInvite,900)
processPendingInvite()
