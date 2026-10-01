import {
  loadCloudState,
  getMerchantSubscription,
  cancelBillingSubscription,
  syncBillingSubscription,
  createBillingCheckout,
} from './cloud.js'

const BRAND_CACHE='zaia_last_business_brand_v1'
let enhancing=false
let lastSignature=''

const money=n=>Number(n||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))
const fmtDate=value=>{
  if(!value)return '—'
  const d=new Date(value)
  if(Number.isNaN(d.getTime()))return '—'
  return d.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric'})
}
const fmtDateLong=value=>{
  if(!value)return '—'
  const d=new Date(value)
  if(Number.isNaN(d.getTime()))return '—'
  return d.toLocaleDateString('pt-BR',{day:'2-digit',month:'long',year:'numeric'})
}

function cachedEstablishmentId(){
  try{return JSON.parse(localStorage.getItem(BRAND_CACHE)||'null')?.id||null}catch{return null}
}

async function establishmentId(){
  const cached=cachedEstablishmentId()
  if(cached)return cached
  const cloud=await loadCloudState()
  return cloud?.establishment?.id||null
}

function isPlansScreen(){
  const heading=document.querySelector('.plans-heading')
  if(!heading)return false
  return /PLANOS ZAIA/i.test(heading.textContent||'')
}

function statusMeta(sub){
  const state=String(sub?.access_state||'ACTIVE').toUpperCase()
  if(state==='GRACE')return {label:'Pagamento pendente',tone:'warning'}
  if(state==='BLOCKED')return {label:'PRO bloqueado',tone:'danger'}
  if(state==='CANCELLED_ACCESS')return {label:'Renovação cancelada',tone:'neutral'}
  return {label:'PRO ativo',tone:'success'}
}

function cycleLabel(sub){return sub?.billing_cycle==='ANNUAL'?'Anual':'Mensal'}
function priceLabel(sub){return sub?.billing_cycle==='ANNUAL'?`${money(sub?.price_snapshot)}/ano`:`${money(sub?.price_snapshot)}/mês`}

function warningHtml(sub){
  const state=String(sub?.access_state||'ACTIVE').toUpperCase()
  const periodEnd=sub?.current_period_end
  const graceEnd=sub?.grace_ends_at
  const daysUntil=Number(sub?.days_until_due||0)
  const daysOver=Number(sub?.days_overdue||0)

  if(state==='GRACE'){
    return `<section class="pro-sub-alert warning"><div class="pro-sub-alert-icon">!</div><div><strong>Pagamento em atraso • período de tolerância</strong><p>O vencimento foi em <b>${fmtDate(periodEnd)}</b>. Você ainda pode usar o ZAIA Pro até <b>${fmtDate(graceEnd)}</b> (${Number(sub?.grace_period_days||0)} dias de tolerância). Regularize antes dessa data para evitar o bloqueio dos recursos PRO.</p></div></section>`
  }
  if(state==='BLOCKED'){
    return `<section class="pro-sub-alert danger"><div class="pro-sub-alert-icon">!</div><div><strong>ZAIA Pro temporariamente bloqueado</strong><p>O período de tolerância terminou. <b>Nenhum dado foi apagado.</b> Clientes, agenda, financeiro, estoque, histórico e configurações continuam guardados. Assim que o pagamento for confirmado, os recursos PRO voltam automaticamente.</p></div></section>`
  }
  if(state==='CANCELLED_ACCESS'){
    return `<section class="pro-sub-alert neutral"><div class="pro-sub-alert-icon">✓</div><div><strong>Renovação cancelada</strong><p>Seu ZAIA Pro continua liberado até <b>${fmtDate(periodEnd)}</b>. Depois dessa data, apenas os recursos PRO serão bloqueados — seus dados permanecem salvos para uma futura reativação.</p></div></section>`
  }
  if(sub?.renewal_warning){
    const label=daysUntil<=1?'amanhã':`em ${daysUntil} dias`
    return `<section class="pro-sub-alert warning"><div class="pro-sub-alert-icon">!</div><div><strong>Renovação próxima</strong><p>Sua próxima cobrança vence <b>${label}</b>, em <b>${fmtDate(periodEnd)}</b>. A renovação automática está ativa pelo Mercado Pago.</p></div></section>`
  }
  if(daysOver>0){
    return `<section class="pro-sub-alert warning"><div class="pro-sub-alert-icon">!</div><div><strong>Estamos atualizando sua renovação</strong><p>O vencimento ocorreu há ${daysOver} dia${daysOver===1?'':'s'}. O acesso permanece protegido enquanto o status do pagamento é conciliado.</p></div></section>`
  }
  return ''
}

