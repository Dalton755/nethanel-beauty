import {
  cloudEnabled,
  publicSearchEstablishments,
  publicStorefront,
  publicAvailableSlots,
  publicBookAppointment,
  getSession,
  ensureSession,
  signIn,
  signUp,
  clearSession,
  customerUpsertProfile,
  customerDashboard,
  customerMarkNotificationsRead,
  customerRegisterPush,
  publicPromotions,
  getZaiaPushPublicKey,
  sendZaiaPushTest,
} from './cloud.js'

const $=(s,e=document)=>e.querySelector(s)
const $$=(s,e=document)=>[...e.querySelectorAll(s)]
const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
const fmtMoney=n=>Number(n||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})
const fmtDuration=m=>{m=Number(m||0);const h=Math.floor(m/60),r=m%60;return h?(r?`${h}h ${r}min`:`${h}h`):`${r} min`}
const todayISO=()=>new Date().toISOString().slice(0,10)
const addDays=(iso,n)=>{const d=new Date(iso+'T12:00:00');d.setDate(d.getDate()+n);return d.toISOString().slice(0,10)}
const dateLabel=iso=>new Date(iso+'T12:00:00').toLocaleDateString('pt-BR',{weekday:'short',day:'2-digit',month:'2-digit'})
const formatDate=iso=>new Date(iso+'T12:00:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric'})
const formatTime=(iso,timeZone='America/Sao_Paulo')=>new Date(iso).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit',timeZone})
const normalizePhone=v=>String(v||'').replace(/\D/g,'').replace(/^55(?=\d{10,11}$)/,'')
const maskPhone=value=>{const d=normalizePhone(value).slice(0,11);if(!d)return'';if(d.length<=2)return`(${d}`;const a=d.slice(0,2),r=d.slice(2);if(r.length<=4)return`(${a}) ${r}`;if(r.length<=8)return`(${a}) ${r.slice(0,4)}-${r.slice(4)}`;return`(${a}) ${r.slice(0,5)}-${r.slice(5)}`}
const profileKey='zaia_customer_profile_v1'
const getProfile=()=>{try{return JSON.parse(localStorage.getItem(profileKey))||{}}catch{return{}}}
const saveProfile=p=>localStorage.setItem(profileKey,JSON.stringify(p))

const SEGMENTS=[
  ['CABELO','Cabeleireiro'],['BARBEARIA','Barbearia'],['SOBRANCELHAS','Sobrancelhas'],
  ['CILIOS','Cílios'],['UNHAS','Manicure & unhas'],['ESTETICA','Estética'],
  ['DEPILACAO','Depilação'],['MAQUIAGEM','Maquiagem']
]
const SERVICES=['Corte masculino','Corte feminino','Escova','Design de sobrancelhas','Manicure','Barba','Hidratação','Progressiva']

let map=null
let markers=[]
let state={
  screen:'search',query:'',segment:'',service:'',coords:null,radiusKm:25,
  results:[],loading:false,error:'',store:null,serviceObj:null,professional:null,
  date:todayISO(),slots:[],slot:null,booking:null,
  session:null,customerData:null,promotions:[],tab:'buscar',authMode:null,authMessage:''
}

function icon(name){
  const paths={
    search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    pin:'<path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2"/>',
    arrow:'<path d="M19 12H5M11 18l-6-6 6-6"/>',
    clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    user:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
    check:'<path d="m5 12 4 4L19 6"/>',
    shop:'<path d="M4 10v10h16V10M3 10l2-6h14l2 6M8 20v-6h8v6"/>',
    filter:'<path d="M4 6h16M7 12h10M10 18h4"/>',
    history:'<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/>',
    gift:'<path d="M20 12v9H4v-9M2 7h20v5H2zM12 21V7M12 7H7.5a2.5 2.5 0 1 1 2.5-2.5c0 2.5 2 2.5 2 2.5Zm0 0h4.5A2.5 2.5 0 1 0 14 4.5C14 7 12 7 12 7Z"/>',
    bell:'<path d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/>',
  }
  return `<svg class="client-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]||paths.search}</svg>`
}

