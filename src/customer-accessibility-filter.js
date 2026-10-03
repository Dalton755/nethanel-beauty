const cfg=()=>window.BEAUTY_CONFIG||{}
const baseUrl=()=>String(cfg().supabaseUrl||'').replace(/\/$/,'')
const apiKey=()=>cfg().supabasePublishableKey||''
const schema=()=>cfg().schema||'beleza'
const FILTER_KEY='zaia_customer_accessible_only_v1'
const statusCache=new Map()
let busy=false
let refreshTimer=null

const q=(s,r=document)=>r.querySelector(s)
const qa=(s,r=document)=>[...r.querySelectorAll(s)]

function injectStyles(){
  if(q('#zaiaAccessibilityFilterStyles'))return
  const style=document.createElement('style')
  style.id='zaiaAccessibilityFilterStyles'
  style.textContent=`
    .zaia-accessibility-filter-chip{display:inline-flex!important;align-items:center;gap:7px}
    .zaia-accessibility-filter-chip .zaia-wheelchair{font-size:16px;line-height:1;color:var(--brand,#3b172b)}
    .zaia-accessibility-filter-chip.on .zaia-wheelchair{color:inherit}
    .zaia-accessible-result-badge{display:inline-flex;align-items:center;gap:5px;flex:0 0 auto;margin-left:auto;border:1px solid #cfe8d7;background:#eef8f1;color:#256c42;border-radius:999px;padding:5px 8px;font-size:10px;font-weight:900;line-height:1.1;white-space:nowrap}
    .zaia-accessible-result-badge .zaia-wheelchair{font-size:13px;line-height:1}
    .client-store-name{gap:8px;align-items:flex-start}
    .zaia-accessibility-empty{margin:14px 0;border:1px dashed var(--line,#eadfda);border-radius:18px;padding:22px 16px;text-align:center;background:#fffdfb;color:var(--muted,#837479);font-size:13px;line-height:1.5}
    .zaia-accessibility-empty strong{display:block;color:var(--ink,#24171d);font-size:15px;margin-bottom:4px}
    @media(max-width:560px){
      .zaia-accessible-result-badge{font-size:9px;padding:5px 7px}
      .client-store-name>strong{min-width:0}
    }
  `
  document.head.appendChild(style)
}

function isActive(){return sessionStorage.getItem(FILTER_KEY)==='1'}
function setActive(value){
  if(value)sessionStorage.setItem(FILTER_KEY,'1')
  else sessionStorage.removeItem(FILTER_KEY)
}

async function fetchStatuses(ids){
  const missing=ids.filter(id=>id&&!statusCache.has(id))
  if(!missing.length)return
  if(!baseUrl()||!apiKey())return
  const res=await fetch(`${baseUrl()}/rest/v1/rpc/public_accessibility_status`,{
    method:'POST',
    headers:{apikey:apiKey(),'Content-Type':'application/json','Accept-Profile':schema(),'Content-Profile':schema()},
    body:JSON.stringify({p_establishment_ids:missing}),
  })
  const text=await res.text()
  let data=[]
  try{data=text?JSON.parse(text):[]}catch{data=[]}
  if(!res.ok)throw new Error(data?.message||data?.hint||`Erro ${res.status}`)
  for(const row of data||[])statusCache.set(String(row.id),row.accessible===true)
  for(const id of missing)if(!statusCache.has(id))statusCache.set(id,false)
}

function ensureFilterChip(){
  const filters=q('.client-filters')
  if(!filters)return null
  const chipRow=q('.client-chips',filters)
  if(!chipRow)return null
  let button=q('#clientAccessibilityFilter',chipRow)
  if(!button){
    button=document.createElement('button')
    button.id='clientAccessibilityFilter'
    button.type='button'
    button.className='zaia-accessibility-filter-chip'
    button.innerHTML='<span class="zaia-wheelchair" aria-hidden="true">♿</span><span>Acessível</span>'
    button.addEventListener('click',()=>{
      setActive(!isActive())
      applyVisibility()
    })
    chipRow.appendChild(button)
  }
  const active=isActive()
  button.classList.toggle('on',active)
  button.setAttribute('aria-pressed',active?'true':'false')
  button.title=active?'Mostrar todos os estabelecimentos':'Mostrar apenas estabelecimentos acessíveis'
  return button
}

function addBadges(){
  for(const card of qa('.client-store-card[data-store]')){
    const id=String(card.dataset.store||'')
    const nameRow=q('.client-store-name',card)
    if(!nameRow)continue
    const existing=q('.zaia-accessible-result-badge',nameRow)
    if(statusCache.get(id)===true){
      if(!existing){
        const badge=document.createElement('span')
        badge.className='zaia-accessible-result-badge'
        badge.innerHTML='<span class="zaia-wheelchair" aria-hidden="true">♿</span><span>Acessível</span>'
        badge.setAttribute('aria-label','Estabelecimento com acessibilidade')
        nameRow.appendChild(badge)
      }
    }else existing?.remove()
  }
}

function updateEmptyMessage(visible,total){
  const results=q('.client-results')
  if(!results)return
  let empty=q('#zaiaAccessibilityEmpty',results)
  if(isActive()&&total>0&&visible===0){
    if(!empty){
      empty=document.createElement('div')
      empty.id='zaiaAccessibilityEmpty'
      empty.className='zaia-accessibility-empty'
      empty.innerHTML='<strong>Nenhum estabelecimento acessível encontrado.</strong>Tente remover outros filtros ou ampliar sua busca.'
      results.appendChild(empty)
    }
  }else empty?.remove()
}

function updateResultCount(visible){
  const count=q('.client-results .client-section-title b')
  if(count)count.textContent=String(visible)
}

function applyVisibility(){
  const active=isActive()
  const button=q('#clientAccessibilityFilter')
  if(button){
    button.classList.toggle('on',active)
    button.setAttribute('aria-pressed',active?'true':'false')
  }
  const cards=qa('.client-store-card[data-store]')
  let visible=0
  for(const card of cards){
    const id=String(card.dataset.store||'')
    const show=!active||statusCache.get(id)===true
    card.style.display=show?'':'none'
    card.setAttribute('aria-hidden',show?'false':'true')
    if(show)visible++
    const marker=q(`#clientMap .leaflet-marker-icon[data-zaia-store="${CSS.escape(id)}"]`)
    if(marker)marker.style.display=show?'':'none'
  }
  updateResultCount(visible)
  updateEmptyMessage(visible,cards.length)
}

async function refresh(){
  injectStyles()
  ensureFilterChip()
  const cards=qa('.client-store-card[data-store]')
  if(!cards.length){
    q('#zaiaAccessibilityEmpty')?.remove()
    return
  }
  if(busy)return
  busy=true
  try{
    await fetchStatuses(cards.map(card=>String(card.dataset.store||'')).filter(Boolean))
    addBadges()
    applyVisibility()
  }catch(error){
    console.warn('ZAIA accessibility filter',error)
    applyVisibility()
  }finally{busy=false}
}

function schedule(){
  clearTimeout(refreshTimer)
  refreshTimer=setTimeout(refresh,120)
}

new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true})
window.addEventListener('pageshow',schedule)
window.addEventListener('popstate',schedule)
schedule()
