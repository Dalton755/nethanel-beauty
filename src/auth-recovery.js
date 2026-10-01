const cfg=()=>window.BEAUTY_CONFIG||{}
const baseUrl=()=>String(cfg().supabaseUrl||'').replace(/\/$/,'')
const apiKey=()=>cfg().supabasePublishableKey||''
const isClient=()=>location.pathname==='/cliente'||location.pathname.startsWith('/cliente/')
const SESSION_KEY='beauty_os_cloud_session_v2'

function css(){
  const style=document.createElement('style')
  style.textContent=`
  .zaia-forgot-btn{width:100%;border:0;background:transparent;color:var(--brand,#3b172b);font-size:9.5px;font-weight:800;padding:8px 4px 2px;text-align:center;cursor:pointer}
  .zaia-recovery-page{min-height:100vh;display:grid;place-items:center;background:linear-gradient(145deg,#f7f1ed,#eee2de);padding:18px;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#302229}
  .zaia-recovery-card{width:min(440px,100%);background:#fffdfb;border:1px solid #eadfda;border-radius:24px;padding:25px;box-shadow:0 24px 70px rgba(38,17,29,.15)}
  .zaia-recovery-card img{width:120px;max-height:48px;object-fit:contain;object-position:left center;margin-bottom:20px}.zaia-recovery-card .kick{font-size:9px;letter-spacing:.14em;color:#8d7a81;font-weight:900}.zaia-recovery-card h1{font-size:28px;letter-spacing:-.045em;margin:6px 0 7px}.zaia-recovery-card>p{font-size:11px;line-height:1.5;color:#706267;margin:0 0 16px}
  .zaia-reset-field{display:grid;gap:6px;margin-top:11px}.zaia-reset-field label{font-size:9.5px;font-weight:800}.zaia-reset-wrap{position:relative}.zaia-reset-wrap input{width:100%;min-height:45px;border:1px solid #dfd1cc;border-radius:12px;background:#fff;padding:10px 75px 10px 11px;font:inherit;font-size:12px}.zaia-reset-wrap button{position:absolute;right:7px;top:50%;transform:translateY(-50%);border:0;background:transparent;color:#4f1e38;font-size:9px;font-weight:850;padding:7px}
  .zaia-reset-submit{width:100%;border:0;border-radius:13px;background:#3b172b;color:#fff;padding:13px;font-size:11px;font-weight:900;margin-top:14px}.zaia-reset-submit:disabled{opacity:.5}.zaia-reset-error{min-height:18px;color:#a13d46;font-size:9.5px;margin-top:8px}.zaia-reset-success{padding:13px;border-radius:13px;background:#eaf5ee;color:#286647;font-size:10px;line-height:1.45;margin-top:12px}
  `
  document.head.appendChild(style)
}

async function sendRecovery(email){
  const url=baseUrl(),key=apiKey()
  if(!url||!key)throw new Error('A recuperação de senha está temporariamente indisponível.')
  const redirectTo=location.origin+(isClient()?'/cliente':'/')
  const res=await fetch(`${url}/auth/v1/recover?redirect_to=${encodeURIComponent(redirectTo)}`,{
    method:'POST',headers:{apikey:key,'Content-Type':'application/json'},body:JSON.stringify({email})
  })
  const data=await res.json().catch(()=>({}))
  if(!res.ok){
    if(res.status===429)throw new Error('Aguarde um minuto antes de solicitar outro e-mail.')
    throw new Error(data?.msg||data?.message||'Não foi possível enviar o e-mail agora.')
  }
  return true
}

function enhanceLogin(){
  const forms=[document.querySelector('#authForm'),document.querySelector('#clientAuthForm')].filter(Boolean)
  for(const form of forms){
    if(form.dataset.zaiaRecoveryEnhanced==='true')continue
    const submit=form.querySelector('button[type="submit"],button[name="action"]')
    if(!submit||!/entrar/i.test(submit.textContent||''))continue
    const password=form.querySelector('input[name="password"]')
    const email=form.querySelector('input[name="email"]')
    if(!password||!email)continue
    form.dataset.zaiaRecoveryEnhanced='true'
    const button=document.createElement('button')
    button.type='button';button.className='zaia-forgot-btn';button.textContent='Esqueci minha senha'
    button.addEventListener('click',async()=>{
      const value=String(email.value||'').trim()
      if(!value){email.focus();alert('Informe seu e-mail primeiro para recuperar a senha.');return}
      const old=button.textContent;button.disabled=true;button.textContent='Enviando link...'
      try{
        await sendRecovery(value)
        alert('Se este e-mail estiver cadastrado na ZAIA, você receberá um link para criar uma nova senha.')
      }catch(error){alert(String(error?.message||error))}
      finally{button.disabled=false;button.textContent=old}
    })
    submit.insertAdjacentElement('afterend',button)
  }
}

