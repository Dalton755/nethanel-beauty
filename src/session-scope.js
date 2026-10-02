(()=>{
  const BASE='beauty_os_cloud_session_v2'
  const ctx=window.ZAIA_APP_CONTEXT||((location.pathname==='/cliente'||location.pathname.startsWith('/cliente/'))?'customer':'merchant')
  const scoped=`${BASE}:${ctx}`
  const proto=Storage.prototype
  const originalGet=proto.getItem
  const originalSet=proto.setItem
  const originalRemove=proto.removeItem

  try{
    if(!originalGet.call(localStorage,scoped)){
      const legacy=originalGet.call(localStorage,BASE)
      const shouldMigrate=ctx==='merchant'||Boolean(originalGet.call(localStorage,'zaia_customer_profile_v1'))
      if(legacy&&shouldMigrate)originalSet.call(localStorage,scoped,legacy)
    }
  }catch{}

  proto.getItem=function(key){
    return originalGet.call(this,key===BASE?scoped:key)
  }
  proto.setItem=function(key,value){
    return originalSet.call(this,key===BASE?scoped:key,value)
  }
  proto.removeItem=function(key){
    return originalRemove.call(this,key===BASE?scoped:key)
  }

  window.ZAIA_SESSION_SCOPE=ctx
})()
