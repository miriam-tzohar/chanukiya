// Gannenet admin page (gan.html#g=<ganId>&k=<key>). The gan itself is opened on the main page; no hash -> back there.
(function () {
  var $ = UI.$, show = UI.show;
  var base = location.href.split('#')[0].replace(/gan\.html(\?.*)?$/, '');
  var staffUrl = base;

  function section(id) { ['s-admin', 's-bad'].forEach(function (s) { show('#' + s, s === id); }); window.scrollTo(0, 0); }
  function staffMsg(name) {
    return 'צוות ' + name + ' יקר 🕎 צהר הלב מזמינה לכל אחת מאיתנו משחק חדש לגן, עד 70 ש"ח! ' +
      'היכנסי, בחרי את העיר ואת הגן שלנו, ובחרי משחק אחד (' + window.CONFIG.DEADLINE_TEXT + '): ' + staffUrl;
  }

  var A = null;
  async function loadAdmin(g, k) {
    var r = await API.call('ganAdmin', { ganId: g, key: k });
    if (!r.ok) { section('s-bad'); return; }
    A = { g: g, k: k, d: r };
    $('#aTitle').textContent = r.name;
    $('#aSub').textContent = r.city + ' · ' + r.address;
    $('#aChan').innerHTML = UI.chanukiah(UI.litFor(r.chosen, r.staff));
    $('#aProg').innerHTML = r.chosen >= r.staff ? 'כל הצוות בחר! <b>החנוכייה דולקת</b>' :
      '<b>' + r.chosen + '</b> מתוך <b>' + r.staff + '</b> בצוות בחרו';
    $('#aState').textContent = r.closed ? 'הסל סגור. מרים מקבלת את הרשימה ומזמינה.' :
      'הסל פתוח. העובדות נכנסות בקישור הכללי ובוחרות את ' + r.name + '.';
    var rows = r.choices.map(function (c) {
      return '<tr><td>' + UI.esc(c.first + ' ' + c.last) + (c.by === 'גננת' ? ' <span class="small muted">(בחרת בשמה)</span>' : '') + '</td><td>' +
        UI.esc(c.role) + '</td><td>' + UI.esc(c.itemName) + '</td><td>' + UI.money(c.price) + '</td><td>' +
        (r.closed ? '' : '<button class="del" data-id="' + UI.esc(c.id) + '" type="button">מחיקה</button>') + '</td></tr>';
    }).join('');
    $('#aRows').innerHTML = rows;
    show('#aEmpty', !r.choices.length);
    $('#onBehalf').href = 'index.html' + (API.MOCK ? location.search : '') + '#g=' + encodeURIComponent(g) + '&k=' + encodeURIComponent(k);
    show('#onBehalf', !r.closed);
    $('#closeTitle').textContent = r.closed ? 'הסל סגור' : 'סגירת הסל';
    $('#closeText').textContent = r.closed ? 'צריך לתקן משהו? אפשר לפתוח את הסל מחדש עד שמרים מזמינה.' :
      'כשכל הצוות בחר (או כשמגיע מועד הסגירה), סגרי את הסל. אחרי הסגירה אי אפשר להחליף, ומרים מזמינה את המשחקים.';
    $('#closeBtn').textContent = r.closed ? 'פתיחת הסל מחדש' : 'סגירת הסל של הגן';
    $('#aRows').querySelectorAll('.del').forEach(function (b) {
      b.addEventListener('click', async function () {
        if (!confirm('למחוק את הבחירה הזו? העובדת תוכל לבחור שוב.')) return;
        var x = await API.call('removeChoice', { ganId: g, key: k, choiceId: b.dataset.id });
        if (!x.ok) $('#aErr').textContent = x.msg; else loadAdmin(g, k);
      });
    });
    section('s-admin');
  }

  $('#closeBtn').addEventListener('click', async function () {
    if (!A) return;
    var closing = !A.d.closed;
    if (closing) {
      var missing = A.d.staff - A.d.chosen;
      var q = missing > 0 ? 'עוד ' + missing + ' בצוות לא בחרו. לסגור בכל זאת?' : 'לסגור את הסל? אחרי הסגירה אי אפשר להחליף.';
      if (!confirm(q)) return;
    }
    var r = await API.call(closing ? 'closeGan' : 'reopenGan', { ganId: A.g, key: A.k });
    if (!r.ok) { $('#aErr').textContent = r.msg; return; }
    if (closing) UI.confetti();
    loadAdmin(A.g, A.k);
  });
  $('#refresh').addEventListener('click', function () { if (A) loadAdmin(A.g, A.k); });
  $('#copyStaff2').addEventListener('click', function (e) { if (A) UI.copyText(staffMsg(A.d.name), e.target); });

  function route() {
    var h = new URLSearchParams(location.hash.slice(1));
    if (h.get('g') && h.get('k')) loadAdmin(h.get('g'), h.get('k'));
    else location.replace(staffUrl + (API.MOCK ? location.search : ''));
  }
  window.addEventListener('hashchange', route);
  route();
})();
