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
  return `<section class="zaia-rating-summary" id="zaiaBusinessRatingSummary"><div class="zaia-rating-summary-main"><span class="zaia-rating-kicker">REPUTAÇÃO DA LOJA</span><strong>${count?`${ratingStars(avg)} ${ratingScore(avg)}`:'Sua reputação começa aqui'}</strong><span>${count?`${count} avaliação${count===1?'':'ões'} de clientes`:'As avaliações aparecem após atendimentos concluídos.'}</span></div><div class="zaia-rating-score">${count?`<i>★</i><b>${ratingScore(avg)}</b>`:'<span class="zaia-rating-badge muted">Sem avaliações</span>'}</div></section>`
}

function pendingRows(limit=4){
  const rows=(ratingDashboard?.pending||[]).slice(0,limit)
  if(!rows.length)return ''
  return `<section class="zaia-rating-panel" id="zaiaBusinessPendingRatings"><div class="zaia-rating-panel-head"><div><span class="zaia-rating-kicker">PÓS-ATENDIMENTO</span><h2>Avalie seus clientes</h2><p>Use apenas critérios operacionais: pontualidade, comunicação, respeito e cuidado.</p></div><span class="zaia-rating-badge">${rows.length} pendente${rows.length===1?'':'s'}</span></div><div class="zaia-rating-list">${rows.map(x=>`<div class="zaia-rating-row"><div class="zaia-rating-row-main"><strong>${ratingEsc(x.client_name)}</strong><span>${ratingEsc(x.service_name)} • ${ratingDate(x.completed_at)}</span>${x.client_average?`<small>Histórico nesta loja: ★ ${ratingScore(x.client_average)} (${x.client_rating_count})</small>`:''}</div><div class="zaia-rating-row-actions"><button class="zaia-rate-btn" data-rate-customer="${x.appointment_id}">Avaliar cliente</button></div></div>`).join('')}</div></section>`
}

function recentReceivedHtml(limit=3){
  const rows=(ratingDashboard?.recent||[]).filter(x=>x.customer_rating).slice(0,limit)
  if(!rows.length)return ''
  return `<section class="zaia-rating-panel" id="zaiaBusinessRecentRatings"><div class="zaia-rating-panel-head"><div><span class="zaia-rating-kicker">O QUE OS CLIENTES DIZEM</span><h2>Avaliações recentes</h2></div></div><div class="zaia-rating-history">${rows.map(x=>`<div class="zaia-rating-history-card"><div class="zaia-rating-history-top"><div><strong>${ratingEsc(x.client_name)}</strong><p>${ratingEsc(x.service_name)} • ${ratingDate(x.completed_at)}</p></div><span class="zaia-rating-badge">★ ${x.customer_rating}/5</span></div>${x.customer_comment?`<p>“${ratingEsc(x.customer_comment)}”</p>`:''}</div>`).join('')}</div></section>`
}

function clientsReputationHtml(){
  const rows=(ratingDashboard?.clients||[]).filter(x=>Number(x.count||0)>0)
  return `<section class="zaia-rating-panel" id="zaiaClientReputationPanel"><div class="zaia-rating-panel-head"><div><span class="zaia-rating-kicker">RELACIONAMENTO</span><h2>Reputação dos clientes</h2><p>Esta nota considera somente avaliações feitas por este estabelecimento e não é pública para outras lojas.</p></div></div>${rows.length?`<div class="zaia-rating-list">${rows.map(x=>`<div class="zaia-rating-row"><div class="zaia-rating-row-main"><strong>${ratingEsc(x.client_name)}</strong><span>${x.count} atendimento${x.count===1?'':'s'} avaliado${x.count===1?'':'s'}</span></div><span class="zaia-rating-badge">★ ${ratingScore(x.average)}</span></div>`).join('')}</div>`:'<div class="empty compact"><b>Ainda sem avaliações</b>A reputação aparece conforme os atendimentos forem concluídos e avaliados.</div>'}</section>`
}

function paintBusinessRatings(){
  if(!ratingDashboard)return
  const content=document.querySelector('.content')
  if(!content)return
  const isHome=!!document.querySelector('.dashboard-hero')
  const isClients=[...document.querySelectorAll('.title')].some(x=>x.textContent.trim()==='Clientes')

  document.querySelector('#zaiaBusinessRatingSummary')?.remove()
  document.querySelector('#zaiaBusinessPendingRatings')?.remove()
  document.querySelector('#zaiaBusinessRecentRatings')?.remove()
  document.querySelector('#zaiaClientReputationPanel')?.remove()

  if(isHome){
    const anchor=document.querySelector('#zaiaOpsPanel')||document.querySelector('.dashboard-hero')
    anchor?.insertAdjacentHTML('afterend',summaryHtml()+pendingRows()+recentReceivedHtml())
  }else if(isClients){
    const subtitle=content.querySelector('.subtitle')
    subtitle?.insertAdjacentHTML('afterend',clientsReputationHtml())
  }

  const pending=new Map((ratingDashboard.pending||[]).map(x=>[x.appointment_id,x]))
  const recent=new Map((ratingDashboard.recent||[]).map(x=>[x.appointment_id,x]))
  document.querySelectorAll('[data-complete]').forEach(btn=>{
    const id=btn.dataset.complete,item=btn.closest('.appointment-item')
    if(!item)return
    item.querySelectorAll('.zaia-rating-inline,.zaia-rate-inline-btn').forEach(x=>x.remove())
    const p=pending.get(id),r=recent.get(id)
    const body=item.querySelector('.appointment-body')||item
    if(r?.customer_rating)body.insertAdjacentHTML('beforeend',`<div class="zaia-rating-inline">Cliente avaliou: ★ ${r.customer_rating}/5</div>`)
    if(p){
      const actions=item.querySelector('.appointment-actions')
      actions?.insertAdjacentHTML('beforeend',`<button class="btn small zaia-rate-inline-btn" data-rate-customer="${id}">Avaliar cliente</button>`)
    }else if(r?.business_rating){
      body.insertAdjacentHTML('beforeend',`<div class="zaia-rating-inline">Sua avaliação do cliente: ★ ${r.business_rating}/5</div>`)
    }
  })
}

