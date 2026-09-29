const CACHE='zaia-v15';
const ASSETS=['/','/index.html','/styles.css','/app.js','/client.js','/cloud.js','/config.js','/manifest.webmanifest','/icon.svg','/zaia-logo.svg'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS))));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  const url=new URL(e.request.url);
  if(url.hostname.endsWith('.supabase.co') || url.hostname.includes('unpkg.com') || url.hostname.includes('openstreetmap.org')) return;
  e.respondWith(fetch(e.request).then(r=>{const clone=r.clone();caches.open(CACHE).then(c=>c.put(e.request,clone));return r;}).catch(()=>caches.match(e.request).then(r=>r||caches.match('/index.html'))));
});
self.addEventListener('notificationclick',e=>{e.notification.close();e.waitUntil(clients.matchAll({type:'window'}).then(list=>list[0]?.focus()||clients.openWindow('/')))});

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