function logo(){return '<img src="/zaia-logo.svg" class="client-logo" alt="ZAIA">'}
function mark(){return '<img src="/icon.svg" class="client-mark" alt="">'}
function setLoading(v,msg='Carregando...'){state.loading=v;state.loadingText=msg;render()}
function clientHeader(){
  const name=state.customerData?.profile?.full_name||state.session?.user?.email?.split('@')[0]||''
  return `<header class="client-top"><a href="/cliente" class="client-brand">${logo()}</a><div class="client-head-actions">${state.session?`<button class="client-account-chip" data-client-tab="perfil"><span>${esc((name[0]||'Z').toUpperCase())}</span><b>${esc(name||'Minha conta')}</b></button>`:'<button class="client-login-link" id="clientLogin">Entrar</button>'}<a href="/" class="client-business-link">Sou estabelecimento</a></div></header>`
}
function clientNav(){
  const items=[['buscar','search','Buscar'],['agenda','calendar','Agenda'],['historico','history','Histórico'],['promocoes','gift','Promoções'],['perfil','user','Perfil']]
  return `<nav class="client-bottom-nav">${items.map(([t,i,l])=>`<button data-client-tab="${t}" class="${state.tab===t?'active':''}">${icon(i)}<span>${l}</span></button>`).join('')}</nav>`
}
async function refreshCustomer(){
  state.session=await ensureSession()
  if(!state.session){state.customerData=null;return}
  try{state.customerData=await customerDashboard()}catch{state.customerData=null}
}
async function refreshPromotions(){
  try{state.promotions=await publicPromotions({lat:state.coords?.lat??null,long:state.coords?.long??null,radiusKm:50})||[]}catch{state.promotions=[]}
}
function requireAccount(next='agenda'){
  if(state.session){state.tab=next;state.screen='account';render();return true}
  state.authMode='login';state.authMessage='Entre ou crie sua conta ZAIA para continuar.';render();return false
}
function authModal(){
  if(!state.authMode)return ''
  const signup=state.authMode==='signup'
  const profile=state.authMode==='profile'
  const p=state.customerData?.profile||{}
  if(profile)return `<div class="client-auth-backdrop"><div class="client-auth-modal"><button class="client-auth-close" data-auth-close>×</button><span class="client-kicker">SEU PERFIL ZAIA</span><h2>Complete seus dados</h2><p>Usaremos essas informações nos seus agendamentos.</p><form id="clientProfileForm" class="client-auth-form"><div class="field"><label>Nome completo</label><input name="name" required value="${esc(p.full_name||'')}"></div><div class="field"><label>WhatsApp</label><input id="authPhone" name="phone" required inputmode="tel" value="${esc(maskPhone(p.phone||''))}"></div><div class="field"><label>Data de nascimento <small>(opcional)</small></label><input name="birthDate" type="date" value="${esc(p.birth_date||'')}"></div><label class="client-check"><input type="checkbox" name="marketing" ${p.marketing_opt_in!==false?'checked':''}><span>Quero receber promoções relevantes na ZAIA</span></label><button class="client-primary wide" type="submit">Salvar perfil</button></form></div></div>`
  return `<div class="client-auth-backdrop"><div class="client-auth-modal"><button class="client-auth-close" data-auth-close>×</button><div class="client-auth-logo">${mark()}</div><span class="client-kicker">${signup?'CRIAR CONTA':'MINHA ZAIA'}</span><h2>${signup?'Crie sua conta ZAIA':'Entre na sua conta'}</h2><p>${signup?'Seus agendamentos, histórico e lembretes em um só lugar.':'Continue de onde parou em qualquer estabelecimento.'}</p>${state.authMessage?`<div class="client-alert">${esc(state.authMessage)}</div>`:''}<form id="clientAuthForm" class="client-auth-form">${signup?`<div class="field"><label>Nome completo</label><input name="name" required minlength="2"></div><div class="field"><label>WhatsApp</label><input id="authPhone" name="phone" required inputmode="tel" placeholder="(11) 99999-9999"></div>`:''}<div class="field"><label>E-mail</label><input name="email" type="email" required autocomplete="email"></div><div class="field"><label>Senha</label><div class="client-password-field"><input id="clientAuthPassword" name="password" type="password" required minlength="6" autocomplete="${signup?'new-password':'current-password'}"><button type="button" class="client-password-toggle" data-password-toggle aria-label="Mostrar senha">Mostrar</button></div></div><button class="client-primary wide" type="submit">${signup?'Criar conta':'Entrar'}</button></form><button class="client-auth-switch" id="authSwitch">${signup?'Já tenho conta':'Ainda não tenho conta'}</button></div></div>`
}


async function search(){
  state.loading=true;state.error='';render()
  try{
    state.results=await publicSearchEstablishments({
      query:state.query,segment:state.segment||null,service:state.service||null,
      lat:state.coords?.lat??null,long:state.coords?.long??null,radiusKm:state.radiusKm
    })
  }catch(error){state.error=String(error.message||error);state.results=[]}
  state.loading=false;render()
}

