(() => {
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Hero name: letters rise out of a mask, line by line.
  const h = document.querySelector('.hero h1');
  if (h) {
    if (!still) {
      const lines = h.innerHTML.split('<br>');
      let n = 0;
      h.setAttribute('aria-label', lines.join(' '));
      h.innerHTML = lines.map(l => '<span class="ln" aria-hidden="true">' +
        [...l].map(c => `<span style="--i:${n++}">${c}</span>`).join('') + '</span>').join('');
    }
    h.classList.add('ready');
  }

  // Case studies open in a popup with a visible Close button. Without JS the link goes to the full page.
  const d = document.getElementById('case');
  if (d && d.showModal) {
    const body = d.querySelector('.cbody');
    document.addEventListener('click', async e => {
      const a = e.target.closest('a[data-case]');
      if (!a || e.metaKey || e.ctrlKey || e.shiftKey) return;
      e.preventDefault();
      try {
        const url = new URL(a.href);
        const html = await (await fetch(url.pathname)).text();
        const art = new DOMParser().parseFromString(html, 'text/html').querySelector('article');
        body.replaceChildren(art);
        d.setAttribute('aria-label', art.querySelector('h1').textContent);
        d.showModal();
        d.scrollTop = 0;
        const target = url.hash && body.querySelector(url.hash);
        if (target) target.scrollIntoView();
      } catch { location.href = a.href; }
    });
    d.addEventListener('click', e => { if (e.target === d) d.close(); });
    d.addEventListener('close', () => body.replaceChildren());
  }
})();
