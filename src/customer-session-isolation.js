const SESSION_KEY='beauty_os_cloud_session_v2'
const OWNER_KEY='zaia_customer_ui_owner_v1'
const TRANSIENT_KEYS=[
  'zaia_customer_accessible_only_v1',
  'zaia_assistant_pending_search',
]

function currentOwner(){
  try{
    const session=JSON.parse(localStorage.getItem(SESSION_KEY)||'null')
    const user=session?.user||{}
    return String(user.id||user.email||'')
  }catch{return ''}
}

function clearCustomerUiState(){
  for(const key of TRANSIENT_KEYS)sessionStorage.removeItem(key)
}

function syncOwner({reloadOnChange=false}={}){
  const owner=currentOwner()
  const previous=sessionStorage.getItem(OWNER_KEY)||''
  if(previous===owner)return false

  clearCustomerUiState()
  if(owner)sessionStorage.setItem(OWNER_KEY,owner)
  else sessionStorage.removeItem(OWNER_KEY)

  if(reloadOnChange&&previous!==owner){
    const url=new URL(location.href)
    url.pathname='/cliente'
    url.search=''
    url.hash=''
    location.replace(url.toString())
    return true
  }
  return false
}

// Na primeira carga, limpa preferências transitórias se a conta atual for
// diferente daquela que usou esta aba anteriormente.
syncOwner({reloadOnChange:false})

let lastOwner=currentOwner()
setInterval(()=>{
  const owner=currentOwner()
  if(owner===lastOwner)return
  lastOwner=owner
  syncOwner({reloadOnChange:true})
},300)

// Também limpa imediatamente quando o usuário toca em sair.
document.addEventListener('click',event=>{
  if(!event.target.closest?.('#clientLogout'))return
  clearCustomerUiState()
  sessionStorage.removeItem(OWNER_KEY)
},true)
