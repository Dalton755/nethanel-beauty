const HELP_ITEMS=[
  {
    id:'primeiros-passos',category:'Primeiros passos',title:'Como deixar minha loja pronta para receber clientes?',
    where:'Início → Serviços → Profissionais → Mais → Estabelecimento',
    summary:'A configuração essencial é simples: serviços com preço e duração, profissional com jornada, endereço público e agenda pronta para receber horários.',
    keywords:'começar configurar loja pronta produção primeira vez onboarding implantação configurar negócio estabelecimento',
    steps:['Revise os serviços sugeridos e ajuste preço e duração.','Cadastre pelo menos um profissional e configure a jornada de trabalho.','Em Mais → Estabelecimento, informe endereço e ative a busca/agendamento público.','Faça um agendamento de teste para validar o fluxo completo.','Se estiver no PRO, ative as notificações Push da loja.'],
    action:'business',actionLabel:'Revisar configuração da loja'
  },
  {
    id:'servicos',category:'Serviços e estoque',title:'Como cadastrar ou editar um serviço?',
    where:'Serviços',
    summary:'Cada serviço controla preço, duração, retorno e disponibilidade na agenda.',
    keywords:'serviço cadastrar preço duração editar retorno atendimento catálogo',
    steps:['Abra Serviços.','Toque em “Adicionar serviço” para criar ou “Editar” em um serviço existente.','Informe preço e duração reais.','Salve. O tempo definido passa a bloquear a agenda corretamente.'],
    action:'services',actionLabel:'Abrir Serviços'
  },
  {
    id:'materiais',category:'Serviços e estoque',title:'Como definir os materiais usados em cada serviço?',
    where:'Serviços → Materiais',
    summary:'A ZAIA usa essa configuração para calcular custo e baixar estoque quando o atendimento é concluído.',
    keywords:'material produto consumo estoque custo receita serviço quantidade shampoo tinta henna',
    steps:['Cadastre os produtos no Estoque.','Abra Serviços e toque em “Materiais”.','Informe a quantidade média consumida de cada produto.','Salve. A ZAIA passa a considerar esse custo no atendimento.'],
    action:'services',actionLabel:'Configurar materiais'
  },
  {
    id:'estoque',category:'Serviços e estoque',title:'Como controlar estoque e estoque mínimo?',
    where:'Estoque',
    summary:'Produtos podem ter quantidade atual, custo e nível mínimo para alertas operacionais.',
    keywords:'estoque produto mínimo baixo quantidade custo insumo material',
    steps:['Abra Estoque.','Adicione um produto ou edite um item sugerido.','Informe quantidade, unidade, custo e estoque mínimo.','A tela inicial passa a destacar itens que precisam de atenção.'],
    action:'inventory',actionLabel:'Abrir Estoque'
  },
  {
    id:'profissional',category:'Equipe',title:'Como cadastrar um profissional?',
    where:'Profissionais → Novo profissional',
    summary:'O profissional precisa existir para receber serviços, jornada e agendamentos.',
    keywords:'profissional funcionário equipe cadastrar colaborador barbeiro manicure cabeleireiro',
    steps:['Abra Profissionais.','Toque em “Novo profissional”.','Informe nome, função e comissão quando aplicável.','Depois configure serviços e jornada.'],
    action:'professionals',actionLabel:'Abrir Profissionais'
  },
  {
    id:'jornada',category:'Equipe',title:'Como configurar a jornada e horários disponíveis?',
    where:'Profissionais → Jornada',
    summary:'A busca pública e a agenda só oferecem horários que respeitam a jornada do profissional.',
    keywords:'jornada horário disponibilidade expediente almoço dias semana profissional agenda',
    steps:['Abra Profissionais.','No profissional desejado, toque em “Jornada”.','Defina os dias e horários de trabalho.','Salve. A agenda passa a bloquear automaticamente horários fora da jornada.'],
    action:'professionals',actionLabel:'Configurar jornada'
  },
  {
    id:'comissao',category:'Equipe',title:'Como configurar comissão do profissional?',
    where:'Profissionais → Editar',
    summary:'A comissão configurada é capturada quando o atendimento é concluído e alimenta o Financeiro PRO.',
    keywords:'comissão percentual fixo profissional financeiro pagamento equipe',
    steps:['Abra Profissionais.','Toque em “Editar”.','Escolha comissão percentual, fixa ou sem comissão.','Salve antes de concluir novos atendimentos.'],
    action:'professionals',actionLabel:'Revisar comissões'
  },
  {
    id:'agendamento',category:'Agenda',title:'Como criar um novo agendamento?',
    where:'Agenda → Novo horário',
    summary:'A ZAIA valida profissional, serviço, duração e conflito antes de salvar.',
    keywords:'agendar horário novo atendimento cliente agenda marcar',
    steps:['Abra Agenda.','Toque em “Novo horário”.','Escolha cliente, serviço, profissional, data e hora.','Confirme. O horário fica reservado pela duração do serviço.'],
    action:'appointment',actionLabel:'Criar agendamento'
  },
  {
    id:'concluir',category:'Agenda',title:'O que acontece ao concluir um atendimento?',
    where:'Agenda → atendimento → Concluir',
    summary:'Concluir é uma ação importante: atualiza histórico, materiais, estoque e financeiro.',
    keywords:'concluir finalizar atendimento estoque financeiro comissão materiais',
    steps:['Confirme os materiais utilizados quando necessário.','Na Agenda, toque em “Concluir”.','A ZAIA registra a receita do serviço.','Materiais e comissão entram no cálculo financeiro e no histórico.'],
    action:'agenda',actionLabel:'Abrir Agenda'
  },
  {
    id:'cancelar',category:'Agenda',title:'Como cancelar um agendamento?',
    where:'Agenda → atendimento → Cancelar',
    summary:'O cancelamento libera o horário e pode gerar Push para o cliente quando ele possui conta ZAIA.',
    keywords:'cancelar desmarcar horário cliente agenda liberar',
    steps:['Abra Agenda.','Localize o atendimento.','Toque em “Cancelar”.','Informe o motivo se desejar e confirme.'],
    action:'agenda',actionLabel:'Ver Agenda'
  },
  {
    id:'clientes',category:'Clientes',title:'Como cadastrar e acompanhar clientes?',
    where:'Clientes',
    summary:'Clientes também são criados automaticamente durante o agendamento.',
    keywords:'cliente cadastro whatsapp histórico retorno relacionamento',
    steps:['Abra Clientes.','Use “Novo cliente” quando quiser cadastrar manualmente.','Os próximos atendimentos e históricos ficam vinculados àquela pessoa.','Use os retornos da tela inicial para reativar clientes.'],
    action:'clients',actionLabel:'Abrir Clientes'
  },
  {
    id:'busca-publica',category:'Loja online',title:'Como fazer minha loja aparecer para os clientes?',
    where:'Mais → Estabelecimento',
    summary:'A loja precisa de endereço localizado e da opção de aparecer na busca ZAIA ativada.',
    keywords:'aparecer busca público cliente mapa endereço marketplace localização loja online',
    steps:['Abra Mais → Estabelecimento.','Preencha o CEP e confirme o endereço.','Localize o ponto do endereço.','Ative “Aparecer na busca ZAIA”.','Mantenha “Aceitar agendamento online” ativo para receber reservas.'],
    action:'business',actionLabel:'Configurar busca pública'
  },
  {
    id:'agendamento-online',category:'Loja online',title:'Como funciona o agendamento online do cliente?',
    where:'ZAIA Cliente → loja → serviço → profissional → horário',
    summary:'O cliente vê apenas horários realmente livres. A reserva entra diretamente na agenda da loja.',
    keywords:'online público cliente reserva horário conflito site vitrine',
    steps:['Mantenha a loja visível na busca e o agendamento online ativo.','Configure jornada dos profissionais.','Associe os serviços corretos a cada profissional.','Quando o cliente confirma, o horário entra automaticamente na Agenda.'],
    action:'business',actionLabel:'Revisar publicação da loja'
  },
  {
    id:'notificacoes',category:'PRO',title:'Como ativar notificações Push da loja?',
    where:'Mais → Notificações PRO',
    summary:'No PRO, novos agendamentos e cancelamentos podem chegar ao celular mesmo com a ZAIA fechada.',
    keywords:'push notificação alerta pro novo agendamento cancelamento celular',
    steps:['Abra Mais → Notificações.','Toque em “Ativar”.','Autorize as notificações no celular.','A ZAIA envia um Push de teste para confirmar o aparelho.'],
    action:'notifications',actionLabel:'Abrir Notificações PRO'
  },
  {
    id:'financeiro',category:'PRO',title:'Como usar o Financeiro PRO?',
    where:'Mais → Financeiro PRO',
    summary:'O financeiro reúne faturamento, recebimentos, despesas, comissões, contas e rentabilidade.',
    keywords:'financeiro receita despesa lucro comissão caixa contas receber pagar pro',
    steps:['Conclua atendimentos para gerar receitas automáticas.','Abra Financeiro.','Baixe recebimentos e pagamentos quando acontecerem.','Cadastre despesas avulsas e contas financeiras.','Acompanhe resultado, margem e rentabilidade.'],
    action:'finance',actionLabel:'Abrir Financeiro'
  },
  {
    id:'personalizacao',category:'PRO',title:'Como usar a logo e as cores da minha loja?',
    where:'Personalização',
    summary:'A identidade da loja pode assumir o painel, login e vitrine pública, mantendo ZAIA como tecnologia integrada.',
    keywords:'logo cor marca personalização white label identidade login pro',
    steps:['Abra Personalização.','Envie a logo da loja.','Escolha as cores principal, secundária e de destaque.','Ative a identidade do estabelecimento e salve.'],
    action:'branding',actionLabel:'Abrir Personalização'
  },
  {
    id:'promocoes',category:'Clientes',title:'Como criar uma promoção para meus clientes?',
    where:'Mais → Promoções',
    summary:'Promoções ativas aparecem para clientes na ZAIA e podem gerar Push para quem autorizou comunicações.',
    keywords:'promoção oferta desconto marketing cliente push campanha',
    steps:['Abra Mais → Promoções.','Crie título, oferta e descrição.','Relacione um serviço se desejar.','Defina início e fim da campanha.','Publique.'],
    action:'promotions',actionLabel:'Criar Promoção'
  },
  {
    id:'planos',category:'PRO',title:'Onde vejo meu plano e os recursos do PRO?',
    where:'Mais → Planos',
    summary:'A tela mostra seu plano atual, valores e recursos disponíveis.',
    keywords:'plano free pro assinatura mensal anual pagamento cobrança',
    steps:['Abra Mais → Planos.','Veja o plano atual e o status da assinatura.','Compare os recursos Free e Pro.','Use a contratação quando quiser alterar de plano.'],
    action:'plans',actionLabel:'Abrir Planos'
  }
]

