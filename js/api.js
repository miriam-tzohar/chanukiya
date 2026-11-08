// Talks to the Apps Script backend, or to a local mock when CONFIG.API_URL is empty / ?mock=1.
(function () {
  var qs = new URLSearchParams(location.search);
  var MOCK = !window.CONFIG.API_URL || qs.has('mock');
  var READ = { listGans: 1, ganStatus: 1, settings: 1 };
  var catalogPromise = null;

  function loadCatalog() {
    if (!catalogPromise) {
      catalogPromise = fetch('catalog.json', { cache: 'no-cache' }).then(function (r) { return r.json(); });
    }
    return catalogPromise;
  }

  function mockDb() {
    try { return JSON.parse(localStorage.getItem('gift-mock-db')) || { gans: [], choices: [] }; }
    catch (e) { return window.__mockDb || (window.__mockDb = { gans: [], choices: [] }); }
  }
  function saveMock(db) {
    try { localStorage.setItem('gift-mock-db', JSON.stringify(db)); } catch (e) { window.__mockDb = db; }
  }

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function nowText() {
    var d = new Date();
    return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear() + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
  }

  async function mockCall(a, p) {
    var cat = await loadCatalog();
    var map = {};
    cat.items.forEach(function (i) { map[i.id] = i; });
    var db = mockDb();
    var out = Logic.handle(db, a, p || {}, {
      now: nowText(), rand: Math.random, settings: { open: true, deadline: window.CONFIG.DEADLINE_TEXT },
      lookup: function (id) { return map[id] || null; }
    });
    if (out.ops.length) { Logic.applyOps(db, out.ops); saveMock(db); }
    await new Promise(function (r) { setTimeout(r, 250); });
    return JSON.parse(JSON.stringify(out.res));
  }

  async function call(a, p) {
    if (MOCK) return mockCall(a, p);
    try {
      var r;
      if (READ[a]) {
        r = await fetch(window.CONFIG.API_URL + '?a=' + encodeURIComponent(a) + '&p=' + encodeURIComponent(JSON.stringify(p || {})));
      } else {
        r = await fetch(window.CONFIG.API_URL, {
          method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ a: a, p: p || {} })
        });
      }
      return await r.json();
    } catch (e) {
      return { ok: false, code: 'net', msg: 'אין חיבור לשרת. בדקי את האינטרנט ונסי שוב.' };
    }
  }

  window.API = { call: call, loadCatalog: loadCatalog, MOCK: MOCK };

  document.addEventListener('DOMContentLoaded', function () {
    if (MOCK) {
      var b = document.createElement('div');
      b.className = 'mock-banner';
      b.textContent = 'מצב בדיקה: הנתונים נשמרים רק בדפדפן הזה';
      document.body.prepend(b);
    }
  });
})();
