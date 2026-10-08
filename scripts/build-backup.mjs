/**
 * Build alternativo para Render Static Sites, sem depender da cota de deploy da Vercel.
 *
 * Preferência: defina SUPABASE_URL e SUPABASE_PUBLISHABLE_KEY no Render.
 * Bootstrap: quando ausentes, lê apenas a configuração pública do site atual
 * (publishable key), nunca credenciais administrativas.
 */
import { execFileSync } from 'node:child_process';

async function getPublicConfig() {
  const url = 'https://zaia.nethanel.com.br/config.js';
  const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error('Configuração pública de bootstrap indisponível (HTTP ' + response.status + ')');
  const source = await response.text();
  const match = source.match(/window\.BEAUTY_CONFIG\s*=\s*(\{[\s\S]*?\})\s*;?\s*$/);
  if (!match) throw new Error('Formato de config.js inesperado. Defina as variáveis no Render.');
  const parsed = JSON.parse(match[1]);
  if (!/^https:\/\//.test(String(parsed.supabaseUrl || '')) || !String(parsed.supabasePublishableKey || '')) {
    throw new Error('Configuração pública inválida.');
  }
  return parsed;
}

const env = { ...process.env };
if (!env.SUPABASE_URL || !env.SUPABASE_PUBLISHABLE_KEY) {
  const config = await getPublicConfig();
  env.SUPABASE_URL = config.supabaseUrl;
  env.SUPABASE_PUBLISHABLE_KEY = config.supabasePublishableKey;
  env.SUPABASE_SCHEMA = config.schema || 'beleza';
}
execFileSync(process.execPath, ['scripts/build.mjs'], {
  stdio: 'inherit',
  env,
});