async function useLocation(){
  if(!navigator.geolocation){state.error='Este navegador não oferece localização.';render();return}
  state.loading=true;state.loadingText='Obtendo sua localização...';render()
  navigator.geolocation.getCurrentPosition(async pos=>{
    state.coords={lat:pos.coords.latitude,long:pos.coords.longitude}
    await Promise.all([search(),refreshPromotions()])
  },err=>{
    state.loading=false
    state.error=err.code===1?'Permita o acesso à localização para buscar estabelecimentos próximos.':'Não foi possível obter sua localização.'
    render()
  },{enableHighAccuracy:true,timeout:12000,maximumAge:60000})
}

async function openStore(id){
  state.loading=true;state.loadingText='Abrindo estabelecimento...';render()
  try{
    state.store=await publicStorefront(id)
    state.screen='store';state.serviceObj=null;state.professional=null;state.slots=[];state.slot=null
    history.pushState({clientStore:id},'',`/cliente?loja=${encodeURIComponent(id)}`)
  }catch(error){state.error=String(error.message||error)}
  state.loading=false;render()
}

async function selectService(id){
  state.serviceObj=state.store.services.find(x=>x.id===id)||null
  state.professional=null;state.slots=[];state.slot=null
  if(state.serviceObj?.professionals?.length===1){
    state.professional=state.serviceObj.professionals[0]
    await loadSlots()
  }else render()
}

async function selectProfessional(id){
  state.professional=state.serviceObj?.professionals?.find(x=>x.id===id)||null
  state.slot=null
  await loadSlots()
}

async function loadSlots(){
  if(!state.professional||!state.serviceObj)return render()
  state.loading=true;state.loadingText='Buscando horários livres...';render()
  try{
    state.slots=await publicAvailableSlots(state.professional.id,state.serviceObj.id,state.date,15)
  }catch(error){state.error=String(error.message||error);state.slots=[]}
  state.loading=false;render()
}

function selectDate(date){state.date=date;state.slot=null;loadSlots()}
function selectSlot(startsAt){state.slot=state.slots.find(x=>x.startsAt===startsAt)||null;render()}

async function submitBooking(form){
  if(!state.session){state.authMode='login';state.authMessage='Entre para confirmar o agendamento e receber lembretes.';render();return}
  if(!state.slot||!state.store||!state.serviceObj||!state.professional)return
  const fd=Object.fromEntries(new FormData(form))
  const phone=normalizePhone(fd.phone)
  if(phone.length<10||phone.length>11){alert('Informe um WhatsApp válido.');return}
  const button=form.querySelector('button[type="submit"]');button.disabled=true;button.textContent='Confirmando...'
  try{
    const result=await publicBookAppointment({
      establishmentId:state.store.id,serviceId:state.serviceObj.id,professionalId:state.professional.id,
      startsAt:state.slot.startsAt,customerName:String(fd.name||'').trim(),customerPhone:phone,
      customerEmail:String(fd.email||'').trim(),customerNote:String(fd.note||'').trim()
    })
    saveProfile({name:String(fd.name||'').trim(),phone,email:String(fd.email||'').trim()})
    await refreshCustomer()
    state.booking=result;state.screen='success'
    history.replaceState({clientSuccess:true},'',`/cliente?agendamento=${encodeURIComponent(result.token||'ok')}`)
    render()
  }catch(error){
    button.disabled=false;button.textContent='Confirmar agendamento'
    const msg=String(error.message||error)
    if(/já possui atendimento|indisponível|horário/i.test(msg)){
      alert('Esse horário acabou de ser ocupado. A agenda será atualizada agora.')
      await loadSlots()
    }else alert(msg)
  }
}

