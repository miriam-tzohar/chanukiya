/*
 * Shared rules of the gan gift picker - ONE source for:
 *   - the Google Apps Script backend (copied as apps-script/Core.gs by _build/sync_gs.py)
 *   - the browser mock (?mock=1) used for local testing
 *   - the Node tests (_build/test_logic.js)
 * Pure functions: they read a db {gans:[], choices:[]} and return {res, ops}.
 * ops are applied by the caller (sheet rows or localStorage).
 */
var Logic = (function () {
  var MAX_PRICE = 70;
  var GUIDE_ROLE = 'מדריכה';   // 11.11: מדריכות help their staff choose, they do not choose a game
  var CITIES = ['באר שבע', 'דימונה', 'נתיבות', 'אופקים', 'ערד', 'ירוחם', 'אחר'];

  function norm(s) {
    return String(s || '')
      .replace(/[֑-ׇ]/g, '')          // niqqud
      .replace(/["'`׳״\-–.,()]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }
  function personKey(first, last, id4) {
    return norm(first) + '|' + norm(last) + '|' + String(id4 || '').trim();
  }
  function err(code, msg) { return { res: { ok: false, code: code, msg: msg }, ops: [] }; }
  function code(rand, n, alphabet) {
    var a = alphabet || 'abcdefghjkmnpqrstuvwxyz23456789', s = '';
    for (var i = 0; i < n; i++) s += a.charAt(Math.floor(rand() * a.length));
    return s;
  }
  function findGan(db, id) {
    for (var i = 0; i < db.gans.length; i++) if (db.gans[i].id === id) return db.gans[i];
    return null;
  }
  function active(db, ganId) {
    return db.choices.filter(function (c) { return c.status === 'פעיל' && (!ganId || c.ganId === ganId); });
  }
  function clip(s, n) { return String(s == null ? '' : s).trim().slice(0, n); }

  function registerGan(db, p, settings, now, rand) {
    if (!settings.open) return err('closed', 'הבחירה סגורה');
    var name = clip(p.name, 60), city = clip(p.city, 30), teacher = clip(p.teacher, 60);
    var address = clip(p.address, 120), phone = clip(p.phone, 20).replace(/[^\d\-+ ]/g, '');
    var staff = parseInt(p.staff, 10);
    if (name.length < 2) return err('name', 'חסר שם הגן');
    if (!city) return err('city', 'חסרה עיר');
    if (teacher.length < 2) return err('teacher', 'חסר שם הרכזת');
    if (address.length < 4) return err('address', 'חסרה כתובת למשלוח');
    if (phone.replace(/\D/g, '').length < 9) return err('phone', 'חסר טלפון לתיאום משלוח');
    if (!(staff >= 1 && staff <= 20)) return err('staff', 'מספר אנשי הצוות צריך להיות בין 1 ל-20');
    for (var i = 0; i < db.gans.length; i++) {
      var g = db.gans[i];
      if (norm(g.name) === norm(name) && g.city === city) {
        return err('dup', 'הגן "' + g.name + '" ב' + g.city + ' כבר נפתח. אם הקישור שלך הלך לאיבוד, פני למרים.');
      }
    }
    var gan = { id: code(rand, 6), key: code(rand, 14), name: name, city: city, address: address, phone: phone,
      teacher: teacher, staff: staff, created: now, closed: '' };
    return { res: { ok: true, ganId: gan.id, key: gan.key, name: gan.name }, ops: [{ t: 'addGan', row: gan }] };
  }

  function ganSummary(db, g) {
    var n = active(db, g.id).length;
    return { id: g.id, name: g.name, city: g.city, staff: g.staff, chosen: n, closed: !!g.closed };
  }

  function listGans(db) {
    var list = db.gans.map(function (g) { return ganSummary(db, g); });
    list.sort(function (a, b) { return a.city === b.city ? (a.name < b.name ? -1 : 1) : (a.city < b.city ? -1 : 1); });
    var total = active(db).length;
    return { res: { ok: true, gans: list, total: total, closedCount: list.filter(function (g) { return g.closed; }).length }, ops: [] };
  }

  function ganStatus(db, p) {
    var g = findGan(db, p.ganId);
    if (!g) return err('nogan', 'הגן לא נמצא');
    var s = ganSummary(db, g);
    s.taken = active(db, g.id).map(function (c) { return c.itemId; });
    s.ok = true;
    return { res: s, ops: [] };
  }

  function checkKey(db, p) {
    var g = findGan(db, p.ganId);
    if (!g || !p.key || g.key !== p.key) return null;
    return g;
  }

  function ganAdmin(db, p) {
    var g = checkKey(db, p);
    if (!g) return err('key', 'קישור הניהול לא תקין');
    var s = ganSummary(db, g);
    s.ok = true;
    s.teacher = g.teacher; s.address = g.address; s.phone = g.phone;
    s.taken = active(db, g.id).map(function (c) { return c.itemId; });
    s.choices = active(db, g.id).map(function (c) {
      return { id: c.id, first: c.first, last: c.last, role: c.role, itemId: c.itemId, itemName: c.itemName,
        price: c.price, supplier: c.supplier, by: c.by, ts: c.ts };
    });
    return { res: s, ops: [] };
  }

  // item: {id, n, p, s, u} - looked up by the caller in the catalog
  function choose(db, p, item, settings, now, rand) {
    if (!settings.open) return err('closed', 'הבחירה כבר נסגרה');
    var g = findGan(db, p.ganId);
    if (!g) return err('nogan', 'הגן לא נמצא');
    var byTeacher = !!p.key;
    if (byTeacher && g.key !== p.key) return err('key', 'קישור הניהול לא תקין');
    if (g.closed) return err('ganclosed', 'הרכזת כבר סגרה את הסל של הגן');
    var first = clip(p.first, 40), last = clip(p.last, 40), id4 = String(p.id4 || '').trim();
    var role = clip(p.role, 40);
    if (norm(first).length < 2) return err('first', 'חסר שם פרטי');
    if (norm(last).length < 2) return err('last', 'חסר שם משפחה');
    if (!/^\d{4}$/.test(id4)) return err('id4', 'צריך 4 ספרות אחרונות של תעודת הזהות');
    if (!role) return err('role', 'חסר תפקיד');
    if (norm(role) === norm(GUIDE_ROLE)) return err('guide', 'מדריכות לא בוחרות משחק. עזרי למודרכות שלך לבחור.');
    if (!item || !item.id) return err('item', 'המשחק לא נמצא בקטלוג');
    if (!(item.p > 0 && item.p <= MAX_PRICE)) return err('price', 'המחיר מעל ' + MAX_PRICE + ' ש"ח');

    var key = personKey(first, last, id4);
    var mine = null, ops = [];
    var all = active(db);
    for (var i = 0; i < all.length; i++) {
      var c = all[i];
      if (personKey(c.first, c.last, c.id4) === key) mine = c;
    }
    if (mine && mine.ganId !== g.id) {
      var og = findGan(db, mine.ganId);
      var on = og ? og.name : '';
      return err('othergan', 'כבר בחרת משחק ' + (/^גן[\s״"']/.test(on) ? 'ל' + on : 'לגן ' + on) + '. כל אחת בוחרת פעם אחת.');
    }
    if (mine && mine.itemId === item.id) {
      return { res: { ok: true, same: true, choiceId: mine.id, chosen: active(db, g.id).length, staff: g.staff, ganName: g.name }, ops: [] };
    }
    for (var j = 0; j < all.length; j++) {
      if (all[j].ganId === g.id && all[j].itemId === item.id && all[j] !== mine) {
        return err('taken', 'המשחק הזה כבר נבחר בגן שלך. בחרי משחק אחר.');
      }
    }
    if (mine) ops.push({ t: 'setChoice', id: mine.id, fields: { status: 'הוחלף' } });
    var row = { id: code(rand, 8), ts: now, ganId: g.id, ganName: g.name, city: g.city, first: first, last: last,
      id4: id4, role: role, itemId: item.id, itemName: item.n, supplier: item.s, price: item.p, url: item.u || '',
      by: byTeacher ? 'רכזת' : 'עובדת', status: 'פעיל' };
    ops.push({ t: 'addChoice', row: row });
    var chosen = active(db, g.id).length + (mine ? 0 : 1);
    return { res: { ok: true, replaced: !!mine, choiceId: row.id, chosen: chosen, staff: g.staff, ganName: g.name }, ops: ops };
  }

  function myChoice(db, p) {
    var key = personKey(p.first, p.last, p.id4);
    var all = active(db);
    for (var i = 0; i < all.length; i++) {
      if (personKey(all[i].first, all[i].last, all[i].id4) === key) {
        var g = findGan(db, all[i].ganId);
        return { res: { ok: true, found: true, ganId: all[i].ganId, ganName: g ? g.name : '', itemId: all[i].itemId,
          itemName: all[i].itemName, closed: g ? !!g.closed : false }, ops: [] };
      }
    }
    return { res: { ok: true, found: false }, ops: [] };
  }

  function removeChoice(db, p) {
    var g = checkKey(db, p);
    if (!g) return err('key', 'קישור הניהול לא תקין');
    if (g.closed) return err('ganclosed', 'הסל סגור. פתחי אותו מחדש כדי למחוק');
    var c = active(db, g.id).filter(function (x) { return x.id === p.choiceId; })[0];
    if (!c) return err('nochoice', 'הבחירה לא נמצאה');
    return { res: { ok: true }, ops: [{ t: 'setChoice', id: c.id, fields: { status: 'נמחק' } }] };
  }

  function setClosed(db, p, closed, now) {
    var g = checkKey(db, p);
    if (!g) return err('key', 'קישור הניהול לא תקין');
    return { res: { ok: true, closed: closed }, ops: [{ t: 'setGan', id: g.id, fields: { closed: closed ? now : '' } }] };
  }

  // Applies ops to an in-memory db (used by the mock and the tests).
  function applyOps(db, ops) {
    ops.forEach(function (o) {
      if (o.t === 'addGan') db.gans.push(o.row);
      if (o.t === 'addChoice') db.choices.push(o.row);
      if (o.t === 'setGan' || o.t === 'setChoice') {
        var list = o.t === 'setGan' ? db.gans : db.choices;
        list.forEach(function (r) { if (r.id === o.id) for (var k in o.fields) r[k] = o.fields[k]; });
      }
    });
    return db;
  }

  // One entry point for every backend.
  function handle(db, action, p, ctx) {
    var now = ctx.now, rand = ctx.rand, settings = ctx.settings;
    switch (action) {
      case 'registerGan': return registerGan(db, p, settings, now, rand);
      case 'listGans': return listGans(db);
      case 'ganStatus': return ganStatus(db, p);
      case 'ganAdmin': return ganAdmin(db, p);
      case 'choose': return choose(db, p, ctx.lookup(p.itemId, p.item), settings, now, rand);
      case 'myChoice': return myChoice(db, p);
      case 'removeChoice': return removeChoice(db, p);
      case 'closeGan': return setClosed(db, p, true, now);
      case 'reopenGan': return setClosed(db, p, false, now);
      case 'settings': return { res: { ok: true, open: !!settings.open, deadline: settings.deadline || '' }, ops: [] };
      default: return err('action', 'פעולה לא מוכרת');
    }
  }

  return { MAX_PRICE: MAX_PRICE, CITIES: CITIES, norm: norm, personKey: personKey, handle: handle, applyOps: applyOps };
})();

if (typeof module !== 'undefined') module.exports = Logic;
