(() => {
  /* ===== Positions. When you swap a picture, adjust these numbers (pixels in that picture). ===== */
  const CONFIG = {
    iso: {                    // img/world/iso.png, 320 x 200
      heroH: 24,              // hero height on the island
      fork: [160, 138],       // where she stands at the signpost
      ways: {                 // walking route from the fork to the end of each path, and where its label sits
        side: { path: [[148, 124], [124, 112], [100, 100], [86, 93]], label: [86, 46] },
        main: { path: [[172, 124], [196, 112], [220, 100], [234, 93]], label: [234, 46] }
      }
    },
    paths: {                  // img/world/<main|side>-ground.png: height 180, the street/path top at y = 150
      // flag: reaching this x walks her back to the island
      main: { width: 1100, start: 70, flag: 1070, stops: { lekalas: 315, eldora: 590, 'dhl-care': 885 } },
      side: { width: 900, start: 70, stops: { ngo: 330, photography: 670 } }
    },
    bowl: { x: .8117, y: .8249, rx: .0924, ry: .0363, tilt: 8 },  // the water in the title collage's bowl: centre and radii as fractions of the picture, tilt in degrees
    groundY: 150, heroH: 37,  // hero size on the paths
    reach: 60,                // how close she must be for a dialogue to open
    speed: 85                 // walking speed, picture pixels per second
  };

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  // run fn(t) every frame for ms milliseconds, t going 0 → 1 (the clock starts at the first frame, so a slow start skips nothing)
  const frames = (ms, fn) => new Promise(done => {
    let t0;
    const step = now => { t0 ??= now; const t = Math.min(1, (now - t0) / ms); fn(t); if (t < 1) requestAnimationFrame(step); else done(); };
    requestAnimationFrame(step);
  });
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  /* ================= books ================= */
  // Chapters are numbered in order; the number sits in a tag above each chapter title.
  const label = art => {
    let n = 0;
    $$('section.blk[id]', art).forEach(s => {
      const h = $('h2', s);
      if (h) h.dataset.ch = s.matches('.opt') ? 'Bonus' : 'Chapter ' + ++n;
    });
  };

  // Standalone case study pages scroll, so they get a contents page instead of tabs.
  const standalone = $('main article.case');
  if (standalone) {
    label(standalone);
    const nav = document.createElement('nav');
    nav.className = 'toc';
    nav.setAttribute('aria-label', 'Contents');
    nav.innerHTML = '<h2>Contents</h2><ol></ol>';
    $$('section.blk[id]:not(.opt)', standalone).forEach((s, i) => {
      const li = document.createElement('li');
      li.innerHTML = `<a href="#${s.id}"><span></span><i></i><b>${i + 3}</b></a>`;
      $('span', li).textContent = $('h2', s).textContent;
      $('ol', nav).append(li);
    });
    $('.chead', standalone).after(nav);
  }

  // In the game, books open as a two-page journal. The content flows into CSS columns;
  // one spread is two columns, and turning a page scrolls the flow by one spread.
  const bookD = $('#book');
  const book = { art: null, home: null, pages: [], starts: [], spread: 0 };
  let openLocal = () => {};
  if (bookD) {
    const flow = $('.flow', bookD), tabs = $('.tabs', bookD), folio = $('.folio', bookD);
    const prev = $('.turn.prev', bookD), next = $('.turn.next', bookD);
    const gap = () => parseFloat(getComputedStyle(flow).columnGap) || 0;
    const pitch = () => flow.clientWidth + gap();
    const cols = () => (getComputedStyle(flow).columnCount === '1' ? 1 : 2);
    // an odd page count leaves half a spread: round up, or the last page can't be reached
    const spreads = () => Math.max(1, Math.ceil((flow.scrollWidth + gap()) / pitch() - .02));
    const measure = () => {
      flow.style.setProperty('--ph', flow.clientHeight + 'px');
      $$('.blank', flow).forEach(el => el.remove());
      if (cols() === 2) {
        // every chapter opens on a left-hand page, so a spread never mixes two chapters
        const col = (flow.clientWidth - gap()) / 2 + gap();
        book.pages.forEach(p => {
          if (getComputedStyle(p).breakBefore !== 'column' || !(Math.round(p.offsetLeft / col) % 2)) return;
          const blank = document.createElement('div');
          blank.className = 'blank';
          p.before(blank);
        });
      }
      book.starts = book.pages.map(p => Math.floor((p.offsetLeft + 2) / pitch()));
    };
    const turn = i => {
      const n = spreads();
      book.spread = clamp(i, 0, n - 1);
      flow.scrollLeft = book.spread * pitch();
      prev.disabled = book.spread === 0;
      next.disabled = book.spread === n - 1;
      const c = cols(), first = book.spread * c + 1, total = n * c;
      folio.textContent = c === 2 ? `${first}–${Math.min(first + 1, total)} / ${total}` : `${first} / ${total}`;
      let active = 0;
      book.starts.forEach((s, k) => { if (s <= book.spread) active = k; });
      [...tabs.children].forEach((t, k) => t.setAttribute('aria-current', k === active));
      const t = tabs.children[active];   // keep the open chapter's bookmark in view
      if (t) tabs.scrollLeft = clamp(tabs.scrollLeft, t.offsetLeft + t.offsetWidth - tabs.clientWidth, t.offsetLeft);
    };
    const build = () => {
      book.pages = $$(':scope > .wrap > .chead, :scope > .wrap > section.blk', book.art).filter(p => !p.hidden);
      tabs.replaceChildren(...book.pages.map((p, k) => {
        const t = document.createElement('button');
        t.type = 'button';
        t.className = 'tab';
        t.textContent = t.title = $(p.matches('.chead') ? 'h1' : 'h2', p).textContent;   // the chapter's own title
        t.addEventListener('click', () => turn(book.starts[k]));
        return t;
      }));
      measure();
    };
    // put the open article back where it came from (a fetched one is just dropped)
    const putBack = () => {
      $$('.blank', flow).forEach(el => el.remove());
      if (book.art && book.home) book.home.append(book.art); else flow.replaceChildren();
      book.art = null;
    };
    const open = (art, home, target) => {
      putBack();
      book.art = art;
      book.home = home;
      label(art);
      // pictures in hidden columns may never count as on screen, so load them now; album photos load page by page
      $$('img', art).forEach(img => { if (!img.closest('.pic')) img.loading = 'eager'; });
      flow.replaceChildren(art);
      bookD.setAttribute('aria-label', $('h1', art).textContent);
      bookD.showModal();
      build();
      const page = target && book.pages.findIndex(p => p === target || p.contains(target));
      turn(page > 0 ? book.starts[page] : 0);
    };
    openLocal = target => { const art = target.closest('article'); open(art, art.parentElement, target); };
    prev.addEventListener('click', () => turn(book.spread - 1));
    next.addEventListener('click', () => turn(book.spread + 1));
    // pictures finishing loading, or a missing demo video hiding its page, can move chapters
    const relayout = () => { if (book.art) { build(); turn(book.spread); } };
    flow.addEventListener('load', relayout, true);
    flow.addEventListener('error', () => setTimeout(relayout), true);
    addEventListener('resize', relayout);
    bookD.addEventListener('keydown', e => {
      if (e.target.closest('video')) return;
      if (e.key === 'ArrowLeft') turn(book.spread - 1);
      if (e.key === 'ArrowRight') turn(book.spread + 1);
    });
    bookD.addEventListener('click', e => { if (e.target === bookD) bookD.close(); });
    // album photos open big on top of the book; a click or Esc puts them back
    bookD.addEventListener('click', e => {
      const pic = e.target.closest('.pic');
      if (!pic) return;
      e.preventDefault();
      const big = document.createElement('button');
      big.type = 'button';
      big.className = 'enlarge';
      big.setAttribute('aria-label', 'Close the photo');
      big.innerHTML = '<img alt=""><span></span>';
      $('img', big).src = pic.href;
      $('img', big).alt = $('img', pic).alt;
      $('span', big).textContent = pic.dataset.when;
      big.addEventListener('click', () => { big.remove(); pic.focus(); });
      $('.book', bookD).append(big);
      big.focus();
    });
    bookD.addEventListener('cancel', e => { const big = $('.enlarge', bookD); if (big) { e.preventDefault(); big.click(); } });
    bookD.addEventListener('close', () => {
      $('.enlarge', bookD)?.remove();
      if (!bookD.open) putBack();   // a late close event must not empty a book opened since
    });
    document.addEventListener('click', async e => {
      const a = e.target.closest('a[data-case], a[data-sheet]');
      if (!a || e.metaKey || e.ctrlKey || e.shiftKey) return;
      e.preventDefault();
      $('#menu')?.close();
      if (a.hasAttribute('data-sheet')) return openLocal($(a.getAttribute('href')));
      try {
        const url = new URL(a.href);
        const html = await (await fetch(url.pathname)).text();
        const art = new DOMParser().parseFromString(html, 'text/html').querySelector('article');
        open(art, null, url.hash && $(url.hash, art));
      } catch { location.href = a.href; }
    });
  }

  /* ================= the game ================= */
  const game = $('.game');
  if (!game) return;

  const hero = $('.hero', game), iris = $('.iris', game), zoomCv = $('.zoom', game);
  const title = $('.title', game), art = $('.art', title);
  const isoView = $('.iso-view', game), isoBox = $('.iso-box', game);
  const line = $('.talk .line', game), stops = $$('.talk .stop', game);
  const menu = $('#menu'), goIso = $('[data-goto="iso"]', menu);
  const touch = matchMedia('(max-width: 760px), (pointer: coarse)');

  let state = 'title', busy = false, way = 'main';
  let hx = CONFIG.iso.fork[0], hy = CONFIG.iso.fork[1];    // hero on the island
  let P = null, cur = null, heroX = 0, dir = 0, goal = null, near = undefined, raf = 0, last = 0, s = 4;

  /* --- shared helpers --- */
  function show(name, replace) {
    state = name;
    game.dataset.state = name;
    const hash = { title: location.pathname, iso: '#world', main: '#main-path', side: '#side-quests' }[name];
    if ((location.hash || location.pathname) !== hash) history[replace ? 'replaceState' : 'pushState'](null, '', hash);
  }
  let typing = 0;
  function say(text) {
    const id = ++typing;
    near = undefined;
    stops.forEach(st => { st.hidden = true; });
    line.hidden = false;
    if (reduce) { line.textContent = text; return; }
    line.textContent = '';
    [...text].forEach((ch, i) => setTimeout(() => { if (id === typing) line.textContent += ch; }, i * 16));
  }
  async function wipe(swap) {
    if (reduce) return swap();
    const r = hero.getBoundingClientRect();
    iris.style.setProperty('--ix', r.left + r.width / 2 + 'px');
    iris.style.setProperty('--iy', r.top + r.height / 2 + 'px');
    iris.className = 'iris close';
    await sleep(520);
    swap();
    await sleep(30);
    const r2 = hero.getBoundingClientRect();
    iris.style.setProperty('--ix', r2.left + r2.width / 2 + 'px');
    iris.style.setProperty('--iy', r2.top + r2.height / 2 + 'px');
    iris.className = 'iris open';
    await sleep(520);
    iris.className = 'iris';
  }
  const stopWalking = () => { dir = 0; goal = null; };

  /* --- 1. title screen --- */
  // The pixel copy shows through cells of its own pixel grid around the pointer. While the pointer
  // moves, the edge flickers, stray pixels spark and the cells left behind break up one by one.
  const px = $('.px', title), GRID = 148;   // collage-pixel.png is 148 blocks across
  const lit = new Map();                     // "col,row" -> time that cell goes dark
  let mx = 0, my = 0, inside = false, movedAt = 0, revealing = false;
  title.style.touchAction = 'none';
  function revealFrame(now) {
    const cw = art.clientWidth / GRID, r = (touch.matches ? 64 : 54) / cw, moving = now - movedAt < 140;
    if (inside) {
      // only cells under the pointer stay lit, so nothing is left behind it
      const ci = mx / cw, cj = my / cw, n = Math.ceil(r + 1), was = new Map(lit);
      lit.clear();
      for (let i = Math.floor(ci - n); i <= ci + n; i++) {
        for (let j = Math.floor(cj - n); j <= cj + n; j++) {
          const d = Math.hypot(i + .5 - ci, j + .5 - cj), k = i + ',' + j, end = was.get(k);
          if (d < r - 1.5 || (!moving && d < r)) lit.set(k, Infinity);
          else if (moving && d < r + 1) {           // the edge flickers while it moves
            if (end > now && end !== Infinity) lit.set(k, end);
            else if (Math.random() < .3) lit.set(k, now + 40 + Math.random() * 160);
          }
        }
      }
    }
    let path = '', fading = false;
    const c = cw.toFixed(2);
    for (const [k, end] of lit) {
      if (end < now) { lit.delete(k); continue; }
      if (end !== Infinity) fading = true;
      const [i, j] = k.split(',');
      path += `M${(i * cw).toFixed(1)} ${(j * cw).toFixed(1)}h${c}v${c}h-${c}z`;
    }
    px.style.clipPath = path ? `path("${path}")` : '';
    revealing = moving || fading;
    if (revealing) requestAnimationFrame(revealFrame);
  }
  const kick = () => { if (!revealing) { revealing = true; requestAnimationFrame(revealFrame); } };
  const point = e => {
    if (busy) return;
    const r = art.getBoundingClientRect();
    mx = e.clientX - r.left;
    my = e.clientY - r.top;
    inside = true;
    movedAt = performance.now();
    kick();
  };
  const away = () => {
    inside = false;
    const now = performance.now();
    for (const k of lit.keys()) lit.set(k, now + Math.random() * 150);
    kick();
  };
  title.addEventListener('pointermove', point);
  title.addEventListener('pointerdown', point);
  title.addEventListener('pointerleave', away);
  title.addEventListener('pointerup', e => { if (e.pointerType === 'touch') away(); });

  // The bowl on the washstand: soapy water with foam heaps, and pixel bubbles that drift up and pop.
  // One canvas pixel is 1/296 of the picture (twice as fine as the reveal's blocks).
  const bowl = $('.bowl', title), bctx = bowl.getContext('2d'), AH = 296 / 1.4978;
  const BW = bowl.width = 88, BH = bowl.height = 74, B0X = 196, B0Y = 108;   // canvas size and where it sits, in those pixels
  const B = CONFIG.bowl, bcx = B.x * 296 - B0X, bcy = B.y * AH - B0Y, brx = B.rx * 296, bry = B.ry * AH, tilt = B.tilt * Math.PI / 180;
  const inWater = (x, y) => {
    const dx = x + .5 - bcx, dy = y + .5 - bcy;
    const u = dx * Math.cos(tilt) + dy * Math.sin(tilt), v = dy * Math.cos(tilt) - dx * Math.sin(tilt);
    return (u / brx) ** 2 + (v / bry) ** 2 <= 1;
  };
  const water = [];
  for (let y = 0; y < BH; y++) for (let x = 0; x < BW; x++) {
    if (inWater(x, y)) water.push([x, y, !inWater(x - 1, y) || !inWater(x + 1, y) || !inWater(x, y - 1) || !inWater(x, y + 1)]);
  }
  const ring = (r, fill) => {
    const o = [];
    for (let y = -r - 1; y <= r + 1; y++) for (let x = -r - 1; x <= r + 1; x++) {
      const d = Math.hypot(x, y);
      if (fill ? d <= r + .3 : Math.abs(d - r) < .5) o.push([x, y]);
    }
    return o;
  };
  const RINGS = [[], ring(1), ring(2), ring(3)];
  // foam heaps, placed along the water's long axis
  const heaps = [[-.5, -.2, 3], [.05, -.45, 4], [.55, -.1, 3]].map(([u, v, r]) =>
    [bcx + u * brx * Math.cos(tilt) - v * bry * Math.sin(tilt), bcy + u * brx * Math.sin(tilt) + v * bry * Math.cos(tilt), r]);
  const SUDS = [[-.7, .25, .5], [.7, .25, .5], [0, 0, .65], [-.2, -.55, .45], [.35, -.4, .4]];
  let bubbles = [], btick = 0, bowlOn = false, bowlLast = 0;
  function drawBowl() {
    btick++;
    bctx.clearRect(0, 0, BW, BH);
    for (const [x, y, rim] of water) {
      bctx.fillStyle = rim ? ((x * 7 + y * 3 + (btick >> 2)) % 5 ? '#F4EFE5' : '#D8D0C0')   // foamy edge
        : (x + y * 4 + btick) % 19 === 0 ? '#DCEBE5'                                         // glints drifting across
        : y < bcy ? '#93B2AB' : '#A9C3BC';
      bctx.fillRect(x, y, 1, 1);
    }
    heaps.forEach(([hx, hy, r], i) => {
      const grow = ((btick >> 3) + i) % 2 * .5;   // the foam breathes
      for (const [ox, oy, k] of SUDS) {             // a heap is a little cluster of suds
        const rr = r * k + grow;
        for (const [x, y] of ring(rr, true)) {
          bctx.fillStyle = y > rr * .45 ? '#D8D0C0' : x + y < -rr * .7 ? '#FFFFFF' : '#F6F1E7';
          bctx.fillRect(Math.round(hx + ox * r + x), Math.round(hy + oy * r + y), 1, 1);
        }
      }
    });
    if (reduce) return;
    const px0 = mx / art.clientWidth * 296 - B0X, py0 = my / art.clientHeight * AH - B0Y;
    const near = inside && px0 > 0 && px0 < BW && py0 > 0 && py0 < BH;   // more bubbles while the cursor is on the bowl
    if (Math.random() < (near ? .7 : .2)) {
      const [x, y] = water[Math.random() * water.length | 0];
      bubbles.push({ x, y, r: [1, 1, 2, 2, 3][Math.random() * 5 | 0], vy: .5 + Math.random() * .7, ph: Math.random() * 6, life: 18 + Math.random() * 40 | 0, pop: 0 });
    }
    bubbles = bubbles.filter(b => {
      const x = Math.round(b.x), y = Math.round(b.y);
      bctx.fillStyle = '#FFFFFF';
      if (b.pop) {   // pop: a little star, then gone
        const d = b.r + 1, pts = b.pop === 1 ? [[d, 0], [-d, 0], [0, d], [0, -d]] : [[d, d], [-d, -d], [d, -d], [-d, d]];
        pts.forEach(([dx, dy]) => bctx.fillRect(x + dx, y + dy, 1, 1));
        return ++b.pop < 3;
      }
      b.y -= b.vy;
      b.x += Math.sin(btick * .35 + b.ph) * .35;
      if (--b.life <= 0 || b.y < b.r + 1) b.pop = 1;
      bctx.globalAlpha = .9;
      RINGS[b.r].forEach(([dx, dy]) => bctx.fillRect(x + dx, y + dy, 1, 1));
      bctx.globalAlpha = 1;
      if (b.r > 1) bctx.fillRect(x - 1, y - 1, 1, 1);   // shine
      return true;
    });
  }
  function bowlFrame(now) {
    if (state !== 'title' || !bowl.offsetParent) { bowlOn = false; return; }   // off the title, or cropped away on phones
    requestAnimationFrame(bowlFrame);
    if (now - bowlLast < 80) return;   // about 12 frames a second, like a sprite
    bowlLast = now;
    drawBowl();
  }
  function startBowl() {
    if (reduce) return drawBowl();
    if (!bowlOn) { bowlOn = true; requestAnimationFrame(bowlFrame); }
  }

  // "resume" picks up where she was last, also on a later visit
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem('saule-place')); } catch {}
  function remember() {
    if (state === 'title') return;
    saved = { s: state, x: Math.round(heroX) };
    try { localStorage.setItem('saule-place', JSON.stringify(saved)); } catch {}
  }
  addEventListener('pagehide', remember);

  function toTitle(replace) {
    cancelAnimationFrame(raf);
    remember();
    show('title', replace);
    startBowl();
    if (!replace) $('.menu button', title).focus({ preventScroll: true });  // not on first load
  }

  // Leaving the title: the chosen item blinks, the picture breaks into ever bigger pixels
  // (diving into the mirror for "start game"), then the blocks crumble away onto the next place.
  async function leaveTitle(btn, dive, go) {
    if (busy) return;
    busy = true;
    inside = false;
    lit.clear();
    px.style.clipPath = '';
    if (!reduce) {
      btn.classList.add('chosen');
      await sleep(420);
      btn.classList.remove('chosen');
      title.classList.add('leaving');
      await pixelate(dive);
    }
    go();
    if (!reduce) await crumble();
    title.classList.remove('leaving');
    busy = false;
  }
  async function pixelate(dive) {
    const img = $('.base', title);
    await img.decode().catch(() => {});
    const vw = innerWidth, vh = innerHeight, W = img.naturalWidth, H = img.naturalHeight;
    const r = art.getBoundingClientRect(), k = W / r.width;
    const A = { x: -r.left * k, y: -r.top * k, w: vw * k };   // the part of the picture on screen now
    let B = A;
    if (dive) {                                                // past the mirror glass, into its middle
      const gx = .236, gy = .342, gw = .30, gh = .337, w = Math.min(gw * W, gh * H * vw / vh) * .55;
      B = { x: (gx + gw / 2) * W - w / 2, y: (gy + gh / 2) * H - w * vh / vw / 2, w };
    }
    // zoom about the one point that stays put between the two views
    const z = B.w / A.w, fx = z === 1 ? 0 : (B.x - A.x * z) / (1 - z), fy = z === 1 ? 0 : (B.y - A.y * z) / (1 - z);
    const ctx = zoomCv.getContext('2d');
    game.classList.add('pixelating');
    await frames(dive ? 1150 : 450, t => {
      const q = z ** (t * t), w = A.w * q, cell = Math.round(1 + t ** 2.4 * (dive ? 36 : 24));
      zoomCv.width = Math.ceil(vw / cell);
      zoomCv.height = Math.ceil(vh / cell);
      ctx.drawImage(img, fx - (fx - A.x) * q, fy - (fy - A.y) * q, w, w * vh / vw, 0, 0, zoomCv.width, zoomCv.height);
      const shake = dive && t > .6 ? (t - .6) * 16 : 0;      // the camera judders as it hits the glass
      zoomCv.style.translate = shake ? `${(Math.random() - .5) * shake}px ${(Math.random() - .5) * shake}px` : '';
    });
  }
  async function crumble() {
    const ctx = zoomCv.getContext('2d'), W = zoomCv.width, H = zoomCv.height, order = [];
    for (let i = 0; i < W; i++) for (let j = 0; j < H; j++) order.push([i, j, Math.hypot(i / W - .5, j / H - .5) + Math.random() * .45]);
    order.sort((a, b) => a[2] - b[2]);   // from the middle outwards, raggedly
    let n = 0;
    await frames(700, t => { for (const to = Math.round(t * order.length); n < to; n++) ctx.clearRect(order[n][0], order[n][1], 1, 1); });
    game.classList.remove('pixelating');
    zoomCv.style.translate = '';
  }
  const startGame = (btn = $('[data-menu="start"]', title)) =>
    leaveTitle(btn, true, () => { toIso(); isoBox.classList.add('arrive'); });
  const resume = btn => {
    const p = saved && Object.hasOwn(CONFIG.paths, saved.s) && Number.isFinite(saved.x) ? saved : null;
    leaveTitle(btn, false, () => (p ? enterPath(p.s, p.x) : toIso()));
  };
  isoBox.addEventListener('animationend', e => { if (e.target === isoBox) isoBox.classList.remove('arrive'); });

  /* --- 2. the island --- */
  function setIso(x, y) { hx = x; hy = y; hero.style.setProperty('--x', x); hero.style.setProperty('--y', y); }
  async function isoWalk(x, y, pose) {
    const ms = reduce ? 0 : Math.hypot(x - hx, y - hy) * 40;
    hero.dataset.pose = pose;
    if (x !== hx) hero.classList.toggle('flip', x < hx);
    hero.classList.add('walking');
    hero.style.setProperty('--t', ms + 'ms');
    setIso(x, y);
    await sleep(ms);
    hero.classList.remove('walking');
  }
  function isoLayout() {
    const h = isoBox.clientHeight;
    $$('.way', isoBox).forEach(b => {
      const w = CONFIG.iso.ways[b.dataset.way];
      b.style.setProperty('--x', w.label[0]);
      b.style.setProperty('--y', w.label[1]);
      b.style.setProperty('--lead', Math.max(0, (w.path.at(-1)[1] - w.label[1]) / 200 * h - 6) + 'px');
    });
    // on narrow screens the island is wider than the view: keep her in the middle
    const r = hero.getBoundingClientRect(), v = isoView.getBoundingClientRect();
    isoView.scrollLeft += r.left + r.width / 2 - (v.left + v.width / 2);
  }
  function pickWay(w, quiet) {
    way = w;
    if (!quiet) { hero.dataset.pose = 'side'; hero.classList.toggle('flip', w === 'side'); }
  }
  async function toIso(from, replace) {
    cancelAnimationFrame(raf);
    show('iso', replace);
    isoBox.append(hero);
    hero.style.setProperty('--t', '0ms');
    hero.style.setProperty('--h', CONFIG.iso.heroH);
    const fork = CONFIG.iso.fork;
    if (from) {
      setIso(...CONFIG.iso.ways[from].path.at(-1));
      pickWay(from, true);
    } else {
      setIso(...fork);
      hero.dataset.pose = 'front';
      hero.classList.remove('flip');
      pickWay(way, true);
    }
    requestAnimationFrame(isoLayout);
    say("Hi, I'm Saulė! Pick a path: the main path has my uni projects, the side quests my NGO work and photography.");
    if (from) {
      busy = true;
      for (const [x, y] of [...CONFIG.iso.ways[from].path].reverse().slice(1)) await isoWalk(x, y, 'side');
      await isoWalk(...fork, 'side');
      hero.dataset.pose = 'front';
      hero.classList.remove('flip');
      busy = false;
    }
    // no auto-focus here: a focused path would light up before anyone hovers it (arrow keys still pick one)
    document.activeElement?.blur();
  }
  async function goWay(w) {
    if (busy) return;
    busy = true;
    pickWay(w, true);
    for (const [x, y] of CONFIG.iso.ways[w].path) await isoWalk(x, y, 'up');
    await wipe(() => enterPath(w));
    busy = false;
  }

  /* --- 3. side-scrolling paths --- */
  function layout() {
    const below = touch.matches ? Math.min(innerHeight * .34, 250) : 70;
    s = Math.min((innerHeight - below) / 180, Math.max(innerWidth / 220, (innerHeight - below) / 360));
    game.style.setProperty('--s', s);
    game.style.setProperty('--below', below + 'px');
  }
  function enterPath(name, at, replace) {
    cancelAnimationFrame(raf);
    P = CONFIG.paths[name];
    cur = name;
    show(name, replace);
    const scene = $(`[data-scene="${name}"]`, game), track = $('.track', scene);
    track.style.setProperty('--sw', P.width);
    $$('.spot', track).forEach(b => b.style.setProperty('--x', P.stops[b.dataset.stop]));
    track.append(hero);
    hero.style.setProperty('--t', '0ms');
    hero.style.setProperty('--h', CONFIG.heroH);
    hero.style.setProperty('--y', CONFIG.groundY);
    hero.dataset.pose = 'side';
    hero.classList.remove('flip', 'walking');
    // at: a stop's name, or an x position when resuming
    heroX = typeof at === 'number' ? clamp(at, P.start, (P.flag || P.width) - 20) : at ? P.stops[at] : P.start;
    stopWalking();
    near = undefined;
    layout();
    render();
    last = 0;
    raf = requestAnimationFrame(tick);
  }
  function render() {
    const scene = $(`[data-scene="${cur}"]`, game), full = P.width * s;
    const cam = full <= innerWidth ? (full - innerWidth) / 2 : clamp(heroX * s - innerWidth / 2, 0, full - innerWidth);
    $('.track', scene).style.setProperty('--cam', -cam + 'px');
    $('.sky', scene).style.setProperty('--bx', -cam * .2 + 'px');
    $('.far', scene).style.setProperty('--bx', -cam * .5 + 'px');
    hero.style.setProperty('--x', heroX);
    // open the dialogue for the closest stop in reach
    let best = null, bd = CONFIG.reach;
    for (const [key, x] of Object.entries(P.stops)) if (Math.abs(x - heroX) < bd) { bd = Math.abs(x - heroX); best = key; }
    if (best !== near) {
      near = best;
      if (best) {
        typing++;
        line.hidden = true;
        stops.forEach(st => { st.hidden = st.dataset.stop !== best; });
      } else {
        say(cur === 'main' ? (touch.matches ? 'Main path. Hold ◀ ▶ to walk to a level.' : 'Main path. Hold ← → to walk to a level.')
          : (touch.matches ? 'Side quests. Hold ◀ ▶ to walk.' : 'Side quests. Hold ← → to walk.'));
        near = null;
      }
    }
  }
  function tick(t) {
    raf = requestAnimationFrame(tick);
    const dt = last ? Math.min((t - last) / 1000, .05) : 0;
    last = t;
    if ($('dialog[open]')) stopWalking();
    let d = dir;
    if (!d && goal !== null) {
      if (Math.abs(goal - heroX) < 1.5) { heroX = goal; goal = null; } else d = Math.sign(goal - heroX);
    }
    if (d) {
      heroX += d * CONFIG.speed * dt;
      hero.dataset.pose = 'side';
      hero.classList.toggle('flip', d < 0);
      hero.classList.add('walking');
      if (heroX < 8 || heroX >= P.flag) { leavePath(); return; }
      heroX = Math.min(heroX, P.width - 16);
    } else {
      hero.classList.remove('walking');
      if (near) { hero.dataset.pose = 'front'; hero.classList.remove('flip'); }
    }
    render();
  }
  async function leavePath() {
    cancelAnimationFrame(raf);
    stopWalking();
    hero.classList.remove('walking');
    busy = true;
    const from = cur;
    await wipe(() => toIso(from));
    busy = false;
  }

  /* --- input --- */
  function act(k) {
    if (busy || $('dialog[open]')) return;
    if (state === 'title') return k === 'a' && startGame();
    if (state === 'iso') {
      if (k === 'left' || k === 'right') { const w = k === 'left' ? 'side' : 'main'; return way === w ? goWay(w) : pickWay(w); }
      if (k === 'a') return goWay(way);
    }
    if ((state === 'main' || state === 'side') && k === 'a' && near) $(`.stop[data-stop="${near}"] .btn`, game).click();
  }
  const DIRS = { ArrowLeft: -1, a: -1, A: -1, ArrowRight: 1, d: 1, D: 1 };
  document.addEventListener('keydown', e => {
    if ($('dialog[open]') || e.metaKey || e.ctrlKey || e.altKey) return;
    if (state === 'title') {
      const items = $$('.menu button', title), i = items.indexOf(document.activeElement);
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        items[(Math.max(i, 0) + (e.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length].focus();
      }
      return;
    }
    if (e.key === 'Escape') { e.preventDefault(); return pause(); }
    const onControl = e.target.closest('a, button');
    if (state === 'iso') {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        pickWay(e.key === 'ArrowLeft' ? 'side' : 'main');
        $(`.way[data-way="${way}"]`, isoBox).focus({ preventScroll: true });
      } else if (e.key === 'Enter' && !onControl) act('a');
      return;
    }
    if (DIRS[e.key]) { e.preventDefault(); if (!e.repeat) { dir = DIRS[e.key]; goal = null; } }
    else if (e.key === 'Enter' && !onControl) act('a');
  });
  document.addEventListener('keyup', e => { if (DIRS[e.key] && DIRS[e.key] === dir) dir = 0; });
  addEventListener('blur', stopWalking);

  $$('.menu button', title).forEach(b => b.addEventListener('click', () => {
    if (b.dataset.menu === 'start') startGame(b);
    if (b.dataset.menu === 'about') openLocal($('#about-me'));
    if (b.dataset.menu === 'resume') resume(b);
  }));
  $$('.way', isoBox).forEach(b => b.addEventListener('click', () => goWay(b.dataset.way)));
  $$('.spot', game).forEach(b => b.addEventListener('click', () => {
    if (busy) return;
    if (near === b.dataset.stop) return act('a');
    goal = P.stops[b.dataset.stop];
  }));
  $$('.pad .dir', game).forEach(b => {
    const v = +b.dataset.dir;
    b.addEventListener('pointerdown', e => {
      e.preventDefault();
      if (state === 'iso') return act(v < 0 ? 'left' : 'right');
      dir = v;
      goal = null;
    });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(t => b.addEventListener(t, () => { if (dir === v) dir = 0; }));
  });
  $('.pad .ab', game).addEventListener('click', () => act('a'));
  function pause() {
    stopWalking();
    goIso.textContent = state === 'main' || state === 'side' ? 'Exit to world map' : 'World map';
    menu.showModal();
  }
  $('.pause', game).addEventListener('click', pause);
  goIso.addEventListener('click', () => {
    menu.close();
    if (state === 'main' || state === 'side') leavePath();
    else if (state !== 'iso') toIso();
  });
  $('[data-goto="title"]', menu).addEventListener('click', () => { menu.close(); toTitle(); });
  addEventListener('resize', () => {
    if (state === 'main' || state === 'side') { layout(); render(); }
    if (state === 'iso') isoLayout();
    if (state === 'title') { kick(); startBowl(); }
  });

  // Links like /#eldora, /#side-quests or /#contacts jump straight to that place.
  function route() {
    if (busy) return;
    const h = location.hash.slice(1);
    const path = Object.keys(CONFIG.paths).find(p => h in CONFIG.paths[p].stops);
    if (h === 'world') return toIso(null, true);
    if (h === 'main-path') return enterPath('main', null, true);
    if (h === 'side-quests') return enterPath('side', null, true);
    if (path) return enterPath(path, h, true);
    toTitle(true);
    if (h === 'about' || h === 'contacts') openLocal($(h === 'contacts' ? '#contacts' : '#about-me'));
  }
  addEventListener('hashchange', route);
  route();
})();
