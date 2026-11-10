// The one link for everyone: identify -> pick gan (the gannenet opens it here first) -> pick one game -> light a candle.
// Teacher mode: index.html#g=<ganId>&k=<key> lets the gannenet choose on behalf of a staff member.
(function () {
  var $ = UI.$, show = UI.show, C = window.CONFIG;
  var hash = new URLSearchParams(location.hash.slice(1));
  var teacher = hash.get('g') && hash.get('k') ? { ganId: hash.get('g'), key: hash.get('k') } : null;
  var S = { me: null, gan: null, status: null, catalog: null, cat: null, gans: null, pick: null, myItem: '' };
  var SITE = location.href.split('#')[0].split('?')[0].replace(/index\.html$/, '');

  function section(id) {
    ['s-hero', 's-id', 's-cat', 's-done'].forEach(function (s) { show('#' + s, s === id); });
    window.scrollTo(0, 0);
  }
  function setErr(el, msg) { $(el).textContent = msg || ''; }
  function store(k, v) { try { if (v === undefined) return JSON.parse(localStorage.getItem(k)); localStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; } }

  // hero
  $('#mission').textContent = C.MISSION;
  $('#deadline').textContent = 'הבחירה פתוחה ' + C.DEADLINE_TEXT;
  var heroLit = 0;
  function heroDraw() { $('#heroChan').innerHTML = UI.chanukiah(heroLit, { newIndex: heroLit - 1, label: 'חנוכייה נדלקת' }); }
  heroDraw();
  var heroTimer = setInterval(function () { heroLit = heroLit >= 8 ? 0 : heroLit + 1; heroDraw(); }, 900);

  // form options
  var f = $('#idForm');
  f.role.innerHTML = '<option value="">בחרי תפקיד</option>' + C.ROLES.map(function (r) { return '<option>' + UI.esc(r) + '</option>'; }).join('');
  f.city.innerHTML = '<option value="">בחרי עיר</option>' + Logic.CITIES.map(function (c) { return '<option>' + UI.esc(c) + '</option>'; }).join('');

  var saved = store('gift-me');
  if (saved && !teacher) {
    f.first.value = saved.first || ''; f.last.value = saved.last || ''; f.role.value = saved.role || '';
    if (saved.city) f.city.value = saved.city;
  }

  // One link for everyone: the gannenet opens her gan from this same form (gan list option NEW), the staff pick it.
  var NEW = '__new';
  function isGannenet() { return f.role.value === 'גננת'; }

  async function loadGans(selectId) {
    var city = f.city.value;
    f.gan.disabled = true;
    $('#ganHint').textContent = '';
    if (!city) { f.gan.innerHTML = '<option value="">קודם בוחרים עיר</option>'; toggleNew(); return; }
    f.gan.innerHTML = '<option value="">טוען גנים...</option>';
    if (!S.gans) {
      var r = await API.call('listGans', {});
      if (!r.ok) { $('#ganHint').textContent = r.msg; return; }
      S.gans = r.gans;
    }
    renderGans(selectId);
  }

  function renderGans(selectId) {
    var city = f.city.value, prev = selectId === undefined ? f.gan.value : selectId;
    var list = (S.gans || []).filter(function (g) { return g.city === city; });
    var canOpen = isGannenet();
    if (!list.length && !canOpen) {
      f.gan.innerHTML = '<option value="">אין עדיין גנים פתוחים בעיר הזו</option>';
      f.gan.disabled = true;
    } else {
      f.gan.innerHTML = '<option value="">בחרי את הגן שלך</option>' + list.map(function (g) {
        return '<option value="' + UI.esc(g.id) + '"' + (g.closed ? ' disabled' : '') + '>' + UI.esc(g.name) + (g.closed ? ' (הסל נסגר)' : '') + '</option>';
      }).join('') + (canOpen ? '<option value="' + NEW + '">פתיחת גן חדש (אני הגננת)</option>' : '');
      f.gan.disabled = false;
      if (prev) f.gan.value = prev;
      if (!f.gan.value && canOpen && !list.length) f.gan.value = NEW;
    }
    toggleNew();
  }

  function toggleNew() {
    var opening = !f.gan.disabled && f.gan.value === NEW;
    show('#newGan', opening);
    $('#idSubmit').textContent = opening ? 'פתיחת הגן ובחירת משחק' : 'לקטלוג המשחקים';
    $('#ganHint').textContent = f.city.value && S.gans ? okHint(opening) : '';
  }
  function okHint(opening) {
    var hasGans = (S.gans || []).some(function (g) { return g.city === f.city.value; });
    if (opening) return 'מלאי את פרטי הגן. אחר כך תבחרי משחק, והצוות שלך יוכל לבחור את הגן מהרשימה.';
    if (isGannenet()) return 'הגן שלך כבר ברשימה? בחרי אותו. אם לא, בחרי "פתיחת גן חדש".';
    if (!hasGans) return 'הגננת שלך עוד לא פתחה את הגן. נסי שוב מחר, או בקשי מהגננת לפתוח אותו.';
    // מדריכות guide several gans: each one picks one of them, and the game goes there.
    if (f.role.value === 'מדריכה') return 'מדריכה? בחרי אחד מהגנים שאת מדריכה בהם, והמשחק יגיע לגן הזה.';
    return 'לא רואה את הגן שלך? כנראה שהגננת עוד לא פתחה אותו.';
  }
  f.city.addEventListener('change', function () { loadGans(''); });
  f.gan.addEventListener('change', toggleNew);
  f.role.addEventListener('change', function () { if (S.gans && f.city.value) renderGans(); else toggleNew(); });

  // The gannenet's private admin links, per gan, kept on her device.
  function adminLinks() { var m = store('gift-admin'); return m && typeof m === 'object' ? m : {}; }
  function adminUrl(g, k) { return SITE + 'gan.html' + (API.MOCK ? location.search : '') + '#g=' + encodeURIComponent(g) + '&k=' + encodeURIComponent(k); }

  if (teacher) {
    show('#teacherBanner', true);
    show('#ganPick', false);
    $('#idTitle').textContent = 'פרטי העובדת שבשמה את בוחרת';
    $('#adminBack').href = adminUrl(teacher.ganId, teacher.key);
    show('#adminBack', true);
  }

  $('#start').addEventListener('click', function () {
    clearInterval(heroTimer);
    section('s-id');
    if (!teacher && f.city.value) loadGans(saved && saved.gan);
    f.first.focus();
  });
  if (teacher) $('#start').click();

  f.id4.addEventListener('input', function () { f.id4.value = f.id4.value.replace(/\D/g, '').slice(0, 4); });

  f.addEventListener('submit', async function (e) {
    e.preventDefault();
    setErr('#idErr', '');
    var me = { first: f.first.value.trim(), last: f.last.value.trim(), id4: f.id4.value.trim(), role: f.role.value };
    var ganId = teacher ? teacher.ganId : f.gan.value;
    if (Logic.norm(me.first).length < 2) return setErr('#idErr', 'חסר שם פרטי');
    if (Logic.norm(me.last).length < 2) return setErr('#idErr', 'חסר שם משפחה');
    if (!/^\d{4}$/.test(me.id4)) return setErr('#idErr', 'צריך בדיוק 4 ספרות אחרונות של תעודת הזהות');
    if (!me.role) return setErr('#idErr', 'בחרי תפקיד');
    if (!ganId) return setErr('#idErr', 'בחרי עיר ואת הגן שלך');
    var opening = !teacher && ganId === NEW, ng = null;
    if (opening) {
      ng = { name: f.gname.value.trim(), city: f.city.value, address: f.address.value.trim(), phone: f.phone.value.trim(),
             staff: f.staff.value, teacher: me.first + ' ' + me.last };
      if (Logic.norm(ng.name).length < 2) return setErr('#idErr', 'חסר שם הגן');
      if (ng.address.length < 4) return setErr('#idErr', 'חסרה כתובת הגן למשלוח המשחקים');
      if (ng.phone.replace(/\D/g, '').length < 9) return setErr('#idErr', 'חסר טלפון לתיאום משלוח');
    }
    $('#idSubmit').disabled = true;
    try {
      var mine = await API.call('myChoice', me);
      if (!mine.ok) return setErr('#idErr', mine.msg);
      if (mine.found && mine.ganId !== ganId) {
        return setErr('#idErr', 'כבר בחרת משחק ' + UI.toGan(mine.ganName) + ' (' + mine.itemName + '). כל אחת בוחרת פעם אחת.');
      }
      if (opening) {
        var reg = await API.call('registerGan', ng);
        if (!reg.ok) {
          if (reg.code === 'dup') {
            S.gans = null; await loadGans('');
            return setErr('#idErr', 'הגן "' + ng.name.replace(/\s+/g, ' ') + '" ב' + ng.city + ' כבר פתוח. בחרי אותו מהרשימה למעלה.');
          }
          return setErr('#idErr', reg.msg);
        }
        ganId = reg.ganId;
        var links = adminLinks(); links[ganId] = adminUrl(ganId, reg.key); store('gift-admin', links);
        S.gans = null; await loadGans(ganId);   // from now on the form points at the opened gan
      }
      var st = await API.call('ganStatus', { ganId: ganId });
      if (!st.ok) return setErr('#idErr', st.msg);
      S.me = me; S.status = st; S.myItem = mine.found ? mine.itemId : '';
      if (!teacher) store('gift-me', { first: me.first, last: me.last, role: me.role, city: f.city.value, gan: ganId });
      if (st.closed) {
        if (mine.found) return done(mine.itemName, false, true);
        return setErr('#idErr', 'הגננת כבר סגרה את הסל של הגן הזה. אם זו טעות, פני אליה.');
      }
      await openCatalog(mine.found ? 'כבר בחרת את "' + mine.itemName + '". אפשר להחליף למשחק אחר עד שהגננת סוגרת את הסל.' : '');
    } finally { $('#idSubmit').disabled = false; }
  });

  function drawBar() {
    var st = S.status;
    $('#barGan').textContent = st.name + ' · ' + st.city;
    $('#barProg').textContent = st.chosen + ' מתוך ' + st.staff + ' בצוות כבר בחרו';
    $('#barChan').innerHTML = UI.chanukiah(UI.litFor(st.chosen, st.staff));
  }

  async function openCatalog(note) {
    S.catalog = S.catalog || await API.loadCatalog();
    drawBar();
    $('#catNote').textContent = note || 'בחרי משחק אחד לגן, עד 70 ש"ח. משחק שכבר נבחר בגן שלך נעול, כדי שלא יהיו כפולים.';
    setErr('#catErr', '');
    section('s-cat');
    if (!S.cat) S.cat = UI.mountCatalog($('#catalog'), S.catalog, { taken: S.status.taken, mine: S.myItem, onPick: ask });
    else S.cat.update(S.status.taken, S.myItem);
  }
  $('#back').addEventListener('click', function () { section('s-id'); });

  // confirm modal
  function ask(it) {
    S.pick = it;
    var sup = S.catalog.suppliers[it.s] ? S.catalog.suppliers[it.s].name : it.s;
    $('#mImg').src = it.i || it.t;
    $('#mTitle').textContent = it.n;
    $('#mPrice').textContent = UI.money(it.p);
    $('#mSup').textContent = sup;
    $('#mQ').textContent = (S.myItem ? 'להחליף את הבחירה שלך למשחק הזה' : 'לבחור את המשחק הזה') + ' ' + UI.toGan(S.status.name) + '?';
    setErr('#mErr', '');
    show('#modal', true);
    $('#mYes').focus();
  }
  function closeModal() { show('#modal', false); }
  $('#mNo').addEventListener('click', closeModal);
  $('#modal').addEventListener('click', function (e) { if (e.target.id === 'modal') closeModal(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeModal(); });

  $('#mYes').addEventListener('click', async function () {
    var it = S.pick, b = $('#mYes');
    b.disabled = true;
    var p = { ganId: S.status.id, first: S.me.first, last: S.me.last, id4: S.me.id4, role: S.me.role, itemId: it.id,
              item: { id: it.id, n: it.n, p: it.p, s: it.s, u: it.u } };
    if (teacher) p.key = teacher.key;
    var r = await API.call('choose', p);
    b.disabled = false;
    if (!r.ok) {
      setErr('#mErr', r.msg);
      if (r.code === 'taken') {
        var st = await API.call('ganStatus', { ganId: S.status.id });
        if (st.ok) { S.status = st; drawBar(); S.cat.update(st.taken); }
      }
      return;
    }
    closeModal();
    S.status.chosen = r.chosen;
    S.myItem = it.id;
    done(it.n, !r.same, false);
  });

  function done(gameName, celebrate, closed) {
    var st = S.status, lit = UI.litFor(st.chosen, st.staff);
    S.doneGame = gameName;
    $('#doneGame').textContent = gameName;
    $('#doneGan').textContent = UI.toGan(st.name);
    $('#doneChan').innerHTML = UI.chanukiah(lit, { newIndex: celebrate ? lit - 1 : -1 });
    $('#doneProg').innerHTML = st.chosen >= st.staff
      ? 'החנוכייה של הגן דולקת כולה! <b>כל הצוות בחר</b>'
      : 'כבר <b>' + st.chosen + '</b> מתוך <b>' + st.staff + '</b> בצוות בחרו';
    $('#doneNote').textContent = closed
      ? 'הגננת כבר סגרה את הסל. מרים מזמינה את כל המשחקים, והם יגיעו לגן לפני חנוכה.'
      : 'אפשר להחליף משחק עד שהגננת סוגרת את הסל. מרים מזמינה את כל המשחקים, והם יגיעו לגן לפני חנוכה.';
    show('#changeBtn', !closed);
    $('#waBtn').href = 'https://wa.me/?text=' + encodeURIComponent('בחרתי את "' + gameName + '" ' + UI.toGan(st.name) +
      ' במתנת החנוכה של צהר הלב 🕎\nגם את בצוות? היכנסי ובחרי משחק לגן שלך: ' + SITE);
    var admin = teacher ? '' : adminLinks()[st.id];
    show('#ganCard', !!admin);
    if (admin) {
      var msg = 'צוות ' + st.name + ' יקר 🕎 צהר הלב מזמינה לכל אחת מאיתנו משחק חדש לגן, עד 70 ש"ח! ' +
        'היכנסי, בחרי ' + st.city + ' ואת ' + st.name + ', ובחרי משחק אחד (' + C.DEADLINE_TEXT + '): ' + SITE;
      $('#gcName').textContent = st.name;
      $('#staffMsg').value = msg;
      $('#waStaff').href = 'https://wa.me/?text=' + encodeURIComponent(msg);
      $('#toAdmin').href = admin;
      $('#mailAdmin').href = 'mailto:?subject=' + encodeURIComponent('קישור הניהול של ' + st.name + ' - החנוכייה של הגן') +
        '&body=' + encodeURIComponent('קישור הניהול שלי (לא להעביר לצוות):\n' + admin + '\n\nהקישור לצוות:\n' + SITE);
    }
    section('s-done');
    if (celebrate) UI.confetti();
  }

  $('#copyStaff').addEventListener('click', function (e) { UI.copyText($('#staffMsg').value, e.target); });
  $('#copyAdmin').addEventListener('click', function (e) { UI.copyText($('#toAdmin').href, e.target); });

  $('#changeBtn').addEventListener('click', function () {
    API.call('ganStatus', { ganId: S.status.id }).then(function (st) {
      if (st.ok) S.status = st;
      openCatalog('הבחירה הנוכחית שלך מסומנת. בחרי משחק אחר כדי להחליף.');
    });
  });

  $('#shareBtn').addEventListener('click', async function () {
    var b = $('#shareBtn');
    b.disabled = true;
    try {
      var blob = await UI.shareCard({ gameName: S.doneGame, ganName: S.status.name, lit: UI.litFor(S.status.chosen, S.status.staff) });
      var file = new File([blob], 'hanukkah-gan.png', { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], text: 'הדלקתי נר בחנוכייה של הגן 🕎' });
      } else {
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob); a.download = 'hanukkah-gan.png';
        document.body.appendChild(a); a.click(); a.remove();
      }
    } catch (e) { /* share cancelled */ }
    b.disabled = false;
  });
})();