const HELP_CATEGORIES=['Todos','Primeiros passos','Agenda','Clientes','Serviços e estoque','Equipe','Loja online','PRO']
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
  if(document.getElementById('zaiaMerchantHelpStyles'))return
  const style=document.createElement('style')
  style.id='zaiaMerchantHelpStyles'
  style.textContent=`
  .zaia-merchant-help-fab{position:fixed;z-index:92;right:16px;bottom:calc(84px + env(safe-area-inset-bottom));min-width:44px;height:44px;padding:0 13px;border:1px solid rgba(68,30,48,.15);border-radius:999px;background:#fffaf7;color:var(--brand,#3b172b);box-shadow:0 12px 30px rgba(46,20,34,.17);font-size:10px;font-weight:900;display:flex;align-items:center;justify-content:center;gap:6px}
  .zaia-merchant-help-fab i{width:21px;height:21px;border-radius:50%;background:var(--brand,#3b172b);color:#fff;display:grid;place-items:center;font-style:normal;font-size:11px}
  .zaia-merchant-help-entry{width:100%;border:0;background:transparent;color:inherit;text-align:left;display:flex;align-items:center;gap:12px;padding:12px 14px}
  .zaia-merchant-help-entry>i{width:36px;height:36px;border-radius:11px;background:#f1e6e2;color:var(--brand,#3b172b);display:grid;place-items:center;font-style:normal;font-size:15px;font-weight:900;flex:0 0 36px}
  .zaia-merchant-help-entry>div{display:grid;gap:2px;min-width:0;flex:1}.zaia-merchant-help-entry strong{font-size:11px}.zaia-merchant-help-entry small{font-size:9px;color:var(--muted,#8c7c80)}.zaia-merchant-help-entry>b{font-size:16px;color:#a08e94}
  .zaia-mhelp-backdrop{position:fixed;inset:0;z-index:180;background:rgba(29,14,22,.54);backdrop-filter:blur(7px);display:flex;align-items:flex-end;justify-content:center}
  .zaia-mhelp-sheet{width:100%;max-width:820px;max-height:92vh;background:#fffaf7;border-radius:27px 27px 0 0;box-shadow:0 -24px 70px rgba(31,14,23,.22);display:flex;flex-direction:column;overflow:hidden}
  .zaia-mhelp-head{padding:20px 18px 13px;border-bottom:1px solid var(--line,#eadfda);background:rgba(255,250,247,.98)}
  .zaia-mhelp-head-row{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.zaia-mhelp-kicker{font-size:8px;letter-spacing:.16em;font-weight:900;color:var(--brand,#3b172b)}
  .zaia-mhelp-head h2{font-size:25px;letter-spacing:-.04em;margin:4px 0}.zaia-mhelp-head p{font-size:10.5px;color:var(--muted,#8c7c80);margin:0;line-height:1.45;max-width:590px}
  .zaia-mhelp-close{width:35px;height:35px;border-radius:50%;border:1px solid var(--line,#eadfda);background:#f2e8e3;color:#5d4650;font-size:20px;flex:0 0 35px}
  .zaia-mhelp-search{position:relative;margin-top:14px}.zaia-mhelp-search input{width:100%;min-height:46px;border:1px solid var(--line,#eadfda);background:#fff;border-radius:14px;padding:11px 13px 11px 39px;font-size:12px;outline:none}.zaia-mhelp-search span{position:absolute;left:14px;top:50%;transform:translateY(-50%);font-size:16px;color:#9b8a8e}
  .zaia-mhelp-chips{display:flex;gap:6px;overflow-x:auto;padding:10px 18px 4px;scrollbar-width:none}.zaia-mhelp-chips::-webkit-scrollbar{display:none}.zaia-mhelp-chip{border:1px solid var(--line,#eadfda);background:#fff;border-radius:999px;padding:7px 10px;font-size:9px;font-weight:800;color:#725f65;white-space:nowrap}.zaia-mhelp-chip.active{background:var(--brand,#3b172b);border-color:var(--brand,#3b172b);color:#fff}
  .zaia-mhelp-body{overflow:auto;padding:10px 18px calc(24px + env(safe-area-inset-bottom));display:grid;gap:8px}.zaia-mhelp-count{font-size:9px;color:var(--muted,#8c7c80);padding:2px 2px 4px}
  .zaia-mhelp-item{border:1px solid var(--line,#eadfda);background:#fffdfb;border-radius:16px;overflow:hidden}.zaia-mhelp-item-btn{width:100%;border:0;background:transparent;padding:13px;text-align:left;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:9px;color:inherit}.zaia-mhelp-item-btn>div{display:grid;gap:3px}.zaia-mhelp-item-btn span:first-child{font-size:8px;font-weight:900;letter-spacing:.08em;color:var(--brand,#3b172b);text-transform:uppercase}.zaia-mhelp-item-btn strong{font-size:12px}.zaia-mhelp-item-btn small{font-size:9px;color:var(--muted,#8c7c80);line-height:1.35}.zaia-mhelp-chevron{font-size:18px;color:#a18e94;transition:.18s}.zaia-mhelp-item.open .zaia-mhelp-chevron{transform:rotate(180deg)}
  .zaia-mhelp-detail{display:none;border-top:1px solid var(--line,#eadfda);padding:13px;background:#fffaf7}.zaia-mhelp-item.open .zaia-mhelp-detail{display:block}.zaia-mhelp-where{display:grid;gap:2px;padding:9px 10px;background:#f4ebe7;border-radius:11px;margin-bottom:11px}.zaia-mhelp-where span{font-size:8px;color:var(--muted,#8c7c80);font-weight:800;text-transform:uppercase}.zaia-mhelp-where strong{font-size:10px;color:#4f3741}.zaia-mhelp-detail p{font-size:10px;line-height:1.45;color:#66565c;margin:0 0 9px}.zaia-mhelp-steps{margin:0 0 12px;padding:0;list-style:none;counter-reset:mhelpstep;display:grid;gap:7px}.zaia-mhelp-steps li{counter-increment:mhelpstep;display:grid;grid-template-columns:22px minmax(0,1fr);gap:7px;align-items:start;font-size:10px;line-height:1.4}.zaia-mhelp-steps li:before{content:counter(mhelpstep);width:20px;height:20px;border-radius:7px;background:var(--brand,#3b172b);color:#fff;display:grid;place-items:center;font-size:8px;font-weight:900}.zaia-mhelp-action{border:0;background:var(--brand,#3b172b);color:#fff;border-radius:11px;padding:9px 12px;font-size:9.5px;font-weight:850}.zaia-mhelp-empty{text-align:center;padding:34px 14px}.zaia-mhelp-empty strong{display:block;font-size:13px}.zaia-mhelp-empty p{font-size:10px;color:var(--muted,#8c7c80);line-height:1.4}
  .zaia-mhelp-start{border:1px solid #e5d2c6;background:linear-gradient(145deg,#fbf4ef,#f5e9e2);border-radius:16px;padding:13px;margin-bottom:2px}.zaia-mhelp-start strong{display:block;font-size:11px;margin-bottom:3px}.zaia-mhelp-start p{font-size:9.5px;color:#6f5b62;line-height:1.4;margin:0}
  @media(min-width:960px){.zaia-merchant-help-fab{right:24px;bottom:24px}.zaia-mhelp-backdrop{align-items:center;padding:20px}.zaia-mhelp-sheet{border-radius:27px;max-height:86vh}}
  @media(max-width:420px){.zaia-merchant-help-fab span{display:none}.zaia-merchant-help-fab{width:44px;padding:0}.zaia-mhelp-sheet{max-height:94vh}}
  `
  document.head.appendChild(style)
}