function searchPage(){
  const hasResults=state.results.length>0
  return `<div class="client-app">
    ${clientHeader()}
    <main class="client-main">
      <section class="client-hero">
        <span class="client-kicker">ZAIA PARA CLIENTES</span>
        <h1>Encontre seu próximo atendimento.</h1>
        <p>Pesquise uma loja, escolha um serviço ou descubra profissionais próximos a você.</p>
        <form id="clientSearchForm" class="client-searchbar">
          ${icon('search')}<input id="clientSearch" name="query" value="${esc(state.query)}" placeholder="Loja, serviço, corte, manicure...">
          <button type="submit">Buscar</button>
        </form>
        <div class="client-near-row"><button class="client-near ${state.coords?'active':''}" id="clientNear">${icon('pin')} ${state.coords?'Próximos a mim ativado':'Buscar próximos a mim'}</button>${state.coords?'<button class="client-clear-near" id="clientClearNear">Remover proximidade</button>':''}</div>
      </section>

      <section class="client-filters">
        <div class="client-filter-head"><strong>Tipo de estabelecimento</strong><span>${icon('filter')} Filtros</span></div>
        <div class="client-chips">${SEGMENTS.map(([code,label])=>`<button data-segment="${code}" class="${state.segment===code?'on':''}">${label}</button>`).join('')}</div>
        <div class="client-filter-head service-filter-head"><strong>Serviços populares</strong></div>
        <div class="client-chips service-chips">${SERVICES.map(name=>`<button data-service="${esc(name)}" class="${state.service===name?'on':''}">${esc(name)}</button>`).join('')}</div>
      </section>

      ${state.error?`<div class="client-alert">${esc(state.error)}</div>`:''}
      ${state.loading?`<div class="client-loading"><span></span>${esc(state.loadingText||'Buscando...')}</div>`:''}

      <section class="client-results-wrap">
        <div class="client-results">
          <div class="client-section-title"><div><span class="client-kicker">RESULTADOS</span><h2>${state.coords?'Perto de você':'Estabelecimentos'}</h2></div><b>${state.results.length}</b></div>
          ${hasResults?state.results.map(storeCard).join(''):`<div class="client-empty">${mark()}<strong>Nenhum estabelecimento encontrado.</strong><p>Tente outro serviço ou use sua localização para procurar nas proximidades.</p><button id="emptyNear" class="client-primary">${icon('pin')} Buscar próximos a mim</button></div>`}
        </div>
        <div class="client-map-panel">
          <div class="client-map-title"><strong>Mapa</strong><span>Mostrando somente o que você filtrou</span></div>
          <div id="clientMap" class="client-map"></div>
        </div>
      </section>
    </main>${clientNav()}
  </div>`
}

function storeCard(x){
  const seg=(x.segments||[]).map(s=>s.name).slice(0,2).join(' • ')
  const services=(x.service_names||[]).slice(0,4)
  return `<button class="client-store-card" data-store="${x.id}">
    <div class="client-store-mark">${mark()}</div>
    <div class="client-store-main"><div class="client-store-name"><strong>${esc(x.name)}</strong>${x.distance_km!=null?`<span>${String(x.distance_km).replace('.',',')} km</span>`:''}</div>
    <p>${esc(seg||'Serviços de beleza')}</p><div class="client-address">${icon('pin')}${esc(x.address||x.address_city||'')}</div>
    <div class="client-service-tags">${services.map(s=>`<span>${esc(s)}</span>`).join('')}</div>
    <div class="client-store-footer"><span>A partir de <strong>${fmtMoney(x.min_price)}</strong></span><b>Ver horários →</b></div></div>
  </button>`
}

