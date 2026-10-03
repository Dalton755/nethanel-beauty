const ZAIA_RATING_SESSION_KEY='beauty_os_cloud_session_v2'
const ratingCfg=()=>window.BEAUTY_CONFIG||{}
const ratingBase=()=>String(ratingCfg().supabaseUrl||'').replace(/\/$/,'')
const ratingKey=()=>ratingCfg().supabasePublishableKey||''
const ratingSchema=()=>ratingCfg().schema||'beleza'

let ratingDashboard=null
let ratingLoading=false
let ratingPaintQueued=false
let ratingModalState=null

function ratingSession(){try{return JSON.parse(localStorage.getItem(ZAIA_RATING_SESSION_KEY)||'null')}catch{return null}}
function ratingEsc(v=''){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function ratingDate(v){return v?new Date(v).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'}):''}
function ratingStars(n){const x=Math.max(0,Math.min(5,Number(n||0)));return '★'.repeat(Math.round(x))+'☆'.repeat(5-Math.round(x))}
function ratingScore(n){return Number(n||0).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1})}
function ratingPhone(v=''){return String(v||'').replace(/\D/g,'')}
function ratingName(v=''){return String(v||'').trim().toLocaleLowerCase('pt-BR')}

async function ratingRpc(name,body={}){
  const s=ratingSession()
  if(!s?.access_token||!ratingBase()||!ratingKey())throw new Error('Sessão ZAIA não encontrada.')
  const res=await fetch(`${ratingBase()}/rest/v1/rpc/${name}`,{
    method:'POST',
    headers:{apikey:ratingKey(),Authorization:`Bearer ${s.access_token}`,'Content-Type':'application/json','Accept-Profile':ratingSchema(),'Content-Profile':ratingSchema()},
    body:JSON.stringify(body),
  })
  const text=await res.text();let data=null
  try{data=text?JSON.parse(text):null}catch{data=text}
  if(!res.ok)throw new Error(data?.message||data?.hint||data?.details||String(data||`Erro ${res.status}`))
  return data
}

async function refreshBusinessRatings(){
  if(ratingLoading||!ratingSession()?.access_token)return
  ratingLoading=true
  try{ratingDashboard=await ratingRpc('business_rating_dashboard');scheduleBusinessRatingPaint()}catch(error){console.warn('ZAIA business rating',error)}finally{ratingLoading=false}
}

function summaryHtml(){
  const s=ratingDashboard?.summary||{}
  const count=Number(s.count||0),avg=s.average
  return `<section class="zaia-rating-summary"><div class="zaia-rating-summary-main"><span class="zaia-rating-kicker">REPUTAÇÃO DA LOJA</span><strong>${count?`${ratingStars(avg)} ${ratingScore(avg)}`:'Sua reputação começa aqui'}</strong><span>${count?`${count} avaliação${count===1?'':'ões'} de clientes`:'As avaliações aparecem após atendimentos concluídos.'}</span></div><div class="zaia-rating-score">${count?`<i>★</i><b>${ratingScore(avg)}</b>`:'<span class="zaia-rating-badge muted">Sem avaliações</span>'}</div></section>`
}

function recentReceivedHtml(limit=3){
  const rows=(ratingDashboard?.recent||[]).filter(x=>x.customer_rating).slice(0,limit)
  if(!rows.length)return ''
  return `<section class="zaia-rating-panel"><div class="zaia-rating-panel-head"><div><span class="zaia-rating-kicker">O QUE OS CLIENTES DIZEM</span><h2>Avaliações recentes</h2></div></div><div class="zaia-rating-history">${rows.map(x=>`<div class="zaia-rating-history-card"><div class="zaia-rating-history-top"><div><strong>${ratingEsc(x.client_name)}</strong><p>${ratingEsc(x.service_name)} • ${ratingDate(x.completed_at)}</p></div><span class="zaia-rating-badge">★ ${x.customer_rating}/5</span></div>${x.customer_comment?`<p>“${ratingEsc(x.customer_comment)}”</p>`:''}</div>`).join('')}</div></section>`
}

function clientsIntroHtml(){
  const clients=ratingDashboard?.clients||[]
  const rated=clients.filter(x=>Number(x.rating||0)>0).length
  return `<section class="zaia-rating-panel"><div class="zaia-rating-panel-head"><div><span class="zaia-rating-kicker">RELACIONAMENTO</span><h2>Avaliação contínua do cliente</h2><p>A nota pertence ao cadastro do cliente, não a cada atendimento. Você pode criar e editar a avaliação quando precisar.</p></div><span class="zaia-rating-badge">${rated}/${clients.length} avaliados</span></div></section>`
}

