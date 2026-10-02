const SESSION_KEY='beauty_os_cloud_session_v2'
const cfg=()=>window.BEAUTY_CONFIG||{}
const baseUrl=()=>String(cfg().supabaseUrl||'').replace(/\/$/,'')
const apiKey=()=>cfg().supabasePublishableKey||''
const schema=()=>cfg().schema||'beleza'

let current=null
let busy=false
let queued=false

function session(){
  try{return JSON.parse(localStorage.getItem(SESSION_KEY)||'null')}catch{return null}
}
function esc(v=''){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function fmtTime(iso){return new Date(iso).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}
function minuteDiff(iso){return (new Date(iso).getTime()-Date.now())/60000}

async function rpc(name,body={}){
  const s=session()
  if(!s?.access_token||!baseUrl()||!apiKey())throw new Error('Entre na sua conta ZAIA para continuar.')
  const res=await fetch(`${baseUrl()}/rest/v1/rpc/${name}`,{
    method:'POST',
    headers:{apikey:apiKey(),Authorization:`Bearer ${s.access_token}`,'Content-Type':'application/json','Accept-Profile':schema(),'Content-Profile':schema()},
    body:JSON.stringify(body),
  })
  const text=await res.text()
  let data=null
  try{data=text?JSON.parse(text):null}catch{data=text}
  if(!res.ok)throw new Error(data?.message||data?.hint||data?.details||String(data||`Erro ${res.status}`))
  return data
}

function statusInfo(a){
  if(!a)return null
  const diff=minuteDiff(a.starts_at)
  if(a.status==='IN_SERVICE')return {kind:'service',title:'Seu atendimento está em andamento',text:`${a.service_name} com ${a.professional_name}.`}
  if(a.customer_arrived_at)return {kind:'arrived',title:'Chegada confirmada',text:`O ${a.establishment_name} já sabe que você chegou. Aguarde o início do atendimento.`}
  if(a.customer_on_way_at)return {kind:'onway',title:'Você está a caminho',text:`Horário às ${fmtTime(a.starts_at)}${a.customer_eta_minutes!=null?` • previsão de chegada em ${a.customer_eta_minutes} min`:''}.`}
  if(diff<=0)return {kind:'late',title:'Seu horário já começou',text:'Avise o estabelecimento se você já chegou ou está a caminho.'}
  return {kind:'soon',title:`Seu atendimento começa em ${Math.max(1,Math.ceil(diff))} min`,text:`${a.service_name} • ${a.establishment_name}.`}
}

function buttons(a){
  if(!a||a.status==='IN_SERVICE'||a.customer_arrived_at)return ''
  const diff=minuteDiff(a.starts_at)
  const canOnWay=diff<=120&&diff>=-45
  const canArrive=diff<=45&&diff>=-45
  return `<div class="zaia-customer-ops-actions">${canOnWay?'<button class="zaia-customer-ops-btn" data-customer-onway>Estou a caminho</button>':''}${canArrive?'<button class="zaia-customer-ops-btn primary" data-customer-arrived>Cheguei</button>':''}</div>`
}

function render(){
  const main=document.querySelector('.client-account-main')
  let panel=document.querySelector('#zaiaCustomerOps')
  if(!main||!current){panel?.remove();return}
  const info=statusInfo(current)
  const signature=[current.id,current.status,current.customer_on_way_at,current.customer_arrived_at,current.customer_eta_minutes,info?.kind,Math.floor(Date.now()/60000)].join('|')
  if(!panel){
    panel=document.createElement('section')
    panel.id='zaiaCustomerOps'
    panel.className='zaia-customer-ops'
    const head=main.querySelector('.client-account-head')
    head?.after(panel)||main.prepend(panel)
  }
  if(panel.dataset.signature===signature)return
  panel.dataset.signature=signature
  panel.innerHTML=`<div class="zaia-customer-ops-icon">${info.kind==='arrived'?'✓':info.kind==='service'?'●':'⌁'}</div><div class="zaia-customer-ops-copy"><span>ATENDIMENTO AGORA</span><strong>${esc(info.title)}</strong><p>${esc(info.text)}</p>${current.address?`<small>${esc(current.address)}</small>`:''}</div>${buttons(current)}`
}

function scheduleRender(){
  if(queued)return
  queued=true
  requestAnimationFrame(()=>{queued=false;render()})
}

async function refresh(){
  if(busy||!session()?.access_token)return
  busy=true
  try{current=await rpc('customer_operational_now');scheduleRender()}catch(error){console.warn('ZAIA customer operational flow',error)}finally{busy=false}
}

function etaModal(){
  document.querySelector('#zaiaEtaModal')?.remove()
  const modal=document.createElement('div')
  modal.id='zaiaEtaModal';modal.className='zaia-ops-modal-backdrop'
  modal.innerHTML=`<div class="zaia-ops-modal zaia-eta-modal"><button class="zaia-ops-close" data-eta-close>×</button><span class="zaia-ops-kicker">AVISAR O ESTABELECIMENTO</span><h2>Em quanto tempo você chega?</h2><p>Isso ajuda o profissional a organizar a fila sem perder seu horário.</p><div class="zaia-eta-grid"><button data-eta="5">5 min</button><button data-eta="10">10 min</button><button data-eta="15">15 min</button><button data-eta="20">20 min</button><button data-eta="30">30 min</button><button data-eta="">Sem previsão</button></div></div>`
  document.body.appendChild(modal)
}

async function doAction(button,action,eta=null){
  if(!current?.id)return
  const old=button?.textContent||''
  if(button){button.disabled=true;button.textContent='Aguarde...'}
  try{
    await rpc('customer_operational_action',{p_appointment_id:current.id,p_action:action,p_eta_minutes:eta})
    document.querySelector('#zaiaEtaModal')?.remove()
    await refresh()
    window.dispatchEvent(new Event('zaia:customer-refresh'))
  }catch(error){alert(error.message);if(button){button.disabled=false;button.textContent=old}}
}

document.addEventListener('click',async e=>{
  if(e.target.closest('[data-customer-onway]')){etaModal();return}
  const arrived=e.target.closest('[data-customer-arrived]')
  if(arrived){if(confirm(`Confirmar que você chegou em ${current?.establishment_name||'o estabelecimento'}?`))await doAction(arrived,'ARRIVED',0);return}
  if(e.target.closest('[data-eta-close]')){document.querySelector('#zaiaEtaModal')?.remove();return}
  const eta=e.target.closest('[data-eta]')
  if(eta){const raw=eta.dataset.eta;await doAction(eta,'ON_WAY',raw===''?null:Number(raw));return}
})

const observer=new MutationObserver(scheduleRender)
observer.observe(document.documentElement,{childList:true,subtree:true})
window.addEventListener('focus',refresh)
window.addEventListener('zaia:customer-refresh',()=>setTimeout(refresh,250))

if(location.pathname.startsWith('/cliente')){
  setTimeout(refresh,500)
  setInterval(refresh,30000)
}
