import { ensureSession, customerDashboard, customerUpsertProfile } from './cloud.js'

let cachedSession = null
let cachedProfile = null
let customDialog = null
let bookingReached = false
let deferGoogleProfile = false
let resubmitting = false

const normalizePhone = value => String(value || '').replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '')
const maskPhone = value => {
  const d = normalizePhone(value).slice(0, 11)
  if (!d) return ''
  if (d.length <= 2) return `(${d}`
  const area = d.slice(0, 2)
  const rest = d.slice(2)
  if (rest.length <= 4) return `(${area}) ${rest}`
  if (rest.length <= 8) return `(${area}) ${rest.slice(0, 4)}-${rest.slice(4)}`
  return `(${area}) ${rest.slice(0, 5)}-${rest.slice(5)}`
}

function isGoogleSession(session) {
  const provider = String(session?.user?.app_metadata?.provider || '').toLowerCase()
  const providers = Array.isArray(session?.user?.app_metadata?.providers) ? session.user.app_metadata.providers : []
  return provider === 'google' || providers.map(String).some(x => x.toLowerCase() === 'google')
}

function profileComplete(profile) {
  const name = String(profile?.full_name || '').trim()
  const phone = normalizePhone(profile?.phone)
  return name.length >= 2 && phone.length >= 10 && phone.length <= 11
}

async function refreshIdentity() {
  cachedSession = await ensureSession()
  if (!cachedSession) {
    cachedProfile = null
    deferGoogleProfile = false
    return { session: null, profile: null }
  }
  const dashboard = await customerDashboard().catch(() => null)
  cachedProfile = dashboard?.profile || null
  if (!bookingReached && isGoogleSession(cachedSession) && !profileComplete(cachedProfile)) {
    deferGoogleProfile = true
  }
  return { session: cachedSession, profile: cachedProfile }
}

function hiddenInput(form, name, value) {
  let input = form.querySelector(`input[type="hidden"][name="${name}"]`)
  if (!input) {
    input = document.createElement('input')
    input.type = 'hidden'
    input.name = name
    form.appendChild(input)
  }
  input.value = value || ''
}

function removeVisibleIdentityField(form, name) {
  const input = form.querySelector(`input[name="${name}"]:not([type="hidden"])`)
  if (!input) return
  const field = input.closest('.field')
  if (field) field.remove()
  else input.remove()
}

function prepareBookingForm(form, session = cachedSession, profile = cachedProfile) {
  if (!form || !session || !profileComplete(profile)) return false
  removeVisibleIdentityField(form, 'name')
  removeVisibleIdentityField(form, 'phone')
  hiddenInput(form, 'name', String(profile.full_name || '').trim())
  hiddenInput(form, 'phone', normalizePhone(profile.phone))
  hiddenInput(form, 'email', String(session?.user?.email || '').trim())

  const note = form.querySelector('textarea[name="note"]')
  if (note) {
    const field = note.closest('.field')
    const label = field?.querySelector('label')
    if (label) label.innerHTML = 'Observação <small>opcional</small>'
    note.placeholder = 'Alguma preferência ou informação que o estabelecimento precisa saber?'
    field?.classList.add('zaia-booking-observation-only')
  }
  form.dataset.zaiaProfileReady = 'true'
  return true
}

function closeCustomDialog() {
  customDialog?.remove()
  customDialog = null
  document.documentElement.classList.remove('zaia-booking-profile-lock')
}

