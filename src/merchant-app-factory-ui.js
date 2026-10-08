import { loadCloudState, getBusinessAppProfile, requestBusinessAndroidApp } from './cloud.js'

const ROOT_ID='zaiaMyAppModal'
const STYLE_ID='zaiaMyAppStyles'
let opening=false
let lastState=null

const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))
const phoneIcon='<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="6" y="2.5" width="12" height="19" rx="2.5"/><path d="M10 5h4M11 18.5h2"/></svg>'

function ensureStyles(){
  if(document.getElementById(STYLE_ID))return
  const s=document.createElement('style')
  s.id=STYLE_ID
  s.textContent=[
    '.zaia-myapp-backdrop{position:fixed;inset:0;z-index:150;background:rgba(31,15,24,.5);backdrop-filter:blur(7px);display:grid;align-items:end}',
    '.zaia-myapp-modal{width:min(760px,100%);max-height:92vh;overflow:auto;margin:auto;background:#fffaf7;border-radius:26px 26px 0 0;padding:18px;box-shadow:0 -20px 60px rgba(35,17,26,.28)}',
    '.zaia-myapp-head{display:flex;justify-content:space-between;gap:14px;align-items:flex-start;padding-bottom:13px;border-bottom:1px solid var(--line,#eaded7)}',
    '.zaia-myapp-head h2{font-size:25px;letter-spacing:-.04em;margin:5px 0 4px}.zaia-myapp-head p{font-size:10px;line-height:1.5;color:var(--muted,#82767a);margin:0}',
    '.zaia-myapp-close{width:38px;height:38px;flex:0 0 38px;border-radius:50%;border:1px solid var(--line,#eaded7);background:#f1e7e2;font-size:22px;color:var(--ink,#2d2025)}',
    '.zaia-myapp-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:14px}',
    '.zaia-myapp-card{border:1px solid var(--line,#eaded7);background:#fffdfb;border-radius:20px;padding:16px}',
    '.zaia-myapp-card h3{font-size:17px;margin:5px 0}.zaia-myapp-card p{font-size:9.5px;line-height:1.5;color:var(--muted,#82767a);margin:0 0 12px}',
    '.zaia-myapp-preview{display:flex;align-items:center;gap:11px;padding:12px;border-radius:16px;color:#fff;background:linear-gradient(145deg,var(--zaia-app-primary,#3b172b),#6b3149);margin:12px 0}',
    '.zaia-myapp-logo{width:58px;height:58px;flex:0 0 58px;border-radius:16px;background:#fff;display:grid;place-items:center;overflow:hidden;color:#3b172b;font-weight:900;font-size:20px}.zaia-myapp-logo img{width:100%;height:100%;object-fit:contain;padding:4px}',
    '.zaia-myapp-preview strong{display:block;font-size:13px}.zaia-myapp-preview span{font-size:8px;opacity:.78}',
    '.zaia-myapp-steps{display:grid;gap:7px}.zaia-myapp-step{display:grid;grid-template-columns:27px 1fr;gap:8px;align-items:center;background:#f7f0ec;border-radius:12px;padding:8px}.zaia-myapp-step>span{width:27px;height:27px;border-radius:50%;display:grid;place-items:center;background:#e8dcd6;font-size:9px;font-weight:900}.zaia-myapp-step.ok>span{background:#e2f1e7;color:#2c714a}.zaia-myapp-step b{display:block;font-size:9px}.zaia-myapp-step small{display:block;font-size:8px;color:var(--muted,#82767a);margin-top:1px}',
    '.zaia-myapp-status{display:inline-flex;border-radius:999px;padding:6px 9px;font-size:8px;font-weight:900;background:#eee9e6;color:#62565a}.zaia-myapp-status.ready{background:#eaf5ee;color:#246b48}.zaia-myapp-status.wait{background:#fff4df;color:#8a5a16}.zaia-myapp-status.error{background:#fbe9ea;color:#9d3642}',
    '.zaia-myapp-actions{display:grid;gap:8px}.zaia-myapp-actions .btn{width:100%}',
    '.zaia-myapp-warn{background:#fff8e9;border:1px solid #ead9b8;color:#79591e;border-radius:13px;padding:10px;font-size:9px;line-height:1.45;margin-bottom:10px}',
    '.zaia-myapp-note{margin-top:12px;padding-top:11px;border-top:1px solid var(--line,#eaded7);display:flex;gap:8px;align-items:flex-start;color:var(--muted,#82767a);font-size:8.5px;line-height:1.45}.zaia-myapp-note svg{flex:0 0 18px}',
    '.zaia-myapp-ios{display:flex;align-items:center;gap:12px;margin-top:12px}.zaia-myapp-ios-badge{width:46px;height:46px;border-radius:14px;background:#efe8e4;display:grid;place-items:center;font-size:9px;font-weight:900}',
    '.zaia-app-entry .settings-icon{display:grid;place-items:center}',
    '@media(max-width:640px){.zaia-myapp-grid{grid-template-columns:1fr}.zaia-myapp-modal{padding:15px}.zaia-myapp-head h2{font-size:22px}}'
  ].join('')
  document.head.appendChild(s)
}

