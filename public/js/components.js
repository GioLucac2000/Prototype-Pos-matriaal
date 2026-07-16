/* ============================================================
   Keymerch — herbruikbare UI-componenten.
   ============================================================ */

(function () {
  'use strict';

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function refreshIcons(root) {
    if (window.lucide) lucide.createIcons({ attrs: {}, nameAttr: 'data-lucide' });
  }

  // ---------- Status badges ----------
  const BADGE_MAP = {
    'Geleverd': ['good', 'check-circle-2'],
    'Goedgekeurd': ['good', 'check-circle-2'],
    'Actief': ['good', 'circle-check'],
    'Bevestigd': ['info', 'badge-check'],
    'In levering': ['info', 'truck'],
    'In review': ['warn', 'search'],
    'In behandeling': ['warn', 'loader'],
    'Gepland': ['neutral', 'calendar'],
    'Nieuw': ['accent', 'sparkle'],
    'Concept': ['neutral', 'file-pen-line'],
    'Geannuleerd': ['crit', 'x-circle'],
    'Afgewezen': ['crit', 'x-circle'],
    'Inactief': ['neutral', 'circle-off'],
    'Prospect': ['info', 'compass'],
    'Afgerond': ['neutral', 'flag'],
    'Retour laat': ['serious', 'alert-triangle'],
  };

  function badge(status) {
    const [kind, ic] = BADGE_MAP[status] || ['neutral', 'circle'];
    return `<span class="badge badge-${kind}"><i data-lucide="${ic}"></i>${esc(status)}</span>`;
  }

  // ---------- KPI's ----------
  function deltaHtml(delta, label, abs, invert) {
    if (delta === null || delta === undefined) return `<span class="muted">${esc(label || '')}</span>`;
    const good = invert ? delta < 0 : delta > 0;
    const dir = delta === 0 ? 'flat' : good ? 'up' : 'down';
    const ic = delta > 0 ? 'trending-up' : delta < 0 ? 'trending-down' : 'minus';
    const val = abs
      ? (delta > 0 ? '+' : '') + KM.fmt.dec(delta, Number.isInteger(delta) ? 0 : 1)
      : (delta > 0 ? '+' : '') + KM.fmt.dec(delta, 1) + '%';
    return `<span class="delta ${dir}"><i data-lucide="${ic}"></i>${val}</span><span>${esc(label || '')}</span>`;
  }

  function kpiRow(kpis) {
    return `<div class="kpi-grid">${kpis.map((k) => `
      <div class="kpi-card">
        <div class="kpi-label"><i data-lucide="${k.icon || 'activity'}"></i>${esc(k.label)}</div>
        <div class="kpi-value">${esc(k.value)}${k.unit ? `<span class="kpi-unit">${esc(k.unit)}</span>` : ''}</div>
        <div class="kpi-foot">${deltaHtml(k.delta, k.deltaLabel, k.deltaAbs, k.invert)}</div>
      </div>`).join('')}</div>`;
  }

  // ---------- Empty state ----------
  function emptyState(ic, title, msg, actionLabel) {
    return `<div class="empty-state">
      <div class="es-icon"><i data-lucide="${ic}"></i></div>
      <div class="es-title">${esc(title)}</div>
      <div class="es-msg">${esc(msg)}</div>
      ${actionLabel ? `<button class="btn btn-sm es-action">${esc(actionLabel)}</button>` : ''}
    </div>`;
  }

  // ---------- Skeletons ----------
  function skeletonDashboard() {
    return `
      <div class="kpi-grid">${'<div class="skeleton skel-kpi"></div>'.repeat(4)}</div>
      <div class="charts-row"><div class="skeleton skel-chart"></div><div class="skeleton skel-chart"></div></div>
      <div class="skeleton skel-table"></div>`;
  }
  function skeletonTable() {
    return `<div class="kpi-grid">${'<div class="skeleton skel-kpi"></div>'.repeat(4)}</div><div class="skeleton skel-table"></div>`;
  }

  // ---------- Data table ----------
  /**
   * config: {
   *   columns: [{ key, label, sortable, num, render(row), width }],
   *   rows, searchKeys, searchPlaceholder,
   *   filters: [{ key, label, options }],
   *   pageSize, onRowClick(row), getRowId(row), selectedId,
   *   empty: { icon, title, msg }, footerNote
   * }
   */
  class DataTable {
    constructor(container, config) {
      this.c = container;
      this.cfg = Object.assign({ pageSize: 10, searchKeys: [], filters: [] }, config);
      this.state = { q: '', filters: {}, sortKey: config.initialSort || null, sortDir: config.initialSortDir || 'desc', page: 1 };
      this.selectedId = config.selectedId || null;
      this.renderShell();
      this.renderBody();
    }

    filteredRows() {
      const { q, filters, sortKey, sortDir } = this.state;
      let rows = this.cfg.rows.slice();
      if (q) {
        const needle = q.toLowerCase();
        rows = rows.filter((r) => this.cfg.searchKeys.some((k) => String(r[k] ?? '').toLowerCase().includes(needle)));
      }
      for (const [k, v] of Object.entries(filters)) {
        if (v) rows = rows.filter((r) => String(r[k]) === v);
      }
      if (sortKey) {
        const dir = sortDir === 'asc' ? 1 : -1;
        rows.sort((a, b) => {
          const av = a[sortKey], bv = b[sortKey];
          if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
          return String(av).localeCompare(String(bv), 'nl') * dir;
        });
      }
      return rows;
    }

    renderShell() {
      const f = this.cfg;
      this.c.classList.add('card');
      this.c.innerHTML = `
        ${f.title ? `<div class="card-header"><div><div class="card-title">${esc(f.title)}</div>${f.subtitle ? `<div class="card-sub">${esc(f.subtitle)}</div>` : ''}</div>${f.headerActions || ''}</div>` : ''}
        <div class="toolbar">
          <div class="search-box"><i data-lucide="search"></i><input type="search" placeholder="${esc(f.searchPlaceholder || 'Zoeken…')}" aria-label="Zoeken"></div>
          ${f.filters.map((fl) => `
            <select class="filter-select" data-filter="${esc(fl.key)}" aria-label="${esc(fl.label)}">
              <option value="">${esc(fl.label)}: alle</option>
              ${fl.options.map((o) => `<option value="${esc(o)}">${esc(o)}</option>`).join('')}
            </select>`).join('')}
          <span class="toolbar-meta"></span>
        </div>
        <div class="table-scroll"><table class="data-table">
          <thead><tr>${f.columns.map((col) => `
            <th class="${col.num ? 'num' : ''} ${col.sortable ? 'sortable' : ''}" data-key="${esc(col.key)}" ${col.width ? `style="width:${col.width}"` : ''}>
              <span class="th-inner">${esc(col.label)}${col.sortable ? '<i data-lucide="chevrons-up-down"></i>' : ''}</span>
            </th>`).join('')}</tr></thead>
          <tbody></tbody>
        </table></div>
        <div class="pagination"></div>`;

      const search = this.c.querySelector('.search-box input');
      let deb;
      search.addEventListener('input', () => {
        clearTimeout(deb);
        deb = setTimeout(() => { this.state.q = search.value.trim(); this.state.page = 1; this.renderBody(); }, 140);
      });
      this.c.querySelectorAll('.filter-select').forEach((sel) => {
        sel.addEventListener('change', () => {
          this.state.filters[sel.dataset.filter] = sel.value;
          sel.classList.toggle('has-value', !!sel.value);
          this.state.page = 1;
          this.renderBody();
        });
      });
      this.c.querySelectorAll('th.sortable').forEach((th) => {
        th.addEventListener('click', () => {
          const key = th.dataset.key;
          if (this.state.sortKey === key) this.state.sortDir = this.state.sortDir === 'asc' ? 'desc' : 'asc';
          else { this.state.sortKey = key; this.state.sortDir = 'desc'; }
          this.renderBody();
        });
      });
      refreshIcons(this.c);
    }

    renderBody() {
      const f = this.cfg;
      const rows = this.filteredRows();
      const pages = Math.max(1, Math.ceil(rows.length / f.pageSize));
      if (this.state.page > pages) this.state.page = pages;
      const start = (this.state.page - 1) * f.pageSize;
      const pageRows = rows.slice(start, start + f.pageSize);

      // sort-indicatoren
      this.c.querySelectorAll('th.sortable').forEach((th) => {
        const active = th.dataset.key === this.state.sortKey;
        th.classList.toggle('sorted', active);
        const inner = th.querySelector('.th-inner');
        inner.querySelectorAll('i, svg').forEach((n) => n.remove());
        const iEl = document.createElement('i');
        iEl.setAttribute('data-lucide', active ? (this.state.sortDir === 'asc' ? 'chevron-up' : 'chevron-down') : 'chevrons-up-down');
        inner.appendChild(iEl);
      });

      const tbody = this.c.querySelector('tbody');
      if (!pageRows.length) {
        const e = f.empty || { icon: 'search-x', title: 'Geen resultaten', msg: 'Pas uw zoekopdracht of filters aan.' };
        tbody.innerHTML = `<tr><td colspan="${f.columns.length}">${emptyState(e.icon, e.title, e.msg)}</td></tr>`;
      } else {
        tbody.innerHTML = pageRows.map((row) => {
          const id = f.getRowId ? f.getRowId(row) : null;
          const sel = id !== null && id === this.selectedId;
          return `<tr class="${f.onRowClick ? 'clickable' : ''} ${sel ? 'selected' : ''}" ${id !== null ? `data-row-id="${esc(id)}"` : ''}>
            ${f.columns.map((col) => `<td class="${col.num ? 'num' : ''}">${col.render ? col.render(row) : esc(row[col.key] ?? '')}</td>`).join('')}
          </tr>`;
        }).join('');
        if (f.onRowClick) {
          tbody.querySelectorAll('tr.clickable').forEach((tr) => {
            tr.addEventListener('click', () => {
              const row = pageRows.find((r) => String(f.getRowId(r)) === tr.dataset.rowId);
              if (row) { this.selectedId = f.getRowId(row); this.renderBody(); f.onRowClick(row); }
            });
          });
        }
      }

      this.c.querySelector('.toolbar-meta').textContent = `${rows.length} van ${f.rows.length} rijen`;

      // paginering
      const pag = this.c.querySelector('.pagination');
      const from = rows.length ? start + 1 : 0;
      const to = Math.min(start + f.pageSize, rows.length);
      let pageBtns = '';
      const win = 5;
      let p0 = Math.max(1, this.state.page - Math.floor(win / 2));
      let p1 = Math.min(pages, p0 + win - 1);
      p0 = Math.max(1, p1 - win + 1);
      for (let p = p0; p <= p1; p++) {
        pageBtns += `<button class="page-btn ${p === this.state.page ? 'active' : ''}" data-page="${p}">${p}</button>`;
      }
      pag.innerHTML = `
        <span class="page-info">${from}–${to} van ${rows.length}</span>
        ${f.footerNote ? `<span class="muted">· ${esc(f.footerNote)}</span>` : ''}
        <div class="page-btns">
          <button class="page-btn" data-page="prev" ${this.state.page <= 1 ? 'disabled' : ''} aria-label="Vorige"><i data-lucide="chevron-left"></i></button>
          ${pageBtns}
          <button class="page-btn" data-page="next" ${this.state.page >= pages ? 'disabled' : ''} aria-label="Volgende"><i data-lucide="chevron-right"></i></button>
        </div>`;
      pag.querySelectorAll('.page-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          const p = btn.dataset.page;
          if (p === 'prev') this.state.page--;
          else if (p === 'next') this.state.page++;
          else this.state.page = Number(p);
          this.renderBody();
        });
      });

      refreshIcons(this.c);
    }

    setRows(rows) { this.cfg.rows = rows; this.state.page = 1; this.renderBody(); }
    select(id) { this.selectedId = id; this.renderBody(); }
  }

  // ---------- Chart legend (HTML, vaste volgorde) ----------
  function chartLegend(items) {
    return `<div class="chart-legend">${items.map((i) => `
      <span class="legend-item"><span class="legend-swatch" style="background:var(${i.colorVar})"></span>${esc(i.label)}${i.value !== undefined ? ` <span class="legend-val">${esc(i.value)}</span>` : ''}</span>`).join('')}</div>`;
  }

  window.KMC = { esc, badge, kpiRow, deltaHtml, emptyState, skeletonDashboard, skeletonTable, DataTable, chartLegend, refreshIcons };
})();
