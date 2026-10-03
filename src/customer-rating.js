const ZAIA_CUSTOMER_RATING_SESSION='beauty_os_cloud_session_v2'
const crCfg=()=>window.BEAUTY_CONFIG||{}
const crBase=()=>String(crCfg().supabaseUrl||'').replace(/\/$/,'')
const crKey=()=>crCfg().supabasePublishableKey||''
const crSchema=()=>crCfg().schema||'beleza'
let crDashboard=null
let crPublic=new Map()
let crBusy=false
let crQueued=false
let crModal=null

function crSession(){try{return JSON.parse(localStorage.getItem(ZAIA_CUSTOMER_RATING_SESSION)||'null')}catch{return null}}
function crEsc(v=''){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function crStars(n){const x=Math.max(0,Math.min(5,Number(n||0)));return '★'.repeat(Math.round(x))+'☆'.repeat(5-Math.round(x))}
function crScore(n){return Number(n||0).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1})}
function crDate(v){return v?new Date(v).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric'}):''}
async function crRpc(name,body={},auth=true){
  const s=crSession();const headers={apikey:crKey(),'Content-Type':'application/json','Accept-Profile':crSchema(),'Content-Profile':crSchema()}
  if(auth&&s?.access_token)headers.Authorization=`Bearer ${s.access_token}`
  const res=await fetch(`${crBase()}/rest/v1/rpc/${name}`,{method:'POST',headers,body:JSON.stringify(body)})
  const text=await res.text();let data=null;try{data=text?JSON.parse(text):null}catch{data=text}
  if(!res.ok)throw new Error(data?.message||data?.hint||data?.details||String(data||`Erro ${res.status}`))
  return data
}
async function refreshPublicRatings(){
  if(!crBase()||!crKey())return
  try{const rows=await crRpc('public_establishment_rating_summaries',{},false)||[];crPublic=new Map(rows.map(x=>[x.establishment_id,x]));scheduleCrPaint()}catch(error){console.warn('ZAIA public ratings',error)}
}
async function refreshCustomerRatings(){
  if(crBusy||!crSession()?.access_token)return
  crBusy=true
  try{
    crDashboard=await crRpc('customer_rating_dashboard')
    scheduleCrPaint()
    setTimeout(maybeAutoOpenCustomerRating,300)
  }catch(error){console.warn('ZAIA customer ratings',error)}finally{crBusy=false}
}
function publicBadge(x){return x&&Number(x.count||0)>0?`<span class="zaia-public-rating"><span class="star">★</span>${crScore(x.average)} <small>(${x.count})</small></span>`:''}
function paintPublic(){
  document.querySelectorAll('.client-store-card[data-store]').forEach(card=>{
    const data=crPublic.get(card.dataset.store);const main=card.querySelector('.client-store-main');if(!main)return
    const sig=data?`${data.average}|${data.count}`:'none';if(card.dataset.zaiaRating===sig)return
    card.dataset.zaiaRating=sig;card.querySelector('.zaia-public-rating')?.remove();if(data&&Number(data.count||0)>0){const name=card.querySelector('.client-store-name');name?.insertAdjacentHTML('afterend',publicBadge(data))}
  })
  const storeId=new URLSearchParams(location.search).get('loja')
  const hero=document.querySelector('.client-store-hero')
  if(hero&&storeId){const data=crPublic.get(storeId),sig=data?`${data.average}|${data.count}`:'none';if(hero.dataset.zaiaRating!==sig){hero.dataset.zaiaRating=sig;hero.querySelector('.zaia-store-rating-hero')?.remove();if(data&&Number(data.count||0)>0){const h1=hero.querySelector('h1');h1?.insertAdjacentHTML('afterend',`<div class="zaia-store-rating-hero"><span>★ ${crScore(data.average)}</span><small>${data.count} avaliação${Number(data.count)===1?'':'ões'}</small></div>`)}}}
}
function pendingHtml(){
  const rows=(crDashboard?.pending||[]).slice(0,3);if(!rows.length)return ''
  return `<section class="zaia-rating-panel"><div class="zaia-rating-panel-head"><div><span class="zaia-rating-kicker">SUA EXPERIÊNCIA</span><h2>Avaliações pendentes</h2><p>Se você preferir avaliar depois, os atendimentos continuam disponíveis aqui.</p></div><span class="zaia-rating-badge">${rows.length}</span></div><div class="zaia-rating-list">${rows.map(x=>`<div class="zaia-rating-row"><div class="zaia-rating-row-main"><strong>${crEsc(x.establishment_name)}</strong><span>${crEsc(x.service_name)} • ${crDate(x.completed_at)}</span><small>Profissional: ${crEsc(x.professional_name)}</small></div><div class="zaia-rating-row-actions"><button class="zaia-rate-btn" data-rate-business="${x.appointment_id}">Avaliar atendimento</button></div></div>`).join('')}</div></section>`
}
function reputationHtml(){
  const r=crDashboard?.reputation||{},count=Number(r.count||0)
  return `<section class="zaia-rating-summary"><div class="zaia-rating-summary-main"><span class="zaia-rating-kicker">MINHA REPUTAÇÃO</span><strong>${count?`${crStars(r.average)} ${crScore(r.average)}`:'Ainda sem avaliações'}</strong><span>${count?`${count} estabelecimento${count===1?'':'s'} avaliou${count===1?'':'aram'} seu perfil como cliente`:'As lojas podem manter uma avaliação contínua sobre sua experiência como cliente.'}</span></div>${count?`<div class="zaia-rating-score"><i>★</i><b>${crScore(r.average)}</b></div>`:''}</section>`
}
function receivedHtml(){
  const rows=(crDashboard?.received||[]);if(!rows.length)return ''
  return `<section class="zaia-rating-panel"><div class="zaia-rating-panel-head"><div><span class="zaia-rating-kicker">COMO AS LOJAS VEEM VOCÊ</span><h2>Avaliações recebidas</h2><p>Cada estabelecimento mantém uma avaliação contínua do seu cadastro e pode atualizá-la quando necessário.</p></div></div><div class="zaia-rating-history">${rows.map(x=>`<div class="zaia-rating-history-card"><div class="zaia-rating-history-top"><div><strong>${crEsc(x.establishment_name)}</strong><p>Atualizada em ${crDate(x.updated_at)}</p></div><span class="zaia-rating-badge">★ ${x.rating}/5</span></div>${x.comment?`<p>${crEsc(x.comment)}</p>`:''}</div>`).join('')}</div></section>`
}
function historyHtml(){
  const rows=(crDashboard?.history||[]).filter(x=>x.my_rating).slice(0,12);if(!rows.length)return ''
  return `<section class="zaia-rating-panel"><div class="zaia-rating-panel-head"><div><span class="zaia-rating-kicker">SUAS AVALIAÇÕES</span><h2>Atendimentos avaliados</h2></div></div><div class="zaia-rating-history">${rows.map(x=>`<div class="zaia-rating-history-card"><div class="zaia-rating-history-top"><div><strong>${crEsc(x.establishment_name)}</strong><p>${crEsc(x.service_name)} • ${crDate(x.completed_at)}</p></div><span class="zaia-rating-badge">★ ${x.my_rating}/5</span></div>${x.my_comment?`<p>${crEsc(x.my_comment)}</p>`:''}<div class="zaia-rating-row-actions"><button class="zaia-rate-btn secondary" data-rate-business="${x.appointment_id}">Editar avaliação</button></div></div>`).join('')}</div></section>`
}
function paintAccount(){
  const main=document.querySelector('.client-account-main');if(!main||!crDashboard){document.querySelector('#zaiaCustomerRatingsRoot')?.remove();return}
  const title=main.querySelector('.client-account-head h1')?.textContent?.trim()||''
  const showHistory=/atendimentos/i.test(title)
  const showProfile=/conta|perfil/i.test(title)
  const html=pendingHtml()+(showHistory||showProfile?reputationHtml()+receivedHtml():'')+(showHistory?historyHtml():'')
  const sig=JSON.stringify({title,p:crDashboard.pending?.map(x=>x.appointment_id),r:crDashboard.reputation,received:crDashboard.received?.map(x=>[x.establishment_id,x.rating,x.updated_at]),h:showHistory?crDashboard.history?.map(x=>[x.appointment_id,x.my_rating,x.my_comment]):[]})
  let root=document.querySelector('#zaiaCustomerRatingsRoot')
  if(!html){root?.remove();return}
  if(!root){root=document.createElement('div');root.id='zaiaCustomerRatingsRoot';const head=main.querySelector('.client-account-head');head?.after(root)||main.prepend(root)}
  if(root.dataset.signature===sig)return
  root.dataset.signature=sig;root.innerHTML=html
}
function paintCustomerRatings(){paintPublic();paintAccount()}
function scheduleCrPaint(){if(crQueued)return;crQueued=true;requestAnimationFrame(()=>{crQueued=false;paintCustomerRatings()})}
const CUSTOMER_TAGS=[['ATENDIMENTO','Atendimento'],['QUALIDADE','Qualidade'],['PONTUALIDADE','Pontualidade'],['AMBIENTE','Ambiente'],['CUSTO_BENEFICIO','Custo-benefício']]
function crLabel(n){return ({1:'Muito ruim',2:'Ruim',3:'Regular',4:'Muito bom',5:'Excelente'})[n]||'Escolha de 1 a 5 estrelas'}
function openCustomerRatingModal(id,{auto=false}={}){
  const item=(crDashboard?.pending||[]).find(x=>x.appointment_id===id)||(crDashboard?.history||[]).find(x=>x.appointment_id===id);if(!item)return
  const existing=(crDashboard?.history||[]).find(x=>x.appointment_id===id)
  crModal={appointmentId:id,rating:Number(existing?.my_rating||0),tags:new Set(existing?.my_tags||[]),item,auto}
  document.querySelector('#zaiaCustomerRatingModal')?.remove();const el=document.createElement('div');el.id='zaiaCustomerRatingModal';el.className='zaia-rating-modal-backdrop'
  el.innerHTML=`<div class="zaia-rating-modal"><div class="zaia-rating-modal-head"><div><span class="zaia-rating-kicker">COMO FOI SUA EXPERIÊNCIA?</span><h2>Como foi seu atendimento na ${crEsc(item.establishment_name)}?</h2><p>${crEsc(item.service_name)}${item.professional_name?` • com ${crEsc(item.professional_name)}`:''}. Sua avaliação ajuda a loja a melhorar e compõe a reputação pública do estabelecimento.</p></div><button class="zaia-rating-close" data-cr-close>×</button></div><div class="zaia-stars">${[1,2,3,4,5].map(n=>`<button class="zaia-star" data-cr-star="${n}" aria-label="${n} estrelas">★</button>`).join('')}</div><div class="zaia-rating-label" id="zaiaCrLabel">${crLabel(Number(existing?.my_rating||0))}</div><div class="zaia-rating-tags">${CUSTOMER_TAGS.map(([v,l])=>`<button class="zaia-rating-tag" data-cr-tag="${v}">${l}</button>`).join('')}</div><textarea class="zaia-rating-textarea" id="zaiaCrComment" maxlength="500" placeholder="Conte como foi sua experiência (opcional)">${crEsc(existing?.my_comment||'')}</textarea><button class="zaia-rating-submit" id="zaiaCrSubmit" ${existing?.my_rating?'':'disabled'}>${existing?.my_rating?'Salvar alterações':'Enviar avaliação'}</button></div>`
  document.body.appendChild(el);repaintCrModal()
}
function repaintCrModal(){if(!crModal)return;document.querySelectorAll('#zaiaCustomerRatingModal [data-cr-star]').forEach(b=>b.classList.toggle('on',Number(b.dataset.crStar)<=crModal.rating));document.querySelectorAll('#zaiaCustomerRatingModal [data-cr-tag]').forEach(b=>b.classList.toggle('on',crModal.tags.has(b.dataset.crTag)));const l=document.querySelector('#zaiaCrLabel');if(l)l.textContent=crLabel(crModal.rating);const s=document.querySelector('#zaiaCrSubmit');if(s)s.disabled=!crModal.rating}
function maybeAutoOpenCustomerRating(){
  if(crModal||!crDashboard?.pending?.length||document.querySelector('.client-auth-backdrop'))return
  const item=crDashboard.pending[0]
  const key=`zaia_rating_prompt_seen_${item.appointment_id}`
  if(sessionStorage.getItem(key))return
  sessionStorage.setItem(key,'1')
  openCustomerRatingModal(item.appointment_id,{auto:true})
}
async function submitCr(button){
  if(!crModal?.rating)return;const old=button.textContent;button.disabled=true;button.textContent='Enviando...'
  try{
    const id=crModal.appointmentId
    await crRpc('customer_submit_appointment_rating',{p_appointment_id:id,p_rating:crModal.rating,p_tags:[...crModal.tags],p_comment:document.querySelector('#zaiaCrComment')?.value||null})
    document.querySelector('#zaiaCustomerRatingModal')?.remove();crModal=null
    sessionStorage.removeItem(`zaia_rating_prompt_seen_${id}`)
    await Promise.all([refreshCustomerRatings(),refreshPublicRatings()])
  }catch(error){alert(error.message);button.disabled=false;button.textContent=old}
}
document.addEventListener('click',e=>{
  const open=e.target.closest('[data-rate-business]');if(open){openCustomerRatingModal(open.dataset.rateBusiness);return}
  if(e.target.closest('[data-cr-close]')){document.querySelector('#zaiaCustomerRatingModal')?.remove();crModal=null;return}
  const star=e.target.closest('#zaiaCustomerRatingModal [data-cr-star]');if(star){crModal.rating=Number(star.dataset.crStar);repaintCrModal();return}
  const tag=e.target.closest('#zaiaCustomerRatingModal [data-cr-tag]');if(tag){const v=tag.dataset.crTag;crModal.tags.has(v)?crModal.tags.delete(v):crModal.tags.add(v);repaintCrModal();return}
  const submit=e.target.closest('#zaiaCrSubmit');if(submit)submitCr(submit)
})
const crObserver=new MutationObserver(scheduleCrPaint);crObserver.observe(document.documentElement,{childList:true,subtree:true})
window.addEventListener('focus',()=>{refreshPublicRatings();refreshCustomerRatings()})
window.addEventListener('zaia:customer-refresh',()=>setTimeout(refreshCustomerRatings,200))
if(location.pathname.startsWith('/cliente')){setTimeout(refreshPublicRatings,350);setTimeout(refreshCustomerRatings,700);setInterval(()=>{refreshPublicRatings();refreshCustomerRatings()},30000)}