function storePage(){
  const st=state.store
  if(!st)return searchPage()
  const dates=Array.from({length:10},(_,i)=>addDays(todayISO(),i))
  const profs=state.serviceObj?.professionals||[]
  const profile=state.customerData?.profile||getProfile()
  return `<div class="client-app">
    <header class="client-top store-top"><button class="client-back" id="clientBack">${icon('arrow')} Voltar</button><a href="/cliente" class="client-brand">${logo()}</a><span></span></header>
    <main class="client-store-page">
      <section class="client-store-hero"><div class="client-store-logo">${mark()}</div><div><span class="client-kicker">${esc((st.segments||[]).map(x=>x.name).join(' • '))}</span><h1>${esc(st.name)}</h1><p>${esc(st.description||'Escolha um serviço e encontre um horário disponível.')}</p><div class="client-address big">${icon('pin')}${esc(st.address||'')}</div></div></section>

      <div class="client-booking-grid">
        <section>
          <div class="client-section-title"><div><span class="client-kicker">1. SERVIÇO</span><h2>O que você quer fazer?</h2></div></div>
          <div class="client-services-grid">${(st.services||[]).map(x=>`<button data-client-service="${x.id}" class="client-service-card ${state.serviceObj?.id===x.id?'selected':''}"><div><strong>${esc(x.name)}</strong><span>${fmtDuration(x.duration_minutes)}</span></div><b>${fmtMoney(x.price)}</b></button>`).join('')}</div>

          ${state.serviceObj?`<div class="client-book-step"><div class="client-section-title"><div><span class="client-kicker">2. PROFISSIONAL</span><h2>Com quem?</h2></div></div>${profs.length?`<div class="client-pros">${profs.map(p=>`<button data-client-pro="${p.id}" class="${state.professional?.id===p.id?'selected':''}"><span class="client-pro-avatar">${esc((p.name||'P')[0])}</span><span><strong>${esc(p.name)}</strong><small>${esc(p.job_title||'Profissional')} • ${fmtDuration(p.duration_minutes)}</small></span><b>${fmtMoney(p.price)}</b></button>`).join('')}</div>`:'<div class="client-alert">Nenhum profissional disponível para este serviço.</div>'}</div>`:''}

          ${state.professional?`<div class="client-book-step"><div class="client-section-title"><div><span class="client-kicker">3. DATA E HORÁRIO</span><h2>Quando?</h2></div></div><div class="client-date-strip">${dates.map(d=>`<button data-client-date="${d}" class="${state.date===d?'selected':''}"><span>${new Date(d+'T12:00:00').toLocaleDateString('pt-BR',{weekday:'short'}).replace('.','')}</span><strong>${new Date(d+'T12:00:00').getDate()}</strong></button>`).join('')}</div>${state.loading?'<div class="client-loading"><span></span>Buscando horários...</div>':state.slots.length?`<div class="client-slots">${state.slots.map(x=>`<button data-client-slot="${x.startsAt}" class="${state.slot?.startsAt===x.startsAt?'selected':''}"><strong>${formatTime(x.startsAt,st.timezone)}</strong><small>até ${formatTime(x.endsAt,st.timezone)}</small></button>`).join('')}</div>`:'<div class="client-empty compact"><strong>Sem horários livres nesta data.</strong><p>Escolha outro dia ou profissional.</p></div>'}</div>`:''}
        </section>

        <aside class="client-summary">
          <span class="client-kicker">SEU AGENDAMENTO</span>
          <h2>${state.serviceObj?esc(state.serviceObj.name):'Escolha um serviço'}</h2>
          ${state.serviceObj?`<div class="summary-row"><span>Serviço</span><strong>${fmtMoney(state.professional?.price??state.serviceObj.price)}</strong></div><div class="summary-row"><span>Duração</span><strong>${fmtDuration(state.professional?.duration_minutes??state.serviceObj.duration_minutes)}</strong></div>`:''}
          ${state.professional?`<div class="summary-row"><span>Profissional</span><strong>${esc(state.professional.name)}</strong></div>`:''}
          ${state.slot?`<div class="summary-row"><span>Data</span><strong>${formatDate(state.date)}</strong></div><div class="summary-row"><span>Horário</span><strong>${formatTime(state.slot.startsAt,st.timezone)}–${formatTime(state.slot.endsAt,st.timezone)}</strong></div>${state.session?`<form id="publicBookingForm" class="client-book-form"><div class="field"><label>Seu nome</label><input name="name" required minlength="2" value="${esc(profile.full_name||profile.name||'')}"></div><div class="field"><label>WhatsApp</label><input name="phone" id="clientPhone" required inputmode="tel" value="${esc(maskPhone(profile.phone||''))}" placeholder="(11) 99999-9999"></div><input name="email" type="hidden" value="${esc(state.session?.user?.email||'')}"><div class="field"><label>Observação <small>opcional</small></label><textarea name="note" rows="2" placeholder="Algo que a equipe precisa saber?"></textarea></div><button type="submit" class="client-primary wide">Confirmar agendamento</button><p class="client-privacy">O agendamento ficará salvo na sua conta ZAIA e você receberá lembretes.</p></form>`:`<div class="client-account-required">${icon('user')}<strong>Entre para agendar</strong><p>Assim você acompanha seus horários, histórico e recebe lembretes pelo app.</p><button class="client-primary wide" id="bookingLogin">Entrar ou criar conta</button></div>`}`:'<div class="client-summary-empty">Escolha profissional, data e horário para continuar.</div>'}
        </aside>
      </div>
    </main>
  </div>`
}

