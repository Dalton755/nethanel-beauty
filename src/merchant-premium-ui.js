const UI_VERSION='20261003-merchant-premium-v1'
let uiScheduled=false

const q=(s,r=document)=>r.querySelector(s)
const qa=(s,r=document)=>[...r.querySelectorAll(s)]
const text=(el)=>String(el?.textContent||'').trim()
const moneyToNumber=(v)=>Number(String(v||'').replace(/[^0-9,.-]/g,'').replace(/\./g,'').replace(',','.'))||0
const brl=(n)=>Number(n||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})
const todayLabel=()=>new Date().toLocaleDateString('pt-BR',{weekday:'short',day:'2-digit',month:'long',year:'numeric'}).replace(/^./,m=>m.toUpperCase())
const greeting=()=>{const h=new Date().getHours();return h<12?'Bom dia, equipe!':h<18?'Boa tarde, equipe!':'Boa noite, equipe!'}

function markShell(){
  const shell=q('.shell')
  if(shell)shell.classList.add('premium-merchant-ui')
}

function currentPage(content){
  if(!content)return ''
  if(q('.dashboard-hero',content))return 'home'
  const title=text(q('h1.title',content)).toLowerCase()
  if(title==='agenda')return 'agenda'
  if(title==='clientes')return 'clients'
  if(title.includes('produtos & estoque'))return 'inventory'
  if(q('.finance-heading',content)||title.includes('números')||title.includes('financeiro'))return 'finance'
  if(title==='serviços')return 'services'
  return 'other'
}

function enhanceHome(content){
  content.dataset.premiumPage='home'
  const hero=q('.dashboard-hero',content)
  if(hero&&!hero.dataset.premium){
    hero.dataset.premium='1'
    const eyebrow=q('.eyebrow',hero),title=q('.title',hero),sub=q('.subtitle',hero)
    if(eyebrow)eyebrow.textContent=greeting().toUpperCase()
    if(title)title.innerHTML='Seu negócio <span class="premium-hero-accent">em boas mãos</span>'
    if(sub)sub.textContent='Organize, atenda e fidelize mais clientes.'
    hero.classList.add('premium-home-hero')
  }

  q('.pro-highlight',content)?.remove()

  const grid=q('.dashboard-grid',content)
  if(grid&&!grid.dataset.premium){
    grid.dataset.premium='1'
    const agenda=q('.agenda-panel',grid)
    const side=q('.dashboard-side',grid)
    const quick=side?.querySelector('.dashboard-panel:not(.pro-highlight)')
    if(quick&&agenda){
      quick.classList.add('premium-quick-panel')
      const quickWrap=q('.zaia-quick',quick)
      if(quickWrap&&!q('[data-page="finance"]',quickWrap)){
        const b=document.createElement('button')
        b.className='quick-action'
        b.dataset.page='finance'
        b.innerHTML='<span class="premium-quick-symbol">R$</span><span>Financeiro</span>'
        quickWrap.appendChild(b)
      }
      grid.insertBefore(quick,agenda)
    }
    side?.remove()
  }

  const ops=q('#zaiaOpsPanel')
  if(ops){
    const quiet=/opera[cç][aã]o sob controle/i.test(text(ops))||/nenhuma a[cç][aã]o urgente/i.test(text(ops))
    ops.classList.toggle('premium-ops-quiet',quiet)
  }

  const ratingRoot=q('#zaiaBusinessRatingsHome')
  if(ratingRoot)ratingRoot.classList.add('premium-home-rating')
}

function agendaOverview(content){
  if(q('#premiumAgendaOverview',content))return
  const items=qa('.appointment-item',content)
  const total=items.length
  const completed=items.filter(i=>/conclu[ií]do/i.test(text(i))).length
  const inProgress=items.filter(i=>/em atendimento|em andamento/i.test(text(i))).length
  const pending=Math.max(0,total-completed-inProgress)
  let revenue=0
  items.forEach(i=>{
    const m=text(i).match(/R\$\s*[\d.]+,\d{2}/)
    if(m)revenue+=moneyToNumber(m[0])
  })
  const box=document.createElement('section')
  box.id='premiumAgendaOverview'
  box.className='premium-agenda-overview'
  box.innerHTML=`<div class="premium-page-heading"><div><span class="eyebrow">OPERAÇÃO</span><h1>Agenda</h1><p>${todayLabel()}</p></div><button class="premium-date-button" type="button" data-agenda-filter="all">Ver todas as datas ›</button></div><div class="premium-kpis"><article><span>Atendimentos</span><strong>${total}</strong><small>${completed} concluído${completed===1?'':'s'}</small></article><article><span>Receita prevista</span><strong>${brl(revenue)}</strong><small>horários exibidos</small></article><article><span>Em andamento</span><strong>${inProgress}</strong><small>${inProgress?'atenção agora':'nenhum agora'}</small></article><article><span>Pendentes</span><strong>${pending}</strong><small>${pending?'acompanhar':'tudo em dia'}</small></article></div><div class="premium-filter-row" role="tablist"><button class="on" data-agenda-filter="all">Todos (${total})</button><button data-agenda-filter="completed">Concluídos (${completed})</button><button data-agenda-filter="progress">Em andamento (${inProgress})</button><button data-agenda-filter="pending">Pendentes (${pending})</button></div>`
  const eyebrow=q(':scope > .eyebrow',content)
  const title=q(':scope > h1.title',content)
  const subtitle=q(':scope > p.subtitle',content)
  ;[eyebrow,title,subtitle].forEach(el=>el&&(el.style.display='none'))
  const toolbar=q(':scope > .toolbar',content)
  content.insertBefore(box,toolbar||content.firstChild)
}

