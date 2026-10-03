const SESSION_KEY='beauty_os_cloud_session_v2'
const cfg=()=>window.BEAUTY_CONFIG||{}
const baseUrl=()=>String(cfg().supabaseUrl||'').replace(/\/$/,'')
const apiKey=()=>cfg().supabasePublishableKey||''
const schema=()=>cfg().schema||'beleza'

let currentEstablishmentId=null
let loading=false
let lastInjected=null

function session(){try{return JSON.parse(localStorage.getItem(SESSION_KEY)||'null')}catch{return null}}
function esc(v=''){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}

async function rest(path,{method='GET',body}={}){
  const s=session()
  if(!s?.access_token||!baseUrl()||!apiKey())throw new Error('Entre na sua conta ZAIA para continuar.')
  const res=await fetch(`${baseUrl()}/rest/v1/${path}`,{
    method,
    headers:{apikey:apiKey(),Authorization:`Bearer ${s.access_token}`,'Content-Type':'application/json','Accept-Profile':schema(),'Content-Profile':schema(),Prefer:'return=minimal'},
    body:body===undefined?undefined:JSON.stringify(body),
  })
  const text=await res.text()
  let data=null
  try{data=text?JSON.parse(text):null}catch{data=text}
  if(!res.ok)throw new Error(data?.message||data?.hint||data?.details||String(data||`Erro ${res.status}`))
  return data
}

function styles(){
  if(document.getElementById('zaiaAccessSettingsStyles'))return
  const style=document.createElement('style')
  style.id='zaiaAccessSettingsStyles'
  style.textContent=`
    .zaia-access-settings{border:1px solid var(--line,#eadfda);border-radius:20px;padding:16px;background:linear-gradient(180deg,#fffdfb,#fffaf7);display:grid;gap:14px;margin:4px 0 6px}
    .zaia-access-settings-head{display:flex;gap:11px;align-items:flex-start}.zaia-access-settings-icon{width:40px;height:40px;border-radius:13px;background:#f3e9e4;display:grid;place-items:center;font-size:20px;flex:0 0 40px}.zaia-access-settings-head div:last-child{display:grid;gap:3px}.zaia-access-settings-head span{font-size:10px;letter-spacing:.14em;font-weight:900;color:var(--brand,#3b172b)}.zaia-access-settings-head strong{font-size:17px;letter-spacing:-.02em}.zaia-access-settings-head small{font-size:11px;line-height:1.45;color:var(--muted,#8d7e82)}
    .zaia-access-question{display:grid;gap:8px}.zaia-access-question>span{font-size:12px;font-weight:850}.zaia-access-choice{display:grid;grid-template-columns:1fr 1fr;gap:8px}.zaia-access-choice label{border:1px solid var(--line,#eadfda);border-radius:13px;min-height:42px;padding:9px 12px;display:flex;align-items:center;gap:8px;background:#fff;cursor:pointer;font-size:11px;font-weight:800}.zaia-access-choice input{accent-color:var(--brand,#3b172b)}
    .zaia-access-note{display:grid;gap:6px}.zaia-access-note label{font-size:12px;font-weight:850}.zaia-access-note textarea{width:100%;min-height:92px;resize:vertical;border:1px solid var(--line,#eadfda);border-radius:14px;padding:12px;background:#fff;font:inherit;font-size:12px;color:inherit}.zaia-access-note small{font-size:10px;line-height:1.4;color:var(--muted,#8d7e82)}
    .zaia-access-loading{padding:14px;border:1px dashed var(--line,#eadfda);border-radius:13px;color:var(--muted,#8d7e82);font-size:11px}
  `
  document.head.appendChild(style)
}

function boolRadio(name,label,value){
  const yes=value===true?'checked':''
  const no=value===false?'checked':''
  return `<div class="zaia-access-question"><span>${esc(label)}</span><div class="zaia-access-choice"><label><input type="radio" name="${name}" value="true" ${yes}> Sim</label><label><input type="radio" name="${name}" value="false" ${no}> Não</label></div></div>`
}