function actionsHtml(sub){
  const state=String(sub?.access_state||'ACTIVE').toUpperCase()
  const cancelled=state==='CANCELLED_ACCESS'||sub?.status==='CANCELLED'||sub?.auto_renew===false
  if(state==='GRACE'||state==='BLOCKED'){
    return `<button class="btn primary" id="proRegularizeBtn">Regularizar pagamento</button><button class="btn ghost" id="proSyncBtn">Atualizar status</button>`
  }
  if(cancelled){
    return `<button class="btn primary" id="proReactivateBtn">Reativar ZAIA Pro</button><button class="btn ghost" id="proSyncBtn">Atualizar status</button>`
  }
  return `<button class="btn ghost" id="proSyncBtn">Atualizar status</button><button class="btn pro-cancel-btn" id="proCancelBtn">Cancelar renovação</button>`
}

function renderPanel(content,sub){
  const meta=statusMeta(sub)
  const periodEnd=sub?.current_period_end
  const graceEnd=sub?.grace_ends_at
  const daysUntil=Number(sub?.days_until_due||0)
  const cycle=cycleLabel(sub)
  const lastPayment=sub?.last_payment_at
  const autoRenew=sub?.auto_renew!==false&&sub?.status!=='CANCELLED'
  const dueCaption=String(sub?.access_state||'').toUpperCase()==='CANCELLED_ACCESS'?'Acesso até':'Próxima renovação'
  const dueSub=periodEnd
    ? (daysUntil>0?`Faltam ${daysUntil} dia${daysUntil===1?'':'s'}`:sub?.access_state==='GRACE'?`Tolerância até ${fmtDate(graceEnd)}`:'Período encerrado')
    : 'Data aguardando confirmação do provedor'

  content.dataset.proPlansEnhanced='true'
  content.innerHTML=`
    <div class="page-heading pro-management-heading">
      <div><span class="eyebrow">ZAIA PRO • ASSINATURA</span><h1 class="title">Seu ZAIA Pro.</h1><p class="subtitle">Acompanhe renovação, pagamento e acesso sem precisar sair da ZAIA.</p></div>
      <span class="pro-sub-status ${meta.tone}"><i></i>${esc(meta.label)}</span>
    </div>

    ${warningHtml(sub)}

    <section class="pro-sub-hero">
      <div class="pro-sub-hero-main">
        <span class="eyebrow">PLANO ATUAL</span>
        <h2>ZAIA Pro</h2>
        <p>${cycle} • ${priceLabel(sub)}</p>
        <div class="pro-sub-actions">${actionsHtml(sub)}</div>
      </div>
      <div class="pro-sub-renewal">
        <span>${esc(dueCaption)}</span>
        <strong>${fmtDateLong(periodEnd)}</strong>
        <small>${esc(dueSub)}</small>
      </div>
    </section>

    <section class="pro-sub-kpis">
      <article><span>Status</span><strong>${esc(meta.label)}</strong><small>${autoRenew?'Renovação automática ativa':'Renovação automática desligada'}</small></article>
      <article><span>Valor contratado</span><strong>${money(sub?.price_snapshot)}</strong><small>${cycle}</small></article>
      <article><span>Último pagamento</span><strong>${lastPayment?fmtDate(lastPayment):'—'}</strong><small>${sub?.last_payment_amount?money(sub.last_payment_amount):'Aguardando histórico'}</small></article>
      <article><span>Tolerância</span><strong>${Number(sub?.grace_period_days||0)} dias</strong><small>${graceEnd?`Até ${fmtDate(graceEnd)} em caso de atraso`:'Proteção após o vencimento'}</small></article>
    </section>

    <section class="pro-sub-grid">
      <article class="card pro-sub-benefits">
        <div class="section-head"><div><span class="eyebrow">RECURSOS LIBERADOS</span><h2>Seu plano PRO está conectado à operação</h2></div></div>
        <div class="pro-benefit-list"><div><span>✓</span><b>Financeiro completo</b></div><div><span>✓</span><b>Push da loja</b></div><div><span>✓</span><b>Logo, cores e login personalizado</b></div><div><span>✓</span><b>Rentabilidade e metas</b></div></div>
      </article>
      <article class="card pro-data-safe-card">
        <div class="pro-data-safe-icon">⌁</div>
        <div><span class="eyebrow">SEUS DADOS ESTÃO PROTEGIDOS</span><h2>Bloqueio não significa perda.</h2><p>Se houver atraso, vencimento ou cancelamento, a ZAIA <b>não apaga seus dados</b>. O que fica suspenso são apenas os recursos exclusivos do PRO. Após a regularização, o acesso volta com seus dados e histórico exatamente como estavam.</p></div>
      </article>
    </section>

    <section class="card pro-sub-details">
      <div class="section-head"><div><span class="eyebrow">DETALHES DA ASSINATURA</span><h2>Informações do contrato</h2></div></div>
      <div class="pro-detail-grid">
        <div><span>Ciclo</span><strong>${cycle}</strong></div>
        <div><span>Renovação</span><strong>${autoRenew?'Automática':'Desativada'}</strong></div>
        <div><span>Forma de cobrança</span><strong>${sub?.provider==='MERCADO_PAGO'?'Mercado Pago':'—'}</strong></div>
        <div><span>Próximo vencimento</span><strong>${fmtDate(periodEnd)}</strong></div>
      </div>
    </section>`

  bindPanel(content,sub)
}

