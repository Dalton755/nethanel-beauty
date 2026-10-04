const cfg=()=>window.BEAUTY_CONFIG||{}
const baseUrl=()=>String(cfg().supabaseUrl||'').replace(/\/$/,'')
const apiKey=()=>cfg().supabasePublishableKey||''
const schema=()=>cfg().schema||'beleza'
const SESSION_KEY='zaia_employee_session_v1'
const PROFILE_KEY='zaia_employee_profile_v1'
const app=document.querySelector('#employeeApp')

const state={loading:true,session:null,profiles:[],profileId:localStorage.getItem(PROFILE_KEY)||null,data:null,page:'home',selectedDate:null,modal:null,error:'',message:'',busy:false}
const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))
const money=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})
const digits=v=>String(v||'').replace(/\D/g,'')
const pad=n=>String(n).padStart(2,'0')
const localToday=()=>{const d=new Date();return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`}
const monthRange=(date=localToday())=>{const [y,m]=date.split('-').map(Number);const last=new Date(y,m,0).getDate();return {start:`${y}-${pad(m)}-01`,end:`${y}-${pad(m)}-${pad(last)}`}}
const statusLabel=s=>({SCHEDULED:'Agendado',CONFIRMED:'Confirmado',IN_SERVICE:'Em atendimento',COMPLETED:'Concluído',CANCELLED:'Cancelado',NO_SHOW:'Não compareceu'})[s]||s
const weekdayName=n=>['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'][Number(n)]||''

function getSession(){try{return JSON.parse(localStorage.getItem(SESSION_KEY))}catch{return null}}
function saveSession(payload){
  if(!payload?.access_token)return null
  const session={access_token:payload.access_token,refresh_token:payload.refresh_token||'',expires_at:Math.floor(Date.now()/1000)+Number(payload.expires_in||3600)}
  localStorage.setItem(SESSION_KEY,JSON.stringify(session));state.session=session;return session
}
function clearSession(){localStorage.removeItem(SESSION_KEY);localStorage.removeItem(PROFILE_KEY);state.session=null;state.profileId=null;state.profiles=[];state.data=null}
async function authRequest(path,body){
  const res=await fetch(`${baseUrl()}/auth/v1/${path}`,{method:'POST',headers:{apikey:apiKey(),'Content-Type':'application/json'},body:JSON.stringify(body)})
  const data=await res.json().catch(()=>({}))
  if(!res.ok)throw new Error(data?.msg||data?.message||data?.error_description||'Falha na autenticação.')
  return data
}
async function refreshSession(){const current=getSession();if(!current?.refresh_token)return null;return saveSession(await authRequest('token?grant_type=refresh_token',{refresh_token:current.refresh_token}))}
async function ensureSession(){
  const current=getSession();if(!current?.access_token)return null
  if((current.expires_at||0)-Math.floor(Date.now()/1000)>60){state.session=current;return current}
  try{return await refreshSession()}catch{clearSession();return null}
}
async function rpc(name,body={}){
  let session=await ensureSession();if(!session)throw new Error('Sua sessão expirou. Entre novamente.')
  const res=await fetch(`${baseUrl()}/rest/v1/rpc/${name}`,{method:'POST',headers:{apikey:apiKey(),Authorization:`Bearer ${session.access_token}`,'Content-Type':'application/json','Accept-Profile':schema(),'Content-Profile':schema()},body:JSON.stringify(body)})
  const text=await res.text();let data=null;try{data=text?JSON.parse(text):null}catch{data=text}
  if(!res.ok)throw new Error(data?.message||data?.hint||data?.details||'Não foi possível concluir a ação.')
  return data
}
function friendly(error){
  const raw=String(error?.message||error||'Erro inesperado.')
  if(/Invalid login credentials/i.test(raw))return 'E-mail ou senha inválidos.'
  if(/Email not confirmed/i.test(raw))return 'Confirme seu e-mail antes de entrar.'
  if(/User already registered/i.test(raw))return 'Este e-mail já possui conta. Entre com sua senha.'
  return raw
}
function consumeOAuth(){
  const hash=new URLSearchParams(location.hash.replace(/^#/,''));const err=hash.get('error_description')||hash.get('error')
  if(err){history.replaceState({},'',location.pathname+location.search);throw new Error(err)}
  const access=hash.get('access_token');if(!access)return null
  const session=saveSession({access_token:access,refresh_token:hash.get('refresh_token')||'',expires_in:Number(hash.get('expires_in')||3600)})
  history.replaceState({},'',location.pathname+location.search);return session
}
async function claimProfile(professionalId=null){
  const result=await rpc('employee_claim_profile',{p_professional_id:professionalId})
  if(result?.status==='READY'){
    state.profiles=result.profiles||[]
    const valid=state.profiles.some(p=>p.professional_id===state.profileId)
    if(!valid&&state.profiles.length===1)selectProfile(state.profiles[0].professional_id,false)
    return result
  }
  if(result?.status==='CHOOSE'){state.profiles=result.candidates||[];state.profileId=null;localStorage.removeItem(PROFILE_KEY);return result}
  state.profiles=[];state.profileId=null;localStorage.removeItem(PROFILE_KEY);state.message=result?.message||'Nenhum perfil profissional foi encontrado.';return result
}
function selectProfile(id,reload=true){state.profileId=id;localStorage.setItem(PROFILE_KEY,id);if(reload)loadDashboard().catch(showError)}
async function loadDashboard(date=state.selectedDate||localToday()){
  if(!state.profileId)return
  state.busy=true;render()
  try{
    const range=monthRange(date)
    state.data=await rpc('employee_dashboard',{p_start_date:range.start,p_end_date:range.end,p_professional_id:state.profileId})
    const tz=state.data?.establishment?.timezone||'America/Sao_Paulo'
    if(!state.selectedDate)state.selectedDate=dateKey(new Date().toISOString(),tz)
    applyBrand(state.data?.establishment)
  }finally{state.busy=false;render()}
}
function applyBrand(est){
  const root=document.documentElement
  if(est?.brand_enabled){
    if(/^#[0-9a-f]{6}$/i.test(est.brand_primary_color||''))root.style.setProperty('--brand',est.brand_primary_color)
    if(/^#[0-9a-f]{6}$/i.test(est.brand_secondary_color||''))root.style.setProperty('--brand-2',est.brand_secondary_color)
    if(/^#[0-9a-f]{6}$/i.test(est.brand_accent_color||''))root.style.setProperty('--accent',est.brand_accent_color)
  }
}
function formatParts(iso,tz){return new Intl.DateTimeFormat('pt-BR',{timeZone:tz,day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}).formatToParts(new Date(iso))}
function dateKey(iso,tz){const parts=Object.fromEntries(formatParts(iso,tz).map(p=>[p.type,p.value]));return `${parts.year}-${parts.month}-${parts.day}`}
function timeText(iso,tz){return new Intl.DateTimeFormat('pt-BR',{timeZone:tz,hour:'2-digit',minute:'2-digit'}).format(new Date(iso))}
function dayText(iso,tz){return new Intl.DateTimeFormat('pt-BR',{timeZone:tz,weekday:'short',day:'2-digit',month:'short'}).format(new Date(iso)).replace('.','')}
function fullDateText(date){return new Date(`${date}T12:00:00`).toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'long'})}
function localToIso(date,time,tz){
  const [y,m,d]=date.split('-').map(Number),[hh,mm]=time.split(':').map(Number);const desired=Date.UTC(y,m-1,d,hh,mm);let guess=desired
  for(let i=0;i<3;i++){
    const parts=new Intl.DateTimeFormat('en-US',{timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(guess))
    const p=Object.fromEntries(parts.map(x=>[x.type,x.value]));const represented=Date.UTC(Number(p.year),Number(p.month)-1,Number(p.day),Number(p.hour),Number(p.minute));guess-=represented-desired
  }
  return new Date(guess).toISOString()
}
function toast(message,error=false){state._toast={message,error};render();setTimeout(()=>{state._toast=null;render()},2800)}
function showError(error){toast(friendly(error),true)}

function logoHtml(){return `<div class="brand-lockup"><img src="/icon.svg" alt="ZAIA"><div><strong>ZAIA Profissional</strong><span>by Nethanel</span></div></div>`}
function loadingHtml(){return `<section class="employee-loading"><div class="loading-card">${logoHtml()}<div style="height:28px"></div><strong>Preparando sua agenda...</strong><p style="color:var(--muted);margin-bottom:0">Carregando somente o que faz parte da sua rotina profissional.</p></div></section>`}
function authHtml(){return `<section class="employee-auth"><div class="auth-card">${logoHtml()}<h1>Seu trabalho.<br>Sua agenda.</h1><p>Entre com o mesmo e-mail que o estabelecimento cadastrou no seu perfil profissional.</p>${state.error?`<div class="auth-error">${esc(state.error)}</div>`:''}${state.message?`<div class="notice" style="margin-bottom:14px">${esc(state.message)}</div>`:''}<button class="google-btn" id="employeeGoogle"><span class="google-g">G</span>Continuar com Google</button><div class="divider"><span>ou</span></div><form class="auth-fields" id="employeeAuthForm"><div class="field"><label>E-mail</label><input type="email" name="email" required autocomplete="email" placeholder="voce@email.com"></div><div class="field"><label>Senha</label><div class="password-wrap"><input type="password" name="password" id="employeePassword" minlength="6" required autocomplete="current-password" placeholder="Sua senha"><button type="button" class="password-toggle" id="togglePassword">VER</button></div></div><div class="auth-actions"><button class="btn primary wide" name="action" value="login">Entrar</button><button class="btn ghost wide" type="button" id="employeeSignup">Criar minha conta</button></div></form><div class="auth-foot">Seu acesso é individual. Você não verá dados de gestão da empresa.</div></div></section>`}
function profilePickerHtml(){
  const profiles=state.profiles||[]
  return `<section class="store-picker"><div class="loading-card">${logoHtml()}<h1>${profiles.length?'Onde você vai trabalhar?':'Perfil não encontrado'}</h1><p>${profiles.length?'Escolha seu perfil profissional para abrir sua agenda.':'Peça ao estabelecimento para cadastrar seu e-mail exatamente igual ao usado nesta conta.'}</p>${profiles.length?`<div class="profile-choice">${profiles.map(p=>`<button data-profile="${p.professional_id}"><strong>${esc(p.establishment_name)}</strong><span>${esc(p.professional_name)}${p.job_title?' • '+esc(p.job_title):''}</span></button>`).join('')}</div>`:''}<div style="height:14px"></div><button class="btn ghost wide" data-logout>Sair</button></div></section>`
}
function topbar(){const p=state.data?.professional||{},e=state.data?.establishment||{};const avatar=p.avatar_url?`<img src="${esc(p.avatar_url)}" alt="">`:esc((p.name||'P')[0].toUpperCase());return `<header class="employee-topbar"><div class="topbar-inner"><div class="employee-identity"><div class="employee-avatar">${avatar}</div><div><strong>${esc(p.name||'Profissional')}</strong><span>${esc(e.name||'ZAIA')}</span></div></div><div class="topbar-actions">${state.profiles.length>1?'<button class="icon-btn" data-switch-profile title="Trocar estabelecimento">↔</button>':''}<button class="icon-btn" data-logout title="Sair">⎋</button></div></div></header>`}
function bottomNav(){const items=[['home','⌂','Hoje'],['agenda','▦','Agenda'],['services','✦','Serviços'],['availability','◷','Disponibilidade']];return `<nav class="bottom-nav">${items.map(([id,ic,label])=>`<button data-page="${id}" class="${state.page===id?'active':''}"><span class="nav-icon">${ic}</span><span>${label}</span></button>`).join('')}</nav>`}
function appointmentActions(a){
  if(a.status==='COMPLETED'||a.status==='CANCELLED'||a.status==='NO_SHOW')return ''
  const actions=[]
  if(a.status==='SCHEDULED')actions.push(`<button class="mini-btn" data-status="CONFIRMED" data-appt="${a.id}">Confirmar</button>`)
  if(['SCHEDULED','CONFIRMED'].includes(a.status))actions.push(`<button class="mini-btn warn" data-status="IN_SERVICE" data-appt="${a.id}">Iniciar</button>`,`<button class="mini-btn" data-reschedule="${a.id}">Reagendar</button>`,`<button class="mini-btn danger" data-status="NO_SHOW" data-appt="${a.id}">Ausente</button>`)
  if(a.status==='IN_SERVICE')actions.push(`<button class="mini-btn good" data-status="COMPLETED" data-appt="${a.id}">Concluir</button>`)
  actions.push(`<button class="mini-btn danger" data-status="CANCELLED" data-appt="${a.id}">Cancelar</button>`)
  return `<div class="appt-actions">${actions.join('')}</div>`
}
function appointmentCard(a){
  const tz=state.data.establishment.timezone;const phone=digits(a.client?.phone);return `<article class="appointment-card"><div class="appt-time"><strong>${timeText(a.starts_at,tz)}</strong><span>${timeText(a.ends_at,tz)}</span></div><div class="appt-main"><div class="appt-title"><div><strong>${esc(a.client?.name||'Cliente')}</strong><div class="appt-service">${esc(a.service?.name||'Serviço')} • ${money(a.price)}</div></div><span class="status ${a.status}">${statusLabel(a.status)}</span></div>${phone?`<a class="contact-link" href="https://wa.me/55${phone}" target="_blank" rel="noopener">WhatsApp do cliente</a>`:''}${appointmentActions(a)}</div></article>`
}
function homePage(){
  const d=state.data,tz=d.establishment.timezone,today=dateKey(new Date().toISOString(),tz);const todayApps=(d.appointments||[]).filter(a=>dateKey(a.starts_at,tz)===today).sort((a,b)=>new Date(a.starts_at)-new Date(b.starts_at));const active=todayApps.filter(a=>!['CANCELLED','NO_SHOW'].includes(a.status));const done=todayApps.filter(a=>a.status==='COMPLETED').length;const comm=d.commission||{};const commissionType=d.professional.commission_type
  return `<div class="page-head"><div><span class="eyebrow">MINHA ROTINA</span><h1>Hoje</h1><p>${fullDateText(today)}</p></div><button class="date-chip" data-new-appt>+ Agendar</button></div><section class="hero-card"><div class="hero-kicker">${esc(d.establishment.name)}</div><h2>${active.length?`${active.length} atendimento${active.length===1?'':'s'} hoje`:'Agenda leve hoje'}</h2><p>${active.length?'Tudo organizado para você focar no atendimento.':'Você pode abrir um horário ou adicionar um atendimento.'}</p><div class="hero-metrics"><div class="hero-metric"><strong>${active.length}</strong><span>NA AGENDA HOJE</span></div><div class="hero-metric"><strong>${done}</strong><span>CONCLUÍDOS HOJE</span></div><div class="hero-metric"><strong>${commissionType==='NONE'?'—':money(comm.amount)}</strong><span>MINHA COMISSÃO NO MÊS</span></div></div></section>${commissionType!=='NONE'?`<section class="section"><div class="section-head"><h2>Meu mês</h2><span>${Number(comm.completed_count||0)} concluído${Number(comm.completed_count||0)===1?'':'s'}</span></div><div class="commission-card"><div><strong>Comissão acumulada</strong><br><small>Gerada automaticamente ao concluir seus atendimentos.</small></div><div class="amount">${money(comm.amount)}</div></div></section>`:''}<section class="section"><div class="section-head"><h2>Atendimentos de hoje</h2><span>${todayApps.length}</span></div><div class="list">${todayApps.length?todayApps.map(appointmentCard).join(''):`<div class="empty-card"><strong>Nenhum atendimento hoje</strong>Sua agenda está livre neste dia.</div>`}</div></section>`
}
function agendaPage(){
  const d=state.data,tz=d.establishment.timezone,date=state.selectedDate||dateKey(new Date().toISOString(),tz);const apps=(d.appointments||[]).filter(a=>dateKey(a.starts_at,tz)===date).sort((a,b)=>new Date(a.starts_at)-new Date(b.starts_at));return `<div class="page-head"><div><span class="eyebrow">MINHA AGENDA</span><h1>Agenda</h1><p>${fullDateText(date)}</p></div></div><div class="agenda-toolbar"><input id="agendaDate" type="date" value="${date}"><button class="btn primary" data-new-appt>+ Novo</button></div><div class="list">${apps.length?apps.map(appointmentCard).join(''):`<div class="empty-card"><strong>Horário livre</strong>Não há atendimentos nesta data.</div>`}</div><button class="floating-add" aria-label="Novo atendimento" data-new-appt>+</button>`
}
function servicesPage(){
  const services=state.data.services||[];return `<div class="page-head"><div><span class="eyebrow">MEUS SERVIÇOS</span><h1>Serviços</h1><p>Escolha o que você realiza e quanto tempo precisa em cada atendimento.</p></div></div><div class="notice">O preço continua definido pelo estabelecimento. Aqui você controla apenas seus serviços e sua duração profissional.</div><section class="section"><div class="list">${services.map(s=>`<article class="service-card"><div class="service-info"><strong>${esc(s.name)}</strong><span>${esc(s.category||'Serviço')} • ${money(s.effective_price)}</span><div class="service-duration"><span>Duração</span><select data-service-duration="${s.id}" ${!s.enabled?'disabled':''}>${[15,20,30,40,45,50,60,75,90,105,120,150,180,240,300,360].map(v=>`<option value="${v}" ${Number(s.effective_duration_minutes)===v?'selected':''}>${v<60?v+' min':v%60===0?(v/60)+'h':Math.floor(v/60)+'h'+(v%60)}</option>`).join('')}</select></div></div><label class="switch"><input type="checkbox" data-service-toggle="${s.id}" ${s.enabled?'checked':''}><span></span></label></article>`).join('')||'<div class="empty-card"><strong>Nenhum serviço disponível</strong>O estabelecimento ainda não publicou serviços.</div>'}</div></section>`
}
function availabilityPage(){
  const hours=state.data.working_hours||[],byDay={};hours.forEach(h=>byDay[Number(h.weekday)]=h);const blocks=state.data.blocks||[];return `<div class="page-head"><div><span class="eyebrow">MINHA DISPONIBILIDADE</span><h1>Disponibilidade</h1><p>Defina sua jornada e bloqueie compromissos pessoais.</p></div><button class="date-chip" data-new-block>+ Bloquear</button></div><section class="availability-grid">${[1,2,3,4,5,6,0].map(day=>{const h=byDay[day];return `<div class="availability-card" data-day-card="${day}"><strong>${weekdayName(day)}</strong><div class="hours-row"><input type="time" data-start value="${String(h?.start_time||'09:00').slice(0,5)}" ${!h?'disabled':''}><input type="time" data-end value="${String(h?.end_time||'18:00').slice(0,5)}" ${!h?'disabled':''}></div><label class="switch"><input type="checkbox" data-day-toggle="${day}" ${h?'checked':''}><span></span></label></div>`}).join('')}</section><section class="section"><div class="section-head"><h2>Bloqueios</h2><span>${blocks.length}</span></div><div class="list">${blocks.length?blocks.map(b=>`<div class="block-card"><div><strong>${dayText(b.starts_at,state.data.establishment.timezone)} • ${timeText(b.starts_at,state.data.establishment.timezone)}–${timeText(b.ends_at,state.data.establishment.timezone)}</strong><span>${esc(b.reason||'Indisponível')}</span></div><button class="mini-btn danger" data-delete-block="${b.id}">Excluir</button></div>`).join(''):`<div class="empty-card"><strong>Nenhum bloqueio futuro</strong>Sua disponibilidade segue apenas sua jornada semanal.</div>`}</div></section>`
}
function pageHtml(){return ({home:homePage,agenda:agendaPage,services:servicesPage,availability:availabilityPage})[state.page]?.()||homePage()}
function shellHtml(){return `<div class="employee-shell">${topbar()}<main class="employee-main">${state.busy?'<div class="notice" style="margin-bottom:12px">Atualizando sua agenda...</div>':''}${pageHtml()}</main>${bottomNav()}</div>${modalHtml()}${state._toast?`<div class="toast ${state._toast.error?'error':''}">${esc(state._toast.message)}</div>`:''}`}
function modalHtml(){
  if(!state.modal)return ''
  const close='<button class="modal-close" type="button" data-close-modal>×</button>';const tz=state.data.establishment.timezone
  if(state.modal.type==='new'){
    const enabled=(state.data.services||[]).filter(s=>s.enabled);return `<div class="modal-backdrop"><div class="modal-sheet"><div class="modal-head"><h3>Novo atendimento</h3>${close}</div><form class="modal-form" id="newAppointmentForm"><div class="field"><label>Cliente</label><input name="clientName" required maxlength="80" placeholder="Nome do cliente"></div><div class="field"><label>WhatsApp</label><input name="phone" inputmode="tel" maxlength="20" placeholder="(11) 99999-9999"></div><div class="field"><label>Serviço</label><select name="serviceId" required><option value="">Selecione</option>${enabled.map(s=>`<option value="${s.id}">${esc(s.name)} • ${money(s.effective_price)}</option>`).join('')}</select></div><div class="form-row"><div class="field"><label>Data</label><input type="date" name="date" required value="${state.selectedDate||dateKey(new Date().toISOString(),tz)}"></div><div class="field"><label>Hora</label><input type="time" name="time" required value="09:00"></div></div><div class="field"><label>Observação <small>(opcional)</small></label><textarea name="notes" rows="2" maxlength="250"></textarea></div><button class="btn primary wide">Salvar na minha agenda</button></form></div></div>`
  }
  if(state.modal.type==='reschedule'){
    const a=(state.data.appointments||[]).find(x=>x.id===state.modal.id);if(!a)return '';return `<div class="modal-backdrop"><div class="modal-sheet"><div class="modal-head"><h3>Reagendar</h3>${close}</div><form class="modal-form" id="rescheduleForm"><input type="hidden" name="appointmentId" value="${a.id}"><div class="notice">${esc(a.client?.name)} • ${esc(a.service?.name)}</div><div class="form-row"><div class="field"><label>Nova data</label><input type="date" name="date" required value="${dateKey(a.starts_at,tz)}"></div><div class="field"><label>Novo horário</label><input type="time" name="time" required value="${timeText(a.starts_at,tz)}"></div></div><button class="btn primary wide">Confirmar novo horário</button></form></div></div>`
  }
  if(state.modal.type==='block'){
    const date=state.selectedDate||dateKey(new Date().toISOString(),tz);return `<div class="modal-backdrop"><div class="modal-sheet"><div class="modal-head"><h3>Bloquear horário</h3>${close}</div><form class="modal-form" id="blockForm"><div class="field"><label>Data</label><input type="date" name="date" required value="${date}"></div><div class="form-row"><div class="field"><label>De</label><input type="time" name="start" required value="12:00"></div><div class="field"><label>Até</label><input type="time" name="end" required value="13:00"></div></div><div class="field"><label>Motivo</label><input name="reason" maxlength="100" placeholder="Ex.: Almoço, compromisso pessoal"></div><button class="btn primary wide">Bloquear na agenda</button></form></div></div>`
  }
  return ''
}
function render(){
  if(!app)return
  if(state.loading){app.innerHTML=loadingHtml();return}
  if(!state.session){app.innerHTML=authHtml();bindAuth();return}
  if(!state.profileId||!state.data){app.innerHTML=profilePickerHtml();bindPicker();return}
  app.innerHTML=shellHtml();bindShell()
}
function bindAuth(){
  document.querySelector('#togglePassword')?.addEventListener('click',e=>{const input=document.querySelector('#employeePassword');input.type=input.type==='password'?'text':'password';e.currentTarget.textContent=input.type==='password'?'VER':'OCULTAR'})
  document.querySelector('#employeeGoogle')?.addEventListener('click',()=>{const redirect=`${location.origin}/funcionario/`;const url=new URL(`${baseUrl()}/auth/v1/authorize`);url.searchParams.set('provider','google');url.searchParams.set('redirect_to',redirect);location.assign(url.toString())})
  const form=document.querySelector('#employeeAuthForm');form?.addEventListener('submit',async e=>{e.preventDefault();state.error='';const fd=new FormData(form);const btn=form.querySelector('[value="login"]');btn.disabled=true;btn.textContent='Entrando...';try{saveSession(await authRequest('token?grant_type=password',{email:String(fd.get('email')).trim(),password:String(fd.get('password'))}));await afterAuth()}catch(err){state.error=friendly(err);render()}})
  document.querySelector('#employeeSignup')?.addEventListener('click',async()=>{const fd=new FormData(form);const email=String(fd.get('email')||'').trim(),password=String(fd.get('password')||'');if(!email||password.length<6){state.error='Informe seu e-mail e uma senha com pelo menos 6 caracteres.';render();return}try{const redirect=`${location.origin}/funcionario/`;const data=await authRequest(`signup?redirect_to=${encodeURIComponent(redirect)}`,{email,password});if(data?.access_token){saveSession(data);await afterAuth()}else{state.message='Conta criada. Confira seu e-mail para confirmar o acesso e depois entre no ZAIA Profissional.';state.error='';render()}}catch(err){state.error=friendly(err);render()}})
}
function bindPicker(){document.querySelectorAll('[data-profile]').forEach(btn=>btn.addEventListener('click',async()=>{try{if(!state.profiles.some(p=>p.professional_id===btn.dataset.profile&&p.establishment_id)){return}const chosen=await claimProfile(btn.dataset.profile);if(chosen?.status==='READY'){selectProfile(btn.dataset.profile,false);await loadDashboard()}}catch(err){showError(err)}}));document.querySelector('[data-logout]')?.addEventListener('click',()=>{clearSession();state.message='';render()})}
function bindShell(){
  document.querySelectorAll('[data-page]').forEach(btn=>btn.addEventListener('click',()=>{state.page=btn.dataset.page;render()}))
  document.querySelectorAll('[data-logout]').forEach(btn=>btn.addEventListener('click',()=>{clearSession();state.message='';render()}))
  document.querySelector('[data-switch-profile]')?.addEventListener('click',()=>{state.profileId=null;state.data=null;localStorage.removeItem(PROFILE_KEY);render()})
  document.querySelectorAll('[data-new-appt]').forEach(btn=>btn.addEventListener('click',()=>{state.modal={type:'new'};render()}))
  document.querySelector('[data-new-block]')?.addEventListener('click',()=>{state.modal={type:'block'};render()})
  document.querySelectorAll('[data-close-modal]').forEach(btn=>btn.addEventListener('click',()=>{state.modal=null;render()}))
  document.querySelector('#agendaDate')?.addEventListener('change',async e=>{const next=e.target.value;if(!next)return;state.selectedDate=next;const current=state.data.period;if(next<current.start||next>current.end){try{await loadDashboard(next)}catch(err){showError(err)}}else render()})
  document.querySelectorAll('[data-status]').forEach(btn=>btn.addEventListener('click',()=>changeStatus(btn.dataset.appt,btn.dataset.status)))
  document.querySelectorAll('[data-reschedule]').forEach(btn=>btn.addEventListener('click',()=>{state.modal={type:'reschedule',id:btn.dataset.reschedule};render()}))
  document.querySelectorAll('[data-service-toggle]').forEach(input=>input.addEventListener('change',()=>saveService(input.dataset.serviceToggle,input.checked)))
  document.querySelectorAll('[data-service-duration]').forEach(select=>select.addEventListener('change',()=>{const service=(state.data.services||[]).find(s=>s.id===select.dataset.serviceDuration);saveService(select.dataset.serviceDuration,service?.enabled!==false,Number(select.value))}))
  document.querySelectorAll('[data-day-toggle]').forEach(input=>input.addEventListener('change',()=>{const card=input.closest('[data-day-card]');card.querySelectorAll('input[type="time"]').forEach(i=>i.disabled=!input.checked);saveDay(Number(input.dataset.dayToggle),input.checked,card)}))
  document.querySelectorAll('[data-day-card] input[type="time"]').forEach(input=>input.addEventListener('change',()=>{const card=input.closest('[data-day-card]'),toggle=card.querySelector('[data-day-toggle]');if(toggle.checked)saveDay(Number(toggle.dataset.dayToggle),true,card)}))
  document.querySelectorAll('[data-delete-block]').forEach(btn=>btn.addEventListener('click',()=>deleteBlock(btn.dataset.deleteBlock)))
  bindForms()
}
function bindForms(){
  document.querySelector('#newAppointmentForm')?.addEventListener('submit',async e=>{e.preventDefault();const fd=new FormData(e.currentTarget),tz=state.data.establishment.timezone;const submit=e.currentTarget.querySelector('button[type="submit"]');submit.disabled=true;submit.textContent='Salvando...';try{await rpc('employee_create_appointment',{p_service_id:fd.get('serviceId'),p_starts_at:localToIso(fd.get('date'),fd.get('time'),tz),p_client_name:fd.get('clientName'),p_client_phone:fd.get('phone')||null,p_notes:fd.get('notes')||null,p_professional_id:state.profileId});state.selectedDate=fd.get('date');state.modal=null;await loadDashboard(state.selectedDate);toast('Atendimento adicionado à sua agenda.')}catch(err){showError(err)}})
  document.querySelector('#rescheduleForm')?.addEventListener('submit',async e=>{e.preventDefault();const fd=new FormData(e.currentTarget),tz=state.data.establishment.timezone;try{await rpc('employee_reschedule_appointment',{p_appointment_id:fd.get('appointmentId'),p_starts_at:localToIso(fd.get('date'),fd.get('time'),tz),p_professional_id:state.profileId});state.selectedDate=fd.get('date');state.modal=null;await loadDashboard(state.selectedDate);toast('Horário atualizado.')}catch(err){showError(err)}})
  document.querySelector('#blockForm')?.addEventListener('submit',async e=>{e.preventDefault();const fd=new FormData(e.currentTarget),tz=state.data.establishment.timezone;try{await rpc('employee_add_time_block',{p_starts_at:localToIso(fd.get('date'),fd.get('start'),tz),p_ends_at:localToIso(fd.get('date'),fd.get('end'),tz),p_reason:fd.get('reason')||null,p_professional_id:state.profileId});state.modal=null;await loadDashboard(state.selectedDate);toast('Horário bloqueado.')}catch(err){showError(err)}})
}
async function changeStatus(id,status){
  const prompts={COMPLETED:'Concluir este atendimento? Isso gera o registro financeiro e a comissão.',CANCELLED:'Cancelar este atendimento?',NO_SHOW:'Marcar que o cliente não compareceu?'}
  if(prompts[status]&&!confirm(prompts[status]))return
  let reason=null;if(status==='CANCELLED')reason=prompt('Motivo do cancelamento (opcional):')||null
  try{await rpc('employee_update_appointment_status',{p_appointment_id:id,p_status:status,p_reason:reason,p_professional_id:state.profileId});await loadDashboard(state.selectedDate);toast(status==='COMPLETED'?'Atendimento concluído e comissão calculada.':'Atendimento atualizado.')}catch(err){showError(err)}
}
async function saveService(id,enabled,duration=null){
  try{await rpc('employee_set_service',{p_service_id:id,p_enabled:enabled,p_duration_minutes:duration,p_professional_id:state.profileId});await loadDashboard(state.selectedDate);toast(enabled?'Serviço atualizado.':'Serviço removido da sua agenda.')}catch(err){showError(err);await loadDashboard(state.selectedDate)}
}
async function saveDay(day,active,card){
  const start=card?.querySelector('[data-start]')?.value||null,end=card?.querySelector('[data-end]')?.value||null
  try{await rpc('employee_set_working_day',{p_weekday:day,p_active:active,p_start_time:active?start:null,p_end_time:active?end:null,p_professional_id:state.profileId});await loadDashboard(state.selectedDate);toast('Disponibilidade atualizada.')}catch(err){showError(err);await loadDashboard(state.selectedDate)}
}
async function deleteBlock(id){if(!confirm('Excluir este bloqueio de horário?'))return;try{await rpc('employee_delete_time_block',{p_block_id:id,p_professional_id:state.profileId});await loadDashboard(state.selectedDate);toast('Bloqueio removido.')}catch(err){showError(err)}}
async function afterAuth(){
  state.error='';state.message='';const claimed=await claimProfile();if(claimed?.status==='READY'){
    if(!state.profileId&&state.profiles.length)selectProfile(state.profiles[0].professional_id,false)
    if(state.profileId)await loadDashboard()
  }
  render()
}
async function boot(){
  if(!baseUrl()||!apiKey()){state.loading=false;state.error='Configuração do ZAIA indisponível.';render();return}
  try{consumeOAuth()}catch(err){state.error=friendly(err)}
  state.session=await ensureSession();state.loading=false;render()
  if(state.session){try{await afterAuth()}catch(err){state.message=friendly(err);state.data=null;render()}}
  if('serviceWorker'in navigator)navigator.serviceWorker.register('/sw-funcionario.js',{scope:'/funcionario/'}).catch(()=>{})
}
boot()
