// Regras de fidelização independentes da interface, testáveis sem rede.
export const localBusinessDate=(date=new Date(),timeZone='America/Sao_Paulo')=>
  new Intl.DateTimeFormat('sv-SE',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).format(date)

const activeStatuses=new Set(['SCHEDULED','CONFIRMED','IN_SERVICE','AGENDADO','CONFIRMADO','EM_ATENDIMENTO'])
const utcDay=(day)=>Date.parse(String(day).slice(0,10)+'T12:00:00Z')

export function getRetentionCandidates(clients=[],appointments=[],date=localBusinessDate()){
  const day=String(date).slice(0,10)
  const now=utcDay(day)
  const withBookings=new Set(appointments.filter(a=>
    activeStatuses.has(a.status)&&String(a.date||a.startsAt||'').slice(0,10)>=day
  ).map(a=>a.clientId))
  return clients.filter(c=>c?.lastVisit&&Number(c.returnDays)>0&&!withBookings.has(c.id))
    .map(c=>{
      const elapsed=Math.floor((now-utcDay(c.lastVisit))/86400000)
      const returnDays=Number(c.returnDays)
      return {...c,daysSince:elapsed,daysUntilReturn:returnDays-elapsed,overdue:elapsed>=returnDays}
    })
    .filter(c=>Number.isFinite(c.daysSince)&&c.daysSince>=Math.max(1,Number(c.returnDays)-3))
    .sort((a,b)=>Number(b.overdue)-Number(a.overdue)||a.daysUntilReturn-b.daysUntilReturn||String(a.name).localeCompare(String(b.name),'pt-BR'))
}

export function getAgendaOpportunity(appointments=[],day=localBusinessDate()){
  const booked=appointments.filter(a=>a.date===day&&activeStatuses.has(a.status)).length
  return {booked,lowDemand:day>=localBusinessDate()&&booked<3}
}
