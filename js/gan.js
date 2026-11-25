// The רכזת admin page (gan.html#g=<ganId>&k=<key>). The gan itself is opened on the main page; no hash -> back there.
(function () {
  var $ = UI.$, show = UI.show;
  var base = location.href.split('#')[0].replace(/gan\.html(\?.*)?$/, '');
  var staffUrl = base;

  function section(id) { ['s-admin', 's-bad'].forEach(function (s) { show('#' + s, s === id); }); window.scrollTo(0, 0); }
  function staffMsg(name) {
    return 'צוות ' + name + ' יקר 🕎 צהר הלב מזמינה לכל אחת מכן משחק חדש לגן, 6 עד 7 משחקים חדשים לכל גן! ' +
      'היכנסי, בחרי את העיר ואת הגן, ובחרי משחק אחד (' + window.CONFIG.DEADLINE_TEXT + '). המדריכה שלך תשמח לעזור בבחירה: ' + staffUrl;
  }

  // In-page yes/no box. 25.11: window.confirm() is silently blocked (returns false) in some in-app and filtered
  // phone browsers, so the close button "did nothing" for a רכזת with a 7/7 gan.
  function askBox(q, yes) {
    return new Promise(function (resolve) {
      $('#askQ').textContent = q;
      $('#askYes').textContent = yes || 'כן';
      show('#ask', true);
      function end(v) { show('#ask', false); $('#askYes').onclick = $('#askNo').onclick = null; resolve(v); }
      $('#askYes').onclick = function () { end(true); };
      $('#askNo').onclick = function () { end(false); };
      $('#askYes').focus();
    });
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
      return '<tr><td>' + UI.esc(c.first + ' ' + c.last) + (c.by === 'רכזת' || c.by === 'גננת' ? ' <span class="small muted">(בחרת בשמה)</span>' : '') + '</td><td>' +
        UI.esc(c.role) + '</td><td>' + UI.esc(c.itemName) + '</td><td>' +
        (r.closed ? '' : '<button class="del" data-id="' + UI.esc(c.id) + '" type="button">מחיקה</button>') + '</td></tr>';
    }).join('');
    $('#aRows').innerHTML = rows;
    show('#aEmpty', !r.choices.length);
    $('#onBehalf').href = 'index.html' + (API.MOCK ? location.search : '') + '#g=' + encodeURIComponent(g) + '&k=' + encodeURIComponent(k);
    show('#onBehalf', !r.closed);
    $('#openAnother').href = staffUrl + (API.MOCK ? location.search : '');
    $('#waStaff2').href = 'https://wa.me/?text=' + encodeURIComponent(staffMsg(r.name));
    $('#mailStaff2').href = 'mailto:?subject=' + encodeURIComponent('משחק חדש לגן מצהר הלב 🕎 ' + r.name) + '&body=' + encodeURIComponent(staffMsg(r.name));
    $('#closeTitle').textContent = r.closed ? 'הסל סגור' : 'סגירת הסל';
    $('#closeText').textContent = r.closed ? 'צריך לתקן משהו? אפשר לפתוח את הסל מחדש עד שמרים מזמינה.' :
      'כשכל הצוות בחר (או כשמגיע מועד הסגירה), סגרי את הסל. אחרי הסגירה אי אפשר להחליף, ומרים מזמינה את המשחקים.';
    $('#closeBtn').textContent = r.closed ? 'פתיחת הסל מחדש' : 'סגירת הסל של הגן';
    $('#aRows').querySelectorAll('.del').forEach(function (b) {
      b.addEventListener('click', async function () {
        if (!(await askBox('למחוק את הבחירה הזו? העובדת תוכל לבחור שוב.', 'כן, למחוק'))) return;
        b.disabled = true;
        var x = await API.call('removeChoice', { ganId: g, key: k, choiceId: b.dataset.id });
        b.disabled = false;
        if (!x.ok) $('#aErr').textContent = x.msg; else loadAdmin(g, k);
      });
    });
    section('s-admin');
  }

  $('#closeBtn').addEventListener('click', async function () {
    if (!A) return;
    var closing = !A.d.closed, btn = $('#closeBtn');
    $('#aErr').textContent = '';
    if (closing) {
      var missing = A.d.staff - A.d.chosen;
      var q = missing > 0 ? 'עוד ' + missing + ' בצוות לא בחרו. לסגור בכל זאת?' : 'לסגור את הסל? אחרי הסגירה אי אפשר להחליף.';
      if (!(await askBox(q, 'כן, לסגור את הסל'))) return;
    }
    btn.disabled = true;
    btn.textContent = closing ? 'סוגרת את הסל...' : 'פותחת מחדש...';
    var r = await API.call(closing ? 'closeGan' : 'reopenGan', { ganId: A.g, key: A.k });
    btn.disabled = false;
    if (!r.ok) {
      btn.textContent = closing ? 'סגירת הסל של הגן' : 'פתיחת הסל מחדש';
      $('#aErr').textContent = r.msg;
      return;
    }
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
