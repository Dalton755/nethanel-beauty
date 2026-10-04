const ZAIA_INVITE_SESSION_KEY='beauty_os_cloud_session_v2'
const inviteCfg=()=>window.BEAUTY_CONFIG||{}
const inviteBaseUrl=()=>String(inviteCfg().supabaseUrl||'').replace(/\/$/,'')
const inviteApiKey=()=>inviteCfg().supabasePublishableKey||''
const inviteSchema=()=>inviteCfg().schema||'beleza'

function inviteSession(){
  try{return JSON.parse(localStorage.getItem(ZAIA_INVITE_SESSION_KEY)||'null')}catch{return null}
}

async function inviteRest(path,{method='GET',body}={}){
  const session=inviteSession()
  if(!session?.access_token)throw new Error('Entre novamente na ZAIA.')
  const res=await fetch(`${inviteBaseUrl()}/rest/v1/${path}`,{
    method,
    headers:{
      apikey:inviteApiKey(),
      Authorization:`Bearer ${session.access_token}`,
      'Content-Type':'application/json',
      'Accept-Profile':inviteSchema(),
      'Content-Profile':inviteSchema(),
    },
    body:body===undefined?undefined:JSON.stringify(body),
  })
  const text=await res.text()
  let data=null
  try{data=text?JSON.parse(text):null}catch{data=text}
  if(!res.ok)throw new Error(data?.message||data?.hint||data?.details||'Não foi possível gerar o convite.')
  return data
}

let merchantInviteEstablishmentId=null
async function inviteEstablishmentId(){
  if(merchantInviteEstablishmentId)return merchantInviteEstablishmentId
  const rows=await inviteRest('establishments?select=id&active=eq.true&order=created_at.asc&limit=1')
  merchantInviteEstablishmentId=rows?.[0]?.id||null
  if(!merchantInviteEstablishmentId)throw new Error('Estabelecimento não encontrado.')
  return merchantInviteEstablishmentId
}

const inviteDigits=value=>String(value||'').replace(/\D/g,'').replace(/^55(?=\d{10,11}$)/,'')

async function generateCustomerInvite(zaiaCustomerId){
  const establishmentId=await inviteEstablishmentId()
  return inviteRest('rpc/business_customer_invite',{
    method:'POST',
    body:{p_establishment_id:establishmentId,p_zaia_customer_id:zaiaCustomerId},
  })
}

function ensureInviteButton(form){
  if(!form||form.id!=='clientForm'||form.dataset.zaiaGlobalCustomer!=='true')return
  const lookup=form._zaiaLookup
  let box=form.querySelector('[data-zaia-invite-box]')

  if(!lookup?.found||!lookup?.already_linked){
    box?.remove()
    return
  }

  if(!box){
    box=document.createElement('div')
    box.dataset.zaiaInviteBox='true'
    box.className='zaia-customer-lookup-box found'
    const status=form.querySelector('[data-zaia-customer-status]')
    status?.insertAdjacentElement('afterend',box)
  }

  if(lookup.has_zaia_account){
    box.innerHTML='<strong>Conta ZAIA ativa</strong><p>Este cliente já possui acesso ao app. Os próximos vínculos e agendamentos usam a mesma identidade.</p><span class="zaia-global-badge">✓ CONTA ATIVA</span>'
    return
  }

  box.innerHTML='<strong>Ative o app do cliente</strong><p>Envie um convite único pelo WhatsApp. Ao entrar ou criar a conta, o histórico já vinculado será conectado automaticamente.</p><button type="button" class="btn primary wide" data-send-zaia-invite>Convidar pelo WhatsApp</button><div class="helper" data-zaia-invite-status></div>'
  const button=box.querySelector('[data-send-zaia-invite]')
  button?.addEventListener('click',async()=>{
    const status=box.querySelector('[data-zaia-invite-status]')
    const phone=form.querySelector('[name="phone"]')?.value||''
    const digits=inviteDigits(phone)
    if(digits.length<10){
      if(status)status.textContent='Informe um WhatsApp válido.'
      return
    }
    button.disabled=true
    button.textContent='Gerando convite...'
    try{
      const invite=await generateCustomerInvite(lookup.zaia_customer_id)
      if(invite?.already_active){
        box.innerHTML='<strong>Conta ZAIA ativa</strong><p>Este cliente já possui acesso ao app.</p><span class="zaia-global-badge">✓ CONTA ATIVA</span>'
        return
      }
      if(!invite?.token)throw new Error('Convite não retornou um token válido.')
      const link=`${location.origin}/cliente?convite=${encodeURIComponent(invite.token)}`
      const name=lookup.full_name||'cliente'
      const message=`Olá, ${name}! Seu cadastro no ZAIA está pronto. Ative sua conta para acessar seus agendamentos, histórico e benefícios: ${link}`
      if(status)status.textContent='Convite criado. Abrindo o WhatsApp...'
      window.open(`https://wa.me/55${digits}?text=${encodeURIComponent(message)}`,'_blank','noopener,noreferrer')
      button.textContent='Reenviar convite pelo WhatsApp'
      button.disabled=false
    }catch(error){
      if(status)status.textContent=String(error?.message||error)
      button.disabled=false
      button.textContent='Convidar pelo WhatsApp'
    }
  },{once:true})
}

function refreshInviteUi(){
  document.querySelectorAll('#clientForm').forEach(ensureInviteButton)
}

const merchantInviteObserver=new MutationObserver(()=>queueMicrotask(refreshInviteUi))
merchantInviteObserver.observe(document.documentElement,{childList:true,subtree:true,characterData:true})
setInterval(refreshInviteUi,700)
refreshInviteUi()