function closeModal(){document.getElementById(ROOT_ID)?.remove()}
function openPlans(){closeModal();document.querySelector('[data-page="plans"]')?.click()}
function openBrand(){
  closeModal()
  const btn=document.querySelector('[data-open="zaiaPro"]')
  if(btn){btn.click();return}
  document.querySelector('[data-page="more"]')?.click()
  setTimeout(()=>document.querySelector('[data-open="zaiaPro"]')?.click(),120)
}

function statusMeta(profile){
  const s=String(profile?.status||'').toUpperCase()
  if(s==='BUILT'||s==='PUBLISHED')return ['Aplicativo pronto','ready']
  if(s==='BUILDING')return ['Gerando aplicativo','wait']
  if(s==='READY')return ['Solicitação recebida','wait']
  if(s==='ERROR')return ['Atenção necessária','error']
  return ['Ainda não solicitado','']
}

function renderLocked(root){
  root.innerHTML='<section class="zaia-myapp-modal"><div class="zaia-myapp-head"><div><span class="eyebrow">ZAIA PRO • MEU APLICATIVO</span><h2>Seu negócio também pode ter um app próprio.</h2><p>O ZAIA web continua funcionando normalmente. O aplicativo personalizado é uma opção adicional do plano PRO.</p></div><button class="zaia-myapp-close" aria-label="Fechar">×</button></div><article class="zaia-myapp-card" style="margin-top:14px"><span class="mini-pro-badge">PRO</span><h3>Aplicativo personalizado é um recurso PRO</h3><p>Nome, logo, cores e notificações nativas com a identidade do estabelecimento, usando a mesma agenda, clientes, estoque e financeiro do ZAIA.</p><div class="zaia-myapp-actions"><button class="btn primary" id="zaiaMyAppPlans">Conhecer o ZAIA PRO</button></div></article></section>'
  root.querySelector('.zaia-myapp-close').onclick=closeModal
  root.querySelector('#zaiaMyAppPlans').onclick=openPlans
}