function renderHelp(){
  document.getElementById('zaiaMerchantHelp')?.remove()
  if(!helpOpen)return
  const items=filteredItems()
  const wrap=document.createElement('div')
  wrap.id='zaiaMerchantHelp'
  wrap.className='zaia-mhelp-backdrop'
  wrap.innerHTML=`<section class="zaia-mhelp-sheet" role="dialog" aria-modal="true" aria-label="Central de Ajuda do lojista">
    <header class="zaia-mhelp-head"><div class="zaia-mhelp-head-row"><div><span class="zaia-mhelp-kicker">CENTRAL DO LOJISTA</span><h2>Como podemos ajudar?</h2><p>Procure uma função da operação e a ZAIA mostra onde ela fica, como usar e leva você direto para a tela certa.</p></div><button class="zaia-mhelp-close" data-mhelp-close aria-label="Fechar">×</button></div><div class="zaia-mhelp-search"><span>⌕</span><input id="zaiaMerchantHelpSearch" value="${esc(helpQuery)}" placeholder="Ex.: jornada, comissão, estoque, Push, financeiro..." autocomplete="off"></div></header>
    <div class="zaia-mhelp-chips">${HELP_CATEGORIES.map(c=>`<button class="zaia-mhelp-chip ${helpCategory===c?'active':''}" data-mhelp-category="${esc(c)}">${esc(c)}</button>`).join('')}</div>
    <div class="zaia-mhelp-body"><div class="zaia-mhelp-start"><strong>Primeira vez na ZAIA?</strong><p>Abra “Como deixar minha loja pronta para receber clientes?” e siga a ordem recomendada. Você não precisa conhecer o sistema antes de começar.</p></div><div class="zaia-mhelp-count">${items.length} ${items.length===1?'orientação encontrada':'orientações encontradas'}</div>${items.length?items.map(item=>`<article class="zaia-mhelp-item ${expandedId===item.id?'open':''}"><button class="zaia-mhelp-item-btn" data-mhelp-expand="${item.id}"><div><span>${esc(item.category)}</span><strong>${esc(item.title)}</strong><small>${esc(item.where)}</small></div><b class="zaia-mhelp-chevron">⌄</b></button><div class="zaia-mhelp-detail"><div class="zaia-mhelp-where"><span>Onde fica</span><strong>${esc(item.where)}</strong></div><p>${esc(item.summary)}</p><ol class="zaia-mhelp-steps">${item.steps.map(step=>`<li>${esc(step)}</li>`).join('')}</ol>${item.action?`<button class="zaia-mhelp-action" data-mhelp-action="${item.action}">${esc(item.actionLabel||'Ir para essa função')}</button>`:''}</div></article>`).join(''):`<div class="zaia-mhelp-empty"><strong>Não encontrei esse termo.</strong><p>Tente “agenda”, “jornada”, “estoque”, “comissão”, “Push”, “financeiro”, “promoção” ou “personalização”.</p></div>`}</div>
  </section>`
  document.body.appendChild(wrap)
  bindHelp()
  requestAnimationFrame(()=>document.getElementById('zaiaMerchantHelpSearch')?.focus())
}
function openHelp(){helpOpen=true;renderHelp()}
function closeHelp(){helpOpen=false;renderHelp()}

