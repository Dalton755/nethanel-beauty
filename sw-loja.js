const CACHE='zaia-loja-v21';
const ASSETS=['/loja','/styles.css','/pro-plans.css','/operational.css','/professional-services-fix.css','/rating.css?v=20261004-mobile2','/merchant-premium-ui.css?v=20261004-mobile2','/merchant-mobile-fixes.css?v=20261004-mobile2','/merchant-booking-modal.css?v=20261004-mobile2','/app.js?v=20261004-global3','/finance-integrity.js?v=20261004-finance1','/global-customer.js?v=20261004-global3','/merchant-appointment-customer.js?v=20261004-appt1','/merchant-customer-invite.js?v=20261004-global3','/merchant-login-brand-guard.js?v=20261004-logout2','/merchant-logout-fix.js?v=20261004-logout2','/merchant-access-settings.js?v=20261003-access1','/operational-engine.js','/business-rating.js?v=20261004-mobile2','/merchant-premium-ui.js?v=20261004-mobile2','/merchant-booking-modal.js?v=20261004-mobile2','/promotion-experience.js?v=20261003-promo1','/pro-plans.js','/merchant-help.js','/production-guard.js','/auth-recovery.js','/merchant-shell.js','/session-scope.js?v=20261004-logout2','/cloud.js','/config.js','/manifest-loja.webmanifest','/icon.svg','/zaia-logo.svg'];
self.addEventListener('install',e=>e.waitUntil(Promise.all([caches.open(CACHE).then(c=>c.addAll(ASSETS)),self.skipWaiting()])));
self.addEventListener('activate',e=>e.waitUntil(Promise.all([
  caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('zaia-loja-')&&k!==CACHE).map(k=>caches.delete(k)))),
  self.clients.claim()
])));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  const url=new URL(e.request.url);
  if(url.hostname.endsWith('.supabase.co')||url.hostname.includes('unpkg.com')||url.hostname.includes('openstreetmap.org')) return;
  e.respondWith(fetch(e.request).then(r=>{const clone=r.clone();caches.open(CACHE).then(c=>c.put(e.request,clone));return r;}).catch(()=>caches.match(e.request).then(r=>r||caches.match('/loja'))));
});
self.addEventListener('notificationclick',e=>{
  e.notification.close();
  const target=e.notification?.data?.url||'/loja?page=agenda';
  const normalized=target.startsWith('/?')?'/loja'+target.slice(1):target==='/'?'/loja':target;
  e.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(async list=>{
    for(const client of list){
      try{const u=new URL(client.url);if(u.origin===self.location.origin&&u.pathname.startsWith('/loja')){await client.focus();if('navigate' in client)await client.navigate(normalized);return client}}catch{}
    }
    return clients.openWindow(normalized);
  }));
});
self.addEventListener('push',event=>{
  let data={};
  try{data=event.data?event.data.json():{}}catch{data={body:event.data?.text?.()||''}}
  const rawUrl=data.url||'/loja?page=agenda';
  const url=rawUrl.startsWith('/?')?'/loja'+rawUrl.slice(1):rawUrl==='/'?'/loja':rawUrl;
  event.waitUntil(self.registration.showNotification(data.title||'ZAIA Negócios',{
    body:data.body||'Você tem uma nova atualização.',icon:'/icon.svg',badge:'/icon.svg',
    data:{url,type:data.type||'ZAIA_BUSINESS'},tag:data.notification_id||data.type||'zaia-business-notification',renotify:true
  }));
});
