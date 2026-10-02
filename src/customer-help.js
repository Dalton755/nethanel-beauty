const HELP_ITEMS=[
  {
    id:'buscar-servico',category:'Buscar e agendar',title:'Como encontrar um serviço ou estabelecimento?',
    where:'Buscar → campo de pesquisa ou categorias',
    summary:'Use a busca para procurar uma loja, tipo de serviço ou atendimento específico.',
    keywords:'buscar procurar loja salão barbearia manicure sobrancelha serviço perto localização mapa',
    steps:['Abra a aba Buscar.','Digite o nome da loja ou do serviço, ou toque em uma categoria.','Se quiser opções próximas, use “Buscar próximos a mim”.','Toque no estabelecimento para ver serviços e horários.'],
    action:'buscar',actionLabel:'Ir para Buscar'
  },
  {
    id:'agendar',category:'Buscar e agendar',title:'Como fazer um agendamento?',
    where:'Buscar → estabelecimento → serviço → profissional → data e horário',
    summary:'A ZAIA mostra apenas horários realmente disponíveis na agenda do estabelecimento.',
    keywords:'agendar marcar horário reservar serviço profissional data confirmar',
    steps:['Na aba Buscar, abra um estabelecimento.','Escolha o serviço.','Escolha o profissional.','Escolha a data e depois um horário livre.','Revise o resumo e toque em “Confirmar agendamento”.'],
    action:'buscar',actionLabel:'Começar um agendamento'
  },
  {
    id:'agenda',category:'Agendamentos',title:'Onde vejo meus próximos agendamentos?',
    where:'Agenda',
    summary:'A aba Agenda reúne seus próximos horários em todos os estabelecimentos ZAIA.',
    keywords:'agenda próximos horários reservas marcados atendimento futuro',
    steps:['Entre na sua conta ZAIA.','Abra a aba Agenda.','Veja estabelecimento, serviço, profissional, data, horário e valor do atendimento.'],
    action:'agenda',actionLabel:'Ir para Agenda'
  },
  {
    id:'cancelar',category:'Agendamentos',title:'Como cancelar um agendamento?',
    where:'Agenda → cartão do agendamento → Cancelar agendamento',
    summary:'O cancelamento é feito diretamente no cartão do próximo atendimento quando ele ainda pode ser cancelado.',
    keywords:'cancelar desmarcar agendamento horário desistir',
    steps:['Abra a aba Agenda.','Localize o horário que deseja cancelar.','Toque em “Cancelar agendamento”.','Confirme a ação. O estabelecimento será avisado.'],
    action:'agenda',actionLabel:'Ver meus agendamentos'
  },
  {
    id:'historico',category:'Agendamentos',title:'Onde vejo meus atendimentos anteriores?',
    where:'Histórico',
    summary:'O Histórico mostra serviços realizados e agendamentos anteriores da sua conta ZAIA.',
    keywords:'histórico atendimentos anteriores passado serviços realizados',
    steps:['Entre na sua conta.','Abra a aba Histórico.','Consulte os atendimentos vinculados à sua conta ZAIA.'],
    action:'historico',actionLabel:'Abrir Histórico'
  },
  {
    id:'promocoes',category:'Promoções',title:'Onde encontro promoções?',
    where:'Promoções',
    summary:'As ofertas ativas dos estabelecimentos aparecem na aba Promoções.',
    keywords:'promoção promoções ofertas desconto cupom vantagem',
    steps:['Abra a aba Promoções.','Toque em uma oferta para abrir o estabelecimento.','Se a promoção estiver ligada a um serviço, a ZAIA direciona você para ele.'],
    action:'promocoes',actionLabel:'Ver Promoções'
  },
  {
    id:'receber-promocoes',category:'Promoções',title:'Como permitir ou parar alertas de promoções?',
    where:'Perfil → Editar → “Quero receber promoções relevantes na ZAIA”',
    summary:'Você decide se quer receber comunicações promocionais.',
    keywords:'promoção notificação marketing receber parar desativar autorizar',
    steps:['Abra Perfil.','Toque em Editar.','Marque ou desmarque “Quero receber promoções relevantes na ZAIA”.','Salve o perfil.'],
    action:'perfil',actionLabel:'Ir para Perfil'
  },
  {
    id:'notificacoes',category:'Notificações',title:'Como ativar lembretes e notificações?',
    where:'Perfil → Ativar notificações',
    summary:'O Push do cliente é gratuito e pode avisar confirmações, lembretes e promoções autorizadas.',
    keywords:'push notificações lembrete alerta 24 horas 1 hora ativar permissão',
    steps:['Abra Perfil.','Toque em “Ativar notificações”.','Autorize as notificações quando o celular solicitar.','A ZAIA enviará um Push de teste para confirmar a ativação.'],
    action:'perfil',actionLabel:'Ativar no Perfil'
  },
  {
    id:'conta',category:'Conta e perfil',title:'Como entrar ou criar uma conta ZAIA?',
    where:'Topo da tela → Entrar',
    summary:'A conta permite acompanhar agenda, histórico e notificações em diferentes estabelecimentos.',
    keywords:'entrar login cadastro criar conta email senha google',
    steps:['Toque em “Entrar” no topo.','Escolha “Continuar com Google” ou use e-mail e senha.','Para criar conta por e-mail, toque em “Ainda não tenho conta”.','Complete seu nome e WhatsApp.'],
    action:'conta',actionLabel:'Abrir acesso da conta'
  },
  {
    id:'google',category:'Conta e perfil',title:'Como entrar com Google?',
    where:'Entrar → Continuar com Google',
    summary:'Você pode usar sua conta Google e depois completar apenas os dados necessários na ZAIA.',
    keywords:'google gmail entrar login conta',
    steps:['Toque em Entrar.','Toque em “Continuar com Google”.','Escolha sua conta Google.','No primeiro acesso, complete os dados que a ZAIA solicitar.'],
    action:'conta',actionLabel:'Entrar com uma conta'
  },
  {
    id:'editar-perfil',category:'Conta e perfil',title:'Como alterar meus dados?',
    where:'Perfil → Editar',
    summary:'Nome, WhatsApp, data de nascimento e preferência de promoções ficam no seu Perfil.',
    keywords:'editar perfil nome telefone whatsapp nascimento dados pessoais',
    steps:['Abra Perfil.','Toque em Editar.','Altere os dados desejados.','Toque em “Salvar perfil”.'],
    action:'perfil',actionLabel:'Editar meu Perfil'
  },
  {
    id:'sair',category:'Conta e perfil',title:'Como sair da minha conta?',
    where:'Perfil → Sair da conta',
    summary:'Encerra a sessão somente neste aparelho.',
    keywords:'sair logout desconectar conta sessão',
    steps:['Abra Perfil.','Role até “Sair da conta”.','Toque para encerrar a sessão neste aparelho.'],
    action:'perfil',actionLabel:'Ir para Perfil'
  }
]