function appointmentAccountCard(a){
  return `<div class="client-account-card"><div class="client-account-card-top"><div><strong>${esc(a.service_name)}</strong><span>${esc(a.establishment_name)}</span></div><span class="client-status">${esc(a.status)}</span></div><div class="client-account-meta">${icon('calendar')}<span>${new Date(a.starts_at).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric'})} • ${formatTime(a.starts_at)}</span></div><div class="client-account-meta">${icon('user')}<span>${esc(a.professional_name)}</span></div>${a.address?`<div class="client-account-meta">${icon('pin')}<span>${esc(a.address)}</span></div>`:''}<div class="client-account-price">${fmtMoney(a.price)}</div></div>`
}
function promotionCard(p){
  return `<button class="client-promotion-card" data-promo-store="${p.establishment_id}" data-promo-service="${p.service_id||''}"><div class="promotion-badge">${icon('gift')}</div><div><span class="client-kicker">${esc(p.establishment_name)}</span><strong>${esc(p.title)}</strong><b>${esc(p.offer_text)}</b><p>${esc(p.description||p.service_name||'Oferta por tempo limitado')}</p>${p.distance_km!=null?`<small>${String(p.distance_km).replace('.',',')} km de você</small>`:''}</div></button>`
}
function accountPage(){
  if(!state.session){state.authMode='login';return searchPage()}
  const d=state.customerData||{upcoming:[],history:[],notifications:[],profile:null}
  let body=''
  if(state.tab==='agenda'){
    const unread=(d.notifications||[]).filter(n=>!n.read_at)
    body=`<div class="client-account-head"><span class="client-kicker">MINHA ZAIA</span><h1>Próximos agendamentos</h1><p>Seus horários em todos os estabelecimentos.</p></div>${unread.length?`<div class="client-notice-stack">${unread.slice(0,3).map(n=>`<div class="client-notification">${icon('bell')}<div><strong>${esc(n.title)}</strong><span>${esc(n.body)}</span></div></div>`).join('')}</div>`:''}${d.upcoming?.length?`<div class="client-account-list">${d.upcoming.map(appointmentAccountCard).join('')}</div>`:'<div class="client-empty"><strong>Nenhum agendamento futuro.</strong><p>Encontre um serviço e reserve seu próximo horário.</p><button class="client-primary" data-client-tab="buscar">Buscar serviço</button></div>'}`
  }else if(state.tab==='historico'){
    body=`<div class="client-account-head"><span class="client-kicker">HISTÓRICO</span><h1>Seus atendimentos</h1><p>Serviços realizados e agendamentos anteriores.</p></div>${d.history?.length?`<div class="client-account-list">${d.history.map(appointmentAccountCard).join('')}</div>`:'<div class="client-empty"><strong>Seu histórico ainda está vazio.</strong></div>'}`
  }else if(state.tab==='promocoes'){
    body=`<div class="client-account-head"><span class="client-kicker">OFERTAS</span><h1>Promoções para você</h1><p>Ofertas ativas dos estabelecimentos ZAIA.</p></div>${state.promotions.length?`<div class="client-promotions-grid">${state.promotions.map(promotionCard).join('')}</div>`:'<div class="client-empty"><strong>Nenhuma promoção ativa agora.</strong><p>Novas ofertas aparecerão aqui.</p></div>'}`
  }else{
    const p=d.profile||{}
    body=`<div class="client-account-head"><span class="client-kicker">PERFIL</span><h1>${esc(p.full_name||'Minha conta')}</h1><p>${esc(state.session?.user?.email||'')}</p></div><div class="client-profile-card"><div class="client-profile-avatar">${esc((p.full_name||'Z')[0].toUpperCase())}</div><div><strong>${esc(p.full_name||'Complete seu perfil')}</strong><span>${esc(maskPhone(p.phone||''))}</span></div><button class="client-secondary" id="editClientProfile">Editar</button></div><div class="client-profile-actions"><button class="client-profile-action" id="enableClientPush">${icon('bell')}<span><strong>${p.push_enabled?'Notificações ativadas':'Ativar notificações'}</strong><small>Confirmações e lembretes de 24h e 1h</small></span></button><button class="client-profile-action" id="clientLogout">${icon('arrow')}<span><strong>Sair da conta</strong><small>Encerrar sessão neste aparelho</small></span></button></div>`
  }
  return `<div class="client-app">${clientHeader()}<main class="client-account-main">${body}</main>${clientNav()}</div>`
}

function successPage(){
  const b=state.booking,st=state.store
  return `<div class="client-app success-bg"><main class="client-success"><div class="success-icon">${icon('check')}</div><span class="client-kicker">AGENDAMENTO CONFIRMADO</span><h1>Seu horário está reservado.</h1><p>A agenda da loja foi atualizada em tempo real.</p><div class="success-card"><div>${mark()}<span><strong>${esc(b.establishment_name)}</strong><small>${esc(b.service_name)}</small></span></div><div class="summary-row"><span>Profissional</span><strong>${esc(b.professional_name)}</strong></div><div class="summary-row"><span>Data</span><strong>${new Date(b.starts_at).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric',timeZone:st.timezone})}</strong></div><div class="summary-row"><span>Horário</span><strong>${formatTime(b.starts_at,st.timezone)}–${formatTime(b.ends_at,st.timezone)}</strong></div><div class="summary-row"><span>Valor</span><strong>${fmtMoney(b.price)}</strong></div></div><a href="/cliente" class="client-primary">Buscar outro serviço</a><a href="/" class="client-secondary-link">Acesso para estabelecimentos</a></main></div>`
}

function render(){
  const app=$('#app');if(!app)return
  app.innerHTML=(state.screen==='success'?successPage():state.screen==='store'?storePage():state.screen==='account'?accountPage():searchPage())+authModal()
  bind()
  if(state.screen==='search'&&!state.loading)setTimeout(renderMap,0)
}

