const VERSION='20261003-client-premium-v1'
let scheduled=false
let agendaOpened=false
let successRedirecting=false

const q=(s,r=document)=>r.querySelector(s)
const qa=(s,r=document)=>[...r.querySelectorAll(s)]
const txt=e=>String(e?.textContent||'').trim()

function bookingSnapshot(){
  const success=q('.client-success')
  if(!success)return null
  const card=q('.success-card',success)
  if(!card)return null
  const store=txt(q('.success-card strong',success))
  const service=txt(q('.success-card small',success))
  const rows=qa('.summary-row',success)
  const byLabel={}
  rows.forEach(r=>{const label=txt(r.querySelector('span')).toLowerCase();byLabel[label]=txt(r.querySelector('strong'))})
  return {store,service,date:byLabel.data||'',time:byLabel['horário']||'',createdAt:Date.now()}
}

function handleSuccess(){
  const success=q('.client-success')
  if(!success||successRedirecting||success.dataset.premiumHandled)return false
  success.dataset.premiumHandled='1'
  document.body.classList.add('client-premium-ui')
  const snap=bookingSnapshot()
  if(snap)sessionStorage.setItem('zaia:last-booking',JSON.stringify(snap))
  const kicker=q('.client-kicker',success),h1=q('h1',success),p=q('p',success)
  if(kicker)kicker.textContent='AGENDAMENTO CONFIRMADO'
  if(h1)h1.textContent='Tudo certo! Seu horário está reservado.'
  if(p)p.textContent='Já estamos abrindo sua agenda com os detalhes do atendimento.'
  const note=document.createElement('div')
  note.className='premium-success-forward'
  note.innerHTML='<span></span><strong>Abrindo sua agenda...</strong>'
  q('.success-card',success)?.insertAdjacentElement('afterend',note)
  successRedirecting=true
  setTimeout(()=>location.replace('/cliente?tab=agenda&novo=1'),900)
  return true
}

function openRequestedTab(){
  const params=new URLSearchParams(location.search)
  if(params.get('tab')!=='agenda'||agendaOpened)return
  const btn=q('[data-client-tab="agenda"]')
  if(!btn)return
  agendaOpened=true
  btn.click()
}

function decorateSearch(){
  const main=q('.client-main')
  if(!main)return
  document.body.classList.add('client-premium-ui')
  main.classList.add('premium-client-main')
  const hero=q('.client-hero',main)
  if(hero&&!hero.dataset.premium){
    hero.dataset.premium='1'
    const h=q('h1',hero),p=q('p',hero)
    if(h)h.innerHTML='Seu próximo cuidado <span>começa aqui.</span>'
    if(p)p.textContent='Encontre estabelecimentos, compare serviços e agende em poucos toques.'
  }
  qa('.client-store-card',main).forEach(card=>card.classList.add('premium-store-card'))
  q('.client-results-wrap',main)?.classList.add('premium-results-wrap')
}

function addAgendaJourney(main){
  if(q('#premiumAgendaJourney',main))return
  const head=q('.client-account-head',main)
  if(!head)return
  const flow=document.createElement('div')
  flow.id='premiumAgendaJourney'
  flow.className='premium-agenda-journey'
  flow.innerHTML='<div class="done"><i>✓</i><span>Agendado</span></div><b></b><div><i>1</i><span>A caminho</span></div><b></b><div><i>2</i><span>Cheguei</span></div><b></b><div><i>3</i><span>Atendimento</span></div>'
  head.insertAdjacentElement('afterend',flow)
}

function highlightBooked(main){
  const params=new URLSearchParams(location.search)
  if(params.get('novo')!=='1')return
  let snap=null
  try{snap=JSON.parse(sessionStorage.getItem('zaia:last-booking')||'null')}catch{}
  const cards=qa('.client-account-card',main)
  if(!cards.length)return
  let target=cards[0]
  if(snap?.store||snap?.service){
    target=cards.find(c=>{
      const t=txt(c).toLowerCase()
      return (!snap.store||t.includes(String(snap.store).toLowerCase()))&&(!snap.service||t.includes(String(snap.service).toLowerCase()))
    })||cards[0]
  }
  if(target&&!target.classList.contains('premium-just-booked')){
    target.classList.add('premium-just-booked')
    const badge=document.createElement('div')
    badge.className='premium-booked-badge'
    badge.textContent='✓ Agendado agora'
    target.prepend(badge)
    target.scrollIntoView({behavior:'smooth',block:'center'})
  }
  if(!q('#premiumBookingToast')){
    const toast=document.createElement('div')
    toast.id='premiumBookingToast'
    toast.className='premium-booking-toast'
    toast.innerHTML='<span>✓</span><div><strong>Agendamento confirmado</strong><small>Seu horário já está salvo na agenda.</small></div>'
    document.body.appendChild(toast)
    setTimeout(()=>toast.classList.add('show'),50)
    setTimeout(()=>{toast.classList.remove('show');setTimeout(()=>toast.remove(),250)},3400)
  }
  history.replaceState({},'', '/cliente?tab=agenda')
}

function decorateAccount(){
  const main=q('.client-account-main')
  if(!main)return
  document.body.classList.add('client-premium-ui')
  main.classList.add('premium-client-account')
  const active=qa('.client-bottom-nav button').find(b=>b.classList.contains('active'))?.dataset.clientTab
  if(active==='agenda'){
    main.dataset.premiumTab='agenda'
    const head=q('.client-account-head',main)
    if(head&&!head.dataset.premium){
      head.dataset.premium='1'
      const h=q('h1',head),p=q('p',head)
      if(h)h.textContent='Sua agenda'
      if(p)p.textContent='Acompanhe seu próximo atendimento do agendamento até a conclusão.'
    }
    addAgendaJourney(main)
    qa('.client-account-card',main).forEach(c=>c.classList.add('premium-appointment-client-card'))
    q('#zaiaCustomerOps',main)?.classList.add('premium-customer-ops')
    highlightBooked(main)
  }else{
    main.dataset.premiumTab=active||'other'
    qa('.client-account-card',main).forEach(c=>c.classList.add('premium-appointment-client-card'))
  }
}

function decorateStore(){
  const storeMain=q('.client-store-page, .client-store-shell, .client-store-view')
  const fallback=q('.client-app .client-store-hero')
  if(!storeMain&&!fallback)return
  document.body.classList.add('client-premium-ui')
  const root=storeMain||fallback.closest('main')||fallback.parentElement
  root?.classList.add('premium-store-page')
}

function apply(){
  scheduled=false
  if(!location.pathname.startsWith('/cliente'))return
  document.body.classList.add('client-premium-ui')
  if(handleSuccess())return
  openRequestedTab()
  decorateSearch()
  decorateAccount()
  decorateStore()
  q('.client-bottom-nav')?.classList.add('premium-client-nav')
  q('.client-top')?.classList.add('premium-client-top')
}

function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(apply)}

new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true})
window.addEventListener('pageshow',schedule)
window.addEventListener('focus',schedule)
window.addEventListener('zaia:customer-refresh',()=>setTimeout(schedule,120))
setTimeout(schedule,120)
console.info('ZAIA customer premium UI',VERSION)
