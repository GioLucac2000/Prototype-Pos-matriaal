/* ============================================================
   Keymerch prototype — gedeelde shell: navbar, thema,
   notificaties, toasts. Geen storage: alles in-memory.
   ============================================================ */

(function () {
  'use strict';

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function icons() { if (window.lucide) lucide.createIcons(); }

  // ---------- Thema ----------
  function toggleTheme() {
    const root = document.documentElement;
    const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    document.querySelectorAll('[data-theme-toggle]').forEach((b) => {
      b.innerHTML = `<i data-lucide="${next === 'dark' ? 'sun' : 'moon'}"></i>`;
    });
    icons();
    document.dispatchEvent(new CustomEvent('themechange'));
  }

  // ---------- Navbar (portalen) ----------
  function navbar(container, opts) {
    container.className = 'navbar';
    container.innerHTML = `
      <a class="back-link" href="index.html"><i data-lucide="arrow-left" class="icon"></i>Omgevingskeuze</a>
      <div class="nav-title">
        <span class="nav-logo">K</span>
        <span class="nav-name">Keymerch</span>
        <span class="nav-portal">${esc(opts.portal)}</span>
      </div>
      <div class="nav-right">
        ${opts.extra || ''}
        <div class="bell-wrap">
          <button class="icon-btn" id="bell-btn" aria-label="Notificaties">
            <i data-lucide="bell"></i><span class="bell-badge">3</span>
          </button>
          <div class="bell-dropdown" id="bell-dropdown" hidden>
            <div class="bell-head">Notificaties <span>3 nieuw</span></div>
            ${KMDATA.NOTIFICATIONS.map((n) => `<button class="bell-item">${esc(n.text)}<span class="bi-time">${esc(n.time)}</span></button>`).join('')}
          </div>
        </div>
        <button class="icon-btn" data-theme-toggle aria-label="Thema wisselen"><i data-lucide="moon"></i></button>
      </div>`;

    const btn = container.querySelector('#bell-btn');
    const dd = container.querySelector('#bell-dropdown');
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      dd.hidden = !dd.hidden;
    });
    document.addEventListener('click', (e) => {
      if (!dd.hidden && !dd.contains(e.target) && e.target !== btn) dd.hidden = true;
    });
    container.querySelector('[data-theme-toggle]').addEventListener('click', toggleTheme);
    icons();
  }

  // ---------- Toast ----------
  function toast(title, msg, kind = 'good') {
    let c = document.getElementById('toasts');
    if (!c) {
      c = document.createElement('div');
      c.id = 'toasts';
      c.className = 'toasts';
      document.body.appendChild(c);
    }
    const el = document.createElement('div');
    el.className = `toast ${kind}`;
    el.innerHTML = `<i data-lucide="${kind === 'info' ? 'info' : 'circle-check-big'}"></i><div><strong>${esc(title)}</strong>${msg ? esc(msg) : ''}</div>`;
    c.appendChild(el);
    icons();
    setTimeout(() => { el.classList.add('leaving'); setTimeout(() => el.remove(), 300); }, 3800);
  }

  // ---------- Chart-kleuren uit tokens ----------
  function cssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }
  function chartDefaults() {
    return {
      grid: cssVar('--offset-2'),
      ticks: cssVar('--text-3'),
      surface: cssVar('--surface'),
      border: cssVar('--offset'),
      text1: cssVar('--text-1'),
      text2: cssVar('--text-2'),
    };
  }
  function tooltipStyle() {
    const c = chartDefaults();
    return {
      backgroundColor: c.surface, borderColor: c.border, borderWidth: 1,
      titleColor: c.text1, bodyColor: c.text2, footerColor: c.text1,
      titleFont: { family: 'Inter', size: 12, weight: '600' },
      bodyFont: { family: 'Inter', size: 12 },
      footerFont: { family: 'Inter', size: 11.5, weight: '600' },
      padding: 10, cornerRadius: 6, boxPadding: 4, usePointStyle: true,
    };
  }

  window.Shell = { esc, icons, toggleTheme, navbar, toast, cssVar, chartDefaults, tooltipStyle };
})();
