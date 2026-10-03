const SESSION_KEY='beauty_os_cloud_session_v2'
const cfg=()=>window.BEAUTY_CONFIG||{}
const baseUrl=()=>String(cfg().supabaseUrl||'').replace(/\/$/,'')
const apiKey=()=>cfg().supabasePublishableKey||''
const schema=()=>cfg().schema||'beleza'

let open=false
let listening=false
let recognition=null
let speaking=false
let messages=[]
let actionNonce=0

const q=(s,r=document)=>r.querySelector(s)
const esc=(v='')=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
const normalize=(v='')=>String(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9 ]+/g,' ').replace(/\s+/g,' ').trim()
const session=()=>{try{return JSON.parse(localStorage.getItem(SESSION_KEY)||'null')}catch{return null}}

async function rpc(name,body={}){
  const s=session()
  if(!s?.access_token||!baseUrl()||!apiKey())throw new Error('Entre na sua conta ZAIA para continuar.')
  const res=await fetch(`${baseUrl()}/rest/v1/rpc/${name}`,{
    method:'POST',
    headers:{apikey:apiKey(),Authorization:`Bearer ${s.access_token}`,'Content-Type':'application/json','Accept-Profile':schema(),'Content-Profile':schema()},
    body:JSON.stringify(body),
  })
  const text=await res.text()
  let data=null
  try{data=text?JSON.parse(text):null}catch{data=text}
  if(!res.ok)throw new Error(data?.message||data?.hint||data?.details||String(data||`Erro ${res.status}`))
  return data
}

const money=n=>Number(n||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})
const dateText=iso=>new Date(iso).toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'2-digit'})
const timeText=iso=>new Date(iso).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})

function speak(text){
  if(!('speechSynthesis'in window)||!text)return
  try{
    speechSynthesis.cancel()
    const u=new SpeechSynthesisUtterance(String(text).replace(/[*•]/g,' '))
    u.lang='pt-BR';u.rate=.98;u.pitch=1
    u.onstart=()=>{speaking=true}
    u.onend=()=>{speaking=false}
    speechSynthesis.speak(u)
  }catch{}
}

function initialMessage(){
  return {from:'assistant',text:'Oi! Eu sou o Assistente ZAIA. Você pode falar comigo ou tocar em uma opção. Posso ajudar a agendar, ver seu horário, avisar que está chegando ou confirmar sua chegada.'}
}

function ensureMessages(){if(!messages.length)messages=[initialMessage()]}

function quickActions(){
  return [
    ['next','Meu próximo horário','calendar'],
    ['book','Quero agendar','plus'],
    ['onway','Estou chegando','route'],
    ['arrived','Cheguei','pin'],
    ['promos','Promoções','gift'],
    ['help','Preciso de ajuda','help'],
  ]
}