function clickPage(page){
  const button=document.querySelector(`[data-page="${page}"]`)
  if(button){button.click();return true}
  return false
}
function afterPage(page,selector){
  const opened=clickPage(page)
  setTimeout(()=>document.querySelector(selector)?.click(),opened?90:10)
}
function goTo(action){
  closeHelp()
  if(['home','agenda','clients','services','professionals','inventory','finance'].includes(action)){clickPage(action);return}
  if(action==='appointment'){afterPage('agenda','[data-open="appointment"]');return}
  if(action==='business'){afterPage('more','[data-open="business"]');return}
  if(action==='notifications'){afterPage('more','#notifyBtn');return}
  if(action==='promotions'){afterPage('more','[data-page="promotions"]');return}
  if(action==='plans'){afterPage('more','[data-page="plans"]');return}
  if(action==='branding'){
    const direct=document.querySelector('[data-open="zaiaPro"]')
    if(direct){direct.click();return}
    afterPage('more','[data-open="zaiaPro"]');return
  }
}

function bindHelp(){
  document.querySelector('[data-mhelp-close]')?.addEventListener('click',closeHelp)
  document.getElementById('zaiaMerchantHelp')?.addEventListener('click',e=>{if(e.target.id==='zaiaMerchantHelp')closeHelp()})
  document.getElementById('zaiaMerchantHelpSearch')?.addEventListener('input',e=>{helpQuery=e.target.value;expandedId=null;renderHelp()})
  document.querySelectorAll('[data-mhelp-category]').forEach(b=>b.addEventListener('click',()=>{helpCategory=b.dataset.mhelpCategory;expandedId=null;renderHelp()}))
  document.querySelectorAll('[data-mhelp-expand]').forEach(b=>b.addEventListener('click',()=>{expandedId=expandedId===b.dataset.mhelpExpand?null:b.dataset.mhelpExpand;renderHelp()}))
  document.querySelectorAll('[data-mhelp-action]').forEach(b=>b.addEventListener('click',()=>goTo(b.dataset.mhelpAction)))
}

