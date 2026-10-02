const SESSION_KEY='beauty_os_cloud_session_v2'
const cfg=()=>window.BEAUTY_CONFIG||{}
const baseUrl=()=>String(cfg().supabaseUrl||'').replace(/\/$/,'')
const apiKey=()=>cfg().supabasePublishableKey||''
const schema=()=>cfg().schema||'beleza'

let snapshot=null
let refreshing=false
let absencePlan=null
let paintQueued=false

function session(){
  try{return JSON.parse(localStorage.getItem(SESSION_KEY)||'null')}catch{return null}
}
function esc(v=''){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function fmtTime(iso){return new Date(iso).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}
function fmtDateTime(iso){return new Date(iso).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}
function mins(n){return Math.max(0,Math.round(Math.abs(n)))}
function minuteDiff(a,b=Date.now()){return (new Date(a).getTime()-Number(b))/60000}

async function rpc(name,body={}){
  const s=session()
  if(!s?.access_token||!baseUrl()||!apiKey())throw new Error('Sessão ZAIA não encontrada.')
  const res=await fetch(`${baseUrl()}/rest/v1/rpc/${name}`,{
    method:'POST',
    headers:{
      apikey:apiKey(),
      Authorization:`Bearer ${s.access_token}`,
      'Content-Type':'application/json',
      'Accept-Profile':schema(),
      'Content-Profile':schema(),
    },
    body:JSON.stringify(body),
  })
  const text=await res.text()
  let data=null
  try{data=text?JSON.parse(text):null}catch{data=text}
  if(!res.ok)throw new Error(data?.message||data?.hint||data?.details||String(data||`Erro ${res.status}`))
  return data
}

function stateFor(a){
  const now=Date.now()
  const start=new Date(a.starts_at).getTime()
  const end=new Date(a.ends_at).getTime()
  if(a.status==='IN_SERVICE'){
    if(now>end)return {kind:'OVERTIME',level:'risk',label:`Atendimento passou ${mins((now-end)/60000)} min do previsto`}
    return {kind:'IN_SERVICE',level:'ok',label:'Em atendimento'}
  }
  if(!['SCHEDULED','CONFIRMED'].includes(a.status))return {kind:'CLOSED',level:'muted',label:a.status}
  if(a.customer_arrived_at)return {kind:'ARRIVED',level:'action',label:`Cliente chegou há ${mins((now-new Date(a.customer_arrived_at).getTime())/60000)} min`}
  if(now>=start+10*60000)return {kind:'NO_SHOW_RISK',level:'risk',label:`Cliente está ${mins((now-start)/60000)} min após o horário`}
  if(now>=start)return {kind:'DUE',level:'action',label:'Horário começou — iniciar atendimento'}
  if(a.customer_on_way_at)return {kind:'ON_WAY',level:'info',label:`Cliente a caminho${a.customer_eta_minutes!=null?` • previsão ${a.customer_eta_minutes} min`:''}`}
  if(start-now<=30*60000)return {kind:'SOON',level:'info',label:`Começa em ${Math.max(1,Math.ceil((start-now)/60000))} min`}
  return {kind:'UPCOMING',level:'muted',label:'Agendado'}
}

function activeAlerts(){
  return (snapshot?.appointments||[])
    .map(a=>({a,s:stateFor(a)}))
    .filter(x=>['OVERTIME','ARRIVED','NO_SHOW_RISK','DUE','ON_WAY','SOON'].includes(x.s.kind))
    .sort((x,y)=>{
      const rank={NO_SHOW_RISK:0,ARRIVED:1,DUE:2,OVERTIME:3,ON_WAY:4,SOON:5}
      return (rank[x.s.kind]??9)-(rank[y.s.kind]??9)||new Date(x.a.starts_at)-new Date(y.a.starts_at)
    })
}

function actionButtons(a,s){
  if(s.kind==='ARRIVED'||s.kind==='DUE'||s.kind==='NO_SHOW_RISK'){
    return `<button class="zaia-ops-btn primary" data-ops-start="${a.id}">Iniciar atendimento</button>${s.kind==='NO_SHOW_RISK'?`<button class="zaia-ops-btn danger" data-ops-noshow="${a.id}">Não compareceu</button>`:''}`
  }
  if(s.kind==='OVERTIME'||s.kind==='IN_SERVICE')return `<button class="zaia-ops-btn" data-ops-focus="${a.id}">Abrir atendimento</button>`
  return `<button class="zaia-ops-btn" data-ops-focus="${a.id}">Ver horário</button>`
}

function renderPanel(){
  const content=document.querySelector('.content')
  if(!content||!snapshot)return
  const isHome=!!document.querySelector('.dashboard-hero')
  const isAgenda=[...document.querySelectorAll('.title')].some(x=>x.textContent.trim()==='Agenda')
  let panel=document.querySelector('#zaiaOpsPanel')
  if(!isHome&&!isAgenda){panel?.remove();return}

  const alerts=activeAlerts().slice(0,5)
  const signature=JSON.stringify(alerts.map(x=>[x.a.id,x.a.status,x.a.customer_arrived_at,x.a.customer_on_way_at,x.a.customer_eta_minutes,x.s.kind,Math.floor(Date.now()/60000)]))
  if(!panel){
    panel=document.createElement('section')
    panel.id='zaiaOpsPanel'
    panel.className='zaia-ops-panel'
    if(isHome){document.querySelector('.dashboard-hero')?.after(panel)}else{
      const subtitle=content.querySelector('.subtitle')
      subtitle?.after(panel)||content.prepend(panel)
    }
  }
  if(panel.dataset.signature===signature)return
  panel.dataset.signature=signature

  panel.innerHTML=`<div class="zaia-ops-head"><div><span class="zaia-ops-kicker">OPERAÇÃO AGORA</span><h2>${alerts.length?'Atenção agora':'Operação sob controle'}</h2><p>${alerts.length?'A ZAIA encontrou situações que merecem acompanhamento.':'Nenhuma ação urgente neste momento.'}</p></div><button class="zaia-ops-btn" data-ops-absence>Profissional indisponível</button></div>
    ${alerts.length?`<div class="zaia-ops-list">${alerts.map(({a,s})=>`<article class="zaia-ops-alert ${s.level}"><div class="zaia-ops-time">${fmtTime(a.starts_at)}</div><div class="zaia-ops-copy"><strong>${esc(a.client_name)}</strong><span>${esc(a.service_name)} • ${esc(a.professional_name)}</span><b>${esc(s.label)}</b></div><div class="zaia-ops-actions">${actionButtons(a,s)}</div></article>`).join('')}</div>`:''}`
}

function badgeHtml(a,s){
  if(s.kind==='ARRIVED')return '<span class="pill zaia-ops-badge arrived">Chegou</span>'
  if(s.kind==='ON_WAY')return `<span class="pill zaia-ops-badge onway">A caminho${a.customer_eta_minutes!=null?` • ${a.customer_eta_minutes} min`:''}</span>`
  if(s.kind==='IN_SERVICE'||s.kind==='OVERTIME')return `<span class="pill zaia-ops-badge service">Em atendimento${s.kind==='OVERTIME'?' • atrasado':''}</span>`
  if(s.kind==='NO_SHOW_RISK')return '<span class="pill zaia-ops-badge risk">Verificar chegada</span>'
  if(s.kind==='DUE')return '<span class="pill zaia-ops-badge due">Hora de iniciar</span>'
  if(a.status==='NO_SHOW')return '<span class="pill zaia-ops-badge risk">Não compareceu</span>'
  return ''
}

function enhanceCards(){
  if(!snapshot)return
  const byId=new Map((snapshot.appointments||[]).map(a=>[a.id,a]))
  document.querySelectorAll('[data-complete]').forEach(complete=>{
    const id=complete.dataset.complete
    const a=byId.get(id)
    if(!a)return
    const item=complete.closest('.appointment-item')
    const actions=complete.closest('.appointment-actions')
    const badges=item?.querySelector('.appointment-badges')
    if(!item||!actions)return
    const s=stateFor(a)
    const sig=[a.status,a.customer_arrived_at,a.customer_on_way_at,a.customer_eta_minutes,s.kind].join('|')
    if(item.dataset.zaiaOpsState===sig)return
    item.dataset.zaiaOpsState=sig
    item.querySelectorAll('.zaia-ops-inline,.zaia-ops-badge').forEach(x=>x.remove())
    item.classList.remove('zaia-ops-arrived','zaia-ops-risk','zaia-ops-service')
    if(s.kind==='ARRIVED')item.classList.add('zaia-ops-arrived')
    if(s.kind==='NO_SHOW_RISK'||s.kind==='OVERTIME')item.classList.add('zaia-ops-risk')
    if(s.kind==='IN_SERVICE'||s.kind==='OVERTIME')item.classList.add('zaia-ops-service')
    if(badges){const h=badgeHtml(a,s);if(h)badges.insertAdjacentHTML('beforeend',h)}

    if(['SCHEDULED','CONFIRMED'].includes(a.status)){
      complete.style.display='none'
      const now=Date.now(),start=new Date(a.starts_at).getTime()
      let html=`<button class="btn small primary zaia-ops-inline" data-ops-start="${a.id}">Iniciar</button>`
      if(!a.customer_arrived_at&&Math.abs(now-start)<=60*60000)html+=`<button class="btn small ghost zaia-ops-inline" data-ops-arrived="${a.id}">Cliente chegou</button>`
      if(now>=start+10*60000&&!a.customer_arrived_at)html+=`<button class="btn small danger-soft zaia-ops-inline" data-ops-noshow="${a.id}">Não compareceu</button>`
      actions.insertAdjacentHTML('afterbegin',html)
    }else if(a.status==='IN_SERVICE'){
      complete.style.display=''
      complete.textContent='Concluir atendimento'
    }else{
      complete.style.display=''
    }
  })
}

function schedulePaint(){
  if(paintQueued)return
  paintQueued=true
  requestAnimationFrame(()=>{paintQueued=false;renderPanel();enhanceCards()})
}

async function refresh(){
  if(refreshing||!session()?.access_token)return
  refreshing=true
  try{snapshot=await rpc('business_operational_snapshot');schedulePaint()}catch(error){console.warn('ZAIA operational snapshot',error)}finally{refreshing=false}
}

function focusAppointment(id){
  const el=document.querySelector(`[data-complete="${CSS.escape(id)}"]`)?.closest('.appointment-item')
  if(el){el.scrollIntoView({behavior:'smooth',block:'center'});el.classList.add('zaia-ops-pulse');setTimeout(()=>el.classList.remove('zaia-ops-pulse'),1800);return}
  const agenda=[...document.querySelectorAll('[data-page="agenda"]')][0]
  agenda?.click()
  setTimeout(()=>focusAppointment(id),350)
}

async function runAction(button,name,body,success){
  if(button.disabled)return
  const old=button.textContent
  button.disabled=true;button.textContent='Aguarde...'
  try{await rpc(name,body);if(success)success();else location.reload()}catch(error){alert(error.message);button.disabled=false;button.textContent=old}
}

function localInputValue(d){
  const pad=n=>String(n).padStart(2,'0')
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function openAbsenceModal(){
  if(!snapshot?.professionals?.length)return alert('Cadastre um profissional antes de usar o plano de contingência.')
  document.querySelector('#zaiaOpsModal')?.remove()
  const now=new Date(),end=new Date(now);end.setHours(23,59,0,0)
  const modal=document.createElement('div')
  modal.id='zaiaOpsModal';modal.className='zaia-ops-modal-backdrop'
  modal.innerHTML=`<div class="zaia-ops-modal"><button class="zaia-ops-close" data-ops-close>×</button><span class="zaia-ops-kicker">PLANO DE CONTINGÊNCIA</span><h2>Profissional indisponível</h2><p>A ZAIA bloqueia o período, identifica clientes afetados e procura substitutos livres no mesmo horário.</p><form id="zaiaAbsenceForm"><label>Profissional<select name="professional" required>${snapshot.professionals.map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join('')}</select></label><div class="zaia-ops-form-grid"><label>De<input type="datetime-local" name="startsAt" value="${localInputValue(now)}" required></label><label>Até<input type="datetime-local" name="endsAt" value="${localInputValue(end)}" required></label></div><label>Motivo<input name="reason" value="Imprevisto / ausência do profissional" maxlength="160"></label><button class="zaia-ops-btn primary wide" type="submit">Analisar e proteger agenda</button></form><div id="zaiaAbsenceResult"></div></div>`
  document.body.appendChild(modal)
}

function renderAbsencePlan(plan){
  absencePlan=plan
  const box=document.querySelector('#zaiaAbsenceResult')
  if(!box)return
  const impacted=plan?.impacted||[]
  if(!impacted.length){
    box.innerHTML='<div class="zaia-ops-success"><strong>Agenda protegida.</strong><span>O período foi bloqueado e não há clientes afetados.</span></div>'
    return
  }
  box.innerHTML=`<div class="zaia-ops-plan-head"><strong>${impacted.length} atendimento${impacted.length===1?'':'s'} precisa${impacted.length===1?'':'m'} de ação</strong><span>Priorize manter o mesmo horário quando houver substituto disponível.</span></div><div class="zaia-ops-plan-list">${impacted.map(x=>`<article><div><b>${fmtTime(x.starts_at)} • ${esc(x.client_name)}</b><span>${esc(x.service_name)}</span></div>${x.alternatives?.length?`<div class="zaia-ops-alt"><small>Substitutos livres:</small>${x.alternatives.map(p=>`<button class="zaia-ops-btn primary" data-ops-reassign="${x.appointment_id}" data-professional="${p.id}">${esc(p.name)}</button>`).join('')}</div>`:`<div class="zaia-ops-alt"><small>Nenhum substituto livre no mesmo horário.</small><button class="zaia-ops-btn danger" data-ops-cancel="${x.appointment_id}" data-client="${esc(x.client_name)}">Cancelar e avisar cliente</button></div>`}</article>`).join('')}</div>`
}

document.addEventListener('submit',async e=>{
  if(e.target.id!=='zaiaAbsenceForm')return
  e.preventDefault()
  const form=e.target,btn=form.querySelector('button[type="submit"]'),fd=Object.fromEntries(new FormData(form))
  const start=new Date(fd.startsAt),end=new Date(fd.endsAt)
  if(!Number.isFinite(start.getTime())||!Number.isFinite(end.getTime())||end<=start)return alert('Confira o período informado.')
  const old=btn.textContent;btn.disabled=true;btn.textContent='Analisando agenda...'
  try{
    const plan=await rpc('business_professional_absence_plan',{p_professional_id:fd.professional,p_starts_at:start.toISOString(),p_ends_at:end.toISOString(),p_reason:fd.reason||'Imprevisto / ausência do profissional'})
    renderAbsencePlan(plan);await refresh()
  }catch(error){alert(error.message)}finally{btn.disabled=false;btn.textContent=old}
})

document.addEventListener('click',async e=>{
  const close=e.target.closest('[data-ops-close]');if(close){document.querySelector('#zaiaOpsModal')?.remove();return}
  const absence=e.target.closest('[data-ops-absence]');if(absence){openAbsenceModal();return}
  const focus=e.target.closest('[data-ops-focus]');if(focus){focusAppointment(focus.dataset.opsFocus);return}
  const start=e.target.closest('[data-ops-start]');if(start){await runAction(start,'business_start_appointment',{p_appointment_id:start.dataset.opsStart});return}
  const arrived=e.target.closest('[data-ops-arrived]');if(arrived){await runAction(arrived,'business_mark_customer_arrived',{p_appointment_id:arrived.dataset.opsArrived});return}
  const noShow=e.target.closest('[data-ops-noshow]');if(noShow){if(confirm('Confirmar que o cliente não compareceu?'))await runAction(noShow,'business_mark_no_show',{p_appointment_id:noShow.dataset.opsNoshow});return}
  const reassign=e.target.closest('[data-ops-reassign]');if(reassign){
    const profName=reassign.textContent.trim()
    if(!confirm(`Transferir este atendimento para ${profName}, mantendo o mesmo horário?`))return
    await runAction(reassign,'business_reassign_appointment',{p_appointment_id:reassign.dataset.opsReassign,p_professional_id:reassign.dataset.professional},async()=>{
      const plan=absencePlan
      if(plan){plan.impacted=(plan.impacted||[]).filter(x=>x.appointment_id!==reassign.dataset.opsReassign);renderAbsencePlan(plan)}
      await refresh()
    });return
  }
  const cancel=e.target.closest('[data-ops-cancel]');if(cancel){
    if(!confirm(`Cancelar o atendimento de ${cancel.dataset.client||'cliente'} por indisponibilidade do profissional? O cliente será avisado.`))return
    await runAction(cancel,'cancel_appointment',{p_appointment_id:cancel.dataset.opsCancel,p_reason:'Profissional indisponível / imprevisto operacional'},async()=>{
      if(absencePlan){absencePlan.impacted=(absencePlan.impacted||[]).filter(x=>x.appointment_id!==cancel.dataset.opsCancel);renderAbsencePlan(absencePlan)}
      await refresh()
    });return
  }
})

const observer=new MutationObserver(schedulePaint)
observer.observe(document.documentElement,{childList:true,subtree:true})
window.addEventListener('focus',refresh)
window.addEventListener('zaia:operational-refresh',refresh)

if(location.pathname.startsWith('/loja')){
  setTimeout(refresh,400)
  setInterval(refresh,30000)
}
