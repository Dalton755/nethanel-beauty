import { ensureSession, clearSession } from './cloud.js'

const cfg=()=>window.BEAUTY_CONFIG||{}
const baseUrl=()=>String(cfg().supabaseUrl||'').replace(/\/$/,'')
const apiKey=()=>cfg().supabasePublishableKey||''
let dialog=null

function esc(v=''){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}

async function accountRequest(mode,extra={}){
  const session=await ensureSession()
  if(!session?.access_token)throw new Error('Entre novamente na sua conta ZAIA.')
  const res=await fetch(`${baseUrl()}/functions/v1/zaia-account`,{
    method:'POST',
    headers:{
      apikey:apiKey(),
      Authorization:`Bearer ${session.access_token}`,
      'Content-Type':'application/json',
    },
    body:JSON.stringify({mode,...extra}),
  })
  const data=await res.json().catch(()=>({}))
  if(!res.ok){
    const error=new Error(data?.error||'Não foi possível processar sua solicitação.')
    error.status=res.status
    throw error
  }
  return data
}

function downloadJson(data){
  const day=new Date().toISOString().slice(0,10)
  const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json;charset=utf-8'})
  const href=URL.createObjectURL(blob)
  const a=document.createElement('a')
  a.href=href
  a.download=`zaia-meus-dados-${day}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(()=>URL.revokeObjectURL(href),1500)
}

async function exportData(button){
  const old=button.innerHTML
  button.disabled=true
  button.innerHTML='<span class="zaia-privacy-action-icon">↧</span><span><strong>Preparando seus dados...</strong><small>Aguarde alguns segundos</small></span>'
  try{
    const result=await accountRequest('export_customer')
    downloadJson(result.data)
    button.innerHTML='<span class="zaia-privacy-action-icon success">✓</span><span><strong>Arquivo gerado</strong><small>Seus dados foram baixados neste aparelho</small></span>'
    setTimeout(()=>{button.disabled=false;button.innerHTML=old},2200)
  }catch(error){
    button.disabled=false
    button.innerHTML=old
    alert(String(error?.message||error))
  }
}

function closeDialog(){dialog?.remove();dialog=null;document.documentElement.classList.remove('zaia-privacy-lock')}

function deleteDialog(){
  if(dialog)return
  dialog=document.createElement('div')
  dialog.className='zaia-privacy-overlay'
  dialog.innerHTML=`<section class="zaia-privacy-dialog" role="dialog" aria-modal="true" aria-labelledby="zaiaDeleteTitle">
    <button class="zaia-privacy-close" type="button" aria-label="Fechar">×</button>
    <span class="zaia-privacy-kicker">PRIVACIDADE • CONTA ZAIA</span>
    <h2 id="zaiaDeleteTitle">Excluir minha conta</h2>
    <p>Esta ação remove sua conta ZAIA, perfil, notificações e preferências. Os registros que a loja precisa manter para histórico operacional ficam apenas de forma <strong>anonimizada</strong>, sem seu nome, telefone ou e-mail.</p>
    <div class="zaia-privacy-warning"><strong>Antes de excluir</strong><span>Se você tiver um agendamento futuro, cancele esse horário primeiro. A ZAIA não exclui uma conta com atendimento ainda marcado.</span></div>
    <label class="zaia-delete-confirm"><span>Digite <b>EXCLUIR</b> para confirmar</span><input id="zaiaDeletePhrase" autocomplete="off" autocapitalize="characters" placeholder="EXCLUIR"></label>
    <div class="zaia-delete-error" id="zaiaDeleteError"></div>
    <button class="zaia-delete-submit" id="zaiaDeleteSubmit" type="button" disabled>Excluir minha conta definitivamente</button>
    <a class="zaia-privacy-policy" href="/privacidade" target="_blank" rel="noopener">Ver Política de Privacidade</a>
  </section>`
  document.body.appendChild(dialog)
  document.documentElement.classList.add('zaia-privacy-lock')
  const input=dialog.querySelector('#zaiaDeletePhrase')
  const submit=dialog.querySelector('#zaiaDeleteSubmit')
  const error=dialog.querySelector('#zaiaDeleteError')
  dialog.querySelector('.zaia-privacy-close')?.addEventListener('click',closeDialog)
  dialog.addEventListener('click',e=>{if(e.target===dialog)closeDialog()})
  input?.addEventListener('input',()=>{submit.disabled=String(input.value||'').trim().toUpperCase()!=='EXCLUIR';error.textContent=''})
  submit?.addEventListener('click',async()=>{
    if(String(input?.value||'').trim().toUpperCase()!=='EXCLUIR')return
    submit.disabled=true;submit.textContent='Excluindo sua conta...';error.textContent=''
    try{
      await accountRequest('delete_customer',{confirmation:'EXCLUIR'})
      clearSession()
      localStorage.removeItem('zaia_customer_profile_v1')
      localStorage.removeItem('zaia_pending_customer_profile')
      localStorage.removeItem('zaia_google_return_to')
      dialog.querySelector('.zaia-privacy-dialog').innerHTML=`<div class="zaia-delete-success"><span>✓</span><h2>Conta excluída</h2><p>Seus dados pessoais foram removidos da ZAIA. Você será direcionado para a busca.</p></div>`
      setTimeout(()=>location.replace('/cliente?conta=removida'),1600)
    }catch(err){
      error.textContent=String(err?.message||err)
      submit.disabled=false;submit.textContent='Excluir minha conta definitivamente'
    }
  })
}

function enhanceProfile(){
  const actions=document.querySelector('.client-profile-actions')
  if(!actions||actions.dataset.zaiaPrivacyEnhanced==='true')return
  actions.dataset.zaiaPrivacyEnhanced='true'
  const section=document.createElement('section')
  section.className='zaia-privacy-section'
  section.innerHTML=`<div class="zaia-privacy-head"><span>SEUS DADOS</span><strong>Privacidade e conta</strong><small>Você controla seus dados na ZAIA.</small></div>
    <button class="client-profile-action zaia-data-export" id="zaiaExportData" type="button"><span class="zaia-privacy-action-icon">↧</span><span><strong>Baixar meus dados</strong><small>Receba uma cópia dos dados da sua conta e histórico</small></span></button>
    <div class="zaia-danger-zone"><div><span>ZONA DE RISCO</span><small>A exclusão é permanente e diferente de sair da conta.</small></div><button class="zaia-account-delete" id="zaiaDeleteAccount" type="button"><span class="zaia-privacy-action-icon danger">×</span><span><strong>Excluir conta</strong><small>Requer confirmação</small></span></button></div>`
  actions.appendChild(section)
  section.querySelector('#zaiaExportData')?.addEventListener('click',e=>exportData(e.currentTarget))
  section.querySelector('#zaiaDeleteAccount')?.addEventListener('click',deleteDialog)
}

const style=document.createElement('style')
style.textContent=`
.zaia-privacy-section{display:grid;gap:9px;margin-top:15px;padding-top:15px;border-top:1px solid var(--line,#eadfda)}
.zaia-privacy-head{display:grid;gap:2px;padding:0 2px 4px}.zaia-privacy-head>span{font-size:8px;font-weight:900;letter-spacing:.14em;color:var(--muted,#8c7c80)}.zaia-privacy-head>strong{font-size:13px}.zaia-privacy-head>small{font-size:9px;color:var(--muted,#8c7c80)}
.zaia-privacy-action-icon{width:34px;height:34px;border-radius:11px;background:#f2e8e4;color:var(--brand,#3b172b);display:grid;place-items:center;font-size:18px;font-weight:900;flex:0 0 34px}.zaia-privacy-action-icon.success{background:#e7f4eb;color:#276a46}.zaia-privacy-action-icon.danger{background:#fbefef;color:#9f3d45}
.zaia-danger-zone{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-top:5px;padding:12px 2px 2px;border-top:1px dashed #ead3d5}.zaia-danger-zone>div{display:grid;gap:2px;min-width:0}.zaia-danger-zone>div>span{font-size:7.5px;font-weight:900;letter-spacing:.14em;color:#9b4b52}.zaia-danger-zone>div>small{font-size:8.5px;line-height:1.35;color:var(--muted,#8c7c80)}
.zaia-account-delete{width:auto!important;min-height:44px;display:inline-flex;align-items:center;justify-content:center;gap:7px;flex:0 0 auto;padding:7px 11px!important;border:1px solid #e5c7ca!important;border-radius:12px;background:#fffafa!important;color:#91363e;box-shadow:none!important}.zaia-account-delete .zaia-privacy-action-icon{width:26px;height:26px;flex-basis:26px;border-radius:8px;font-size:15px}.zaia-account-delete strong{display:block;font-size:9.5px;color:#91363e;white-space:nowrap}.zaia-account-delete small{display:block;margin-top:1px;font-size:7.5px;color:#9b777b;white-space:nowrap}.zaia-privacy-lock{overflow:hidden!important}
.zaia-privacy-overlay{position:fixed;inset:0;z-index:12000;background:rgba(37,17,28,.64);backdrop-filter:blur(8px);display:grid;place-items:center;padding:18px;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
.zaia-privacy-dialog{width:min(470px,100%);position:relative;background:#fffdfb;border:1px solid #eadfda;border-radius:24px;padding:24px;box-shadow:0 28px 90px rgba(27,12,21,.28);color:#302229}.zaia-privacy-close{position:absolute;right:14px;top:14px;width:34px;height:34px;border:1px solid #e5d9d5;background:#f7efeb;border-radius:50%;font-size:20px;color:#5a4d52}.zaia-privacy-kicker{display:block;font-size:8.5px;font-weight:900;letter-spacing:.13em;color:#8e7c82;padding-right:45px}.zaia-privacy-dialog h2{font-size:26px;letter-spacing:-.04em;margin:7px 0}.zaia-privacy-dialog>p{font-size:10.5px;line-height:1.55;color:#6d5f64;margin:0 0 14px}
.zaia-privacy-warning{display:grid;gap:3px;border:1px solid #eadbca;background:#fbf3e8;border-radius:14px;padding:12px;margin-bottom:14px}.zaia-privacy-warning strong{font-size:10.5px;color:#765022}.zaia-privacy-warning span{font-size:9.5px;line-height:1.4;color:#79695c}.zaia-delete-confirm{display:grid;gap:6px;font-size:9.5px;font-weight:750}.zaia-delete-confirm input{width:100%;min-height:44px;border:1px solid #ddcfca;border-radius:12px;padding:10px 11px;background:#fff;font:inherit;font-size:12px;text-transform:uppercase}.zaia-delete-error{min-height:18px;color:#a13c44;font-size:9.5px;margin-top:7px;line-height:1.35}.zaia-delete-submit{width:100%;border:0;border-radius:13px;background:#9f3d45;color:#fff;padding:12px;font-size:10.5px;font-weight:900}.zaia-delete-submit:disabled{opacity:.4}.zaia-privacy-policy{display:block;text-align:center;margin-top:12px;font-size:9px;color:var(--brand,#3b172b);font-weight:800}.zaia-delete-success{text-align:center;display:grid;justify-items:center;gap:7px;padding:20px 4px}.zaia-delete-success>span{width:52px;height:52px;border-radius:50%;display:grid;place-items:center;background:#e8f5ed;color:#286a47;font-size:25px;font-weight:900}.zaia-delete-success h2{margin:3px 0 0}.zaia-delete-success p{font-size:10px;color:#74666a;line-height:1.45;margin:0}
@media(max-width:520px){.zaia-privacy-overlay{align-items:end;padding:0}.zaia-privacy-dialog{border-radius:24px 24px 0 0;padding:22px 17px calc(22px + env(safe-area-inset-bottom))}.zaia-danger-zone{align-items:flex-start}.zaia-danger-zone>div>small{max-width:190px}}
`
document.head.appendChild(style)

enhanceProfile()
const app=document.querySelector('#app')
if(app)new MutationObserver(()=>queueMicrotask(enhanceProfile)).observe(app,{childList:true,subtree:true})
