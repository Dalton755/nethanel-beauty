const HELP_ITEMS=[
  {
    id:'primeiros-passos',category:'Primeiros passos',title:'Deixar minha loja pronta para receber clientes',
    where:'Início → Serviços → Profissionais → Mais → Estabelecimento',
    summary:'A configuração essencial é simples: serviços com preço e duração, profissional com jornada, endereço público e agenda pronta para receber horários.',
    keywords:'começar configurar loja pronta produção primeira vez onboarding implantação configurar negócio estabelecimento receber clientes',
    steps:['Revise os serviços sugeridos e ajuste preço e duração.','Cadastre pelo menos um profissional e configure a jornada de trabalho.','Em Mais → Estabelecimento, informe endereço e ative a busca/agendamento público.','Faça um agendamento de teste para validar o fluxo completo.','Se estiver no PRO, ative as notificações Push da loja.'],
    action:'business',actionLabel:'Revisar configuração da loja'
  },
  {
    id:'servicos',category:'Serviços e estoque',title:'Cadastrar ou editar um serviço',
    where:'Serviços',
    summary:'Cada serviço controla preço, duração, retorno e disponibilidade na agenda.',
    keywords:'serviço cadastrar preço duração editar retorno atendimento catálogo criar serviço',
    steps:['Abra Serviços.','Toque em “Adicionar serviço” para criar ou “Editar” em um serviço existente.','Informe preço e duração reais.','Salve. O tempo definido passa a bloquear a agenda corretamente.'],
    action:'services',actionLabel:'Abrir Serviços'
  },
  {
    id:'materiais',category:'Serviços e estoque',title:'Definir os materiais usados em um serviço',
    where:'Serviços → Materiais',
    summary:'A ZAIA usa essa configuração para calcular custo e baixar estoque quando o atendimento é concluído.',
    keywords:'material produto consumo estoque custo receita serviço quantidade shampoo tinta henna insumo',
    steps:['Cadastre os produtos no Estoque.','Abra Serviços e toque em “Materiais”.','Informe a quantidade média consumida de cada produto.','Salve. A ZAIA passa a considerar esse custo no atendimento.'],
    action:'services',actionLabel:'Configurar materiais'
  },
  {
    id:'estoque',category:'Serviços e estoque',title:'Controlar estoque e estoque mínimo',
    where:'Estoque',
    summary:'Produtos podem ter quantidade atual, custo e nível mínimo para alertas operacionais.',
    keywords:'estoque produto mínimo baixo quantidade custo insumo material alerta',
    steps:['Abra Estoque.','Adicione um produto ou edite um item sugerido.','Informe quantidade, unidade, custo e estoque mínimo.','A tela inicial passa a destacar itens que precisam de atenção.'],
    action:'inventory',actionLabel:'Abrir Estoque'
  },
  {
    id:'profissional',category:'Equipe',title:'Cadastrar um profissional',
    where:'Profissionais → Novo profissional',
    summary:'O profissional precisa existir para receber serviços, jornada e agendamentos.',
    keywords:'profissional funcionário equipe cadastrar colaborador barbeiro manicure cabeleireiro novo profissional',
    steps:['Abra Profissionais.','Toque em “Novo profissional”.','Informe nome, função e comissão quando aplicável.','Depois configure serviços e jornada.'],
    action:'professionals',actionLabel:'Abrir Profissionais'
  },
  {
    id:'jornada',category:'Equipe',title:'Configurar jornada e horários disponíveis',
    where:'Profissionais → Jornada',
    summary:'A busca pública e a agenda só oferecem horários que respeitam a jornada do profissional.',
    keywords:'jornada horário disponibilidade expediente almoço dias semana profissional agenda abrir agenda disponibilidade',
    steps:['Abra Profissionais.','No profissional desejado, toque em “Jornada”.','Defina os dias e horários de trabalho.','Salve. A agenda passa a bloquear automaticamente horários fora da jornada.'],
    action:'professionals',actionLabel:'Configurar jornada'
  },
  {
    id:'comissao',category:'Equipe',title:'Configurar comissão do profissional',
    where:'Profissionais → Editar',
    summary:'A comissão configurada é capturada quando o atendimento é concluído e alimenta o Financeiro PRO.',
    keywords:'comissão percentual fixo profissional financeiro pagamento equipe valor comissão',
    steps:['Abra Profissionais.','Toque em “Editar”.','Escolha comissão percentual, fixa ou sem comissão.','Salve antes de concluir novos atendimentos.'],
    action:'professionals',actionLabel:'Revisar comissões'
  },
  {
    id:'agendamento',category:'Agenda',title:'Criar um novo agendamento',
    where:'Agenda → Novo horário',
    summary:'A ZAIA valida profissional, serviço, duração e conflito antes de salvar.',
    keywords:'agendar horário novo atendimento cliente agenda marcar criar agendamento reservar horário',
    steps:['Abra Agenda.','Toque em “Novo horário”.','Escolha cliente, serviço, profissional, data e hora.','Confirme. O horário fica reservado pela duração do serviço.'],
    action:'appointment',actionLabel:'Criar agendamento'
  },
  {
    id:'concluir',category:'Agenda',title:'Concluir um atendimento',
    where:'Agenda → atendimento → Concluir',
    summary:'Concluir atualiza histórico, materiais, estoque e financeiro.',
    keywords:'concluir finalizar atendimento estoque financeiro comissão materiais terminar atendimento',
    steps:['Confirme os materiais utilizados quando necessário.','Na Agenda, toque em “Concluir”.','A ZAIA registra a receita do serviço.','Materiais e comissão entram no cálculo financeiro e no histórico.'],
    action:'agenda',actionLabel:'Abrir Agenda'
  },
  {
    id:'cancelar',category:'Agenda',title:'Cancelar um agendamento',
    where:'Agenda → atendimento → Cancelar',
    summary:'O cancelamento libera o horário e pode gerar Push para o cliente quando ele possui conta ZAIA.',
    keywords:'cancelar desmarcar horário cliente agenda liberar cancelamento',
    steps:['Abra Agenda.','Localize o atendimento.','Toque em “Cancelar”.','Informe o motivo se desejar e confirme.'],
    action:'agenda',actionLabel:'Ver Agenda'
  },
  {
    id:'clientes',category:'Clientes',title:'Cadastrar e acompanhar clientes',
    where:'Clientes',
    summary:'Clientes também são criados automaticamente durante o agendamento.',
    keywords:'cliente cadastro whatsapp histórico retorno relacionamento novo cliente cadastrar cliente',
    steps:['Abra Clientes.','Use “Novo cliente” quando quiser cadastrar manualmente.','Os próximos atendimentos e históricos ficam vinculados àquela pessoa.','Use os retornos da tela inicial para reativar clientes.'],
    action:'clients',actionLabel:'Abrir Clientes'
  },
  {
    id:'busca-publica',category:'Loja online',title:'Fazer minha loja aparecer para os clientes',
    where:'Mais → Estabelecimento',
    summary:'A loja precisa de endereço localizado e da opção de aparecer na busca ZAIA ativada.',
    keywords:'aparecer busca público cliente mapa endereço marketplace localização loja online publicar loja divulgar loja',
    steps:['Abra Mais → Estabelecimento.','Preencha o CEP e confirme o endereço.','Localize o ponto do endereço.','Ative “Aparecer na busca ZAIA”.','Mantenha “Aceitar agendamento online” ativo para receber reservas.'],
    action:'business',actionLabel:'Configurar busca pública'
  },
  {
    id:'agendamento-online',category:'Loja online',title:'Entender o agendamento online do cliente',
    where:'ZAIA Cliente → loja → serviço → profissional → horário',
    summary:'O cliente vê apenas horários realmente livres. A reserva entra diretamente na agenda da loja.',
    keywords:'online público cliente reserva horário conflito site vitrine agendamento online como funciona',
    steps:['Mantenha a loja visível na busca e o agendamento online ativo.','Configure jornada dos profissionais.','Associe os serviços corretos a cada profissional.','Quando o cliente confirma, o horário entra automaticamente na Agenda.'],
    action:'business',actionLabel:'Revisar publicação da loja'
  },
  {
    id:'notificacoes',category:'PRO',title:'Ativar notificações Push da loja',
    where:'Mais → Notificações PRO',
    summary:'No PRO, novos agendamentos e cancelamentos podem chegar ao celular mesmo com a ZAIA fechada.',
    keywords:'push notificação alerta pro novo agendamento cancelamento celular avisar aviso',
    steps:['Abra Mais → Notificações.','Toque em “Ativar”.','Autorize as notificações no celular.','A ZAIA envia um Push de teste para confirmar o aparelho.'],
    action:'notifications',actionLabel:'Abrir Notificações PRO'
  },
  {
    id:'financeiro',category:'PRO',title:'Usar o Financeiro PRO',
    where:'Mais → Financeiro PRO',
    summary:'O financeiro reúne faturamento, recebimentos, despesas, comissões, contas e rentabilidade.',
    keywords:'financeiro receita despesa lucro comissão caixa contas receber pagar pro dinheiro saldo faturamento',
    steps:['Conclua atendimentos para gerar receitas automáticas.','Abra Financeiro.','Baixe recebimentos e pagamentos quando acontecerem.','Cadastre despesas avulsas e contas financeiras.','Acompanhe resultado, margem e rentabilidade.'],
    action:'finance',actionLabel:'Abrir Financeiro'
  },
  {
    id:'personalizacao',category:'PRO',title:'Usar a logo e as cores da minha loja',
    where:'Personalização',
    summary:'A identidade da loja pode assumir o painel, login e vitrine pública, mantendo ZAIA como tecnologia integrada.',
    keywords:'logo cor marca personalização white label identidade login pro personalizar loja',
    steps:['Abra Personalização.','Envie a logo da loja.','Escolha as cores principal, secundária e de destaque.','Ative a identidade do estabelecimento e salve.'],
    action:'branding',actionLabel:'Abrir Personalização'
  },
  {
    id:'promocoes',category:'Clientes',title:'Criar uma promoção para meus clientes',
    where:'Mais → Promoções',
    summary:'Promoções ativas aparecem para clientes na ZAIA e podem gerar Push para quem autorizou comunicações.',
    keywords:'promoção oferta desconto marketing cliente push campanha criar promoção divulgar desconto',
    steps:['Abra Mais → Promoções.','Crie título, oferta e descrição.','Relacione um serviço se desejar.','Defina início e fim da campanha.','Publique.'],
    action:'promotions',actionLabel:'Criar promoção'
  },
  {
    id:'planos',category:'PRO',title:'Ver meu plano e os recursos do PRO',
    where:'Mais → Planos',
    summary:'A tela mostra seu plano atual, valores e recursos disponíveis.',
    keywords:'plano free pro assinatura mensal anual pagamento cobrança preço valor plano',
    steps:['Abra Mais → Planos.','Veja o plano atual e o status da assinatura.','Compare os recursos Free e Pro.','Use a contratação quando quiser alterar de plano.'],
    action:'plans',actionLabel:'Abrir Planos'
  }
]

