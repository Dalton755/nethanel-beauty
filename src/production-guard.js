import { ensureSession } from './cloud.js'

const cfg=()=>window.BEAUTY_CONFIG||{}
const isCustomer=()=>location.pathname==='/cliente'||location.pathname.startsWith('/cliente/')
const isSkipped=()=>location.hostname.endsWith('.onrender.com')&&String(cfg().supabaseUrl||'').includes('sxghzubovthsvmfqncch.supabase.co')||location.pathname.startsWith('/gestao')||location.pathname.startsWith('/termos')||location.pathname.startsWith('/privacidade')
let activeUser=null
let checking=false
let overlay=null

async function rpc(name,body={}){
  const session=await ensureSession()
  if(!session?.access_token)return null
  const url=String(cfg().supabaseUrl||'').replace(/\/$/,'')
  const key=cfg().supabasePublishableKey||''
  if(!url||!key)return null
  const res=await fetch(`${url}/rest/v1/rpc/${name}`,{
    method:'POST',
    headers:{
      apikey:key,
      Authorization:`Bearer ${session.access_token}`,
      'Content-Type':'application/json',
      'Accept-Profile':'beleza',
      'Content-Profile':'beleza',
    },
    body:JSON.stringify(body),
  })
  const data=await res.json().catch(()=>({}))
  if(!res.ok)throw new Error(data?.message||data?.details||'Não foi possível registrar sua aceitação.')
  return data
}

function removeOverlay(){
  overlay?.remove()
  overlay=null
  document.documentElement.classList.remove('zaia-legal-lock')
}

function showOverlay(status,context){
  if(overlay)return
  overlay=document.createElement('div')
  overlay.className='zaia-legal-overlay'
  overlay.innerHTML=`
    <section class="zaia-legal-card" role="dialog" aria-modal="true" aria-labelledby="zaiaLegalTitle">
      <img src="/zaia-logo.svg" alt="ZAIA" class="zaia-legal-logo">
      <span class="zaia-legal-kicker">PRIMEIRO ACESSO • PRODUÇÃO</span>
      <h2 id="zaiaLegalTitle">Antes de continuar</h2>
      <p>Para usar a ZAIA, confirme que leu os documentos atuais de uso e privacidade.</p>
      <div class="zaia-legal-links">
        <a href="/termos" target="_blank" rel="noopener">Termos de Uso</a>
        <a href="/privacidade" target="_blank" rel="noopener">Política de Privacidade</a>
      </div>
      <label class="zaia-legal-check"><input type="checkbox" id="zaiaLegalAgree"><span>Li e aceito os Termos de Uso e a Política de Privacidade da ZAIA.</span></label>
      <button type="button" id="zaiaLegalAccept" disabled>Continuar para ZAIA</button>
      <div class="zaia-legal-error" id="zaiaLegalError"></div>
      <small>As versões aceitas ficam registradas na sua conta. Se houver atualização relevante, uma nova confirmação poderá ser solicitada.</small>
    </section>`
  document.body.appendChild(overlay)
  document.documentElement.classList.add('zaia-legal-lock')

  const check=overlay.querySelector('#zaiaLegalAgree')
  const button=overlay.querySelector('#zaiaLegalAccept')
  const error=overlay.querySelector('#zaiaLegalError')
  check.addEventListener('change',()=>{button.disabled=!check.checked})
  button.addEventListener('click',async()=>{
    if(!check.checked)return
    button.disabled=true
    button.textContent='Registrando...'
    error.textContent=''
    try{
      await rpc('accept_current_legal',{p_context:context})
      removeOverlay()
    }catch(err){
      error.textContent=String(err?.message||err)
      button.disabled=false
      button.textContent='Tentar novamente'
    }
  })
}

async function checkLegal(){
  if(isSkipped()||checking)return
  checking=true
  try{
    const session=await ensureSession()
    const userId=session?.user?.id||null
    if(!userId){activeUser=null;removeOverlay();return}
    const context=isCustomer()?'CUSTOMER':'MERCHANT'
    const key=`${userId}:${context}`
    if(activeUser===key&&overlay)return
    const status=await rpc('legal_status',{p_context:context})
    activeUser=key
    if(status?.accepted)removeOverlay()
    else showOverlay(status,context)
  }catch(err){
    console.warn('[ZAIA LEGAL]',err)
  }finally{checking=false}
}

const style=document.createElement('style')
style.textContent=`
.zaia-legal-lock{overflow:hidden!important}
.zaia-legal-overlay{position:fixed;inset:0;z-index:10000;background:rgba(38,18,29,.66);backdrop-filter:blur(9px);display:grid;place-items:center;padding:18px}
.zaia-legal-card{width:min(470px,100%);background:#fffdfb;border:1px solid #eadfda;border-radius:24px;padding:24px;box-shadow:0 25px 80px rgba(25,12,20,.26);font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#302229}
.zaia-legal-logo{width:116px;max-height:46px;object-fit:contain;object-position:left center;margin-bottom:18px}
.zaia-legal-kicker{display:block;font-size:9px;font-weight:900;letter-spacing:.14em;color:#8f7d83;margin-bottom:6px}
.zaia-legal-card h2{font-size:27px;letter-spacing:-.04em;margin:0 0 7px}.zaia-legal-card>p{font-size:12px;line-height:1.55;color:#6e6065;margin:0 0 15px}
.zaia-legal-links{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:15px}.zaia-legal-links a{border:1px solid #e9ddd8;background:#f8f1ed;color:#522039;border-radius:12px;padding:10px;text-align:center;text-decoration:none;font-size:10px;font-weight:850}
.zaia-legal-check{display:flex;align-items:flex-start;gap:9px;border:1px solid #eadfda;border-radius:14px;padding:12px;font-size:10.5px;line-height:1.4;color:#594c51}.zaia-legal-check input{width:18px;height:18px;flex:0 0 18px;margin:0}
#zaiaLegalAccept{width:100%;border:0;border-radius:13px;padding:13px;margin-top:12px;background:#3b172b;color:#fff;font-size:11px;font-weight:900}#zaiaLegalAccept:disabled{opacity:.45}
.zaia-legal-error{min-height:16px;color:#a43e47;font-size:9.5px;margin-top:8px}.zaia-legal-card small{display:block;font-size:8.5px;line-height:1.45;color:#95868b;margin-top:4px}
@media(max-width:480px){.zaia-legal-overlay{align-items:end;padding:0}.zaia-legal-card{border-radius:24px 24px 0 0;padding:22px 17px calc(22px + env(safe-area-inset-bottom))}.zaia-legal-links{grid-template-columns:1fr}}
`
document.head.appendChild(style)

if(!isSkipped()){
  checkLegal()
  setInterval(checkLegal,2500)
  window.addEventListener('focus',checkLegal)
}
