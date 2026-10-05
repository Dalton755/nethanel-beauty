const SESSION_KEY='beauty_os_cloud_session_v2'
const DRAFT_KEY='zaia_pending_appointment_customer_v2'
const cfg=()=>window.BEAUTY_CONFIG||{}
const baseUrl=()=>String(cfg().supabaseUrl||'').replace(/\/$/,'')
const apiKey=()=>cfg().supabasePublishableKey||''
const schema=()=>cfg().schema||'beleza'
const digits=v=>String(v||'').replace(/\D/g,'')
const esc=(v='')=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
const searchable=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim()

function session(){try{return JSON.parse(localStorage.getItem(SESSION_KEY)||'null')}catch{return null}}
async function rest(path,{method='GET',body}={}){
  const s=session()
  if(!s?.access_token)throw new Error('Entre novamente na ZAIA.')
  const res=await fetch(`${baseUrl()}/rest/v1/${path}`,{
    method,
    headers:{apikey:apiKey(),Authorization:`Bearer ${s.access_token}`,'Content-Type':'application/json','Accept-Profile':schema(),'Content-Profile':schema()},
    body:body===undefined?undefined:JSON.stringify(body),
  })
  const text=await res.text();let data=null
  try{data=text?JSON.parse(text):null}catch{data=text}
  if(!res.ok)throw new Error(data?.message||data?.hint||data?.details||(typeof data==='string'?data:'Falha ao consultar o cliente ZAIA.'))
  return data
}

let establishmentId=null
async function getEstablishmentId(){
  if(establishmentId)return establishmentId
  const rows=await rest('establishments?select=id&active=eq.true&order=created_at.asc&limit=1')
  establishmentId=rows?.[0]?.id||null
  if(!establishmentId)throw new Error('Estabelecimento não encontrado.')
  return establishmentId
}
function validPhone(v){const d=digits(v);return d.length===10||d.length===11||((d.length===12||d.length===13)&&d.startsWith('55'))}
function formatPhone(v){
  let d=digits(v).replace(/^55(?=\d{10,11}$)/,'')
  if(d.length===11)return`(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`
  if(d.length===10)return`(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`
  return String(v||'')
}
async function listCustomers(){const id=await getEstablishmentId();return rest(`clients?select=id,name,phone,email,birth_date&establishment_id=eq.${id}&active=eq.true&order=name.asc&limit=500`)}
async function lookup(phone){const id=await getEstablishmentId();return rest('rpc/business_customer_lookup',{method:'POST',body:{p_establishment_id:id,p_phone:phone}})}
async function link(customerId){const id=await getEstablishmentId();return rest('rpc/business_customer_link',{method:'POST',body:{p_establishment_id:id,p_zaia_customer_id:customerId}})}
async function createCustomer({name,phone,email='',birthDate=''}){const id=await getEstablishmentId();return rest('rpc/business_customer_create_or_link',{method:'POST',body:{p_establishment_id:id,p_name:name,p_phone:phone,p_email:email||null,p_birth_date:birthDate||null}})}

function styles(){
  if(document.getElementById('zaia-appointment-customer-style'))return
  const s=document.createElement('style');s.id='zaia-appointment-customer-style';s.textContent=`
    .zaia-appt-customer{margin-bottom:18px}.zaia-appt-customer>label{display:block;font-weight:800;color:#3d2e35;margin-bottom:8px}
    .zaia-appt-search{position:relative}.zaia-appt-search input{width:100%;padding-right:44px}.zaia-appt-search-icon{position:absolute;right:14px;top:50%;transform:translateY(-50%);font-size:18px;opacity:.5;pointer-events:none}
    .zaia-appt-results{display:grid;gap:7px;margin-top:8px;max-height:225px;overflow:auto;overscroll-behavior:contain}.zaia-appt-option{width:100%;border:1px solid rgba(59,23,43,.1);background:#fff;border-radius:14px;padding:11px 12px;display:flex;align-items:center;gap:11px;text-align:left;color:#2f252a}
    .zaia-appt-avatar{width:38px;height:38px;flex:0 0 38px;border-radius:50%;display:grid;place-items:center;background:rgba(59,23,43,.08);color:var(--brand,#3b172b);font-weight:900}.zaia-appt-copy{min-width:0;display:grid;gap:2px}.zaia-appt-copy strong{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:.93rem}.zaia-appt-copy small{font-size:.78rem;color:#84777e}
    .zaia-appt-selected{border:1px solid rgba(54,125,79,.22);background:rgba(54,125,79,.06);border-radius:16px;padding:12px;display:flex;align-items:center;gap:11px;margin-top:8px}.zaia-appt-selected .zaia-appt-copy{flex:1}.zaia-appt-selected button{border:0;background:transparent;color:var(--brand,#3b172b);font-weight:800;padding:7px}
    .zaia-appt-empty{padding:12px;text-align:center;color:#82747b;font-size:.82rem;border:1px dashed rgba(59,23,43,.15);border-radius:14px}.zaia-appt-new{margin-top:9px}.zaia-appt-new-panel{margin-top:10px;padding:13px;border:1px solid rgba(59,23,43,.12);border-radius:16px;background:rgba(59,23,43,.025)}.zaia-appt-new-panel .field{margin-bottom:10px}
    .zaia-appt-status{margin:10px 0;padding:13px;border:1px solid rgba(59,23,43,.12);border-radius:15px;background:rgba(59,23,43,.035)}.zaia-appt-status strong{display:block;color:var(--brand,#3b172b);font-size:.92rem;margin-bottom:3px}.zaia-appt-status p{margin:0;color:#71666d;font-size:.8rem;line-height:1.4}.zaia-appt-status.found{background:rgba(54,125,79,.07);border-color:rgba(54,125,79,.22)}.zaia-appt-status.error{background:rgba(174,53,65,.06);border-color:rgba(174,53,65,.2)}
    .zaia-appt-badge{display:inline-flex;margin-top:6px;font-size:.7rem;font-weight:900;letter-spacing:.04em;color:var(--brand,#3b172b)}.zaia-appt-note{font-size:.75rem;color:#8a7a82;line-height:1.4;margin-top:8px}
    @media(max-width:640px){.zaia-appt-results{max-height:190px}.zaia-appt-option{padding:10px}.zaia-appt-new-panel{padding:11px}}
  `;document.head.appendChild(s)
}

