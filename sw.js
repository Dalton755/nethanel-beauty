const CACHE='zaia-v29';
const ASSETS=['/','/index.html','/styles.css','/pro-plans.css','/admin-production.css','/app.js','/admin.js','/admin-production.js','/pro-plans.js','/production-guard.js','/auth-recovery.js','/customer-privacy.js','/customer-help.js','/merchant-help.js','/client.js','/cloud.js','/config.js','/manifest.webmanifest','/icon.svg','/zaia-logo.svg'];

const safeNotificationIcon=data=>{
  const raw=String(data?.icon||data?.brand_logo_url||'').trim();
  if(!raw)return '/icon.svg';
  try{
    const url=new URL(raw,self.location.origin);
    if(url.protocol==='https:'||url.origin===self.location.origin)return url.href;
  }catch{}
  return '/icon.svg';
};

const normalizeNotificationTarget=data=>{
  const raw=String(data?.url||'/cliente?tab=agenda');
  const type=String(data?.type||'');
  if(raw.startsWith('/?page=')||raw.startsWith('/?tab=')){
    const business=/BOOKING|BUSINESS|STOCK|APPOINTMENT_START|NO_SHOW/i.test(type);
    return business?`/loja${raw.slice(1)}`:`/cliente${raw.slice(1)}`;
  }
  return raw==='/'?'/loja':raw;
};

self.addEventListener('install',e=>e.waitUntil(Promise.all([
  caches.open(CACHE).then(c=>c.addAll(ASSETS)),
  self.skipWaiting(),
])));

self.addEventListener('activate',e=>e.waitUntil(Promise.all([
  caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('zaia-v')&&k!==CACHE).map(k=>caches.delete(k)))),
  self.clients.claim(),
])));

self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const url=new URL(e.request.url);
  if(url.hostname.endsWith('.supabase.co')||url.hostname.includes('unpkg.com')||url.hostname.includes('openstreetmap.org'))return;
  e.respondWith(fetch(e.request).then(r=>{
    const clone=r.clone();
    caches.open(CACHE).then(c=>c.put(e.request,clone));
    return r;
  }).catch(()=>caches.match(e.request).then(r=>r||caches.match('/index.html'))));
});

self.addEventListener('notificationclick',e=>{
  e.notification.close();
  const target=normalizeNotificationTarget(e.notification?.data||{});
  e.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(async list=>{
    for(const client of list){
      try{
        const url=new URL(client.url);
        if(url.origin===self.location.origin){
          await client.focus();
          if('navigate' in client)await client.navigate(target);
          return client;
        }
      }catch{}
    }
    return clients.openWindow(target);
  }));
});

self.addEventListener('push',event=>{
  let data={};
  try{data=event.data?event.data.json():{}}catch{data={body:event.data?.text?.()||''}};
  const title=data.title||data.brand_name||'ZAIA';
  const options={
    body:data.body||'Você tem uma nova atualização.',
    icon:safeNotificationIcon(data),
    data:{
      url:normalizeNotificationTarget(data),
      type:data.type||'ZAIA',
      brand_name:data.brand_name||'',
    },
    tag:data.notification_id||data.type||'zaia-notification',
    renotify:true,
    timestamp:Date.now(),
  };
  // Não definimos `badge` aqui. No Android/Chrome um SVG colorido usado como badge
  // pode virar um quadrado cinza. O ícone visual da notificação fica em `icon`,
  // que agora aceita a logo personalizada enviada pelo backend.
  event.waitUntil(self.registration.showNotification(title,options));
});
