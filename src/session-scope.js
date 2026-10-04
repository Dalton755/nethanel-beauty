(()=>{
  const BASE='beauty_os_cloud_session_v2'
  const ctx=window.ZAIA_APP_CONTEXT||((location.pathname==='/cliente'||location.pathname.startsWith('/cliente/'))?'customer':'merchant')
  const scoped=`${BASE}:${ctx}`
  const proto=Storage.prototype
  const originalGet=proto.getItem
  const originalSet=proto.setItem
  const originalRemove=proto.removeItem

  try{
    const scopedValue=originalGet.call(localStorage,scoped)
    const legacy=originalGet.call(localStorage,BASE)
    if(!scopedValue&&legacy){
      const shouldMigrate=ctx==='merchant'||Boolean(originalGet.call(localStorage,'zaia_customer_profile_v1'))
      if(shouldMigrate){
        originalSet.call(localStorage,scoped,legacy)
        originalRemove.call(localStorage,BASE)
      }
    }else if(scopedValue&&legacy){
      // Sessão antiga não pode permanecer como fonte de restauração depois do logout.
      originalRemove.call(localStorage,BASE)
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
  window.ZAIA_SESSION_STORAGE_NATIVE={
    getItem:key=>originalGet.call(localStorage,key),
    setItem:(key,value)=>originalSet.call(localStorage,key,value),
    removeItem:key=>originalRemove.call(localStorage,key),
  }
})()
