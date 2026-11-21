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
      main: { width: 1100, start: 70, stops: { lekalas: 315, eldora: 590, 'dhl-care': 885 } },
      side: { width: 900, start: 70, stops: { ngo: 330, photography: 670 } }
    },
    groundY: 150, heroH: 37,  // hero size on the paths
    reach: 60,                // how close she must be for a dialogue to open
    speed: 85                 // walking speed, picture pixels per second
  };

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  /* ================= books ================= */
  // Short chapter names for the tabs, keyed by section id.
  const MK = {
    idea: 'The story', brand: 'Mission briefing', research: 'Research', scenarios: 'Characters', segments: 'Characters',
    competitors: 'Rivals', competition: 'Rivals', interdependencies: 'Game mechanics', business: 'Economy', kpis: 'Scoring',
    findings: 'Tips and tricks', reflection: "Developer's notes", identity: 'Art direction', screens: 'Stage select',
    walkthrough: 'Gameplay', sources: 'Credits', alleys: 'Main stage', fragments: 'Bonus stage', posters: 'Collectibles'
  };
  const label = art => $$('section.blk[id]', art).forEach(s => {
    const h = $('h2', s);
    if (h && MK[s.id]) h.dataset.mk = MK[s.id];
  });

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
      li.innerHTML = `<a href="#${s.id}"><span><small></small></span><i></i><b>${i + 3}</b></a>`;
      $('small', li).textContent = MK[s.id] || '';
      $('span', li).append($('h2', s).textContent);
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
    const spreads = () => Math.max(1, Math.round((flow.scrollWidth + gap()) / pitch()));
    const measure = () => {
      flow.style.setProperty('--ph', flow.clientHeight + 'px');
      book.starts = book.pages.map(p => Math.floor((p.offsetLeft + 2) / pitch()));
    };
    const turn = i => {
      const n = spreads();
      book.spread = clamp(i, 0, n - 1);
      flow.scrollLeft = book.spread * pitch();
      prev.disabled = book.spread === 0;
      next.disabled = book.spread === n - 1;
      const c = cols(), first = book.spread * c + 1, total = n * c;
      folio.textContent = c === 2 ? `pages ${first}-${Math.min(first + 1, total)} of ${total}` : `page ${first} of ${total}`;
      let active = 0;
      book.starts.forEach((s, k) => { if (s <= book.spread) active = k; });
      [...tabs.children].forEach((t, k) => t.setAttribute('aria-current', k === active));
    };
    const build = () => {
      book.pages = $$(':scope > .wrap > .chead, :scope > .wrap > section.blk', book.art).filter(p => !p.hidden);
      tabs.replaceChildren(...book.pages.map((p, k) => {
        const t = document.createElement('button');
        t.type = 'button';
        t.className = 'tab';
        const h2 = $('h2', p);
        t.textContent = p.matches('.chead') ? $('h1', p).textContent : (h2.dataset.mk || h2.textContent);
        t.addEventListener('click', () => turn(book.starts[k]));
        return t;
      }));
      measure();
    };
    const open = (art, home, target) => {
      book.art = art;
      book.home = home;
      label(art);
      $$('img', art).forEach(img => { img.loading = 'eager'; });
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
    bookD.addEventListener('close', () => {
      if (book.home) book.home.append(book.art); else flow.replaceChildren();
      book.art = null;
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
  const menu = $('#menu'), exitD = $('#exit');
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
  title.style.touchAction = 'none';
  const reveal = e => {
    if (title.classList.contains('zooming')) return;
    const r = art.getBoundingClientRect();
    art.style.setProperty('--mx', e.clientX - r.left + 'px');
    art.style.setProperty('--my', e.clientY - r.top + 'px');
    title.classList.add('reveal');
  };
  title.addEventListener('pointermove', reveal);
  title.addEventListener('pointerdown', reveal);
  title.addEventListener('pointerleave', () => title.classList.remove('reveal'));
  title.addEventListener('pointerup', e => { if (e.pointerType === 'touch') title.classList.remove('reveal'); });

  function toTitle(replace) {
    cancelAnimationFrame(raf);
    show('title', replace);
    title.classList.remove('zooming', 'reveal');
    if (!replace) $('.menu button', title).focus({ preventScroll: true });  // not on first load
  }

  // Zoom into the mirror, break it into chunky pixels, then dissolve into the island.
  async function startGame() {
    if (busy) return;
    busy = true;
    if (!reduce) {
      title.classList.add('zooming');
      await sleep(850);
      const img = $('.px img', title);
      await img.decode().catch(() => {});
      const vw = innerWidth, vh = innerHeight, W = img.naturalWidth, H = img.naturalHeight;
      const gx = .236, gy = .342, gw = .30, gh = .337;  // the mirror glass, as fractions of the picture
      let sw = gw * W, sh = sw * vh / vw;
      if (sh > gh * H) { sh = gh * H; sw = sh * vw / vh; }
      const sx = (gx + gw / 2) * W - sw / 2, sy = (gy + gh / 2) * H - sh / 2;
      const ctx = zoomCv.getContext('2d');
      game.classList.add('pixelating');
      for (const n of [120, 64, 36, 22]) {
        zoomCv.width = n;
        zoomCv.height = Math.max(1, Math.round(n * vh / vw));
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, zoomCv.width, zoomCv.height);
        await sleep(160);
      }
    }
    toIso();
    if (!reduce) {
      zoomCv.classList.add('fade');
      await sleep(520);
      game.classList.remove('pixelating');
      zoomCv.classList.remove('fade');
    }
    title.classList.remove('zooming');
    busy = false;
  }

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
    $$('.way', isoBox).forEach(b => b.classList.toggle('on', b.dataset.way === w));
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
    $(`.way[data-way="${way}"]`, isoBox).focus({ preventScroll: true });
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
    heroX = at ? P.stops[at] : P.start;
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
      if (heroX < 8) { leavePath(); return; }
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
    if (e.key === 'Escape') { e.preventDefault(); stopWalking(); return menu.showModal(); }
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
    if (b.dataset.menu === 'start') startGame();
    if (b.dataset.menu === 'about') openLocal($('#about-me'));
    if (b.dataset.menu === 'exit') exitD.showModal();
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
  $('.pause', game).addEventListener('click', () => { stopWalking(); menu.showModal(); });
  $('[data-goto="iso"]', menu).addEventListener('click', () => {
    menu.close();
    if (state === 'main' || state === 'side') leavePath();
    else if (state !== 'iso') toIso();
  });
  $('[data-goto="title"]', menu).addEventListener('click', () => { menu.close(); toTitle(); });
  addEventListener('resize', () => {
    if (state === 'main' || state === 'side') { layout(); render(); }
    if (state === 'iso') isoLayout();
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