function bind(){
  $('#clientLogin')?.addEventListener('click',()=>{state.authMode='login';state.authMessage='';render()})
  $('#bookingLogin')?.addEventListener('click',()=>{state.authMode='login';state.authMessage='';render()})
  $('[data-auth-close]').forEach(b=>b.onclick=()=>{state.authMode=null;state.authMessage='';render()})
  $('#authSwitch')?.addEventListener('click',()=>{state.authMode=state.authMode==='signup'?'login':'signup';state.authMessage='';render()})
  $('#authPhone')?.addEventListener('input',e=>e.target.value=maskPhone(e.target.value))
  $('[data-password-toggle]').forEach(b=>b.onclick=()=>{
    const input=$('#clientAuthPassword')
    if(!input)return
    const showing=input.type==='text'
    input.type=showing?'password':'text'
    b.textContent=showing?'Mostrar':'Ocultar'
    b.setAttribute('aria-label',showing?'Mostrar senha':'Ocultar senha')
    input.focus()
  })
  $('#clientAuthForm')?.addEventListener('submit',async e=>{
    e.preventDefault()
    const form=e.currentTarget,fd=Object.fromEntries(new FormData(form)),button=form.querySelector('button[type="submit"]')
    button.disabled=true;button.textContent='Aguarde...'
    try{
      if(state.authMode==='signup'){
        const result=await signUp(String(fd.email).trim(),String(fd.password),location.origin+'/cliente')
        localStorage.setItem('zaia_pending_customer_profile',JSON.stringify({fullName:String(fd.name).trim(),phone:normalizePhone(fd.phone)}))
        if(!result?.access_token){state.authMessage='Conta criada. Confirme seu e-mail e depois entre na ZAIA.';state.authMode='login';render();return}
      }else await signIn(String(fd.email).trim(),String(fd.password))
      state.session=await ensureSession()
      let pending={};try{pending=JSON.parse(localStorage.getItem('zaia_pending_customer_profile')||'{}')}catch{}
      await refreshCustomer()
      if(!state.customerData?.profile&&pending.fullName){
        await customerUpsertProfile({fullName:pending.fullName,phone:pending.phone,marketingOptIn:true})
        localStorage.removeItem('zaia_pending_customer_profile');await refreshCustomer()
      }
      state.authMode=state.customerData?.profile?'': 'profile'
      state.authMessage=''
      if(!state.authMode&&state.screen!=='store'){state.tab='agenda';state.screen='account'}
      render()
    }catch(error){state.authMessage=String(error.message||error);render()}
  })
  $('#clientProfileForm')?.addEventListener('submit',async e=>{
    e.preventDefault();const fd=Object.fromEntries(new FormData(e.currentTarget));const phone=normalizePhone(fd.phone)
    try{await customerUpsertProfile({fullName:String(fd.name).trim(),phone,birthDate:fd.birthDate||null,marketingOptIn:e.currentTarget.elements.marketing?.checked!==false});await refreshCustomer();state.authMode=null;render()}catch(error){alert(String(error.message||error))}
  })
  $('[data-client-tab]').forEach(b=>b.onclick=async()=>{
    const tab=b.dataset.clientTab
    if(tab==='buscar'){state.tab='buscar';state.screen='search';history.pushState({},'', '/cliente');render();return}
    if(!state.session){state.authMode='login';state.authMessage='Entre para acessar sua área ZAIA.';render();return}
    state.tab=tab;state.screen='account'
    if(tab==='agenda'){await customerMarkNotificationsRead().catch(()=>{});await refreshCustomer()}
    if(tab==='promocoes')await refreshPromotions()
    render()
  })
  $('[data-promo-store]').forEach(b=>b.onclick=async()=>{const serviceId=b.dataset.promoService;await openStore(b.dataset.promoStore);if(serviceId)await selectService(serviceId)})
  $('#editClientProfile')?.addEventListener('click',()=>{state.authMode='profile';render()})
  $('#clientLogout')?.addEventListener('click',()=>{clearSession();state.session=null;state.customerData=null;state.tab='buscar';state.screen='search';render()})
  $('#enableClientPush')?.addEventListener('click',enableCustomerPush)
  $('#clientSearchForm')?.addEventListener('submit',e=>{e.preventDefault();state.query=$('#clientSearch').value.trim();search()})
  $('#clientNear')?.addEventListener('click',useLocation)
  $('#emptyNear')?.addEventListener('click',useLocation)
  $('#clientClearNear')?.addEventListener('click',()=>{state.coords=null;search()})
  $$('[data-segment]').forEach(b=>b.onclick=()=>{state.segment=state.segment===b.dataset.segment?'':b.dataset.segment;search()})
  $$('[data-service]').forEach(b=>b.onclick=()=>{state.service=state.service===b.dataset.service?'':b.dataset.service;search()})
  $$('[data-store]').forEach(b=>b.onclick=()=>openStore(b.dataset.store))
  $('#clientBack')?.addEventListener('click',()=>{state.screen='search';state.store=null;state.serviceObj=null;state.professional=null;state.slots=[];state.slot=null;history.pushState({},'', '/cliente');render()})
  $$('[data-client-service]').forEach(b=>b.onclick=()=>selectService(b.dataset.clientService))
  $$('[data-client-pro]').forEach(b=>b.onclick=()=>selectProfessional(b.dataset.clientPro))
  $$('[data-client-date]').forEach(b=>b.onclick=()=>selectDate(b.dataset.clientDate))
  $$('[data-client-slot]').forEach(b=>b.onclick=()=>selectSlot(b.dataset.clientSlot))
  const phone=$('#clientPhone');phone?.addEventListener('input',()=>{phone.value=maskPhone(phone.value)})
  $('#publicBookingForm')?.addEventListener('submit',e=>{e.preventDefault();submitBooking(e.currentTarget)})
}

