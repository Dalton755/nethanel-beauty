const ZAIA_ACTIVE_SERVICE_SESSION='beauty_os_cloud_session_v2'
const guardCfg=()=>window.BEAUTY_CONFIG||{}
const guardBase=()=>String(guardCfg().supabaseUrl||'').replace(/\/$/,'')
const guardKey=()=>guardCfg().supabasePublishableKey||''
const guardSchema=()=>guardCfg().schema||'beleza'

function guardSession(){
  try{return JSON.parse(localStorage.getItem(ZAIA_ACTIVE_SERVICE_SESSION)||'null')}catch{return null}
}

async function guardRpc(name,body={}){
  const session=guardSession()
  if(!session?.access_token)throw new Error('Entre novamente na ZAIA.')
  const res=await fetch(`${guardBase()}/rest/v1/rpc/${name}`,{
    method:'POST',
    headers:{
      apikey:guardKey(),
      Authorization:`Bearer ${session.access_token}`,
      'Content-Type':'application/json',
      'Accept-Profile':guardSchema(),
      'Content-Profile':guardSchema(),
    },
    body:JSON.stringify(body),
  })
  const text=await res.text();let data=null
  try{data=text?JSON.parse(text):null}catch{data=text}
  if(!res.ok)throw new Error(data?.message||data?.hint||data?.details||String(data||`Erro ${res.status}`))
  return data
}

function guardTime(value){
  if(!value)return 'horário não informado'
  const d=new Date(value)
  if(Number.isNaN(d.getTime()))return 'horário não informado'
  return d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})
}

async function startAppointmentWithGuard(button,appointmentId){
  const original=button.textContent
  button.disabled=true
  button.textContent='Verificando...'
  try{
    let result=await guardRpc('business_start_appointment',{p_appointment_id:appointmentId})
    let safety=0
    while(result?.requires_finish===true&&result?.open_appointment_id&&safety<5){
      safety++
      const client=String(result.open_client_name||'Cliente')
      const time=guardTime(result.open_starts_at)
      const finish=confirm(`Você tem um atendimento em aberto:\n\n${client} • ${time}\n\nAntes de iniciar este atendimento, você precisa finalizar o atendimento atual.\n\nDeseja finalizar agora?`)
      if(!finish){
        button.disabled=false
        button.textContent=original
        return
      }
      button.textContent='Finalizando atendimento anterior...'
      await guardRpc('complete_appointment',{p_appointment_id:result.open_appointment_id})
      button.textContent='Iniciando novo atendimento...'
      result=await guardRpc('business_start_appointment',{p_appointment_id:appointmentId})
    }
    if(result?.requires_finish===true)throw new Error('Ainda existe um atendimento em aberto para este profissional. Finalize-o antes de continuar.')
    location.reload()
  }catch(error){
    alert(String(error?.message||error))
    button.disabled=false
    button.textContent=original
  }
}

document.addEventListener('click',event=>{
  const button=event.target.closest?.('[data-ops-start]')
  if(!button||!location.pathname.startsWith('/loja'))return
  event.preventDefault()
  event.stopImmediatePropagation()
  const appointmentId=button.dataset.opsStart
  if(appointmentId)startAppointmentWithGuard(button,appointmentId)
},true)
