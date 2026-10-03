const MAP_MODAL_ID='zaia-map-store-modal'
let enhanceTimer=null

const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))

function storeCards(){
  return [...document.querySelectorAll('.client-store-card[data-store]')]
}

function mapMarkers(){
  return [...document.querySelectorAll('#clientMap .leaflet-marker-icon')]
}

function cardData(card){
  const logo=card.querySelector('.client-store-mark img')?.getAttribute('src')||'/icon.svg'
  const name=card.querySelector('.client-store-name strong')?.textContent?.trim()||'Estabelecimento'
  const distance=card.querySelector('.client-store-name span')?.textContent?.trim()||''
  const segment=card.querySelector('.client-store-main > p')?.textContent?.trim()||'Serviços de beleza'
  const address=card.querySelector('.client-address')?.textContent?.trim()||''
  const services=[...card.querySelectorAll('.client-service-tags span')].map(x=>x.textContent?.trim()).filter(Boolean)
  const price=card.querySelector('.client-store-footer span')?.textContent?.trim()||''
  return {id:card.dataset.store,logo,name,distance,segment,address,services,price}
}

function routeUrl(address=''){
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`
}

function enhanceMarkers(){
  const cards=storeCards()
  const markers=mapMarkers()
  if(!cards.length||!markers.length)return

  markers.forEach((marker,index)=>{
    const card=cards[index]
    if(!card)return
    const data=cardData(card)
    if(marker.dataset.zaiaStore===data.id)return

    marker.dataset.zaiaStore=data.id
    marker.classList.add('zaia-logo-map-marker')
    marker.alt=data.name
    marker.setAttribute('aria-label',`Abrir informações de ${data.name}`)
    marker.setAttribute('role','button')
    marker.style.width='50px'
    marker.style.height='50px'
    marker.style.marginLeft='-25px'
    marker.style.marginTop='-25px'
    marker.style.objectFit='contain'
    marker.style.background='#fff'
    marker.style.padding='4px'
    marker.src=data.logo||'/icon.svg'
    marker.onerror=()=>{
      marker.onerror=null
      marker.src='/icon.svg'
    }
  })
}

function scheduleEnhance(){
  clearTimeout(enhanceTimer)
  enhanceTimer=setTimeout(enhanceMarkers,90)
}

function closeModal(){
  document.getElementById(MAP_MODAL_ID)?.remove()
  document.body.classList.remove('zaia-map-modal-open')
}

function openStoreModal(card){
  if(!card)return
  closeModal()
  const data=cardData(card)
  const overlay=document.createElement('div')
  overlay.id=MAP_MODAL_ID
  overlay.dataset.storeId=data.id
  overlay.className='zaia-map-store-overlay'
  overlay.setAttribute('role','presentation')
  overlay.innerHTML=`
    <section class="zaia-map-store-modal" role="dialog" aria-modal="true" aria-labelledby="zaia-map-store-name">
      <button class="zaia-map-store-close" type="button" aria-label="Fechar">×</button>
      <div class="zaia-map-store-head">
        <div class="zaia-map-store-logo"><img src="${esc(data.logo)}" alt=""></div>
        <div class="zaia-map-store-title">
          <div class="zaia-map-store-kicker">${esc(data.segment)}</div>
          <h2 id="zaia-map-store-name">${esc(data.name)}</h2>
          ${data.distance?`<span class="zaia-map-store-distance">${esc(data.distance)} de você</span>`:''}
        </div>
      </div>
      ${data.address?`<div class="zaia-map-store-address"><span>⌖</span><p>${esc(data.address)}</p></div>`:''}
      ${data.services.length?`<div class="zaia-map-store-services">${data.services.map(s=>`<span>${esc(s)}</span>`).join('')}</div>`:''}
      <div class="zaia-map-store-footer">
        <div>${data.price?`<small>VALORES</small><strong>${esc(data.price)}</strong>`:''}</div>
        ${data.address?`<a class="zaia-map-store-route" href="${esc(routeUrl(data.address))}" target="_blank" rel="noopener">Como chegar</a>`:''}
        <button class="zaia-map-store-open" type="button">Ver loja e horários</button>
      </div>
      <div class="zaia-map-store-powered">ZAIA</div>
    </section>`

  document.body.appendChild(overlay)
  document.body.classList.add('zaia-map-modal-open')
  overlay.querySelector('.zaia-map-store-logo img')?.addEventListener('error',e=>{e.currentTarget.src='/icon.svg'})
  overlay.querySelector('.zaia-map-store-close')?.addEventListener('click',closeModal)
  overlay.querySelector('.zaia-map-store-open')?.addEventListener('click',()=>{
    closeModal()
    card.click()
  })
  overlay.addEventListener('click',e=>{if(e.target===overlay)closeModal()})
}

document.addEventListener('click',e=>{
  const marker=e.target.closest?.('#clientMap .leaflet-marker-icon.zaia-logo-map-marker')
  if(!marker)return
  e.preventDefault()
  e.stopPropagation()
  e.stopImmediatePropagation()
  const id=marker.dataset.zaiaStore
  const card=storeCards().find(x=>x.dataset.store===id)
  openStoreModal(card)
},true)

document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal()})

const observer=new MutationObserver(scheduleEnhance)
observer.observe(document.documentElement,{childList:true,subtree:true})
window.addEventListener('load',scheduleEnhance)
scheduleEnhance()