function recoveryPage(){
  const hash=new URLSearchParams(location.hash.replace(/^#/,''))
  const token=hash.get('access_token')||''
  const error=hash.get('error_description')||hash.get('error')||''
  const app=document.querySelector('#app')||document.body
  app.innerHTML=`<main class="zaia-recovery-page"><section class="zaia-recovery-card"><img src="/zaia-logo.svg" alt="ZAIA"><span class="kick">RECUPERAÇÃO DE ACESSO</span><h1>Crie uma nova senha.</h1><p>Use pelo menos 8 caracteres. Depois da alteração, você volta para a tela de acesso da ZAIA.</p>${error||!token?`<div class="zaia-reset-error">${error?escapeHtml(error):'Este link de recuperação é inválido ou expirou. Solicite um novo link.'}</div><button class="zaia-reset-submit" id="recoveryBack">Voltar ao login</button>`:`<form id="zaiaResetForm"><div class="zaia-reset-field"><label>Nova senha</label><div class="zaia-reset-wrap"><input id="zaiaNewPassword" type="password" minlength="8" autocomplete="new-password" required><button type="button" data-reset-toggle="zaiaNewPassword">Mostrar</button></div></div><div class="zaia-reset-field"><label>Confirmar senha</label><div class="zaia-reset-wrap"><input id="zaiaConfirmPassword" type="password" minlength="8" autocomplete="new-password" required><button type="button" data-reset-toggle="zaiaConfirmPassword">Mostrar</button></div></div><button class="zaia-reset-submit" type="submit">Salvar nova senha</button><div class="zaia-reset-error" id="zaiaResetError"></div></form>`}</section></main>`

  document.querySelector('#recoveryBack')?.addEventListener('click',()=>location.replace(location.pathname))
  document.querySelectorAll('[data-reset-toggle]').forEach(b=>b.addEventListener('click',()=>{
    const input=document.getElementById(b.dataset.resetToggle)
    if(!input)return
    const visible=input.type==='text';input.type=visible?'password':'text';b.textContent=visible?'Mostrar':'Ocultar'
  }))
  document.querySelector('#zaiaResetForm')?.addEventListener('submit',async e=>{
    e.preventDefault()
    const password=document.querySelector('#zaiaNewPassword')?.value||''
    const confirm=document.querySelector('#zaiaConfirmPassword')?.value||''
    const errorBox=document.querySelector('#zaiaResetError')
    const submit=e.currentTarget.querySelector('button[type="submit"]')
    errorBox.textContent=''
    if(password.length<8){errorBox.textContent='Use uma senha com pelo menos 8 caracteres.';return}
    if(password!==confirm){errorBox.textContent='As senhas não coincidem.';return}
    submit.disabled=true;submit.textContent='Salvando...'
    try{
      const res=await fetch(`${baseUrl()}/auth/v1/user`,{
        method:'PUT',headers:{apikey:apiKey(),Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({password})
      })
      const data=await res.json().catch(()=>({}))
      if(!res.ok)throw new Error(data?.msg||data?.message||'Não foi possível alterar a senha.')
      localStorage.removeItem(SESSION_KEY)
      e.currentTarget.innerHTML='<div class="zaia-reset-success"><strong>Senha alterada com sucesso.</strong><br>Você será direcionado para entrar novamente na ZAIA.</div>'
      history.replaceState({},'',location.pathname+location.search)
      setTimeout(()=>location.replace(location.pathname),1300)
    }catch(err){errorBox.textContent=String(err?.message||err);submit.disabled=false;submit.textContent='Salvar nova senha'}
  })
}

function escapeHtml(v=''){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}

css()
const recovery=new URLSearchParams(location.hash.replace(/^#/,'')).get('type')==='recovery'
if(recovery)recoveryPage()
else{
  enhanceLogin()
  const app=document.querySelector('#app')
  if(app)new MutationObserver(()=>queueMicrotask(enhanceLogin)).observe(app,{childList:true,subtree:true})
}