async function refreshPanel(content,message='Atualizando...'){
  const id=await establishmentId()
  if(!id)return
  const old=content.innerHTML
  content.innerHTML=`<div class="pro-plan-refresh"><div class="loading-ring"></div><span>${esc(message)}</span></div>`
  try{
    const sub=await getMerchantSubscription(id)
    renderPanel(content,sub)
    lastSignature=JSON.stringify([sub?.status,sub?.access_state,sub?.current_period_end,sub?.auto_renew,sub?.last_payment_at])
  }catch(error){
    content.innerHTML=old
    alert(String(error?.message||error))
  }
}

function bindPanel(content,sub){
  content.querySelector('#proSyncBtn')?.addEventListener('click',async e=>{
    const id=await establishmentId();if(!id)return
    const b=e.currentTarget,before=b.textContent;b.disabled=true;b.textContent='Atualizando...'
    try{await syncBillingSubscription(id);await refreshPanel(content,'Confirmando com o Mercado Pago...')}
    catch(error){alert(String(error?.message||error));b.disabled=false;b.textContent=before}
  })

  content.querySelector('#proCancelBtn')?.addEventListener('click',async e=>{
    const ok=confirm('Cancelar a renovação automática do ZAIA Pro? Você continuará com acesso até o fim do período já pago e nenhum dado será apagado.')
    if(!ok)return
    const id=await establishmentId();if(!id)return
    const b=e.currentTarget;b.disabled=true;b.textContent='Cancelando...'
    try{await cancelBillingSubscription(id);await refreshPanel(content,'Atualizando sua assinatura...')}
    catch(error){alert(String(error?.message||error));b.disabled=false;b.textContent='Cancelar renovação'}
  })

  const checkout=async(button)=>{
    const id=await establishmentId();if(!id)return
    const before=button.textContent;button.disabled=true;button.textContent='Abrindo Mercado Pago...'
    try{
      const result=await createBillingCheckout(id,sub?.billing_cycle||'MONTHLY')
      if(result?.already_active){await refreshPanel(content);return}
      if(!result?.checkout_url)throw new Error('Não foi possível abrir o checkout do Mercado Pago.')
      location.href=result.checkout_url
    }catch(error){alert(String(error?.message||error));button.disabled=false;button.textContent=before}
  }
  content.querySelector('#proRegularizeBtn')?.addEventListener('click',e=>checkout(e.currentTarget))
  content.querySelector('#proReactivateBtn')?.addEventListener('click',e=>checkout(e.currentTarget))
}

async function enhance(){
  if(enhancing||!isPlansScreen())return
  const content=document.querySelector('.content')
  if(!content||content.dataset.proPlansEnhanced==='true')return
  enhancing=true
  try{
    const id=await establishmentId()
    if(!id)return
    const sub=await getMerchantSubscription(id)
    const contract=String(sub?.contract_plan_code||sub?.plan_code||'FREE').toUpperCase()
    const paidPro=contract==='PRO'&&['ACTIVE','PAST_DUE','CANCELLED'].includes(String(sub?.status||'').toUpperCase())
    if(!paidPro)return
    const signature=JSON.stringify([sub?.status,sub?.access_state,sub?.current_period_end,sub?.auto_renew,sub?.last_payment_at])
    lastSignature=signature
    renderPanel(content,sub)
  }catch(error){console.error('[ZAIA PRO PLANS]',error)}
  finally{enhancing=false}
}

if(!location.pathname.startsWith('/cliente')&&!location.pathname.startsWith('/gestao')){
  const start=()=>{
    enhance()
    const app=document.querySelector('#app')
    if(app)new MutationObserver(()=>queueMicrotask(enhance)).observe(app,{childList:true,subtree:true})
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true})
  else start()
}