function urlBase64ToUint8Array(base64String){
  const padding='='.repeat((4-base64String.length%4)%4)
  const base64=(base64String+padding).replace(/-/g,'+').replace(/_/g,'/')
  const raw=atob(base64);return Uint8Array.from([...raw].map(c=>c.charCodeAt(0)))
}
async function enableCustomerPush(){
  if(!state.session)return requireAccount('perfil')
  if(!('serviceWorker' in navigator)||!('PushManager' in window))return alert('Este navegador não oferece notificações Push.')
  try{
    const permission=await Notification.requestPermission()
    if(permission!=='granted')return alert('Permissão de notificações não concedida.')
    const reg=await navigator.serviceWorker.ready
    let sub=await reg.pushManager.getSubscription()
    if(!sub){
      const key=await getZaiaPushPublicKey()
      sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:urlBase64ToUint8Array(key)})
    }
    const json=sub.toJSON()
    await customerRegisterPush({endpoint:json.endpoint,keys:json.keys})
    await sendZaiaPushTest()
    await refreshCustomer();render()
  }catch(error){alert(String(error.message||error))}
}

async function loadLeaflet(){
  if(window.L)return window.L
  if(!document.querySelector('link[data-leaflet]')){
    const link=document.createElement('link');link.rel='stylesheet';link.href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';link.dataset.leaflet='1';document.head.appendChild(link)
  }
  await new Promise((resolve,reject)=>{
    const existing=document.querySelector('script[data-leaflet]')
    if(existing){existing.addEventListener('load',resolve,{once:true});existing.addEventListener('error',reject,{once:true});return}
    const script=document.createElement('script');script.src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';script.dataset.leaflet='1';script.onload=resolve;script.onerror=reject;document.head.appendChild(script)
  })
  return window.L
}

async function renderMap(){
  const el=$('#clientMap');if(!el)return
  const points=state.results.filter(x=>Number.isFinite(Number(x.latitude))&&Number.isFinite(Number(x.longitude)))
  if(!points.length){el.innerHTML='<div class="map-empty">Os estabelecimentos filtrados aparecerão aqui.</div>';return}
  try{
    const L=await loadLeaflet()
    if(!$('#clientMap'))return
    if(map){map.remove();map=null}
    map=L.map('clientMap',{zoomControl:true,scrollWheelZoom:false})
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap'}).addTo(map)
    markers=[]
    points.forEach(x=>{
      const m=L.marker([Number(x.latitude),Number(x.longitude)]).addTo(map)
      m.bindTooltip(esc(x.name),{direction:'top',offset:[0,-10]})
      m.on('click',()=>openStore(x.id))
      markers.push(m)
    })
    if(state.coords)L.circleMarker([state.coords.lat,state.coords.long],{radius:7}).addTo(map).bindPopup('Você está por aqui')
    const group=L.featureGroup(markers);map.fitBounds(group.getBounds().pad(.25),{maxZoom:14})
    setTimeout(()=>map.invalidateSize(),80)
  }catch(error){el.innerHTML='<div class="map-empty">Não foi possível carregar o mapa agora.</div>'}
}

window.addEventListener('popstate',()=>{
  if(state.screen==='store'||state.screen==='success'){state.screen='search';state.store=null;state.booking=null;render()}
})

async function boot(){
  if(!cloudEnabled()){
    state.error='A busca pública ainda não está conectada ao servidor.'
    render();return
  }
  state.session=await ensureSession()
  if(state.session)await refreshCustomer()
  await refreshPromotions()
  const params=new URLSearchParams(location.search)
  const tab=params.get('tab')
  const loja=params.get('loja')
  if(tab&&['agenda','historico','promocoes','perfil'].includes(tab)&&state.session){state.tab=tab;state.screen='account';render();return}
  if(loja){await openStore(loja);return}
  await search()
}

if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(()=>{}))}
boot()