function icon(type){
  const map={
    mic:'<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8"/>',
    send:'<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
    calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
    plus:'<path d="M12 5v14M5 12h14"/>',
    route:'<path d="M4 6h10a4 4 0 0 1 0 8H9"/><path d="m12 11-3 3 3 3M4 3v6"/>',
    pin:'<path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2"/>',
    gift:'<path d="M20 12v9H4v-9M2 7h20v5H2zM12 21V7M12 7H7.5a2.5 2.5 0 1 1 2.5-2.5c0 2.5 2 2.5 2 2.5Zm0 0h4.5A2.5 2.5 0 1 0 14 4.5C14 7 12 7 12 7Z"/>',
    help:'<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.7 2.7 0 1 1 4.1 2.3c-1 .6-1.6 1-1.6 2.2M12 17h.01"/>',
    volume:'<path d="M11 5 6 9H3v6h3l5 4Z"/><path d="M15 9a4 4 0 0 1 0 6M17.5 6.5a8 8 0 0 1 0 11"/>',
  }
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${map[type]||map.help}</svg>`
}

function renderFab(){
  if(q('#zaiaAssistantFab'))return
  const b=document.createElement('button')
  b.id='zaiaAssistantFab';b.className='zaia-assistant-fab';b.type='button';b.setAttribute('aria-label','Falar com o Assistente ZAIA')
  b.innerHTML=`<span>${icon('mic')}</span><b>Falar com a ZAIA</b>`
  document.body.appendChild(b)
}

function messageActions(actions=[]){
  if(!actions.length)return ''
  return `<div class="zaia-assistant-msg-actions">${actions.map(a=>`<button type="button" data-assistant-action="${esc(a.id)}" ${a.value!=null?`data-value="${esc(a.value)}"`:''}>${esc(a.label)}</button>`).join('')}</div>`
}

function renderSheet(){
  q('#zaiaAssistantRoot')?.remove()
  if(!open)return
  ensureMessages()
  const root=document.createElement('div')
  root.id='zaiaAssistantRoot';root.className='zaia-assistant-backdrop'
  root.innerHTML=`<section class="zaia-assistant-sheet" role="dialog" aria-modal="true" aria-label="Assistente ZAIA">
    <header class="zaia-assistant-head"><div class="zaia-assistant-mark">Z</div><div><span>ASSISTENTE ZAIA</span><h2>Como posso ajudar?</h2><p>Fale normalmente ou toque em uma opção.</p></div><button type="button" class="zaia-assistant-close" data-assistant-close>×</button></header>
    <div class="zaia-assistant-conversation" id="zaiaAssistantConversation">${messages.map(m=>`<div class="zaia-assistant-msg ${m.from}"><div>${esc(m.text)}</div>${messageActions(m.actions)}</div>`).join('')}</div>
    <div class="zaia-assistant-quick">${quickActions().map(([id,label,ic])=>`<button type="button" data-assistant-quick="${id}">${icon(ic)}<span>${label}</span></button>`).join('')}</div>
    <div class="zaia-assistant-voice"><button type="button" class="zaia-assistant-mic ${listening?'listening':''}" data-assistant-mic>${icon('mic')}<span>${listening?'Estou ouvindo...':'Toque e fale'}</span></button><small>${window.SpeechRecognition||window.webkitSpeechRecognition?'Você pode falar em português normalmente.':'Seu navegador não oferece ditado por voz; use o campo abaixo.'}</small></div>
    <form class="zaia-assistant-form" id="zaiaAssistantForm"><input id="zaiaAssistantInput" autocomplete="off" placeholder="Digite: qual é meu horário?"><button type="submit" aria-label="Enviar">${icon('send')}</button></form>
    <div class="zaia-assistant-note">Assistente rápido da ZAIA • respostas baseadas nas funções do app</div>
  </section>`
  document.body.appendChild(root)
  requestAnimationFrame(()=>root.classList.add('show'))
  setTimeout(()=>{const c=q('#zaiaAssistantConversation');if(c)c.scrollTop=c.scrollHeight},20)
}

function openAssistant(){open=true;renderSheet()}
function closeAssistant(){open=false;recognition?.stop?.();listening=false;renderSheet()}

function pushUser(text){messages.push({from:'user',text})}
function reply(text,actions=[],voice=false){messages.push({from:'assistant',text,actions});renderSheet();if(voice)speak(text)}

async function dashboard(){return rpc('customer_my_dashboard')}
async function operational(){return rpc('customer_operational_now')}

function nextFrom(data){return data?.upcoming?.[0]||null}
function describeAppointment(a){
  if(!a)return 'Você não tem nenhum agendamento futuro no momento.'
  return `${a.service_name} em ${a.establishment_name}, ${dateText(a.starts_at)} às ${timeText(a.starts_at)}, com ${a.professional_name}.`
}

function goTab(tab){
  closeAssistant()
  const target=q(`[data-client-tab="${tab}"]`)
  if(target){target.click();return}
  location.assign(tab==='buscar'?'/cliente':`/cliente?tab=${encodeURIComponent(tab)}`)
}

function setPendingSearch(term){
  sessionStorage.setItem('zaia_assistant_pending_search',term)
  closeAssistant()
  location.assign('/cliente')
}

function applyPendingSearch(){
  const term=sessionStorage.getItem('zaia_assistant_pending_search')
  if(!term)return
  const input=q('#clientSearch'),form=q('#clientSearchForm')
  if(!input||!form)return
  sessionStorage.removeItem('zaia_assistant_pending_search')
  input.value=term
  input.dispatchEvent(new Event('input',{bubbles:true}))
  form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}))
}

function etaFrom(text){
  const n=normalize(text)
  const digit=n.match(/\b(\d{1,2})\s*(min|minuto|minutos)?\b/)
  if(digit)return Math.min(60,Math.max(1,Number(digit[1])))
  const words={cinco:5,dez:10,quinze:15,vinte:20,trinta:30}
  for(const [w,v] of Object.entries(words))if(n.includes(w))return v
  return null
}

function serviceFrom(text){
  const n=normalize(text)
  const services=[
    [/corte.*barba|barba.*corte/,'Corte + barba'],[/barba/,'Barba'],[/cortar|corte|cabelo/,'Corte'],[/sobrancel/,'Design de sobrancelhas'],[/manicure|unha/,'Manicure'],[/cilio/,'Cílios'],[/escova/,'Escova'],[/hidrat/,'Hidratação'],[/progressiva/,'Progressiva'],[/maquiag/,'Maquiagem'],[/depila/,'Depilação'],[/estetica|limpeza de pele/,'Estética']
  ]
  return services.find(([rx])=>rx.test(n))?.[1]||null
}

async function showNext(voice=false){
  try{
    const a=nextFrom(await dashboard())
    if(!a)return reply('Você não tem nenhum agendamento futuro agora.',[{id:'book',label:'Quero agendar'}],voice)
    reply(`Seu próximo horário é ${describeAppointment(a)}`,[{id:'agenda',label:'Abrir minha agenda'},{id:'address',label:'Ver endereço'}],voice)
  }catch(e){reply(e.message||'Não consegui consultar sua agenda agora.',[],voice)}
}

async function showAddress(voice=false){
  try{
    const a=nextFrom(await dashboard())
    if(!a)return reply('Você ainda não tem um próximo atendimento para eu mostrar o endereço.',[{id:'book',label:'Quero agendar'}],voice)
    if(!a.address)return reply(`Seu próximo atendimento é em ${a.establishment_name}, mas o endereço não está disponível no cadastro.`,[{id:'agenda',label:'Abrir agenda'}],voice)
    reply(`${a.establishment_name} fica em ${a.address}.`,[{id:'agenda',label:'Ver atendimento'}],voice)
  }catch(e){reply(e.message||'Não consegui consultar o endereço agora.',[],voice)}
}

async function showProfessional(voice=false){
  try{const a=nextFrom(await dashboard());reply(a?`Seu próximo atendimento será com ${a.professional_name}, em ${a.establishment_name}.`:'Você não tem um atendimento futuro no momento.',a?[{id:'agenda',label:'Abrir agenda'}]:[{id:'book',label:'Agendar'}],voice)}catch(e){reply(e.message,[],voice)}
}

async function showPrice(voice=false){
  try{const a=nextFrom(await dashboard());reply(a?`O valor do seu próximo atendimento, ${a.service_name}, é ${money(a.price)}.`:'Você não tem um atendimento futuro no momento.',a?[{id:'agenda',label:'Abrir agenda'}]:[{id:'book',label:'Agendar'}],voice)}catch(e){reply(e.message,[],voice)}
}

async function startOnWay(eta=null,voice=false){
  try{
    const a=await operational()
    if(!a)return reply('Não encontrei um atendimento próximo o suficiente para avisar que você está a caminho. Posso abrir sua agenda.',[{id:'agenda',label:'Abrir agenda'}],voice)
    if(a.customer_arrived_at)return reply(`Sua chegada em ${a.establishment_name} já está confirmada.`,[],voice)
    if(eta==null){
      return reply(`Certo. Em quanto tempo você acha que chega em ${a.establishment_name}?`,[
        {id:'eta',label:'5 min',value:5},{id:'eta',label:'10 min',value:10},{id:'eta',label:'15 min',value:15},{id:'eta',label:'20 min',value:20},{id:'eta',label:'30 min',value:30},{id:'eta',label:'Sem previsão',value:''}
      ],voice)
    }
    await rpc('customer_operational_action',{p_appointment_id:a.id,p_action:'ON_WAY',p_eta_minutes:eta===''?null:Number(eta)})
    window.dispatchEvent(new Event('zaia:customer-refresh'))
    reply(`Pronto. Avisei ${a.establishment_name} que você está a caminho${eta!==''?` e deve chegar em cerca de ${eta} minutos`:''}.`,[{id:'agenda',label:'Ver atendimento'}],voice)
  }catch(e){reply(e.message||'Não consegui avisar o estabelecimento.',[],voice)}
}

async function prepareArrival(voice=false){
  try{
    const a=await operational()
    if(!a)return reply('Não encontrei um atendimento próximo para confirmar sua chegada. Posso abrir sua agenda.',[{id:'agenda',label:'Abrir agenda'}],voice)
    if(a.customer_arrived_at)return reply(`Sua chegada em ${a.establishment_name} já está confirmada.`,[],voice)
    reply(`Você quer confirmar que já chegou em ${a.establishment_name} para ${a.service_name}?`,[{id:'confirm-arrival',label:'Sim, eu cheguei'},{id:'agenda',label:'Ver atendimento'}],voice)
  }catch(e){reply(e.message||'Não consegui consultar seu atendimento.',[],voice)}
}

async function confirmArrival(voice=false){
  try{
    const a=await operational()
    if(!a)return reply('Não encontrei um atendimento próximo para confirmar sua chegada.',[{id:'agenda',label:'Abrir agenda'}],voice)
    await rpc('customer_operational_action',{p_appointment_id:a.id,p_action:'ARRIVED',p_eta_minutes:0})
    window.dispatchEvent(new Event('zaia:customer-refresh'))
    reply(`Chegada confirmada. ${a.establishment_name} já sabe que você está aí.`,[{id:'agenda',label:'Acompanhar atendimento'}],voice)
  }catch(e){reply(e.message||'Não consegui confirmar sua chegada.',[],voice)}
}

function askService(voice=false){
  reply('Qual serviço você procura? Você pode falar, por exemplo: corte, barba, sobrancelha, manicure ou cílios.',[
    {id:'service',label:'Corte',value:'Corte'},{id:'service',label:'Barba',value:'Barba'},{id:'service',label:'Sobrancelha',value:'Design de sobrancelhas'},{id:'service',label:'Manicure',value:'Manicure'}
  ],voice)
}

async function cancelHelp(voice=false){
  try{
    const a=nextFrom(await dashboard())
    if(!a)return reply('Você não tem nenhum agendamento futuro para cancelar.',[{id:'book',label:'Agendar serviço'}],voice)
    reply(`Seu próximo horário é ${a.service_name} em ${a.establishment_name}, ${dateText(a.starts_at)} às ${timeText(a.starts_at)}. Para evitar cancelamento por engano, vou levar você até a agenda e a ZAIA pedirá a confirmação.`,[{id:'agenda',label:'Ir para agenda e cancelar'}],voice)
  }catch(e){reply(e.message,[],voice)}
}

async function handleCommand(raw,{voice=false}={}){
  const text=String(raw||'').trim()
  if(!text)return
  pushUser(text);renderSheet()
  const n=normalize(text)
  const service=serviceFrom(text)
  const eta=etaFrom(text)

  if(/^(oi|ola|bom dia|boa tarde|boa noite)\b/.test(n))return reply('Oi! Posso ajudar com seu horário, agendamento, promoções ou avisar o estabelecimento que você está chegando.',[],voice)
  if(/\b(ja cheguei|cheguei|estou aqui|to aqui|estou no salao|estou na loja)\b/.test(n))return prepareArrival(voice)
  if(/\b(estou chegando|to chegando|a caminho|indo para|vou chegar|chegando)\b/.test(n))return startOnWay(eta,voice)
  if(/\b(cancelar|desmarcar|nao vou conseguir|nao posso ir)\b/.test(n))return cancelHelp(voice)
  if(/\b(onde fica|endereco|localizacao|como chegar)\b/.test(n))return showAddress(voice)
  if(/\b(quem vai me atender|quem me atende|qual profissional|profissional)\b/.test(n))return showProfessional(voice)
  if(/\b(quanto custa|qual valor|preco|valor do atendimento)\b/.test(n))return showPrice(voice)
  if(/\b(meu horario|qual meu horario|proximo horario|meu agendamento|quando e meu atendimento|tenho horario|agenda)\b/.test(n))return showNext(voice)
  if(/\b(promocao|promocoes|oferta|ofertas|desconto|descontos)\b/.test(n)){reply('Vou abrir as promoções para você.',[],voice);setTimeout(()=>goTab('promocoes'),450);return}
  if(/\b(historico|atendimentos anteriores|o que ja fiz)\b/.test(n)){reply('Vou abrir seu histórico.',[],voice);setTimeout(()=>goTab('historico'),450);return}
  if(/\b(perfil|meus dados|alterar meus dados|notificacao|notificacoes)\b/.test(n)){reply('Vou abrir seu perfil.',[],voice);setTimeout(()=>goTab('perfil'),450);return}
  if(/\b(agendar|marcar|reservar|quero fazer|quero cortar|quero atendimento)\b/.test(n)){
    if(service){reply(`Vou procurar ${service} para você.`,[],voice);setTimeout(()=>setPendingSearch(service),500);return}
    return askService(voice)
  }
  if(service){reply(`Vou procurar ${service} para você.`,[],voice);setTimeout(()=>setPendingSearch(service),500);return}
  if(/\b(ajuda|nao sei usar|nao sei mexer|como funciona|me ajuda)\b/.test(n))return reply('Sem problema. Você pode simplesmente falar o que precisa. Exemplos: “qual é meu horário?”, “quero cortar o cabelo”, “estou chegando” ou “cheguei”.',[{id:'next',label:'Meu horário'},{id:'book',label:'Quero agendar'},{id:'help-manual',label:'Ver manual'}],voice)
  reply('Ainda não entendi esse pedido. Tente falar de um jeito simples, como “quero agendar”, “meu horário”, “estou chegando”, “cheguei” ou “promoções”.',[{id:'next',label:'Meu horário'},{id:'book',label:'Quero agendar'},{id:'help-manual',label:'Ver ajuda'}],voice)
}

function startListening(){
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition
  if(!SR){reply('Seu navegador não oferece reconhecimento de voz. Você pode digitar sua pergunta logo abaixo.');return}
  if(recognition){try{recognition.stop()}catch{}}
  recognition=new SR();recognition.lang='pt-BR';recognition.interimResults=false;recognition.maxAlternatives=1
  recognition.onstart=()=>{listening=true;renderSheet()}
  recognition.onend=()=>{listening=false;renderSheet()}
  recognition.onerror=e=>{listening=false;renderSheet();if(e.error!=='no-speech'&&e.error!=='aborted')reply('Não consegui entender o áudio. Tente novamente falando um pouco mais perto do celular.')}
  recognition.onresult=e=>{const text=e.results?.[0]?.[0]?.transcript||'';if(text)handleCommand(text,{voice:true})}
  try{recognition.start()}catch{}
}

async function handleAction(el){
  const id=el.dataset.assistantAction||el.dataset.assistantQuick
  const value=el.dataset.value
  if(!id)return
  if(id==='next')return showNext()
  if(id==='book')return askService()
  if(id==='onway')return startOnWay()
  if(id==='arrived')return prepareArrival()
  if(id==='promos'){reply('Vou abrir as promoções para você.');setTimeout(()=>goTab('promocoes'),350);return}
  if(id==='help'||id==='help-manual'){closeAssistant();setTimeout(()=>q('#zaiaCustomerHelpFab')?.click?.()||q('.zaia-help-fab')?.click?.(),150);return}
  if(id==='agenda')return goTab('agenda')
  if(id==='address')return showAddress()
  if(id==='eta')return startOnWay(value===' '?'' : value)
  if(id==='confirm-arrival')return confirmArrival()
  if(id==='service')return setPendingSearch(value||'')
}

document.addEventListener('click',e=>{
  if(e.target.closest('#zaiaAssistantFab')){openAssistant();return}
  if(e.target.closest('[data-assistant-close]')||e.target.id==='zaiaAssistantRoot'){closeAssistant();return}
  if(e.target.closest('[data-assistant-mic]')){startListening();return}
  const action=e.target.closest('[data-assistant-action],[data-assistant-quick]')
  if(action){handleAction(action);return}
})

document.addEventListener('submit',e=>{
  if(e.target.id!=='zaiaAssistantForm')return
  e.preventDefault();const input=q('#zaiaAssistantInput');const text=input?.value?.trim();if(text){input.value='';handleCommand(text)}
})

new MutationObserver(()=>{renderFab();applyPendingSearch()}).observe(document.documentElement,{childList:true,subtree:true})
window.addEventListener('pageshow',()=>{renderFab();applyPendingSearch()})

if(location.pathname.startsWith('/cliente')){
  setTimeout(()=>{renderFab();applyPendingSearch()},500)
  console.info('ZAIA rule assistant v1')
}
