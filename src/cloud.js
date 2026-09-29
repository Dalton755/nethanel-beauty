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

export async function signUp(email, password) {
  const data = await authRequest('signup', { email, password })
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

  const establishments = await rest('establishments?select=id,name,slug,timezone,currency,active,primary_segment_code&active=eq.true&order=created_at.asc')
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
  const [segments, services, products, clients, appointments, professionals, serviceMaterials, appointmentMaterials, professionalServices, workingHours, timeBlocks] = await Promise.all([
    rest(`establishment_segments?select=segment_code,active&establishment_id=eq.${eid}&active=eq.true&order=created_at.asc`),
    rest(`services?select=id,segment_code,name,description,duration_minutes,price,estimated_cost,return_interval_days,requires_deposit,active&establishment_id=eq.${eid}&order=name.asc`),
    rest(`products?select=id,segment_code,name,category,usage_type,unit,stock_quantity,minimum_stock,unit_cost,sale_price,active,starter_template_key&establishment_id=eq.${eid}&active=eq.true&order=name.asc`),
    rest(`clients?select=id,name,phone,email,birth_date,notes,last_visit_at,next_return_at,active&establishment_id=eq.${eid}&active=eq.true&order=name.asc`),
    rest(`appointments?select=id,client_id,professional_id,service_id,starts_at,ends_at,status,price,notes,completed_at&establishment_id=eq.${eid}&order=starts_at.asc`),
    rest(`professionals?select=id,user_id,name,phone,email,job_title,avatar_url,accepts_all_services,commission_type,commission_value,active&establishment_id=eq.${eid}&active=eq.true&order=name.asc`),
    rest(`service_product_consumption?select=service_id,product_id,quantity,is_estimate&establishment_id=eq.${eid}`),
    rest(`appointment_materials?select=appointment_id,product_id,planned_quantity,used_quantity,unit_cost_snapshot&establishment_id=eq.${eid}`),
    rest(`professional_services?select=professional_id,service_id,custom_price,custom_duration_minutes,active&establishment_id=eq.${eid}`),
    rest(`professional_working_hours?select=id,professional_id,weekday,start_time,end_time,active&establishment_id=eq.${eid}&active=eq.true&order=weekday.asc,start_time.asc`),
    rest(`professional_time_blocks?select=id,professional_id,starts_at,ends_at,reason&establishment_id=eq.${eid}&order=starts_at.asc`),
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
      return {
        id: a.id, clientId: a.client_id, clientName: clientMap[a.client_id]?.name || 'Cliente',
        phone: clientMap[a.client_id]?.phone || '', professionalId: a.professional_id,
        serviceId: a.service_id, date: local.date, time: local.time, price: Number(a.price),
        status: appStatus(a.status), completedAt: a.completed_at,
        materials: appointmentMaterialMap[a.id] || [],
      }
    }),
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
  }))
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

export async function updateEstablishment(establishmentId, { name, primarySegment }) {
  const body = { name }
  if (primarySegment) body.primary_segment_code = primarySegment
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
