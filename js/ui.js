// Shared UI pieces: chanukiah, catalog grid, confetti, share card, small helpers.
var UI = (function () {
  var uid = 0;
  var CANDLE_COLORS = ['#BE4E08', '#1F6F63', '#205998', '#EE761B', '#1F6F63', '#205998', '#BE4E08', '#EE761B'];

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function $(sel, root) { return (root || document).querySelector(sel); }
  function show(el, on) { (typeof el === 'string' ? $(el) : el).classList.toggle('hidden', !on); }
  // "לגן שושנים" for "גן שושנים", "לגן חבצלת" for "חבצלת".
  function toGan(name) { name = String(name || '').trim(); return /^גן[\s״"']/.test(name) ? 'ל' + name : 'לגן ' + name; }
  function money(p) { return '₪' + (Math.round(p * 100) / 100).toString(); }

  // How many of the 8 candles burn: all 8 when the whole staff chose, at least 1 once someone chose.
  function litFor(chosen, staff) {
    if (!chosen || chosen <= 0) return 0;
    if (!staff || chosen >= staff) return 8;
    return Math.max(1, Math.min(7, Math.round(chosen * 8 / staff)));
  }

  // 8 candles + raised shamash. Candles fill from the right (index 0 = rightmost).
  function chanukiah(lit, opts) {
    opts = opts || {};
    var id = 'c' + (++uid);
    var shamashLit = opts.shamash !== false;
    var newIdx = opts.newIndex == null ? -1 : opts.newIndex;
    var xs = [355, 315, 275, 235, 165, 125, 85, 45];
    var s = '<svg class="chanukiah" viewBox="0 0 400 270" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="' +
      esc(opts.label || ('חנוכייה עם ' + lit + ' נרות דולקים')) + '">' +
      '<defs><radialGradient id="' + id + 'g"><stop offset="0" stop-color="#FFD66B" stop-opacity=".9"/><stop offset="1" stop-color="#FFD66B" stop-opacity="0"/></radialGradient>' +
      '<linearGradient id="' + id + 'b" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#F2C14E"/><stop offset="1" stop-color="#C98A12"/></linearGradient></defs>';
    // body: arms bar, stem, base
    s += '<rect x="28" y="168" width="344" height="12" rx="6" fill="url(#' + id + 'b)"/>';
    s += '<rect x="193" y="120" width="14" height="110" rx="5" fill="url(#' + id + 'b)"/>';
    s += '<path d="M150 252 Q200 222 250 252 Z" fill="url(#' + id + 'b)"/><rect x="140" y="248" width="120" height="12" rx="6" fill="url(#' + id + 'b)"/>';
    function candle(x, top, h, color, isLit, isNew) {
      var c = '<rect x="' + (x - 13) + '" y="' + (top + h) + '" width="26" height="8" rx="3" fill="url(#' + id + 'b)"/>';
      c += '<rect x="' + (x - 7) + '" y="' + top + '" width="14" height="' + h + '" rx="4" fill="' + color + '"/>';
      c += '<line x1="' + x + '" y1="' + (top - 5) + '" x2="' + x + '" y2="' + top + '" stroke="#3A3A3A" stroke-width="2"/>';
      if (isLit) {
        c += '<circle class="glow" cx="' + x + '" cy="' + (top - 16) + '" r="20" fill="url(#' + id + 'g)"/>';
        c += '<g class="' + (isNew ? 'new-flame' : 'flame') + '"><path d="M' + x + ' ' + (top - 34) + ' C' + (x + 10) + ' ' + (top - 18) + ' ' + (x + 8) + ' ' + (top - 5) + ' ' + x + ' ' + (top - 3) +
          ' C' + (x - 8) + ' ' + (top - 5) + ' ' + (x - 10) + ' ' + (top - 18) + ' ' + x + ' ' + (top - 34) + ' Z" fill="#F7B32B"/>' +
          '<path d="M' + x + ' ' + (top - 22) + ' C' + (x + 5) + ' ' + (top - 13) + ' ' + (x + 4) + ' ' + (top - 6) + ' ' + x + ' ' + (top - 5) +
          ' C' + (x - 4) + ' ' + (top - 6) + ' ' + (x - 5) + ' ' + (top - 13) + ' ' + x + ' ' + (top - 22) + ' Z" fill="#E4572E"/></g>';
      }
      return c;
    }
    for (var i = 0; i < 8; i++) s += candle(xs[i], 104, 58, CANDLE_COLORS[i], i < lit, i === newIdx);
    s += '<rect x="186" y="112" width="28" height="10" rx="4" fill="url(#' + id + 'b)"/>';
    s += candle(200, 48, 58, '#00274D', shamashLit, false);
    return s + '</svg>';
  }

  function confetti() {
    var box = document.createElement('div');
    box.className = 'confetti';
    var colors = ['#BE4E08', '#1F6F63', '#205998', '#EE761B', '#E8A317', '#DCE8F5'];
    for (var i = 0; i < 110; i++) {
      var p = document.createElement('i');
      p.style.left = Math.random() * 100 + 'vw';
      p.style.background = colors[i % colors.length];
      p.style.animationDuration = (2.2 + Math.random() * 2.2) + 's';
      p.style.animationDelay = (Math.random() * 0.6) + 's';
      box.appendChild(p);
    }
    document.body.appendChild(box);
    setTimeout(function () { box.remove(); }, 5200);
  }

  async function copyText(text, btn) {
    try { await navigator.clipboard.writeText(text); }
    catch (e) {
      var t = document.createElement('textarea');
      t.value = text; document.body.appendChild(t); t.select();
      try { document.execCommand('copy'); } catch (x) { }
      t.remove();
    }
    if (btn) { var o = btn.textContent; btn.textContent = 'הועתק ✓'; setTimeout(function () { btn.textContent = o; }, 1800); }
  }

  // Catalog: chips + search + grid. opts: {taken:[], mine:'', onPick(item), readOnly}
  function mountCatalog(root, catalog, opts) {
    opts = opts || {};
    var state = { dom: 'הכל', q: '', taken: new Set(opts.taken || []), mine: opts.mine || '' };
    var doms = ['הכל'].concat(catalog.domains);
    var counts = {};
    catalog.items.forEach(function (i) { counts[i.d] = (counts[i.d] || 0) + 1; });
    root.innerHTML =
      '<div class="chips" role="group" aria-label="סינון לפי תחום">' + doms.map(function (d) {
        return '<button type="button" class="chip" data-d="' + esc(d) + '" aria-pressed="' + (d === 'הכל') + '">' + esc(d) +
          (d === 'הכל' ? ' (' + catalog.items.length + ')' : ' (' + (counts[d] || 0) + ')') + '</button>';
      }).join('') + '</div>' +
      '<input class="search" type="search" placeholder="חיפוש משחק לפי שם או מספר" aria-label="חיפוש משחק">' +
      '<div class="grid"></div><div class="empty hidden">לא נמצאו משחקים</div>';
    var grid = $('.grid', root), empty = $('.empty', root);
    root.querySelectorAll('.chip').forEach(function (b) {
      b.addEventListener('click', function () {
        state.dom = b.dataset.d;
        root.querySelectorAll('.chip').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        draw();
      });
    });
    $('.search', root).addEventListener('input', function (e) { state.q = Logic.norm(e.target.value); draw(); });

    function card(it) {
      var taken = state.taken.has(it.id) && it.id !== state.mine;
      var mine = it.id === state.mine;
      var sup = catalog.suppliers[it.s] ? catalog.suppliers[it.s].name : it.s;
      var btn = opts.readOnly ? '' :
        '<button type="button" data-id="' + esc(it.id) + '"' + (taken ? ' disabled aria-disabled="true"' : '') + '>' +
        (mine ? 'הבחירה שלך ✓' : taken ? 'כבר נבחר בגן שלך' : 'זה המשחק שלי') + '</button>';
      return '<article class="game' + (taken ? ' taken' : '') + (mine ? ' mine' : '') + '">' +
        (mine ? '<span class="tag">הבחירה שלך</span>' : taken ? '<span class="tag">נבחר</span>' : '') +
        (it.no ? '<span class="no">' + it.no + '</span>' : '') +
        '<div class="ph"><img loading="lazy" referrerpolicy="no-referrer" src="' + esc(it.t) + '" alt=""></div>' +
        '<div class="b"><div class="n">' + esc(it.n) + '</div>' +
        '<div class="meta"><span class="price">' + money(it.p) + '</span><span class="sup">' + esc(sup) + '</span></div>' +
        (opts.readOnly ? '<div class="dom">' + esc(it.d) + '</div>' + (it.x ? '<div class="x">' + esc(it.x) + '</div>' : '') : '') +
        '<div class="go">' + btn + '<a href="' + esc(it.u) + '" target="_blank" rel="noopener">לפרטים באתר ' + esc(sup) + '</a></div></div></article>';
    }
    function draw() {
      var list = catalog.items.filter(function (i) {
        var byNo = /^\d+$/.test(state.q);   // a number from the printed catalog
        return (byNo || state.dom === 'הכל' || i.d === state.dom) &&
          (!state.q || (byNo ? String(i.no) === state.q : Logic.norm(i.n).indexOf(state.q) >= 0));
      });
      grid.innerHTML = list.map(card).join('');
      show(empty, list.length === 0);
      grid.querySelectorAll('button[data-id]').forEach(function (b) {
        b.addEventListener('click', function () {
          var it = catalog.items.filter(function (x) { return x.id === b.dataset.id; })[0];
          if (it && opts.onPick && !b.disabled) opts.onPick(it);
        });
      });
    }
    draw();
    return {
      update: function (taken, mine) { state.taken = new Set(taken || []); if (mine !== undefined) state.mine = mine; draw(); }
    };
  }

  function wrapLines(ctx, text, maxW) {
    var words = String(text).split(' '), lines = [], cur = '';
    words.forEach(function (w) {
      var t = cur ? cur + ' ' + w : w;
      if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t;
    });
    if (cur) lines.push(cur);
    return lines;
  }
  function loadImg(src) {
    return new Promise(function (res, rej) { var i = new Image(); i.onload = function () { res(i); }; i.onerror = rej; i.src = src; });
  }

  // 1080x1350 share image (no product photo: supplier images would taint the canvas).
  async function shareCard(o) {
    try { await document.fonts.load('900 70px Heebo'); await document.fonts.load('500 40px Heebo'); } catch (e) { }
    var c = document.createElement('canvas');
    c.width = 1080; c.height = 1350;
    var x = c.getContext('2d');
    x.fillStyle = '#F9F5EC'; x.fillRect(0, 0, 1080, 1350);
    x.fillStyle = '#FBE2D0'; x.beginPath(); x.arc(980, 120, 260, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#DCE8F5'; x.beginPath(); x.arc(60, 1260, 300, 0, Math.PI * 2); x.fill();
    x.direction = 'rtl'; x.textAlign = 'center'; x.fillStyle = '#00274D';
    try { var logo = await loadImg('img/logo.png'); x.drawImage(logo, 465, 60, 150, 159); } catch (e) { }
    x.font = '900 84px Heebo'; x.fillText('הדלקתי נר בגן!', 540, 330);
    x.font = '500 44px Heebo'; x.fillStyle = '#45607A'; x.fillText('בחרתי משחק במתנת החנוכה של צהר הלב', 540, 400);
    var svg = chanukiah(o.lit, { shamash: true }).replace('class="chanukiah"', 'width="800" height="540"');
    try {
      var url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
      var img = await loadImg(url);
      x.drawImage(img, 140, 440, 800, 540);
      URL.revokeObjectURL(url);
    } catch (e) { }
    x.fillStyle = '#BE4E08'; x.font = '900 66px Heebo';
    var lines = wrapLines(x, o.gameName, 900).slice(0, 2), y = 1060;
    lines.forEach(function (l) { x.fillText(l, 540, y); y += 78; });
    x.fillStyle = '#00274D'; x.font = '700 48px Heebo';
    x.fillText(toGan(o.ganName), 540, y + 12);
    x.font = '500 34px Heebo'; x.fillStyle = '#45607A';
    x.fillText('צהר הלב · מרחב דרום · חנוכה תשפ״ז', 540, 1300);
    return new Promise(function (res) { c.toBlob(res, 'image/png'); });
  }

  return { esc: esc, $: $, show: show, money: money, toGan: toGan, litFor: litFor, chanukiah: chanukiah, confetti: confetti,
    copyText: copyText, mountCatalog: mountCatalog, shareCard: shareCard };
})();
