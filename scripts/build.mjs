import { cp, mkdir, readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_PUBLISHABLE_KEY
const schema = process.env.SUPABASE_SCHEMA || 'beleza'

if (!url || !key) {
  throw new Error('Configure SUPABASE_URL e SUPABASE_PUBLISHABLE_KEY no Vercel antes do deploy.')
}

await mkdir('dist', { recursive: true })

for (const file of ['index.html','manifest.webmanifest','icon.svg','sw.js']) {
  await cp(file, `dist/${file}`)
}

async function restore(target, chunks) {
  const encoded = (await Promise.all(chunks.map(file => readFile(file, 'utf8')))).join('')
  const decoded = gunzipSync(Buffer.from(encoded, 'base64'))
  await writeFile(`dist/${target}`, decoded)
}

await restore('app.js', [
  'scripts/chunks/app_js.00.txt',
  'scripts/chunks/app_js.01.txt',
  'scripts/chunks/app_js.02.txt',
])
await restore('cloud.js', ['scripts/chunks/cloud_js.00.txt'])
await restore('styles.css', ['scripts/chunks/styles_css.00.txt'])

await writeFile('dist/config.js', `window.BEAUTY_CONFIG = ${JSON.stringify({
  supabaseUrl: url,
  supabasePublishableKey: key,
  schema,
}, null, 2)}\n`)

if (existsSync('public')) {
  await cp('public', 'dist/public', { recursive: true })
}