function enhanceAgenda(content){
  content.dataset.premiumPage='agenda'
  agendaOverview(content)
  q('#zaiaOpsPanel')?.classList.add('premium-agenda-ops')
  qa('.appointment-item',content).forEach(item=>item.classList.add('premium-appointment-card'))
}

function clientsTools(content){
  if(q('#premiumClientTools',content))return
  const tools=document.createElement('section')
  tools.id='premiumClientTools'
  tools.className='premium-client-tools'
  tools.innerHTML='<label class="premium-search"><span>⌕</span><input id="premiumClientSearch" placeholder="Buscar por nome, telefone ou serviço..." autocomplete="off"></label><div class="premium-filter-row"><button class="on" data-client-filter="all">Todos</button><button data-client-filter="rated">Com avaliação</button><button data-client-filter="whatsapp">Com WhatsApp</button></div>'
  const toolbar=q(':scope > .toolbar',content)
  content.insertBefore(tools,toolbar||q('.section-head',content)||content.firstChild)
}

function decorateClientCards(content){
  qa('.client-card',content).forEach(card=>{
    card.classList.add('premium-client-card')
    const main=q('.item-main',card)
    if(main&&!q('.premium-client-avatar',card)){
      const name=text(q('strong',main))||'Cliente'
      const initials=name.split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase()
      const avatar=document.createElement('div')
      avatar.className='premium-client-avatar'
      avatar.textContent=initials||'C'
      card.insertBefore(avatar,main)
    }
  })
}

function enhanceClients(content){
  content.dataset.premiumPage='clients'
  const title=q('h1.title',content)
  if(title)title.textContent='Seus clientes'
  clientsTools(content)
  decorateClientCards(content)
  const intro=q('#zaiaBusinessRatingsClients')
  if(intro)intro.classList.add('premium-client-rating-root')
}

function parseInventoryItem(item){
  const meta=text(q('.meta',item))
  const stock=moneyToNumber((meta.match(/^\s*([\d.,]+)/)||[])[1])
  const min=moneyToNumber((meta.match(/m[ií]nimo\s*([\d.,]+)/i)||[])[1])
  const cost=moneyToNumber((meta.match(/custo\s*R\$\s*([\d.,]+)/i)||[])[1])
  return {stock,min,cost,out:stock<=0,low:min>0&&stock<=min}
}

function inventoryOverview(content){
  if(q('#premiumInventoryOverview',content))return
  const items=qa('.inventory-item',content)
  let out=0,low=0,value=0
  items.forEach(item=>{const p=parseInventoryItem(item);if(p.out)out++;if(p.low)low++;value+=p.stock*p.cost})
  const wrap=document.createElement('section')
  wrap.id='premiumInventoryOverview'
  wrap.className='premium-inventory-overview'
  wrap.innerHTML=`<div class="premium-kpis inventory"><article><span>Total de itens</span><strong>${items.length}</strong></article><article class="warn"><span>Em falta</span><strong>${out}</strong></article><article class="danger"><span>Abaixo do mínimo</span><strong>${low}</strong></article><article class="value"><span>Valor em estoque</span><strong>${brl(value)}</strong></article></div><div class="premium-inventory-tools"><div class="premium-filter-row"><button class="on" data-stock-filter="all">Todos (${items.length})</button><button data-stock-filter="out">Em falta (${out})</button><button data-stock-filter="low">Abaixo do mínimo (${low})</button></div><label class="premium-search"><span>⌕</span><input id="premiumStockSearch" placeholder="Buscar produto..." autocomplete="off"></label></div>`
  const toolbar=q(':scope > .toolbar',content)
  const notice=q(':scope > .starter-notice',content)
  const anchor=notice||toolbar
  anchor?.insertAdjacentElement('afterend',wrap)
}

function decorateInventory(content){
  qa('.inventory-item',content).forEach(item=>{
    const p=parseInventoryItem(item)
    item.classList.add('premium-inventory-item')
    item.classList.toggle('is-out',p.out)
    item.classList.toggle('is-low',p.low&&!p.out)
    const main=q('.item-main',item)
    if(main&&!q('.premium-product-icon',item)){
      const icon=document.createElement('div')
      icon.className='premium-product-icon'
      icon.innerHTML='<span>◇</span>'
      item.insertBefore(icon,main)
    }
  })
}