const HELP_CATEGORIES=['Todos','Buscar e agendar','Agendamentos','Notificações','Promoções','Conta e perfil']
let helpOpen=false
let helpQuery=''
let helpCategory='Todos'
let expandedId=null

function esc(v=''){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function normalize(v=''){return String(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()}

function filteredItems(){
  const q=normalize(helpQuery.trim())
  return HELP_ITEMS.filter(item=>{
    if(helpCategory!=='Todos'&&item.category!==helpCategory)return false
    if(!q)return true
    return normalize([item.title,item.where,item.summary,item.keywords,item.category,...item.steps].join(' ')).includes(q)
  })
}

function styles(){
  if(document.getElementById('zaiaCustomerHelpStyles'))return
  const style=document.createElement('style')
  style.id='zaiaCustomerHelpStyles'
  style.textContent=`
  .zaia-help-fab{position:fixed;z-index:92;right:14px;bottom:calc(88px + env(safe-area-inset-bottom));width:42px;height:42px;border:1px solid rgba(68,30,48,.16);border-radius:50%;background:#fffaf7;color:var(--brand,#3b172b);box-shadow:0 10px 28px rgba(46,20,34,.18);font-size:18px;font-weight:900;display:grid;place-items:center}
  .zaia-help-fab:active{transform:scale(.97)}
  .zaia-help-profile-entry{width:100%;border:1px solid var(--line,#eadfda);background:#fffdfb;border-radius:17px;padding:14px;text-align:left;display:flex;align-items:center;gap:11px;color:inherit}
  .zaia-help-profile-entry>i{width:20px;height:20px;border-radius:50%;display:grid;place-items:center;background:#f1e6e2;color:var(--brand,#3b172b);font-style:normal;font-size:12px;font-weight:900;flex:0 0 20px}
  .zaia-help-profile-entry>span{display:grid;gap:2px}.zaia-help-profile-entry strong{font-size:12px}.zaia-help-profile-entry small{font-size:9.5px;color:var(--muted,#8c7c80)}
  .zaia-help-backdrop{position:fixed;inset:0;z-index:160;background:rgba(29,14,22,.52);backdrop-filter:blur(7px);display:flex;align-items:flex-end;justify-content:center}
  .zaia-help-sheet{width:100%;max-width:760px;max-height:92vh;background:#fffaf7;border-radius:26px 26px 0 0;box-shadow:0 -24px 70px rgba(31,14,23,.22);display:flex;flex-direction:column;overflow:hidden}
  .zaia-help-head{padding:19px 17px 13px;border-bottom:1px solid var(--line,#eadfda);background:rgba(255,250,247,.98)}
  .zaia-help-head-row{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.zaia-help-kicker{font-size:8px;letter-spacing:.16em;font-weight:900;color:var(--brand,#3b172b)}
  .zaia-help-head h2{font-size:24px;letter-spacing:-.04em;margin:4px 0}.zaia-help-head p{font-size:10.5px;color:var(--muted,#8c7c80);margin:0;line-height:1.45}
  .zaia-help-close{width:34px;height:34px;border-radius:50%;border:1px solid var(--line,#eadfda);background:#f2e8e3;color:#5d4650;font-size:20px;flex:0 0 34px}
  .zaia-help-search{position:relative;margin-top:14px}.zaia-help-search input{width:100%;min-height:45px;border:1px solid var(--line,#eadfda);background:#fff;border-radius:14px;padding:11px 13px 11px 39px;font-size:12px;outline:none}.zaia-help-search span{position:absolute;left:14px;top:50%;transform:translateY(-50%);font-size:16px;color:#9b8a8e}
  .zaia-help-chips{display:flex;gap:6px;overflow-x:auto;padding:10px 17px 4px;scrollbar-width:none}.zaia-help-chips::-webkit-scrollbar{display:none}.zaia-help-chip{border:1px solid var(--line,#eadfda);background:#fff;border-radius:999px;padding:7px 10px;font-size:9px;font-weight:800;color:#725f65;white-space:nowrap}.zaia-help-chip.active{background:var(--brand,#3b172b);border-color:var(--brand,#3b172b);color:#fff}
  .zaia-help-body{overflow:auto;padding:10px 17px calc(24px + env(safe-area-inset-bottom));display:grid;gap:8px}
  .zaia-help-count{font-size:9px;color:var(--muted,#8c7c80);padding:2px 2px 4px}.zaia-help-item{border:1px solid var(--line,#eadfda);background:#fffdfb;border-radius:16px;overflow:hidden}.zaia-help-item-btn{width:100%;border:0;background:transparent;padding:13px;text-align:left;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:9px;color:inherit}.zaia-help-item-btn>div{display:grid;gap:3px}.zaia-help-item-btn span:first-child{font-size:8px;font-weight:900;letter-spacing:.08em;color:var(--brand,#3b172b);text-transform:uppercase}.zaia-help-item-btn strong{font-size:12px}.zaia-help-item-btn small{font-size:9px;color:var(--muted,#8c7c80);line-height:1.35}.zaia-help-chevron{font-size:18px;color:#a18e94;transition:.18s}.zaia-help-item.open .zaia-help-chevron{transform:rotate(180deg)}
  .zaia-help-detail{display:none;border-top:1px solid var(--line,#eadfda);padding:13px;background:#fffaf7}.zaia-help-item.open .zaia-help-detail{display:block}.zaia-help-where{display:grid;gap:2px;padding:9px 10px;background:#f4ebe7;border-radius:11px;margin-bottom:11px}.zaia-help-where span{font-size:8px;color:var(--muted,#8c7c80);font-weight:800;text-transform:uppercase}.zaia-help-where strong{font-size:10px;color:#4f3741}.zaia-help-detail p{font-size:10px;line-height:1.45;color:#66565c;margin:0 0 9px}.zaia-help-steps{margin:0 0 12px;padding:0;list-style:none;counter-reset:helpstep;display:grid;gap:7px}.zaia-help-steps li{counter-increment:helpstep;display:grid;grid-template-columns:22px minmax(0,1fr);gap:7px;align-items:start;font-size:10px;line-height:1.4}.zaia-help-steps li:before{content:counter(helpstep);width:20px;height:20px;border-radius:7px;background:var(--brand,#3b172b);color:#fff;display:grid;place-items:center;font-size:8px;font-weight:900}.zaia-help-action{border:0;background:var(--brand,#3b172b);color:#fff;border-radius:11px;padding:9px 12px;font-size:9.5px;font-weight:850}.zaia-help-empty{text-align:center;padding:34px 14px}.zaia-help-empty strong{display:block;font-size:13px}.zaia-help-empty p{font-size:10px;color:var(--muted,#8c7c80);line-height:1.4}
  @media(min-width:760px){.zaia-help-fab{right:24px;bottom:92px}.zaia-help-backdrop{align-items:center;padding:20px}.zaia-help-sheet{border-radius:26px;max-height:86vh}}
  `
  document.head.appendChild(style)
}

function renderHelp(){
  document.getElementById('zaiaCustomerHelp')?.remove()
  if(!helpOpen)return
  const items=filteredItems()
  const wrap=document.createElement('div')
  wrap.id='zaiaCustomerHelp'
  wrap.className='zaia-help-backdrop'
  wrap.innerHTML=`<section class="zaia-help-sheet" role="dialog" aria-modal="true" aria-label="Manual ZAIA">
    <header class="zaia-help-head"><div class="zaia-help-head-row"><div><span class="zaia-help-kicker">MANUAL ZAIA</span><h2>Como podemos ajudar?</h2><p>Procure uma função e veja exatamente onde ela fica e como usar.</p></div><button class="zaia-help-close" data-help-close aria-label="Fechar">×</button></div><div class="zaia-help-search"><span>⌕</span><input id="zaiaHelpSearch" value="${esc(helpQuery)}" placeholder="Ex.: cancelar, promoção, notificação, agendar..." autocomplete="off"></div></header>
    <div class="zaia-help-chips">${HELP_CATEGORIES.map(c=>`<button class="zaia-help-chip ${helpCategory===c?'active':''}" data-help-category="${esc(c)}">${esc(c)}</button>`).join('')}</div>
    <div class="zaia-help-body"><div class="zaia-help-count">${items.length} ${items.length===1?'orientação encontrada':'orientações encontradas'}</div>${items.length?items.map(item=>`<article class="zaia-help-item ${expandedId===item.id?'open':''}"><button class="zaia-help-item-btn" data-help-expand="${item.id}"><div><span>${esc(item.category)}</span><strong>${esc(item.title)}</strong><small>${esc(item.where)}</small></div><b class="zaia-help-chevron">⌄</b></button><div class="zaia-help-detail"><div class="zaia-help-where"><span>Onde fica</span><strong>${esc(item.where)}</strong></div><p>${esc(item.summary)}</p><ol class="zaia-help-steps">${item.steps.map(step=>`<li>${esc(step)}</li>`).join('')}</ol>${item.action?`<button class="zaia-help-action" data-help-action="${item.action}">${esc(item.actionLabel||'Ir para essa função')}</button>`:''}</div></article>`).join(''):`<div class="zaia-help-empty"><strong>Não encontrei esse termo.</strong><p>Tente palavras como “agendar”, “cancelar”, “notificação”, “promoção”, “Google” ou “perfil”.</p></div>`}</div>
  </section>`
  document.body.appendChild(wrap)
  bindHelp()
  requestAnimationFrame(()=>document.getElementById('zaiaHelpSearch')?.focus())
}

function openHelp(){helpOpen=true;renderHelp()}
function closeHelp(){helpOpen=false;renderHelp()}

function goTo(action){
  closeHelp()
  if(action==='conta'){
    const login=document.getElementById('clientLogin')||document.getElementById('bookingLogin')
    if(login){login.click();return}
    document.querySelector('[data-client-tab="perfil"]')?.click()
    return
  }
  const tab=document.querySelector(`[data-client-tab="${action}"]`)
  if(tab){tab.click();return}
  if(action==='buscar'){location.assign('/cliente');return}
  location.assign(`/cliente?tab=${encodeURIComponent(action)}`)
}

function bindHelp(){
  document.querySelector('[data-help-close]')?.addEventListener('click',closeHelp)
  document.getElementById('zaiaCustomerHelp')?.addEventListener('click',e=>{if(e.target.id==='zaiaCustomerHelp')closeHelp()})
  document.getElementById('zaiaHelpSearch')?.addEventListener('input',e=>{helpQuery=e.target.value;expandedId=null;renderHelp()})
  document.querySelectorAll('[data-help-category]').forEach(b=>b.addEventListener('click',()=>{helpCategory=b.dataset.helpCategory;expandedId=null;renderHelp()}))
  document.querySelectorAll('[data-help-expand]').forEach(b=>b.addEventListener('click',()=>{expandedId=expandedId===b.dataset.helpExpand?null:b.dataset.helpExpand;renderHelp()}))
  document.querySelectorAll('[data-help-action]').forEach(b=>b.addEventListener('click',()=>goTo(b.dataset.helpAction)))
}

function ensureEntryPoints(){
  styles()
  if(!document.getElementById('zaiaHelpFab')){
    const fab=document.createElement('button')
    fab.id='zaiaHelpFab'
    fab.className='zaia-help-fab'
    fab.type='button'
    fab.setAttribute('aria-label','Abrir manual ZAIA')
    fab.textContent='?'
    fab.addEventListener('click',openHelp)
    document.body.appendChild(fab)
  }
  const profileActions=document.querySelector('.client-profile-actions')
  if(profileActions&&!document.getElementById('zaiaHelpProfileEntry')){
    const btn=document.createElement('button')
    btn.id='zaiaHelpProfileEntry'
    btn.className='zaia-help-profile-entry'
    btn.type='button'
    btn.innerHTML='<i>?</i><span><strong>Manual e Central de Ajuda</strong><small>Encontre rapidamente onde fica cada função</small></span>'
    btn.addEventListener('click',openHelp)
    profileActions.insertBefore(btn,profileActions.firstChild)
  }
}

const observer=new MutationObserver(()=>ensureEntryPoints())
observer.observe(document.documentElement,{childList:true,subtree:true})
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&helpOpen)closeHelp()})
ensureEntryPoints()