const HELP_CATEGORIES=['Todos','Primeiros passos','Agenda','Clientes','Serviços e estoque','Equipe','Loja online','PRO']
const QUICK_ACTIONS=[
  {label:'Criar agendamento',hint:'Marcar um novo horário',action:'appointment',icon:'＋'},
  {label:'Cadastrar profissional',hint:'Equipe e jornada',action:'professionals',icon:'◎'},
  {label:'Publicar minha loja',hint:'Busca e agendamento online',action:'business',icon:'⌖'},
  {label:'Financeiro PRO',hint:'Caixa, lucro e despesas',action:'finance',icon:'$'},
  {label:'Notificações PRO',hint:'Push da agenda',action:'notifications',icon:'!'},
  {label:'Criar promoção',hint:'Oferta para clientes',action:'promotions',icon:'%'},
]
const POPULAR_IDS=['primeiros-passos','agendamento','profissional','jornada','busca-publica','financeiro']
let helpOpen=false
let helpQuery=''
let helpCategory='Todos'
let expandedId=null
let showAll=false
let viewportHandler=null

function esc(v=''){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function normalize(v=''){return String(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()}
function searchScore(item,terms){
  const title=normalize(item.title)
  const keywords=normalize(item.keywords)
  const all=normalize([item.title,item.where,item.summary,item.keywords,item.category,...item.steps].join(' '))
  let score=0
  for(const term of terms){
    if(!all.includes(term))return -1
    if(title.includes(term))score+=5
    else if(keywords.includes(term))score+=3
    else score+=1
  }
  return score
}
function filteredItems(){
  let items=HELP_ITEMS.filter(item=>helpCategory==='Todos'||item.category===helpCategory)
  const terms=normalize(helpQuery.trim()).split(/\s+/).filter(Boolean)
  if(terms.length){
    return items.map(item=>({item,score:searchScore(item,terms)})).filter(x=>x.score>=0).sort((a,b)=>b.score-a.score).map(x=>x.item)
  }
  if(helpCategory==='Todos'&&!showAll)return POPULAR_IDS.map(id=>HELP_ITEMS.find(item=>item.id===id)).filter(Boolean)
  return items
}

function styles(){
  if(document.getElementById('zaiaMerchantHelpStyles'))return
  const style=document.createElement('style')
  style.id='zaiaMerchantHelpStyles'
  style.textContent=`
  .zaia-merchant-help-fab{position:fixed;z-index:92;right:16px;bottom:calc(84px + env(safe-area-inset-bottom));min-width:44px;height:44px;padding:0 13px;border:1px solid rgba(68,30,48,.15);border-radius:999px;background:#fffaf7;color:var(--brand,#3b172b);box-shadow:0 12px 30px rgba(46,20,34,.17);font-size:10px;font-weight:900;display:flex;align-items:center;justify-content:center;gap:6px}
  .zaia-merchant-help-fab i{width:21px;height:21px;border-radius:50%;background:var(--brand,#3b172b);color:#fff;display:grid;place-items:center;font-style:normal;font-size:11px}
  .zaia-merchant-help-entry{width:100%;border:0;background:transparent;color:inherit;text-align:left;display:flex;align-items:center;gap:12px;padding:12px 14px}.zaia-merchant-help-entry>i{width:36px;height:36px;border-radius:11px;background:#f1e6e2;color:var(--brand,#3b172b);display:grid;place-items:center;font-style:normal;font-size:15px;font-weight:900;flex:0 0 36px}.zaia-merchant-help-entry>div{display:grid;gap:2px;min-width:0;flex:1}.zaia-merchant-help-entry strong{font-size:11px}.zaia-merchant-help-entry small{font-size:9px;color:var(--muted,#8c7c80)}.zaia-merchant-help-entry>b{font-size:16px;color:#a08e94}
  .zaia-mhelp-backdrop{position:fixed;inset:0;z-index:180;background:rgba(29,14,22,.54);backdrop-filter:blur(7px);display:flex;align-items:flex-end;justify-content:center}.zaia-mhelp-sheet{width:100%;max-width:820px;max-height:92vh;background:#fffaf7;border-radius:27px 27px 0 0;box-shadow:0 -24px 70px rgba(31,14,23,.22);display:flex;flex-direction:column;overflow:hidden}.zaia-mhelp-head{padding:18px 18px 12px;border-bottom:1px solid var(--line,#eadfda);background:rgba(255,250,247,.99);flex:0 0 auto}.zaia-mhelp-head-row{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.zaia-mhelp-kicker{font-size:8px;letter-spacing:.16em;font-weight:900;color:var(--brand,#3b172b)}.zaia-mhelp-head h2{font-size:24px;letter-spacing:-.04em;margin:4px 0}.zaia-mhelp-head p{font-size:10.5px;color:var(--muted,#8c7c80);margin:0;line-height:1.45;max-width:590px}.zaia-mhelp-close{width:36px;height:36px;border-radius:50%;border:1px solid var(--line,#eadfda);background:#f2e8e3;color:#5d4650;font-size:20px;flex:0 0 36px}
  .zaia-mhelp-search-label{display:block;font-size:9px;font-weight:850;color:#5c4850;margin:13px 0 6px}.zaia-mhelp-search{position:relative}.zaia-mhelp-search input{width:100%;height:50px;border:1px solid var(--line,#eadfda);background:#fff;border-radius:14px;padding:11px 44px 11px 40px;font-size:16px;line-height:1.2;outline:none;color:#2d2226}.zaia-mhelp-search input:focus{border-color:var(--brand,#3b172b);box-shadow:0 0 0 3px rgba(59,23,43,.08)}.zaia-mhelp-search-icon{position:absolute;left:14px;top:50%;transform:translateY(-50%);font-size:16px;color:#9b8a8e;pointer-events:none}.zaia-mhelp-clear{position:absolute;right:8px;top:50%;transform:translateY(-50%);width:34px;height:34px;border:0;border-radius:10px;background:#f5efec;color:#77636a;font-size:17px;display:none}.zaia-mhelp-clear.visible{display:grid;place-items:center}.zaia-mhelp-search-help{font-size:8.8px;color:#9b8a8e;margin:6px 2px 0}
  .zaia-mhelp-chips{display:flex;flex-wrap:wrap;gap:6px;padding:10px 18px 5px;flex:0 0 auto}.zaia-mhelp-chip{border:1px solid var(--line,#eadfda);background:#fff;border-radius:999px;padding:7px 10px;font-size:9px;font-weight:800;color:#725f65;white-space:nowrap}.zaia-mhelp-chip.active{background:var(--brand,#3b172b);border-color:var(--brand,#3b172b);color:#fff}
  .zaia-mhelp-body{overflow:auto;min-height:0;padding:9px 18px calc(24px + env(safe-area-inset-bottom));display:block;overscroll-behavior:contain}.zaia-mhelp-section-title{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:4px 1px 8px}.zaia-mhelp-section-title strong{font-size:11px}.zaia-mhelp-section-title span{font-size:8.5px;color:var(--muted,#8c7c80)}
  .zaia-mhelp-quick{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:0 0 13px}.zaia-mhelp-quick button{min-height:64px;border:1px solid var(--line,#eadfda);background:#fff;border-radius:15px;padding:10px;text-align:left;display:grid;grid-template-columns:34px minmax(0,1fr);gap:9px;align-items:center;color:inherit}.zaia-mhelp-quick i{width:34px;height:34px;border-radius:11px;background:#f2e8e3;color:var(--brand,#3b172b);display:grid;place-items:center;font-style:normal;font-size:14px;font-weight:900}.zaia-mhelp-quick span{display:grid;gap:2px}.zaia-mhelp-quick strong{font-size:10.5px}.zaia-mhelp-quick small{font-size:8.5px;line-height:1.3;color:var(--muted,#8c7c80)}
  .zaia-mhelp-start{border:1px solid #e5d2c6;background:linear-gradient(145deg,#fbf4ef,#f5e9e2);border-radius:16px;padding:13px;margin-bottom:13px}.zaia-mhelp-start strong{display:block;font-size:11px;margin-bottom:3px}.zaia-mhelp-start p{font-size:9.5px;color:#6f5b62;line-height:1.4;margin:0}.zaia-mhelp-start button{margin-top:9px;border:0;background:transparent;color:var(--brand,#3b172b);font-size:9.5px;font-weight:850;padding:0}
  .zaia-mhelp-results{display:grid;gap:8px}.zaia-mhelp-item{border:1px solid var(--line,#eadfda);background:#fffdfb;border-radius:16px;overflow:hidden}.zaia-mhelp-item-btn{width:100%;border:0;background:transparent;padding:13px;text-align:left;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:9px;color:inherit}.zaia-mhelp-item-btn>div{display:grid;gap:3px}.zaia-mhelp-item-btn span:first-child{font-size:8px;font-weight:900;letter-spacing:.08em;color:var(--brand,#3b172b);text-transform:uppercase}.zaia-mhelp-item-btn strong{font-size:12px;line-height:1.25}.zaia-mhelp-item-btn small{font-size:9px;color:var(--muted,#8c7c80);line-height:1.35}.zaia-mhelp-chevron{font-size:18px;color:#a18e94;transition:.18s}.zaia-mhelp-item.open .zaia-mhelp-chevron{transform:rotate(180deg)}.zaia-mhelp-detail{display:none;border-top:1px solid var(--line,#eadfda);padding:13px;background:#fffaf7}.zaia-mhelp-item.open .zaia-mhelp-detail{display:block}.zaia-mhelp-where{display:grid;gap:2px;padding:9px 10px;background:#f4ebe7;border-radius:11px;margin-bottom:11px}.zaia-mhelp-where span{font-size:8px;color:var(--muted,#8c7c80);font-weight:800;text-transform:uppercase}.zaia-mhelp-where strong{font-size:10px;color:#4f3741}.zaia-mhelp-detail p{font-size:10px;line-height:1.45;color:#66565c;margin:0 0 9px}.zaia-mhelp-steps{margin:0 0 12px;padding:0;list-style:none;counter-reset:mhelpstep;display:grid;gap:7px}.zaia-mhelp-steps li{counter-increment:mhelpstep;display:grid;grid-template-columns:22px minmax(0,1fr);gap:7px;align-items:start;font-size:10px;line-height:1.4}.zaia-mhelp-steps li:before{content:counter(mhelpstep);width:20px;height:20px;border-radius:7px;background:var(--brand,#3b172b);color:#fff;display:grid;place-items:center;font-size:8px;font-weight:900}.zaia-mhelp-action{border:0;background:var(--brand,#3b172b);color:#fff;border-radius:11px;padding:10px 12px;font-size:9.5px;font-weight:850}.zaia-mhelp-empty{text-align:center;padding:30px 14px}.zaia-mhelp-empty strong{display:block;font-size:13px}.zaia-mhelp-empty p{font-size:10px;color:var(--muted,#8c7c80);line-height:1.4}.zaia-mhelp-all{width:100%;margin-top:9px;border:1px solid var(--line,#eadfda);background:#fff;border-radius:12px;padding:10px;font-size:9.5px;font-weight:850;color:var(--brand,#3b172b)}
  @media(min-width:960px){.zaia-merchant-help-fab{right:24px;bottom:24px}.zaia-mhelp-backdrop{align-items:center;padding:20px}.zaia-mhelp-sheet{border-radius:27px;max-height:86vh}}
  @media(max-width:600px){.zaia-merchant-help-fab span{display:none}.zaia-merchant-help-fab{width:44px;padding:0}.zaia-mhelp-backdrop{align-items:stretch;background:#fffaf7;backdrop-filter:none}.zaia-mhelp-sheet{height:var(--zaia-help-vh,100dvh);max-height:none;border-radius:0;box-shadow:none}.zaia-mhelp-head{padding:calc(12px + env(safe-area-inset-top)) 14px 10px}.zaia-mhelp-head h2{font-size:21px;margin:3px 0}.zaia-mhelp-head p{font-size:9.5px}.zaia-mhelp-chips{padding:8px 14px 4px;gap:5px}.zaia-mhelp-chip{font-size:8px;padding:6px 8px}.zaia-mhelp-body{padding:8px 14px calc(16px + env(safe-area-inset-bottom))}.zaia-mhelp-quick{grid-template-columns:1fr 1fr}.zaia-mhelp-sheet.search-focused .zaia-mhelp-head-row p,.zaia-mhelp-sheet.search-focused .zaia-mhelp-chips,.zaia-mhelp-sheet.search-focused .zaia-mhelp-search-help{display:none}.zaia-mhelp-sheet.search-focused .zaia-mhelp-head{padding-bottom:8px}.zaia-mhelp-sheet.search-focused .zaia-mhelp-head h2{font-size:17px;margin:1px 0}.zaia-mhelp-sheet.search-focused .zaia-mhelp-search-label{margin-top:7px}.zaia-mhelp-sheet.search-focused .zaia-mhelp-quick,.zaia-mhelp-sheet.search-focused .zaia-mhelp-start{display:none}}
  @media(max-width:380px){.zaia-mhelp-quick{grid-template-columns:1fr}}
  `
  document.head.appendChild(style)
}

function itemHtml(item){
  return `<article class="zaia-mhelp-item ${expandedId===item.id?'open':''}" data-help-id="${item.id}"><button class="zaia-mhelp-item-btn" data-mhelp-expand="${item.id}"><div><span>${esc(item.category)}</span><strong>${esc(item.title)}</strong><small>${esc(item.where)}</small></div><b class="zaia-mhelp-chevron">⌄</b></button><div class="zaia-mhelp-detail"><div class="zaia-mhelp-where"><span>Onde fica</span><strong>${esc(item.where)}</strong></div><p>${esc(item.summary)}</p><ol class="zaia-mhelp-steps">${item.steps.map(step=>`<li>${esc(step)}</li>`).join('')}</ol>${item.action?`<button class="zaia-mhelp-action" data-mhelp-action="${item.action}">${esc(item.actionLabel||'Ir para essa função')}</button>`:''}</div></article>`
}
function quickHtml(){
  return `<div class="zaia-mhelp-section-title"><strong>O que você quer fazer?</strong><span>Toque em uma opção</span></div><div class="zaia-mhelp-quick">${QUICK_ACTIONS.map(x=>`<button data-mhelp-action="${x.action}"><i>${esc(x.icon)}</i><span><strong>${esc(x.label)}</strong><small>${esc(x.hint)}</small></span></button>`).join('')}</div>`
}
function resultsHtml(){
  const items=filteredItems()
  const q=helpQuery.trim()
  const defaultView=!q&&helpCategory==='Todos'
  return `${defaultView?quickHtml()+`<div class="zaia-mhelp-start"><strong>Primeira vez na ZAIA?</strong><p>Comece pelo guia de preparação da loja. Ele mostra a ordem certa sem exigir que você conheça os nomes das telas.</p><button data-mhelp-open-guide="primeiros-passos">Abrir guia de primeiros passos →</button></div>`:''}<div class="zaia-mhelp-section-title"><strong>${q?'Resultados para “'+esc(q)+'”':helpCategory==='Todos'?'Dúvidas mais comuns':esc(helpCategory)}</strong><span>${items.length} ${items.length===1?'resultado':'resultados'}</span></div><div class="zaia-mhelp-results">${items.length?items.map(itemHtml).join(''):`<div class="zaia-mhelp-empty"><strong>Não achei exatamente isso.</strong><p>Escreva do seu jeito, por exemplo: “quero marcar cliente”, “horário do funcionário”, “receber pagamento” ou “minha loja não aparece”.</p></div>`}</div>${defaultView&&!showAll?`<button class="zaia-mhelp-all" data-mhelp-show-all>Ver todos os ${HELP_ITEMS.length} guias</button>`:''}`
}
function updateResults(){
  const target=document.getElementById('zaiaMerchantHelpResults')
  if(target)target.innerHTML=resultsHtml()
  const clear=document.querySelector('.zaia-mhelp-clear')
  clear?.classList.toggle('visible',Boolean(helpQuery))
}
function updateCategoryButtons(){
  document.querySelectorAll('[data-mhelp-category]').forEach(button=>button.classList.toggle('active',button.dataset.mhelpCategory===helpCategory))
}
function syncViewport(){
  const wrap=document.getElementById('zaiaMerchantHelp')
  if(!wrap)return
  const h=window.visualViewport?.height
  if(h)wrap.style.setProperty('--zaia-help-vh',`${Math.round(h)}px`)
}

function renderHelp(){
  document.getElementById('zaiaMerchantHelp')?.remove()
  if(!helpOpen)return
  const wrap=document.createElement('div')
  wrap.id='zaiaMerchantHelp'
  wrap.className='zaia-mhelp-backdrop'
  wrap.innerHTML=`<section class="zaia-mhelp-sheet" role="dialog" aria-modal="true" aria-label="Central de Ajuda do lojista"><header class="zaia-mhelp-head"><div class="zaia-mhelp-head-row"><div><span class="zaia-mhelp-kicker">CENTRAL DO LOJISTA</span><h2>O que você quer fazer?</h2><p>Você não precisa saber o nome da tela. Escolha uma ação abaixo ou escreva com suas próprias palavras.</p></div><button class="zaia-mhelp-close" data-mhelp-close aria-label="Fechar">×</button></div><label class="zaia-mhelp-search-label" for="zaiaMerchantHelpSearch">Digite o que você precisa</label><div class="zaia-mhelp-search"><span class="zaia-mhelp-search-icon">⌕</span><input id="zaiaMerchantHelpSearch" value="${esc(helpQuery)}" placeholder="Ex.: quero marcar um cliente" autocomplete="off" autocapitalize="sentences" enterkeyhint="search"><button class="zaia-mhelp-clear ${helpQuery?'visible':''}" type="button" data-mhelp-clear aria-label="Limpar busca">×</button></div><div class="zaia-mhelp-search-help">Exemplos: “cadastrar profissional”, “minha loja não aparece”, “ver despesas”.</div></header><div class="zaia-mhelp-chips">${HELP_CATEGORIES.map(c=>`<button class="zaia-mhelp-chip ${helpCategory===c?'active':''}" data-mhelp-category="${esc(c)}">${esc(c)}</button>`).join('')}</div><div class="zaia-mhelp-body" id="zaiaMerchantHelpResults">${resultsHtml()}</div></section>`
  document.body.appendChild(wrap)
  bindHelp()
  syncViewport()
  viewportHandler=()=>syncViewport()
  window.visualViewport?.addEventListener('resize',viewportHandler)
}
function openHelp(){helpOpen=true;helpQuery='';helpCategory='Todos';expandedId=null;showAll=false;renderHelp()}
function closeHelp(){
  helpOpen=false
  if(viewportHandler)window.visualViewport?.removeEventListener('resize',viewportHandler)
  viewportHandler=null
  document.getElementById('zaiaMerchantHelp')?.remove()
}

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
    afterPage('more','[data-open="zaiaPro"]')
  }
}

