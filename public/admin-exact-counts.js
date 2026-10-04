import { ensureSession } from '/cloud.js'

const cfg=()=>window.BEAUTY_CONFIG||{}
let cachedCounts=null
let loading=false

async function loadCounts(){
  if(cachedCounts||loading)return cachedCounts
  loading=true
  try{
    const session=await ensureSession()
    if(!session?.access_token)return null
    const url=String(cfg().supabaseUrl||'').replace(/\/$/,'')
    const key=cfg().supabasePublishableKey||''
    const schema=cfg().schema||'beleza'
    if(!url||!key)return null
    const res=await fetch(`${url}/rest/v1/rpc/admin_platform_counts`,{
      method:'POST',
      headers:{
        apikey:key,
        Authorization:`Bearer ${session.access_token}`,
        'Content-Type':'application/json',
        'Accept-Profile':schema,
        'Content-Profile':schema,
      },
      body:'{}',
    })
    const text=await res.text()
    let data=null
    try{data=text?JSON.parse(text):null}catch{data=null}
    if(!res.ok)throw new Error(data?.message||data?.details||'Falha ao carregar a base ZAIA.')
    cachedCounts=data
    return data
  }catch(error){
    console.error('ZAIA exact counts:',error)
    return null
  }finally{
    loading=false
  }
}

function isOverview(){
  const eyebrow=document.querySelector('.mgmt-content .mgmt-page-head .eyebrow')
  return eyebrow?.textContent?.trim()==='VISÃO GERAL'
}

async function syncExactCounts(){
  if(!location.pathname.startsWith('/gestao')||!isOverview())return
  const content=document.querySelector('.mgmt-content')
  const currentKpis=content?.querySelector('.mgmt-kpis')
  if(!content||!currentKpis)return

  let section=content.querySelector('[data-zaia-exact-counts]')
  if(!section){
    section=document.createElement('section')
    section.className='mgmt-kpis'
    section.dataset.zaiaExactCounts='true'
    section.innerHTML=`
      <article><span>Lojas ativas</span><strong>—</strong><small>Estabelecimentos ativos no ZAIA</small></article>
      <article><span>Clientes ZAIA</span><strong>—</strong><small>Identidades únicas, sem duplicar entre lojas</small></article>
    `
    currentKpis.insertAdjacentElement('beforebegin',section)
  }

  if(section.dataset.loaded==='true')return
  const counts=await loadCounts()
  if(!counts||!section.isConnected)return
  const cards=section.querySelectorAll('article')
  if(cards[0])cards[0].querySelector('strong').textContent=Number(counts.active_stores||0).toLocaleString('pt-BR')
  if(cards[1])cards[1].querySelector('strong').textContent=Number(counts.total_customers||0).toLocaleString('pt-BR')
  section.dataset.loaded='true'
  section.title=`Atualizado em ${new Date(counts.generated_at||Date.now()).toLocaleString('pt-BR')}`
}

const observer=new MutationObserver(()=>queueMicrotask(syncExactCounts))
observer.observe(document.documentElement,{childList:true,subtree:true})
window.addEventListener('focus',()=>{cachedCounts=null;document.querySelector('[data-zaia-exact-counts]')?.remove();syncExactCounts()})
syncExactCounts()
