const SESSION_KEY = 'beauty_os_cloud_session_v2'

const cfg = () => window.BEAUTY_CONFIG || {}
const baseUrl = () => String(cfg().supabaseUrl || '').replace(/\/$/, '')
const apiKey = () => cfg().supabasePublishableKey || ''
const schema = () => cfg().schema || 'beleza'

export function cloudEnabled() {
  return Boolean(baseUrl() && apiKey())
}

export function getSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY)) } catch { return null }
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY)
}

function saveSession(payload) {
  if (!payload?.access_token) return null
  const session = {
    access_token: payload.access_token,
    refresh_token: payload.refresh_token,
    expires_at: Math.floor(Date.now() / 1000) + Number(payload.expires_in || 3600),
    user: payload.user || null,
  }
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  return session
}

async function authRequest(path, body) {
  const res = await fetch(`${baseUrl()}/auth/v1/${path}`, {
    method: 'POST',
    headers: {
      apikey: apiKey(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.msg || data?.message || data?.error_description || 'Falha na autenticação.')
  return data
}

export async function signIn(email, password) {
  const data = await authRequest('token?grant_type=password', { email, password })
  return saveSession(data)
}

async function authUser(accessToken) {
  const res = await fetch(`${baseUrl()}/auth/v1/user`, {
    headers: {
      apikey: apiKey(),
      Authorization: `Bearer ${accessToken}`,
    },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.msg || data?.message || 'Não foi possível carregar sua conta.')
  return data
}

export function signInWithGoogle(redirectTo = '') {
  const redirect = redirectTo || (typeof location !== 'undefined' ? location.origin : '')
  const url = new URL(`${baseUrl()}/auth/v1/authorize`)
  url.searchParams.set('provider', 'google')
  if (redirect) url.searchParams.set('redirect_to', redirect)
  location.assign(url.toString())
}

export async function consumeOAuthSessionFromUrl() {
  if (typeof location === 'undefined') return null
  const hash = new URLSearchParams(location.hash.replace(/^#/, ''))
  const oauthError = hash.get('error_description') || hash.get('error')
  if (oauthError) {
    history.replaceState({}, '', location.pathname + location.search)
    throw new Error(oauthError)
  }
  const accessToken = hash.get('access_token')
  if (!accessToken) return null
  const refreshToken = hash.get('refresh_token') || ''
  const expiresIn = Number(hash.get('expires_in') || 3600)
  const user = await authUser(accessToken)
  const session = saveSession({
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_in: expiresIn,
    user,
  })
  history.replaceState({}, '', location.pathname + location.search)
  return session
}

export async function signUp(email, password, redirectTo = '') {
  const path = redirectTo ? `signup?redirect_to=${encodeURIComponent(redirectTo)}` : 'signup'
  const data = await authRequest(path, { email, password })
  if (data?.access_token) saveSession(data)
  return data
}

export async function refreshSession() {
  const current = getSession()
  if (!current?.refresh_token) return null
  const data = await authRequest('token?grant_type=refresh_token', { refresh_token: current.refresh_token })
  return saveSession(data)
}

export async function ensureSession() {
  const current = getSession()
  if (!current?.access_token) return null
  if ((current.expires_at || 0) - Math.floor(Date.now() / 1000) > 60) return current
  try { return await refreshSession() } catch { clearSession(); return null }
}

async function rest(path, { method = 'GET', body, prefer, token } = {}) {
  let session = getSession()
  if (!token && session && (session.expires_at || 0) - Math.floor(Date.now() / 1000) <= 60) {
    session = await ensureSession()
  }
  const bearer = token || session?.access_token || null
  const headers = {
    apikey: apiKey(),
    'Content-Type': 'application/json',
    'Accept-Profile': schema(),
    'Content-Profile': schema(),
  }
  if (bearer) headers.Authorization = `Bearer ${bearer}`
  if (prefer) headers.Prefer = prefer
  const res = await fetch(`${baseUrl()}/rest/v1/${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const text = await res.text()
  let data = null
  try { data = text ? JSON.parse(text) : null } catch { data = text }
  if (!res.ok) {
    const msg = data?.message || data?.hint || data?.details || (typeof data === 'string' ? data : `Erro ${res.status}`)
    throw new Error(msg)
  }
  return data
}

const q = value => encodeURIComponent(value)
const slugify = value => String(value || 'estabelecimento')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  .slice(0, 42)
const isoToLocal = iso => {
  const d = new Date(iso)
  const date = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
  const time = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
  return { date, time }
}
const appStatus = status => ({
  SCHEDULED:'AGENDADO', CONFIRMED:'CONFIRMADO', IN_SERVICE:'EM_ATENDIMENTO',
  COMPLETED:'CONCLUIDO', CANCELLED:'CANCELADO', NO_SHOW:'NAO_COMPARECEU'
}[status] || status)

export async function loadCloudState() {
  const session = await ensureSession()
  if (!session) return { authenticated: false }

  const establishments = await rest('establishments?select=id,name,slug,timezone,currency,active,primary_segment_code,address_street,address_number,address_complement,address_neighborhood,address_city,address_state,address_postal_code,latitude,longitude,marketplace_enabled,public_booking_enabled,public_description,public_cover_url,brand_enabled,brand_logo_url,brand_primary_color,brand_secondary_color,brand_accent_color,plan_code,store_push_enabled&active=eq.true&order=created_at.asc')
  if (!establishments?.length) {
    return {
      authenticated: true,
      user: session.user,
      setup: false,
      establishment: null,
      services: [], products: [], clients: [], appointments: [], professionals: [],
    }
  }

  const est = establishments[0]
  const eid = est.id
  const [segments, services, products, clients, appointments, professionals, serviceMaterials, appointmentMaterials, professionalServices, workingHours, timeBlocks, promotions] = await Promise.all([
    rest(`establishment_segments?select=segment_code,active&establishment_id=eq.${eid}&active=eq.true&order=created_at.asc`),
    rest(`services?select=id,segment_code,name,description,duration_minutes,price,estimated_cost,return_interval_days,requires_deposit,active&establishment_id=eq.${eid}&order=name.asc`),
    rest(`products?select=id,segment_code,name,category,usage_type,unit,stock_quantity,minimum_stock,unit_cost,sale_price,active,starter_template_key&establishment_id=eq.${eid}&active=eq.true&order=name.asc`),
    rest(`clients?select=id,name,phone,email,birth_date,notes,last_visit_at,next_return_at,active&establishment_id=eq.${eid}&active=eq.true&order=name.asc`),
    rest(`appointments?select=id,client_id,professional_id,service_id,starts_at,ends_at,status,price,notes,completed_at,booking_source&establishment_id=eq.${eid}&order=starts_at.asc`),
    rest(`professionals?select=id,user_id,name,phone,email,job_title,avatar_url,accepts_all_services,commission_type,commission_value,active&establishment_id=eq.${eid}&active=eq.true&order=name.asc`),
    rest(`service_product_consumption?select=service_id,product_id,quantity,is_estimate&establishment_id=eq.${eid}`),
    rest(`appointment_materials?select=appointment_id,product_id,planned_quantity,used_quantity,unit_cost_snapshot&establishment_id=eq.${eid}`),
    rest(`professional_services?select=professional_id,service_id,custom_price,custom_duration_minutes,active&establishment_id=eq.${eid}`),
    rest(`professional_working_hours?select=id,professional_id,weekday,start_time,end_time,active&establishment_id=eq.${eid}&active=eq.true&order=weekday.asc,start_time.asc`),
    rest(`professional_time_blocks?select=id,professional_id,starts_at,ends_at,reason&establishment_id=eq.${eid}&order=starts_at.asc`),
    rest(`promotions?select=id,establishment_id,service_id,title,description,offer_text,image_url,starts_at,ends_at,active&establishment_id=eq.${eid}&order=created_at.desc`),
  ])

  const serviceMaterialMap = {}
  for (const m of serviceMaterials || []) {
    (serviceMaterialMap[m.service_id] ||= []).push({ productId: m.product_id, quantity: Number(m.quantity), estimated: m.is_estimate === true })
  }
  const appointmentMaterialMap = {}
  for (const m of appointmentMaterials || []) {
    (appointmentMaterialMap[m.appointment_id] ||= []).push({
      productId: m.product_id,
      quantity: Number(m.used_quantity ?? m.planned_quantity),
      plannedQuantity: Number(m.planned_quantity),
      unitCostSnapshot: Number(m.unit_cost_snapshot || 0),
    })
  }

  const professionalServiceMap = {}
  for (const row of professionalServices || []) {
    (professionalServiceMap[row.professional_id] ||= []).push({
      serviceId: row.service_id,
      customPrice: row.custom_price == null ? null : Number(row.custom_price),
      customDuration: row.custom_duration_minutes == null ? null : Number(row.custom_duration_minutes),
      active: row.active,
    })
  }
  const professionalHoursMap = {}
  for (const row of workingHours || []) {
    (professionalHoursMap[row.professional_id] ||= []).push({
      id: row.id, weekday: Number(row.weekday), start: String(row.start_time).slice(0,5),
      end: String(row.end_time).slice(0,5), active: row.active,
    })
  }
  const professionalBlockMap = {}
  for (const row of timeBlocks || []) {
    (professionalBlockMap[row.professional_id] ||= []).push({
      id: row.id, startsAt: row.starts_at, endsAt: row.ends_at, reason: row.reason || '',
    })
  }

  const activeSegmentCodes = new Set(segments.map(s => s.segment_code))
  const visibleServices = services.filter(s => activeSegmentCodes.has(s.segment_code))
  const visibleProducts = products.filter(p => !p.segment_code || activeSegmentCodes.has(p.segment_code))
  const serviceMap = Object.fromEntries(services.map(s => [s.id, s]))
  const clientMap = Object.fromEntries(clients.map(c => [c.id, c]))
  const latestCompleted = {}
  for (const a of appointments) {
    if (a.status !== 'COMPLETED') continue
    const old = latestCompleted[a.client_id]
    if (!old || new Date(a.completed_at || a.starts_at) > new Date(old.completed_at || old.starts_at)) latestCompleted[a.client_id] = a
  }

  return {
    authenticated: true,
    user: session.user,
    setup: true,
    establishment: {
      id: eid,
      name: est.name,
      timezone: est.timezone,
      currency: est.currency,
      segments: segments.map(s => s.segment_code),
      primarySegment: est.primary_segment_code,
      address: {
        street: est.address_street || '',
        number: est.address_number || '',
        complement: est.address_complement || '',
        neighborhood: est.address_neighborhood || '',
        city: est.address_city || '',
        state: est.address_state || '',
        postalCode: est.address_postal_code || '',
        latitude: est.latitude == null ? null : Number(est.latitude),
        longitude: est.longitude == null ? null : Number(est.longitude),
      },
      marketplaceEnabled: est.marketplace_enabled === true,
      publicBookingEnabled: est.public_booking_enabled !== false,
      publicDescription: est.public_description || '',
      publicCoverUrl: est.public_cover_url || '',
      brandEnabled: est.brand_enabled === true,
      brandLogoUrl: est.brand_logo_url || '',
      brandPrimaryColor: est.brand_primary_color || '#3b172b',
      brandSecondaryColor: est.brand_secondary_color || '#6b3149',
      brandAccentColor: est.brand_accent_color || '#c89a61',
      planCode: est.plan_code || 'FREE',
      storePushEnabled: est.store_push_enabled !== false,
    },
    services: visibleServices.map(s => ({
      id: s.id, name: s.name, segment: s.segment_code, price: Number(s.price),
      duration: s.duration_minutes, estimatedCost: Number(s.estimated_cost || 0),
      returnDays: Number(s.return_interval_days || 0), requiresDeposit: s.requires_deposit, active: s.active,
      materials: serviceMaterialMap[s.id] || [],
      materialsEstimated: (serviceMaterialMap[s.id] || []).length > 0 && (serviceMaterialMap[s.id] || []).every(m => m.estimated),
    })),
    products: visibleProducts.map(p => ({
      id: p.id, name: p.name, segment: p.segment_code, category: p.category,
      type: p.usage_type, unit: p.unit, stock: Number(p.stock_quantity),
      minStock: Number(p.minimum_stock), cost: Number(p.unit_cost), salePrice: p.sale_price == null ? null : Number(p.sale_price),
      active: p.active, starterTemplateKey: p.starter_template_key || null, suggested: Boolean(p.starter_template_key),
    })),
    clients: clients.map(c => {
      const last = latestCompleted[c.id]
      const lastService = last ? serviceMap[last.service_id] : null
      let returnDays = Number(lastService?.return_interval_days || 0)
      if (!returnDays && c.last_visit_at && c.next_return_at) {
        returnDays = Math.max(0, Math.round((new Date(c.next_return_at) - new Date(c.last_visit_at)) / 86400000))
      }
      return {
        id: c.id, name: c.name, phone: c.phone || '', email: c.email || '', birthDate: c.birth_date,
        notes: c.notes || '', lastVisit: c.last_visit_at ? c.last_visit_at.slice(0,10) : null,
        lastService: lastService?.name || null, returnDays, active: c.active,
      }
    }),
    appointments: appointments.map(a => {
      const local = isoToLocal(a.starts_at)
      const endLocal = isoToLocal(a.ends_at)
      return {
        id: a.id, clientId: a.client_id, clientName: clientMap[a.client_id]?.name || 'Cliente',
        phone: clientMap[a.client_id]?.phone || '', professionalId: a.professional_id,
        serviceId: a.service_id, date: local.date, time: local.time, endTime: endLocal.time,
        startsAt: a.starts_at, endsAt: a.ends_at,
        durationMinutes: Math.max(0, Math.round((new Date(a.ends_at)-new Date(a.starts_at))/60000)),
        price: Number(a.price),
        status: appStatus(a.status), completedAt: a.completed_at, bookingSource: a.booking_source || 'STAFF',
        materials: appointmentMaterialMap[a.id] || [],
      }
    }),
    promotions: (promotions || []).map(p => ({
      id:p.id, establishmentId:p.establishment_id, serviceId:p.service_id,
      title:p.title, description:p.description || '', offerText:p.offer_text,
      imageUrl:p.image_url || '', startsAt:p.starts_at, endsAt:p.ends_at, active:p.active,
    })),
    professionals: professionals.map(p => ({
      id: p.id, userId: p.user_id, name: p.name, phone: p.phone || '', email: p.email || '',
      jobTitle: p.job_title || '', avatarUrl: p.avatar_url || '', active: p.active,
      acceptsAllServices: p.accepts_all_services !== false,
      commissionType: p.commission_type, commissionValue: Number(p.commission_value || 0),
      services: professionalServiceMap[p.id] || [],
      workingHours: professionalHoursMap[p.id] || [],
      blocks: professionalBlockMap[p.id] || [],
    })),
  }
}

export async function insertProfessional(establishmentId, professional) {
  const [row] = await rest('professionals?select=*', {
    method: 'POST',
    body: {
      establishment_id: establishmentId,
      name: professional.name,
      phone: professional.phone || null,
      email: professional.email || null,
      job_title: professional.jobTitle || null,
      commission_type: professional.commissionType || 'NONE',
      commission_value: Number(professional.commissionValue || 0),
      accepts_all_services: professional.acceptsAllServices !== false,
      active: true,
    },
    prefer: 'return=representation',
  })
  return row
}

export async function updateProfessional(professionalId, professional) {
  const rows = await rest(`professionals?id=eq.${q(professionalId)}&select=*`, {
    method: 'PATCH',
    body: {
      name: professional.name,
      phone: professional.phone || null,
      email: professional.email || null,
      job_title: professional.jobTitle || null,
      commission_type: professional.commissionType || 'NONE',
      commission_value: Number(professional.commissionValue || 0),
      updated_at: new Date().toISOString(),
    },
    prefer: 'return=representation',
  })
  return rows?.[0] || null
}

export async function saveProfessionalServices(professionalId, acceptsAllServices, services) {
  return rest('rpc/set_professional_services', {
    method: 'POST',
    body: {
      p_professional_id: professionalId,
      p_accepts_all: Boolean(acceptsAllServices),
      p_services: (services || []).map(s => ({
        service_id: s.serviceId,
        custom_price: s.customPrice == null || s.customPrice === '' ? null : Number(s.customPrice),
        custom_duration_minutes: s.customDuration == null || s.customDuration === '' ? null : Number(s.customDuration),
      })),
    },
  })
}

export async function saveProfessionalWorkingHours(professionalId, hours) {
  return rest('rpc/set_professional_working_hours', {
    method: 'POST',
    body: {
      p_professional_id: professionalId,
      p_hours: (hours || []).map(h => ({
        weekday: Number(h.weekday),
        start_time: h.start,
        end_time: h.end,
      })),
    },
  })
}

export async function insertProfessionalBlock(establishmentId, professionalId, block) {
  const [row] = await rest('professional_time_blocks?select=*', {
    method: 'POST',
    body: {
      establishment_id: establishmentId,
      professional_id: professionalId,
      starts_at: block.startsAt,
      ends_at: block.endsAt,
      reason: block.reason || null,
    },
    prefer: 'return=representation',
  })
  return row
}

export async function deleteProfessionalBlock(blockId) {
  await rest(`professional_time_blocks?id=eq.${q(blockId)}`, {
    method: 'DELETE',
    prefer: 'return=minimal',
  })
}

export async function getAvailableSlots(professionalId, serviceId, date, stepMinutes = 15) {
  const rows = await rest('rpc/available_slots', {
    method: 'POST',
    body: {
      p_professional_id: professionalId,
      p_service_id: serviceId,
      p_date: date,
      p_step_minutes: stepMinutes,
    },
  })
  return (rows || []).map(r => ({
    startsAt: r.starts_at,
    endsAt: r.ends_at,
    price: Number(r.price || 0),
    time: isoToLocal(r.starts_at).time,
    endTime: isoToLocal(r.ends_at).time,
    durationMinutes: Math.max(0, Math.round((new Date(r.ends_at)-new Date(r.starts_at))/60000)),
  }))
}

export async function publicBusinessBranding(slug) {
  const row = await rest('rpc/public_business_branding', {
    method:'POST',
    body:{ p_slug: slug },
  })
  if (!row) return null
  return {
    id:row.id,
    slug:row.slug || '',
    name:row.name || '',
    brandEnabled:row.brand_enabled === true,
    brandLogoUrl:row.brand_logo_url || '',
    brandPrimaryColor:row.brand_primary_color || '#3b172b',
    brandSecondaryColor:row.brand_secondary_color || '#6b3149',
    brandAccentColor:row.brand_accent_color || '#c89a61',
  }
}

export async function uploadBrandLogo(establishmentId, file) {
  const session = await ensureSession()
  if (!session?.access_token) throw new Error('Entre novamente para enviar a logo.')
  if (!file) throw new Error('Selecione uma imagem.')
  if (!/^image\/(png|jpeg|webp|svg\+xml)$/i.test(file.type || '')) {
    throw new Error('Use uma imagem PNG, JPG, WEBP ou SVG.')
  }
  if (Number(file.size || 0) > 5 * 1024 * 1024) {
    throw new Error('A logo deve ter no máximo 5 MB.')
  }

  const ext = ({
    'image/png':'png',
    'image/jpeg':'jpg',
    'image/webp':'webp',
    'image/svg+xml':'svg',
  })[file.type] || 'png'
  const path = `${establishmentId}/logo.${ext}`
  const res = await fetch(`${baseUrl()}/storage/v1/object/zaia-branding/${path}`, {
    method:'POST',
    headers:{
      apikey:apiKey(),
      Authorization:`Bearer ${session.access_token}`,
      'Content-Type':file.type || 'application/octet-stream',
      'x-upsert':'true',
    },
    body:file,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.message || data?.error || 'Não foi possível enviar a logo.')
  return `${baseUrl()}/storage/v1/object/public/zaia-branding/${path}?v=${Date.now()}`
}

export async function publicSearchEstablishments({ query = '', segment = null, service = null, lat = null, long = null, radiusKm = 25 } = {}) {
  return rest('rpc/public_search_establishments', {
    method: 'POST',
    body: {
      p_query: query || null,
      p_segment: segment || null,
      p_service: service || null,
      p_lat: lat == null ? null : Number(lat),
      p_long: long == null ? null : Number(long),
      p_radius_km: Number(radiusKm || 25),
    },
  })
}

export async function publicStorefront(establishmentId) {
  return rest('rpc/public_storefront', {
    method: 'POST',
    body: { p_establishment_id: establishmentId },
  })
}

export async function publicAvailableSlots(professionalId, serviceId, date, stepMinutes = 15) {
  const rows = await rest('rpc/public_available_slots', {
    method: 'POST',
    body: {
      p_professional_id: professionalId,
      p_service_id: serviceId,
      p_date: date,
      p_step_minutes: stepMinutes,
    },
  })
  return (rows || []).map(r => ({
    startsAt: r.starts_at,
    endsAt: r.ends_at,
    price: Number(r.price || 0),
    time: isoToLocal(r.starts_at).time,
    endTime: isoToLocal(r.ends_at).time,
    durationMinutes: Math.max(0, Math.round((new Date(r.ends_at)-new Date(r.starts_at))/60000)),
  }))
}

export async function publicBookAppointment(payload) {
  return rest('rpc/public_book_appointment', {
    method: 'POST',
    body: {
      p_establishment_id: payload.establishmentId,
      p_service_id: payload.serviceId,
      p_professional_id: payload.professionalId,
      p_starts_at: payload.startsAt,
      p_customer_name: payload.customerName,
      p_customer_phone: payload.customerPhone,
      p_customer_email: payload.customerEmail || null,
      p_customer_note: payload.customerNote || null,
    },
  })
}

export async function customerUpsertProfile(profile) {
  return rest('rpc/customer_upsert_profile', {
    method: 'POST',
    body: {
      p_full_name: profile.fullName,
      p_phone: profile.phone || null,
      p_birth_date: profile.birthDate || null,
      p_marketing_opt_in: profile.marketingOptIn !== false,
    },
  })
}

export async function customerDashboard() {
  return rest('rpc/customer_my_dashboard', { method: 'POST', body: {} })
}

export async function customerMarkNotificationsRead() {
  return rest('rpc/customer_mark_notifications_read', { method: 'POST', body: {} })
}

export async function businessPushStatus(establishmentId) {
  return rest('rpc/business_push_status', {
    method:'POST',
    body:{ p_establishment_id: establishmentId },
  })
}

export async function businessRegisterPush(establishmentId, subscription) {
  return rest('rpc/business_register_push', {
    method:'POST',
    body:{
      p_establishment_id:establishmentId,
      p_endpoint:subscription.endpoint,
      p_p256dh:subscription.keys?.p256dh,
      p_auth_secret:subscription.keys?.auth,
      p_user_agent:navigator.userAgent || null,
    },
  })
}

export async function listBusinessNotifications(establishmentId, limit = 40) {
  const rows = await rest(`notifications?select=id,type,title,body,data,read_at,created_at&establishment_id=eq.${q(establishmentId)}&order=created_at.desc&limit=${Number(limit)||40}`)
  return (rows || []).map(n => ({
    id:n.id,type:n.type,title:n.title,body:n.body,data:n.data||{},
    readAt:n.read_at,createdAt:n.created_at,
  }))
}

export async function businessMarkNotificationsRead(establishmentId) {
  return rest('rpc/business_mark_notifications_read', {
    method:'POST',
    body:{ p_establishment_id:establishmentId },
  })
}

export async function sendBusinessPushTest(establishmentId) {
  const session = await ensureSession()
  if (!session?.access_token) throw new Error('Entre novamente na ZAIA.')
  const res = await fetch(`${baseUrl()}/functions/v1/zaia-notifications`, {
    method:'POST',
    headers:{
      apikey:apiKey(),
      Authorization:`Bearer ${session.access_token}`,
      'Content-Type':'application/json',
    },
    body:JSON.stringify({ mode:'business_test', establishment_id:establishmentId }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.error || 'Não foi possível testar o Push da loja.')
  return data
}

export async function getBusinessAppProfile(establishmentId, platform = 'ANDROID') {
  return rest('rpc/business_app_profile', {
    method:'POST',
    body:{
      p_establishment_id:establishmentId,
      p_platform:String(platform || 'ANDROID').toUpperCase(),
    },
  })
}

export async function requestBusinessAndroidApp(establishmentId) {
  return rest('rpc/business_request_android_app', {
    method:'POST',
    body:{ p_establishment_id:establishmentId },
  })
}

export async function cancelAppointment(appointmentId, reason = '') {
  return rest('rpc/cancel_appointment', {
    method:'POST',
    body:{ p_appointment_id:appointmentId, p_reason:reason || null },
  })
}

export async function customerCancelAppointment(appointmentId, reason = '') {
  return rest('rpc/customer_cancel_appointment', {
    method:'POST',
    body:{ p_appointment_id:appointmentId, p_reason:reason || null },
  })
}

export async function customerRegisterPush(subscription) {
  return rest('rpc/customer_register_push', {
    method: 'POST',
    body: {
      p_endpoint: subscription.endpoint,
      p_p256dh: subscription.keys?.p256dh,
      p_auth_secret: subscription.keys?.auth,
      p_user_agent: navigator.userAgent || null,
    },
  })
}

export async function publicPromotions({ establishmentId = null, lat = null, long = null, radiusKm = 50 } = {}) {
  return rest('rpc/public_promotions', {
    method: 'POST',
    body: {
      p_establishment_id: establishmentId,
      p_lat: lat == null ? null : Number(lat),
      p_long: long == null ? null : Number(long),
      p_radius_km: Number(radiusKm || 50),
    },
  })
}

export async function getZaiaPushPublicKey() {
  const res = await fetch(`${baseUrl()}/functions/v1/zaia-customer-push`, {
    headers: { apikey: apiKey(), 'Content-Type': 'application/json' },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || !data?.publicKey) throw new Error(data?.error || 'Não foi possível obter a chave de notificações.')
  return data.publicKey
}

export async function sendZaiaPushTest() {
  const session = await ensureSession()
  if (!session?.access_token) throw new Error('Entre na sua conta ZAIA.')
  const res = await fetch(`${baseUrl()}/functions/v1/zaia-customer-push`, {
    method: 'POST',
    headers: {
      apikey: apiKey(),
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ mode: 'test' }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.error || 'Não foi possível testar as notificações.')
  return data
}

export async function listPromotions(establishmentId) {
  const rows = await rest(`promotions?select=id,establishment_id,service_id,title,description,offer_text,image_url,starts_at,ends_at,active&establishment_id=eq.${q(establishmentId)}&order=created_at.desc`)
  return (rows || []).map(p => ({
    id:p.id, establishmentId:p.establishment_id, serviceId:p.service_id,
    title:p.title, description:p.description || '', offerText:p.offer_text,
    imageUrl:p.image_url || '', startsAt:p.starts_at, endsAt:p.ends_at, active:p.active,
  }))
}

export async function insertPromotion(establishmentId, promotion) {
  const [row] = await rest('promotions?select=*', {
    method:'POST',
    body:{
      establishment_id:establishmentId,
      service_id:promotion.serviceId || null,
      title:promotion.title,
      description:promotion.description || null,
      offer_text:promotion.offerText,
      starts_at:promotion.startsAt,
      ends_at:promotion.endsAt,
      active:promotion.active !== false,
    },
    prefer:'return=representation',
  })
  return row
}

export async function updatePromotion(promotionId, promotion) {
  const rows = await rest(`promotions?id=eq.${q(promotionId)}&select=*`, {
    method:'PATCH',
    body:{
      service_id:promotion.serviceId || null,
      title:promotion.title,
      description:promotion.description || null,
      offer_text:promotion.offerText,
      starts_at:promotion.startsAt,
      ends_at:promotion.endsAt,
      active:promotion.active !== false,
    },
    prefer:'return=representation',
  })
  return rows?.[0] || null
}

export async function deletePromotion(promotionId) {
  return rest(`promotions?id=eq.${q(promotionId)}`, { method:'DELETE', prefer:'return=minimal' })
}

async function billingRequest(mode, establishmentId, extra = {}) {
  const session = await ensureSession()
  if (!session?.access_token) throw new Error('Entre novamente na ZAIA.')
  const res = await fetch(`${baseUrl()}/functions/v1/zaia-billing`, {
    method:'POST',
    headers:{
      apikey:apiKey(),
      Authorization:`Bearer ${session.access_token}`,
      'Content-Type':'application/json',
    },
    body:JSON.stringify({ mode, establishment_id:establishmentId, ...extra }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.error || 'Não foi possível processar a assinatura.')
  return data
}

export async function createBillingCheckout(establishmentId, billingCycle = 'MONTHLY') {
  return billingRequest('checkout', establishmentId, {
    plan_code:'PRO',
    billing_cycle:billingCycle,
  })
}

export async function syncBillingSubscription(establishmentId) {
  return billingRequest('sync', establishmentId)
}

export async function cancelBillingSubscription(establishmentId) {
  return billingRequest('cancel', establishmentId)
}

export async function startProTrial(establishmentId) {
  return rest('rpc/merchant_start_pro_trial', {
    method:'POST',
    body:{ p_establishment_id:establishmentId },
  })
}

export async function getBillingConfiguration() {
  const res = await fetch(`${baseUrl()}/functions/v1/zaia-mercadopago-webhook`, {
    method:'GET',
    headers:{ apikey:apiKey() },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) return { ok:false, mercado_pago_access_token:false, mercado_pago_webhook_secret:false }
  return data
}

export async function listPlans() {
  const rows = await rest('plans?select=code,name,description,monthly_price,annual_price,trial_days,highlighted,active,features,sort_order&active=eq.true&order=sort_order.asc')
  return (rows || []).map(p => ({
    code:p.code,name:p.name,description:p.description||'',
    monthlyPrice:Number(p.monthly_price||0),annualPrice:Number(p.annual_price||0),
    trialDays:Number(p.trial_days||0),highlighted:p.highlighted===true,active:p.active===true,
    features:Array.isArray(p.features)?p.features:[],sortOrder:Number(p.sort_order||0),
  }))
}

export async function getMerchantSubscription(establishmentId) {
  return rest('rpc/merchant_subscription_status', {
    method:'POST',
    body:{ p_establishment_id:establishmentId },
  })
}

export async function adminIsCurrent() {
  return rest('rpc/admin_is_current', { method:'POST', body:{} })
}

export async function getAdminDashboard() {
  return rest('rpc/admin_dashboard', { method:'POST', body:{} })
}

export async function adminUpdatePlan(plan) {
  return rest('rpc/admin_update_plan', {
    method:'POST',
    body:{
      p_code:plan.code,
      p_name:plan.name,
      p_description:plan.description||null,
      p_monthly_price:Number(plan.monthlyPrice||0),
      p_annual_price:Number(plan.annualPrice||0),
      p_trial_days:Number(plan.trialDays||0),
      p_active:plan.active!==false,
      p_highlighted:plan.highlighted===true,
      p_features:plan.features||[],
    },
  })
}

export async function adminSetMerchantPlan(establishmentId, planCode, status, billingCycle) {
  return rest('rpc/admin_set_merchant_plan', {
    method:'POST',
    body:{
      p_establishment_id:establishmentId,
      p_plan_code:planCode,
      p_status:status,
      p_billing_cycle:billingCycle,
    },
  })
}

export async function getFinanceDashboard(establishmentId, startDate, endDate) {
  return rest('rpc/finance_dashboard', {
    method:'POST',
    body:{
      p_establishment_id:establishmentId,
      p_start_date:startDate,
      p_end_date:endDate,
    },
  })
}

export async function listFinanceTransactions(establishmentId, limit = 120) {
  const rows = await rest(`finance_transactions?select=id,establishment_id,account_id,appointment_id,professional_id,kind,category,description,amount,due_date,status,paid_at,payment_method,source,notes,installment_number,installment_total,created_at&establishment_id=eq.${q(establishmentId)}&order=due_date.desc,created_at.desc&limit=${Number(limit)||120}`)
  return (rows || []).map(t => ({
    id:t.id, establishmentId:t.establishment_id, accountId:t.account_id,
    appointmentId:t.appointment_id, professionalId:t.professional_id,
    kind:t.kind, category:t.category, description:t.description,
    amount:Number(t.amount||0), dueDate:t.due_date, status:t.status,
    paidAt:t.paid_at, paymentMethod:t.payment_method, source:t.source,
    notes:t.notes||'', installmentNumber:t.installment_number,
    installmentTotal:t.installment_total, createdAt:t.created_at,
  }))
}

export async function listFinanceAccounts(establishmentId) {
  const rows = await rest(`finance_accounts?select=id,establishment_id,name,account_type,opening_balance,active&establishment_id=eq.${q(establishmentId)}&active=eq.true&order=name.asc`)
  return (rows || []).map(a => ({
    id:a.id, establishmentId:a.establishment_id, name:a.name,
    type:a.account_type, openingBalance:Number(a.opening_balance||0), active:a.active,
  }))
}

export async function insertFinanceTransaction(establishmentId, transaction) {
  const paid = transaction.status === 'PAID'
  const [row] = await rest('finance_transactions?select=*', {
    method:'POST',
    body:{
      establishment_id:establishmentId,
      account_id:paid ? (transaction.accountId || null) : null,
      professional_id:transaction.professionalId || null,
      kind:transaction.kind,
      category:transaction.category,
      description:transaction.description,
      amount:Number(transaction.amount||0),
      due_date:transaction.dueDate,
      status:paid?'PAID':'PENDING',
      paid_at:paid ? (transaction.paidAt || new Date().toISOString()) : null,
      payment_method:paid ? (transaction.paymentMethod || 'OTHER') : null,
      source:'MANUAL',
      notes:transaction.notes || null,
      installment_number:transaction.installmentNumber || null,
      installment_total:transaction.installmentTotal || null,
    },
    prefer:'return=representation',
  })
  return row
}

export async function updateFinanceTransaction(transactionId, patch) {
  const body={}
  if(patch.category!==undefined)body.category=patch.category
  if(patch.description!==undefined)body.description=patch.description
  if(patch.amount!==undefined)body.amount=Number(patch.amount||0)
  if(patch.dueDate!==undefined)body.due_date=patch.dueDate
  if(patch.notes!==undefined)body.notes=patch.notes||null
  if(patch.status!==undefined)body.status=patch.status
  body.updated_at=new Date().toISOString()
  const rows=await rest(`finance_transactions?id=eq.${q(transactionId)}&select=*`,{
    method:'PATCH',body,prefer:'return=representation'
  })
  return rows?.[0]||null
}

export async function markFinancePaid(transactionId, paymentMethod, accountId = null) {
  return rest('rpc/finance_mark_paid', {
    method:'POST',
    body:{
      p_transaction_id:transactionId,
      p_payment_method:paymentMethod,
      p_account_id:accountId||null,
      p_paid_at:new Date().toISOString(),
    },
  })
}

export async function saveFinanceSettings(establishmentId, settings) {
  return rest('rpc/finance_save_settings', {
    method:'POST',
    body:{
      p_establishment_id:establishmentId,
      p_monthly_revenue_target:Number(settings.monthlyRevenueTarget||0),
      p_monthly_profit_target:Number(settings.monthlyProfitTarget||0),
      p_reserve_target:Number(settings.reserveTarget||0),
    },
  })
}

export async function insertFinanceAccount(establishmentId, account) {
  const [row]=await rest('finance_accounts?select=*',{
    method:'POST',
    body:{
      establishment_id:establishmentId,
      name:account.name,
      account_type:account.type||'CASH',
      opening_balance:Number(account.openingBalance||0),
      active:true,
    },
    prefer:'return=representation',
  })
  return row
}

export async function createEstablishment({ name, segments, services }) {
  const session = await ensureSession()
  if (!session?.user?.id) throw new Error('Sessão inválida. Entre novamente.')
  const primary = segments[0]
  const suffix = crypto.randomUUID ? crypto.randomUUID().slice(0,8) : Date.now().toString(36)
  const slug = `${slugify(name)}-${suffix}`

  const [est] = await rest('establishments?select=id,name,slug', {
    method: 'POST',
    body: {
      name,
      slug,
      primary_segment_code: primary,
    },
    prefer: 'return=representation',
  })

  try {
    await rest('establishment_members', {
      method: 'POST',
      body: { establishment_id: est.id, user_id: session.user.id, role: 'OWNER', active: true },
      prefer: 'return=minimal',
    })

    await rest('establishment_segments', {
      method: 'POST',
      body: segments.map(segment_code => ({ establishment_id: est.id, segment_code, active: true })),
      prefer: 'return=minimal',
    })

    const professionalName = (session.user?.email || 'Profissional').split('@')[0].replace(/[._-]+/g, ' ').replace(/\b\w/g, m => m.toUpperCase())
    await rest('professionals', {
      method: 'POST',
      body: {
        establishment_id: est.id,
        user_id: session.user.id,
        name: professionalName || 'Profissional principal',
        email: session.user?.email || null,
        commission_type: 'NONE',
        commission_value: 0,
        active: true,
      },
      prefer: 'return=minimal',
    })

    if (services.length) {
      await rest('services', {
        method: 'POST',
        body: services.map(s => ({
          establishment_id: est.id,
          segment_code: s.segment,
          name: s.name,
          duration_minutes: s.duration,
          price: s.price,
          return_interval_days: s.returnDays || null,
          active: true,
        })),
        prefer: 'return=minimal',
      })
    }

    await seedStarterCatalog(est.id)
  } catch (error) {
    await rest(`establishments?id=eq.${est.id}`, { method: 'DELETE', prefer: 'return=minimal' }).catch(() => {})
    throw error
  }
  return est
}

export async function insertClient(establishmentId, client) {
  const [row] = await rest('clients?select=*', {
    method: 'POST',
    body: { establishment_id: establishmentId, name: client.name, phone: client.phone || null },
    prefer: 'return=representation',
  })
  return row
}

export async function updateService(serviceId, service) {
  const rows = await rest(`services?id=eq.${q(serviceId)}&select=*`, {
    method: 'PATCH',
    body: {
      segment_code: service.segment,
      name: service.name,
      price: Number(service.price || 0),
      duration_minutes: Number(service.duration || 60),
      return_interval_days: Number(service.returnDays || 0) || null,
      updated_at: new Date().toISOString(),
    },
    prefer: 'return=representation',
  })
  return rows?.[0] || null
}

export async function insertService(establishmentId, service) {
  const [row] = await rest('services?select=*', {
    method: 'POST',
    body: {
      establishment_id: establishmentId,
      segment_code: service.segment,
      name: service.name,
      price: service.price,
      duration_minutes: service.duration,
      return_interval_days: service.returnDays || null,
      active: true,
    },
    prefer: 'return=representation',
  })
  return row
}

export async function seedStarterCatalog(establishmentId) {
  return rest('rpc/seed_starter_catalog', {
    method: 'POST',
    body: { p_establishment_id: establishmentId },
  })
}

export async function updateProduct(productId, product) {
  const rows = await rest(`products?id=eq.${q(productId)}&select=*`, {
    method: 'PATCH',
    body: {
      segment_code: product.segment || null,
      name: product.name,
      category: product.category || null,
      usage_type: product.type || 'INTERNAL',
      unit: product.unit || 'un',
      stock_quantity: Number(product.stock || 0),
      minimum_stock: Number(product.minStock || 0),
      unit_cost: Number(product.cost || 0),
      updated_at: new Date().toISOString(),
    },
    prefer: 'return=representation',
  })
  return rows?.[0] || null
}

export async function archiveProduct(productId) {
  return rest('rpc/archive_product', {
    method: 'POST',
    body: { p_product_id: productId },
  })
}

export async function insertProduct(establishmentId, product) {
  const [row] = await rest('products?select=*', {
    method: 'POST',
    body: {
      establishment_id: establishmentId,
      segment_code: product.segment,
      name: product.name,
      category: product.category || null,
      usage_type: product.type || 'INTERNAL',
      unit: product.unit || 'UN',
      stock_quantity: product.stock || 0,
      minimum_stock: product.minStock || 0,
      unit_cost: product.cost || 0,
    },
    prefer: 'return=representation',
  })
  return row
}

export async function insertAppointment(establishmentId, appointment, service) {
  let professionalId = appointment.professionalId
  if (!professionalId) {
    const pros = await rest(`professionals?select=id&establishment_id=eq.${q(establishmentId)}&active=eq.true&order=created_at.asc&limit=1`)
    professionalId = pros?.[0]?.id
  }
  if (!professionalId) throw new Error('Cadastre um profissional antes de criar horários.')

  const start = new Date(`${appointment.date}T${appointment.time}:00`)
  const end = new Date(start.getTime() + Number(service.duration || 60) * 60000)
  const [row] = await rest('appointments?select=*', {
    method: 'POST',
    body: {
      establishment_id: establishmentId,
      client_id: appointment.clientId,
      professional_id: professionalId,
      service_id: appointment.serviceId,
      starts_at: start.toISOString(),
      ends_at: end.toISOString(),
      status: 'SCHEDULED',
      price: appointment.price,
    },
    prefer: 'return=representation',
  })
  return row
}

export async function suggestServiceMaterials(serviceId) {
  const result = await rest('rpc/suggest_service_materials', {
    method: 'POST',
    body: { p_service_id: serviceId },
  })
  const data = Array.isArray(result) ? result[0] : result
  return {
    serviceId: data?.service_id || serviceId,
    serviceName: data?.service_name || '',
    learnedServices: Number(data?.learned_services || 0),
    lastServiceId: data?.last_service_id || null,
    lastServiceName: data?.last_service_name || '',
    source: data?.source || 'none',
    materials: (data?.materials || []).map(m => ({
      productId: m.product_id,
      quantity: Number(m.quantity || 0),
      confidence: Number(m.confidence || 0),
      support: Number(m.support || 0),
      usedInLastService: Boolean(m.used_in_last_service),
    })),
  }
}

export async function saveServiceMaterials(serviceId, materials) {
  return rest('rpc/set_service_materials', {
    method: 'POST',
    body: {
      p_service_id: serviceId,
      p_materials: (materials || []).map(m => ({ product_id: m.productId, quantity: Number(m.quantity) })),
    },
  })
}

export async function saveAppointmentMaterials(appointmentId, materials) {
  return rest('rpc/set_appointment_materials', {
    method: 'POST',
    body: {
      p_appointment_id: appointmentId,
      p_materials: (materials || []).map(m => ({ product_id: m.productId, quantity: Number(m.quantity) })),
    },
  })
}

export async function completeCloudAppointment(establishmentId, appointment) {
  return rest('rpc/complete_appointment', {
    method: 'POST',
    body: { p_appointment_id: appointment.id },
  })
}

export async function updateEstablishment(establishmentId, data = {}) {
  const body = {}
  if (data.name !== undefined) body.name = data.name
  if (data.primarySegment) body.primary_segment_code = data.primarySegment
  if (data.address) {
    body.address_street = data.address.street || null
    body.address_number = data.address.number || null
    body.address_complement = data.address.complement || null
    body.address_neighborhood = data.address.neighborhood || null
    body.address_city = data.address.city || null
    body.address_state = data.address.state || null
    body.address_postal_code = data.address.postalCode || null
    body.latitude = data.address.latitude == null ? null : Number(data.address.latitude)
    body.longitude = data.address.longitude == null ? null : Number(data.address.longitude)
  }
  if (data.marketplaceEnabled !== undefined) body.marketplace_enabled = Boolean(data.marketplaceEnabled)
  if (data.publicBookingEnabled !== undefined) body.public_booking_enabled = Boolean(data.publicBookingEnabled)
  if (data.publicDescription !== undefined) body.public_description = data.publicDescription || null
  if (data.publicCoverUrl !== undefined) body.public_cover_url = data.publicCoverUrl || null
  if (data.brandEnabled !== undefined) body.brand_enabled = Boolean(data.brandEnabled)
  if (data.brandLogoUrl !== undefined) body.brand_logo_url = data.brandLogoUrl || null
  if (data.brandPrimaryColor !== undefined) body.brand_primary_color = data.brandPrimaryColor
  if (data.brandSecondaryColor !== undefined) body.brand_secondary_color = data.brandSecondaryColor
  if (data.brandAccentColor !== undefined) body.brand_accent_color = data.brandAccentColor
  if (data.storePushEnabled !== undefined) body.store_push_enabled = Boolean(data.storePushEnabled)
  body.updated_at = new Date().toISOString()
  await rest(`establishments?id=eq.${q(establishmentId)}`, {
    method: 'PATCH', body, prefer: 'return=minimal'
  })
}

export async function setSegments(establishmentId, segmentCodes) {
  const current = await rest(`establishment_segments?select=segment_code,active&establishment_id=eq.${q(establishmentId)}`)
  const existing = new Set(current.map(x => x.segment_code))
  const desired = new Set(segmentCodes)
  const toAdd = segmentCodes.filter(s => !existing.has(s))
  if (toAdd.length) {
    await rest('establishment_segments', {
      method: 'POST',
      body: toAdd.map(segment_code => ({ establishment_id: establishmentId, segment_code, active: true })),
      prefer: 'return=minimal',
    })
  }
  for (const row of current) {
    await rest(`establishment_segments?establishment_id=eq.${q(establishmentId)}&segment_code=eq.${q(row.segment_code)}`, {
      method: 'PATCH', body: { active: desired.has(row.segment_code) }, prefer: 'return=minimal'
    })
  }
  await updateEstablishment(establishmentId, { name: undefined, primarySegment: segmentCodes[0] })
}
