import test from 'node:test'
import assert from 'node:assert/strict'
import {localBusinessDate,getRetentionCandidates,getAgendaOpportunity} from '../src/retention-insights.js'
import {previewAllowsRequest} from '../src/preview-write-policy.js'
const today='2026-10-08'

test('fidelização: cliente em retorno, ordenação e quem já agendou não recebe cobrança',()=>{
  const clients=[
    {id:'1',name:'Ana',lastVisit:'2026-09-01',returnDays:30},
    {id:'2',name:'Bea',lastVisit:'2026-09-28',returnDays:30},
    {id:'3',name:'Carla',lastVisit:'2026-09-05',returnDays:30},
  ]
  const appointments=[{clientId:'1',date:'2026-10-11',status:'AGENDADO'},
    {clientId:'2',date:'2026-10-02',status:'CONCLUIDO'}]
  const result=getRetentionCandidates(clients,appointments,today)
  assert.deepEqual(result.map(c=>c.id),['3'])
  assert.equal(result[0].overdue,true)
})
test('fidelização: antecipa retorno por três dias, respeitando calendário',()=>{
  const clients=[{id:'1',name:'Teste',lastVisit:'2026-09-10',returnDays:30}]
  const result=getRetentionCandidates(clients,[],today)
  assert.equal(result.length,1)
  assert.equal(result[0].daysUntilReturn,2)
})
test('ocasiões para divulgação: agenda pouco ocupada, sem misturar cancelamentos',()=>{
  const a=[{date:today,status:'CANCELADO'},{date:today,status:'AGENDADO'}]
  assert.equal(getAgendaOpportunity(a,today).booked,1)
  assert.equal(getAgendaOpportunity(a,today).lowDemand,true)
})
test('horário local: meia-noite UTC ainda é dia anterior em SP',()=>{
  assert.equal(localBusinessDate(new Date('2026-10-09T01:00:00.000Z')),'2026-10-08')
})
test('homologação: permite busca e sessão, bloqueia agendamento, cobrança e alterações',()=>{
  const api='https://sxghzubovthsvmfqncch.supabase.co'
  assert.equal(previewAllowsRequest(api+'/rest/v1/establishments','GET',api),true)
  assert.equal(previewAllowsRequest(api+'/rest/v1/rpc/public_storefront','POST',api),true)
  assert.equal(previewAllowsRequest(api+'/auth/v1/token?grant_type=password','POST',api),true)
  assert.equal(previewAllowsRequest(api+'/rest/v1/rpc/public_book_appointment','POST',api),false)
  assert.equal(previewAllowsRequest(api+'/rest/v1/appointments','POST',api),false)
  assert.equal(previewAllowsRequest(api+'/rest/v1/appointments','PATCH',api),false)
  assert.equal(previewAllowsRequest(api+'/functions/v1/zaia-billing','POST',api),false)
  assert.equal(previewAllowsRequest(api+'/auth/v1/signup','POST',api),false)
})
