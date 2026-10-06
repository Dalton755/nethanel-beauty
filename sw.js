const CACHE='zaia-v30';
const ASSETS=['/','/index.html','/styles.css','/pro-plans.css','/admin-production.css','/app.js','/admin.js','/admin-production.js','/pro-plans.js','/production-guard.js','/auth-recovery.js','/customer-privacy.js','/customer-help.js','/merchant-help.js','/merchant-pwa-install.js','/client.js','/cloud.js','/config.js','/manifest.webmanifest','/icon.svg','/zaia-logo.svg'];

const safeNotificationIcon=data=>{
  const raw=String(data?.icon||data?.brand_logo_url||'').trim();
  if(!raw)return '/icon.svg';
  try{
    const url=new URL(raw,self.location.origin);
    if(url.protocol==='https:'||url.origin===self.location.origin)return url.href;
  }catch{}
  return '/icon.svg';
};

const cleanManifestText=(value,fallback,max=80)=>{
  const text=String(value||fallback||'').replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim();
  return (text||fallback||'ZAIA').slice(0,max);
};
const cleanManifestColor=(value,fallback)=>/^#[0-9a-f]{6}$/i.test(String(value||''))?String(value):fallback;
const safeManifestIcon=(value)=>{
  const raw=String(value||'').trim();
  if(!raw)return '/icon.svg';
  try{
    const url=new URL(raw,self.location.origin);
    if(url.protocol==='https:'||url.origin===self.location.origin)return url.href;
  }catch{}
  return '/icon.svg';
};
const merchantManifestResponse=url=>{
  const est=cleanManifestText(url.searchParams.get('est'),'loja',80).replace(/[^a-zA-Z0-9_-]/g,'').slice(0,64)||'loja';
  const name=cleanManifestText(url.searchParams.get('name'),'ZAIA Negócios',80);
  const shortName=cleanManifestText(name,'ZAIA',24);
  const logo=safeManifestIcon(url.searchParams.get('logo'));
  const primary=cleanManifestColor(url.searchParams.get('primary'),'#351523');
  const background=cleanManifestColor(url.searchParams.get('secondary'),'#f7f1ed');
  const manifest={
    id:`/loja?app=${encodeURIComponent(est)}`,
    name,
    short_name:shortName,
    start_url:`/loja?app=${encodeURIComponent(est)}&source=pwa`,
    scope:'/loja',
    display:'standalone',
    background_color:background,
    theme_color:primary,
    description:`Aplicativo de ${name}, powered by ZAIA.`,
    categories:['business','beauty'],
    icons:[
      {src:logo,sizes:'192x192',purpose:'any maskable'},
      {src:logo,sizes:'512x512',purpose:'any maskable'},
      {src:'/icon.svg',sizes:'512x512',type:'image/svg+xml',purpose:'any maskable'},
    ],
  };
  return new Response(JSON.stringify(manifest),{
    headers:{'Content-Type':'application/manifest+json; charset=utf-8','Cache-Control':'no-store'},
  });
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
  if(url.origin===self.location.origin&&url.pathname==='/manifest-loja-personalizado.webmanifest'){
    e.respondWith(Promise.resolve(merchantManifestResponse(url)));
    return;
  }
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
  event.waitUntil(self.registration.showNotification(title,options));
});
