import {
  cloudEnabled,
  getSession,
  signIn,
  signUp,
  clearSession,
  loadCloudState,
  createEstablishment,
  insertClient,
  insertService,
  insertProduct,
  insertAppointment,
  saveServiceMaterials,
  saveAppointmentMaterials,
  completeCloudAppointment,
  updateEstablishment,
  setSegments,
  insertProfessional,
  updateProfessional,
  saveProfessionalServices,
  saveProfessionalWorkingHours,
  insertProfessionalBlock,
  deleteProfessionalBlock,
  getAvailableSlots,
} from './cloud.js'

const SEGMENTS = {
  CABELO: { icon:'✂️', name:'Cabeleireiro', desc:'Cortes, química, coloração e tratamentos', services:['Corte feminino','Corte masculino','Escova','Hidratação','Coloração','Mechas','Progressiva','Reconstrução'], productCats:['Coloração','Tratamento','Lavagem','Finalização','Química','Descartáveis'], returnDays:30, vocabulary:{client:'Cliente',appointment:'Atendimento'} },
  BARBEARIA: { icon:'🧔', name:'Barbearia', desc:'Cabelo, barba e combos masculinos', services:['Corte masculino','Barba','Corte + barba','Pezinho','Pigmentação'], productCats:['Cabelo','Barba','Finalização','Higiene','Descartáveis'], returnDays:20, vocabulary:{client:'Cliente',appointment:'Atendimento'} },
  SOBRANCELHAS: { icon:'〰️', name:'Sobrancelhas', desc:'Design, henna e brow lamination', services:['Design de sobrancelhas','Design + henna','Design + tintura','Brow lamination'], productCats:['Henna','Tinturas','Preparação','Finalização','Descartáveis'], returnDays:20, vocabulary:{client:'Cliente',appointment:'Atendimento'} },
  CILIOS: { icon:'👁️', name:'Cílios', desc:'Extensão, manutenção e remoção', services:['Clássico fio a fio','Volume brasileiro','Híbrido','Volume russo','Mega volume','Manutenção','Remoção'], productCats:['Fios','Adesivos','Preparação','Remoção','Descartáveis'], returnDays:20, vocabulary:{client:'Cliente',appointment:'Aplicação'} },
  UNHAS: { icon:'💅', name:'Unhas', desc:'Manicure, gel e alongamentos', services:['Manicure','Pedicure','Esmaltação em gel','Banho de gel','Fibra de vidro','Manutenção','Remoção'], productCats:['Esmaltes','Géis','Acrílicos','Brocas','Higiene','Descartáveis'], returnDays:18, vocabulary:{client:'Cliente',appointment:'Atendimento'} },
  ESTETICA: { icon:'✨', name:'Estética', desc:'Protocolos faciais e corporais', services:['Limpeza de pele','Peeling','Drenagem linfática','Massagem modeladora','Protocolo facial','Protocolo corporal'], productCats:['Ativos','Cremes','Ácidos','Máscaras','Óleos','Descartáveis'], returnDays:21, vocabulary:{client:'Cliente',appointment:'Sessão'} },
  DEPILACAO: { icon:'🌿', name:'Depilação', desc:'Cera, laser e sessões por região', services:['Axilas','Meia perna','Perna inteira','Virilha','Rosto','Costas','Peito'], productCats:['Ceras','Pré-depilação','Pós-depilação','Higiene','Descartáveis'], returnDays:30, vocabulary:{client:'Cliente',appointment:'Sessão'} },
  MAQUIAGEM: { icon:'💄', name:'Maquiagem', desc:'Social, noiva e eventos', services:['Maquiagem social','Maquiagem para noiva','Maquiagem para festa','Teste de maquiagem'], productCats:['Pele','Olhos','Lábios','Higiene','Descartáveis'], returnDays:0, vocabulary:{client:'Cliente',appointment:'Atendimento'} },
}

const $ = (s,el=document)=>el.querySelector(s)
const $$ = (s,el=document)=>[...el.querySelectorAll(s)]
const fmtMoney = n => Number(n||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})
const fmtDate = d => new Date(d+'T12:00:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'})
const uid = () => crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)+Date.now()
const todayISO = ()=> new Date().toISOString().slice(0,10)
const storageKey='beauty_os_mvp_v2'

const emptyState = () => ({
  setup:false, establishment:null, services:[], products:[], clients:[], appointments:[], professionals:[], notificationsEnabled:false
})

let state=emptyState()
let page='home'
let modal=null
let loading=true
let authMessage=''
let currentUser=null