function enhanceInventory(content){
  content.dataset.premiumPage='inventory'
  inventoryOverview(content)
  decorateInventory(content)
}

function enhanceFinance(content){
  content.dataset.premiumPage='finance'
  const heading=q('.finance-heading',content)
  if(heading&&!heading.dataset.premium){
    heading.dataset.premium='1'
    const eyebrow=q('.eyebrow',heading),title=q('.title',heading),sub=q('.subtitle',heading)
    if(eyebrow)eyebrow.textContent='FINANCEIRO'
    if(title)title.textContent='Caixa & financeiro'
    if(sub)sub.textContent='Controle entradas, saídas, previsões e rentabilidade de forma simples.'
  }
  const kpis=q('.finance-kpis',content)
  if(kpis&&!q('#premiumFinanceActions',content)){
    const actions=document.createElement('div')
    actions.id='premiumFinanceActions'
    actions.className='premium-finance-actions'
    actions.innerHTML='<button class="btn primary" data-finance-new="EXPENSE">+ Nova despesa</button><button class="btn" data-finance-new="INCOME">Registrar receita</button><button class="btn" data-ui-account>Nova conta</button>'
    kpis.insertAdjacentElement('afterend',actions)
  }
}

function applyEnhancements(){
  uiScheduled=false
  if(!location.pathname.startsWith('/loja'))return
  markShell()
  const content=q('.content')
  if(!content)return
  const page=currentPage(content)
  if(page==='home')enhanceHome(content)
  else if(page==='agenda')enhanceAgenda(content)
  else if(page==='clients')enhanceClients(content)
  else if(page==='inventory')enhanceInventory(content)
  else if(page==='finance')enhanceFinance(content)
  else content.dataset.premiumPage=page
}

function schedule(){if(uiScheduled)return;uiScheduled=true;requestAnimationFrame(applyEnhancements)}

function setFilterButtons(target){
  const parent=target.parentElement
  parent?.querySelectorAll('button').forEach(b=>b.classList.toggle('on',b===target))
}

function filterAgenda(kind){
  const content=q('.content')
  qa('.agenda-list > div',content).forEach(group=>{
    const item=q('.appointment-item',group);if(!item)return
    const t=text(item)
    let show=true
    if(kind==='completed')show=/conclu[ií]do/i.test(t)
    if(kind==='progress')show=/em atendimento|em andamento/i.test(t)
    if(kind==='pending')show=!/conclu[ií]do|cancelado|em atendimento|em andamento/i.test(t)
    group.hidden=!show
  })
}

function filterClients(kind,query=''){
  qa('.client-card').forEach(card=>{
    const t=text(card).toLocaleLowerCase('pt-BR')
    let show=!query||t.includes(query)
    if(kind==='rated')show=show&&/avalia[cç][aã]o.*★|editar avalia[cç][aã]o/i.test(t)
    if(kind==='whatsapp')show=show&&/whatsapp/i.test(t)
    card.hidden=!show
  })
}

function filterStock(kind,query=''){
  qa('.inventory-item').forEach(item=>{
    const p=parseInventoryItem(item),t=text(item).toLocaleLowerCase('pt-BR')
    let show=!query||t.includes(query)
    if(kind==='out')show=show&&p.out
    if(kind==='low')show=show&&p.low
    item.hidden=!show
  })
}

document.addEventListener('click',e=>{
  const agenda=e.target.closest('[data-agenda-filter]')
  if(agenda){setFilterButtons(agenda);filterAgenda(agenda.dataset.agendaFilter);return}
  const cf=e.target.closest('[data-client-filter]')
  if(cf){setFilterButtons(cf);filterClients(cf.dataset.clientFilter,String(q('#premiumClientSearch')?.value||'').trim().toLocaleLowerCase('pt-BR'));return}
  const sf=e.target.closest('[data-stock-filter]')
  if(sf){setFilterButtons(sf);filterStock(sf.dataset.stockFilter,String(q('#premiumStockSearch')?.value||'').trim().toLocaleLowerCase('pt-BR'));return}
  const account=e.target.closest('[data-ui-account]')
  if(account){q('#financeNewAccount')?.click();return}
})

document.addEventListener('input',e=>{
  if(e.target.id==='premiumClientSearch'){
    const active=q('[data-client-filter].on')?.dataset.clientFilter||'all'
    filterClients(active,e.target.value.trim().toLocaleLowerCase('pt-BR'))
  }
  if(e.target.id==='premiumStockSearch'){
    const active=q('[data-stock-filter].on')?.dataset.stockFilter||'all'
    filterStock(active,e.target.value.trim().toLocaleLowerCase('pt-BR'))
  }
})

new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true})
window.addEventListener('focus',schedule)
window.addEventListener('pageshow',schedule)
window.addEventListener('zaia:operational-refresh',schedule)
setTimeout(schedule,250)
console.info('ZAIA premium merchant UI',UI_VERSION)
