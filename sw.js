// Fator K - ETE Suzano: cache do app para abrir mesmo sem internet.
// Estratégia: rede primeiro (atualizações chegam na hora); sem rede, usa a cópia guardada.
const CACHE = 'fatork-v2';
self.addEventListener('install', function(e){
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function(c){
    return c.addAll(['./', './index.html', './manifest.webmanifest', './icone-192.png', './icone-512.png']);
  }));
});
self.addEventListener('activate', function(e){
  e.waitUntil(caches.keys().then(function(ks){
    return Promise.all(ks.filter(function(k){ return k !== CACHE; }).map(function(k){ return caches.delete(k); }));
  }).then(function(){ return self.clients.claim(); }));
});
self.addEventListener('fetch', function(e){
  if(e.request.method !== 'GET') return;
  const u = new URL(e.request.url);
  if(u.origin !== location.origin) return; // Supabase, mapas e fontes seguem direto pela rede
  e.respondWith(
    fetch(e.request).then(function(r){
      // só guarda respostas boas: uma página de erro do servidor nunca substitui a cópia que funciona
      if(r.ok){
        const copia = r.clone();
        e.waitUntil(caches.open(CACHE).then(function(c){ return c.put(e.request, copia); }));
      }
      return r;
    }).catch(function(){
      return caches.match(e.request, {ignoreSearch:true}).then(function(m){
        if(m) return m;
        // só uma NAVEGAÇÃO (abrir página) cai para o app; e nunca entrega o app no lugar do painel
        if(e.request.mode === 'navigate' && u.pathname.indexOf('painel') === -1){
          return caches.match('./index.html').then(function(pg){ return pg || Response.error(); });
        }
        return Response.error();
      });
    })
  );
});
