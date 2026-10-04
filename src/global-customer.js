const GLOBAL_CUSTOMER_SESSION_KEY = 'beauty_os_cloud_session_v2'

const globalCustomerCfg = () => window.BEAUTY_CONFIG || {}
const globalCustomerBaseUrl = () => String(globalCustomerCfg().supabaseUrl || '').replace(/\/$/, '')
const globalCustomerApiKey = () => globalCustomerCfg().supabasePublishableKey || ''
const globalCustomerSchema = () => globalCustomerCfg().schema || 'beleza'

function globalCustomerSession() {
  try { return JSON.parse(localStorage.getItem(GLOBAL_CUSTOMER_SESSION_KEY) || 'null') } catch { return null }
}

async function globalCustomerRest(path, { method = 'GET', body } = {}) {
  const session = globalCustomerSession()
  if (!session?.access_token) throw new Error('Entre novamente na ZAIA.')
  const res = await fetch(`${globalCustomerBaseUrl()}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: globalCustomerApiKey(),
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
      'Accept-Profile': globalCustomerSchema(),
      'Content-Profile': globalCustomerSchema(),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const text = await res.text()
  let data = null
  try { data = text ? JSON.parse(text) : null } catch { data = text }
  if (!res.ok) {
    const message = data?.message || data?.hint || data?.details || (typeof data === 'string' ? data : 'Falha ao consultar o cliente ZAIA.')
    throw new Error(message)
  }
  return data
}

let cachedEstablishmentId = null
async function currentEstablishmentId() {
  if (cachedEstablishmentId) return cachedEstablishmentId
  const rows = await globalCustomerRest('establishments?select=id&active=eq.true&order=created_at.asc&limit=1')
  cachedEstablishmentId = rows?.[0]?.id || null
  if (!cachedEstablishmentId) throw new Error('Estabelecimento não encontrado.')
  return cachedEstablishmentId
}

const phoneDigits = value => String(value || '').replace(/\D/g, '')
function validBrazilPhone(value) {
  const digits = phoneDigits(value)
  return digits.length === 10 || digits.length === 11 || ((digits.length === 12 || digits.length === 13) && digits.startsWith('55'))
}

async function lookupGlobalCustomer(phone) {
  const establishmentId = await currentEstablishmentId()
  return globalCustomerRest('rpc/business_customer_lookup', {
    method: 'POST',
    body: { p_establishment_id: establishmentId, p_phone: phone },
  })
}

async function linkGlobalCustomer(customerId) {
  const establishmentId = await currentEstablishmentId()
  return globalCustomerRest('rpc/business_customer_link', {
    method: 'POST',
    body: { p_establishment_id: establishmentId, p_zaia_customer_id: customerId },
  })
}

async function createGlobalCustomer({ name, phone, email = '', birthDate = '' }) {
  const establishmentId = await currentEstablishmentId()
  return globalCustomerRest('rpc/business_customer_create_or_link', {
    method: 'POST',
    body: {
      p_establishment_id: establishmentId,
      p_name: name,
      p_phone: phone,
      p_email: email || null,
      p_birth_date: birthDate || null,
    },
  })
}

function injectGlobalCustomerStyles() {
  if (document.getElementById('zaia-global-customer-style')) return
  const style = document.createElement('style')
  style.id = 'zaia-global-customer-style'
  style.textContent = `
    .zaia-customer-lookup-box{margin:10px 0 14px;padding:14px;border:1px solid rgba(59,23,43,.12);border-radius:16px;background:rgba(59,23,43,.035)}
    .zaia-customer-lookup-box strong{display:block;color:var(--brand,#3b172b);font-size:.95rem;margin-bottom:4px}
    .zaia-customer-lookup-box p{margin:0;color:#71666d;font-size:.83rem;line-height:1.4}
    .zaia-customer-lookup-box.found{background:rgba(54,125,79,.07);border-color:rgba(54,125,79,.22)}
    .zaia-customer-lookup-box.exists{background:rgba(200,154,97,.10);border-color:rgba(200,154,97,.30)}
    .zaia-customer-lookup-box.error{background:rgba(174,53,65,.06);border-color:rgba(174,53,65,.20)}
    .zaia-customer-search-btn{margin-top:8px}
    .zaia-global-badge{display:inline-flex;align-items:center;gap:6px;margin-top:7px;font-size:.72rem;font-weight:800;letter-spacing:.04em;color:var(--brand,#3b172b)}
  `
  document.head.appendChild(style)
}

function resetClientLookup(form) {
  form.dataset.zaiaLookupPhone = ''
  form._zaiaLookup = null
  const status = form.querySelector('[data-zaia-customer-status]')
  if (status) {
    status.className = 'zaia-customer-lookup-box'
    status.innerHTML = '<strong>Primeiro, localize o cliente</strong><p>Digite o WhatsApp completo. A busca é exata e não mostra histórico de outros estabelecimentos.</p>'
  }
  const nameField = form.querySelector('[name="name"]')?.closest('.field')
  const emailField = form.querySelector('[data-zaia-email-field]')
  const birthField = form.querySelector('[data-zaia-birth-field]')
  const nameInput = form.querySelector('[name="name"]')
  const submit = form.querySelector('button[type="submit"], button:not([type])')
  if (nameField) nameField.style.display = 'none'
  if (emailField) emailField.style.display = 'none'
  if (birthField) birthField.style.display = 'none'
  if (nameInput) { nameInput.readOnly = false; nameInput.value = '' }
  if (submit) { submit.disabled = true; submit.textContent = 'Buscar cliente primeiro' }
}

function enhanceClientForm(form) {
  if (!form || form.dataset.zaiaGlobalCustomer === 'true') return
  form.dataset.zaiaGlobalCustomer = 'true'

  const nameInput = form.querySelector('[name="name"]')
  const phoneInput = form.querySelector('[name="phone"]')
  if (!nameInput || !phoneInput) return

  phoneInput.required = true
  phoneInput.placeholder = '(11) 99999-9999'
  const nameField = nameInput.closest('.field')
  const phoneField = phoneInput.closest('.field')
  if (phoneField && nameField && phoneField.previousElementSibling !== null) form.insertBefore(phoneField, nameField)

  const searchButton = document.createElement('button')
  searchButton.type = 'button'
  searchButton.className = 'btn wide zaia-customer-search-btn'
  searchButton.textContent = 'Buscar no ZAIA'
  phoneField?.insertAdjacentElement('afterend', searchButton)

  const status = document.createElement('div')
  status.dataset.zaiaCustomerStatus = 'true'
  status.className = 'zaia-customer-lookup-box'
  searchButton.insertAdjacentElement('afterend', status)

  const emailField = document.createElement('div')
  emailField.className = 'field'
  emailField.dataset.zaiaEmailField = 'true'
  emailField.innerHTML = '<label>E-mail <small>(opcional)</small></label><input name="zaiaEmail" type="email" autocomplete="email" placeholder="cliente@email.com">'
  nameField?.insertAdjacentElement('afterend', emailField)

  const birthField = document.createElement('div')
  birthField.className = 'field'
  birthField.dataset.zaiaBirthField = 'true'
  birthField.innerHTML = '<label>Data de nascimento <small>(opcional)</small></label><input name="zaiaBirthDate" type="date">'
  emailField.insertAdjacentElement('afterend', birthField)

  const submit = form.querySelector('button[type="submit"], button:not([type])')
  if (submit) submit.type = 'submit'

  const runLookup = async () => {
    const rawPhone = phoneInput.value
    if (!validBrazilPhone(rawPhone)) {
      status.className = 'zaia-customer-lookup-box error'
      status.innerHTML = '<strong>Celular inválido</strong><p>Informe DDD + número para pesquisar no ZAIA.</p>'
      return
    }
    searchButton.disabled = true
    searchButton.textContent = 'Buscando...'
    try {
      const result = await lookupGlobalCustomer(rawPhone)
      form._zaiaLookup = result
      form.dataset.zaiaLookupPhone = phoneDigits(rawPhone)
      if (result?.found) {
        nameInput.value = result.full_name || ''
        nameInput.readOnly = true
        nameField.style.display = ''
        emailField.style.display = 'none'
        birthField.style.display = 'none'
        if (result.already_linked) {
          status.className = 'zaia-customer-lookup-box exists'
          status.innerHTML = `<strong>${result.full_name || 'Cliente ZAIA'}</strong><p>${result.phone_masked || ''} · Este cliente já está na base deste estabelecimento.</p><span class="zaia-global-badge">✓ CLIENTE ZAIA</span>`
          if (submit) { submit.disabled = true; submit.textContent = 'Cliente já cadastrado' }
        } else {
          status.className = 'zaia-customer-lookup-box found'
          status.innerHTML = `<strong>Cliente ZAIA encontrado</strong><p>${result.full_name || ''} · ${result.phone_masked || ''}. Adicione este cliente ao estabelecimento sem criar outro cadastro.</p><span class="zaia-global-badge">✓ IDENTIDADE ÚNICA ZAIA</span>`
          if (submit) { submit.disabled = false; submit.textContent = 'Adicionar ao estabelecimento' }
        }
      } else {
        nameInput.value = ''
        nameInput.readOnly = false
        nameField.style.display = ''
        emailField.style.display = ''
        birthField.style.display = ''
        status.className = 'zaia-customer-lookup-box'
        status.innerHTML = '<strong>Novo cliente ZAIA</strong><p>Esse celular ainda não está na base global. Complete os dados para criar uma única identidade ZAIA.</p>'
        if (submit) { submit.disabled = false; submit.textContent = 'Cadastrar cliente no ZAIA' }
        setTimeout(() => nameInput.focus(), 0)
      }
    } catch (error) {
      form._zaiaLookup = null
      status.className = 'zaia-customer-lookup-box error'
      status.innerHTML = `<strong>Não foi possível pesquisar</strong><p>${String(error?.message || error)}</p>`
      if (submit) { submit.disabled = true; submit.textContent = 'Tentar novamente' }
    } finally {
      searchButton.disabled = false
      searchButton.textContent = 'Buscar no ZAIA'
    }
  }

  searchButton.addEventListener('click', runLookup)
  phoneInput.addEventListener('input', () => {
    if (form.dataset.zaiaLookupPhone !== phoneDigits(phoneInput.value)) resetClientLookup(form)
  })
  phoneInput.addEventListener('keydown', event => {
    if (event.key === 'Enter') { event.preventDefault(); runLookup() }
  })

  resetClientLookup(form)
}

async function submitEnhancedClientForm(form) {
  const phoneInput = form.querySelector('[name="phone"]')
  const nameInput = form.querySelector('[name="name"]')
  const emailInput = form.querySelector('[name="zaiaEmail"]')
  const birthInput = form.querySelector('[name="zaiaBirthDate"]')
  const submit = form.querySelector('button[type="submit"]')
  const status = form.querySelector('[data-zaia-customer-status]')
  const lookup = form._zaiaLookup

  if (!lookup || form.dataset.zaiaLookupPhone !== phoneDigits(phoneInput?.value)) {
    status.className = 'zaia-customer-lookup-box error'
    status.innerHTML = '<strong>Pesquise antes de salvar</strong><p>O ZAIA precisa confirmar se este celular já pertence a um cliente.</p>'
    return
  }
  if (lookup.found && lookup.already_linked) return

  if (submit) { submit.disabled = true; submit.textContent = 'Salvando...' }
  try {
    let saved
    if (lookup.found) {
      saved = await linkGlobalCustomer(lookup.zaia_customer_id)
    } else {
      if (String(nameInput?.value || '').trim().length < 2) throw new Error('Informe o nome do cliente.')
      saved = await createGlobalCustomer({
        name: String(nameInput.value).trim(),
        phone: phoneInput.value,
        email: String(emailInput?.value || '').trim(),
        birthDate: birthInput?.value || '',
      })
    }
    status.className = 'zaia-customer-lookup-box found'
    status.innerHTML = `<strong>${saved?.name || nameInput?.value || 'Cliente'} adicionado</strong><p>O vínculo foi criado usando a identidade única do cliente no ZAIA.</p>`
    setTimeout(() => location.reload(), 450)
  } catch (error) {
    status.className = 'zaia-customer-lookup-box error'
    status.innerHTML = `<strong>Não foi possível salvar</strong><p>${String(error?.message || error)}</p>`
    if (submit) { submit.disabled = false; submit.textContent = lookup.found ? 'Adicionar ao estabelecimento' : 'Cadastrar cliente no ZAIA' }
  }
}

function enhanceAppointmentCustomerLookup(form) {
  if (!form || form.dataset.zaiaGlobalLookup === 'true') return
  form.dataset.zaiaGlobalLookup = 'true'
  const phoneInput = form.querySelector('[name="phone"]')
  const nameInput = form.querySelector('[name="clientName"]')
  if (!phoneInput || !nameInput) return

  const info = document.createElement('div')
  info.className = 'helper'
  info.dataset.zaiaAppointmentCustomer = 'true'
  phoneInput.closest('.field')?.appendChild(info)

  let lastPhone = ''
  const lookup = async () => {
    const current = phoneDigits(phoneInput.value)
    if (!validBrazilPhone(phoneInput.value) || current === lastPhone) return
    lastPhone = current
    info.textContent = 'Buscando cliente no ZAIA...'
    try {
      const result = await lookupGlobalCustomer(phoneInput.value)
      if (result?.found) {
        nameInput.value = result.full_name || nameInput.value
        info.textContent = result.already_linked ? 'Cliente ZAIA já vinculado a este estabelecimento.' : 'Cliente ZAIA encontrado. O vínculo será criado ao salvar o horário.'
      } else {
        info.textContent = 'Novo cliente: ao salvar, ele receberá uma identidade única no ZAIA.'
      }
    } catch {
      info.textContent = ''
    }
  }
  phoneInput.addEventListener('blur', lookup)
  phoneInput.addEventListener('change', () => { lastPhone = ''; lookup() })
}

function enhanceGlobalCustomerUi() {
  injectGlobalCustomerStyles()
  document.querySelectorAll('#clientForm').forEach(enhanceClientForm)
  document.querySelectorAll('#appointmentForm').forEach(enhanceAppointmentCustomerLookup)
}

document.addEventListener('submit', event => {
  const form = event.target
  if (!(form instanceof HTMLFormElement) || form.id !== 'clientForm' || form.dataset.zaiaGlobalCustomer !== 'true') return
  event.preventDefault()
  event.stopImmediatePropagation()
  submitEnhancedClientForm(form)
}, true)

const globalCustomerObserver = new MutationObserver(() => queueMicrotask(enhanceGlobalCustomerUi))
globalCustomerObserver.observe(document.documentElement, { childList: true, subtree: true })
enhanceGlobalCustomerUi()
