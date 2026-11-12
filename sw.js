var C="taut-20261112-140159";
var SHELL=["./","index.html","manifest.webmanifest","icon-192.png","icon-512.png","apple-touch-icon.png","fonts/archivo.woff2"];
self.addEventListener("install",function(e){
  self.skipWaiting();
  e.waitUntil(caches.open(C).then(function(c){return c.addAll(SHELL);}).catch(function(){}));
});
self.addEventListener("activate",function(e){
  e.waitUntil(caches.keys().then(function(ks){
    // 分離の部品（約33MB）は版が変わっても捨てない。捨てると更新のたびに取り直しになる
    return Promise.all(ks.map(function(k){if(k!==C&&k.indexOf("taut-sep-")!==0)return caches.delete(k);}));
  }).then(function(){return self.clients.claim();}));
});
self.addEventListener("fetch",function(e){
  var r=e.request;
  if(r.method!=="GET") return;
  var u=new URL(r.url);
  // 書体はオフラインでも同じ見た目になるよう、取れたものを保存して以後はそれを使う
  if(u.host==="fonts.googleapis.com"||u.host==="fonts.gstatic.com"){
    e.respondWith(caches.match(r).then(function(m){
      return m||fetch(r).then(function(res){
        var cp=res.clone();
        caches.open(C).then(function(c){c.put(r,cp);}).catch(function(){});
        return res;
      }).catch(function(){return m;});
    }));
    return;
  }
  if(u.origin!==location.origin) return;
  // 分離の大きい部品は、ページ側が専用の入れ物に残す。ここでも控えると二重に場所を食う
  if(u.pathname.indexOf("/sep/")>=0&&/\.(onnx|wasm)$/.test(u.pathname)) return;
  if(u.pathname.indexOf("version.json")>=0){
    e.respondWith(fetch(r,{cache:"no-store"}).catch(function(){return caches.match(r);}));
    return;
  }
  e.respondWith(
    fetch(r).then(function(res){
      // 失敗の応答（404など）で、手元の正常な控えを上書きしない
      if(res&&res.ok){
        var cp=res.clone();
        caches.open(C).then(function(c){c.put(r,cp);}).catch(function(){});
      }
      return res;
    }).catch(function(){
      return caches.match(r).then(function(m){return m||caches.match("index.html");});
    })
  );
});
