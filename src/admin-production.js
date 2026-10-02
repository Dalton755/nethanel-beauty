import { ensureSession } from './cloud.js'

const $=(s,e=document)=>e.querySelector(s)
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))
const money=n=>Number(n||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})
const fmtDateTime=v=>{
  if(!v)return '—'
  const d=new Date(v)
  if(Number.isNaN(d.getTime()))return '—'
  return d.toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'})
}

let productionOpen=false
let loading=false
let lastHealth=null
let observer=null

const cfg=()=>window.BEAUTY_CONFIG||{}

async function productionRpc(){
  const session=await ensureSession()
  if(!session?.access_token)throw new Error('Entre novamente na Gestão ZAIA.')
  const url=String(cfg().supabaseUrl||'').replace(/\/$/,'')
  const key=cfg().supabasePublishableKey||''
  const schema=cfg().schema||'beleza'
  if(!url||!key)throw new Error('Conexão com o servidor indisponível.')
  const res=await fetch(`${url}/rest/v1/rpc/admin_production_health`,{
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
  try{data=text?JSON.parse(text):null}catch{data=text}
  if(!res.ok)throw new Error(data?.message||data?.details||'Não foi possível verificar a produção.')
  return data
}

function ensureButton(){
  const nav=$('.mgmt-sidebar nav')
  if(!nav)return
  $('.mgmt-shell')?.classList.add('has-production-health')
  let button=nav.querySelector('[data-production-health]')
  if(!button){
    button=document.createElement('button')
    button.type='button'
    button.dataset.productionHealth='true'
    button.textContent='Produção'
    nav.appendChild(button)
  }
  button.classList.toggle('active',productionOpen)
  if(!button.dataset.bound){
    button.dataset.bound='true'
    button.addEventListener('click',()=>{
      productionOpen=true
      nav.querySelectorAll('[data-tab]').forEach(b=>b.classList.remove('active'))
      button.classList.add('active')
      renderHealth(true)
    })
  }
}

function tone(status){
  const s=String(status||'').toUpperCase()
  return s==='OK'||s==='READY'||s==='SUCCEEDED'?'ok':s==='WARNING'||s==='ATTENTION'?'warn':'critical'
}

function statusLabel(status){
  const s=String(status||'').toUpperCase()
  return ({READY:'Pronta para produção',ATTENTION:'Atenção necessária',CRITICAL:'Ação crítica',OK:'OK',WARNING:'Atenção',SUCCEEDED:'Executando',CRITICAL_CHECK:'Crítico'})[s]||s
}

function metricCard(label,value,caption=''){
  return `<article><span>${esc(label)}</span><strong>${esc(value)}</strong>${caption?`<small>${esc(caption)}</small>`:''}</article>`
}

function healthHtml(h){
  const m=h?.metrics||{}
  const checks=h?.checks||[]
  const cron=h?.cron||[]
  const issues=h?.issues||[]
  const overall=tone(h?.status)
  return `<div class="prod-page">
    <div class="mgmt-page-head prod-head">
      <div><span class="eyebrow">OPERAÇÃO • PRODUÇÃO REAL</span><h1>Saúde da ZAIA.</h1><p>Pagamentos, acesso PRO, automações, Push, LGPD e isolamento de dados em uma única verificação.</p></div>
      <button class="btn ghost" id="prodRefresh">Atualizar agora</button>
    </div>

    <section class="prod-hero ${overall}">
      <div class="prod-score"><strong>${Number(h?.score||0)}</strong><span>/100</span></div>
      <div><span class="eyebrow">STATUS DA PRODUÇÃO</span><h2>${esc(statusLabel(h?.status))}</h2><p>${Number(h?.critical_count||0)===0&&Number(h?.warning_count||0)===0?'Nenhuma divergência operacional detectada neste momento.':'Revise os itens destacados antes de ampliar a base de clientes.'}</p></div>
      <div class="prod-generated"><span>Última verificação</span><strong>${esc(fmtDateTime(h?.generated_at))}</strong></div>
    </section>

    <section class="mgmt-kpis prod-kpis">
      ${metricCard('Lojistas ativos',m.active_merchants||0,'Base operacional')}
      ${metricCard('Lojas públicas',m.public_merchants||0,'Visíveis para clientes')}
      ${metricCard('PRO com acesso',m.active_pro||0,'Entitlement válido')}
      ${metricCard('Clientes ZAIA',m.customer_accounts||0,'Contas gratuitas')}
      ${metricCard('Pagamentos 30d',m.payments_30d||0,'Mercado Pago')}
      ${metricCard('Receita 30d',money(m.revenue_30d||0),'Assinaturas confirmadas')}
    </section>

    <section class="card prod-card">
      <div class="section-head"><div><span class="eyebrow">CHECKLIST AUTOMÁTICO</span><h2>O que precisa estar saudável</h2></div><span class="prod-summary-pill ${overall}">${checks.filter(x=>x.status==='OK').length}/${checks.length} OK</span></div>
      <div class="prod-check-grid">
        ${checks.map(c=>`<article class="prod-check ${tone(c.status)}"><div class="prod-check-mark">${c.status==='OK'?'✓':c.status==='WARNING'?'!':'×'}</div><div><div class="prod-check-title"><strong>${esc(c.label)}</strong><span>${esc(statusLabel(c.status))}</span></div><p>${esc(c.detail)}</p>${Number(c.count||0)>0?`<small>${Number(c.count)} ocorrência${Number(c.count)===1?'':'s'}</small>`:''}</div></article>`).join('')}
      </div>
    </section>

    <section class="prod-grid-two">
      <article class="card prod-card">
        <div class="section-head"><div><span class="eyebrow">AUTOMAÇÕES</span><h2>Cron da ZAIA</h2></div></div>
        <div class="prod-cron-list">${cron.map(j=>`<div><span class="prod-dot ${tone(j.status)}"></span><div><strong>${esc(j.job)}</strong><small>${esc(j.schedule)} • ${esc(fmtDateTime(j.last_run))}</small></div><span class="pill ${String(j.status).toLowerCase()==='succeeded'?'good':''}">${String(j.status).toLowerCase()==='succeeded'?'OK':esc(j.status)}</span></div>`).join('')||'<div class="empty compact">Nenhuma rotina encontrada.</div>'}</div>
      </article>
      <article class="card prod-card">
        <div class="section-head"><div><span class="eyebrow">PENDÊNCIAS</span><h2>Ações necessárias</h2></div><span class="pill ${issues.length?'warn':'good'}">${issues.length}</span></div>
        ${issues.length?`<div class="prod-issue-list">${issues.map(i=>`<div class="prod-issue ${tone(i.severity)}"><span>${i.severity==='CRITICAL'?'×':'!'}</span><div><strong>${esc(i.merchant_name||i.type)}</strong><p>${esc(i.detail)}</p></div></div>`).join('')}</div>`:'<div class="prod-all-clear"><div>✓</div><strong>Nenhuma pendência operacional.</strong><p>A ZAIA está coerente entre banco, cobrança, automações e publicação.</p></div>'}
      </article>
    </section>

    <section class="prod-production-note"><strong>Próximo nível de produção</strong><span>Esta tela verifica a aplicação e o backend. Backup/restauração, monitoramento externo e atendimento operacional continuam sendo processos que devem permanecer ativos fora da ZAIA.</span></section>
  </div>`
}

async function renderHealth(force=false){
  if(!productionOpen)return
  const content=$('.mgmt-content')
  if(!content)return
  content.dataset.zaiaProductionHealth='true'
  ensureButton()
  if(lastHealth&&!force){content.innerHTML=healthHtml(lastHealth);bindHealth();return}
  if(loading)return
  loading=true
  content.innerHTML='<div class="prod-loading"><div class="loading-ring"></div><strong>Verificando produção...</strong><span>Conferindo cobrança, automações, Push e segurança.</span></div>'
  try{
    lastHealth=await productionRpc()
    if(!productionOpen)return
    content.innerHTML=healthHtml(lastHealth)
    bindHealth()
  }catch(error){
    if(!productionOpen)return
    content.innerHTML=`<div class="warning-box"><strong>Não foi possível verificar a produção.</strong><br>${esc(error?.message||error)}</div><button class="btn primary" id="prodRetry">Tentar novamente</button>`
    $('#prodRetry')?.addEventListener('click',()=>renderHealth(true))
  }finally{loading=false}
}

function bindHealth(){
  $('#prodRefresh')?.addEventListener('click',()=>{lastHealth=null;renderHealth(true)})
}

function sync(){
  if(!location.pathname.startsWith('/gestao'))return
  ensureButton()
  const content=$('.mgmt-content')
  if(productionOpen&&content&&content.dataset.zaiaProductionHealth!=='true')renderHealth(false)
}

function start(){
  if(!location.pathname.startsWith('/gestao'))return
  document.addEventListener('click',e=>{
    const normal=e.target.closest?.('[data-tab]')
    if(normal){productionOpen=false;lastHealth=lastHealth;setTimeout(ensureButton,0)}
  },true)
  const app=$('#app')
  if(app){observer=new MutationObserver(()=>queueMicrotask(sync));observer.observe(app,{childList:true,subtree:true})}
  sync()
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true})
else start()