function localLoad(){
  try{return JSON.parse(localStorage.getItem(storageKey))||emptyState()}catch{return emptyState()}
}
function localSave(){localStorage.setItem(storageKey,JSON.stringify(state))}
function persistLocal(){ if(!cloudEnabled()) localSave() }
function activeSegments(){return (state.establishment?.segments||[]).map(k=>SEGMENTS[k]).filter(Boolean)}
function segmentKeys(){return state.establishment?.segments||[]}
function vocab(){return activeSegments()[0]?.vocabulary||{client:'Cliente',appointment:'Atendimento'}}
function categories(){return [...new Set(activeSegments().flatMap(s=>s.productCats))]}
function serviceById(id){return state.services.find(s=>s.id===id)}
function professionalById(id){return state.professionals.find(p=>p.id===id)}
function productById(id){return state.products.find(p=>p.id===id)}
const DAY_LABELS={0:'Dom',1:'Seg',2:'Ter',3:'Qua',4:'Qui',5:'Sex',6:'Sáb'}
const DAY_LONG={0:'Domingo',1:'Segunda',2:'Terça',3:'Quarta',4:'Quinta',5:'Sexta',6:'Sábado'}
function professionalServiceConfig(p,serviceId){return (p?.services||[]).find(x=>x.serviceId===serviceId&&x.active!==false)}
function professionalCanDoService(p,serviceId){return !!p&&(p.acceptsAllServices!==false||!!professionalServiceConfig(p,serviceId))}
function scheduleSummary(p){
  const hours=(p?.workingHours||[]).filter(h=>h.active!==false)
  if(!hours.length)return 'Jornada ainda não configurada'
  const byDay={}
  hours.forEach(h=>(byDay[h.weekday]||=[]).push(h))
  return Object.keys(byDay).map(Number).sort((a,b)=>a-b).map(d=>`${DAY_LABELS[d]} ${byDay[d].map(h=>`${h.start}–${h.end}`).join(', ')}`).join(' • ')
}
function commissionText(p){
  if(!p||p.commissionType==='NONE'||!Number(p.commissionValue))return 'Sem comissão definida'
  return p.commissionType==='PERCENT'?`Comissão ${Number(p.commissionValue).toLocaleString('pt-BR')}%`:`Comissão ${fmtMoney(p.commissionValue)}`
}
function fmtDateTime(iso){
  if(!iso)return ''
  return new Date(iso).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})
}
function normalizePhone(p=''){return String(p||'').replace(/\D/g,'').replace(/^55(?=\d{10,11}$)/,'')}
function maskPhone(value=''){
  let d=normalizePhone(value).slice(0,11)
  if(!d)return ''
  if(d.length<=2)return `(${d}`
  const area=d.slice(0,2),rest=d.slice(2)
  if(rest.length<=4)return `(${area}) ${rest}`
  if(rest.length<=8)return `(${area}) ${rest.slice(0,4)}-${rest.slice(4)}`
  return `(${area}) ${rest.slice(0,5)}-${rest.slice(5)}`
}
function parseMaskedNumber(value=''){
  const raw=String(value||'').replace(/[^\d,.-]/g,'').replace(/\.(?=.*\.)/g,'')
  if(!raw)return 0
  if(raw.includes(','))return Number(raw.replace(/\./g,'').replace(',','.'))||0
  return Number(raw)||0
}
function formatPercent(value){return `${Number(value||0).toLocaleString('pt-BR',{maximumFractionDigits:2})}%`}
function formatCommission(type,value){
  const n=Number(value||0)
  if(type==='PERCENT')return formatPercent(n)
  if(type==='FIXED')return fmtMoney(n)
  return ''
}
function bindPhoneMasks(root=document){
  $$('[data-mask="phone"]',root).forEach(input=>{
    input.value=maskPhone(input.value)
    input.addEventListener('input',()=>{input.value=maskPhone(input.value)})
  })
}
function openModal(name){
  modal=name
  if(!history.state?.beautyModal)history.pushState({...history.state,beautyModal:true},'',location.href)
  render()
}
function closeModal(){
  modal=null
  render()
  if(history.state?.beautyModal)history.back()
}
window.addEventListener('popstate',()=>{
  if(modal){modal=null;render()}
})
function fmtQty(n){return Number(n||0).toLocaleString('pt-BR',{maximumFractionDigits:3})}
function materialCost(materials=[]){return materials.reduce((sum,m)=>sum+Number(m.quantity||0)*Number(productById(m.productId)?.cost||0),0)}
function eligibleProducts(segment){return state.products.filter(p=>p.active!==false&&(!p.segment||p.segment===segment))}
function materialsEditorHtml(materials=[],segment){
  const values=Object.fromEntries(materials.map(m=>[m.productId,Number(m.quantity||0)]))
  const products=eligibleProducts(segment)
  if(!products.length)return `<div class="empty compact"><b>Nenhum produto disponível</b>Cadastre os materiais no estoque antes de configurar o consumo.</div>`
  return `<div class="material-list">${products.map(p=>`<label class="material-row"><div class="material-info"><strong>${esc(p.name)}</strong><span>${fmtQty(p.stock)} ${esc(p.unit)} em estoque • ${fmtMoney(p.cost)}/${esc(p.unit)}</span></div><div class="material-qty"><input data-material-id="${p.id}" type="number" min="0" step="0.001" inputmode="decimal" value="${values[p.id]||''}" placeholder="0"><small>${esc(p.unit)}</small></div></label>`).join('')}</div>`
}
function readMaterials(form){return $$('[data-material-id]',form).map(i=>({productId:i.dataset.materialId,quantity:Number(i.value||0)})).filter(m=>m.quantity>0)}
function esc(v=''){return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function setBusy(button, busy, text='Salvando...'){
  if(!button)return
  if(busy){button.dataset.oldText=button.textContent;button.textContent=text;button.disabled=true}
  else{button.textContent=button.dataset.oldText||button.textContent;button.disabled=false}
}
function friendlyError(error){
  const raw=String(error?.message||error||'Erro inesperado')
  if(/Invalid login credentials/i.test(raw)) return 'E-mail ou senha inválidos.'
  if(/Email not confirmed/i.test(raw)) return 'Confirme seu e-mail antes de entrar.'
  if(/User already registered/i.test(raw)) return 'Este e-mail já possui cadastro. Entre com sua senha.'
  return raw
}

async function boot(){
  loading=true;render()
  if(!cloudEnabled()){
    state=localLoad();loading=false;render();return
  }
  try{
    const loaded=await loadCloudState()
    if(!loaded.authenticated){
      currentUser=null;state=emptyState();loading=false;render();return
    }
    currentUser=loaded.user||getSession()?.user||null
    state={...emptyState(),...loaded}
  }catch(error){
    authMessage=`Não foi possível carregar os dados: ${friendlyError(error)}`
    state=emptyState()
  }
  loading=false;render()
}

function render(){
  const app=$('#app')
  if(!app)return
  if(loading){app.innerHTML=loadingPage();return}
  if(cloudEnabled()&&!getSession()){app.innerHTML=authPage();bindAuth();return}
  if(!state.setup){app.innerHTML=onboarding();bindOnboarding();return}
  app.innerHTML=`<div class="shell">${topbar()}<main class="content">${pageContent()}</main>${nav()}</div>${modal?modalHtml():''}`
  bindGlobal();bindPage();if(modal)bindModal()
}

function loadingPage(){
  return `<section class="onboard"><div class="onboard-inner" style="max-width:520px;padding-top:12vh;text-align:center"><div class="hero-logo" style="margin:auto">B</div><h1 style="font-size:28px">Preparando seu espaço...</h1><p class="subtitle">Carregando a operação do estabelecimento.</p></div></section>`
}

function authPage(){
  return `<section class="onboard"><div class="onboard-inner" style="max-width:480px;padding-top:5vh"><div class="hero-logo">B</div><div class="step" style="margin-top:22px">ACESSO AO ESTABELECIMENTO</div><h1>Entre no seu espaço.</h1><p class="subtitle">Cada usuário acessa somente os estabelecimentos aos quais pertence.</p>${authMessage?`<div class="warning-box" style="margin-top:18px">${esc(authMessage)}</div>`:''}<div class="card" style="margin-top:22px"><form class="form" id="authForm"><div class="field"><label>E-mail</label><input type="email" name="email" autocomplete="email" required placeholder="voce@email.com"></div><div class="field"><label>Senha</label><input type="password" name="password" autocomplete="current-password" minlength="6" required placeholder="Mínimo de 6 caracteres"></div><button class="btn primary wide" name="action" value="login">Entrar</button><button class="btn ghost wide" type="button" id="signupBtn">Criar conta</button></form><p class="helper" style="margin-top:12px">No primeiro acesso, após entrar, você configura o tipo do estabelecimento e os serviços iniciais.</p></div></div></section>`
}

function bindAuth(){
  const form=$('#authForm')
  form?.addEventListener('submit',async e=>{
    e.preventDefault();authMessage=''
    const btn=form.querySelector('button[name="action"]');setBusy(btn,true,'Entrando...')
    const f=Object.fromEntries(new FormData(form))
    try{await signIn(String(f.email).trim(),String(f.password));await boot()}
    catch(error){authMessage=friendlyError(error);setBusy(btn,false);render()}
  })
  $('#signupBtn')?.addEventListener('click',async e=>{
    const f=Object.fromEntries(new FormData(form));
    if(!f.email||!f.password){authMessage='Informe e-mail e senha para criar a conta.';render();return}
    setBusy(e.currentTarget,true,'Criando...')
    try{
      const result=await signUp(String(f.email).trim(),String(f.password))
      if(result?.access_token){authMessage='Conta criada. Vamos configurar seu estabelecimento.';await boot()}
      else{authMessage='Conta criada. Confira seu e-mail para confirmar o cadastro e depois entre.';render()}
    }catch(error){authMessage=friendlyError(error);render()}
  })
}

function topbar(){
  const est=state.establishment
  return `<header class="topbar"><div class="brand"><div class="brandmark">B</div><div class="brandtext"><strong>${esc(est.name)}</strong><span>${est.segments.map(s=>SEGMENTS[s]?.name).filter(Boolean).join(' • ')}</span></div></div><div class="avatar">${esc(est.name[0]?.toUpperCase()||'B')}</div></header>`
}
function nav(){
  const items=[['home','⌂','Hoje'],['agenda','▣','Agenda'],['clients','♙','Clientes'],['catalog','◇','Catálogo'],['more','☰','Mais']]
  return `<nav class="nav">${items.map(([p,i,l])=>`<button data-page="${p}" class="${page===p?'active':''}"><span>${i}</span>${l}</button>`).join('')}</nav>`
}
function pageContent(){return ({home:homePage,agenda:agendaPage,clients:clientsPage,catalog:catalogPage,more:morePage,inventory:inventoryPage,services:servicesPage,professionals:professionalsPage})[page]?.()||homePage()}

function onboarding(){
  const current=state._onboarding||{step:1,type:null,segments:[]};state._onboarding=current
  if(current.step===1)return `<section class="onboard"><div class="onboard-inner"><div class="hero-logo">B</div><div class="step">PASSO 1 DE 3</div><h1>Que tipo de negócio você administra?</h1><p class="subtitle">O sistema monta uma experiência específica para o seu segmento. Você poderá personalizar tudo depois.</p><div class="segments">${Object.entries(SEGMENTS).map(([k,s])=>`<button class="segment ${current.type===k?'selected':''}" data-segment="${k}"><div class="segment-icon">${s.icon}</div><strong>${s.name}</strong><small>${s.desc}</small></button>`).join('')}<button class="segment ${current.type==='STUDIO'?'selected':''}" data-segment="STUDIO"><div class="segment-icon">🏠</div><strong>Studio multidisciplinar</strong><small>Combine cabelo, unhas, cílios, sobrancelhas e outros.</small></button></div><button class="btn primary wide" id="next1" ${!current.type?'disabled':''}>Continuar</button></div></section>`
  if(current.step===2){
    const studio=current.type==='STUDIO'
    return `<section class="onboard"><div class="onboard-inner"><div class="step">PASSO 2 DE 3</div><h1>${studio?'Quais áreas fazem parte do seu studio?':'Vamos configurar seu estabelecimento.'}</h1><p class="subtitle">${studio?'Marque somente os segmentos que realmente fazem parte da operação.':'Essa escolha define serviços, estoque, formulários e linguagem inicial.'}</p>${studio?`<div class="segments">${Object.entries(SEGMENTS).map(([k,s])=>`<button class="segment ${current.segments.includes(k)?'selected':''}" data-multi="${k}"><div class="segment-icon">${s.icon}</div><strong>${s.name}</strong></button>`).join('')}</div>`:`<div class="card" style="margin:22px 0"><div class="segment-icon">${SEGMENTS[current.type].icon}</div><h2>${SEGMENTS[current.type].name}</h2><p class="subtitle">${SEGMENTS[current.type].desc}</p></div>`}<button class="btn primary wide" id="next2" ${studio&&!current.segments.length?'disabled':''}>Continuar</button><button class="btn ghost wide" id="back2" style="margin-top:10px">Voltar</button></div></section>`
  }
  const segs=current.type==='STUDIO'?current.segments:[current.type]
  const suggested=[...new Set(segs.flatMap(k=>SEGMENTS[k].services))]
  return `<section class="onboard"><div class="onboard-inner"><div class="step">PASSO 3 DE 3</div><h1>Seu espaço, do seu jeito.</h1><p class="subtitle">Informe o nome. Vamos criar uma base inicial com serviços coerentes com ${segs.length>1?'os segmentos escolhidos':'seu segmento'}.</p><div class="card" style="margin:22px 0"><div class="field"><label>Nome do estabelecimento</label><input id="estName" placeholder="Ex.: Studio Bella" value="${esc(current.name||'')}"></div><div class="field" style="margin-top:14px"><label>Serviços iniciais sugeridos</label><div class="chips">${suggested.slice(0,12).map(s=>`<span class="chip on">${esc(s)}</span>`).join('')}</div><div class="helper" style="margin-top:8px">Você poderá editar, excluir e criar seus próprios serviços.</div></div></div><button class="btn primary wide" id="finish">Criar meu espaço</button><button class="btn ghost wide" id="back3" style="margin-top:10px">Voltar</button></div></section>`
}

function bindOnboarding(){
  $$('[data-segment]').forEach(b=>b.onclick=()=>{state._onboarding.type=b.dataset.segment;state._onboarding.segments=[];render()})
  $('#next1')?.addEventListener('click',()=>{state._onboarding.step=2;render()})
  $$('[data-multi]').forEach(b=>b.onclick=()=>{const k=b.dataset.multi;const a=state._onboarding.segments;a.includes(k)?a.splice(a.indexOf(k),1):a.push(k);render()})
  $('#next2')?.addEventListener('click',()=>{state._onboarding.step=3;render()})
  $('#back2')?.addEventListener('click',()=>{state._onboarding.step=1;render()})
  $('#back3')?.addEventListener('click',()=>{state._onboarding.step=2;render()})
  $('#estName')?.addEventListener('input',e=>state._onboarding.name=e.target.value)
  $('#finish')?.addEventListener('click',async e=>{
    const button=e.currentTarget
    const o=state._onboarding
    const name=(o.name||$('#estName')?.value||'').trim()
    if(!name){alert('Informe o nome do estabelecimento.');return}
    const segs=o.type==='STUDIO'?o.segments:[o.type]
    const services=[...new Set(segs.flatMap(k=>SEGMENTS[k].services))].map(name=>{
      const segment=segs.find(k=>SEGMENTS[k].services.includes(name))
      return {id:uid(),name,segment,price:defaultPrice(name),duration:defaultDuration(name),active:true,returnDays:SEGMENTS[segment]?.returnDays||0}
    })
    setBusy(button,true,'Criando espaço...')
    try{
      if(cloudEnabled()){
        await createEstablishment({name,segments:segs,services})
        delete state._onboarding
        await boot()
      }else{
        state={...emptyState(),setup:true,establishment:{id:uid(),name,segments:segs},services,products:[],clients:[],appointments:[],professionals:[]}
        localSave();render()
      }
    }catch(error){setBusy(button,false);alert(`Não foi possível criar o estabelecimento. ${friendlyError(error)}`)}
  })
}

function defaultPrice(n){if(/progressiva|mechas|noiva|mega/i.test(n))return 180;if(/coloração|fibra|volume|protocolo/i.test(n))return 120;if(/manutenção|limpeza|drenagem|massagem/i.test(n))return 80;return 50}
function defaultDuration(n){if(/progressiva|mechas|noiva/i.test(n))return 150;if(/coloração|fibra|volume|protocolo/i.test(n))return 90;if(/manutenção|limpeza|drenagem|massagem/i.test(n))return 60;return 45}

function homePage(){
  const today=state.appointments.filter(a=>a.date===todayISO()&&a.status!=='CANCELADO').sort((a,b)=>a.time.localeCompare(b.time))
  const revenue=today.reduce((s,a)=>s+Number(a.price||0),0)
  const low=state.products.filter(p=>Number(p.stock)<=Number(p.minStock||0))
  const returns=clientsDueReturn()
  const primary=activeSegments()[0]
  const next=today.find(a=>a.status!=='CONCLUIDO')
  return `<div class="eyebrow">${primary?.icon||'✨'} ${primary?.name||'Beleza'}</div><h1 class="title">Seu negócio, hoje.</h1><p class="subtitle">O painel mostra somente o que importa para a operação de ${esc(state.establishment.name)}.</p><div class="grid stats"><div class="card"><div class="stat-label">Atendimentos hoje</div><div class="stat-value">${today.length}</div><div class="stat-note">${next?`Próximo ${next.time}`:'Agenda livre'}</div></div><div class="card"><div class="stat-label">Receita prevista</div><div class="stat-value money">${fmtMoney(revenue)}</div><div class="stat-note">Agenda de hoje</div></div><div class="card"><div class="stat-label">Retornos</div><div class="stat-value">${returns.length}</div><div class="stat-note">Clientes no período ideal</div></div><div class="card"><div class="stat-label">Estoque baixo</div><div class="stat-value">${low.length}</div><div class="stat-note">Itens para revisar</div></div></div><div class="section-head"><h2>Ações rápidas</h2></div><div class="quick"><button class="btn" data-open="appointment"><span class="icon">＋</span>Agendar</button><button class="btn" data-open="client"><span class="icon">♙</span>Cliente</button><button class="btn" data-page="inventory"><span class="icon">▦</span>Estoque</button></div>${returns.length?`<div class="section-head"><h2>Hora de trazer clientes de volta</h2><span class="pill">${returns.length}</span></div><div class="list">${returns.slice(0,4).map(c=>`<div class="item"><div class="item-main"><strong>${esc(c.name)}</strong><div class="meta">${c.daysSince} dias desde a última visita ${c.lastService?'• '+esc(c.lastService):''}</div></div>${c.phone?`<button class="btn small" data-wa="${c.id}">WhatsApp</button>`:''}</div>`).join('')}</div>`:''}<div class="section-head"><h2>Agenda de hoje</h2><button class="btn small" data-page="agenda">Ver agenda</button></div>${today.length?`<div class="list">${today.slice(0,5).map(appointmentItem).join('')}</div>`:`<div class="empty"><b>Nenhum horário hoje</b>Crie o primeiro atendimento pela ação “Agendar”.</div>`}`
}

function agendaPage(){
  const list=[...state.appointments].sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time))
  return `<div class="eyebrow">Operação</div><h1 class="title">Agenda</h1><p class="subtitle">Somente serviços cadastrados neste estabelecimento aparecem aqui.</p><div class="toolbar" style="margin-top:18px"><button class="btn primary" data-open="appointment">+ Novo horário</button>${!cloudEnabled()?'<button class="btn" id="seedAgenda">Gerar exemplo</button>':''}</div><div class="section-head"><h2>Próximos horários</h2><span class="pill">${list.length}</span></div>${list.length?`<div class="list">${list.map(a=>`<div><div class="tag" style="margin:14px 4px 6px">${fmtDate(a.date)}</div>${appointmentItem(a)}</div>`).join('')}</div>`:`<div class="empty"><b>Sua agenda está vazia</b>Adicione um atendimento para começar.</div>`}<button class="fab" data-open="appointment">+</button>`
}
function appointmentItem(a){
  const svc=serviceById(a.serviceId)
  const pro=professionalById(a.professionalId)
  const mats=a.materials?.length?a.materials:(svc?.materials||[])
  return `<div class="item appointment-item"><div style="font-weight:900;width:45px">${a.time}</div><div class="service-dot"></div><div class="item-main"><strong>${esc(a.clientName)}</strong><div class="meta">${esc(svc?.name||'Serviço')} • ${esc(pro?.name||'Profissional')} • ${fmtMoney(a.price)} ${mats.length?`• ${mats.length} material${mats.length>1?'is':''}`:''}</div></div><div class="item-actions"><button class="btn small ghost" data-appointment-materials="${a.id}" ${a.status==='CONCLUIDO'?'disabled':''}>Materiais</button><button class="btn small ${a.status==='CONCLUIDO'?'ghost':''}" data-complete="${a.id}" ${a.status==='CONCLUIDO'?'disabled':''}>${a.status==='CONCLUIDO'?'Concluído':'Concluir'}</button></div></div>`
}

