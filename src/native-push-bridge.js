import { ensureSession, loadCloudState } from './cloud.js'

const NATIVE_MODE_KEY='zaia_native_push_mode_v1'
const ESTABLISHMENT_KEY='zaia_native_establishment_v1'
const EXPECTED_ORIGIN='https://zaia.nethanel.com.br'
const params=new URLSearchParams(location.search)
const source=String(params.get('source')||'').toLowerCase()
const initialEstablishment=String(params.get('app')||'').trim()
const isAndroidLaunch=source==='android'

if(isAndroidLaunch){
  try{sessionStorage.setItem(NATIVE_MODE_KEY,'ANDROID')}catch{}
  if(initialEstablishment){try{localStorage.setItem(ESTABLISHMENT_KEY,initialEstablishment)}catch{}}
}

const nativePlatform=(()=>{
  if(isAndroidLaunch)return 'ANDROID'
  try{return sessionStorage.getItem(NATIVE_MODE_KEY)||''}catch{return ''}
})()

if(nativePlatform)window.ZAIA_NATIVE_PUSH_MODE=nativePlatform

let nativePort=null
let pendingToken=null
let retryTimer=null
let lastRegisteredToken=''
let registering=false

function config(){return window.BEAUTY_CONFIG||{}}
function baseUrl(){return String(config().supabaseUrl||'').replace(/\/$/,'')}
function apiKey(){return String(config().supabasePublishableKey||'')}
function schema(){return String(config().schema||'beleza')}

function safePost(message){
  if(!nativePort)return false
  try{
    nativePort.postMessage(typeof message==='string'?message:JSON.stringify(message))
    return true
  }catch{return false}
}

function parseMessage(raw){
  if(raw&&typeof raw==='object')return raw
  if(typeof raw!=='string')return null
  try{return JSON.parse(raw)}catch{return {type:raw}}
}

async function resolveEstablishmentId(message){
  const supplied=String(message?.establishmentId||message?.establishment_id||'').trim()
  if(supplied)return supplied
  if(initialEstablishment)return initialEstablishment
  try{
    const stored=String(localStorage.getItem(ESTABLISHMENT_KEY)||'').trim()
    if(stored)return stored
  }catch{}
  try{
    const state=await loadCloudState()
    return String(state?.establishment?.id||'').trim()
  }catch{return ''}
}

async function registerNativeToken(message){
  if(registering)return false
  const token=String(message?.token||message?.deviceToken||'').trim()
  const platform=String(message?.platform||nativePlatform||'ANDROID').toUpperCase()
  const appId=String(message?.appId||message?.app_id||'').trim()
  if(platform!=='ANDROID'&&platform!=='IOS')throw new Error('Plataforma nativa inválida.')
  if(token.length<20)throw new Error('Token nativo inválido.')
  if(appId.length<5)throw new Error('Identificação do aplicativo inválida.')
  if(token===lastRegisteredToken)return true

  const establishmentId=await resolveEstablishmentId(message)
  if(!establishmentId)throw new Error('Estabelecimento do aplicativo não identificado.')

  const session=await ensureSession()
  if(!session?.access_token){
    pendingToken=message
    scheduleRetry()
    safePost({type:'ZAIA_NATIVE_PUSH_WAITING_AUTH'})
    return false
  }

  if(!baseUrl()||!apiKey())throw new Error('Configuração do ZAIA indisponível.')
  registering=true
  try{
    const res=await fetch(`${baseUrl()}/rest/v1/rpc/business_register_native_push`,{
      method:'POST',
      headers:{
        apikey:apiKey(),
        Authorization:`Bearer ${session.access_token}`,
        'Content-Type':'application/json',
        'Accept-Profile':schema(),
        'Content-Profile':schema(),
      },
      body:JSON.stringify({
        p_establishment_id:establishmentId,
        p_platform:platform,
        p_app_id:appId,
        p_device_token:token,
        p_device_name:String(message?.deviceName||message?.device_name||'').trim()||null,
        p_app_version:String(message?.appVersion||message?.app_version||'').trim()||null,
      }),
    })
    const data=await res.json().catch(()=>({}))
    if(!res.ok)throw new Error(data?.message||data?.error||`Falha ao registrar Push nativo (${res.status}).`)

    lastRegisteredToken=token
    pendingToken=null
    try{localStorage.setItem(ESTABLISHMENT_KEY,establishmentId)}catch{}
    safePost({type:'ZAIA_NATIVE_PUSH_REGISTERED',establishmentId,platform,id:data?.id||null})
    document.dispatchEvent(new CustomEvent('zaia:native-push-ready',{detail:{establishmentId,platform,id:data?.id||null}}))
    return true
  }finally{
    registering=false
  }
}

function scheduleRetry(delay=1600){
  clearTimeout(retryTimer)
  retryTimer=setTimeout(()=>retryPending(),delay)
}

async function retryPending(){
  if(!pendingToken)return
  try{
    const ok=await registerNativeToken(pendingToken)
    if(!ok&&pendingToken)scheduleRetry(2500)
  }catch(error){
    console.warn('ZAIA Push nativo: registro pendente falhou',error)
    safePost({type:'ZAIA_NATIVE_PUSH_ERROR',message:String(error?.message||error)})
    scheduleRetry(5000)
  }
}

async function handleNativeMessage(raw){
  const message=parseMessage(raw)
  if(!message)return
  const type=String(message.type||'').toUpperCase()
  if(type==='ZAIA_NATIVE_PUSH_TOKEN'){
    pendingToken=message
    try{await registerNativeToken(message)}catch(error){
      console.warn('ZAIA Push nativo: falha no registro',error)
      safePost({type:'ZAIA_NATIVE_PUSH_ERROR',message:String(error?.message||error)})
    }
    return
  }
  if(type==='ZAIA_NATIVE_PING')safePost({type:'ZAIA_WEB_PONG',at:Date.now()})
}

window.addEventListener('message',event=>{
  if(!window.ZAIA_NATIVE_PUSH_MODE)return
  if(event.origin&&event.origin!==location.origin&&event.origin!==EXPECTED_ORIGIN)return
  const port=event.ports?.[0]
  if(!port)return
  nativePort=port
  nativePort.onmessage=event=>handleNativeMessage(event.data)
  try{nativePort.start?.()}catch{}
  safePost({type:'ZAIA_WEB_READY',origin:location.origin})
  safePost({type:'ZAIA_REQUEST_NATIVE_PUSH_TOKEN'})
})

document.addEventListener('zaia:business-state-ready',()=>retryPending())
window.addEventListener('focus',()=>retryPending())
window.addEventListener('pageshow',()=>retryPending())

window.zaiaNativePushDiagnostics=async()=>{
  const establishmentId=await resolveEstablishmentId({})
  let serverStatus=null
  try{
    const session=await ensureSession()
    if(session?.access_token&&establishmentId){
      const res=await fetch(`${baseUrl()}/rest/v1/rpc/business_native_push_status`,{
        method:'POST',
        headers:{
          apikey:apiKey(),Authorization:`Bearer ${session.access_token}`,'Content-Type':'application/json',
          'Accept-Profile':schema(),'Content-Profile':schema(),
        },
        body:JSON.stringify({p_establishment_id:establishmentId}),
      })
      serverStatus=await res.json().catch(()=>null)
    }
  }catch{}
  return {nativeMode:window.ZAIA_NATIVE_PUSH_MODE||null,portReady:Boolean(nativePort),establishmentId,lastRegistered:Boolean(lastRegisteredToken),pending:Boolean(pendingToken),serverStatus}
}