function draftFrom(form,customer){
  return{
    createdAt:Date.now(),customerId:customer.id,customerName:customer.name||'',phone:customer.phone||'',
    serviceId:form.querySelector('[name="serviceId"]')?.value||'',professionalId:form.querySelector('[name="professionalId"]')?.value||'',
    date:form.querySelector('[name="date"]')?.value||'',time:form.querySelector('[name="time"]')?.value||'',
    materials:[...form.querySelectorAll('[data-material-id]')].map(i=>({id:i.dataset.materialId,value:i.value})),
  }
}
function saveDraft(form,customer){try{sessionStorage.setItem(DRAFT_KEY,JSON.stringify(draftFrom(form,customer)))}catch{}}
function readDraft(){try{const d=JSON.parse(sessionStorage.getItem(DRAFT_KEY)||'null');if(d&&Date.now()-Number(d.createdAt||0)<120000)return d;sessionStorage.removeItem(DRAFT_KEY)}catch{}return null}
function clearDraft(){try{sessionStorage.removeItem(DRAFT_KEY)}catch{}}

async function enhance(form){
  if(!form||form.dataset.zaiaSmartCustomer==='true')return
  form.dataset.zaiaSmartCustomer='true'
  const nameInput=form.querySelector('[name="clientName"]'),phoneInput=form.querySelector('[name="phone"]')
  if(!nameInput||!phoneInput)return
  const nameField=nameInput.closest('.field'),phoneField=phoneInput.closest('.field')
  if(nameField)nameField.style.display='none';if(phoneField)phoneField.style.display='none'
  nameInput.required=true
  phoneInput.required=false

  const box=document.createElement('div');box.className='zaia-appt-customer';box.innerHTML=`
    <label>Cliente</label>
    <div class="zaia-appt-search"><input type="search" data-appt-search autocomplete="off" placeholder="Buscar por nome ou celular"><span class="zaia-appt-search-icon">⌕</span></div>
    <div class="zaia-appt-results" data-appt-results><div class="zaia-appt-empty">Carregando clientes...</div></div>
    <div data-appt-selected></div>
    <button type="button" class="btn wide zaia-appt-new" data-appt-new>+ Cliente novo ou de outra loja</button>
    <div data-appt-new-panel></div>
  `
  form.insertBefore(box,nameField||form.firstElementChild)
  const search=box.querySelector('[data-appt-search]'),results=box.querySelector('[data-appt-results]'),selected=box.querySelector('[data-appt-selected]'),newButton=box.querySelector('[data-appt-new]'),newHost=box.querySelector('[data-appt-new-panel]')
  let customers=[]

  function choose(c){
    form._zaiaAppointmentCustomer=c
    nameInput.value=c.name||'Cliente';phoneInput.value=c.phone||''
    search.value='';results.hidden=true;newHost.innerHTML='';newButton.hidden=false
    selected.innerHTML=`<div class="zaia-appt-selected"><div class="zaia-appt-avatar">${esc((c.name||'C')[0].toUpperCase())}</div><div class="zaia-appt-copy"><strong>${esc(c.name||'Cliente')}</strong><small>${esc(formatPhone(c.phone)||'Cliente cadastrado')}</small></div><button type="button" data-appt-change>Trocar</button></div>`
    selected.querySelector('[data-appt-change]').onclick=()=>{form._zaiaAppointmentCustomer=null;nameInput.value='';phoneInput.value='';selected.innerHTML='';results.hidden=false;render('');setTimeout(()=>search.focus(),0)}
  }
  function render(term=''){
    const q=searchable(term),pd=digits(term)
    let rows=customers
    if(q||pd)rows=customers.filter(c=>searchable(c.name).includes(q)||(pd&&digits(c.phone).includes(pd)))
    rows=rows.slice(0,12)
    results.innerHTML=rows.length?rows.map(c=>`<button type="button" class="zaia-appt-option" data-appt-id="${c.id}"><span class="zaia-appt-avatar">${esc((c.name||'C')[0].toUpperCase())}</span><span class="zaia-appt-copy"><strong>${esc(c.name||'Cliente')}</strong><small>${esc(formatPhone(c.phone)||'Sem celular')}</small></span></button>`).join(''):`<div class="zaia-appt-empty">Nenhum cliente desta loja encontrado.<br>Use “Cliente novo ou de outra loja”.</div>`
    results.querySelectorAll('[data-appt-id]').forEach(b=>b.onclick=()=>{const c=customers.find(x=>x.id===b.dataset.apptId);if(c)choose(c)})
  }

  function openNew(){
    newButton.hidden=true;results.hidden=true;selected.innerHTML='';search.value='';form._zaiaAppointmentCustomer=null;nameInput.value='';phoneInput.value=''
    newHost.innerHTML=`<div class="zaia-appt-new-panel"><div class="field"><label>WhatsApp</label><input data-new-phone inputmode="tel" autocomplete="tel" placeholder="(11) 99999-9999"></div><button type="button" class="btn wide" data-global-search>Buscar no ZAIA</button><div class="zaia-appt-status" data-global-status><strong>Localize pelo celular</strong><p>Se o cliente já existir no ZAIA, não criaremos outro cadastro.</p></div><div data-new-fields hidden><div class="field"><label>Nome</label><input data-new-name autocomplete="name"></div><div class="field"><label>E-mail <small>(opcional)</small></label><input data-new-email type="email" autocomplete="email"></div><div class="field"><label>Data de nascimento <small>(opcional)</small></label><input data-new-birth type="date"></div></div><div data-global-actions></div><button type="button" class="btn wide ghost" data-cancel-new style="margin-top:8px">Voltar para clientes da loja</button><div class="zaia-appt-note">A busca é pelo número completo. Outras lojas e históricos não são exibidos.</div></div>`
    const p=newHost.querySelector('[data-new-phone]'),btn=newHost.querySelector('[data-global-search]'),status=newHost.querySelector('[data-global-status]'),fields=newHost.querySelector('[data-new-fields]'),actions=newHost.querySelector('[data-global-actions]'),n=newHost.querySelector('[data-new-name]'),email=newHost.querySelector('[data-new-email]'),birth=newHost.querySelector('[data-new-birth]')
    newHost.querySelector('[data-cancel-new]').onclick=()=>{newHost.innerHTML='';newButton.hidden=false;results.hidden=false;render('');search.focus()}
    const readyAndReload=saved=>{const c={id:saved.id,name:saved.name||n.value||'Cliente',phone:saved.phone||p.value};saveDraft(form,c);status.className='zaia-appt-status found';status.innerHTML=`<strong>${esc(c.name)} pronto</strong><p>Atualizando o atendimento com o cadastro único do ZAIA...</p>`;setTimeout(()=>location.reload(),260)}
    async function run(){
      if(!validPhone(p.value)){status.className='zaia-appt-status error';status.innerHTML='<strong>Celular inválido</strong><p>Informe DDD + número.</p>';return}
      btn.disabled=true;btn.textContent='Buscando...';actions.innerHTML='';fields.hidden=true
      try{
        const r=await lookup(p.value)
        if(r?.found){
          n.value=r.full_name||''
          if(r.already_linked&&r.client_id){
            const c={id:r.client_id,name:r.full_name||'Cliente',phone:p.value}
            status.className='zaia-appt-status found';status.innerHTML=`<strong>${esc(c.name)}</strong><p>Este cliente já está vinculado a esta loja.</p><span class="zaia-appt-badge">✓ CLIENTE ZAIA</span>`
            actions.innerHTML='<button type="button" class="btn primary wide" data-use>Usar neste atendimento</button>'
            actions.querySelector('[data-use]').onclick=()=>{if(!customers.some(x=>x.id===c.id))customers.unshift(c);choose(c)}
          }else{
            status.className='zaia-appt-status found';status.innerHTML=`<strong>Cliente ZAIA encontrado</strong><p>${esc(r.full_name||'')} já existe. Vamos apenas vinculá-lo a esta loja.</p><span class="zaia-appt-badge">✓ SEM DUPLICAR</span>`
            actions.innerHTML='<button type="button" class="btn primary wide" data-link>Adicionar e usar no atendimento</button>'
            actions.querySelector('[data-link]').onclick=async e=>{const b=e.currentTarget;b.disabled=true;b.textContent='Adicionando...';try{readyAndReload(await link(r.zaia_customer_id))}catch(err){b.disabled=false;b.textContent='Adicionar e usar no atendimento';status.className='zaia-appt-status error';status.innerHTML=`<strong>Não foi possível adicionar</strong><p>${esc(err?.message||err)}</p>`}}
          }
        }else{
          fields.hidden=false;status.className='zaia-appt-status';status.innerHTML='<strong>Novo cliente ZAIA</strong><p>Este celular ainda não existe. Complete os dados aqui mesmo.</p>'
          actions.innerHTML='<button type="button" class="btn primary wide" data-create>Cadastrar e usar no atendimento</button>'
          actions.querySelector('[data-create]').onclick=async e=>{const b=e.currentTarget,name=String(n.value||'').trim();if(name.length<2){status.className='zaia-appt-status error';status.innerHTML='<strong>Informe o nome</strong><p>O nome é necessário para criar o cliente.</p>';n.focus();return}b.disabled=true;b.textContent='Cadastrando...';try{readyAndReload(await createCustomer({name,phone:p.value,email:String(email.value||'').trim(),birthDate:birth.value||''}))}catch(err){b.disabled=false;b.textContent='Cadastrar e usar no atendimento';status.className='zaia-appt-status error';status.innerHTML=`<strong>Não foi possível cadastrar</strong><p>${esc(err?.message||err)}</p>`}}
          setTimeout(()=>n.focus(),0)
        }
      }catch(err){status.className='zaia-appt-status error';status.innerHTML=`<strong>Não foi possível pesquisar</strong><p>${esc(err?.message||err)}</p>`}finally{btn.disabled=false;btn.textContent='Buscar no ZAIA'}
    }
    btn.onclick=run;p.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();run()}};setTimeout(()=>p.focus(),0)
  }

  newButton.onclick=openNew;search.oninput=()=>render(search.value);search.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();const first=results.querySelector('[data-appt-id]');if(first)first.click();else if(validPhone(search.value)){openNew();const p=newHost.querySelector('[data-new-phone]');if(p)p.value=search.value}}}
  try{customers=(await listCustomers()).map(r=>({id:r.id,name:r.name,phone:r.phone||'',email:r.email||'',birthDate:r.birth_date||''}));render('')}catch(err){results.innerHTML=`<div class="zaia-appt-empty">Não foi possível carregar clientes.<br>${esc(err?.message||err)}</div>`}

  const d=readDraft()
  if(d?.customerId){
    choose(customers.find(c=>c.id===d.customerId)||{id:d.customerId,name:d.customerName||'Cliente',phone:d.phone||''})
    const service=form.querySelector('[name="serviceId"]'),date=form.querySelector('[name="date"]'),time=form.querySelector('[name="time"]')
    if(service&&d.serviceId){service.value=d.serviceId;service.dispatchEvent(new Event('change',{bubbles:true}))}
    if(date&&d.date)date.value=d.date;if(time&&d.time)time.value=d.time
    setTimeout(()=>{const pro=form.querySelector('[name="professionalId"]');if(pro&&d.professionalId)pro.value=d.professionalId;for(const m of d.materials||[]){const inp=[...form.querySelectorAll('[data-material-id]')].find(i=>i.dataset.materialId===m.id);if(inp)inp.value=m.value}clearDraft()},250)
  }
}

function enhanceAll(){styles();document.querySelectorAll('#appointmentForm').forEach(f=>enhance(f).catch(e=>console.warn('ZAIA appointment customer',e)))}
document.addEventListener('submit',e=>{const f=e.target;if(!(f instanceof HTMLFormElement)||f.id!=='appointmentForm'||f.dataset.zaiaSmartCustomer!=='true')return;if(!f._zaiaAppointmentCustomer){e.preventDefault();e.stopImmediatePropagation();f.querySelector('[data-appt-search]')?.focus();f.querySelector('[data-appt-results]')?.scrollIntoView({behavior:'smooth',block:'center'})}},true)
function resume(){const d=readDraft();if(!d?.customerId||document.querySelector('#appointmentForm'))return;document.querySelector('[data-open="appointment"]')?.click()}
new MutationObserver(()=>queueMicrotask(()=>{enhanceAll();resume()})).observe(document.documentElement,{childList:true,subtree:true})
enhanceAll();setTimeout(resume,650)