function showCustomProfileDialog() {
  if (customDialog || document.querySelector('#clientProfileForm')) return
  const session = cachedSession
  const profile = cachedProfile || {}
  const suggestedName = String(profile.full_name || session?.user?.user_metadata?.full_name || session?.user?.user_metadata?.name || '').trim()

  customDialog = document.createElement('div')
  customDialog.className = 'client-auth-backdrop zaia-booking-profile-overlay'
  customDialog.innerHTML = `<div class="client-auth-modal zaia-booking-profile-modal" role="dialog" aria-modal="true" aria-labelledby="zaiaBookingProfileTitle">
    <button class="client-auth-close" type="button" data-booking-profile-close aria-label="Fechar">×</button>
    <span class="client-kicker">COMPLETE SEU PERFIL</span>
    <h2 id="zaiaBookingProfileTitle">Só falta seus dados.</h2>
    <p>Antes de confirmar o agendamento, precisamos do seu nome e WhatsApp para identificar você no ZAIA.</p>
    <form id="zaiaBookingProfileForm" class="client-auth-form">
      <div class="field"><label>Nome completo</label><input name="name" required minlength="2" value="${suggestedName.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}"></div>
      <div class="field"><label>WhatsApp</label><input name="phone" required inputmode="tel" value="${maskPhone(profile.phone || '')}" placeholder="(11) 99999-9999"></div>
      <div class="field"><label>Data de nascimento <small>(opcional)</small></label><input name="birthDate" type="date" value="${String(profile.birth_date || '')}"></div>
      <label class="client-check"><input type="checkbox" name="marketing" ${profile.marketing_opt_in !== false ? 'checked' : ''}><span>Quero receber promoções relevantes na ZAIA</span></label>
      <div class="zaia-booking-profile-error" aria-live="polite"></div>
      <button class="client-primary wide" type="submit">Salvar e continuar</button>
    </form>
  </div>`
  document.body.appendChild(customDialog)
  document.documentElement.classList.add('zaia-booking-profile-lock')

  const phoneInput = customDialog.querySelector('input[name="phone"]')
  phoneInput?.addEventListener('input', () => { phoneInput.value = maskPhone(phoneInput.value) })
  customDialog.querySelector('[data-booking-profile-close]')?.addEventListener('click', closeCustomDialog)

  customDialog.querySelector('#zaiaBookingProfileForm')?.addEventListener('submit', async event => {
    event.preventDefault()
    const form = event.currentTarget
    const data = Object.fromEntries(new FormData(form))
    const phone = normalizePhone(data.phone)
    const error = form.querySelector('.zaia-booking-profile-error')
    const button = form.querySelector('button[type="submit"]')
    if (String(data.name || '').trim().length < 2) {
      error.textContent = 'Informe seu nome completo.'
      return
    }
    if (phone.length < 10 || phone.length > 11) {
      error.textContent = 'Informe um WhatsApp válido.'
      return
    }
    button.disabled = true
    button.textContent = 'Salvando...'
    error.textContent = ''
    try {
      await customerUpsertProfile({
        fullName: String(data.name || '').trim(),
        phone,
        birthDate: data.birthDate || null,
        marketingOptIn: form.elements.marketing?.checked !== false,
      })
      await refreshIdentity()
      closeCustomDialog()
      const bookingForm = document.querySelector('#publicBookingForm')
      prepareBookingForm(bookingForm)
    } catch (err) {
      error.textContent = String(err?.message || err)
      button.disabled = false
      button.textContent = 'Salvar e continuar'
    }
  })
}

async function handleBookingForm(form) {
  if (!form) return
  bookingReached = true
  const { session, profile } = await refreshIdentity()
  if (!session) return
  if (profileComplete(profile)) {
    prepareBookingForm(form, session, profile)
    return
  }
  deferGoogleProfile = false
  if (!document.querySelector('#clientProfileForm')) showCustomProfileDialog()
}

function suppressEarlyGoogleProfile() {
  if (!deferGoogleProfile || bookingReached) return
  const bookingForm = document.querySelector('#publicBookingForm')
  if (bookingForm) return
  const profileForm = document.querySelector('#clientProfileForm')
  const overlay = profileForm?.closest('.client-auth-backdrop')
  if (overlay) overlay.remove()
}

async function scan() {
  suppressEarlyGoogleProfile()
  const form = document.querySelector('#publicBookingForm')
  if (form && form.dataset.zaiaProfileScan !== 'true') {
    form.dataset.zaiaProfileScan = 'true'
    await handleBookingForm(form)
  }
}

document.addEventListener('click', event => {
  if (event.target.closest?.('#editClientProfile')) deferGoogleProfile = false
}, true)

document.addEventListener('submit', event => {
  const form = event.target
  if (!(form instanceof HTMLFormElement) || form.id !== 'publicBookingForm' || resubmitting) return
  if (form.dataset.zaiaProfileReady === 'true' && profileComplete(cachedProfile)) return
  event.preventDefault()
  event.stopImmediatePropagation()
  ;(async () => {
    const { session, profile } = await refreshIdentity()
    if (!session) return
    if (profileComplete(profile)) {
      prepareBookingForm(form, session, profile)
      resubmitting = true
      form.requestSubmit()
      queueMicrotask(() => { resubmitting = false })
      return
    }
    showCustomProfileDialog()
  })()
}, true)

const style = document.createElement('style')
style.textContent = `
.zaia-booking-profile-lock{overflow:hidden!important}
.zaia-booking-profile-overlay{z-index:12500!important}
.zaia-booking-profile-modal{max-width:460px}
.zaia-booking-profile-error{min-height:18px;color:#9f3d45;font-size:10px;line-height:1.35}
.zaia-booking-observation-only{margin-top:4px}
`
document.head.appendChild(style)

refreshIdentity().finally(scan)
const app = document.querySelector('#app')
if (app) new MutationObserver(() => queueMicrotask(scan)).observe(app, { childList: true, subtree: true })
