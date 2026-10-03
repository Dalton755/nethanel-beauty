const CACHE='zaia-v28';
const ASSETS=['/','/index.html','/styles.css','/pro-plans.css','/admin-production.css','/app.js','/admin.js','/admin-production.js','/pro-plans.js','/production-guard.js','/auth-recovery.js','/customer-privacy.js','/customer-help.js','/merchant-help.js','/client.js','/cloud.js','/config.js','/manifest.webmanifest','/icon.svg','/zaia-logo.svg'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS))));
self.addEventListener('activate',e=>e.waitUntil(Promise.all([
  caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('zaia-v')&&k!==CACHE).map(k=>caches.delete(k)))),
  self.clients.claim()
])));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  const url=new URL(e.request.url);
  if(url.hostname.endsWith('.supabase.co') || url.hostname.includes('unpkg.com') || url.hostname.includes('openstreetmap.org')) return;
  e.respondWith(fetch(e.request).then(r=>{const clone=r.clone();caches.open(CACHE).then(c=>c.put(e.request,clone));return r;}).catch(()=>caches.match(e.request).then(r=>r||caches.match('/index.html'))));
});
self.addEventListener('notificationclick',e=>{
  e.notification.close();
  const target=e.notification?.data?.url||'/loja';
  e.waitUntil(
    clients.matchAll({type:'window',includeUncontrolled:true}).then(async list=>{
      for(const client of list){
        try{
          const url=new URL(client.url);
          if(url.origin===self.location.origin){
            await client.focus();
            if('navigate' in client) await client.navigate(target);
            return client;
          }
        }catch{}
      }
      return clients.openWindow(target);
    })
  );
});

self.addEventListener('push',event=>{
  let data={};
  try{data=event.data?event.data.json():{}}catch{data={body:event.data?.text?.()||''}}
  const title=data.title||'ZAIA';
  const options={
    body:data.body||'Você tem uma nova atualização.',
    icon:'/icon.svg',
    badge:'/icon.svg',
    data:{url:data.url||'/cliente?tab=agenda',type:data.type||'ZAIA'},
    tag:data.notification_id||data.type||'zaia-notification',
    renotify:true,
  };
  event.waitUntil(self.registration.showNotification(title,options));
});