function clientsPage(){return `<div class="eyebrow">Relacionamento</div><h1 class="title">Clientes</h1><p class="subtitle">Histórico e retorno ficam vinculados somente a ${esc(state.establishment.name)}.</p><div class="toolbar" style="margin-top:18px"><button class="btn primary" data-open="client">+ Novo cliente</button></div><div class="section-head"><h2>${state.clients.length} cadastrados</h2></div>${state.clients.length?`<div class="list">${state.clients.map(c=>`<div class="item"><div class="item-main"><strong>${esc(c.name)}</strong><div class="meta">${esc(c.phone||'Sem telefone')} ${c.lastService?'• '+esc(c.lastService):''}</div></div>${c.phone?`<button class="btn small" data-wa="${c.id}">WhatsApp</button>`:''}</div>`).join('')}</div>`:`<div class="empty"><b>Nenhum cliente ainda</b>Clientes também são criados automaticamente ao agendar.</div>`}<button class="fab" data-open="client">+</button>`}
function catalogPage(){return `<div class="eyebrow">Catálogo</div><h1 class="title">Seu negócio, suas regras.</h1><p class="subtitle">Você pode alterar os modelos sugeridos e criar serviços e produtos próprios.</p><div class="two-col" style="margin-top:20px"><button class="card" data-page="services" style="text-align:left;border:1px solid var(--line)"><div style="font-size:26px">✦</div><h2>Serviços</h2><p class="subtitle">${state.services.filter(s=>s.active).length} ativos • preços, duração e retorno.</p></button><button class="card" data-page="inventory" style="text-align:left;border:1px solid var(--line)"><div style="font-size:26px">▦</div><h2>Produtos & estoque</h2><p class="subtitle">${state.products.length} produtos • categorias específicas do segmento.</p></button></div>`}
function servicesPage(){return `<div class="eyebrow">Catálogo</div><h1 class="title">Serviços</h1><p class="subtitle">Defina também os materiais usados em cada serviço. A baixa acontece quando o atendimento é concluído.</p><div class="toolbar" style="margin-top:18px"><button class="btn primary" data-open="service">+ Adicionar serviço</button></div><div class="section-head"><h2>Serviços cadastrados</h2><span class="pill">${state.services.length}</span></div><div class="list">${state.services.map(s=>`<div class="item"><div class="service-dot"></div><div class="item-main"><strong>${esc(s.name)}</strong><div class="meta">${fmtMoney(s.price)} • ${s.duration} min ${s.returnDays?`• retorno ${s.returnDays} dias`:''}</div><div class="meta material-summary">${s.materials?.length?`${s.materials.length} material${s.materials.length>1?'is':''} • custo previsto ${fmtMoney(s.estimatedCost||materialCost(s.materials))}`:'Sem materiais configurados'}</div></div><div class="item-actions"><button class="btn small" data-service-materials="${s.id}">Materiais</button><span class="pill ${s.active?'good':''}">${s.active?'Ativo':'Inativo'}</span></div></div>`).join('')}</div><button class="fab" data-open="service">+</button>`}
function inventoryPage(){return `<div class="eyebrow">Operação</div><h1 class="title">Produtos & estoque</h1><p class="subtitle">Categorias sugeridas: ${categories().slice(0,5).join(', ')}${categories().length>5?'…':''}</p><div class="toolbar" style="margin-top:18px"><button class="btn primary" data-open="product">+ Adicionar produto</button></div><div class="section-head"><h2>Estoque atual</h2><span class="pill">${state.products.length}</span></div>${state.products.length?`<div class="list">${state.products.map(p=>{const pct=Math.min(100,Math.max(4,(Number(p.stock)/(Number(p.minStock||1)*3))*100));return `<div class="item"><div class="item-main"><div class="tag">${esc(p.category)}</div><strong>${esc(p.name)}</strong><div class="meta">${p.stock} ${esc(p.unit)} • mínimo ${p.minStock} • custo ${fmtMoney(p.cost)}</div><div class="stockbar"><i style="width:${pct}%"></i></div></div>${Number(p.stock)<=Number(p.minStock)?'<span class="pill warn">Baixo</span>':'<span class="pill good">OK</span>'}</div>`}).join('')}</div>`:`<div class="empty"><b>Estoque vazio</b>Cadastre somente os produtos que fazem sentido para sua operação.</div>`}<button class="fab" data-open="product">+</button>`}
function professionalsPage(){
  const activeServices=state.services.filter(s=>s.active)
  return `<div class="eyebrow">Equipe</div><h1 class="title">Profissionais</h1><p class="subtitle">Defina quem atende, quais serviços executa e quando está disponível.</p><div class="toolbar" style="margin-top:18px"><button class="btn primary" data-open="professional">+ Novo profissional</button></div><div class="section-head"><h2>Equipe</h2><span class="pill">${state.professionals.length}</span></div>${state.professionals.length?`<div class="list pro-list">${state.professionals.map(p=>{
    const serviceCount=p.acceptsAllServices!==false?activeServices.length:(p.services||[]).filter(x=>x.active!==false).length
    const futureBlocks=(p.blocks||[]).filter(b=>new Date(b.endsAt)>new Date()).length
    return `<div class="item pro-card"><div class="avatar pro-avatar">${esc((p.name||'P')[0].toUpperCase())}</div><div class="item-main"><div class="pro-title"><strong>${esc(p.name)}</strong><span class="pill good">Ativo</span></div><div class="meta">${esc(p.jobTitle||'Profissional')} • ${p.acceptsAllServices!==false?'Todos os serviços':serviceCount+' serviço'+(serviceCount===1?'':'s')}</div><div class="meta">${esc(scheduleSummary(p))}</div><div class="meta">${esc(commissionText(p))}${futureBlocks?` • ${futureBlocks} bloqueio${futureBlocks>1?'s':''}`:''}</div><div class="pro-actions"><button class="btn small" data-pro-edit="${p.id}">Editar</button><button class="btn small" data-pro-services="${p.id}">Serviços</button><button class="btn small" data-pro-hours="${p.id}">Jornada</button><button class="btn small ghost" data-pro-block="${p.id}">Bloquear horário</button></div></div></div>`
  }).join('')}</div>`:`<div class="empty"><b>Nenhum profissional cadastrado</b>Cadastre a equipe para organizar disponibilidade e serviços.</div>`}<div class="notice">A agenda já impede choque de horários, horários fora da jornada e serviços não habilitados para o profissional.</div><button class="fab" data-open="professional">+</button>`
}
function morePage(){return `<div class="eyebrow">Gestão</div><h1 class="title">Mais</h1><div class="list" style="margin-top:18px"><button class="item" data-page="professionals"><div style="font-size:22px">♙</div><div class="item-main" style="text-align:left"><strong>Profissionais</strong><div class="meta">Equipe, serviços e horários</div></div>›</button><button class="item" data-page="inventory"><div style="font-size:22px">▦</div><div class="item-main" style="text-align:left"><strong>Estoque</strong><div class="meta">Produtos e níveis mínimos</div></div>›</button><button class="item" id="notifyBtn"><div style="font-size:22px">🔔</div><div class="item-main" style="text-align:left"><strong>Notificações</strong><div class="meta">${state.notificationsEnabled?'Ativadas':'Ativar Push neste dispositivo'}</div></div>›</button><button class="item" data-open="business"><div style="font-size:22px">⚙</div><div class="item-main" style="text-align:left"><strong>Estabelecimento</strong><div class="meta">Nome e segmentos ativos</div></div>›</button></div><div class="section-head"><h2>MVP</h2></div><div class="card"><strong>Web App instalável</strong><p class="subtitle" style="margin-top:7px">Manifest + service worker já deixam a base preparada como PWA. Depois ela pode ser empacotada para Android sem alterar o banco.</p></div>${cloudEnabled()?'<button class="btn danger wide" id="logoutBtn" style="margin-top:18px">Sair da conta</button>':'<button class="btn danger wide" id="resetApp" style="margin-top:18px">Reiniciar demonstração</button>'}`}

