// ==================== CONTACT DRAWER ====================
(function () {
  const drawer  = document.getElementById('contactDrawer');
  const overlay = document.getElementById('drawerOverlay');

  function openDrawer() {
    drawer.classList.add('is-open');
    overlay.classList.add('is-open');
    drawer.setAttribute('aria-hidden', 'false');
  }

  function closeDrawer() {
    drawer.classList.remove('is-open');
    overlay.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
  }

  document.getElementById('contactBtn').addEventListener('click', openDrawer);
  document.getElementById('drawerClose').addEventListener('click', closeDrawer);
  document.getElementById('drawerCancel').addEventListener('click', closeDrawer);
  overlay.addEventListener('click', closeDrawer);
})();


(function () {
  const wrapper = document.getElementById('demo-cards-wrapper');
  const checkboxes = document.querySelectorAll('.filter-cb');

  let allCards = [];

  const detailBase = window.DEMOS_URL.replace(/data\/demos\.json$/, '') + 'demo/';

  function buildCard(demo) {
    const tagAttr = demo.tags.join(' ').toLowerCase();
    const pillsHTML = demo.tags
      .map(t => `<span class="pill-tag">${t}</span>`)
      .join('');

    const a = document.createElement('a');
    a.className = 'card-item';
    a.href = detailBase + '?id=' + encodeURIComponent(demo.slug);
    a.dataset.tags = tagAttr;
    a.innerHTML = `
      <div class="pill-container">${pillsHTML}</div>
      <h4>${demo.title}</h4>
      <p>${demo.summary}</p>
    `;
    return a;
  }

  function getActiveFilters() {
    return Array.from(checkboxes)
      .filter(cb => cb.checked)
      .map(cb => cb.value.toLowerCase());
  }

  function applyFilter() {
    const active = getActiveFilters();
    allCards.forEach(({ el, tags }) => {
      const visible =
        active.length === 0 ||
        active.every(f => tags.includes(f));
      el.style.display = visible ? '' : 'none';
    });
  }

  fetch(window.DEMOS_URL)
    .then(r => r.json())
    .then(demos => {
      demos.forEach(demo => {
        const el = buildCard(demo);
        wrapper.appendChild(el);
        allCards.push({ el, tags: demo.tags.map(t => t.toLowerCase()) });
      });
      applyFilter();
    });

  checkboxes.forEach(cb => cb.addEventListener('change', applyFilter));
})();

// ==================== DEMO DETAIL PAGE ====================
(function () {
  const container = document.getElementById('demoDetailContent');
  if (!container) return; // only runs on the detail page

  const slug = new URLSearchParams(window.location.search).get('id');

  fetch(window.DEMOS_URL)
    .then(r => r.json())
    .then(demos => {
      const demo = demos.find(d => d.slug === slug);
      if (!demo) {
        container.innerHTML = '<p class="demo-detail-missing">Demo not found.</p>';
        return;
      }
      document.title = demo.title + ' — IBM DSCE';
      const pillsHTML = demo.tags
        .map(t => `<span class="pill-tag">${t}</span>`)
        .join('');
      container.innerHTML = `
        <div class="pill-container">${pillsHTML}</div>
        <h1 class="demo-detail-title">${demo.title}</h1>
        <p class="demo-detail-summary">${demo.summary}</p>
      `;
    });
})();

