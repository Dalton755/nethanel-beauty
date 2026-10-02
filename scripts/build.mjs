import { cp, mkdir, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_PUBLISHABLE_KEY
const schema = process.env.SUPABASE_SCHEMA || 'beleza'

if (!url || !key) {
  throw new Error('Configure SUPABASE_URL e SUPABASE_PUBLISHABLE_KEY no Vercel antes do deploy.')
}

for (const file of ['src/app.js','src/client.js','src/admin.js','src/admin-production.js','src/pro-plans.js','src/production-guard.js','src/auth-recovery.js','src/customer-privacy.js','src/customer-help.js','src/merchant-help.js','src/merchant-shell.js','src/client-shell.js','src/session-scope.js','src/cloud.js']) {
  execFileSync(process.execPath, ['--check', file], { stdio: 'inherit' })
}

await mkdir('dist', { recursive: true })
await mkdir('dist/loja', { recursive: true })
await mkdir('dist/cliente', { recursive: true })
await mkdir('dist/gestao', { recursive: true })
await mkdir('dist/termos', { recursive: true })
await mkdir('dist/privacidade', { recursive: true })

for (const file of ['index.html','manifest.webmanifest','manifest-loja.webmanifest','manifest-cliente.webmanifest','icon.svg','zaia-logo.svg','sw.js','sw-loja.js','sw-cliente.js']) {
  await cp(file, `dist/${file}`)
}
await cp('loja.html','dist/loja/index.html')
await cp('cliente.html','dist/cliente/index.html')
await cp('index.html','dist/gestao/index.html')
await cp('legal/termos.html','dist/termos/index.html')
await cp('legal/privacidade.html','dist/privacidade/index.html')

await cp('src/app.js', 'dist/app.js')
await cp('src/client.js', 'dist/client.js')
await cp('src/admin.js', 'dist/admin.js')
await cp('src/admin-production.js', 'dist/admin-production.js')
await cp('src/pro-plans.js', 'dist/pro-plans.js')
await cp('src/production-guard.js', 'dist/production-guard.js')
await cp('src/auth-recovery.js', 'dist/auth-recovery.js')
await cp('src/customer-privacy.js', 'dist/customer-privacy.js')
await cp('src/customer-help.js', 'dist/customer-help.js')
await cp('src/merchant-help.js', 'dist/merchant-help.js')
await cp('src/merchant-shell.js', 'dist/merchant-shell.js')
await cp('src/client-shell.js', 'dist/client-shell.js')
await cp('src/session-scope.js', 'dist/session-scope.js')
await cp('src/cloud.js', 'dist/cloud.js')
await cp('src/styles.css', 'dist/styles.css')
await cp('src/pro-plans.css', 'dist/pro-plans.css')
await cp('src/admin-production.css', 'dist/admin-production.css')

await writeFile('dist/config.js', `window.BEAUTY_CONFIG = ${JSON.stringify({
  supabaseUrl: url,
  supabasePublishableKey: key,
  schema,
}, null, 2)}\n`)

if (existsSync('public')) {
  await cp('public', 'dist/public', { recursive: true })
}