function modalHtml(){
  const close='<button type="button" class="x" data-close aria-label="Fechar">×</button>'
  if(modal==='appointment')return `<div class="modal-backdrop"><div class="modal"><div class="modal-head"><h3>Novo ${vocab().appointment.toLowerCase()}</h3>${close}</div><form class="form" id="appointmentForm"><div class="field"><label>Cliente</label><input name="clientName" required placeholder="Nome da cliente"></div><div class="field"><label>WhatsApp</label><input name="phone" inputmode="tel" data-mask="phone" maxlength="15" placeholder="(11) 99999-9999"></div><div class="field"><label>Serviço</label><select name="serviceId" id="appointmentService" required><option value="">Selecione</option>${state.services.filter(s=>s.active).map(s=>`<option value="${s.id}">${esc(s.name)} — ${fmtMoney(s.price)}</option>`).join('')}</select></div><div class="field"><label>Profissional</label><select name="professionalId" id="appointmentProfessional" required><option value="">Selecione o serviço primeiro</option></select></div><div id="appointmentMaterialsBox"></div><div class="row"><div class="field"><label>Data</label><input name="date" id="appointmentDate" type="date" value="${todayISO()}" required></div><div class="field"><label>Horário</label><input name="time" id="appointmentTime" type="time" value="09:00" required></div></div><button type="button" class="btn wide" id="checkAvailability">Ver horários livres</button><div id="availableSlots"></div><button class="btn primary wide" type="submit">Salvar horário</button></form></div></div>`
  if(modal==='client')return `<div class="modal-backdrop"><div class="modal"><div class="modal-head"><h3>Novo cliente</h3>${close}</div><form class="form" id="clientForm"><div class="field"><label>Nome</label><input name="name" required></div><div class="field"><label>WhatsApp</label><input name="phone" inputmode="tel" data-mask="phone" maxlength="15" placeholder="(11) 99999-9999"></div><button class="btn primary wide">Salvar cliente</button></form></div></div>`
  if(modal==='service')return `<div class="modal-backdrop"><div class="modal"><div class="modal-head"><h3>Novo serviço</h3>${close}</div><form class="form" id="serviceForm"><div class="field"><label>Segmento</label><select name="segment" required>${segmentKeys().map(k=>`<option value="${k}">${SEGMENTS[k].name}</option>`).join('')}</select></div><div class="field"><label>Nome do serviço</label><input name="name" required placeholder="Ex.: Selagem Premium"></div><div class="row"><div class="field"><label>Preço</label><input name="price" type="number" min="0" step="0.01" inputmode="decimal" value="50" required></div><div class="field"><label>Duração (min)</label><input name="duration" type="number" min="5" step="5" inputmode="numeric" value="45" required></div></div><div class="field"><label>Retorno sugerido (dias)</label><input name="returnDays" type="number" min="0" max="3650" inputmode="numeric" value="${activeSegments()[0]?.returnDays||0}"></div><button class="btn primary wide">Adicionar serviço</button></form></div></div>`
  if(modal==='product')return `<div class="modal-backdrop"><div class="modal"><div class="modal-head"><h3>Novo produto</h3>${close}</div><form class="form" id="productForm"><div class="field"><label>Área</label><select name="segment"><option value="">Compartilhado pelo estabelecimento</option>${segmentKeys().map(k=>`<option value="${k}">${SEGMENTS[k].name}</option>`).join('')}</select></div><div class="field"><label>Nome</label><input name="name" required></div><div class="field"><label>Categoria</label><select name="category" required>${categories().map(c=>`<option>${esc(c)}</option>`).join('')}<option value="Outros">Outros</option></select></div><div class="row"><div class="field"><label>Estoque atual</label><input name="stock" type="number" step="0.001" inputmode="decimal" value="0" required></div><div class="field"><label>Estoque mínimo</label><input name="minStock" type="number" step="0.001" inputmode="decimal" value="0" required></div></div><div class="row"><div class="field"><label>Unidade</label><select name="unit"><option>un</option><option>ml</option><option>g</option><option>kg</option><option>L</option></select></div><div class="field"><label>Custo unitário</label><input name="cost" type="number" min="0" step="0.01" inputmode="decimal" value="0" required></div></div><button class="btn primary wide">Adicionar produto</button></form></div></div>`
  if(typeof modal==='string'&&modal.startsWith('serviceMaterials:')){const id=modal.split(':')[1];const svc=serviceById(id);if(!svc)return '';return `<div class="modal-backdrop"><div class="modal modal-tall"><div class="modal-head"><div><h3>Materiais do serviço</h3><div class="helper">${esc(svc.name)} • custo calculado automaticamente</div></div>${close}</div><form class="form" id="serviceMaterialsForm" data-service-id="${svc.id}"><div class="notice material-notice">Defina quanto normalmente é usado em um atendimento. Essa receita será copiada para novos agendamentos.</div>${materialsEditorHtml(svc.materials||[],svc.segment)}<div class="material-total">Custo estimado: <strong id="materialCostPreview">${fmtMoney(materialCost(svc.materials||[]))}</strong></div><button class="btn primary wide">Salvar materiais</button></form></div></div>`}
  if(typeof modal==='string'&&modal.startsWith('appointmentMaterials:')){const id=modal.split(':')[1];const appt=state.appointments.find(a=>a.id===id);const svc=appt&&serviceById(appt.serviceId);if(!appt||!svc)return '';const mats=appt.materials?.length?appt.materials:(svc.materials||[]);return `<div class="modal-backdrop"><div class="modal modal-tall"><div class="modal-head"><div><h3>Materiais do atendimento</h3><div class="helper">${esc(appt.clientName)} • ${esc(svc.name)}</div></div>${close}</div><form class="form" id="appointmentMaterialsForm" data-appointment-id="${appt.id}"><div class="notice material-notice">Ajuste o que realmente será usado. A baixa no estoque acontece somente ao concluir.</div>${materialsEditorHtml(mats,svc.segment)}<button class="btn primary wide">Salvar materiais do atendimento</button></form></div></div>`}
  if(modal==='professional'||modal.startsWith('professionalEdit:')){
    const id=modal.includes(':')?modal.split(':')[1]:null
    const p=id?professionalById(id):null
    return `<div class="modal-backdrop"><div class="modal"><div class="modal-head"><h3>${p?'Editar profissional':'Novo profissional'}</h3>${close}</div><form class="form" id="professionalForm" data-professional-id="${p?.id||''}"><div class="field"><label>Nome</label><input name="name" required value="${esc(p?.name||'')}" placeholder="Ex.: Ana Souza"></div><div class="field"><label>Função / especialidade</label><input name="jobTitle" value="${esc(p?.jobTitle||'')}" placeholder="Ex.: Cabeleireira, Lash designer"></div><div class="row"><div class="field"><label>WhatsApp</label><input name="phone" inputmode="tel" data-mask="phone" maxlength="15" value="${esc(maskPhone(p?.phone||''))}" placeholder="(11) 99999-9999"></div><div class="field"><label>E-mail</label><input name="email" type="email" value="${esc(p?.email||'')}"></div></div><div class="field"><label>Comissão padrão</label><select name="commissionType" id="commissionType"><option value="NONE" ${p?.commissionType==='NONE'||!p?'selected':''}>Sem comissão</option><option value="PERCENT" ${p?.commissionType==='PERCENT'?'selected':''}>Percentual</option><option value="FIXED" ${p?.commissionType==='FIXED'?'selected':''}>Valor fixo</option></select></div><div class="field"><label id="commissionValueLabel">Valor da comissão</label><input name="commissionValue" id="commissionValue" type="text" inputmode="decimal" autocomplete="off" value="${esc(formatCommission(p?.commissionType||'NONE',p?.commissionValue||0))}"></div><button class="btn primary wide">${p?'Salvar alterações':'Cadastrar profissional'}</button></form></div></div>`
  }
  if(modal.startsWith('professionalServices:')){
    const p=professionalById(modal.split(':')[1]);if(!p)return ''
    const configs=Object.fromEntries((p.services||[]).map(x=>[x.serviceId,x]))
    return `<div class="modal-backdrop"><div class="modal"><div class="modal-head"><h3>Serviços de ${esc(p.name)}</h3>${close}</div><form class="form" id="professionalServicesForm" data-professional-id="${p.id}"><label class="toggle-row"><input type="checkbox" id="professionalAllServices" ${p.acceptsAllServices!==false?'checked':''}><span><strong>Atende todos os serviços</strong><small>Novos serviços também ficam disponíveis automaticamente.</small></span></label><div class="service-config-list">${state.services.filter(s=>s.active).map(s=>{const c=configs[s.id];return `<div class="service-config-row"><label class="service-check"><input type="checkbox" data-pro-service="${s.id}" ${p.acceptsAllServices!==false||c?'checked':''}><span><strong>${esc(s.name)}</strong><small>${fmtMoney(s.price)} • ${s.duration} min</small></span></label><div class="service-overrides"><input data-pro-price="${s.id}" type="number" min="0" step="0.01" inputmode="decimal" placeholder="Preço padrão" value="${c?.customPrice??''}"><input data-pro-duration="${s.id}" type="number" min="5" step="5" inputmode="numeric" placeholder="Minutos" value="${c?.customDuration??''}"></div></div>`}).join('')}</div><button class="btn primary wide">Salvar serviços</button></form></div></div>`
  }
  if(modal.startsWith('professionalHours:')){
    const p=professionalById(modal.split(':')[1]);if(!p)return ''
    const hours=Object.fromEntries((p.workingHours||[]).map(h=>[h.weekday,h]))
    const days=[1,2,3,4,5,6,0]
    return `<div class="modal-backdrop"><div class="modal"><div class="modal-head"><h3>Jornada de ${esc(p.name)}</h3>${close}</div><form class="form" id="professionalHoursForm" data-professional-id="${p.id}"><div class="notice">Marque os dias trabalhados. Depois de salvar, a agenda só aceitará horários dentro desta jornada.</div><div class="schedule-grid">${days.map(d=>{const h=hours[d];return `<div class="day-row"><label class="day-toggle"><input type="checkbox" data-work-day="${d}" ${h?'checked':''}><strong>${DAY_LONG[d]}</strong></label><div class="day-times"><input data-work-start="${d}" type="time" value="${h?.start||'09:00'}"><span>até</span><input data-work-end="${d}" type="time" value="${h?.end||'18:00'}"></div></div>`}).join('')}</div><button class="btn primary wide">Salvar jornada</button></form></div></div>`
  }
  if(modal.startsWith('professionalBlock:')){
    const p=professionalById(modal.split(':')[1]);if(!p)return ''
    const upcoming=(p.blocks||[]).filter(b=>new Date(b.endsAt)>new Date()).sort((a,b)=>new Date(a.startsAt)-new Date(b.startsAt))
    return `<div class="modal-backdrop"><div class="modal"><div class="modal-head"><h3>Bloquear horário</h3>${close}</div><form class="form" id="professionalBlockForm" data-professional-id="${p.id}"><p class="subtitle">${esc(p.name)}</p><div class="row"><div class="field"><label>Início</label><input name="startsAt" type="datetime-local" value="${todayISO()}T12:00" required></div><div class="field"><label>Fim</label><input name="endsAt" type="datetime-local" value="${todayISO()}T13:00" required></div></div><div class="field"><label>Motivo</label><input name="reason" placeholder="Ex.: Almoço, folga, compromisso"></div><button class="btn primary wide">Adicionar bloqueio</button></form>${upcoming.length?`<div class="section-head"><h2>Próximos bloqueios</h2></div><div class="block-list">${upcoming.map(b=>`<div class="item compact-item"><div class="item-main"><strong>${fmtDateTime(b.startsAt)} – ${new Date(b.endsAt).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</strong><div class="meta">${esc(b.reason||'Indisponível')}</div></div><button class="btn small ghost" data-delete-block="${b.id}" data-professional-id="${p.id}">Remover</button></div>`).join('')}</div>`:''}</div></div>`
  }
  if(modal==='business')return `<div class="modal-backdrop"><div class="modal"><div class="modal-head"><h3>Estabelecimento</h3>${close}</div><div class="field"><label>Nome</label><input id="businessName" value="${esc(state.establishment.name)}"></div><div class="field" style="margin-top:14px"><label>Segmentos ativos</label><div class="chips">${Object.entries(SEGMENTS).map(([k,s])=>`<button type="button" class="chip ${segmentKeys().includes(k)?'on':''}" data-toggle-seg="${k}">${s.icon} ${s.name}</button>`).join('')}</div><span class="helper">Ao ativar um segmento, novas categorias ficam disponíveis; seus cadastros existentes não são apagados.</span></div><button class="btn primary wide" id="saveBusiness" style="margin-top:18px">Salvar</button></div></div>`
  return ''
}