function scheduleBusinessRatingPaint(){if(ratingPaintQueued)return;ratingPaintQueued=true;requestAnimationFrame(()=>{ratingPaintQueued=false;paintBusinessRatings()})}

const BUSINESS_TAGS=[['PONTUALIDADE','Pontualidade'],['COMUNICACAO','Comunicação'],['RESPEITO','Respeito'],['CUIDADO','Cuidado'],['CONFIABILIDADE','Confiabilidade']]
function ratingLabel(n){return ({1:'Experiência difícil',2:'Abaixo do esperado',3:'Tudo certo',4:'Muito bom',5:'Excelente'})[n]||'Escolha de 1 a 5 estrelas'}
function openBusinessRatingModal(id){
  const item=(ratingDashboard?.pending||[]).find(x=>x.appointment_id===id)||(ratingDashboard?.recent||[]).find(x=>x.appointment_id===id)
  if(!item)return
  ratingModalState={appointmentId:id,rating:0,tags:new Set(),item}
  document.querySelector('#zaiaBusinessRatingModal')?.remove()
  const el=document.createElement('div');el.id='zaiaBusinessRatingModal';el.className='zaia-rating-modal-backdrop'
  el.innerHTML=`<div class="zaia-rating-modal"><div class="zaia-rating-modal-head"><div><span class="zaia-rating-kicker">AVALIAÇÃO DO CLIENTE</span><h2>${ratingEsc(item.client_name)}</h2><p>${ratingEsc(item.service_name)} • esta avaliação fica entre o cliente e este estabelecimento.</p></div><button class="zaia-rating-close" data-rating-close>×</button></div><div class="zaia-stars">${[1,2,3,4,5].map(n=>`<button class="zaia-star" data-rating-star="${n}" aria-label="${n} estrelas">★</button>`).join('')}</div><div class="zaia-rating-label" id="zaiaBusinessRatingLabel">Escolha de 1 a 5 estrelas</div><div class="zaia-rating-tags">${BUSINESS_TAGS.map(([v,l])=>`<button class="zaia-rating-tag" data-rating-tag="${v}">${l}</button>`).join('')}</div><textarea class="zaia-rating-textarea" id="zaiaBusinessRatingComment" maxlength="500" placeholder="Comentário opcional sobre a experiência operacional"></textarea><button class="zaia-rating-submit" id="zaiaBusinessRatingSubmit" disabled>Salvar avaliação</button></div>`
  document.body.appendChild(el)
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
    await ratingRpc('business_submit_customer_rating',{p_appointment_id:m.appointmentId,p_rating:m.rating,p_tags:[...m.tags],p_comment:document.querySelector('#zaiaBusinessRatingComment')?.value||null})
    document.querySelector('#zaiaBusinessRatingModal')?.remove();ratingModalState=null;await refreshBusinessRatings()
  }catch(error){alert(error.message);button.disabled=false;button.textContent=old}
}

document.addEventListener('click',e=>{
  const open=e.target.closest('[data-rate-customer]');if(open){openBusinessRatingModal(open.dataset.rateCustomer);return}
  if(e.target.closest('[data-rating-close]')){document.querySelector('#zaiaBusinessRatingModal')?.remove();ratingModalState=null;return}
  const star=e.target.closest('#zaiaBusinessRatingModal [data-rating-star]');if(star){ratingModalState.rating=Number(star.dataset.ratingStar);repaintBusinessModal();return}
  const tag=e.target.closest('#zaiaBusinessRatingModal [data-rating-tag]');if(tag){const v=tag.dataset.ratingTag;ratingModalState.tags.has(v)?ratingModalState.tags.delete(v):ratingModalState.tags.add(v);repaintBusinessModal();return}
  const submit=e.target.closest('#zaiaBusinessRatingSubmit');if(submit){submitBusinessRating(submit)}
})

const ratingObserver=new MutationObserver(scheduleBusinessRatingPaint)
ratingObserver.observe(document.documentElement,{childList:true,subtree:true})
window.addEventListener('focus',refreshBusinessRatings)
window.addEventListener('zaia:operational-refresh',()=>setTimeout(refreshBusinessRatings,250))
if(location.pathname.startsWith('/loja')){setTimeout(refreshBusinessRatings,650);setInterval(refreshBusinessRatings,60000)}
