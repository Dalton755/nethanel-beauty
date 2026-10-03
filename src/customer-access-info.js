const cfg=()=>window.BEAUTY_CONFIG||{}
const baseUrl=()=>String(cfg().supabaseUrl||'').replace(/\/$/,'')
const apiKey=()=>cfg().supabasePublishableKey||''
const schema=()=>cfg().schema||'beleza'
const cache=new Map()
let lastStoreId=null

const esc=(v='')=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))

function styles(){
  if(document.getElementById('zaiaCustomerAccessStyles'))return
  const style=document.createElement('style')
  style.id='zaiaCustomerAccessStyles'
  style.textContent=`
    .zaia-customer-access{margin:14px 0 22px;border:1px solid var(--line,#eadfda);border-radius:20px;background:#fffdfb;padding:16px;display:grid;gap:13px;box-shadow:0 8px 30px rgba(50,25,36,.05)}
    .zaia-customer-access-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.zaia-customer-access-head span{font-size:9px;letter-spacing:.14em;font-weight:900;color:var(--brand,#3b172b)}.zaia-customer-access-head h3{font-size:18px;letter-spacing:-.03em;margin:3px 0 0}.zaia-route-btn{border:0;border-radius:13px;background:var(--brand,#3b172b);color:#fff;text-decoration:none;min-height:42px;padding:10px 14px;display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-weight:900;white-space:nowrap}
    .zaia-access-address{font-size:11px;line-height:1.5;color:var(--muted,#837479);padding:11px 12px;background:#f6efeb;border-radius:13px}
    .zaia-access-badges{display:flex;flex-wrap:wrap;gap:7px}.zaia-access-badge{border:1px solid var(--line,#eadfda);background:#fff;border-radius:999px;padding:7px 10px;font-size:10px;font-weight:800;color:#5c4850}.zaia-access-badge.good{background:#eef8f1;border-color:#d5eadb;color:#277344}.zaia-access-badge.warn{background:#f8f2ee;color:#725e64}.zaia-access-note-public{font-size:10.5px;line-height:1.5;color:#5f5055;padding-top:3px}
    .zaia-map-store-route{display:inline-flex!important;align-items:center;justify-content:center;text-decoration:none;border:1px solid var(--line,#eadfda);border-radius:14px;padding:11px 16px;font-size:11px;font-weight:900;color:var(--brand,#3b172b);background:#fff;min-height:44px}.zaia-map-store-footer{gap:10px;flex-wrap:wrap}.zaia-map-store-footer>div:first-child{min-width:120px}.zaia-map-access{width:100%;display:grid;gap:8px;margin-top:12px;padding-top:12px;border-top:1px solid var(--line,#eadfda)}.zaia-map-access-badges{display:flex;gap:6px;flex-wrap:wrap}.zaia-map-access-badges span{font-size:9px;font-weight:800;border:1px solid var(--line,#eadfda);border-radius:999px;padding:6px 8px;background:#fff}.zaia-map-access p{font-size:9.5px;line-height:1.45;color:#78686d;margin:0}
    @media(max-width:560px){.zaia-customer-access-head{display:grid}.zaia-route-btn{width:100%}}
  `
  document.head.appendChild(style)
}

async function publicStorefront(id){
  if(!id)return null
  if(cache.has(id))return cache.get(id)
  const res=await fetch(`${baseUrl()}/rest/v1/rpc/public_storefront`,{
    method:'POST',
    headers:{apikey:apiKey(),'Content-Type':'application/json','Accept-Profile':schema(),'Content-Profile':schema()},
    body:JSON.stringify({p_establishment_id:id}),
  })
  const text=await res.text()
  let data=null
  try{data=text?JSON.parse(text):null}catch{data=text}
  if(!res.ok)throw new Error(data?.message||data?.hint||String(data||`Erro ${res.status}`))
  cache.set(id,data)
  return data
}

function routeUrl(store){
  const destination=Number.isFinite(Number(store?.latitude))&&Number.isFinite(Number(store?.longitude))
    ?`${Number(store.latitude)},${Number(store.longitude)}`
    :String(store?.address||'')
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`
}

function badges(access={}){
  const items=[]
  if(access.has_parking===true)items.push(['Estacionamento','good'])
  if(access.has_parking===false)items.push(['Sem estacionamento próprio','warn'])
  if(access.ground_floor===true)items.push(['Térreo','good'])
  if(access.ground_floor===false)items.push(['Não é térreo','warn'])
  if(access.easy_access===true)items.push(['Fácil acesso','good'])
  if(access.easy_access===false)items.push(['Acesso exige atenção','warn'])
  if(access.accessibility_available===true)items.push(['♿ Acessível','good'])
  if(access.accessibility_available===false)items.push(['Acessibilidade não disponível','warn'])
  return items
}

function publicAccessHtml(store){
  const access=store?.access||{}
  const chips=badges(access)
  return `<section class="zaia-customer-access" id="zaiaCustomerAccessInfo">
    <div class="zaia-customer-access-head"><div><span>COMO CHEGAR</span><h3>Chegada e acesso</h3></div><a class="zaia-route-btn" href="${esc(routeUrl(store))}" target="_blank" rel="noopener">Como chegar</a></div>
    ${store?.address?`<div class="zaia-access-address">⌖ ${esc(store.address)}</div>`:''}
    ${chips.length?`<div class="zaia-access-badges">${chips.map(([label,kind])=>`<span class="zaia-access-badge ${kind}">${esc(label)}</span>`).join('')}</div>`:'<div class="zaia-access-badges"><span class="zaia-access-badge">Informações de acesso ainda não informadas</span></div>'}
    ${access.notes?`<div class="zaia-access-note-public">${esc(access.notes)}</div>`:''}
  </section>`
}

async function enrichStorePage(){
  styles()
  const page=document.querySelector('.client-store-page')
  if(!page)return
  const id=new URLSearchParams(location.search).get('loja')
  if(!id||document.getElementById('zaiaCustomerAccessInfo'))return
  try{
    const store=await publicStorefront(id)
    const hero=page.querySelector('.client-store-hero')
    hero?.insertAdjacentHTML('afterend',publicAccessHtml(store))
    lastStoreId=id
  }catch(error){console.warn('ZAIA access info',error)}
}

async function enrichMapModal(){
  styles()
  const modal=document.getElementById('zaia-map-store-modal')
  if(!modal)return
  const id=modal.dataset.storeId
  if(!id||modal.dataset.accessLoaded==='1')return
  modal.dataset.accessLoaded='1'
  try{
    const store=await publicStorefront(id)
    const route=modal.querySelector('.zaia-map-store-route')
    if(route)route.href=routeUrl(store)
    const access=store?.access||{}
    const chips=badges(access)
    const footer=modal.querySelector('.zaia-map-store-footer')
    if(footer&&(chips.length||access.notes)){
      footer.insertAdjacentHTML('beforebegin',`<div class="zaia-map-access">${chips.length?`<div class="zaia-map-access-badges">${chips.map(([label])=>`<span>${esc(label)}</span>`).join('')}</div>`:''}${access.notes?`<p>${esc(access.notes)}</p>`:''}</div>`)
    }
  }catch(error){console.warn('ZAIA map access info',error)}
}

function run(){
  const id=new URLSearchParams(location.search).get('loja')
  if(id!==lastStoreId)lastStoreId=id
  enrichStorePage()
  enrichMapModal()
}

new MutationObserver(run).observe(document.documentElement,{childList:true,subtree:true})
window.addEventListener('pageshow',run)
setTimeout(run,500)