function valueFrom(name){
  const checked=document.querySelector(`input[name="${name}"]:checked`)
  if(!checked)return null
  return checked.value==='true'
}

async function loadAccess(){
  if(loading)return null
  loading=true
  try{
    const rows=await rest('establishments?select=id,has_parking,ground_floor,easy_access,accessibility_available,access_notes&active=eq.true&order=created_at.asc&limit=1')
    const row=rows?.[0]||null
    if(row)currentEstablishmentId=row.id
    return row
  }finally{loading=false}
}

function renderFields(root,row){
  root.innerHTML=`
    <div class="zaia-access-settings-head"><div class="zaia-access-settings-icon">⌖</div><div><span>CHEGADA E ACESSO</span><strong>Facilite a visita do cliente</strong><small>Essas informações aparecem no app do cliente antes do agendamento e ajudam na chegada ao estabelecimento.</small></div></div>
    ${boolRadio('zaiaParking','Possui estacionamento?',row?.has_parking)}
    ${boolRadio('zaiaGroundFloor','O estabelecimento fica no térreo?',row?.ground_floor)}
    ${boolRadio('zaiaEasyAccess','O local tem fácil acesso?',row?.easy_access)}
    ${boolRadio('zaiaAccessibility','Possui acessibilidade ♿?',row?.accessibility_available)}
    <div class="zaia-access-note"><label>Observações para chegar ao local</label><textarea id="zaiaAccessNotes" maxlength="500" placeholder="Ex.: Há vagas fáceis na rua em frente. Próximo ao ponto de ônibus da linha 39. Entrada pela lateral.">${esc(row?.access_notes||'')}</textarea><small>Use orientações úteis sobre estacionamento, transporte público, entrada, escadas, elevador ou qualquer detalhe que ajude o cliente.</small></div>`
}

async function inject(){
  styles()
  const marketplace=document.getElementById('businessMarketplace')
  if(!marketplace)return
  const modal=marketplace.closest('.business-modal')||marketplace.closest('.modal')
  if(!modal||lastInjected===modal||modal.querySelector('#zaiaAccessSettings'))return
  lastInjected=modal
  const section=document.createElement('section')
  section.id='zaiaAccessSettings'
  section.className='zaia-access-settings'
  section.innerHTML='<div class="zaia-access-loading">Carregando informações de acesso...</div>'
  const anchor=marketplace.closest('.toggle-row')?.previousElementSibling||marketplace.closest('.toggle-row')
  anchor?.before(section)
  try{renderFields(section,await loadAccess())}catch(error){section.innerHTML=`<div class="zaia-access-loading">Não foi possível carregar estas informações agora. ${esc(error.message||error)}</div>`}
}

async function saveAccess(){
  const root=document.getElementById('zaiaAccessSettings')
  if(!root)return
  if(!currentEstablishmentId){const row=await loadAccess();currentEstablishmentId=row?.id||null}
  if(!currentEstablishmentId)return
  const body={
    has_parking:valueFrom('zaiaParking'),
    ground_floor:valueFrom('zaiaGroundFloor'),
    easy_access:valueFrom('zaiaEasyAccess'),
    accessibility_available:valueFrom('zaiaAccessibility'),
    access_notes:String(document.getElementById('zaiaAccessNotes')?.value||'').trim()||null,
  }
  await rest(`establishments?id=eq.${encodeURIComponent(currentEstablishmentId)}`,{method:'PATCH',body})
}

document.addEventListener('click',event=>{
  if(event.target.closest('#saveBusiness')){
    saveAccess().catch(error=>setTimeout(()=>alert(`Não foi possível salvar as informações de acesso. ${error.message||error}`),0))
  }
},true)

new MutationObserver(()=>inject()).observe(document.documentElement,{childList:true,subtree:true})
setTimeout(inject,500)