function renderPro(root,est,profile){
  const logo=est.brandLogoUrl||''
  const brandReady=est.brandEnabled===true&&Boolean(logo)
  const sm=statusMeta(profile)
  const status=String(profile?.status||'').toUpperCase()
  const ready=status==='BUILT'||status==='PUBLISHED'
  const appName=profile?.app_name||est.name||'Meu aplicativo'
  const packageId=profile?.package_id||''
  const download=profile?.direct_download_url||''
  const version=profile?.version_name||''
  const action=!brandReady
    ? '<div class="zaia-myapp-warn"><strong>Antes de gerar:</strong> ative a identidade do estabelecimento e envie uma logo.</div><button class="btn primary" id="zaiaMyAppBrand">Configurar identidade</button>'
    : ready
      ? (download?'<a class="btn primary" href="'+esc(download)+'">Baixar APK</a>':'<button class="btn primary" disabled>Finalizando link de download</button>')
      : status==='BUILDING'
        ? '<button class="btn primary" disabled>Gerando APK...</button>'
        : status==='READY'
          ? '<button class="btn ghost" id="zaiaMyAppRefresh">Atualizar status</button>'
          : '<button class="btn primary" id="zaiaMyAppRequest">Gerar meu aplicativo Android</button>'

  root.innerHTML=[
    '<section class="zaia-myapp-modal">',
    '<div class="zaia-myapp-head"><div><span class="eyebrow">ZAIA PRO • MEU APLICATIVO</span><h2>Seu app, com a sua marca.</h2><p>O APK é opcional e usa exatamente a mesma operação do ZAIA web.</p></div><div><span class="zaia-myapp-status '+sm[1]+'">'+sm[0]+'</span><button class="zaia-myapp-close" aria-label="Fechar">×</button></div></div>',
    '<div class="zaia-myapp-grid">',
      '<article class="zaia-myapp-card"><span class="eyebrow">IDENTIDADE</span><h3>Como seu aplicativo aparece</h3><div class="zaia-myapp-preview" style="--zaia-app-primary:'+esc(est.brandPrimaryColor||'#3b172b')+'"><div class="zaia-myapp-logo">'+(logo?'<img src="'+esc(logo)+'" alt="">':esc((est.name||'Z')[0]))+'</div><div><strong>'+esc(appName)+'</strong><span>Android • tecnologia ZAIA</span></div></div><div class="zaia-myapp-steps"><div class="zaia-myapp-step '+(est.brandEnabled?'ok':'')+'"><span>'+(est.brandEnabled?'✓':'1')+'</span><div><b>Identidade personalizada</b><small>'+(est.brandEnabled?'Ativa':'Ative sua marca')+'</small></div></div><div class="zaia-myapp-step '+(logo?'ok':'')+'"><span>'+(logo?'✓':'2')+'</span><div><b>Logo do aplicativo</b><small>'+(logo?'Pronta':'Envie sua logo')+'</small></div></div><div class="zaia-myapp-step '+(profile?'ok':'')+'"><span>'+(profile?'✓':'3')+'</span><div><b>Solicitação do APK</b><small>'+(profile?sm[0]:'Ainda não solicitada')+'</small></div></div></div><button class="btn ghost wide" id="zaiaMyAppBrand" style="margin-top:10px">Editar identidade</button></article>',
      '<article class="zaia-myapp-card"><span class="eyebrow">ANDROID</span><h3>'+(ready?'Seu APK está pronto':status==='BUILDING'?'Estamos gerando seu aplicativo':status==='READY'?'Solicitação recebida':'Gerar aplicativo personalizado')+'</h3><p>'+(ready?'Instale no Android e continue usando a mesma loja ZAIA com a identidade do seu negócio.':status==='BUILDING'?'O App Factory está preparando o pacote. Você pode fechar esta tela.':status==='READY'?'Sua solicitação entrou na fila do App Factory. O download aparecerá aqui quando estiver concluído.':'Ao solicitar, o ZAIA cria a configuração da sua loja para o App Factory.')+'</p>'+(ready?'<div class="zaia-myapp-warn" style="background:#f5fbf7;border-color:#cfe4d6;color:#2f6e49">'+(version?'Versão '+esc(version)+'<br>':'')+(packageId?'Pacote: '+esc(packageId):'')+'</div>':'')+'<div class="zaia-myapp-actions">'+action+'</div><div class="zaia-myapp-note">'+phoneIcon+'<span><strong>Seu ZAIA web não muda.</strong><br>O APK é apenas uma forma adicional de acessar a mesma operação; nenhum dado é duplicado.</span></div></article>',
    '</div>',
    '<article class="zaia-myapp-card zaia-myapp-ios"><div class="zaia-myapp-ios-badge">iOS</div><div style="flex:1"><span class="eyebrow">IPHONE</span><h3>Versão iOS</h3><p style="margin:0">A mesma identidade será reaproveitada quando a distribuição Apple estiver habilitada.</p></div><span class="pill">Em preparação</span></article>',
    '</section>'
  ].join('')

  root.querySelector('.zaia-myapp-close').onclick=closeModal
  root.querySelectorAll('#zaiaMyAppBrand').forEach(b=>b.onclick=openBrand)
  root.querySelector('#zaiaMyAppRefresh')?.addEventListener('click',()=>open())
  root.querySelector('#zaiaMyAppRequest')?.addEventListener('click',async e=>{
    if(!confirm('Gerar um aplicativo Android personalizado para este estabelecimento?'))return
    const b=e.currentTarget,old=b.textContent;b.disabled=true;b.textContent='Solicitando...'
    try{await requestBusinessAndroidApp(est.id);await open()}catch(error){b.disabled=false;b.textContent=old;alert(String(error?.message||error))}
  })
}