function findClientForCard(card){
  const clients=ratingDashboard?.clients||[]
  const name=ratingName(card.querySelector('.item-main>strong,.item-main strong')?.textContent)
  const meta=card.querySelector('.meta')?.textContent||''
  const digits=ratingPhone(meta)
  const phoneMatch=clients.filter(x=>ratingPhone(x.phone)&&digits.includes(ratingPhone(x.phone)))
  if(phoneMatch.length===1)return phoneMatch[0]
  const nameMatch=clients.filter(x=>ratingName(x.client_name)===name)
  return nameMatch.length===1?nameMatch[0]:null
}

function paintClientCards(){
  document.querySelectorAll('.client-card').forEach(card=>{
    const c=findClientForCard(card);if(!c)return
    const sig=JSON.stringify([c.client_id,c.rating,c.rated_at,c.completed_count])
    if(card.dataset.zaiaClientRating===sig)return
    card.dataset.zaiaClientRating=sig
    card.querySelectorAll('.zaia-client-rating-action,.zaia-client-rating-current').forEach(x=>x.remove())
    const main=card.querySelector('.item-main')
    if(c.rating)main?.insertAdjacentHTML('beforeend',`<div class="zaia-rating-inline zaia-client-rating-current">Avaliação do cliente: ★ ${c.rating}/5</div>`)
    const canRate=Number(c.completed_count||0)>0
    const btn=document.createElement('button')
    btn.className='btn small zaia-client-rating-action'
    btn.type='button'
    btn.disabled=!canRate
    btn.textContent=!canRate?'Avaliar após atendimento':c.rating?`Editar avaliação ★ ${c.rating}`:'Avaliar cliente'
    if(canRate)btn.dataset.rateClient=c.client_id
    card.appendChild(btn)
  })
}

function paintAppointmentReviews(){
  const recent=new Map((ratingDashboard?.recent||[]).map(x=>[x.appointment_id,x]))
  document.querySelectorAll('[data-complete]').forEach(btn=>{
    const id=btn.dataset.complete,item=btn.closest('.appointment-item');if(!item)return
    const r=recent.get(id),sig=String(r?.customer_rating||'')
    if(item.dataset.zaiaCustomerReview===sig)return
    item.dataset.zaiaCustomerReview=sig
    item.querySelectorAll('.zaia-rating-inline.from-customer').forEach(x=>x.remove())
    if(r?.customer_rating){
      const body=item.querySelector('.appointment-body')||item
      body.insertAdjacentHTML('beforeend',`<div class="zaia-rating-inline from-customer">Cliente avaliou o atendimento: ★ ${r.customer_rating}/5</div>`)
    }
  })
}

function ensureRoot(id,anchor,position,html,sig){
  let root=document.querySelector(`#${id}`)
  if(!root){root=document.createElement('div');root.id=id;anchor?.insertAdjacentElement(position,root)}
  if(!root)return
  if(root.dataset.signature===sig)return
  root.dataset.signature=sig;root.innerHTML=html
}

function paintBusinessRatings(){
  if(!ratingDashboard)return
  const content=document.querySelector('.content');if(!content)return
  const isHome=!!document.querySelector('.dashboard-hero')
  const isClients=[...document.querySelectorAll('.title')].some(x=>x.textContent.trim()==='Clientes')

  if(isHome){
    document.querySelector('#zaiaBusinessRatingsClients')?.remove()
    const anchor=document.querySelector('#zaiaOpsPanel')||document.querySelector('.dashboard-hero')
    const sig=JSON.stringify([ratingDashboard.summary,(ratingDashboard.recent||[]).map(x=>[x.appointment_id,x.customer_rating,x.customer_comment])])
    ensureRoot('zaiaBusinessRatingsHome',anchor,'afterend',summaryHtml()+recentReceivedHtml(),sig)
  }else if(isClients){
    document.querySelector('#zaiaBusinessRatingsHome')?.remove()
    const subtitle=content.querySelector('.subtitle')
    const sig=JSON.stringify((ratingDashboard.clients||[]).map(x=>[x.client_id,x.rating,x.rated_at,x.completed_count]))
    ensureRoot('zaiaBusinessRatingsClients',subtitle,'afterend',clientsIntroHtml(),sig)
    paintClientCards()
  }else{
    document.querySelector('#zaiaBusinessRatingsHome')?.remove();document.querySelector('#zaiaBusinessRatingsClients')?.remove()
  }
  paintAppointmentReviews()
}

function scheduleBusinessRatingPaint(){if(ratingPaintQueued)return;ratingPaintQueued=true;requestAnimationFrame(()=>{ratingPaintQueued=false;paintBusinessRatings()})}