function bindGlobal(){
  $$('[data-page]').forEach(b=>b.onclick=()=>{page=b.dataset.page;modal=null;render()})
  $$('[data-open]').forEach(b=>b.onclick=()=>openModal(b.dataset.open))
  $$('[data-wa]').forEach(b=>b.onclick=()=>openWhatsApp(b.dataset.wa))
  $$('[data-service-materials]').forEach(b=>b.onclick=()=>openModal(`serviceMaterials:${b.dataset.serviceMaterials}`))
  $$('[data-appointment-materials]').forEach(b=>b.onclick=()=>openModal(`appointmentMaterials:${b.dataset.appointmentMaterials}`))
  $$('[data-complete]').forEach(b=>b.onclick=()=>completeAppointment(b.dataset.complete,b))
  $$('[data-pro-edit]').forEach(b=>b.onclick=()=>openModal(`professionalEdit:${b.dataset.proEdit}`))
  $$('[data-pro-services]').forEach(b=>b.onclick=()=>openModal(`professionalServices:${b.dataset.proServices}`))
  $$('[data-pro-hours]').forEach(b=>b.onclick=()=>openModal(`professionalHours:${b.dataset.proHours}`))
  $$('[data-pro-block]').forEach(b=>b.onclick=()=>openModal(`professionalBlock:${b.dataset.proBlock}`))
}
function bindPage(){
  $('#seedAgenda')?.addEventListener('click',seedAgenda)
  $('#notifyBtn')?.addEventListener('click',enableNotifications)
  $('#resetApp')?.addEventListener('click',()=>{if(confirm('Apagar os dados locais da demonstração?')){localStorage.removeItem(storageKey);state=emptyState();page='home';render()}})
  $('#logoutBtn')?.addEventListener('click',()=>{clearSession();state=emptyState();currentUser=null;page='home';authMessage='';render()})
}
function bindModal(){
  $$('[data-close]').forEach(b=>b.onclick=closeModal)
  $('.modal-backdrop')?.addEventListener('click',e=>{if(e.target.classList.contains('modal-backdrop'))closeModal()})
  bindPhoneMasks($('.modal-backdrop')||document)

  const commissionType=$('#commissionType')
  const commissionValue=$('#commissionValue')
  const commissionLabel=$('#commissionValueLabel')
  const syncCommissionMask=(format=true)=>{
    if(!commissionType||!commissionValue)return
    const type=commissionType.value
    const numeric=parseMaskedNumber(commissionValue.value)
    if(commissionLabel)commissionLabel.textContent=type==='PERCENT'?'Percentual da comissão':type==='FIXED'?'Valor fixo da comissão':'Valor da comissão'
    commissionValue.disabled=type==='NONE'
    commissionValue.placeholder=type==='PERCENT'?'Ex.: 20%':type==='FIXED'?'Ex.: R$ 50,00':'Sem comissão'
    if(type==='NONE'){commissionValue.value='';return}
    if(format)commissionValue.value=formatCommission(type,numeric)
  }
  commissionType?.addEventListener('change',()=>syncCommissionMask(true))
  commissionValue?.addEventListener('focus',()=>{
    if(commissionType?.value==='NONE')return
    const n=parseMaskedNumber(commissionValue.value)
    commissionValue.value=n?String(n).replace('.',','):''
    setTimeout(()=>commissionValue.select(),0)
  })
  commissionValue?.addEventListener('blur',()=>syncCommissionMask(true))
  commissionValue?.addEventListener('input',()=>{
    if(commissionType?.value==='PERCENT'){
      const n=Math.min(100,Math.max(0,parseMaskedNumber(commissionValue.value)))
      if(parseMaskedNumber(commissionValue.value)>100)commissionValue.value='100'
    }
  })
  syncCommissionMask(true)

  const apptService=$('#appointmentService')
  const apptProfessional=$('#appointmentProfessional')
  const apptDate=$('#appointmentDate')
  const apptTime=$('#appointmentTime')
  const apptMaterialsBox=$('#appointmentMaterialsBox')
  const slotsBox=$('#availableSlots')
  const refreshProfessionals=()=>{
    if(!apptProfessional)return
    const serviceId=apptService?.value
    const current=apptProfessional.value
    const eligible=state.professionals.filter(p=>p.active!==false&&(!serviceId||professionalCanDoService(p,serviceId)))
    apptProfessional.innerHTML=`<option value="">Selecione</option>${eligible.map(p=>`<option value="${p.id}" ${p.id===current?'selected':''}>${esc(p.name)}${p.jobTitle?' — '+esc(p.jobTitle):''}</option>`).join('')}`
    if(!apptProfessional.value&&eligible.length===1)apptProfessional.value=eligible[0].id
  }
  const refreshAppointmentMaterials=()=>{
    if(!apptMaterialsBox)return
    const svc=serviceById(apptService?.value)
    if(!svc){apptMaterialsBox.innerHTML='';return}
    apptMaterialsBox.innerHTML=`<div class="materials-box"><div class="materials-head"><div><strong>Materiais deste atendimento</strong><div class="helper">Pré-preenchido pelo serviço. Você pode ajustar agora.</div></div><span class="pill">Baixa ao concluir</span></div>${materialsEditorHtml(svc.materials||[],svc.segment)}</div>`
  }
  const clearSlots=()=>{if(slotsBox)slotsBox.innerHTML=''}
  if(apptService){apptService.addEventListener('change',()=>{refreshProfessionals();refreshAppointmentMaterials();clearSlots()});refreshProfessionals();refreshAppointmentMaterials()}
  apptProfessional?.addEventListener('change',clearSlots)
  apptDate?.addEventListener('change',clearSlots)
  $('#checkAvailability')?.addEventListener('click',async ()=>{
    const serviceId=apptService?.value,professionalId=apptProfessional?.value,date=apptDate?.value
    if(!serviceId||!professionalId||!date)return alert('Selecione serviço, profissional e data.')
    const pro=professionalById(professionalId)
    if(!pro?.workingHours?.length){slotsBox.innerHTML='<div class="notice compact-notice">Este profissional ainda não tem jornada configurada. Você pode informar o horário manualmente.</div>';return}
    slotsBox.innerHTML='<div class="helper">Buscando horários livres...</div>'
    try{
      const slots=cloudEnabled()?await getAvailableSlots(professionalId,serviceId,date,15):[]
      slotsBox.innerHTML=slots.length?`<div class="slots">${slots.map(x=>`<button type="button" class="slot-chip" data-slot-time="${x.time}">${x.time}</button>`).join('')}</div>`:'<div class="notice compact-notice">Nenhum horário livre nesta data.</div>'
      $$('[data-slot-time]',slotsBox).forEach(b=>b.onclick=()=>{apptTime.value=b.dataset.slotTime;$$('[data-slot-time]',slotsBox).forEach(x=>x.classList.remove('on'));b.classList.add('on')})
    }catch(error){slotsBox.innerHTML=`<div class="warning-box">${esc(friendlyError(error))}</div>`}
  })

  $('#appointmentForm')?.addEventListener('submit',async e=>{
    e.preventDefault();const button=e.target.querySelector('button[type="submit"]');setBusy(button,true)
    try{
      const f=Object.fromEntries(new FormData(e.target));const s=serviceById(f.serviceId)
      let c=state.clients.find(c=>normalizePhone(c.phone)===normalizePhone(f.phone)&&f.phone)||state.clients.find(c=>c.name.toLowerCase()===String(f.clientName).toLowerCase())
      if(!c){
        if(cloudEnabled()){
          const row=await insertClient(state.establishment.id,{name:f.clientName,phone:normalizePhone(f.phone)})
          c={id:row.id,name:row.name,phone:row.phone||''};state.clients.push(c)
        }else{c={id:uid(),name:f.clientName,phone:normalizePhone(f.phone),createdAt:new Date().toISOString()};state.clients.push(c)}
      }
      const materials=readMaterials(e.target)
      const pro=professionalById(f.professionalId)
      const config=professionalServiceConfig(pro,f.serviceId)
      const appt={id:uid(),clientId:c.id,clientName:c.name,phone:c.phone,professionalId:f.professionalId,serviceId:f.serviceId,date:f.date,time:f.time,price:config?.customPrice??s.price,status:'AGENDADO',materials}
      if(cloudEnabled()){
        const row=await insertAppointment(state.establishment.id,appt,s);appt.id=row.id;appt.price=Number(row.price);appt.professionalId=row.professional_id
        await saveAppointmentMaterials(appt.id,materials)
      }
      state.appointments.push(appt);persistLocal();modal=null;page='agenda';render()
    }catch(error){setBusy(button,false);alert(`Não foi possível salvar o horário. ${friendlyError(error)}`)}
  })

  $('#clientForm')?.addEventListener('submit',async e=>{
    e.preventDefault();const button=e.target.querySelector('button[type="submit"]');setBusy(button,true)
    try{
      const f=Object.fromEntries(new FormData(e.target));let c={id:uid(),name:f.name,phone:normalizePhone(f.phone),createdAt:new Date().toISOString()}
      if(cloudEnabled()){const row=await insertClient(state.establishment.id,c);c={id:row.id,name:row.name,phone:row.phone||''}}
      state.clients.push(c);persistLocal();modal=null;render()
    }catch(error){setBusy(button,false);alert(`Não foi possível salvar o cliente. ${friendlyError(error)}`)}
  })

  $('#serviceForm')?.addEventListener('submit',async e=>{
    e.preventDefault();const button=e.target.querySelector('button[type="submit"]');setBusy(button,true)
    try{
      const f=Object.fromEntries(new FormData(e.target));let s={id:uid(),name:f.name,price:Number(f.price),duration:Number(f.duration),segment:f.segment,returnDays:Number(f.returnDays),estimatedCost:0,materials:[],active:true}
      if(cloudEnabled()){
        const row=await insertService(state.establishment.id,s)
        s={id:row.id,name:row.name,price:Number(row.price),duration:row.duration_minutes,segment:row.segment_code,returnDays:Number(row.return_interval_days||0),estimatedCost:Number(row.estimated_cost||0),materials:[],active:row.active}
      }
      state.services.push(s);persistLocal();modal=null;render()
    }catch(error){setBusy(button,false);alert(`Não foi possível salvar o serviço. ${friendlyError(error)}`)}
  })

  $('#productForm')?.addEventListener('submit',async e=>{
    e.preventDefault();const button=e.target.querySelector('button[type="submit"]');setBusy(button,true)
    try{
      const f=Object.fromEntries(new FormData(e.target));let p={id:uid(),name:f.name,segment:f.segment||null,category:f.category,stock:Number(f.stock),minStock:Number(f.minStock),unit:f.unit,cost:Number(f.cost),type:'INTERNAL'}
      if(cloudEnabled()){
        const row=await insertProduct(state.establishment.id,p)
        p={id:row.id,name:row.name,segment:row.segment_code,category:row.category,stock:Number(row.stock_quantity),minStock:Number(row.minimum_stock),unit:row.unit,cost:Number(row.unit_cost),type:row.usage_type,active:row.active}
      }
      state.products.push(p);persistLocal();modal=null;render()
    }catch(error){setBusy(button,false);alert(`Não foi possível salvar o produto. ${friendlyError(error)}`)}
  })

  $('#serviceMaterialsForm')?.addEventListener('input',e=>{
    const form=e.currentTarget;const cost=materialCost(readMaterials(form));const preview=$('#materialCostPreview');if(preview)preview.textContent=fmtMoney(cost)
  })

  $('#serviceMaterialsForm')?.addEventListener('submit',async e=>{
    e.preventDefault();const button=e.target.querySelector('button[type="submit"]');setBusy(button,true)
    const serviceId=e.target.dataset.serviceId;const svc=serviceById(serviceId);const materials=readMaterials(e.target)
    try{
      if(cloudEnabled())await saveServiceMaterials(serviceId,materials)
      svc.materials=materials;svc.estimatedCost=materialCost(materials);persistLocal();modal=null;render()
    }catch(error){setBusy(button,false);alert(`Não foi possível salvar os materiais. ${friendlyError(error)}`)}
  })

  $('#appointmentMaterialsForm')?.addEventListener('submit',async e=>{
    e.preventDefault();const button=e.target.querySelector('button[type="submit"]');setBusy(button,true)
    const appointmentId=e.target.dataset.appointmentId;const appt=state.appointments.find(a=>a.id===appointmentId);const materials=readMaterials(e.target)
    try{
      if(cloudEnabled())await saveAppointmentMaterials(appointmentId,materials)
      appt.materials=materials;persistLocal();modal=null;render()
    }catch(error){setBusy(button,false);alert(`Não foi possível salvar os materiais do atendimento. ${friendlyError(error)}`)}
  })

  $('#professionalForm')?.addEventListener('submit',async e=>{
    e.preventDefault();const button=e.target.querySelector('button[type="submit"]');setBusy(button,true)
    const f=Object.fromEntries(new FormData(e.target));const id=e.target.dataset.professionalId
    const data={name:String(f.name||'').trim(),jobTitle:String(f.jobTitle||'').trim(),phone:normalizePhone(f.phone),email:String(f.email||'').trim(),commissionType:f.commissionType||'NONE',commissionValue:parseMaskedNumber(f.commissionValue),acceptsAllServices:true}
    try{
      if(cloudEnabled()){id?await updateProfessional(id,data):await insertProfessional(state.establishment.id,data);modal=null;page='professionals';await boot();return}
      if(id){Object.assign(professionalById(id),data)}else state.professionals.push({id:uid(),...data,active:true,services:[],workingHours:[],blocks:[]})
      persistLocal();modal=null;page='professionals';render()
    }catch(error){setBusy(button,false);alert(`Não foi possível salvar o profissional. ${friendlyError(error)}`)}
  })

  const allServicesToggle=$('#professionalAllServices')
  const syncServiceInputs=()=>{
    const all=allServicesToggle?.checked
    $$('[data-pro-service]').forEach(x=>{x.disabled=!!all})
    $$('[data-pro-price], [data-pro-duration]').forEach(x=>{x.disabled=!!all})
  }
  allServicesToggle?.addEventListener('change',syncServiceInputs);syncServiceInputs()

  $('#professionalServicesForm')?.addEventListener('submit',async e=>{
    e.preventDefault();const button=e.target.querySelector('button[type="submit"]');setBusy(button,true)
    const id=e.target.dataset.professionalId;const acceptsAll=$('#professionalAllServices')?.checked!==false
    const services=acceptsAll?[]:$('[data-pro-service]',e.target).filter(x=>x.checked).map(x=>({
      serviceId:x.dataset.proService,
      customPrice:$('[data-pro-price="'+x.dataset.proService+'"]',e.target)?.value||null,
      customDuration:$('[data-pro-duration="'+x.dataset.proService+'"]',e.target)?.value||null,
    }))
    try{
      if(cloudEnabled()){await saveProfessionalServices(id,acceptsAll,services);modal=null;page='professionals';await boot();return}
      const p=professionalById(id);p.acceptsAllServices=acceptsAll;p.services=services.map(x=>({...x,active:true}));persistLocal();modal=null;render()
    }catch(error){setBusy(button,false);alert(`Não foi possível salvar os serviços. ${friendlyError(error)}`)}
  })

  $('#professionalHoursForm')?.addEventListener('submit',async e=>{
    e.preventDefault();const button=e.target.querySelector('button[type="submit"]');setBusy(button,true)
    const id=e.target.dataset.professionalId
    const hours=$('[data-work-day]',e.target).filter(x=>x.checked).map(x=>({weekday:Number(x.dataset.workDay),start:$('[data-work-start="'+x.dataset.workDay+'"]',e.target).value,end:$('[data-work-end="'+x.dataset.workDay+'"]',e.target).value}))
    if(hours.some(h=>h.end<=h.start)){setBusy(button,false);return alert('O horário final precisa ser depois do horário inicial.')}
    try{
      if(cloudEnabled()){await saveProfessionalWorkingHours(id,hours);modal=null;page='professionals';await boot();return}
      professionalById(id).workingHours=hours;persistLocal();modal=null;render()
    }catch(error){setBusy(button,false);alert(`Não foi possível salvar a jornada. ${friendlyError(error)}`)}
  })

  $('#professionalBlockForm')?.addEventListener('submit',async e=>{
    e.preventDefault();const button=e.target.querySelector('button[type="submit"]');setBusy(button,true)
    const f=Object.fromEntries(new FormData(e.target));const id=e.target.dataset.professionalId
    const starts=new Date(f.startsAt),ends=new Date(f.endsAt)
    if(!(ends>starts)){setBusy(button,false);return alert('O fim do bloqueio precisa ser depois do início.')}
    try{
      if(cloudEnabled()){await insertProfessionalBlock(state.establishment.id,id,{startsAt:starts.toISOString(),endsAt:ends.toISOString(),reason:f.reason});modal=`professionalBlock:${id}`;await boot();return}
      professionalById(id).blocks.push({id:uid(),startsAt:starts.toISOString(),endsAt:ends.toISOString(),reason:f.reason||''});persistLocal();render()
    }catch(error){setBusy(button,false);alert(`Não foi possível criar o bloqueio. ${friendlyError(error)}`)}
  })

  $$('[data-delete-block]').forEach(b=>b.onclick=async()=>{
    if(!confirm('Remover este bloqueio?'))return
    const id=b.dataset.deleteBlock,professionalId=b.dataset.professionalId
    try{
      if(cloudEnabled()){await deleteProfessionalBlock(id);modal=`professionalBlock:${professionalId}`;await boot();return}
      const p=professionalById(professionalId);p.blocks=(p.blocks||[]).filter(x=>x.id!==id);persistLocal();render()
    }catch(error){alert(`Não foi possível remover o bloqueio. ${friendlyError(error)}`)}
  })

  $$('[data-toggle-seg]').forEach(b=>b.onclick=()=>{
    const k=b.dataset.toggleSeg;const a=state.establishment.segments
    if(a.includes(k)){if(a.length===1){alert('O estabelecimento precisa manter pelo menos um segmento ativo.');return}a.splice(a.indexOf(k),1)}else a.push(k)
    render()
  })

  $('#saveBusiness')?.addEventListener('click',async e=>{
    const button=e.currentTarget;setBusy(button,true)
    const name=$('#businessName').value.trim()||state.establishment.name
    try{
      if(cloudEnabled()){
        await updateEstablishment(state.establishment.id,{name})
        await setSegments(state.establishment.id,state.establishment.segments)
      }
      state.establishment.name=name;persistLocal();modal=null;render()
    }catch(error){setBusy(button,false);alert(`Não foi possível atualizar o estabelecimento. ${friendlyError(error)}`)}
  })
}

