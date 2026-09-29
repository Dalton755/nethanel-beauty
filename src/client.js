import {
  cloudEnabled,
  publicSearchEstablishments,
  publicStorefront,
  publicAvailableSlots,
  publicBookAppointment,
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
  date:todayISO(),slots:[],slot:null,booking:null
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
  }
  return `<svg class="client-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]||paths.search}</svg>`
}

function logo(){return '<img src="/zaia-logo.svg" class="client-logo" alt="ZAIA">'}
function mark(){return '<img src="/icon.svg" class="client-mark" alt="">'}
function setLoading(v,msg='Carregando...'){state.loading=v;state.loadingText=msg;render()}

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
    await search()
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
    <header class="client-top"><a href="/cliente" class="client-brand">${logo()}</a><a href="/" class="client-business-link">Sou estabelecimento</a></header>
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
    </main>
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
  const profile=getProfile()
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
          ${state.slot?`<div class="summary-row"><span>Data</span><strong>${formatDate(state.date)}</strong></div><div class="summary-row"><span>Horário</span><strong>${formatTime(state.slot.startsAt,st.timezone)}–${formatTime(state.slot.endsAt,st.timezone)}</strong></div><form id="publicBookingForm" class="client-book-form"><div class="field"><label>Seu nome</label><input name="name" required minlength="2" value="${esc(profile.name||'')}"></div><div class="field"><label>WhatsApp</label><input name="phone" id="clientPhone" required inputmode="tel" value="${esc(maskPhone(profile.phone||''))}" placeholder="(11) 99999-9999"></div><div class="field"><label>E-mail <small>opcional</small></label><input name="email" type="email" value="${esc(profile.email||'')}"></div><div class="field"><label>Observação <small>opcional</small></label><textarea name="note" rows="2" placeholder="Algo que a equipe precisa saber?"></textarea></div><button type="submit" class="client-primary wide">Confirmar agendamento</button><p class="client-privacy">Seus dados são enviados apenas ao estabelecimento escolhido para realizar o atendimento.</p></form>`:'<div class="client-summary-empty">Escolha profissional, data e horário para continuar.</div>'}
        </aside>
      </div>
    </main>
  </div>`
}

function successPage(){
  const b=state.booking,st=state.store
  return `<div class="client-app success-bg"><main class="client-success"><div class="success-icon">${icon('check')}</div><span class="client-kicker">AGENDAMENTO CONFIRMADO</span><h1>Seu horário está reservado.</h1><p>A agenda da loja foi atualizada em tempo real.</p><div class="success-card"><div>${mark()}<span><strong>${esc(b.establishment_name)}</strong><small>${esc(b.service_name)}</small></span></div><div class="summary-row"><span>Profissional</span><strong>${esc(b.professional_name)}</strong></div><div class="summary-row"><span>Data</span><strong>${new Date(b.starts_at).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric',timeZone:st.timezone})}</strong></div><div class="summary-row"><span>Horário</span><strong>${formatTime(b.starts_at,st.timezone)}–${formatTime(b.ends_at,st.timezone)}</strong></div><div class="summary-row"><span>Valor</span><strong>${fmtMoney(b.price)}</strong></div></div><a href="/cliente" class="client-primary">Buscar outro serviço</a><a href="/" class="client-secondary-link">Acesso para estabelecimentos</a></main></div>`
}

function render(){
  const app=$('#app');if(!app)return
  app.innerHTML=state.screen==='success'?successPage():state.screen==='store'?storePage():searchPage()
  bind()
  if(state.screen==='search'&&!state.loading)setTimeout(renderMap,0)
}

function bind(){
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
  const params=new URLSearchParams(location.search)
  const loja=params.get('loja')
  if(loja){await openStore(loja);return}
  await search()
}

if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(()=>{}))}
boot()