const BUSINESS_TAGS=[['PONTUALIDADE','Pontualidade'],['COMUNICACAO','Comunicação'],['RESPEITO','Respeito'],['CUIDADO','Cuidado'],['CONFIABILIDADE','Confiabilidade']]
function ratingLabel(n){return ({1:'Experiência difícil',2:'Abaixo do esperado',3:'Tudo certo',4:'Muito bom',5:'Excelente'})[n]||'Escolha de 1 a 5 estrelas'}
function openBusinessRatingModal(clientId){
  const item=(ratingDashboard?.clients||[]).find(x=>x.client_id===clientId);if(!item)return
  if(Number(item.completed_count||0)<1){alert('A avaliação fica disponível após o primeiro atendimento concluído.');return}
  ratingModalState={clientId,rating:Number(item.rating||0),tags:new Set(item.tags||[]),item}
  document.querySelector('#zaiaBusinessRatingModal')?.remove()
  const el=document.createElement('div');el.id='zaiaBusinessRatingModal';el.className='zaia-rating-modal-backdrop'
  el.innerHTML=`<div class="zaia-rating-modal"><div class="zaia-rating-modal-head"><div><span class="zaia-rating-kicker">AVALIAÇÃO DO CLIENTE</span><h2>${ratingEsc(item.client_name)}</h2><p>Esta é uma avaliação contínua do cadastro. Ela pode ser editada quando a experiência com o cliente mudar e não é compartilhada com outras lojas.</p></div><button class="zaia-rating-close" data-rating-close>×</button></div><div class="zaia-stars">${[1,2,3,4,5].map(n=>`<button class="zaia-star" data-rating-star="${n}" aria-label="${n} estrelas">★</button>`).join('')}</div><div class="zaia-rating-label" id="zaiaBusinessRatingLabel">${ratingLabel(Number(item.rating||0))}</div><div class="zaia-rating-tags">${BUSINESS_TAGS.map(([v,l])=>`<button class="zaia-rating-tag" data-rating-tag="${v}">${l}</button>`).join('')}</div><textarea class="zaia-rating-textarea" id="zaiaBusinessRatingComment" maxlength="500" placeholder="Comentário interno opcional">${ratingEsc(item.comment||'')}</textarea><button class="zaia-rating-submit" id="zaiaBusinessRatingSubmit" ${item.rating?'':'disabled'}>${item.rating?'Salvar alterações':'Salvar avaliação'}</button></div>`
  document.body.appendChild(el);repaintBusinessModal()
}
function repaintBusinessModal(){
  const m=ratingModalState;if(!m)return
  document.querySelectorAll('#zaiaBusinessRatingModal [data-rating-star]').forEach(b=>b.classList.toggle('on',Number(b.dataset.ratingStar)<=m.rating))
  document.querySelectorAll('#zaiaBusinessRatingModal [data-rating-tag]').forEach(b=>b.classList.toggle('on',m.tags.has(b.dataset.ratingTag)))
  const label=document.querySelector('#zaiaBusinessRatingLabel');if(label)label.textContent=ratingLabel(m.rating)
  const submit=document.querySelector('#zaiaBusinessRatingSubmit');if(submit)submit.disabled=!m.rating
}
async function submitBusinessRating(button){
  const m=ratingModalState;if(!m?.rating)return
  const old=button.textContent;button.disabled=true;button.textContent='Salvando...'
  try{
    await ratingRpc('business_upsert_client_rating',{p_client_id:m.clientId,p_rating:m.rating,p_tags:[...m.tags],p_comment:document.querySelector('#zaiaBusinessRatingComment')?.value||null})
    document.querySelector('#zaiaBusinessRatingModal')?.remove();ratingModalState=null;await refreshBusinessRatings()
  }catch(error){alert(error.message);button.disabled=false;button.textContent=old}
}

document.addEventListener('click',e=>{
  const open=e.target.closest('[data-rate-client]');if(open){openBusinessRatingModal(open.dataset.rateClient);return}
  if(e.target.closest('[data-rating-close]')){document.querySelector('#zaiaBusinessRatingModal')?.remove();ratingModalState=null;return}
  const star=e.target.closest('#zaiaBusinessRatingModal [data-rating-star]');if(star){ratingModalState.rating=Number(star.dataset.ratingStar);repaintBusinessModal();return}
  const tag=e.target.closest('#zaiaBusinessRatingModal [data-rating-tag]');if(tag){const v=tag.dataset.ratingTag;ratingModalState.tags.has(v)?ratingModalState.tags.delete(v):ratingModalState.tags.add(v);repaintBusinessModal();return}
  const submit=e.target.closest('#zaiaBusinessRatingSubmit');if(submit)submitBusinessRating(submit)
})

const ratingObserver=new MutationObserver(scheduleBusinessRatingPaint)
ratingObserver.observe(document.documentElement,{childList:true,subtree:true})
window.addEventListener('focus',refreshBusinessRatings)
window.addEventListener('zaia:operational-refresh',()=>setTimeout(refreshBusinessRatings,250))
if(location.pathname.startsWith('/loja')){setTimeout(refreshBusinessRatings,650);setInterval(refreshBusinessRatings,60000)}
