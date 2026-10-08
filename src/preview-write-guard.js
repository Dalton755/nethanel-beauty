import { previewAllowsRequest } from './preview-write-policy.js'
const isPreview=location.hostname.endsWith('.onrender.com')
const server=String(window.BEAUTY_CONFIG?.supabaseUrl||'').replace(/\/$/,'')
const isProductionDatabase=server.includes('sxghzubovthsvmfqncch.supabase.co')

if(isPreview&&isProductionDatabase){
  const nativeFetch=window.fetch.bind(window)
  window.fetch=(input,init={})=>{
    const raw=typeof input==='string'?input:input?.url||String(input)
    const method=init.method||(typeof input==='object'?input.method:'GET')
    if(!previewAllowsRequest(raw,method,server)){
      console.warn('ZAIA homologação: alteração bloqueada para proteger o banco de produção.')
      return Promise.reject(new Error('Homologação somente leitura: operação bloqueada para proteger os dados reais. Aguarde a conexão da base de testes.'))
    }
    return nativeFetch(input,init)
  }
  const stamp=()=>{
    if(document.querySelector('#zaiaPreviewReadOnly'))return
    const b=document.createElement('div')
    b.id='zaiaPreviewReadOnly';b.textContent='TESTES • SOMENTE LEITURA'
    b.setAttribute('aria-label','Ambiente de testes sem alterações no banco real')
    Object.assign(b.style,{position:'fixed',top:'max(7px, env(safe-area-inset-top))',left:'50%',transform:'translateX(-50%)',
      padding:'5px 12px',background:'#fff8ea',color:'#81552a',border:'1px solid #ebd7b5',
      borderRadius:'999px',font:'700 10px system-ui,sans-serif',boxShadow:'0 3px 12px #00000012',
      zIndex:'99999',pointerEvents:'none',whiteSpace:'nowrap'})
    document.body.appendChild(b)
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',stamp,{once:true})
  else stamp()
}
