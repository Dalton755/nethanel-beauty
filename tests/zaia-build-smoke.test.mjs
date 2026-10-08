import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync,existsSync} from 'node:fs'
const html=path=>readFileSync(path,'utf8')
test('loja: estilos principais e bloqueio do preview carregados',()=>{
  const h=html('dist/loja/index.html')
  assert.match(h,/merchant-zaia-2026\.css/)
  assert.match(h,/await import\('\/preview-write-guard\.js/)
  assert.ok(existsSync('dist/merchant-zaia-2026.css'))
  assert.ok(existsSync('dist/preview-write-guard.js'))
  assert.ok(existsSync('dist/retention-insights.js'))
})
test('cliente: protege transações e carrega interface',()=>{
  const h=html('dist/cliente/index.html')
  assert.match(h,/preview-write-guard/)
  assert.ok(existsSync('dist/client.js'))
  assert.ok(existsSync('dist/client-premium-ui.css'))
})
test('funcionário: perfil isolado com guarda de homologação',()=>{
  const h=html('dist/funcionario/index.html')
  assert.match(h,/preview-write-guard/)
  assert.match(h,/employee-app/)
  assert.ok(existsSync('dist/employee-app.js'))
})
test('configuração pública presente, sem credencial administrativa',()=>{
  const s=html('dist/config.js')
  assert.match(s,/supabaseUrl/)
  assert.match(s,/supabasePublishableKey/)
  assert.doesNotMatch(s,/"service_role"/)
  assert.doesNotMatch(s,/sb_secret_/)
})