function ensureEntryPoints(){
  styles()
  const loggedIn=Boolean(document.querySelector('.shell'))
  if(!loggedIn){document.getElementById('zaiaMerchantHelpFab')?.remove();return}
  if(!document.getElementById('zaiaMerchantHelpFab')){
    const fab=document.createElement('button')
    fab.id='zaiaMerchantHelpFab'
    fab.className='zaia-merchant-help-fab'
    fab.type='button'
    fab.setAttribute('aria-label','Abrir Central de Ajuda do lojista')
    fab.innerHTML='<i>?</i><span>Ajuda</span>'
    fab.addEventListener('click',openHelp)
    document.body.appendChild(fab)
  }
  const list=document.querySelector('.settings-list')
  if(list&&!document.getElementById('zaiaMerchantHelpEntry')){
    const button=document.createElement('button')
    button.id='zaiaMerchantHelpEntry'
    button.className='item zaia-merchant-help-entry'
    button.type='button'
    button.innerHTML='<i>?</i><div><strong>Manual e Central de Ajuda</strong><small>Agenda, equipe, estoque, financeiro, loja online e PRO</small></div><b>›</b>'
    button.addEventListener('click',openHelp)
    list.appendChild(button)
  }
}

const observer=new MutationObserver(()=>ensureEntryPoints())
observer.observe(document.documentElement,{childList:true,subtree:true})
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&helpOpen)closeHelp()})
ensureEntryPoints()
