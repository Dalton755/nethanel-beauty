import { cp, mkdir, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_PUBLISHABLE_KEY
const schema = process.env.SUPABASE_SCHEMA || 'beleza'

if (!url || !key) {
  throw new Error('Configure SUPABASE_URL e SUPABASE_PUBLISHABLE_KEY no Vercel antes do deploy.')
}

await mkdir('dist', { recursive: true })
const staticFiles = ['index.html','app.js','cloud.js','styles.css','manifest.webmanifest','icon.svg','sw.js']
for (const file of staticFiles) await cp(file, `dist/${file}`)

await writeFile('dist/config.js', `window.BEAUTY_CONFIG = ${JSON.stringify({
  supabaseUrl: url,
  supabasePublishableKey: key,
  schema
}, null, 2)}\n`)

if (existsSync('public')) await cp('public', 'dist/public', { recursive: true })