async function open(){
  if(opening)return
  opening=true;ensureStyles();closeModal()
  const root=document.createElement('div');root.id=ROOT_ID;root.className='zaia-myapp-backdrop';root.innerHTML='<section class="zaia-myapp-modal"><div class="zaia-myapp-head"><div><span class="eyebrow">ZAIA PRO • MEU APLICATIVO</span><h2>Carregando...</h2><p>Consultando sua configuração.</p></div></div><div class="loading-ring"></div></section>';document.body.appendChild(root)
  root.onclick=e=>{if(e.target===root)closeModal()}
  try{
    const state=await loadCloudState(),est=state?.establishment
    if(!est)throw new Error('Estabelecimento não encontrado.')
    lastState=state
    if(est.planCode!=='PRO'){renderLocked(root);return}
    let profile=null;try{profile=await getBusinessAppProfile(est.id,'ANDROID')}catch{}
    renderPro(root,est,profile)
  }catch(error){root.querySelector('.zaia-myapp-modal').innerHTML='<div class="zaia-myapp-head"><div><span class="eyebrow">MEU APLICATIVO</span><h2>Não foi possível carregar.</h2><p>'+esc(error?.message||error)+'</p></div><button class="zaia-myapp-close">×</button></div>';root.querySelector('.zaia-myapp-close').onclick=closeModal}
  finally{opening=false}
}

function enhance(){
  if(!location.pathname.startsWith('/loja'))return
  ensureStyles()
  const card=document.querySelector('.zaia-pro-card')
  if(card&&!card.dataset.zaiaMyApp){card.dataset.zaiaMyApp='1';card.removeAttribute('data-open');card.innerHTML='<span class="pro-icon">'+phoneIcon+'</span><span><strong>Meu aplicativo</strong><small>App próprio no ZAIA PRO</small></span><b>›</b>';card.onclick=e=>{e.preventDefault();e.stopPropagation();open()}}
  const list=document.querySelector('.settings-list')
  if(list&&!document.getElementById('zaiaMyAppEntry')){
    const b=document.createElement('button');b.id='zaiaMyAppEntry';b.className='item zaia-app-entry';b.innerHTML='<span class="settings-icon">'+phoneIcon+'</span><div class="item-main"><strong>Meu aplicativo <span class="mini-pro-badge">PRO</span></strong><div class="meta">Personalize e gere o APK da sua loja</div></div><b>›</b>'
    const plans=[...list.querySelectorAll('button.item')].find(x=>/Planos/i.test(x.textContent||''));plans?plans.insertAdjacentElement('afterend',b):list.appendChild(b);b.onclick=open
  }
  const pro=document.querySelector('.pro-settings-card')
  if(pro&&!pro.dataset.zaiaMyApp){pro.dataset.zaiaMyApp='1';const h=pro.querySelector('h2'),p=pro.querySelector('p'),b=pro.querySelector('button');if(h)h.textContent='Seu próprio aplicativo';if(p)p.textContent='Use sua identidade e gere um APK Android conectado à mesma operação ZAIA.';if(b){b.removeAttribute('data-open');b.textContent='Abrir Meu aplicativo ›';b.onclick=e=>{e.preventDefault();e.stopPropagation();open()}}}
}

new MutationObserver(()=>requestAnimationFrame(enhance)).observe(document.documentElement,{childList:true,subtree:true})
window.addEventListener('pageshow',enhance);window.addEventListener('focus',enhance);setTimeout(enhance,250)
window.zaiaOpenMyApp=open