async function completeAppointment(id,button){
  const a=state.appointments.find(x=>x.id===id);if(!a||a.status==='CONCLUIDO')return
  const c=state.clients.find(c=>c.id===a.clientId);const s=serviceById(a.serviceId)
  const materials=a.materials?.length?a.materials:(s?.materials||[])
  const shortages=materials.filter(m=>Number(m.quantity)>Number(productById(m.productId)?.stock||0))
  if(shortages.length){
    const names=shortages.map(m=>productById(m.productId)?.name).filter(Boolean).join(', ')
    if(!confirm(`O estoque registrado é menor que o consumo previsto de: ${names}. Concluir mesmo assim e deixar o estoque negativo?`))return
  }
  setBusy(button,true,'...')
  try{
    if(cloudEnabled()){
      const result=await completeCloudAppointment(state.establishment.id,a)
      const loaded=await loadCloudState();currentUser=loaded.user||currentUser;state={...emptyState(),...loaded};render()
      const low=Array.isArray(result?.low_stock)?result.low_stock:[]
      if(low.length)alert(`Atendimento concluído e estoque atualizado. Estoque baixo: ${low.map(x=>x.name).join(', ')}.`)
      return
    }
    for(const m of materials){const p=productById(m.productId);if(p)p.stock=Number(p.stock)-Number(m.quantity||0)}
    a.status='CONCLUIDO';a.completedAt=new Date().toISOString()
    if(c){c.lastVisit=a.date;c.lastService=s?.name;c.returnDays=s?.returnDays||0}
    persistLocal();render()
  }catch(error){setBusy(button,false);alert(`Não foi possível concluir o atendimento. ${friendlyError(error)}`)}
}
function clientsDueReturn(){
  const now=new Date(todayISO()+'T12:00:00')
  return state.clients.filter(c=>c.lastVisit&&c.returnDays>0).map(c=>{const d=new Date(c.lastVisit+'T12:00:00');const days=Math.floor((now-d)/86400000);return {...c,daysSince:days}}).filter(c=>c.daysSince>=Math.max(1,c.returnDays-3))
}
function openWhatsApp(id){
  const c=state.clients.find(x=>x.id===id);if(!c)return
  const phone=normalizePhone(c.phone);if(!phone){alert('Cadastre o WhatsApp do cliente primeiro.');return}
  const msg=`Olá, ${c.name}! Tudo bem? Já está chegando o momento do seu retorno na ${state.establishment.name}. Quer que eu veja os horários disponíveis para você?`
  window.open(`https://wa.me/55${phone.replace(/^55/,'')}?text=${encodeURIComponent(msg)}`,'_blank')
}
function seedAgenda(){
  if(cloudEnabled())return
  if(state.appointments.some(a=>a.date===todayISO()))return alert('Já existem horários hoje.')
  const services=state.services.filter(s=>s.active).slice(0,3);if(!services.length)return
  const names=['Mariana Costa','Camila Souza','Juliana Lima']
  ;['10:00','13:30','16:00'].forEach((time,i)=>{const s=services[i%services.length];const c={id:uid(),name:names[i],phone:`1199999000${i}`,createdAt:new Date().toISOString()};state.clients.push(c);state.appointments.push({id:uid(),clientId:c.id,clientName:c.name,phone:c.phone,professionalId:state.professionals[0]?.id||null,serviceId:s.id,date:todayISO(),time,price:s.price,status:'AGENDADO'})})
  persistLocal();render()
}
async function enableNotifications(){
  if(!('Notification'in window))return alert('Este navegador não suporta notificações.')
  const result=await Notification.requestPermission();state.notificationsEnabled=result==='granted';persistLocal()
  if(result==='granted'){new Notification(`${state.establishment.name}: notificações ativadas`,{body:'Lembretes da agenda e alertas operacionais poderão aparecer neste dispositivo.',icon:'/icon.svg'})}
  render()
}

if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(()=>{}))}
boot()
