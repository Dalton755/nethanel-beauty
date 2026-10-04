const CACHE='zaia-cliente-v14';
const ASSETS=['/cliente','/styles.css','/map-enhancement.css','/operational.css','/rating.css?v=20261004-session1','/client-premium-ui.css?v=20261004-session1','/promotion-experience.css?v=20261003-promo1','/customer-assistant.css?v=20261003-assistant3','/client.js?v=20261004-claim2','/customer-claim.js?v=20261004-claim2','/customer-session-isolation.js?v=20261004-session1','/customer-assistant-stability.js?v=20261003-assistant3','/customer-arrival.js?v=20261004-session1','/customer-rating.js?v=20261004-session1','/client-premium-ui.js?v=20261004-session1','/promotion-experience.js?v=20261003-promo1','/customer-assistant.js?v=20261003-assistant3','/customer-access-info.js?v=20261004-session1','/customer-accessibility-filter.js?v=20261004-session1','/map-enhancement.js?v=20261004-session1','/customer-privacy.js','/customer-help.js','/production-guard.js','/auth-recovery.js','/client-shell.js','/session-scope.js?v=20261004-session1','/cloud.js','/config.js','/manifest-cliente.webmanifest','/icon.svg','/zaia-logo.svg'];
self.addEventListener('install',e=>e.waitUntil(Promise.all([caches.open(CACHE).then(c=>c.addAll(ASSETS)),self.skipWaiting()])));
self.addEventListener('activate',e=>e.waitUntil(Promise.all([
  caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('zaia-cliente-')&&k!==CACHE).map(k=>caches.delete(k)))),
  self.clients.claim()
])));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  const url=new URL(e.request.url);
  if(url.hostname.endsWith('.supabase.co')||url.hostname.includes('unpkg.com')||url.hostname.includes('openstreetmap.org')) return;
  e.respondWith(fetch(e.request).then(r=>{const clone=r.clone();caches.open(CACHE).then(c=>c.put(e.request,clone));return r;}).catch(()=>caches.match(e.request).then(r=>r||caches.match('/cliente'))));
});
self.addEventListener('notificationclick',e=>{
  e.notification.close();
  const target=e.notification?.data?.url||'/cliente?tab=agenda';
  e.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(async list=>{
    for(const client of list){
      try{const u=new URL(client.url);if(u.origin===self.location.origin&&u.pathname.startsWith('/cliente')){await client.focus();if('navigate' in client)await client.navigate(target);return client}}catch{}
    }
    return clients.openWindow(target);
  }));
});
self.addEventListener('push',event=>{
  let data={};
  try{data=event.data?event.data.json():{}}catch{data={body:event.data?.text?.()||''}}
  event.waitUntil(self.registration.showNotification(data.title||'ZAIA',{
    body:data.body||'Você tem uma nova atualização.',icon:'/icon.svg',badge:'/icon.svg',
    data:{url:data.url||'/cliente?tab=agenda',type:data.type||'ZAIA_CUSTOMER'},tag:data.notification_id||data.type||'zaia-customer-notification',renotify:true
  }));
});
