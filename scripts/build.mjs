import { cp, mkdir, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_PUBLISHABLE_KEY
const schema = process.env.SUPABASE_SCHEMA || 'beleza'

if (!url || !key) {
  throw new Error('Configure SUPABASE_URL e SUPABASE_PUBLISHABLE_KEY no Vercel antes do deploy.')
}

for (const file of ['src/app.js','src/client.js','src/admin.js','src/admin-production.js','src/pro-plans.js','src/production-guard.js','src/auth-recovery.js','src/customer-privacy.js','src/customer-help.js','src/customer-assistant.js','src/customer-assistant-stability.js','src/customer-access-info.js','src/customer-accessibility-filter.js','src/customer-session-isolation.js','src/merchant-access-settings.js','src/merchant-login-brand-guard.js','src/merchant-logout-fix.js','src/merchant-help.js','src/merchant-shell.js','src/client-shell.js','src/session-scope.js','src/map-enhancement.js','src/operational-engine.js','src/customer-arrival.js','src/business-rating.js','src/customer-rating.js','src/merchant-premium-ui.js','src/client-premium-ui.js','src/merchant-booking-modal.js','src/promotion-experience.js','src/cloud.js']) {
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
await cp('src/customer-assistant.js', 'dist/customer-assistant.js')
await cp('src/customer-assistant-stability.js', 'dist/customer-assistant-stability.js')
await cp('src/customer-access-info.js', 'dist/customer-access-info.js')
await cp('src/customer-accessibility-filter.js', 'dist/customer-accessibility-filter.js')
await cp('src/customer-session-isolation.js', 'dist/customer-session-isolation.js')
await cp('src/merchant-access-settings.js', 'dist/merchant-access-settings.js')
await cp('src/merchant-login-brand-guard.js', 'dist/merchant-login-brand-guard.js')
await cp('src/merchant-logout-fix.js', 'dist/merchant-logout-fix.js')
await cp('src/merchant-help.js', 'dist/merchant-help.js')
await cp('src/merchant-shell.js', 'dist/merchant-shell.js')
await cp('src/client-shell.js', 'dist/client-shell.js')
await cp('src/session-scope.js', 'dist/session-scope.js')
await cp('src/map-enhancement.js', 'dist/map-enhancement.js')
await cp('src/operational-engine.js', 'dist/operational-engine.js')
await cp('src/customer-arrival.js', 'dist/customer-arrival.js')
await cp('src/business-rating.js', 'dist/business-rating.js')
await cp('src/customer-rating.js', 'dist/customer-rating.js')
await cp('src/merchant-premium-ui.js', 'dist/merchant-premium-ui.js')
await cp('src/client-premium-ui.js', 'dist/client-premium-ui.js')
await cp('src/merchant-booking-modal.js', 'dist/merchant-booking-modal.js')
await cp('src/promotion-experience.js', 'dist/promotion-experience.js')
await cp('src/cloud.js', 'dist/cloud.js')
await cp('src/styles.css', 'dist/styles.css')
await cp('src/pro-plans.css', 'dist/pro-plans.css')
await cp('src/admin-production.css', 'dist/admin-production.css')
await cp('src/map-enhancement.css', 'dist/map-enhancement.css')
await cp('src/operational.css', 'dist/operational.css')
await cp('src/professional-services-fix.css', 'dist/professional-services-fix.css')
await cp('src/rating.css', 'dist/rating.css')
await cp('src/merchant-premium-ui.css', 'dist/merchant-premium-ui.css')
await cp('src/client-premium-ui.css', 'dist/client-premium-ui.css')
await cp('src/merchant-booking-modal.css', 'dist/merchant-booking-modal.css')
await cp('src/promotion-experience.css', 'dist/promotion-experience.css')
await cp('src/customer-assistant.css', 'dist/customer-assistant.css')

await writeFile('dist/config.js', `window.BEAUTY_CONFIG = ${JSON.stringify({
  supabaseUrl: url,
  supabasePublishableKey: key,
  schema,
}, null, 2)}\n`)

if (existsSync('public')) {
  await cp('public', 'dist/public', { recursive: true })
}
