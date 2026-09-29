import {
  cloudEnabled,
  getSession,
  signIn,
  signUp,
  signInWithGoogle,
  consumeOAuthSessionFromUrl,
  clearSession,
  loadCloudState,
  createEstablishment,
  insertClient,
  insertService,
  updateService,
  insertProduct,
  updateProduct,
  archiveProduct,
  seedStarterCatalog,
  insertAppointment,
  saveServiceMaterials,
  suggestServiceMaterials,
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
  insertPromotion,
  updatePromotion,
  deletePromotion,
  uploadBrandLogo,
  publicBusinessBranding,
  getFinanceDashboard,
  listFinanceTransactions,
  listFinanceAccounts,
  insertFinanceTransaction,
  updateFinanceTransaction,
  markFinancePaid,
  saveFinanceSettings,
  insertFinanceAccount,
  businessPushStatus,
  businessRegisterPush,
  listBusinessNotifications,
  businessMarkNotificationsRead,
  sendBusinessPushTest,
  getZaiaPushPublicKey,
  cancelAppointment,
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
const brandCacheKey='zaia_last_business_brand_v1'
const ZAIA_COLORS={primary:'#3b172b',secondary:'#6b3149',accent:'#c89a61'}

const emptyState = () => ({
  setup:false, establishment:null, services:[], products:[], clients:[], appointments:[], professionals:[], promotions:[], financeData:null, financeTransactions:[], financeAccounts:[], notificationsEnabled:false
})

let state=emptyState()
let page='home'
let modal=null
let modalData=null
let loading=true
let authMessage=''
let currentUser=null
let businessLocationDraft=null
let loginBrand=null
let financeLoading=false
let financeRange=null
let businessPushState=null
let businessNotificationItems=[]
let businessNotificationLoading=false

function localLoad(){
  try{return JSON.parse(localStorage.getItem(storageKey))||emptyState()}catch{return emptyState()}
}
function localSave(){localStorage.setItem(storageKey,JSON.stringify(state))}
function persistLocal(){ if(!cloudEnabled()) localSave() }
function brandFromEstablishment(est){
  if(!est)return null
  return {
    id:est.id||null,
    slug:est.slug||'',
    name:est.name||'',
    brandEnabled:est.brandEnabled===true,
    brandLogoUrl:est.brandLogoUrl||'',
    brandPrimaryColor:est.brandPrimaryColor||ZAIA_COLORS.primary,
    brandSecondaryColor:est.brandSecondaryColor||ZAIA_COLORS.secondary,
    brandAccentColor:est.brandAccentColor||ZAIA_COLORS.accent,
  }
}
function loadCachedBrand(){
  try{return JSON.parse(localStorage.getItem(brandCacheKey))||null}catch{return null}
}
function cacheBusinessBrand(est){
  const brand=brandFromEstablishment(est)
  if(!brand)return
  localStorage.setItem(brandCacheKey,JSON.stringify(brand))
  loginBrand=brand
}
function validHexColor(value,fallback){
  return /^#[0-9a-f]{6}$/i.test(String(value||''))?String(value):fallback
}
function applyBrandTheme(est){
  const brand=est?.brandEnabled?brandFromEstablishment(est):null
  const root=document.documentElement
  root.style.setProperty('--brand',validHexColor(brand?.brandPrimaryColor,ZAIA_COLORS.primary))
  root.style.setProperty('--brand-2',validHexColor(brand?.brandSecondaryColor,ZAIA_COLORS.secondary))
  root.style.setProperty('--champagne',validHexColor(brand?.brandAccentColor,ZAIA_COLORS.accent))
  document.body?.classList.toggle('business-branded',Boolean(brand))
}
function businessBrandHtml(est=state.establishment,{compact=false,login=false}={}){
  const brand=brandFromEstablishment(est)
  if(!brand?.brandEnabled||!brand.brandLogoUrl)return zaiaLogo(compact)
  const logo=`<img class="merchant-logo ${compact?'compact':''}" src="${esc(brand.brandLogoUrl)}" alt="${esc(brand.name)}">`
  if(compact)return logo
  return `<div class="merchant-brand ${login?'login-merchant-brand':''}">${logo}<div><strong>${esc(brand.name)}</strong><small>ZAIA</small></div></div>`
}

function activeSegments(){return (state.establishment?.segments||[]).map(k=>SEGMENTS[k]).filter(Boolean)}
function segmentKeys(){return state.establishment?.segments||[]}
function vocab(){return activeSegments()[0]?.vocabulary||{client:'Cliente',appointment:'Atendimento'}}
function categories(){return [...new Set(activeSegments().flatMap(s=>s.productCats))]}
function serviceById(id){return state.services.find(s=>s.id===id)}
function professionalById(id){return state.professionals.find(p=>p.id===id)}
function productById(id){return state.products.find(p=>p.id===id)}
function monthRange(base=new Date()){
  const y=base.getFullYear(),m=base.getMonth()
  const start=new Date(y,m,1),end=new Date(y,m+1,0)
  const iso=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
  return {start:iso(start),end:iso(end),label:base.toLocaleDateString('pt-BR',{month:'long',year:'numeric'})}
}
function dateRange(days){
  const end=new Date(),start=new Date()
  start.setDate(end.getDate()-Math.max(0,days-1))
  const iso=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
  return {start:iso(start),end:iso(end),label:`Últimos ${days} dias`}
}
function urlBase64ToUint8Array(base64String){
  const padding='='.repeat((4-base64String.length%4)%4)
  const base64=(base64String+padding).replace(/-/g,'+').replace(/_/g,'/')
  const raw=atob(base64)
  return Uint8Array.from([...raw].map(c=>c.charCodeAt(0)))
}
async function loadBusinessNotifications(){
  if(!cloudEnabled()||!state.establishment?.id||businessNotificationLoading)return
  businessNotificationLoading=true
  try{
    const [status,items]=await Promise.all([
      businessPushStatus(state.establishment.id),
      listBusinessNotifications(state.establishment.id,40),
    ])
    businessPushState=status
    businessNotificationItems=items||[]
    state.notificationsEnabled=Number(status?.devices||0)>0
  }catch(error){
    businessPushState={error:friendlyError(error),plan:state.establishment?.planCode||'FREE',devices:0,unread:0}
    businessNotificationItems=[]
  }finally{
    businessNotificationLoading=false
  }
}
async function openBusinessNotifications(){
  await loadBusinessNotifications()
  if(businessPushState?.plan==='PRO'&&Number(businessPushState?.unread||0)>0){
    try{
      await businessMarkNotificationsRead(state.establishment.id)
      businessPushState.unread=0
    }catch{}
  }
  modalData=null
  openModal('businessNotifications')
}
function paymentMethodLabel(v){
  return ({PIX:'Pix',CASH:'Dinheiro',DEBIT:'Débito',CREDIT:'Crédito',TRANSFER:'Transferência',OTHER:'Outro'})[v]||'Outro'
}
function financeStatusLabel(v){
  return ({PENDING:'Pendente',PAID:'Pago',CANCELLED:'Cancelado'})[v]||v
}
function financeCategoryOptions(kind='EXPENSE'){
  return kind==='INCOME'
    ? ['Serviços','Venda de produtos','Sinal/entrada','Outras receitas']
    : ['Comissões','Produtos e insumos','Aluguel','Água, luz e internet','Marketing','Taxas de cartão','Impostos','Manutenção','Salários','Limpeza','Outras despesas']
}
async function loadFinance(force=false){
  if(!cloudEnabled()||!state.establishment?.id||financeLoading)return
  if(!financeRange)financeRange=monthRange()
  if(state.financeData&&!force)return
  financeLoading=true
  try{
    const [dashboard,transactions,accounts]=await Promise.all([
      getFinanceDashboard(state.establishment.id,financeRange.start,financeRange.end),
      listFinanceTransactions(state.establishment.id,160),
      listFinanceAccounts(state.establishment.id),
    ])
    state.financeData=dashboard
    state.financeTransactions=transactions
    state.financeAccounts=accounts
  }catch(error){
    console.error('Finance load failed',error)
    state.financeData={error:friendlyError(error)}
  }finally{
    financeLoading=false
    if(page==='finance')render()
  }
}
function formatDuration(minutes){
  const m=Math.max(0,Number(minutes||0))
  const h=Math.floor(m/60),r=m%60
  if(!h)return `${r} min`
  if(!r)return `${h}h`
  return `${h}h ${r}min`
}
function addMinutesToTime(time,minutes){
  const [h,m]=String(time||'00:00').split(':').map(Number)
  const total=h*60+m+Number(minutes||0)
  const hh=Math.floor((total%1440)/60).toString().padStart(2,'0')
  const mm=(total%60).toString().padStart(2,'0')
  return `${hh}:${mm}`
}
function durationParts(minutes){
  const m=Math.max(5,Number(minutes||60))
  return {hours:Math.floor(m/60),minutes:m%60}
}
function durationFromForm(form){
  return Number(form.durationHours?.value||0)*60+Number(form.durationMinutes?.value||0)
}
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
function hasPublicAddress(est=state.establishment){
  const a=est?.address||{}
  return Boolean(a.street&&a.number&&a.city&&a.state&&Number.isFinite(Number(a.latitude))&&Number.isFinite(Number(a.longitude)))
}
function publicAddressLabel(est=state.establishment){
  const a=est?.address||{}
  return [a.street,a.number,a.neighborhood,a.city,a.state].filter(Boolean).join(', ')
}
async function locateAddressByText(address){
  const q=[address.street,address.number,address.neighborhood,address.city,address.state,'Brasil'].filter(Boolean).join(', ')
  if(!q)throw new Error('Preencha o endereço antes de localizar.')
  const url='https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=br&accept-language=pt-BR&q='+encodeURIComponent(q)
  const res=await fetch(url,{headers:{Accept:'application/json'}})
  if(!res.ok)throw new Error('Não foi possível localizar este endereço.')
  const rows=await res.json()
  if(!rows?.length)throw new Error('Endereço não encontrado no mapa. Revise rua, número, cidade e estado.')
  return {latitude:Number(rows[0].lat),longitude:Number(rows[0].lon),displayName:rows[0].display_name}
}

function normalizePostalCode(value=''){
  return String(value||'').replace(/\D/g,'').slice(0,8)
}
function maskPostalCode(value=''){
  const d=normalizePostalCode(value)
  return d.length>5?`${d.slice(0,5)}-${d.slice(5)}`:d
}
async function lookupPostalCode(value){
  const cep=normalizePostalCode(value)
  if(cep.length!==8)throw new Error('Informe um CEP com 8 dígitos.')
  const res=await fetch(`https://viacep.com.br/ws/${cep}/json/`,{headers:{Accept:'application/json'}})
  if(!res.ok)throw new Error('Não foi possível consultar o CEP agora.')
  const data=await res.json()
  if(data?.erro)throw new Error('CEP não encontrado.')
  return {
    postalCode:maskPostalCode(cep),
    street:data.logradouro||'',
    neighborhood:data.bairro||'',
    city:data.localidade||'',
    state:data.uf||'',
  }
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
  if(name==='business'){
    const a=state.establishment?.address||{}
    businessLocationDraft={
      latitude:a.latitude==null?null:Number(a.latitude),
      longitude:a.longitude==null?null:Number(a.longitude),
      displayName:publicAddressLabel(state.establishment)
    }
  }
  if(!history.state?.beautyModal)history.pushState({...history.state,beautyModal:true},'',location.href)
  render()
}
function closeModal(){
  modal=null
  modalData=null
  applyBrandTheme(state.establishment?.brandEnabled?state.establishment:loginBrand)
  render()
  if(history.state?.beautyModal)history.back()
}
window.addEventListener('popstate',()=>{
  if(modal){modal=null;render()}
})
document.addEventListener('click',e=>{
  const close=e.target.closest?.('[data-close]')
  if(!close||!modal)return
  e.preventDefault()
  e.stopPropagation()
  closeModal()
})

function fmtQty(n){return Number(n||0).toLocaleString('pt-BR',{maximumFractionDigits:3})}
function materialCost(materials=[]){return materials.reduce((sum,m)=>sum+Number(m.quantity||0)*Number(productById(m.productId)?.cost||0),0)}
function eligibleProducts(segment){return state.products.filter(p=>p.active!==false&&(!p.segment||p.segment===segment))}
function averageConfidence(materials=[]){
  if(!materials.length)return 0
  return materials.reduce((sum,m)=>sum+Number(m.confidence||0),0)/materials.length
}
function localLearnedSuggestion(svc){
  const source=state.services
    .filter(s=>s.id!==svc.id&&s.segment===svc.segment&&s.materials?.length&&!s.materialsEstimated)
    .slice(-1)[0]
  if(!source)return null
  return {
    learnedServices:1,
    lastServiceName:source.name,
    source:'local_learning',
    materials:(source.materials||[]).map(m=>({...m,confidence:.65,support:1,usedInLastService:true})),
  }
}
async function openServiceMaterials(id){
  const svc=serviceById(id);if(!svc)return
  svc._learningSuggestion=null
  svc._learningLoading=false
  openModal(`serviceMaterials:${id}`)
  if(!(svc.materialsEstimated||!svc.materials?.length))return
  if(!cloudEnabled()){
    svc._learningSuggestion=localLearnedSuggestion(svc)
    render();return
  }
  svc._learningLoading=true;render()
  try{
    const learned=await suggestServiceMaterials(id)
    if(learned?.materials?.length)svc._learningSuggestion=learned
  }catch(error){
    console.warn('Material learning suggestion failed',error)
  }finally{
    svc._learningLoading=false
    if(modal===`serviceMaterials:${id}`)render()
  }
}
function materialsEditorHtml(materials=[],segment){
  const values=Object.fromEntries(materials.map(m=>[m.productId,Number(m.quantity||0)]))
  const products=eligibleProducts(segment)
  if(!products.length)return `<div class="empty compact"><b>Nenhum produto disponível</b>Cadastre os materiais no estoque antes de configurar o consumo.</div>`
  return `<div class="material-list">${products.map(p=>`<label class="material-row"><div class="material-info"><strong>${esc(p.name)}</strong><span>${fmtQty(p.stock)} ${esc(p.unit)} em estoque • ${fmtMoney(p.cost)}/${esc(p.unit)}</span></div><div class="material-qty"><input data-material-id="${p.id}" type="number" min="0" step="0.001" inputmode="decimal" value="${values[p.id]||''}" placeholder="0"><small>${esc(p.unit)}</small></div></label>`).join('')}</div>`
}
function readMaterials(form){return $$('[data-material-id]',form).map(i=>({productId:i.dataset.materialId,quantity:Number(i.value||0)})).filter(m=>m.quantity>0)}
function esc(v=''){return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
const ICONS={
  home:'<path d="M3 10.8 12 3l9 7.8v9.7a.5.5 0 0 1-.5.5H15v-6H9v6H3.5a.5.5 0 0 1-.5-.5z"/>',
  calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
  users:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  sparkle:'<path d="m12 3 1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6z"/><path d="m19 15 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
  menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
  box:'<path d="m21 8-9-5-9 5 9 5z"/><path d="m3 8 9 5 9-5M3 8v8l9 5 9-5V8M12 13v8"/>',
  briefcase:'<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18"/>',
  bell:'<path d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/>',
  settings:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21h-4v-.1A1.7 1.7 0 0 0 8.6 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1A1.7 1.7 0 0 0 2.9 13.6H3v-4h-.1A1.7 1.7 0 0 0 4.6 8.6a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V3h4v-.1A1.7 1.7 0 0 0 15.4 4a1.7 1.7 0 0 0 1 .6 1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 9c.1.4.3.7.6 1 .3.3.7.4 1.1.4H21v4h.1a1.7 1.7 0 0 0-1.7.6z"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  crown:'<path d="m3 7 4 4 5-7 5 7 4-4-2 11H5z"/><path d="M5 21h14"/>',
  search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
  arrow:'<path d="M5 12h14M13 6l6 6-6 6"/>',
  wallet:'<path d="M4 6h14a2 2 0 0 1 2 2v10H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h12"/><path d="M20 10h-5a2 2 0 0 0 0 4h5"/><circle cx="15" cy="12" r=".5"/>',
  trend:'<path d="M3 17l6-6 4 4 8-9"/><path d="M15 6h6v6"/>'
};
function icon(name,size=20,cls=''){
  return '<svg class="ui-icon '+cls+'" width="'+size+'" height="'+size+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(ICONS[name]||ICONS.sparkle)+'</svg>'
}
function zaiaLogo(compact=false){
  return compact
    ? '<img class="zaia-mark" src="/icon.svg" alt="ZAIA">'
    : '<img class="zaia-wordmark" src="/zaia-logo.svg" alt="ZAIA">'
}

function setBusy(button, busy, text='Salvando...'){
  if(!button)return
  if(busy){
    if(!button.dataset.oldText)button.dataset.oldText=button.textContent
    button.textContent=text;button.disabled=true
  }else{
    button.textContent=button.dataset.oldText||button.textContent
    delete button.dataset.oldText
    button.disabled=false
  }
}
function friendlyError(error){
  const raw=String(error?.message||error||'Erro inesperado')
  if(/Invalid login credentials/i.test(raw)) return 'E-mail ou senha inválidos.'
  if(/Email not confirmed/i.test(raw)) return 'Confirme seu e-mail antes de entrar.'
  if(/User already registered/i.test(raw)) return 'Este e-mail já possui cadastro. Entre com sua senha.'
  return raw
}

async function boot(){
  loading=true
  loginBrand=loginBrand||loadCachedBrand()
  render()
  if(!cloudEnabled()){
    state=localLoad();loading=false;render();return
  }
  try{
    try{await consumeOAuthSessionFromUrl()}catch(error){authMessage=friendlyError(error)}

    if(!getSession()){
      const slug=new URLSearchParams(location.search).get('loja')
      if(slug){
        try{
          const publicBrand=await publicBusinessBranding(slug)
          if(publicBrand?.brandEnabled){
            loginBrand=publicBrand
            localStorage.setItem(brandCacheKey,JSON.stringify(publicBrand))
          }
        }catch{}
      }
    }

    const loaded=await loadCloudState()
    if(!loaded.authenticated){
      currentUser=null;state=emptyState();loading=false;render();return
    }
    currentUser=loaded.user||getSession()?.user||null
    state={...emptyState(),...loaded}
    if(state.establishment){
      cacheBusinessBrand(state.establishment)
      try{
        businessPushState=await businessPushStatus(state.establishment.id)
        state.notificationsEnabled=Number(businessPushState?.devices||0)>0
      }catch{
        businessPushState={plan:state.establishment.planCode||'FREE',devices:0,unread:0}
        state.notificationsEnabled=false
      }
    }
  }catch(error){
    authMessage=`Não foi possível carregar os dados: ${friendlyError(error)}`
    state=emptyState()
  }
  loading=false;render()
}
function render(){
  const app=$('#app')
  if(!app)return
  const activeBrand=state.establishment?.brandEnabled?state.establishment:loginBrand
  applyBrandTheme(activeBrand)
  if(loading){app.innerHTML=loadingPage();return}
  if(cloudEnabled()&&!getSession()){app.innerHTML=authPage();bindAuth();return}
  if(!state.setup){app.innerHTML=onboarding();bindOnboarding();return}
  app.innerHTML=`<div class="shell">${nav()}${topbar()}<main class="content">${pageContent()}</main></div>${modal?modalHtml():''}`
  bindGlobal();bindPage();if(modal)bindModal()
}
function loadingPage(){
  const brand=loginBrand?.brandEnabled?businessBrandHtml(loginBrand,{login:true}):zaiaLogo()
  return `<section class="onboard zaia-auth"><div class="onboard-inner loading-inner"><div class="auth-brand">${brand}</div><div class="loading-ring"></div><h1>Preparando seu espaço</h1><p class="subtitle">Organizando sua operação com a experiência ZAIA.</p></div></section>`
}function authPage(){
  const branded=loginBrand?.brandEnabled&&loginBrand?.brandLogoUrl
  const visualBrand=branded?businessBrandHtml(loginBrand,{login:true}):zaiaLogo()
  const mobileBrand=branded?businessBrandHtml(loginBrand,{login:true}):zaiaLogo()
  const heading=branded?`Entre no ${esc(loginBrand.name)}.`:'Entre no seu espaço.'
  const kicker=branded?'ACESSO DO ESTABELECIMENTO':'BEM-VINDO À ZAIA'
  const visualTitle=branded?`${esc(loginBrand.name)}.<br>Seu espaço, sua marca.`:'Mais que beleza.<br>Mais possibilidades.'
  const visualText=branded?'A experiência da sua equipe com a identidade do seu negócio e a tecnologia ZAIA por trás.':'Agenda, equipe, clientes, estoque e inteligência em uma experiência feita para o seu negócio.'
  return `<section class="onboard zaia-auth ${branded?'merchant-auth':''}"><div class="auth-shell"><div class="auth-visual"><div class="auth-brand">${visualBrand}</div><div class="auth-copy"><span class="step">${branded?'TECNOLOGIA ZAIA':'GESTÃO PARA NEGÓCIOS DE BELEZA'}</span><h1>${visualTitle}</h1><p>${visualText}</p></div><div class="auth-powered">${branded?'ZAIA • by Nethanel':'by Nethanel'}</div></div><div class="auth-panel"><div class="mobile-auth-brand">${mobileBrand}</div><div class="step">${kicker}</div><h1>${heading}</h1><p class="subtitle">Sua operação organizada, elegante e sempre à mão.</p>${authMessage?`<div class="warning-box" style="margin-top:18px">${esc(authMessage)}</div>`:''}<div class="auth-card"><button type="button" class="google-auth-btn" id="googleLogin"><span class="google-g">G</span><span>Continuar com Google</span></button><div class="auth-divider"><span>ou</span></div><form class="form" id="authForm"><div class="field"><label>E-mail</label><input type="email" name="email" autocomplete="email" required placeholder="seu@email.com"></div><div class="field"><label>Senha</label><input type="password" name="password" autocomplete="current-password" minlength="6" required placeholder="Sua senha"></div><button class="btn primary wide" name="action" value="login">Entrar ${icon('arrow',18)}</button><button class="btn ghost wide" type="button" id="signupBtn">Criar conta</button></form><p class="helper auth-helper">${branded?'A identidade visual deste acesso pertence ao estabelecimento. ZAIA permanece integrada à operação.':'No primeiro acesso, a ZAIA monta uma base inicial de acordo com o segmento do estabelecimento.'}</p><div class="auth-client-entry"><span>Quer agendar um serviço?</span><a class="btn ghost wide" href="/cliente">Encontrar profissionais e horários</a></div></div><div class="mobile-powered">${branded?'ZAIA • by Nethanel':'by Nethanel'}</div></div></div></section>`
}function bindAuth(){
  const form=$('#authForm')
  $('#googleLogin')?.addEventListener('click',()=>{
    signInWithGoogle('https://nethanel-beauty.vercel.app/')
  })
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
  const segments=est.segments.map(s=>SEGMENTS[s]?.name).filter(Boolean).join(' • ')
  const userLabel=(currentUser?.email||'Conta ZAIA').split('@')[0]
  return `<header class="topbar"><div class="mobile-brand">${businessBrandHtml(est,{compact:true})}<div class="brandtext"><strong>${esc(est.name)}</strong><span>${esc(segments)}</span></div></div><div class="desktop-search">${icon('search',18)}<span>Buscar clientes, serviços e atendimentos...</span></div><div class="top-actions"><button class="icon-button" id="notifyTopBtn" aria-label="Notificações">${icon('bell',19)}${Number(businessPushState?.unread||0)>0?`<i class="notification-dot"></i>`:'<i></i>'}</button><div class="account-chip"><div class="avatar">${esc((userLabel[0]||'Z').toUpperCase())}</div><div><strong>${esc(userLabel)}</strong><span>${esc(est.name)}</span></div></div></div></header>`
}function nav(){
  const items=[
    ['home','home','Início'],
    ['agenda','calendar','Agenda'],
    ['clients','users','Clientes'],
    ['services','sparkle','Serviços'],
    ['professionals','briefcase','Profissionais'],
    ['inventory','box','Estoque'],
    ['finance','wallet','Financeiro'],
    ['more','menu','Mais']
  ]
  const brand=businessBrandHtml(state.establishment)
  return `<nav class="nav"><div class="nav-brand merchant-nav-brand">${brand}</div><div class="nav-items">${items.map(([p,i,l])=>`<button data-page="${p}" class="${page===p?'active':''}">${icon(i,20)}<span>${l}</span></button>`).join('')}</div><button class="zaia-pro-card" data-open="zaiaPro"><span class="pro-icon">${icon('crown',20)}</span><span><strong>Personalização</strong><small>${state.establishment.brandEnabled?'Identidade ativa':'Configure sua marca'}</small></span><b>›</b></button><div class="nav-powered">Tecnologia <strong>ZAIA</strong> <small>by Nethanel</small></div></nav>`
}
function pageContent(){return ({home:homePage,agenda:agendaPage,clients:clientsPage,catalog:catalogPage,more:morePage,inventory:inventoryPage,services:servicesPage,professionals:professionalsPage,promotions:promotionsPage,finance:financePage})[page]?.()||homePage()}

function onboarding(){
  const current=state._onboarding||{step:1,type:null,segments:[]};state._onboarding=current
  if(current.step===1)return `<section class="onboard"><div class="onboard-inner"><div class="hero-logo zaia-hero">${zaiaLogo()}</div><div class="step">PASSO 1 DE 3</div><h1>Que tipo de negócio você administra?</h1><p class="subtitle">O sistema monta uma experiência específica para o seu segmento. Você poderá personalizar tudo depois.</p><div class="segments">${Object.entries(SEGMENTS).map(([k,s])=>`<button class="segment ${current.type===k?'selected':''}" data-segment="${k}"><div class="segment-icon">${s.icon}</div><strong>${s.name}</strong><small>${s.desc}</small></button>`).join('')}<button class="segment ${current.type==='STUDIO'?'selected':''}" data-segment="STUDIO"><div class="segment-icon">🏠</div><strong>Studio multidisciplinar</strong><small>Combine cabelo, unhas, cílios, sobrancelhas e outros.</small></button></div><button class="btn primary wide" id="next1" ${!current.type?'disabled':''}>Continuar</button></div></section>`
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
function defaultDuration(n){
  const name=String(n||'').toLowerCase()
  const exact={
    'corte feminino':60,'corte masculino':45,'escova':60,'hidratação':60,'coloração':120,'mechas':180,'progressiva':180,'reconstrução':90,
    'barba':30,'corte + barba':75,'pezinho':15,'pigmentação':45,
    'design de sobrancelhas':30,'design + henna':45,'design + tintura':45,'brow lamination':60,
    'clássico fio a fio':120,'volume brasileiro':150,'híbrido':150,'volume russo':180,'mega volume':210,'manutenção':90,'remoção':45,
    'manicure':60,'pedicure':60,'esmaltação em gel':90,'banho de gel':90,'fibra de vidro':180,
    'limpeza de pele':60,'peeling':45,'drenagem linfática':60,'massagem modeladora':60,'protocolo facial':60,'protocolo corporal':60,
    'axilas':20,'meia perna':40,'perna inteira':60,'virilha':40,'rosto':20,'costas':45,'peito':40,
    'maquiagem social':60,'maquiagem para noiva':120,'maquiagem para festa':75,'teste de maquiagem':60
  }
  return exact[name]||60
}

function homePage(){
  const today=state.appointments.filter(a=>a.date===todayISO()&&a.status!=='CANCELADO').sort((a,b)=>a.time.localeCompare(b.time))
  const revenue=today.reduce((sum,a)=>sum+Number(a.price||0),0)
  const low=state.products.filter(p=>Number(p.minStock||0)>0&&Number(p.stock)<=Number(p.minStock))
  const returns=clientsDueReturn()
  const next=today.find(a=>a.status!=='CONCLUIDO')
  return `<section class="dashboard-hero"><div><span class="eyebrow">VISÃO DO NEGÓCIO</span><h1 class="title">Olá, ${esc(state.establishment.name)}.</h1><p class="subtitle">Mais clareza para cuidar do seu negócio hoje.</p></div><div class="hero-brand">${zaiaLogo(true)}<span>Gestão inteligente para beleza</span></div></section>
  <div class="grid stats zaia-stats">
    <div class="card stat-card"><div class="stat-icon">${icon('calendar',21)}</div><div><div class="stat-label">Atendimentos hoje</div><div class="stat-value">${today.length}</div><div class="stat-note">${next?`Próximo às ${next.time}`:'Agenda livre'}</div></div></div>
    <div class="card stat-card"><div class="stat-icon champagne">${icon('sparkle',21)}</div><div><div class="stat-label">Receita prevista</div><div class="stat-value money">${fmtMoney(revenue)}</div><div class="stat-note">Agenda de hoje</div></div></div>
    <div class="card stat-card"><div class="stat-icon soft">${icon('users',21)}</div><div><div class="stat-label">Retornos</div><div class="stat-value">${returns.length}</div><div class="stat-note">Clientes no período ideal</div></div></div>
    <div class="card stat-card"><div class="stat-icon warning">${icon('box',21)}</div><div><div class="stat-label">Produtos em falta</div><div class="stat-value">${low.length}</div><div class="stat-note">${low.length?'Atenção necessária':'Estoque saudável'}</div></div></div>
  </div>
  <div class="dashboard-grid">
    <section class="card dashboard-panel agenda-panel"><div class="section-head"><div><span class="eyebrow">HOJE</span><h2>Agenda</h2></div><button class="link-button" data-page="agenda">Ver agenda ${icon('arrow',16)}</button></div>${today.length?`<div class="list clean-list">${today.slice(0,5).map(appointmentItem).join('')}</div>`:`<div class="empty"><b>Nenhum horário hoje</b>Sua agenda está livre. Aproveite para organizar retornos.</div>`}<button class="btn primary dashboard-new" data-open="appointment">${icon('plus',18)} Novo agendamento</button></section>
    <div class="dashboard-side">
      <section class="card dashboard-panel"><div class="section-head"><div><span class="eyebrow">ATALHOS</span><h2>Ações rápidas</h2></div></div><div class="quick zaia-quick"><button class="quick-action" data-open="appointment">${icon('calendar',21)}<span>Agendar</span></button><button class="quick-action" data-open="client">${icon('users',21)}<span>Cliente</span></button><button class="quick-action" data-page="services">${icon('sparkle',21)}<span>Serviços</span></button><button class="quick-action" data-page="inventory">${icon('box',21)}<span>Estoque</span></button></div></section>
      <section class="card dashboard-panel pro-highlight"><div class="pro-glow"></div><span class="eyebrow">ZAIA PRO</span><h2>Sua marca dentro da ZAIA.</h2><p>Logo, cores e ícone personalizados para uma experiência ainda mais profissional.</p><button class="btn pro-button" data-open="zaiaPro">Conhecer personalização ${icon('arrow',17)}</button></section>
    </div>
  </div>
  ${returns.length?`<div class="section-head return-head"><div><span class="eyebrow">RELACIONAMENTO</span><h2>Clientes para reativar</h2></div><span class="pill">${returns.length}</span></div><div class="list client-return-list">${returns.slice(0,4).map(c=>`<div class="item"><div class="client-initial">${esc(c.name[0]?.toUpperCase()||'C')}</div><div class="item-main"><strong>${esc(c.name)}</strong><div class="meta">${c.daysSince} dias desde a última visita ${c.lastService?'• '+esc(c.lastService):''}</div></div>${c.phone?`<button class="btn small" data-wa="${c.id}">WhatsApp</button>`:''}</div>`).join('')}</div>`:''}`
}
function agendaPage(){
  const list=[...state.appointments].sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time))
  return `<div class="eyebrow">Operação</div><h1 class="title">Agenda</h1><p class="subtitle">Somente serviços cadastrados neste estabelecimento aparecem aqui.</p><div class="toolbar" style="margin-top:18px"><button class="btn primary" data-open="appointment">+ Novo horário</button>${!cloudEnabled()?'<button class="btn" id="seedAgenda">Gerar exemplo</button>':''}</div><div class="section-head"><h2>Próximos horários</h2><span class="pill">${list.length}</span></div>${list.length?`<div class="list agenda-list">${list.map(a=>`<div><div class="tag" style="margin:14px 4px 6px">${fmtDate(a.date)}</div>${appointmentItem(a)}</div>`).join('')}</div>`:`<div class="empty"><b>Sua agenda está vazia</b>Adicione um atendimento para começar.</div>`}<button class="fab" data-open="appointment">+</button>`
}
function appointmentItem(a){
  const svc=serviceById(a.serviceId)
  const pro=professionalById(a.professionalId)
  const mats=a.materials?.length?a.materials:(svc?.materials||[])
  const config=professionalServiceConfig(pro,a.serviceId)
  const duration=Number(a.durationMinutes||config?.customDuration||svc?.duration||0)
  const endTime=a.endTime||addMinutesToTime(a.time,duration)
  const sourceBadge=a.bookingSource==='PUBLIC'?'<span class="pill online-badge">ZAIA Online</span>':''
  const closed=['CONCLUIDO','CANCELADO','NAO_COMPARECEU'].includes(a.status)
  const statusBadge=a.status==='CANCELADO'?'<span class="pill cancel-badge">Cancelado</span>':a.status==='CONCLUIDO'?'<span class="pill good">Concluído</span>':''
  return `<div class="item appointment-item ${a.status==='CANCELADO'?'appointment-cancelled':''}">
    <div class="appointment-time"><strong>${a.time}</strong><span>até ${endTime}</span></div>
    <div class="appointment-body">
      <div class="appointment-head"><strong>${esc(a.clientName)}</strong><div class="appointment-badges">${sourceBadge}${statusBadge}</div></div>
      <div class="appointment-service-line"><span class="service-dot"></span><strong>${esc(svc?.name||'Serviço')}</strong><span>• ${formatDuration(duration)}</span></div>
      <div class="appointment-detail-line"><span>Profissional</span><strong>${esc(pro?.name||'Profissional')}</strong></div>
      <div class="appointment-detail-line compact"><span>${fmtMoney(a.price)}</span>${mats.length?`<span>• ${mats.length} material${mats.length>1?'is':''}</span>`:''}</div>
      <div class="item-actions appointment-actions"><button class="btn small ghost" data-appointment-materials="${a.id}" ${closed?'disabled':''}>Materiais</button><button class="btn small ${closed?'ghost':''}" data-complete="${a.id}" ${closed?'disabled':''}>${a.status==='CONCLUIDO'?'Concluído':a.status==='CANCELADO'?'Cancelado':'Concluir'}</button>${!closed?`<button class="btn small danger-soft" data-cancel-appointment="${a.id}">Cancelar</button>`:''}</div>
    </div>
  </div>`
}

function clientsPage(){return `<div class="eyebrow">Relacionamento</div><h1 class="title">Clientes</h1><p class="subtitle">Histórico e retorno ficam vinculados somente a ${esc(state.establishment.name)}.</p><div class="toolbar" style="margin-top:18px"><button class="btn primary" data-open="client">+ Novo cliente</button></div><div class="section-head"><h2>${state.clients.length} cadastrados</h2></div>${state.clients.length?`<div class="list client-list">${state.clients.map(c=>`<div class="item client-card"><div class="item-main"><strong>${esc(c.name)}</strong><div class="meta">${esc(c.phone||'Sem telefone')} ${c.lastService?'• '+esc(c.lastService):''}</div></div>${c.phone?`<button class="btn small" data-wa="${c.id}">WhatsApp</button>`:''}</div>`).join('')}</div>`:`<div class="empty"><b>Nenhum cliente ainda</b>Clientes também são criados automaticamente ao agendar.</div>`}<button class="fab" data-open="client">+</button>`}
function catalogPage(){return `<div class="page-heading"><span class="eyebrow">CATÁLOGO</span><h1 class="title">Seu negócio, suas regras.</h1><p class="subtitle">Serviços e produtos organizados com a identidade da sua operação.</p></div><div class="two-col catalog-cards"><button class="card feature-card" data-page="services"><span class="feature-icon">${icon('sparkle',24)}</span><div><h2>Serviços</h2><p class="subtitle">${state.services.filter(s=>s.active).length} ativos • preços, duração, materiais e aprendizado.</p></div><b>›</b></button><button class="card feature-card" data-page="inventory"><span class="feature-icon champagne">${icon('box',24)}</span><div><h2>Produtos & estoque</h2><p class="subtitle">${state.products.length} produtos • consumo automático e estoque mínimo.</p></div><b>›</b></button></div>`}
function servicesPage(){return `<div class="eyebrow">Catálogo</div><h1 class="title">Serviços</h1><p class="subtitle">Configure quanto tempo cada serviço ocupa na agenda. O horário fica bloqueado do início ao fim para evitar conflitos.</p><div class="notice duration-notice"><strong>Duração controla a agenda</strong><span>Ex.: um serviço de 3h iniciado às 09:00 reserva o profissional até 12:00.</span></div><div class="notice learning-notice"><strong>Aprendizado de materiais ativo</strong><span>O aprendizado fica isolado neste estabelecimento e neste segmento.</span></div><div class="toolbar" style="margin-top:18px"><button class="btn primary" data-open="service">+ Adicionar serviço</button></div><div class="section-head"><h2>Serviços cadastrados</h2><span class="pill">${state.services.length}</span></div><div class="list service-list">${state.services.map(s=>`<div class="item service-card"><div class="service-dot"></div><div class="item-main"><strong>${esc(s.name)}</strong><div class="meta">${fmtMoney(s.price)} • <strong>${formatDuration(s.duration)}</strong> de agenda ${s.returnDays?`• retorno ${s.returnDays} dias`:''}</div><div class="meta material-summary">${s.materials?.length?`${s.materials.length} material${s.materials.length>1?'is':''} • custo previsto ${fmtMoney(s.estimatedCost||materialCost(s.materials))}`:'Sem materiais configurados'} ${s.materialsEstimated?'<span class="pill estimate">Estimativa inicial</span>':''}</div></div><div class="item-actions"><button class="btn small" data-service-edit="${s.id}">Editar</button><button class="btn small" data-service-materials="${s.id}">Materiais</button><span class="pill ${s.active?'good':''}">${s.active?'Ativo':'Inativo'}</span></div></div>`).join('')}</div><button class="fab" data-open="service">+</button>`}
function inventoryPage(){
  const suggested=state.products.filter(p=>p.suggested).length
  return `<div class="eyebrow">Operação</div><h1 class="title">Produtos & estoque</h1><p class="subtitle">O modelo inicial traz os itens mais comuns do seu segmento. Quantidade, custo e consumo são apenas pontos de partida e ficam totalmente editáveis.</p><div class="toolbar" style="margin-top:18px"><button class="btn primary" data-open="product">+ Adicionar produto</button>${cloudEnabled()?'<button class="btn" id="seedStarterCatalog">Adicionar sugestões do segmento</button>':''}</div>${suggested?`<div class="notice starter-notice"><strong>${suggested} itens vieram da base sugerida.</strong><span>Informe seu estoque e custo reais. Você pode editar ou remover qualquer item.</span></div>`:''}<div class="section-head"><h2>Estoque atual</h2><span class="pill">${state.products.length}</span></div>${state.products.length?`<div class="list inventory-list">${state.products.map(p=>{
    const hasMin=Number(p.minStock)>0
    const low=hasMin&&Number(p.stock)<=Number(p.minStock)
    const pct=hasMin?Math.min(100,Math.max(4,(Number(p.stock)/(Number(p.minStock)*3))*100)):0
    const needsSetup=p.suggested&&Number(p.stock)===0&&Number(p.cost)===0&&Number(p.minStock)===0
    return `<div class="item inventory-item"><div class="item-main"><div class="product-tags"><span class="tag">${esc(p.category||'Produto')}</span>${p.suggested?'<span class="pill estimate">Base sugerida</span>':''}</div><strong>${esc(p.name)}</strong><div class="meta">${fmtQty(p.stock)} ${esc(p.unit)} • mínimo ${fmtQty(p.minStock)} • custo ${fmtMoney(p.cost)}</div>${hasMin?`<div class="stockbar"><i style="width:${pct}%"></i></div>`:''}<div class="item-actions product-actions"><button class="btn small" data-product-edit="${p.id}">Editar</button><button class="btn small ghost" data-product-remove="${p.id}">Remover</button></div></div>${needsSetup?'<span class="pill warn">Configurar</span>':low?'<span class="pill warn">Baixo</span>':hasMin?'<span class="pill good">OK</span>':'<span class="pill">Sem mínimo</span>'}</div>`
  }).join('')}</div>`:`<div class="empty"><b>Estoque vazio</b>Use “Adicionar sugestões do segmento” para começar com uma base pronta ou cadastre seus próprios produtos.</div>`}<button class="fab" data-open="product">+</button>`
}
function professionalsPage(){
  const activeServices=state.services.filter(s=>s.active)
  return `<div class="eyebrow">Equipe</div><h1 class="title">Profissionais</h1><p class="subtitle">Defina quem atende, quais serviços executa e quando está disponível.</p><div class="toolbar" style="margin-top:18px"><button class="btn primary" data-open="professional">+ Novo profissional</button></div><div class="section-head"><h2>Equipe</h2><span class="pill">${state.professionals.length}</span></div>${state.professionals.length?`<div class="list pro-list">${state.professionals.map(p=>{
    const serviceCount=p.acceptsAllServices!==false?activeServices.length:(p.services||[]).filter(x=>x.active!==false).length
    const futureBlocks=(p.blocks||[]).filter(b=>new Date(b.endsAt)>new Date()).length
    return `<div class="item pro-card"><div class="avatar pro-avatar">${esc((p.name||'P')[0].toUpperCase())}</div><div class="item-main"><div class="pro-title"><strong>${esc(p.name)}</strong><span class="pill good">Ativo</span></div><div class="meta">${esc(p.jobTitle||'Profissional')} • ${p.acceptsAllServices!==false?'Todos os serviços':serviceCount+' serviço'+(serviceCount===1?'':'s')}</div><div class="meta">${esc(scheduleSummary(p))}</div><div class="meta">${esc(commissionText(p))}${futureBlocks?` • ${futureBlocks} bloqueio${futureBlocks>1?'s':''}`:''}</div><div class="pro-actions"><button class="btn small" data-pro-edit="${p.id}">Editar</button><button class="btn small" data-pro-services="${p.id}">Serviços</button><button class="btn small" data-pro-hours="${p.id}">Jornada</button><button class="btn small ghost" data-pro-block="${p.id}">Bloquear horário</button></div></div></div>`
  }).join('')}</div>`:`<div class="empty"><b>Nenhum profissional cadastrado</b>Cadastre a equipe para organizar disponibilidade e serviços.</div>`}<div class="notice">A agenda já impede choque de horários, horários fora da jornada e serviços não habilitados para o profissional.</div><button class="fab" data-open="professional">+</button>`
}
function financePage(){
  if(financeLoading&&!state.financeData){
    return `<div class="page-heading"><span class="eyebrow">ZAIA PRO</span><h1 class="title">Financeiro</h1><p class="subtitle">Carregando a saúde financeira do seu negócio...</p></div><div class="finance-loading"><div class="loading-ring"></div></div>`
  }
  if(!state.financeData){
    return `<div class="page-heading"><span class="eyebrow">ZAIA PRO</span><h1 class="title">Financeiro</h1><p class="subtitle">Transforme atendimentos, custos e comissões em decisões financeiras.</p></div><section class="card finance-empty-card"><div class="finance-hero-icon">${icon('wallet',26)}</div><div><h2>Seu painel financeiro está pronto.</h2><p>Os atendimentos concluídos entram automaticamente como valores a receber e a ZAIA calcula materiais e comissões.</p></div><button class="btn primary" id="loadFinanceNow">Abrir financeiro</button></section>`
  }
  if(state.financeData.error){
    return `<div class="page-heading"><span class="eyebrow">ZAIA PRO</span><h1 class="title">Financeiro</h1><p class="subtitle">Não foi possível carregar os dados.</p></div><div class="warning-box">${esc(state.financeData.error)}</div><button class="btn primary" id="loadFinanceNow">Tentar novamente</button>`
  }

  const d=state.financeData
  const x=d.summary||{}
  const gross=Number(x.gross_revenue||0)
  const received=Number(x.received||0)
  const paidExpenses=Number(x.expenses_paid||0)
  const accruedExpenses=Number(x.expenses_accrued||0)
  const materials=Number(x.materials||0)
  const commissions=Number(x.commissions||0)
  const receivable=Number(x.receivable||0)
  const payable=Number(x.payable||0)
  const completed=Number(x.completed_count||0)
  const cashResult=received-paidExpenses
  const estimatedProfit=gross-materials-accruedExpenses
  const margin=gross>0?(estimatedProfit/gross)*100:0
  const ticket=completed?gross/completed:0
  const target=Number(d.settings?.monthly_revenue_target||0)
  const targetPct=target>0?Math.max(0,Math.min(100,gross/target*100)):0
  const upcoming=d.upcoming||[]
  const txs=(state.financeTransactions||[]).slice(0,12)
  const accounts=d.accounts||[]
  const professionals=d.professionals||[]
  const services=d.services||[]
  const cashflow=d.cashflow||[]
  const maxFlow=Math.max(1,...cashflow.map(v=>Math.max(Number(v.income||0),Number(v.expense||0))))
  const period=financeRange||monthRange()

  return `<div class="page-heading finance-heading"><div><span class="eyebrow">ZAIA PRO • FINANCEIRO</span><h1 class="title">Seu negócio em números.</h1><p class="subtitle">Receitas, despesas, lucro, caixa e rentabilidade em uma visão gerencial.</p></div><div class="finance-heading-actions"><button class="btn ghost" id="financeSettingsBtn">${icon('settings',16)} Metas</button><button class="btn primary" data-finance-new="EXPENSE">+ Despesa</button></div></div>

  <div class="finance-period-bar"><div><strong>${esc(period.label||'Período')}</strong><span>${fmtDate(period.start)} — ${fmtDate(period.end)}</span></div><div class="finance-period-actions"><button data-finance-range="month" class="${period.preset==='month'?'on':''}">Mês</button><button data-finance-range="7" class="${period.preset==='7'?'on':''}">7 dias</button><button data-finance-range="30" class="${period.preset==='30'?'on':''}">30 dias</button><button data-finance-range="90" class="${period.preset==='90'?'on':''}">90 dias</button></div></div>

  <section class="finance-kpis">
    <article class="finance-kpi featured"><span>Faturamento</span><strong>${fmtMoney(gross)}</strong><small>${completed} atendimento${completed===1?'':'s'} concluído${completed===1?'':'s'}</small></article>
    <article class="finance-kpi"><span>Recebido</span><strong>${fmtMoney(received)}</strong><small>Entradas já confirmadas</small></article>
    <article class="finance-kpi"><span>Despesas pagas</span><strong>${fmtMoney(paidExpenses)}</strong><small>Saídas efetivas no período</small></article>
    <article class="finance-kpi ${cashResult<0?'negative':''}"><span>Resultado de caixa</span><strong>${fmtMoney(cashResult)}</strong><small>Recebido menos despesas pagas</small></article>
  </section>

  <section class="finance-health-grid">
    <article class="card finance-profit-card"><div class="finance-card-head"><div><span class="eyebrow">RESULTADO</span><h2>Lucro estimado</h2></div><span class="finance-margin ${margin<0?'negative':''}">${margin.toLocaleString('pt-BR',{maximumFractionDigits:1})}% margem</span></div><strong class="finance-profit-value ${estimatedProfit<0?'negative':''}">${fmtMoney(estimatedProfit)}</strong><div class="finance-cost-stack"><div><span>Materiais</span><b>${fmtMoney(materials)}</b></div><div><span>Comissões</span><b>${fmtMoney(commissions)}</b></div><div><span>Despesas do período</span><b>${fmtMoney(accruedExpenses)}</b></div><div><span>Ticket médio</span><b>${fmtMoney(ticket)}</b></div></div></article>
    <article class="card finance-receivables-card"><div class="finance-card-head"><div><span class="eyebrow">COMPROMISSOS</span><h2>A receber e a pagar</h2></div></div><div class="finance-dual-total"><div class="income"><span>A receber</span><strong>${fmtMoney(receivable)}</strong></div><div class="expense"><span>A pagar</span><strong>${fmtMoney(payable)}</strong></div></div><button class="btn ghost wide" data-finance-new="INCOME">+ Receita avulsa</button></article>
  </section>

  ${target>0?`<section class="card finance-goal-card"><div><span class="eyebrow">META DE FATURAMENTO</span><h2>${fmtMoney(gross)} de ${fmtMoney(target)}</h2><p>${targetPct.toLocaleString('pt-BR',{maximumFractionDigits:0})}% da meta mensal alcançada.</p></div><div class="finance-goal-track"><i style="width:${targetPct}%"></i></div></section>`:''}

  <section class="card finance-pending-card"><div class="section-head"><div><span class="eyebrow">PRÓXIMOS VENCIMENTOS</span><h2>Pendências financeiras</h2></div><span class="pill">${upcoming.length}</span></div>${upcoming.length?`<div class="finance-pending-list">${upcoming.map(t=>`<div class="finance-pending-item ${t.kind==='INCOME'?'income':'expense'}"><div class="finance-pending-date"><strong>${String(t.due_date).slice(8,10)}</strong><span>${new Date(t.due_date+'T12:00:00').toLocaleDateString('pt-BR',{month:'short'}).replace('.','')}</span></div><div class="item-main"><strong>${esc(t.description)}</strong><div class="meta">${esc(t.category)} • ${t.source==='APPOINTMENT'?'Atendimento':t.source==='COMMISSION'?'Comissão':'Manual'}</div></div><b class="finance-pending-value">${t.kind==='EXPENSE'?'- ':'+ '}${fmtMoney(t.amount)}</b><button class="btn small ${t.kind==='INCOME'?'primary':'ghost'}" data-finance-pay="${t.id}">${t.kind==='INCOME'?'Receber':'Pagar'}</button></div>`).join('')}</div>`:'<div class="empty compact"><b>Nenhuma pendência.</b>Seu contas a pagar e receber está em dia.</div>'}</section>

  <section class="finance-chart-grid">
    <article class="card"><div class="section-head"><div><span class="eyebrow">FLUXO DE CAIXA</span><h2>Entradas e saídas</h2></div></div>${cashflow.length?`<div class="finance-flow-chart">${cashflow.slice(-12).map(v=>`<div class="finance-flow-row"><span>${fmtDate(v.date)}</span><div class="flow-bars"><i class="income" style="width:${Math.max(2,Number(v.income||0)/maxFlow*100)}%"></i><i class="expense" style="width:${Math.max(2,Number(v.expense||0)/maxFlow*100)}%"></i></div><b>${fmtMoney(Number(v.net||0))}</b></div>`).join('')}</div><div class="finance-chart-legend"><span><i class="income"></i>Entradas</span><span><i class="expense"></i>Saídas</span></div>`:'<div class="empty compact"><b>Sem movimentação paga no período.</b>Ao receber ou pagar lançamentos, o fluxo aparece aqui.</div>'}</article>
    <article class="card"><div class="section-head"><div><span class="eyebrow">CONTAS</span><h2>Saldos</h2></div><button class="btn small ghost" id="financeNewAccount">+ Conta</button></div><div class="finance-accounts">${accounts.map(a=>`<div><span>${esc(a.name)}<small>${a.type==='CASH'?'Caixa':a.type==='BANK'?'Banco':a.type==='DIGITAL'?'Carteira digital':'Outra'}</small></span><strong>${fmtMoney(a.balance)}</strong></div>`).join('')||'<div class="meta">Nenhuma conta cadastrada.</div>'}</div></article>
  </section>

  <section class="finance-performance-grid">
    <article class="card"><div class="section-head"><div><span class="eyebrow">RENTABILIDADE</span><h2>Por profissional</h2></div></div>${professionals.length?`<div class="finance-ranking">${professionals.slice(0,8).map((p,i)=>`<div><span class="rank">${i+1}</span><div class="item-main"><strong>${esc(p.name)}</strong><small>${p.appointments} atendimento${Number(p.appointments)===1?'':'s'} • comissão ${fmtMoney(p.commission)}</small></div><div><strong>${fmtMoney(p.revenue)}</strong><small>contrib. ${fmtMoney(p.contribution)}</small></div></div>`).join('')}</div>`:'<div class="empty compact">Conclua atendimentos para gerar a análise.</div>'}</article>
    <article class="card"><div class="section-head"><div><span class="eyebrow">SERVIÇOS</span><h2>O que mais gera resultado</h2></div></div>${services.length?`<div class="finance-ranking">${services.slice(0,8).map((p,i)=>`<div><span class="rank">${i+1}</span><div class="item-main"><strong>${esc(p.name)}</strong><small>${p.appointments} atendimento${Number(p.appointments)===1?'':'s'} • materiais ${fmtMoney(p.materials)}</small></div><div><strong>${fmtMoney(p.revenue)}</strong><small>contrib. ${fmtMoney(p.contribution)}</small></div></div>`).join('')}</div>`:'<div class="empty compact">Ainda não há serviços concluídos no período.</div>'}</article>
  </section>

  <section class="card finance-transactions-card"><div class="section-head"><div><span class="eyebrow">MOVIMENTAÇÕES</span><h2>Últimos lançamentos</h2></div><div class="finance-inline-actions"><button class="btn small ghost" data-finance-new="INCOME">+ Receita</button><button class="btn small" data-finance-new="EXPENSE">+ Despesa</button></div></div>${txs.length?`<div class="finance-transactions-list">${txs.map(t=>`<div class="finance-transaction-row"><span class="finance-type-icon ${t.kind==='INCOME'?'income':'expense'}">${t.kind==='INCOME'?'↑':'↓'}</span><div class="item-main"><strong>${esc(t.description)}</strong><div class="meta">${fmtDate(t.dueDate)} • ${esc(t.category)}${t.paymentMethod?' • '+paymentMethodLabel(t.paymentMethod):''}</div></div><div class="finance-tx-right"><strong class="${t.kind==='INCOME'?'income':'expense'}">${t.kind==='INCOME'?'+':'-'} ${fmtMoney(t.amount)}</strong><span class="pill ${t.status==='PAID'?'good':t.status==='CANCELLED'?'':'warn'}">${financeStatusLabel(t.status)}</span></div>${t.status==='PENDING'?`<button class="btn small ghost" data-finance-pay="${t.id}">Baixar</button>${t.source==='MANUAL'? `<button class="finance-icon-action" data-finance-cancel="${t.id}" aria-label="Cancelar">×</button>` : ''}`:''}</div>`).join('')}</div>`:'<div class="empty compact"><b>Nenhum lançamento ainda.</b>Registre receitas e despesas ou conclua um atendimento.</div>'}</section>`
}

function promotionsPage(){
  const now=Date.now()
  const list=state.promotions||[]
  return `<div class="page-heading"><span class="eyebrow">MARKETING</span><h1 class="title">Promoções</h1><p class="subtitle">Crie ofertas que aparecem para clientes na ZAIA enquanto estiverem ativas.</p></div>
  <div class="toolbar" style="margin-top:18px"><button class="btn primary" data-open="promotion">+ Nova promoção</button></div>
  <div class="section-head"><h2>Promoções cadastradas</h2><span class="pill">${list.length}</span></div>
  ${list.length?`<div class="list promotion-admin-list">${list.map(p=>{
    const active=p.active&&new Date(p.startsAt).getTime()<=now&&new Date(p.endsAt).getTime()>=now
    const svc=serviceById(p.serviceId)
    return `<div class="item promotion-admin-card"><div class="promotion-admin-icon">${icon('sparkle',20)}</div><div class="item-main"><div class="product-tags"><span class="pill ${active?'good':''}">${active?'Ativa':p.active?'Agendada/encerrada':'Inativa'}</span>${svc?`<span class="tag">${esc(svc.name)}</span>`:''}</div><strong>${esc(p.title)}</strong><div class="promotion-offer">${esc(p.offerText)}</div><div class="meta">${esc(p.description||'')}<br>${fmtDate(String(p.startsAt).slice(0,10))} até ${fmtDate(String(p.endsAt).slice(0,10))}</div></div><div class="item-actions promotion-actions"><button class="btn small" data-promotion-edit="${p.id}">Editar</button><button class="btn small ghost" data-promotion-delete="${p.id}">Excluir</button></div></div>`
  }).join('')}</div>`:`<div class="empty"><b>Nenhuma promoção ainda</b>Crie uma oferta para aparecer na área de clientes da ZAIA.</div>`}`
}

function morePage(){return `<div class="page-heading"><span class="eyebrow">GESTÃO</span><h1 class="title">Mais</h1><p class="subtitle">Configurações e recursos para evoluir sua operação.</p></div><div class="list settings-list"><button class="item" data-page="professionals"><span class="settings-icon">${icon('briefcase',20)}</span><div class="item-main"><strong>Profissionais</strong><div class="meta">Equipe, serviços e horários</div></div><b>›</b></button><button class="item" data-page="inventory"><span class="settings-icon">${icon('box',20)}</span><div class="item-main"><strong>Estoque</strong><div class="meta">Produtos e níveis mínimos</div></div><b>›</b></button><button class="item" data-page="finance"><span class="settings-icon pro-settings-mini">${icon('wallet',20)}</span><div class="item-main"><strong>Financeiro <span class="mini-pro-badge">PRO</span></strong><div class="meta">Caixa, contas, lucro e comissões</div></div><b>›</b></button><button class="item" id="notifyBtn"><span class="settings-icon pro-settings-mini">${icon('bell',20)}</span><div class="item-main"><strong>Notificações <span class="mini-pro-badge">PRO</span></strong><div class="meta">${state.establishment.planCode==='PRO'?(state.notificationsEnabled?'Push ativo neste dispositivo':'Novo agendamento e cancelamento em Push'):'Disponível no ZAIA PRO'}</div></div>${Number(businessPushState?.unread||0)>0?`<span class="notification-count">${Math.min(99,Number(businessPushState.unread))}</span>`:''}<b>›</b></button><button class="item" data-open="business"><span class="settings-icon">${icon('settings',20)}</span><div class="item-main"><strong>Estabelecimento</strong><div class="meta">Nome e segmentos ativos</div></div><b>›</b></button><button class="item" data-page="promotions"><span class="settings-icon">${icon('sparkle',20)}</span><div class="item-main"><strong>Promoções</strong><div class="meta">Ofertas para clientes na ZAIA</div></div><b>›</b></button></div><section class="card discovery-settings-card"><div class="discovery-status-icon">${icon('search',21)}</div><div class="item-main"><span class="eyebrow">PARA CLIENTES</span><h2>${state.establishment.marketplaceEnabled&&hasPublicAddress()?'Seu espaço está visível na ZAIA':'Publique seu espaço na ZAIA'}</h2><p>${state.establishment.marketplaceEnabled&&hasPublicAddress()?esc(publicAddressLabel()):'Cadastre o endereço para clientes encontrarem seus serviços, horários e localização.'}</p></div><button class="btn small" data-open="business">Configurar</button></section><section class="card pro-settings-card"><div class="pro-settings-copy"><span class="eyebrow">ZAIA PRO</span><h2>Personalização da sua marca</h2><p>Use sua logo, suas cores e seu ícone mantendo toda a tecnologia ZAIA por trás.</p></div><button class="btn pro-button" data-open="zaiaPro">Abrir personalização ${icon('arrow',17)}</button></section><div class="zaia-about"><div>${zaiaLogo()}</div><span>Gestão para negócios de beleza</span><small>by Nethanel</small></div>${cloudEnabled()?'<button class="btn danger wide" id="logoutBtn">Sair da conta</button>':'<button class="btn danger wide" id="resetApp">Reiniciar demonstração</button>'}`}
function modalHtml(){
  const close='<button type="button" class="x" data-close aria-label="Fechar">×</button>'
  if(modal==='businessNotifications'){
    const pro=(businessPushState?.plan||state.establishment?.planCode)==='PRO'
    const devices=Number(businessPushState?.devices||0)
    const items=businessNotificationItems||[]
    if(!pro){
      return `<div class="modal-backdrop"><div class="modal notification-modal"><div class="modal-head"><div><span class="eyebrow">ZAIA PRO</span><h3>Notificações da loja</h3><div class="helper">Push operacional em tempo real para não perder nenhum movimento da agenda.</div></div>${close}</div><section class="notification-pro-lock"><div class="notification-lock-icon">${icon('bell',27)}</div><span class="mini-pro-badge">PRO</span><h2>Saiba na hora quando a agenda mudar.</h2><p>Novo agendamento e cancelamento geram Push no celular da loja, mesmo com a ZAIA fechada.</p><div class="notification-feature-list"><div>✓ Novo agendamento online</div><div>✓ Novo agendamento criado pela equipe</div><div>✓ Cancelamento do cliente ou da loja</div><div>✓ Central de alertas dentro da ZAIA</div></div><button class="btn primary wide" type="button" data-close>Entendi</button></section></div></div>`
    }
    return `<div class="modal-backdrop"><div class="modal notification-modal"><div class="modal-head"><div><span class="eyebrow">ZAIA PRO • ALERTAS</span><h3>Notificações da loja</h3><div class="helper">Novos agendamentos e cancelamentos chegam em Push neste dispositivo.</div></div>${close}</div>
      <section class="push-status-card ${devices?'active':''}"><div class="push-status-icon">${icon('bell',22)}</div><div class="item-main"><strong>${devices?'Push ativo':'Ative o Push neste aparelho'}</strong><span>${devices?`${devices} dispositivo${devices===1?'':'s'} registrado${devices===1?'':'s'} para sua conta.`:'Você receberá os alertas da agenda mesmo com a ZAIA fechada.'}</span></div><button class="btn ${devices?'ghost':'primary'}" id="activateStorePush">${devices?'Testar Push':'Ativar'}</button></section>
      <div class="notification-rules"><div><span class="notification-rule-icon new">${icon('calendar',18)}</span><span><strong>Novo agendamento</strong><small>Cliente, serviço, data e horário no Push.</small></span></div><div><span class="notification-rule-icon cancel">×</span><span><strong>Cancelamento</strong><small>Alerta imediato para a loja reorganizar a agenda.</small></span></div></div>
      <div class="section-head notification-history-head"><div><span class="eyebrow">CENTRAL DE ALERTAS</span><h2>Recentes</h2></div><span class="pill">${items.length}</span></div>
      ${items.length?`<div class="business-notification-list">${items.map(n=>`<div class="business-notification-item ${n.type==='BOOKING_CANCELLED'?'cancel':''}"><span class="business-notification-icon">${n.type==='BOOKING_CANCELLED'?'×':icon('bell',16)}</span><div><strong>${esc(n.title)}</strong><p>${esc(n.body)}</p><small>${fmtDateTime(n.createdAt)}</small></div></div>`).join('')}</div>`:'<div class="empty compact"><b>Nenhum alerta ainda.</b>Os próximos movimentos da agenda aparecerão aqui.</div>'}
    </div></div>`
  }

  if(modal==='zaiaPro'){
    const est=state.establishment
    const logo=est.brandLogoUrl||''
    const primary=est.brandPrimaryColor||ZAIA_COLORS.primary
    const secondary=est.brandSecondaryColor||ZAIA_COLORS.secondary
    const accent=est.brandAccentColor||ZAIA_COLORS.accent
    const loginUrl=`https://nethanel-beauty.vercel.app/?loja=${encodeURIComponent(est.slug||'')}`
    return `<div class="modal-backdrop"><div class="modal pro-modal brand-config-modal"><div class="modal-head"><div><span class="eyebrow">PERSONALIZAÇÃO</span><h3>Sua marca na ZAIA</h3><div class="helper">Logo, cores e identidade do estabelecimento na frente. ZAIA permanece como tecnologia da operação.</div></div>${close}</div>
      <form class="form brand-form" id="brandForm">
        <label class="toggle-row brand-toggle"><input type="checkbox" name="enabled" id="brandEnabled" ${est.brandEnabled?'checked':''}><span><strong>Ativar identidade do estabelecimento</strong><small>Aplica sua marca no painel, login e vitrine vista pelos clientes.</small></span></label>

        <div class="brand-live-preview" id="brandLivePreview" style="--preview-primary:${esc(primary)};--preview-secondary:${esc(secondary)};--preview-accent:${esc(accent)}">
          <div class="brand-preview-sidebar">
            <div class="brand-preview-logo" id="brandPreviewLogo">${logo?`<img src="${esc(logo)}" alt="">`:`<span>${esc((est.name||'Z')[0].toUpperCase())}</span>`}</div>
            <div><strong>${esc(est.name)}</strong><small>ZAIA</small></div>
          </div>
          <div class="brand-preview-content"><span></span><span></span><button type="button">Agendar</button></div>
        </div>

        <div class="field">
          <label>Logo do estabelecimento</label>
          <div class="brand-upload-row">
            <div class="brand-current-logo" id="brandCurrentLogo">${logo?`<img src="${esc(logo)}" alt="${esc(est.name)}">`:`${zaiaLogo(true)}`}</div>
            <div class="brand-upload-copy"><input id="brandLogoFile" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml"><span class="helper">PNG, JPG, WEBP ou SVG • até 5 MB. Prefira fundo transparente.</span></div>
          </div>
        </div>

        <div class="brand-color-grid">
          <label class="brand-color-field"><span>Cor principal</span><div><input type="color" id="brandPrimary" name="primary" value="${esc(primary)}"><input class="brand-hex" id="brandPrimaryHex" value="${esc(primary)}" maxlength="7"></div></label>
          <label class="brand-color-field"><span>Cor secundária</span><div><input type="color" id="brandSecondary" name="secondary" value="${esc(secondary)}"><input class="brand-hex" id="brandSecondaryHex" value="${esc(secondary)}" maxlength="7"></div></label>
          <label class="brand-color-field"><span>Cor de destaque</span><div><input type="color" id="brandAccent" name="accent" value="${esc(accent)}"><input class="brand-hex" id="brandAccentHex" value="${esc(accent)}" maxlength="7"></div></label>
        </div>

        <div class="field">
          <label>Link de acesso personalizado</label>
          <div class="brand-login-link"><input id="brandLoginUrl" readonly value="${esc(loginUrl)}"><button type="button" class="btn small" id="copyBrandLogin">Copiar</button></div>
          <span class="helper">Ao abrir este link, a tela de login já assume a identidade do estabelecimento.</span>
        </div>

        <div class="notice brand-info"><strong>Onde sua marca aparece</strong><span>Painel do lojista, login personalizado, cards da busca, página do estabelecimento e agendamento do cliente. A assinatura “ZAIA” fica discreta e integrada.</span></div>

        <div class="brand-form-actions"><button type="button" class="btn ghost" id="brandDefaults">Cores ZAIA</button><button type="submit" class="btn primary">Salvar personalização</button></div>
      </form>
    </div></div>`
  }

  if(modal==='financeEntry'){
    const kind=modalData?.kind==='INCOME'?'INCOME':'EXPENSE'
    const categories=financeCategoryOptions(kind)
    const accounts=state.financeAccounts||[]
    return `<div class="modal-backdrop"><div class="modal finance-modal"><div class="modal-head"><div><span class="eyebrow">ZAIA PRO • FINANCEIRO</span><h3>${kind==='INCOME'?'Nova receita':'Nova despesa'}</h3><div class="helper">Registre valores avulsos que não vieram automaticamente dos atendimentos.</div></div>${close}</div><form class="form" id="financeEntryForm">
      <input type="hidden" name="kind" value="${kind}">
      <div class="field"><label>Descrição</label><input name="description" required maxlength="120" placeholder="${kind==='INCOME'?'Ex.: Venda de produto':'Ex.: Compra de shampoo profissional'}"></div>
      <div class="row"><div class="field"><label>Valor</label><input name="amount" type="number" min="0.01" step="0.01" inputmode="decimal" required placeholder="0,00"></div><div class="field"><label>Vencimento</label><input name="dueDate" type="date" value="${todayISO()}" required></div></div>
      <div class="field"><label>Categoria</label><select name="category" required>${categories.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join('')}</select></div>
      <div class="field"><label>Status</label><select name="status" id="financeEntryStatus"><option value="PENDING">Pendente</option><option value="PAID">Já ${kind==='INCOME'?'recebido':'pago'}</option></select></div>
      <div id="financePaidFields" class="finance-paid-fields is-hidden"><div class="row"><div class="field"><label>Forma de pagamento</label><select name="paymentMethod">${[['PIX','Pix'],['CASH','Dinheiro'],['DEBIT','Débito'],['CREDIT','Crédito'],['TRANSFER','Transferência'],['OTHER','Outro']].map(([v,l])=>`<option value="${v}">${l}</option>`).join('')}</select></div><div class="field"><label>Conta</label><select name="accountId"><option value="">Sem conta definida</option>${accounts.map(a=>`<option value="${a.id}">${esc(a.name)}</option>`).join('')}</select></div></div></div>
      <div class="field"><label>Observação <small>(opcional)</small></label><textarea name="notes" rows="2" maxlength="300"></textarea></div>
      <button class="btn primary wide" type="submit">Salvar lançamento</button>
    </form></div></div>`
  }

  if(modal==='financePay'){
    const id=modalData?.transactionId
    const t=(state.financeTransactions||[]).find(x=>x.id===id)||(state.financeData?.upcoming||[]).find(x=>x.id===id)
    if(!t)return ''
    const accounts=state.financeAccounts||[]
    return `<div class="modal-backdrop"><div class="modal finance-modal compact-finance-modal"><div class="modal-head"><div><span class="eyebrow">${t.kind==='INCOME'?'RECEBIMENTO':'PAGAMENTO'}</span><h3>${esc(t.description)}</h3></div>${close}</div><div class="finance-pay-total"><span>${t.kind==='INCOME'?'Valor a receber':'Valor a pagar'}</span><strong>${fmtMoney(t.amount)}</strong><small>Vencimento ${fmtDate(t.due_date||t.dueDate)}</small></div><form class="form" id="financePayForm" data-transaction-id="${t.id}">
      <div class="field"><label>Forma de pagamento</label><select name="paymentMethod" required><option value="PIX">Pix</option><option value="CASH">Dinheiro</option><option value="DEBIT">Débito</option><option value="CREDIT">Crédito</option><option value="TRANSFER">Transferência</option><option value="OTHER">Outro</option></select></div>
      <div class="field"><label>Conta</label><select name="accountId"><option value="">Sem conta definida</option>${accounts.map(a=>`<option value="${a.id}">${esc(a.name)}</option>`).join('')}</select></div>
      <button class="btn primary wide" type="submit">${t.kind==='INCOME'?'Confirmar recebimento':'Confirmar pagamento'}</button>
    </form></div></div>`
  }

  if(modal==='financeSettings'){
    const fs=state.financeData?.settings||{}
    return `<div class="modal-backdrop"><div class="modal finance-modal"><div class="modal-head"><div><span class="eyebrow">METAS FINANCEIRAS</span><h3>Defina onde quer chegar</h3><div class="helper">As metas ajudam a comparar resultado real e objetivo mensal.</div></div>${close}</div><form class="form" id="financeSettingsForm">
      <div class="field"><label>Meta mensal de faturamento</label><input name="monthlyRevenueTarget" type="number" min="0" step="0.01" inputmode="decimal" value="${Number(fs.monthly_revenue_target||0)}"></div>
      <div class="field"><label>Meta mensal de lucro</label><input name="monthlyProfitTarget" type="number" min="0" step="0.01" inputmode="decimal" value="${Number(fs.monthly_profit_target||0)}"></div>
      <div class="field"><label>Reserva financeira desejada</label><input name="reserveTarget" type="number" min="0" step="0.01" inputmode="decimal" value="${Number(fs.reserve_target||0)}"></div>
      <button class="btn primary wide" type="submit">Salvar metas</button>
    </form></div></div>`
  }

  if(modal==='financeAccount'){
    return `<div class="modal-backdrop"><div class="modal finance-modal compact-finance-modal"><div class="modal-head"><div><span class="eyebrow">CONTA FINANCEIRA</span><h3>Nova conta</h3></div>${close}</div><form class="form" id="financeAccountForm">
      <div class="field"><label>Nome</label><input name="name" required maxlength="60" placeholder="Ex.: Conta Mercado Pago"></div>
      <div class="field"><label>Tipo</label><select name="type"><option value="CASH">Caixa</option><option value="BANK">Banco</option><option value="DIGITAL">Carteira digital</option><option value="OTHER">Outra</option></select></div>
      <div class="field"><label>Saldo inicial</label><input name="openingBalance" type="number" step="0.01" inputmode="decimal" value="0"></div>
      <button class="btn primary wide" type="submit">Criar conta</button>
    </form></div></div>`
  }

  if(modal==='promotion'){
    const editId=modalData?.promotionId||null
    const p=(state.promotions||[]).find(x=>x.id===editId)||{}
    const start=(p.startsAt||new Date().toISOString()).slice(0,16)
    const defaultEnd=new Date(Date.now()+7*86400000).toISOString().slice(0,16)
    const end=(p.endsAt||defaultEnd).slice(0,16)
    return `<div class="modal-backdrop"><div class="modal"><div class="modal-head"><div><span class="eyebrow">PROMOÇÃO</span><h3>${editId?'Editar promoção':'Nova promoção'}</h3></div>${close}</div><form class="form" id="promotionForm"><input type="hidden" name="id" value="${esc(editId||'')}"><div class="field"><label>Título</label><input name="title" required maxlength="80" value="${esc(p.title||'')}" placeholder="Ex.: Semana da beleza"></div><div class="field"><label>Oferta</label><input name="offerText" required maxlength="80" value="${esc(p.offerText||'')}" placeholder="Ex.: 20% de desconto"></div><div class="field"><label>Descrição</label><textarea name="description" rows="3" maxlength="300" placeholder="Conte ao cliente o que está incluso.">${esc(p.description||'')}</textarea></div><div class="field"><label>Serviço relacionado <small>(opcional)</small></label><select name="serviceId"><option value="">Todos / promoção geral</option>${state.services.filter(x=>x.active).map(x=>`<option value="${x.id}" ${p.serviceId===x.id?'selected':''}>${esc(x.name)}</option>`).join('')}</select></div><div class="row"><div class="field"><label>Início</label><input name="startsAt" type="datetime-local" value="${start}" required></div><div class="field"><label>Fim</label><input name="endsAt" type="datetime-local" value="${end}" required></div></div><label class="toggle-row"><input type="checkbox" name="active" ${p.active!==false?'checked':''}><span><strong>Promoção ativa</strong><small>Será exibida somente dentro do período definido.</small></span></label><button class="btn primary wide" type="submit">${editId?'Salvar alterações':'Publicar promoção'}</button></form></div></div>`
  }

  if(modal==='appointment')return `<div class="modal-backdrop"><div class="modal"><div class="modal-head"><h3>Novo ${vocab().appointment.toLowerCase()}</h3>${close}</div><form class="form" id="appointmentForm"><div class="field"><label>Cliente</label><input name="clientName" required placeholder="Nome da cliente"></div><div class="field"><label>WhatsApp</label><input name="phone" inputmode="tel" data-mask="phone" maxlength="15" placeholder="(11) 99999-9999"></div><div class="field"><label>Serviço</label><select name="serviceId" id="appointmentService" required><option value="">Selecione</option>${state.services.filter(s=>s.active).map(s=>`<option value="${s.id}">${esc(s.name)} — ${fmtMoney(s.price)}</option>`).join('')}</select></div><div class="field"><label>Profissional</label><select name="professionalId" id="appointmentProfessional" required><option value="">Selecione o serviço primeiro</option></select></div><div id="appointmentMaterialsBox"></div><div class="row"><div class="field"><label>Data</label><input name="date" id="appointmentDate" type="date" value="${todayISO()}" required></div><div class="field"><label>Horário</label><input name="time" id="appointmentTime" type="time" value="09:00" required></div></div><button type="button" class="btn wide" id="checkAvailability">Ver horários livres</button><div id="availableSlots"></div><button class="btn primary wide" type="submit">Salvar horário</button></form></div></div>`
  if(modal==='client')return `<div class="modal-backdrop"><div class="modal"><div class="modal-head"><h3>Novo cliente</h3>${close}</div><form class="form" id="clientForm"><div class="field"><label>Nome</label><input name="name" required></div><div class="field"><label>WhatsApp</label><input name="phone" inputmode="tel" data-mask="phone" maxlength="15" placeholder="(11) 99999-9999"></div><button class="btn primary wide">Salvar cliente</button></form></div></div>`
  if(modal==='service'||modal.startsWith('serviceEdit:')){
    const id=modal.includes(':')?modal.split(':')[1]:null
    const svc=id?serviceById(id):null
    const parts=durationParts(svc?.duration||60)
    return `<div class="modal-backdrop"><div class="modal"><div class="modal-head"><div><h3>${svc?'Editar serviço':'Novo serviço'}</h3><div class="helper">A duração define quanto tempo será bloqueado na agenda.</div></div>${close}</div><form class="form" id="serviceForm" data-service-id="${svc?.id||''}"><div class="field"><label>Segmento</label><select name="segment" required>${segmentKeys().map(k=>`<option value="${k}" ${(svc?.segment||segmentKeys()[0])===k?'selected':''}>${SEGMENTS[k].name}</option>`).join('')}</select></div><div class="field"><label>Nome do serviço</label><input name="name" required value="${esc(svc?.name||'')}" placeholder="Ex.: Selagem Premium"></div><div class="field"><label>Preço</label><input name="price" type="number" min="0" step="0.01" inputmode="decimal" value="${svc?.price??50}" required></div><div class="field"><label>Tempo reservado na agenda</label><div class="duration-picker"><select name="durationHours" id="durationHours">${[0,1,2,3,4,5,6,7,8,9,10,11,12].map(h=>`<option value="${h}" ${parts.hours===h?'selected':''}>${h}h</option>`).join('')}</select><select name="durationMinutes" id="durationMinutes">${Array.from({length:12},(_,i)=>i*5).map(m=>`<option value="${m}" ${parts.minutes===m?'selected':''}>${m} min</option>`).join('')}</select></div><div class="duration-presets"><button type="button" data-duration-preset="30">30 min</button><button type="button" data-duration-preset="45">45 min</button><button type="button" data-duration-preset="60">1h</button><button type="button" data-duration-preset="90">1h30</button><button type="button" data-duration-preset="120">2h</button><button type="button" data-duration-preset="180">3h</button></div><span class="helper" id="durationPreview">Este serviço ocupará ${formatDuration(svc?.duration||60)} da agenda.</span></div><div class="field"><label>Retorno sugerido (dias)</label><input name="returnDays" type="number" min="0" max="3650" inputmode="numeric" value="${svc?.returnDays??activeSegments()[0]?.returnDays??0}"></div><button type="submit" class="btn primary wide">${svc?'Salvar serviço':'Adicionar serviço'}</button></form></div></div>`
  }
  if(modal==='product'||(typeof modal==='string'&&modal.startsWith('productEdit:'))){
    const id=modal.includes(':')?modal.split(':')[1]:null
    const p=id?productById(id):null
    const cats=categories()
    const allCats=p?.category&&!cats.includes(p.category)?[p.category,...cats]:cats
    return `<div class="modal-backdrop"><div class="modal"><div class="modal-head"><div><h3>${p?'Editar produto':'Novo produto'}</h3>${p?.suggested?'<div class="helper">Item criado pela base sugerida — personalize livremente.</div>':''}</div>${close}</div><form class="form" id="productForm" data-product-id="${p?.id||''}"><div class="field"><label>Área</label><select name="segment"><option value="" ${!p?.segment?'selected':''}>Compartilhado pelo estabelecimento</option>${segmentKeys().map(k=>`<option value="${k}" ${p?.segment===k?'selected':''}>${SEGMENTS[k].name}</option>`).join('')}</select></div><div class="field"><label>Nome</label><input name="name" required value="${esc(p?.name||'')}"></div><div class="field"><label>Categoria</label><select name="category" required>${allCats.map(c=>`<option ${p?.category===c?'selected':''}>${esc(c)}</option>`).join('')}<option value="Outros" ${p?.category==='Outros'?'selected':''}>Outros</option></select></div><div class="row"><div class="field"><label>Estoque atual</label><input name="stock" type="number" step="0.001" inputmode="decimal" value="${p?.stock??0}" required></div><div class="field"><label>Estoque mínimo</label><input name="minStock" type="number" step="0.001" inputmode="decimal" value="${p?.minStock??0}" required></div></div><div class="row"><div class="field"><label>Unidade</label><select name="unit">${['un','ml','g','kg','L','m'].map(u=>`<option ${(p?.unit||'un')===u?'selected':''}>${u}</option>`).join('')}</select></div><div class="field"><label>Custo unitário</label><input name="cost" type="number" min="0" step="0.01" inputmode="decimal" value="${p?.cost??0}" required></div></div>${p?.suggested?'<div class="notice compact-notice">Os valores vieram zerados porque o sistema não deve adivinhar seu estoque ou custo real.</div>':''}<button class="btn primary wide">${p?'Salvar alterações':'Adicionar produto'}</button></form></div></div>`
  }
  if(typeof modal==='string'&&modal.startsWith('serviceMaterials:')){
    const id=modal.split(':')[1];const svc=serviceById(id);if(!svc)return ''
    const learned=svc._learningSuggestion
    const editorMaterials=learned?.materials?.length?learned.materials:(svc.materials||[])
    const confidence=learned?.materials?.length?Math.round(averageConfidence(learned.materials)*100):0
    const learningBanner=svc._learningLoading
      ? '<div class="notice learning-card"><strong>Aprendendo com seus serviços...</strong><span>Buscando os padrões já ensinados neste estabelecimento.</span></div>'
      : learned?.materials?.length
        ? `<div class="notice learning-card learned"><div><strong>✦ Sugestão aprendida</strong><span>Pré-preenchido com base em ${learned.learnedServices} serviço${learned.learnedServices===1?'':'s'} configurado${learned.learnedServices===1?'':'s'}${learned.lastServiceName?` • último: ${esc(learned.lastServiceName)}`:''}.</span></div><span class="pill good">${confidence}% confiança</span></div>`
        : ''
    const notice=learned?.materials?.length
      ? 'Revise a sugestão da máquina. Ao salvar, suas correções viram um novo exemplo de aprendizado.'
      : svc.materialsEstimated
        ? 'Esta é uma estimativa inicial de consumo. Ajuste, zere ou acrescente materiais. Ao salvar, o Beauty aprende com sua configuração.'
        : 'Defina quanto normalmente é usado em um atendimento. Ao salvar, o Beauty aprende este padrão.'
    return `<div class="modal-backdrop"><div class="modal modal-tall"><div class="modal-head"><div><h3>Materiais do serviço</h3><div class="helper">${esc(svc.name)} • custo calculado automaticamente</div></div>${close}</div><form class="form" id="serviceMaterialsForm" data-service-id="${svc.id}">${learningBanner}<div class="notice material-notice">${notice}</div>${materialsEditorHtml(editorMaterials,svc.segment)}<div class="material-total">Custo estimado: <strong id="materialCostPreview">${fmtMoney(materialCost(editorMaterials))}</strong></div><button class="btn primary wide">Salvar e ensinar ao Beauty</button></form></div></div>`
  }
  if(typeof modal==='string'&&modal.startsWith('appointmentMaterials:')){const id=modal.split(':')[1];const appt=state.appointments.find(a=>a.id===id);const svc=appt&&serviceById(appt.serviceId);if(!appt||!svc)return '';const mats=appt.materials?.length?appt.materials:(svc.materials||[]);return `<div class="modal-backdrop"><div class="modal modal-tall"><div class="modal-head"><div><h3>Materiais do atendimento</h3><div class="helper">${esc(appt.clientName)} • ${esc(svc.name)}</div></div>${close}</div><form class="form" id="appointmentMaterialsForm" data-appointment-id="${appt.id}"><div class="notice material-notice">${svc.materialsEstimated?'Os valores abaixo são uma estimativa inicial. Ajuste o que realmente será usado neste atendimento.':'Ajuste o que realmente será usado. A baixa no estoque acontece somente ao concluir.'}</div>${materialsEditorHtml(mats,svc.segment)}<button class="btn primary wide">Salvar materiais do atendimento</button></form></div></div>`}
  if(modal==='professional'||modal.startsWith('professionalEdit:')){
    const id=modal.includes(':')?modal.split(':')[1]:null
    const p=id?professionalById(id):null
    return `<div class="modal-backdrop"><div class="modal"><div class="modal-head"><h3>${p?'Editar profissional':'Novo profissional'}</h3>${close}</div><form class="form" id="professionalForm" data-professional-id="${p?.id||''}"><div class="field"><label>Nome</label><input name="name" required value="${esc(p?.name||'')}" placeholder="Ex.: Ana Souza"></div><div class="field"><label>Função / especialidade</label><input name="jobTitle" value="${esc(p?.jobTitle||'')}" placeholder="Ex.: Cabeleireira, Lash designer"></div><div class="row"><div class="field"><label>WhatsApp</label><input name="phone" inputmode="tel" data-mask="phone" maxlength="15" value="${esc(maskPhone(p?.phone||''))}" placeholder="(11) 99999-9999"></div><div class="field"><label>E-mail</label><input name="email" type="email" value="${esc(p?.email||'')}"></div></div><div class="field"><label>Comissão padrão</label><select name="commissionType" id="commissionType"><option value="NONE" ${p?.commissionType==='NONE'||!p?'selected':''}>Sem comissão</option><option value="PERCENT" ${p?.commissionType==='PERCENT'?'selected':''}>Percentual</option><option value="FIXED" ${p?.commissionType==='FIXED'?'selected':''}>Valor fixo</option></select></div><div class="field"><label id="commissionValueLabel">Valor da comissão</label><input name="commissionValue" id="commissionValue" type="text" inputmode="decimal" autocomplete="off" value="${esc(formatCommission(p?.commissionType||'NONE',p?.commissionValue||0))}"></div><button class="btn primary wide">${p?'Salvar alterações':'Cadastrar profissional'}</button></form></div></div>`
  }
  if(modal.startsWith('professionalServices:')){
    const p=professionalById(modal.split(':')[1]);if(!p)return ''
    const configs=Object.fromEntries((p.services||[]).map(x=>[x.serviceId,x]))
    return `<div class="modal-backdrop"><div class="modal"><div class="modal-head"><h3>Serviços de ${esc(p.name)}</h3>${close}</div><form class="form" id="professionalServicesForm" data-professional-id="${p.id}"><label class="toggle-row"><input type="checkbox" id="professionalAllServices" ${p.acceptsAllServices!==false?'checked':''}><span><strong>Atende todos os serviços</strong><small>Novos serviços também ficam disponíveis automaticamente.</small></span></label><div class="service-config-list">${state.services.filter(s=>s.active).map(s=>{const c=configs[s.id];return `<div class="service-config-row"><label class="service-check"><input type="checkbox" data-pro-service="${s.id}" ${p.acceptsAllServices!==false||c?'checked':''}><span><strong>${esc(s.name)}</strong><small>${fmtMoney(s.price)} • ${s.duration} min</small></span></label><div class="service-overrides"><input data-pro-price="${s.id}" type="number" min="0" step="0.01" inputmode="decimal" placeholder="Preço padrão" value="${c?.customPrice??''}"><input data-pro-duration="${s.id}" type="number" min="5" step="5" inputmode="numeric" placeholder="Minutos" value="${c?.customDuration??''}"></div></div>`}).join('')}</div><button type="submit" class="btn primary wide">Salvar serviços</button></form></div></div>`
  }
  if(modal.startsWith('professionalHours:')){
    const p=professionalById(modal.split(':')[1]);if(!p)return ''
    const hours=Object.fromEntries((p.workingHours||[]).map(h=>[h.weekday,h]))
    const days=[1,2,3,4,5,6,0]
    return `<div class="modal-backdrop"><div class="modal"><div class="modal-head"><h3>Jornada de ${esc(p.name)}</h3>${close}</div><form class="form" id="professionalHoursForm" data-professional-id="${p.id}"><div class="notice">Marque os dias trabalhados. Depois de salvar, a agenda só aceitará horários dentro desta jornada.</div><div class="schedule-grid">${days.map(d=>{const h=hours[d];return `<div class="day-row"><label class="day-toggle"><input type="checkbox" data-work-day="${d}" ${h?'checked':''}><strong>${DAY_LONG[d]}</strong></label><div class="day-times"><input data-work-start="${d}" type="time" value="${h?.start||'09:00'}"><span>até</span><input data-work-end="${d}" type="time" value="${h?.end||'18:00'}"></div></div>`}).join('')}</div><button type="submit" class="btn primary wide">Salvar jornada</button></form></div></div>`
  }
  if(modal.startsWith('professionalBlock:')){
    const p=professionalById(modal.split(':')[1]);if(!p)return ''
    const upcoming=(p.blocks||[]).filter(b=>new Date(b.endsAt)>new Date()).sort((a,b)=>new Date(a.startsAt)-new Date(b.startsAt))
    return `<div class="modal-backdrop"><div class="modal"><div class="modal-head"><h3>Bloquear horário</h3>${close}</div><form class="form" id="professionalBlockForm" data-professional-id="${p.id}"><p class="subtitle">${esc(p.name)}</p><div class="row"><div class="field"><label>Início</label><input name="startsAt" type="datetime-local" value="${todayISO()}T12:00" required></div><div class="field"><label>Fim</label><input name="endsAt" type="datetime-local" value="${todayISO()}T13:00" required></div></div><div class="field"><label>Motivo</label><input name="reason" placeholder="Ex.: Almoço, folga, compromisso"></div><button class="btn primary wide">Adicionar bloqueio</button></form>${upcoming.length?`<div class="section-head"><h2>Próximos bloqueios</h2></div><div class="block-list">${upcoming.map(b=>`<div class="item compact-item"><div class="item-main"><strong>${fmtDateTime(b.startsAt)} – ${new Date(b.endsAt).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</strong><div class="meta">${esc(b.reason||'Indisponível')}</div></div><button class="btn small ghost" data-delete-block="${b.id}" data-professional-id="${p.id}">Remover</button></div>`).join('')}</div>`:''}</div></div>`
  }
  if(modal==='business'){
    const a=state.establishment.address||{}
    const draftLat=businessLocationDraft?.latitude??a.latitude
    const draftLong=businessLocationDraft?.longitude??a.longitude
    const located=Number.isFinite(Number(draftLat))&&Number.isFinite(Number(draftLong))
    return `<div class="modal-backdrop"><div class="modal modal-tall business-modal"><div class="modal-head"><div><span class="eyebrow">ESTABELECIMENTO</span><h3>Perfil e localização</h3><div class="helper">Essas informações alimentam a busca pública da ZAIA.</div></div>${close}</div>
    <div class="form">
      <div class="field"><label>Nome do estabelecimento</label><input id="businessName" value="${esc(state.establishment.name)}"></div>
      <div class="field"><label>Descrição para clientes</label><textarea id="businessDescription" rows="3" placeholder="Ex.: Especialistas em cortes, tratamentos e coloração.">${esc(state.establishment.publicDescription||'')}</textarea></div>
      <div class="section-head form-section-head"><div><span class="eyebrow">ENDEREÇO</span><h2>Onde os clientes encontram você</h2></div></div>
      <div class="field"><label>CEP</label><input id="businessPostalCode" inputmode="numeric" autocomplete="postal-code" maxlength="9" value="${esc(maskPostalCode(a.postalCode||''))}" placeholder="00000-000"><span class="helper" id="businessCepStatus">Digite o CEP para preencher o endereço automaticamente.</span></div>
      <div class="field"><label>Rua / avenida</label><input id="businessStreet" value="${esc(a.street||'')}" placeholder="Rua, avenida..."></div>
      <div class="row"><div class="field"><label>Número</label><input id="businessNumber" value="${esc(a.number||'')}"></div><div class="field"><label>Complemento</label><input id="businessComplement" value="${esc(a.complement||'')}"></div></div>
      <div class="field"><label>Bairro</label><input id="businessNeighborhood" value="${esc(a.neighborhood||'')}"></div>
      <div class="row"><div class="field"><label>Cidade</label><input id="businessCity" value="${esc(a.city||'')}"></div><div class="field"><label>UF</label><input id="businessState" maxlength="2" value="${esc(a.state||'')}" placeholder="SP"></div></div>
      <input type="hidden" id="businessLat" value="${draftLat??''}"><input type="hidden" id="businessLong" value="${draftLong??''}">
      <div class="location-actions"><button type="button" class="btn" id="locateBusinessAddress">${icon('search',17)} Localizar este endereço</button><button type="button" class="btn ghost" id="useBusinessLocation">Usar localização atual <small>(opcional)</small></button></div>
      <div class="notice location-status ${located?'location-ready':''}" id="businessLocationStatus"><strong>${located?'Localização pronta para o mapa':'Localização ainda não definida'}</strong><span>${located?esc(publicAddressLabel()):'Localize o endereço antes de publicar para clientes.'}</span></div>
      <div class="section-head form-section-head"><div><span class="eyebrow">ZAIA CLIENTES</span><h2>Descoberta e agendamento</h2></div></div>
      <label class="toggle-row"><input type="checkbox" id="businessMarketplace" ${state.establishment.marketplaceEnabled?'checked':''}><span><strong>Aparecer na busca ZAIA</strong><small>Clientes poderão encontrar este estabelecimento por nome, segmento, serviço e proximidade.</small></span></label>
      <label class="toggle-row"><input type="checkbox" id="businessPublicBooking" ${state.establishment.publicBookingEnabled!==false?'checked':''}><span><strong>Aceitar agendamento online</strong><small>Horários livres são conectados diretamente à agenda da equipe.</small></span></label>
      <div class="field"><label>Segmentos ativos</label><div class="chips">${Object.entries(SEGMENTS).map(([k,x])=>`<button type="button" class="chip ${segmentKeys().includes(k)?'on':''}" data-toggle-seg="${k}">${x.icon} ${x.name}</button>`).join('')}</div><span class="helper">Os segmentos também são usados como filtros na busca dos clientes.</span></div>
      <button class="btn primary wide" id="saveBusiness">Salvar estabelecimento</button>
    </div></div></div>`
  }
  return ''
}

function bindGlobal(){
  $$('[data-page]').forEach(b=>b.onclick=()=>{page=b.dataset.page;modal=null;render()})
  $$('[data-open]').forEach(b=>b.onclick=()=>openModal(b.dataset.open))
  $$('[data-wa]').forEach(b=>b.onclick=()=>openWhatsApp(b.dataset.wa))
  $$('[data-service-edit]').forEach(b=>b.onclick=()=>openModal(`serviceEdit:${b.dataset.serviceEdit}`))
  $$('[data-service-materials]').forEach(b=>b.onclick=()=>openServiceMaterials(b.dataset.serviceMaterials))
  $$('[data-appointment-materials]').forEach(b=>b.onclick=()=>openModal(`appointmentMaterials:${b.dataset.appointmentMaterials}`))
  $$('[data-complete]').forEach(b=>b.onclick=()=>completeAppointment(b.dataset.complete,b))
  $$('[data-pro-edit]').forEach(b=>b.onclick=()=>openModal(`professionalEdit:${b.dataset.proEdit}`))
  $$('[data-pro-services]').forEach(b=>b.onclick=()=>openModal(`professionalServices:${b.dataset.proServices}`))
  $$('[data-pro-hours]').forEach(b=>b.onclick=()=>openModal(`professionalHours:${b.dataset.proHours}`))
  $$('[data-pro-block]').forEach(b=>b.onclick=()=>openModal(`professionalBlock:${b.dataset.proBlock}`))
  $$('[data-product-edit]').forEach(b=>b.onclick=()=>openModal(`productEdit:${b.dataset.productEdit}`))
  $$('[data-product-remove]').forEach(b=>b.onclick=async()=>{
    const id=b.dataset.productRemove;const p=productById(id);if(!p)return
    if(!confirm(`Remover "${p.name}" do estoque? Atendimentos já agendados preservam o histórico de material.`))return
    try{
      if(cloudEnabled()){await archiveProduct(id);await boot();return}
      state.products=state.products.filter(x=>x.id!==id)
      state.services.forEach(svc=>{svc.materials=(svc.materials||[]).filter(m=>m.productId!==id)})
      persistLocal();render()
    }catch(error){alert(`Não foi possível remover o produto. ${friendlyError(error)}`)}
  })
}
function bindPage(){
  if(page==='finance'&&!state.financeData&&!financeLoading)loadFinance()
  $('#loadFinanceNow')?.addEventListener('click',()=>{state.financeData=null;loadFinance(true)})
  document.querySelectorAll('[data-finance-range]').forEach(b=>b.onclick=()=>{
    const key=b.dataset.financeRange
    financeRange=key==='month'?{...monthRange(),preset:'month'}:{...dateRange(Number(key)),preset:key}
    state.financeData=null
    loadFinance(true)
  })
  document.querySelectorAll('[data-finance-new]').forEach(b=>b.onclick=()=>{
    modalData={kind:b.dataset.financeNew}
    openModal('financeEntry')
  })
  document.querySelectorAll('[data-finance-pay]').forEach(b=>b.onclick=()=>{
    modalData={transactionId:b.dataset.financePay}
    openModal('financePay')
  })
  document.querySelectorAll('[data-finance-cancel]').forEach(b=>b.onclick=async()=>{
    const t=(state.financeTransactions||[]).find(x=>x.id===b.dataset.financeCancel)
    if(!t||t.source!=='MANUAL')return
    if(!confirm('Cancelar este lançamento financeiro?'))return
    try{
      await updateFinanceTransaction(t.id,{status:'CANCELLED'})
      state.financeData=null
      await loadFinance(true)
    }catch(error){alert(friendlyError(error))}
  })
  $('#financeSettingsBtn')?.addEventListener('click',()=>openModal('financeSettings'))
  $('#financeNewAccount')?.addEventListener('click',()=>openModal('financeAccount'))
  document.querySelectorAll('[data-promotion-edit]').forEach(b=>b.onclick=()=>{modalData={promotionId:b.dataset.promotionEdit};openModal('promotion')})
  document.querySelectorAll('[data-promotion-delete]').forEach(b=>b.onclick=async()=>{
    if(!confirm('Excluir esta promoção?'))return
    try{await deletePromotion(b.dataset.promotionDelete);await boot()}catch(error){alert(friendlyError(error))}
  })
  $('#promotionForm')?.addEventListener('submit',async e=>{
    e.preventDefault()
    const form=e.currentTarget
    const fd=Object.fromEntries(new FormData(form))
    const payload={
      title:String(fd.title||'').trim(),
      offerText:String(fd.offerText||'').trim(),
      description:String(fd.description||'').trim(),
      serviceId:fd.serviceId||null,
      startsAt:new Date(fd.startsAt).toISOString(),
      endsAt:new Date(fd.endsAt).toISOString(),
      active:form.elements.active?.checked!==false,
    }
    if(new Date(payload.endsAt)<=new Date(payload.startsAt))return alert('A data final precisa ser posterior ao início.')
    const button=form.querySelector('button[type="submit"]');setBusy(button,true,'Salvando...')
    try{
      if(fd.id)await updatePromotion(fd.id,payload)
      else await insertPromotion(state.establishment.id,payload)
      modal=null;modalData=null;await boot()
    }catch(error){setBusy(button,false);alert(friendlyError(error))}
  })

  document.querySelectorAll('[data-cancel-appointment]').forEach(b=>b.onclick=async()=>{
    const appointment=state.appointments.find(a=>a.id===b.dataset.cancelAppointment)
    if(!appointment)return
    const reason=prompt('Motivo do cancelamento (opcional):','') ?? null
    if(reason===null)return
    if(!confirm('Cancelar este agendamento? O cliente será avisado se tiver conta ZAIA.'))return
    try{
      await cancelAppointment(appointment.id,reason)
      await boot()
    }catch(error){alert(friendlyError(error))}
  })

  $('#seedAgenda')?.addEventListener('click',seedAgenda)
  $('#notifyBtn')?.addEventListener('click',openBusinessNotifications)
  $('#notifyTopBtn')?.addEventListener('click',openBusinessNotifications)
  $('#seedStarterCatalog')?.addEventListener('click',async e=>{
    const button=e.currentTarget
    setBusy(button,true,'Adicionando...')
    try{
      const result=await seedStarterCatalog(state.establishment.id)
      await boot()
      alert(`Sugestões atualizadas. ${Number(result?.products_inserted||0)} produtos adicionados e ${Number(result?.services_seeded||0)} serviços receberam consumo estimado. Seus cadastros existentes foram preservados.`)
    }catch(error){setBusy(button,false);alert(`Não foi possível adicionar as sugestões. ${friendlyError(error)}`)}
  })
  $('#resetApp')?.addEventListener('click',()=>{if(confirm('Apagar os dados locais da demonstração?')){localStorage.removeItem(storageKey);state=emptyState();page='home';render()}})
  $('#logoutBtn')?.addEventListener('click',()=>{clearSession();state=emptyState();currentUser=null;page='home';authMessage='';render()})
}
function bindModal(){
  $('.modal-backdrop')?.addEventListener('click',e=>{if(e.target.classList.contains('modal-backdrop'))closeModal()})
  bindPhoneMasks($('.modal-backdrop')||document)

  const brandForm=$('#brandForm')
  if(brandForm){
    const enabled=$('#brandEnabled')
    const preview=$('#brandLivePreview')
    const fileInput=$('#brandLogoFile')
    const previewLogo=$('#brandPreviewLogo')
    const currentLogo=$('#brandCurrentLogo')
    const pairs=[
      ['brandPrimary','brandPrimaryHex','--preview-primary','--brand',ZAIA_COLORS.primary],
      ['brandSecondary','brandSecondaryHex','--preview-secondary','--brand-2',ZAIA_COLORS.secondary],
      ['brandAccent','brandAccentHex','--preview-accent','--champagne',ZAIA_COLORS.accent],
    ]
    const syncPair=(colorId,hexId,previewVar,rootVar,fallback,fromHex=false)=>{
      const color=$('#'+colorId),hex=$('#'+hexId)
      if(!color||!hex)return
      let value=fromHex?hex.value.trim():color.value
      if(!/^#[0-9a-f]{6}$/i.test(value)){
        if(fromHex)return
        value=fallback
      }
      color.value=value
      hex.value=value.toUpperCase()
      preview?.style.setProperty(previewVar,value)
      document.documentElement.style.setProperty(rootVar,value)
    }
    pairs.forEach(args=>{
      const [colorId,hexId]=args
      $('#'+colorId)?.addEventListener('input',()=>syncPair(...args,false))
      $('#'+hexId)?.addEventListener('input',()=>{
        const hex=$('#'+hexId)
        if(/^#[0-9a-f]{6}$/i.test(hex.value.trim()))syncPair(...args,true)
      })
      $('#'+hexId)?.addEventListener('blur',()=>syncPair(...args,true))
    })
    enabled?.addEventListener('change',()=>{
      preview?.classList.toggle('disabled-preview',!enabled.checked)
    })
    preview?.classList.toggle('disabled-preview',!enabled?.checked)

    fileInput?.addEventListener('change',()=>{
      const file=fileInput.files?.[0]
      if(!file)return
      if(!/^image\/(png|jpeg|webp|svg\+xml)$/i.test(file.type||'')){
        fileInput.value=''
        return alert('Use uma imagem PNG, JPG, WEBP ou SVG.')
      }
      if(file.size>5*1024*1024){
        fileInput.value=''
        return alert('A logo deve ter no máximo 5 MB.')
      }
      const url=URL.createObjectURL(file)
      if(previewLogo)previewLogo.innerHTML=`<img src="${url}" alt="">`
      if(currentLogo)currentLogo.innerHTML=`<img src="${url}" alt="">`
    })

    $('#brandDefaults')?.addEventListener('click',()=>{
      $('#brandPrimary').value=ZAIA_COLORS.primary
      $('#brandSecondary').value=ZAIA_COLORS.secondary
      $('#brandAccent').value=ZAIA_COLORS.accent
      pairs.forEach(args=>syncPair(...args,false))
    })

    $('#copyBrandLogin')?.addEventListener('click',async e=>{
      const value=$('#brandLoginUrl')?.value||''
      try{
        await navigator.clipboard.writeText(value)
        const b=e.currentTarget
        const old=b.textContent;b.textContent='Copiado'
        setTimeout(()=>{b.textContent=old},1400)
      }catch{
        $('#brandLoginUrl')?.select()
        document.execCommand?.('copy')
      }
    })

    brandForm.addEventListener('submit',async e=>{
      e.preventDefault()
      const button=brandForm.querySelector('button[type="submit"]')
      setBusy(button,true,'Salvando...')
      try{
        let logoUrl=state.establishment.brandLogoUrl||''
        const file=fileInput?.files?.[0]
        if(file){
          setBusy(button,true,'Enviando logo...')
          logoUrl=await uploadBrandLogo(state.establishment.id,file)
        }
        const payload={
          brandEnabled:enabled?.checked===true,
          brandLogoUrl:logoUrl,
          brandPrimaryColor:validHexColor($('#brandPrimaryHex')?.value,ZAIA_COLORS.primary),
          brandSecondaryColor:validHexColor($('#brandSecondaryHex')?.value,ZAIA_COLORS.secondary),
          brandAccentColor:validHexColor($('#brandAccentHex')?.value,ZAIA_COLORS.accent),
        }
        if(cloudEnabled())await updateEstablishment(state.establishment.id,payload)
        Object.assign(state.establishment,payload)
        cacheBusinessBrand(state.establishment)
        applyBrandTheme(state.establishment)
        modal=null;modalData=null
        if(cloudEnabled())await boot()
        else{persistLocal();render()}
      }catch(error){
        setBusy(button,false)
        alert('Não foi possível salvar a personalização. '+friendlyError(error))
      }
    })
  }

  $('#activateStorePush')?.addEventListener('click',enableNotifications)

  const financeEntryStatus=$('#financeEntryStatus')
  const financePaidFields=$('#financePaidFields')
  const syncFinancePaidFields=()=>{
    financePaidFields?.classList.toggle('is-hidden',financeEntryStatus?.value!=='PAID')
  }
  financeEntryStatus?.addEventListener('change',syncFinancePaidFields)
  syncFinancePaidFields()

  $('#financeEntryForm')?.addEventListener('submit',async e=>{
    e.preventDefault()
    const form=e.currentTarget
    const fd=Object.fromEntries(new FormData(form))
    const button=form.querySelector('button[type="submit"]')
    const amount=Number(fd.amount||0)
    if(!(amount>0))return alert('Informe um valor maior que zero.')
    setBusy(button,true,'Salvando...')
    try{
      await insertFinanceTransaction(state.establishment.id,{
        kind:fd.kind,
        category:String(fd.category||'').trim(),
        description:String(fd.description||'').trim(),
        amount,
        dueDate:fd.dueDate,
        status:fd.status,
        paymentMethod:fd.status==='PAID'?fd.paymentMethod:null,
        accountId:fd.status==='PAID'?(fd.accountId||null):null,
        notes:String(fd.notes||'').trim(),
      })
      modal=null;modalData=null
      state.financeData=null
      await loadFinance(true)
    }catch(error){setBusy(button,false);alert(friendlyError(error))}
  })

  $('#financePayForm')?.addEventListener('submit',async e=>{
    e.preventDefault()
    const form=e.currentTarget
    const fd=Object.fromEntries(new FormData(form))
    const button=form.querySelector('button[type="submit"]')
    setBusy(button,true,'Confirmando...')
    try{
      await markFinancePaid(form.dataset.transactionId,fd.paymentMethod,fd.accountId||null)
      modal=null;modalData=null
      state.financeData=null
      await loadFinance(true)
    }catch(error){setBusy(button,false);alert(friendlyError(error))}
  })

  $('#financeSettingsForm')?.addEventListener('submit',async e=>{
    e.preventDefault()
    const form=e.currentTarget
    const fd=Object.fromEntries(new FormData(form))
    const button=form.querySelector('button[type="submit"]')
    setBusy(button,true,'Salvando...')
    try{
      await saveFinanceSettings(state.establishment.id,{
        monthlyRevenueTarget:Number(fd.monthlyRevenueTarget||0),
        monthlyProfitTarget:Number(fd.monthlyProfitTarget||0),
        reserveTarget:Number(fd.reserveTarget||0),
      })
      modal=null;modalData=null
      state.financeData=null
      await loadFinance(true)
    }catch(error){setBusy(button,false);alert(friendlyError(error))}
  })

  $('#financeAccountForm')?.addEventListener('submit',async e=>{
    e.preventDefault()
    const form=e.currentTarget
    const fd=Object.fromEntries(new FormData(form))
    const button=form.querySelector('button[type="submit"]')
    const name=String(fd.name||'').trim()
    if(!name)return
    setBusy(button,true,'Criando...')
    try{
      await insertFinanceAccount(state.establishment.id,{
        name,
        type:fd.type,
        openingBalance:Number(fd.openingBalance||0),
      })
      modal=null;modalData=null
      state.financeData=null
      await loadFinance(true)
    }catch(error){setBusy(button,false);alert(friendlyError(error))}
  })

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

  const serviceForm=$('#serviceForm')
  const durationHours=$('#durationHours')
  const durationMinutes=$('#durationMinutes')
  const durationPreview=$('#durationPreview')
  const syncDurationPreview=()=>{
    if(!serviceForm||!durationPreview)return
    const mins=durationFromForm(serviceForm)
    durationPreview.textContent=mins>=5?`Este serviço ocupará ${formatDuration(mins)} da agenda.`:'Escolha pelo menos 5 minutos.'
  }
  durationHours?.addEventListener('change',syncDurationPreview)
  durationMinutes?.addEventListener('change',syncDurationPreview)
  $$('[data-duration-preset]').forEach(b=>b.onclick=()=>{
    const mins=Number(b.dataset.durationPreset)
    if(durationHours)durationHours.value=String(Math.floor(mins/60))
    if(durationMinutes)durationMinutes.value=String(mins%60)
    syncDurationPreview()
  })
  syncDurationPreview()

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
    apptMaterialsBox.innerHTML=`<div class="materials-box"><div class="materials-head"><div><strong>Materiais deste atendimento</strong><div class="helper">${svc.materialsEstimated?'Estimativa inicial do segmento. Ajuste para este atendimento se necessário.':'Pré-preenchido pelo serviço. Você pode ajustar agora.'}</div></div><span class="pill">Baixa ao concluir</span></div>${materialsEditorHtml(svc.materials||[],svc.segment)}</div>`
  }
  const clearSlots=()=>{if(slotsBox)slotsBox.innerHTML=''}
  const refreshServiceDurationHint=()=>{
    const svc=serviceById(apptService?.value)
    const pro=professionalById(apptProfessional?.value)
    const config=professionalServiceConfig(pro,svc?.id)
    const duration=Number(config?.customDuration||svc?.duration||0)
    let box=$('#appointmentDurationHint')
    if(!box&&apptProfessional){box=document.createElement('div');box.id='appointmentDurationHint';box.className='notice compact-notice';apptProfessional.closest('.field')?.after(box)}
    if(box)box.innerHTML=duration?`<strong>${esc(svc?.name||'Serviço')}</strong><span>Reserva ${formatDuration(duration)} na agenda deste profissional.</span>`:''
  }
  if(apptService){apptService.addEventListener('change',()=>{refreshProfessionals();refreshAppointmentMaterials();refreshServiceDurationHint();clearSlots()});refreshProfessionals();refreshAppointmentMaterials();refreshServiceDurationHint()}
  apptProfessional?.addEventListener('change',()=>{refreshServiceDurationHint();clearSlots()})
  apptDate?.addEventListener('change',clearSlots)
  $('#checkAvailability')?.addEventListener('click',async ()=>{
    const serviceId=apptService?.value,professionalId=apptProfessional?.value,date=apptDate?.value
    if(!serviceId||!professionalId||!date)return alert('Selecione serviço, profissional e data.')
    const pro=professionalById(professionalId)
    if(!pro?.workingHours?.length){slotsBox.innerHTML='<div class="notice compact-notice">Este profissional ainda não tem jornada configurada. Você pode informar o horário manualmente.</div>';return}
    slotsBox.innerHTML='<div class="helper">Buscando horários livres...</div>'
    try{
      const slots=cloudEnabled()?await getAvailableSlots(professionalId,serviceId,date,15):[]
      slotsBox.innerHTML=slots.length?`<div class="helper slot-caption">Horários que comportam o atendimento completo:</div><div class="slots">${slots.map(x=>`<button type="button" class="slot-chip" data-slot-time="${x.time}"><strong>${x.time}–${x.endTime}</strong><small>${formatDuration(x.durationMinutes)}</small></button>`).join('')}</div>`:'<div class="notice compact-notice">Nenhum horário livre comporta a duração completa deste serviço nesta data.</div>'
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
      const effectiveDuration=Number(config?.customDuration||s.duration||60)
      const appt={id:uid(),clientId:c.id,clientName:c.name,phone:c.phone,professionalId:f.professionalId,serviceId:f.serviceId,date:f.date,time:f.time,endTime:addMinutesToTime(f.time,effectiveDuration),durationMinutes:effectiveDuration,price:config?.customPrice??s.price,status:'AGENDADO',materials}
      if(cloudEnabled()){
        const row=await insertAppointment(state.establishment.id,appt,s);appt.id=row.id;appt.price=Number(row.price);appt.professionalId=row.professional_id;appt.startsAt=row.starts_at;appt.endsAt=row.ends_at;appt.durationMinutes=Math.round((new Date(row.ends_at)-new Date(row.starts_at))/60000);appt.endTime=addMinutesToTime(f.time,appt.durationMinutes)
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
      const f=Object.fromEntries(new FormData(e.target));const id=e.target.dataset.serviceId
      const duration=durationFromForm(e.target)
      if(duration<5||duration>720){setBusy(button,false);return alert('A duração deve ficar entre 5 minutos e 12 horas.')}
      let service={id:id||uid(),name:String(f.name||'').trim(),price:Number(f.price),duration,segment:f.segment,returnDays:Number(f.returnDays),estimatedCost:id?Number(serviceById(id)?.estimatedCost||0):0,materials:id?[...(serviceById(id)?.materials||[])]:[],active:true}
      if(cloudEnabled()){
        const row=id?await updateService(id,service):await insertService(state.establishment.id,service)
        service={...service,id:row.id,name:row.name,price:Number(row.price),duration:Number(row.duration_minutes),segment:row.segment_code,returnDays:Number(row.return_interval_days||0),estimatedCost:Number(row.estimated_cost||service.estimatedCost||0),active:row.active}
      }
      if(id){
        const idx=state.services.findIndex(x=>x.id===id)
        if(idx>=0)state.services[idx]={...state.services[idx],...service}
        persistLocal();modal=null;page='services';render()
      }else{
        state.services.push(service);persistLocal();await openServiceMaterials(service.id)
      }
    }catch(error){setBusy(button,false);alert(`Não foi possível salvar o serviço. ${friendlyError(error)}`)}
  })

  $('#productForm')?.addEventListener('submit',async e=>{
    e.preventDefault();const button=e.target.querySelector('button[type="submit"]');setBusy(button,true)
    try{
      const f=Object.fromEntries(new FormData(e.target));const id=e.target.dataset.productId
      let p={id:id||uid(),name:String(f.name||'').trim(),segment:f.segment||null,category:f.category,stock:Number(f.stock),minStock:Number(f.minStock),unit:f.unit,cost:Number(f.cost),type:'INTERNAL'}
      if(cloudEnabled()){
        const row=id?await updateProduct(id,p):await insertProduct(state.establishment.id,p)
        p={id:row.id,name:row.name,segment:row.segment_code,category:row.category,stock:Number(row.stock_quantity),minStock:Number(row.minimum_stock),unit:row.unit,cost:Number(row.unit_cost),type:row.usage_type,active:row.active,starterTemplateKey:row.starter_template_key||null,suggested:Boolean(row.starter_template_key)}
      }
      if(id){const idx=state.products.findIndex(x=>x.id===id);if(idx>=0)state.products[idx]={...state.products[idx],...p}}else state.products.push(p)
      persistLocal();modal=null;render()
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
      svc.materials=materials;svc.materialsEstimated=false;svc.estimatedCost=materialCost(materials);svc._learningSuggestion=null;persistLocal();modal=null;render()
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
    const services=acceptsAll?[]:$$('[data-pro-service]',e.target).filter(x=>x.checked).map(x=>({
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
    const hours=$$('[data-work-day]',e.target).filter(x=>x.checked).map(x=>({weekday:Number(x.dataset.workDay),start:$('[data-work-start="'+x.dataset.workDay+'"]',e.target).value,end:$('[data-work-end="'+x.dataset.workDay+'"]',e.target).value}))
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
    if(a.includes(k)){
      if(a.length===1){alert('O estabelecimento precisa manter pelo menos um segmento ativo.');return}
      a.splice(a.indexOf(k),1);b.classList.remove('on')
    }else{
      a.push(k);b.classList.add('on')
    }
  })

  const businessCep=$('#businessPostalCode')
  let lastCepLookup=''
  const invalidateBusinessLocation=()=>{
    businessLocationDraft=null
    if($('#businessLat'))$('#businessLat').value=''
    if($('#businessLong'))$('#businessLong').value=''
    const box=$('#businessLocationStatus')
    if(box){
      box.classList.remove('location-ready')
      box.innerHTML='<strong>Endereço alterado</strong><span>Ao salvar, a ZAIA localizará novamente o ponto no mapa.</span>'
    }
  }
  const fillAddressFromCep=async()=>{
    const cep=normalizePostalCode(businessCep?.value)
    if(cep.length!==8||cep===lastCepLookup)return
    lastCepLookup=cep
    const status=$('#businessCepStatus')
    if(status)status.textContent='Buscando endereço...'
    try{
      const data=await lookupPostalCode(cep)
      if(businessCep)businessCep.value=data.postalCode
      if($('#businessStreet'))$('#businessStreet').value=data.street
      if($('#businessNeighborhood'))$('#businessNeighborhood').value=data.neighborhood
      if($('#businessCity'))$('#businessCity').value=data.city
      if($('#businessState'))$('#businessState').value=data.state
      invalidateBusinessLocation()
      if(status)status.textContent='Endereço preenchido. Informe o número; ao salvar, a ZAIA localizará o ponto no mapa.'
      $('#businessNumber')?.focus()
    }catch(error){
      lastCepLookup=''
      if(status)status.textContent=friendlyError(error)
    }
  }
  businessCep?.addEventListener('input',()=>{
    businessCep.value=maskPostalCode(businessCep.value)
    if(normalizePostalCode(businessCep.value).length===8)fillAddressFromCep()
  })
  businessCep?.addEventListener('blur',fillAddressFromCep)

  ;['businessStreet','businessNumber','businessNeighborhood','businessCity','businessState'].forEach(id=>{
    $('#'+id)?.addEventListener('input',invalidateBusinessLocation)
  })

  $('#locateBusinessAddress')?.addEventListener('click',async e=>{
    const button=e.currentTarget;setBusy(button,true,'Localizando...')
    try{
      const found=await locateAddressByText({
        street:$('#businessStreet')?.value.trim(),
        number:$('#businessNumber')?.value.trim(),
        neighborhood:$('#businessNeighborhood')?.value.trim(),
        city:$('#businessCity')?.value.trim(),
        state:$('#businessState')?.value.trim(),
      })
      businessLocationDraft={latitude:found.latitude,longitude:found.longitude,displayName:found.displayName}
      $('#businessLat').value=found.latitude
      $('#businessLong').value=found.longitude
      const box=$('#businessLocationStatus')
      if(box){box.classList.add('location-ready');box.innerHTML='<strong>Localização encontrada</strong><span>'+esc(found.displayName)+'</span>'}
    }catch(error){alert(friendlyError(error))}
    finally{setBusy(button,false)}
  })

  $('#useBusinessLocation')?.addEventListener('click',e=>{
    const button=e.currentTarget
    if(!navigator.geolocation)return alert('Este navegador não permite acesso à localização.')
    setBusy(button,true,'Localizando...')
    navigator.geolocation.getCurrentPosition(pos=>{
      businessLocationDraft={latitude:pos.coords.latitude,longitude:pos.coords.longitude,displayName:'Localização atual do estabelecimento'}
      $('#businessLat').value=pos.coords.latitude
      $('#businessLong').value=pos.coords.longitude
      const box=$('#businessLocationStatus')
      if(box){box.classList.add('location-ready');box.innerHTML='<strong>Localização capturada</strong><span>O ponto do estabelecimento está pronto para aparecer no mapa.</span>'}
      setBusy(button,false)
    },err=>{
      setBusy(button,false)
      alert(err.code===1?'Permissão de localização não concedida. Você pode preencher o endereço e usar “Localizar este endereço”.':'Não foi possível obter a localização.')
    },{enableHighAccuracy:true,timeout:12000,maximumAge:60000})
  })

  $('#saveBusiness')?.addEventListener('click',async e=>{
    const button=e.currentTarget;setBusy(button,true)
    const name=$('#businessName').value.trim()||state.establishment.name
    const address={
      street:$('#businessStreet')?.value.trim()||'',
      number:$('#businessNumber')?.value.trim()||'',
      complement:$('#businessComplement')?.value.trim()||'',
      neighborhood:$('#businessNeighborhood')?.value.trim()||'',
      city:$('#businessCity')?.value.trim()||'',
      state:($('#businessState')?.value.trim()||'').toUpperCase(),
      postalCode:maskPostalCode($('#businessPostalCode')?.value.trim()||''),
      latitude:businessLocationDraft?.latitude??($('#businessLat')?.value===''?null:Number($('#businessLat').value)),
      longitude:businessLocationDraft?.longitude??($('#businessLong')?.value===''?null:Number($('#businessLong').value)),
    }
    const marketplaceEnabled=$('#businessMarketplace')?.checked===true
    const publicBookingEnabled=$('#businessPublicBooking')?.checked!==false
    const publicDescription=$('#businessDescription')?.value.trim()||''

    if(marketplaceEnabled&&!(address.street&&address.number&&address.city&&address.state)){
      setBusy(button,false)
      return alert('Para aparecer na busca ZAIA, preencha rua, número, cidade e UF.')
    }

    if(marketplaceEnabled&&!(Number.isFinite(Number(address.latitude))&&Number.isFinite(Number(address.longitude)))){
      try{
        setBusy(button,true,'Localizando e salvando...')
        const found=await locateAddressByText(address)
        address.latitude=found.latitude
        address.longitude=found.longitude
        businessLocationDraft={latitude:found.latitude,longitude:found.longitude,displayName:found.displayName}
        if($('#businessLat'))$('#businessLat').value=found.latitude
        if($('#businessLong'))$('#businessLong').value=found.longitude
      }catch(error){
        setBusy(button,false)
        return alert('O endereço está preenchido, mas não conseguimos localizar o ponto no mapa. Revise o endereço e tente novamente.')
      }
    }

    try{
      if(cloudEnabled()){
        await updateEstablishment(state.establishment.id,{name,address,marketplaceEnabled,publicBookingEnabled,publicDescription})
        await setSegments(state.establishment.id,state.establishment.segments)
        businessLocationDraft=null
        modal=null;await boot();return
      }
      Object.assign(state.establishment,{name,address,marketplaceEnabled,publicBookingEnabled,publicDescription})
      businessLocationDraft=null
      persistLocal();modal=null;render()
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
  if(state.establishment?.planCode!=='PRO'){
    await openBusinessNotifications()
    return
  }
  if(!('Notification' in window)||!('serviceWorker' in navigator)||!('PushManager' in window)){
    return alert('Este navegador não oferece suporte a notificações Push.')
  }
  try{
    const permission=await Notification.requestPermission()
    if(permission!=='granted')return alert('Permissão de notificações não concedida.')
    const registration=await navigator.serviceWorker.ready
    let subscription=await registration.pushManager.getSubscription()
    if(!subscription){
      const publicKey=await getZaiaPushPublicKey()
      subscription=await registration.pushManager.subscribe({
        userVisibleOnly:true,
        applicationServerKey:urlBase64ToUint8Array(publicKey),
      })
    }
    const json=subscription.toJSON()
    await businessRegisterPush(state.establishment.id,{
      endpoint:json.endpoint,
      keys:json.keys,
    })
    state.notificationsEnabled=true
    businessPushState=await businessPushStatus(state.establishment.id)
    await sendBusinessPushTest(state.establishment.id)
    await loadBusinessNotifications()
    render()
  }catch(error){
    alert(friendlyError(error))
  }
}

if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(()=>{}))}
boot()