function bindHelp(){
  const wrap=document.getElementById('zaiaMerchantHelp')
  const sheet=wrap?.querySelector('.zaia-mhelp-sheet')
  const input=document.getElementById('zaiaMerchantHelpSearch')
  wrap?.addEventListener('click',e=>{
    if(e.target===wrap){closeHelp();return}
    if(e.target.closest('[data-mhelp-close]')){closeHelp();return}
    if(e.target.closest('[data-mhelp-clear]')){
      helpQuery='';expandedId=null;showAll=false
      if(input){input.value='';input.focus()}
      updateResults();return
    }
    const category=e.target.closest('[data-mhelp-category]')
    if(category){helpCategory=category.dataset.mhelpCategory;expandedId=null;showAll=true;updateCategoryButtons();updateResults();return}
    const show=e.target.closest('[data-mhelp-show-all]')
    if(show){showAll=true;updateResults();return}
    const guide=e.target.closest('[data-mhelp-open-guide]')
    if(guide){expandedId=guide.dataset.mhelpOpenGuide;showAll=true;updateResults();document.querySelector(`[data-help-id="${expandedId}"]`)?.scrollIntoView({behavior:'smooth',block:'start'});return}
    const expand=e.target.closest('[data-mhelp-expand]')
    if(expand){
      const id=expand.dataset.mhelpExpand
      const item=expand.closest('.zaia-mhelp-item')
      const wasOpen=item?.classList.contains('open')
      document.querySelectorAll('.zaia-mhelp-item.open').forEach(x=>x.classList.remove('open'))
      expandedId=wasOpen?null:id
      if(!wasOpen)item?.classList.add('open')
      return
    }
    const action=e.target.closest('[data-mhelp-action]')
    if(action){goTo(action.dataset.mhelpAction)}
  })
  input?.addEventListener('focus',()=>sheet?.classList.add('search-focused'))
  input?.addEventListener('blur',()=>setTimeout(()=>sheet?.classList.remove('search-focused'),120))
  input?.addEventListener('input',e=>{
    helpQuery=e.target.value
    helpCategory='Todos'
    expandedId=null
    showAll=true
    updateCategoryButtons()
    updateResults()
  })
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
    button.innerHTML='<i>?</i><div><strong>Ajuda para fazer uma tarefa</strong><small>Escolha o que quer fazer ou escreva com suas palavras</small></div><b>›</b>'
    button.addEventListener('click',openHelp)
    list.appendChild(button)
  }
}

const observer=new MutationObserver(()=>ensureEntryPoints())
observer.observe(document.documentElement,{childList:true,subtree:true})
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&helpOpen)closeHelp()})
ensureEntryPoints()
