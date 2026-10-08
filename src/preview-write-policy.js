// Policy util independente do navegador: staging ligado ao banco principal é somente leitura.
const readonlyRpc=new Set([
  'public_search_establishments','public_storefront','public_available_slots','public_promotions',
  'customer_my_dashboard','customer_operational_now','customer_rating_dashboard',
  'public_establishment_rating_summaries','business_rating_dashboard','business_operational_snapshot',
  'business_push_status','get_zaia_push_public_key','get_business_app_profile','business_app_profile',
  'employee_dashboard','finance_dashboard','merchant_subscription_status','get_admin_dashboard',
  'get_billing_configuration','public_business_branding','suggest_service_materials',
  'admin_is_current','business_customer_lookup','get_available_slots','public_search_professionals',
  'public_service_catalog','business_app_download','customer_privacy_status','legal_status',
])
export function previewAllowsRequest(raw,method='GET',origin='https://sxghzubovthsvmfqncch.supabase.co'){
  let u
  try{u=new URL(raw,origin)}catch{return true}
  if(u.origin!==new URL(origin).origin)return true
  const verb=String(method||'GET').toUpperCase()
  if(['GET','HEAD','OPTIONS'].includes(verb))return true
  if(u.pathname.startsWith('/auth/v1/')){
    // O login e refresh são permitidos; cadastro/edição de usuários não.
    return verb==='POST'&&(/\/auth\/v1\/(token|logout)$/.test(u.pathname))
  }
  const match=u.pathname.match(/^\/rest\/v1\/rpc\/([a-zA-Z0-9_]+)$/)
  return verb==='POST'&&Boolean(match)&&readonlyRpc.has(match[1])
}
