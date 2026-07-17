/* ============================================================
   Keymerch — applicatie: routing, brand switching, 3 omgevingen.
   ============================================================ */

(function () {
  'use strict';

  const { esc, badge, kpiRow, emptyState, skeletonDashboard, skeletonTable, DataTable, chartLegend, refreshIcons, deltaHtml, toast } = KMC;
  const fmt = KM.fmt;

  const state = {
    loggedIn: false,
    brand: 'heineken',
    env: 'insights',
    view: 'overview',
    theme: 'light',
    cart: {},
    orderNote: null,
    aiOpen: false,
  };

  const NAV = {
    insights: {
      label: 'Insights',
      defaultView: 'overview',
      sections: [
        { label: 'Analyse', items: [
          { id: 'overview', label: 'Overzicht', icon: 'layout-dashboard' },
          { id: 'volume', label: 'Volume & rotatie', icon: 'trending-up' },
          { id: 'forecast', label: 'Voorraadprognose', icon: 'chart-line' },
          { id: 'outlets', label: 'Outlets', icon: 'map-pin' },
          { id: 'campaigns', label: 'Campagnes', icon: 'megaphone' },
        ] },
      ],
    },
    orders: {
      label: 'Order Management',
      defaultView: 'orderbook',
      sections: [
        { label: 'Operatie', items: [
          { id: 'orderbook', label: 'Orderbeheer', icon: 'package' },
          { id: 'requests', label: 'Assortimentsverzoeken', icon: 'inbox' },
          { id: 'kegs', label: 'Fustenbeheer', icon: 'cylinder' },
        ] },
      ],
    },
    horeca: {
      label: 'Horeca Portaal',
      defaultView: 'home',
      sections: [
        { label: 'Mijn zaak', items: [
          { id: 'home', label: 'Overzicht', icon: 'house' },
          { id: 'shop', label: 'Bestellen', icon: 'shopping-cart' },
          { id: 'myorders', label: 'Mijn orders', icon: 'receipt' },
          { id: 'assortment', label: 'Assortiment & acties', icon: 'list-plus' },
        ] },
      ],
    },
  };

  const VIEW_LABELS = {};
  Object.values(NAV).forEach((env) => env.sections.forEach((s) => s.items.forEach((i) => { VIEW_LABELS[i.id] = i.label; })));

  const $ = (sel, root = document) => root.querySelector(sel);
  const main = $('#main-content');

  function data() { return KM.getBrandData(state.brand); }

  // =========================================================
  // Shell: sidebar, header, thema
  // =========================================================
  // Orderbeheer is Keymerch-breed: orders van alle merken, met merkfilter.
  function allOrders() {
    const rows = [];
    for (const key of Object.keys(KM.BRAND_DEFS)) {
      const bd = KM.getBrandData(key);
      for (const o of bd.orders) {
        if (!o.key) { o.key = key + ':' + o.id; o.brand = bd.def.name; }
        rows.push(o);
      }
    }
    rows.sort((a, b) => a.daysAgo - b.daysAgo);
    return rows;
  }

  function navCounts(d) {
    return {
      orderbook: allOrders().filter((o) => !['Geleverd', 'Geannuleerd'].includes(o.status)).length,
      requests: d.requests.filter((r) => ['Nieuw', 'In review'].includes(r.status)).length,
      kegs: d.kegs.fleet.overdue,
    };
  }

  function renderSidebarNav() {
    const env = NAV[state.env];
    const counts = navCounts(data());
    $('#sidebar-nav').innerHTML = env.sections.map((sec) => `
      <div class="nav-section-label">${esc(sec.label)}</div>
      ${sec.items.map((it) => `
        <button class="nav-item ${state.view === it.id ? 'active' : ''}" data-view="${it.id}">
          <i data-lucide="${it.icon}"></i><span>${esc(it.label)}</span>
          ${counts[it.id] ? `<span class="nav-count">${counts[it.id]}</span>` : ''}
        </button>`).join('')}
    `).join('');
    $('#sidebar-nav').querySelectorAll('.nav-item').forEach((btn) => {
      btn.addEventListener('click', () => { setView(btn.dataset.view); closeSidebar(); });
    });
    refreshIcons();
  }

  function renderPersona() {
    const def = data().def;
    const [name, role] = def.persona[state.env];
    $('#user-name').textContent = name;
    $('#user-role').textContent = role;
    $('#user-avatar').textContent = name.split(/\s+/).map((w) => w[0]).join('').replace(/[^A-Za-z]/g, '').substring(0, 2).toUpperCase() || 'KM';
  }

  function renderTopbar() {
    $('#topbar-env').textContent = NAV[state.env].label;
    $('#topbar-view').textContent = VIEW_LABELS[state.view] || '';
    document.querySelectorAll('.env-btn').forEach((b) => b.classList.toggle('active', b.dataset.env === state.env));
    document.querySelectorAll('.brand-btn').forEach((b) => b.classList.toggle('active', b.dataset.brand === state.brand));
  }

  function setEnv(env) {
    if (state.env === env) return;
    state.env = env;
    state.view = NAV[env].defaultView;
    state.orderNote = null;
    render(true);
    refreshAgent();
  }

  function refreshAgent() {
    const body = $('#ai-body');
    if (!body) return;
    body.innerHTML = '';
    if (state.aiOpen) aiReset();
  }

  function setView(view) {
    if (state.view === view) return;
    state.view = view;
    state.orderNote = null;
    render(false);
  }

  function setBrand(brand) {
    if (state.brand === brand) return;
    state.brand = brand;
    state.cart = {};
    state.orderNote = null;
    render(true);
    refreshAgent();
  }

  function toggleTheme() {
    state.theme = state.theme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', state.theme);
    $('#theme-toggle').innerHTML = `<i data-lucide="${state.theme === 'light' ? 'moon' : 'sun'}"></i>`;
    refreshIcons();
    renderView(); // charts opnieuw opbouwen met nieuwe token-kleuren
  }

  function closeSidebar() {
    $('#sidebar').classList.remove('open');
    $('#sidebar-scrim').classList.remove('visible');
  }

  // =========================================================
  // Render-cyclus met skeleton loaders
  // =========================================================
  let renderSeq = 0;
  function render(withSkeleton) {
    renderTopbar();
    renderSidebarNav();
    renderPersona();
    const seq = ++renderSeq;
    if (withSkeleton) {
      KMCharts.destroyAll();
      main.innerHTML = `<div class="view">${state.view === 'overview' || state.view === 'volume' || state.view === 'home' ? skeletonDashboard() : skeletonTable()}</div>`;
      setTimeout(() => { if (seq === renderSeq) renderView(); }, 380);
    } else {
      renderView();
    }
  }

  function renderView() {
    KMCharts.destroyAll();
    main.scrollTop = 0;
    const d = data();
    const views = {
      overview: viewInsightsOverview,
      volume: viewVolume,
      forecast: viewForecast,
      outlets: viewOutlets,
      campaigns: viewCampaigns,
      orderbook: viewOrderbook,
      requests: viewRequests,
      kegs: viewKegs,
      home: viewHorecaHome,
      shop: viewShop,
      myorders: viewMyOrders,
      assortment: viewAssortment,
    };
    (views[state.view] || viewInsightsOverview)(d);
    renderTopbar();
    refreshIcons();
  }

  // =========================================================
  // Gedeelde bouwstenen
  // =========================================================
  function viewHeader(title, sub, actionsHtml = '') {
    return `<div class="view-header">
      <div class="view-title-wrap">
        <div class="view-title">${title}</div>
        ${sub ? `<div class="view-sub">${sub}</div>` : ''}
      </div>
      ${actionsHtml ? `<div class="view-header-actions">${actionsHtml}</div>` : ''}
    </div>`;
  }

  function toneBanner(html) {
    return `<div class="tone-banner"><i data-lucide="target"></i><div>${html}</div></div>`;
  }

  function volumeChartsRow(d) {
    const totalOn = d.monthly.reduce((s, m) => s + m.on, 0);
    const totalOff = d.monthly.reduce((s, m) => s + m.off, 0);
    const onPct = Math.round((totalOn / (totalOn + totalOff)) * 100);
    return {
      html: `<div class="charts-row">
        <div class="card">
          <div class="card-header"><div><div class="card-title">${esc(d.def.copy.volumeCard)}</div><div class="card-sub">Laatste 12 maanden · gestapeld per kanaal</div></div></div>
          <div class="card-body"><div class="chart-wrap"><canvas id="chart-bar"></canvas></div></div>
          ${chartLegend([
            { label: 'On-Trade (Horeca)', colorVar: '--series-1', value: fmt.int(totalOn) + ' HL' },
            { label: 'Off-Trade (Retail)', colorVar: '--series-2', value: fmt.int(totalOff) + ' HL' },
          ])}
        </div>
        <div class="card">
          <div class="card-header"><div><div class="card-title">${esc(d.def.copy.channelCard)}</div><div class="card-sub">Aandeel laatste 12 maanden</div></div></div>
          <div class="card-body"><div class="chart-wrap">
            <canvas id="chart-donut"></canvas>
            <div class="donut-center"><span class="dc-val">${onPct}%</span><span class="dc-label">On-Trade</span></div>
          </div></div>
          ${chartLegend([
            { label: 'On-Trade', colorVar: '--series-1', value: onPct + '%' },
            { label: 'Off-Trade', colorVar: '--series-2', value: (100 - onPct) + '%' },
          ])}
        </div>
      </div>`,
      mount() {
        KMCharts.bar($('#chart-bar'), d.monthLabels, [
          { label: 'On-Trade', data: d.monthly.map((m) => m.on), colorVar: '--series-1' },
          { label: 'Off-Trade', data: d.monthly.map((m) => m.off), colorVar: '--series-2' },
        ]);
        KMCharts.donut($('#chart-donut'), [
          { label: 'On-Trade', value: totalOn, colorVar: '--series-1' },
          { label: 'Off-Trade', value: totalOff, colorVar: '--series-2' },
        ]);
      },
    };
  }

  const outletCols = (d) => {
    const maxVol = Math.max(...d.outlets.map((o) => o.volumeYTD));
    return [
      { key: 'name', label: 'Outlet', sortable: true, render: (r) => `<span class="td-strong">${esc(r.name)}</span><span class="td-sub">${esc(r.city)}</span>` },
      { key: 'segment', label: 'Kanaal', sortable: true, render: (r) => `<span class="badge ${r.segment === 'On-Trade' ? 'badge-accent' : 'badge-neutral'}">${r.segment}</span>` },
      { key: 'volumeYTD', label: 'Volume YTD (HL)', sortable: true, num: true, render: (r) => `<span class="mini-bar"><i style="width:${Math.max(4, Math.round((r.volumeYTD / maxVol) * 100))}%"></i></span>${fmt.hl(r.volumeYTD)}` },
      { key: 'rotation', label: 'Rotatie /wk', sortable: true, num: true, render: (r) => fmt.dec(r.rotation) },
      { key: 'trend', label: 'Trend', sortable: true, num: true, render: (r) => `<span class="delta ${r.trend > 0 ? 'up' : r.trend < 0 ? 'down' : 'flat'}">${r.trend > 0 ? '+' : ''}${fmt.dec(r.trend)}%</span>` },
      { key: 'status', label: 'Status', sortable: true, render: (r) => badge(r.status) },
    ];
  };

  // =========================================================
  // 1. MERKHOUDER INSIGHTS
  // =========================================================
  function viewInsightsOverview(d) {
    const charts = volumeChartsRow(d);
    main.innerHTML = `<div class="view">
      ${viewHeader(`${esc(d.def.name)} Insights`, esc(d.def.copy.insightsSub),
        `<button class="btn"><i data-lucide="download"></i>Exporteer rapport</button>`)}
      ${toneBanner(d.def.copy.insightsBanner)}
      ${kpiRow(d.def.kpisInsights)}
      ${charts.html}
      <div id="tbl-top-outlets"></div>
    </div>`;
    charts.mount();
    new DataTable($('#tbl-top-outlets'), {
      title: 'Outlets op volume',
      subtitle: 'Prestaties per verkooppunt, YTD',
      columns: outletCols(d),
      rows: d.outlets,
      searchKeys: ['name', 'city'],
      searchPlaceholder: 'Zoek outlet of stad…',
      filters: [
        { key: 'segment', label: 'Kanaal', options: ['On-Trade', 'Off-Trade'] },
        { key: 'status', label: 'Status', options: ['Actief', 'Prospect', 'Inactief'] },
      ],
      initialSort: 'volumeYTD',
      pageSize: 8,
    });
  }

  function viewVolume(d) {
    const sellable = d.def.products.filter((p) => p.hl > 0);
    const weights = sellable.map((_, i) => 1 / (i + 1.6));
    const wSum = weights.reduce((a, b) => a + b, 0);
    const skuRows = sellable.map((p, i) => ({
      ...p,
      volume: +(d.def.scale.ytdHL * (weights[i] / wSum)).toFixed(0),
      rotation: +(1.1 + ((i * 37) % 30) / 8).toFixed(1),
      trend: +(-6 + ((i * 53) % 170) / 10).toFixed(1),
    }));
    const totalHL = d.monthly.reduce((s, m) => s + m.total, 0);
    const best = d.monthly.reduce((b, m, i) => (m.total > d.monthly[b].total ? i : b), 0);
    const avgRot = skuRows.reduce((s, r) => s + r.rotation, 0) / skuRows.length;
    const charts = volumeChartsRow(d);
    const maxVol = Math.max(...skuRows.map((r) => r.volume));

    main.innerHTML = `<div class="view">
      ${viewHeader('Volume & rotatie', `Throughput en rotatie per SKU — ${esc(d.def.emphasis.primaryMetric)} als primaire stuurmetric.`)}
      ${kpiRow([
        { label: 'Volume 12 mnd', value: fmt.int(totalHL), unit: 'HL', delta: d.def.kpisInsights[0].delta, deltaLabel: 'vs. vorig jaar', icon: 'droplets' },
        { label: 'Beste maand', value: d.monthLabels[best], unit: '', delta: null, deltaLabel: fmt.int(d.monthly[best].total) + ' HL', icon: 'calendar' },
        { label: 'Rotatie portfolio Ø', value: fmt.dec(avgRot), unit: '×/wk', delta: 0.2, deltaLabel: 'vs. vorig kwartaal', deltaAbs: true, icon: 'refresh-cw' },
        { label: 'Actieve SKU’s', value: String(sellable.length), unit: '', delta: null, deltaLabel: 'in distributie', icon: 'layers' },
      ])}
      ${charts.html}
      <div id="tbl-sku"></div>
    </div>`;
    charts.mount();
    new DataTable($('#tbl-sku'), {
      title: 'Rotatie per SKU',
      subtitle: 'Volume, throughput en trend per artikel',
      columns: [
        { key: 'name', label: 'Product', sortable: true, render: (r) => `<span class="td-strong">${esc(r.name)}</span><span class="td-sub">${esc(r.sku)} · ${esc(r.format)}</span>` },
        { key: 'cat', label: 'Categorie', sortable: true },
        { key: 'channel', label: 'Kanaal', sortable: true, render: (r) => `<span class="badge ${r.channel === 'On-Trade' ? 'badge-accent' : 'badge-neutral'}">${r.channel}</span>` },
        { key: 'volume', label: 'Volume YTD (HL)', sortable: true, num: true, render: (r) => `<span class="mini-bar"><i style="width:${Math.max(4, Math.round((r.volume / maxVol) * 100))}%"></i></span>${fmt.int(r.volume)}` },
        { key: 'rotation', label: 'Rotatie /wk', sortable: true, num: true, render: (r) => fmt.dec(r.rotation) },
        { key: 'trend', label: 'Trend', sortable: true, num: true, render: (r) => `<span class="delta ${r.trend > 0 ? 'up' : 'down'}">${r.trend > 0 ? '+' : ''}${fmt.dec(r.trend)}%</span>` },
      ],
      rows: skuRows,
      searchKeys: ['name', 'sku', 'cat'],
      searchPlaceholder: 'Zoek product of SKU…',
      filters: [
        { key: 'channel', label: 'Kanaal', options: ['On-Trade', 'Off-Trade'] },
        { key: 'cat', label: 'Categorie', options: [...new Set(skuRows.map((r) => r.cat))] },
      ],
      initialSort: 'volume',
      pageSize: 10,
    });
  }

  function viewForecast(d) {
    // Deterministische prognose: huidige depotvoorraad vs. verwacht verbruik, 12 weken vooruit.
    const weeklyUse = d.def.scale.ytdHL / 52;
    const currentStock = Math.round(weeklyUse * 6.4);
    const reorderPoint = Math.round(weeklyUse * 3);
    const weeks = Array.from({ length: 12 }, (_, i) => 'wk ' + (29 + i));
    const seasonal = [1.06, 1.09, 1.11, 1.04, 0.98, 0.95, 0.92, 0.9, 0.93, 0.97, 1.0, 1.02];
    let stock = currentStock;
    let cumUse = 0;
    const stockLine = [], useLine = [];
    seasonal.forEach((f, i) => {
      const use = weeklyUse * f;
      cumUse += use;
      stock -= use;
      if (stock < reorderPoint) stock += weeklyUse * 5; // geplande aanvulling vanuit brouwerij
      stockLine.push(Math.round(stock));
      useLine.push(Math.round(cumUse));
    });
    const coverWeeks = currentStock / weeklyUse;

    const sellable = d.def.products.filter((p) => p.hl > 0);
    const weights = sellable.map((_, i) => 1 / (i + 1.6));
    const wSum = weights.reduce((a, b) => a + b, 0);
    const skuRows = sellable.map((p, i) => {
      const use = (d.def.scale.ytdHL / 52) * (weights[i] / wSum);
      const cover = +(3 + ((i * 41) % 70) / 10).toFixed(1);
      return {
        ...p,
        stock: Math.round(use * cover),
        weeklyUse: +use.toFixed(1),
        cover,
        coverLabel: cover < 4 ? 'Bestel nu' : cover < 6 ? 'Krap' : 'Op peil',
      };
    });

    main.innerHTML = `<div class="view">
      ${viewHeader('Voorraadprognose', `Depotvoorraad afgezet tegen het verwachte verbruik van ${esc(d.def.name)} — 12 weken vooruit, in hectoliters.`)}
      ${kpiRow([
        { label: 'Depotvoorraad', value: fmt.int(currentStock), unit: 'HL', delta: null, deltaLabel: 'per vandaag', icon: 'warehouse' },
        { label: 'Verwacht verbruik', value: fmt.int(Math.round(weeklyUse)), unit: 'HL/wk', delta: 3.1, deltaLabel: 'vs. vorige 4 weken', icon: 'trending-up' },
        { label: 'Weken dekking', value: fmt.dec(coverWeeks, 1), unit: 'wkn', delta: null, deltaLabel: 'bij huidig verbruik', icon: 'calendar' },
        { label: 'SKU’s onder herbestelpunt', value: String(skuRows.filter((r) => r.coverLabel === 'Bestel nu').length), unit: '', delta: null, deltaLabel: 'actie vereist', icon: 'triangle-alert' },
      ])}
      <div class="card section-gap">
        <div class="card-header"><div><div class="card-title">Voorraad vs. verwacht verbruik</div><div class="card-sub">Projectie 12 weken · inclusief geplande aanvullingen vanuit de brouwerij</div></div></div>
        <div class="card-body"><div class="chart-wrap" style="height:260px"><canvas id="chart-forecast"></canvas></div></div>
        ${chartLegend([
          { label: 'Verwachte voorraad', colorVar: '--series-1' },
          { label: 'Cumulatief verbruik', colorVar: '--series-2' },
          { label: 'Herbestelpunt', colorVar: '--text-3' },
        ])}
      </div>
      <div id="tbl-forecast"></div>
    </div>`;
    KMCharts.line($('#chart-forecast'), weeks, [
      { label: 'Verwachte voorraad', data: stockLine, colorVar: '--series-1' },
      { label: 'Cumulatief verbruik', data: useLine, colorVar: '--series-2' },
      { label: 'Herbestelpunt', data: weeks.map(() => reorderPoint), colorVar: '--text-3', dashed: true, noTooltip: true },
    ]);
    new DataTable($('#tbl-forecast'), {
      title: 'Dekking per SKU',
      subtitle: 'Voorraad, verbruik en herbestelstatus per artikel',
      columns: [
        { key: 'name', label: 'Product', sortable: true, render: (r) => `<span class="td-strong">${esc(r.name)}</span><span class="td-sub">${esc(r.sku)} · ${esc(r.format)}</span>` },
        { key: 'stock', label: 'Voorraad (HL)', sortable: true, num: true, render: (r) => fmt.int(r.stock) },
        { key: 'weeklyUse', label: 'Verbruik (HL/wk)', sortable: true, num: true, render: (r) => fmt.dec(r.weeklyUse) },
        { key: 'cover', label: 'Dekking (wkn)', sortable: true, num: true, render: (r) => fmt.dec(r.cover) },
        { key: 'coverLabel', label: 'Status', sortable: true, render: (r) => badge(r.coverLabel) },
      ],
      rows: skuRows,
      searchKeys: ['name', 'sku'],
      searchPlaceholder: 'Zoek product of SKU…',
      filters: [{ key: 'coverLabel', label: 'Status', options: ['Bestel nu', 'Krap', 'Op peil'] }],
      initialSort: 'cover',
      initialSortDir: 'asc',
      pageSize: 10,
    });
  }

  function viewOutlets(d) {
    main.innerHTML = `<div class="view">
      ${viewHeader('Outlets', 'Alle verkooppunten met volume, rotatie en status. Klik op een rij voor detail.')}
      <div class="split-view">
        <div id="tbl-outlets"></div>
        <div class="card detail-pane" id="outlet-detail">${emptyState('map-pin', 'Geen outlet geselecteerd', 'Selecteer een outlet in de tabel om details, volume en recente orders te bekijken.')}</div>
      </div>
    </div>`;
    const table = new DataTable($('#tbl-outlets'), {
      columns: outletCols(d),
      rows: d.outlets,
      searchKeys: ['name', 'city', 'contact'],
      searchPlaceholder: 'Zoek outlet, stad of contact…',
      filters: [
        { key: 'segment', label: 'Kanaal', options: ['On-Trade', 'Off-Trade'] },
        { key: 'status', label: 'Status', options: ['Actief', 'Prospect', 'Inactief'] },
      ],
      initialSort: 'volumeYTD',
      pageSize: 12,
      getRowId: (r) => r.id,
      onRowClick: (r) => renderOutletDetail(d, r),
    });
    if (d.outlets.length) { table.select(d.outlets[0].id); renderOutletDetail(d, d.outlets[0]); }
  }

  function renderOutletDetail(d, o) {
    const orders = d.orders.filter((x) => x.outlet === o.name).slice(0, 5);
    $('#outlet-detail').innerHTML = `
      <div class="detail-header">
        <div>
          <div class="detail-title">${esc(o.name)}</div>
          <div class="detail-sub">${esc(o.id)} · ${esc(o.city)}</div>
        </div>
        <div class="card-header-actions">${badge(o.status)}</div>
      </div>
      <div class="detail-section">
        <div class="detail-section-title">Profiel</div>
        <div class="kv-grid">
          <div class="kv"><div class="k">Kanaal</div><div class="v">${esc(o.segment)}</div></div>
          <div class="kv"><div class="k">Contact</div><div class="v">${esc(o.contact)}</div></div>
          <div class="kv"><div class="k">Klant sinds</div><div class="v">${esc(o.since)}</div></div>
          <div class="kv"><div class="k">Premium placement</div><div class="v">${o.premiumPlacement ? 'Ja' : 'Nee'}</div></div>
        </div>
      </div>
      <div class="detail-section">
        <div class="detail-section-title">Prestaties YTD</div>
        <div class="kv-grid">
          <div class="kv"><div class="k">Volume</div><div class="v">${fmt.hl(o.volumeYTD)} HL</div></div>
          <div class="kv"><div class="k">Rotatie</div><div class="v">${fmt.dec(o.rotation)} ×/wk</div></div>
          <div class="kv"><div class="k">Trend</div><div class="v"><span class="delta ${o.trend > 0 ? 'up' : o.trend < 0 ? 'down' : 'flat'}">${o.trend > 0 ? '+' : ''}${fmt.dec(o.trend)}%</span></div></div>
          <div class="kv"><div class="k">Waarde (indicatief)</div><div class="v">${fmt.eur(o.volumeYTD * d.def.scale.priceHL)}</div></div>
        </div>
      </div>
      <div class="detail-section">
        <div class="detail-section-title">Recente orders</div>
        ${orders.length ? `<table class="line-items">${orders.map((x) => `
          <tr><td><span class="td-strong">${esc(x.id)}</span><span class="td-sub">${esc(x.date)}</span></td>
          <td class="num">${fmt.dec(x.hl, 1)} HL</td>
          <td class="num">${badge(x.status)}</td></tr>`).join('')}</table>`
        : emptyState('package-x', 'Geen recente orders', 'Voor deze outlet zijn er geen orders in de afgelopen 90 dagen.')}
      </div>`;
    refreshIcons();
    if (window.matchMedia('(max-width: 1024px)').matches) $('#outlet-detail').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function viewCampaigns(d) {
    const active = d.def.campaigns.filter((c) => c.status === 'Actief');
    const avgUplift = active.filter((c) => c.uplift).reduce((s, c, _, a) => s + c.uplift / a.length, 0);
    main.innerHTML = `<div class="view">
      ${viewHeader('Campagnes & activaties', `Campagne-activatie en uplift over alle kanalen — ${esc(d.def.name)}.`,
        '<button class="btn btn-primary"><i data-lucide="plus"></i>Nieuwe activatie</button>')}
      ${kpiRow([
        { label: 'Actieve campagnes', value: String(active.length), unit: '', delta: null, deltaLabel: 'nu lopend', icon: 'megaphone' },
        { label: 'Deelnemende outlets', value: fmt.int(active.reduce((s, c) => s + c.outlets, 0)), unit: '', delta: null, deltaLabel: 'in actieve campagnes', icon: 'map-pin' },
        { label: 'Ø Uplift actief', value: fmt.dec(avgUplift), unit: '%', delta: null, deltaLabel: 'volume-uplift', icon: 'trending-up' },
        { label: 'Gepland Q3/Q4', value: String(d.def.campaigns.filter((c) => c.status === 'Gepland').length), unit: '', delta: null, deltaLabel: 'in voorbereiding', icon: 'calendar' },
      ])}
      <div id="tbl-campaigns"></div>
    </div>`;
    new DataTable($('#tbl-campaigns'), {
      title: 'Alle campagnes',
      columns: [
        { key: 'name', label: 'Campagne', sortable: true, render: (r) => `<span class="td-strong">${esc(r.name)}</span><span class="td-sub">${esc(r.type)}</span>` },
        { key: 'period', label: 'Periode', sortable: false },
        { key: 'outlets', label: 'Outlets', sortable: true, num: true, render: (r) => fmt.int(r.outlets) },
        { key: 'uplift', label: 'Uplift', sortable: true, num: true, render: (r) => r.uplift === null ? '<span class="muted">—</span>' : `<span class="delta up">+${fmt.dec(r.uplift)}%</span>` },
        { key: 'budget', label: 'Budget', sortable: false, num: true },
        { key: 'status', label: 'Status', sortable: true, render: (r) => badge(r.status) },
      ],
      rows: d.def.campaigns,
      searchKeys: ['name', 'type'],
      searchPlaceholder: 'Zoek campagne…',
      filters: [{ key: 'status', label: 'Status', options: ['Actief', 'Gepland', 'Afgerond'] }],
      initialSort: 'outlets',
      pageSize: 10,
      empty: { icon: 'megaphone-off', title: 'Geen campagnes gevonden', msg: 'Er zijn geen campagnes die aan de filters voldoen.' },
    });
  }

  // =========================================================
  // 2. ORDER MANAGEMENT
  // =========================================================
  const ORDER_FLOW = ['In behandeling', 'Bevestigd', 'In levering', 'Geleverd'];

  function orderTimeline(o) {
    if (o.status === 'Geannuleerd') return `<div class="empty-state" style="padding:18px"><div class="es-icon"><i data-lucide="circle-x"></i></div><div class="es-title">Order geannuleerd</div><div class="es-msg">Deze order is geannuleerd en wordt niet uitgeleverd.</div></div>`;
    if (o.status === 'Concept') return `<div class="empty-state" style="padding:18px"><div class="es-icon"><i data-lucide="file-pen-line"></i></div><div class="es-title">Concept</div><div class="es-msg">Deze order is nog niet ingediend.</div></div>`;
    const idx = ORDER_FLOW.indexOf(o.status);
    const times = ['Ontvangen · ' + o.date, 'Bevestigd', 'Uitgeleverd door depot', 'Afgeleverd · ' + o.delivery];
    return `<ul class="timeline">${ORDER_FLOW.map((s, i) => `
      <li class="${i < idx ? 'done' : i === idx ? 'current' : ''}">
        <span class="tl-dot"></span>
        <div class="tl-body"><div class="tl-title">${esc(s)}</div><div class="tl-time">${i <= idx ? esc(times[i]) : 'Gepland'}</div></div>
      </li>`).join('')}</ul>`;
  }

  function renderOrderDetail(d, o, containerSel, opts = {}) {
    const c = $(containerSel);
    if (!o) { c.innerHTML = emptyState('package', 'Geen order geselecteerd', 'Selecteer een order in de tabel om regels, status en levering te bekijken.'); refreshIcons(); return; }
    const canConfirm = o.status === 'In behandeling';
    const canCancel = ['Concept', 'In behandeling', 'Bevestigd'].includes(o.status);
    c.innerHTML = `
      <div class="detail-header">
        <div>
          <div class="detail-title">${esc(o.id)}</div>
          <div class="detail-sub">${o.brand ? esc(o.brand) + ' · ' : ''}${esc(o.outlet)} · ${esc(o.city)} · ref ${esc(o.ref)}</div>
        </div>
        <div class="card-header-actions">${badge(o.status)}</div>
      </div>
      <div class="detail-section">
        <div class="detail-section-title">Order</div>
        <div class="kv-grid">
          <div class="kv"><div class="k">Besteldatum</div><div class="v">${esc(o.date)}</div></div>
          <div class="kv"><div class="k">Kanaal</div><div class="v">${esc(o.segment)}</div></div>
          <div class="kv"><div class="k">Volume</div><div class="v">${fmt.dec(o.hl, 1)} HL</div></div>
          <div class="kv"><div class="k">Fusten</div><div class="v">${o.kegs || '—'}</div></div>
          <div class="kv"><div class="k">Orderwaarde</div><div class="v">${fmt.eur(o.value)}</div></div>
          <div class="kv"><div class="k">Levering</div><div class="v">${esc(o.delivery)}</div></div>
        </div>
      </div>
      <div class="detail-section">
        <div class="detail-section-title">Orderregels (${o.lines.length})</div>
        <table class="line-items">${o.lines.map((l) => `
          <tr>
            <td><span class="td-strong">${esc(l.name)}</span><span class="td-sub">${esc(l.format)}</span></td>
            <td class="num">${l.qty} ×</td>
            <td class="num">${fmt.eur(l.price * l.qty)}</td>
          </tr>`).join('')}</table>
      </div>
      <div class="detail-section">
        <div class="detail-section-title">Status</div>
        ${orderTimeline(o)}
      </div>
      ${opts.readonly ? '' : `<div class="detail-section" style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-primary" id="btn-confirm" ${canConfirm ? '' : 'disabled'}><i data-lucide="check"></i>Bevestig order</button>
        <button class="btn" id="btn-cancel" ${canCancel ? '' : 'disabled'}><i data-lucide="x"></i>Annuleer</button>
      </div>`}`;
    if (!opts.readonly) {
      $('#btn-confirm', c)?.addEventListener('click', () => { if (o.status === 'In behandeling') { o.status = 'Bevestigd'; renderView(); } });
      $('#btn-cancel', c)?.addEventListener('click', () => { if (canCancel) { o.status = 'Geannuleerd'; renderView(); } });
    }
    refreshIcons();
    if (opts.scroll && window.matchMedia('(max-width: 1024px)').matches) c.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  let selectedOrderId = null;

  function viewOrderbook(d) {
    const orders = allOrders();
    const open = orders.filter((o) => !['Geleverd', 'Geannuleerd'].includes(o.status));
    const inTransitHL = orders.filter((o) => o.status === 'In levering').reduce((s, o) => s + o.hl, 0);
    const value30 = orders.filter((o) => o.daysAgo <= 30 && o.status !== 'Geannuleerd').reduce((s, o) => s + o.value, 0);
    const brandNames = Object.values(KM.BRAND_DEFS).map((b) => b.name);
    const chip = Object.fromEntries(Object.values(KM.BRAND_DEFS).map((b) => [b.name, b.chip]));
    main.innerHTML = `<div class="view">
      ${viewHeader('Orderbeheer — Keymerch', 'Centrale orderafhandeling over alle merken. Filter op merk voor focus, of gebruik de brand switcher.',
        '<button class="btn"><i data-lucide="download"></i>Export</button><button class="btn btn-primary"><i data-lucide="plus"></i>Nieuwe order</button>')}
      ${kpiRow([
        { label: 'Open orders', value: String(open.length), unit: '', delta: null, deltaLabel: 'alle merken', icon: 'package' },
        { label: 'Volume onderweg', value: fmt.dec(inTransitHL, 1), unit: 'HL', delta: null, deltaLabel: 'status: in levering', icon: 'truck' },
        { label: 'Orderwaarde 30 dgn', value: fmt.eur(value30), unit: '', delta: 6.4, deltaLabel: 'vs. vorige periode', icon: 'euro' },
        { label: 'Leverbetrouwbaarheid', value: '96,8', unit: '%', delta: 0.7, deltaLabel: 'pt · on-time in-full', deltaAbs: true, icon: 'badge-check' },
      ])}
      ${agentStrip(d)}
      <div class="split-view">
        <div id="tbl-orders"></div>
        <div class="card detail-pane" id="order-detail"></div>
      </div>
    </div>`;
    const table = new DataTable($('#tbl-orders'), {
      columns: [
        { key: 'id', label: 'Order', sortable: true, render: (r) => `<span class="td-strong">${esc(r.id)}</span><span class="td-sub">${esc(r.date)}</span>` },
        { key: 'brand', label: 'Merk', sortable: true, render: (r) => `<span class="legend-item"><span class="brand-dot" style="--dot:${chip[r.brand] || 'var(--text-3)'}"></span>${esc(r.brand)}</span>` },
        { key: 'outlet', label: 'Outlet', sortable: true, render: (r) => `${esc(r.outlet)}<span class="td-sub">${esc(r.city)}</span>` },
        { key: 'segment', label: 'Kanaal', sortable: true, render: (r) => `<span class="badge ${r.segment === 'On-Trade' ? 'badge-accent' : 'badge-neutral'}">${r.segment}</span>` },
        { key: 'hl', label: 'HL', sortable: true, num: true, render: (r) => fmt.dec(r.hl, 1) },
        { key: 'value', label: 'Waarde', sortable: true, num: true, render: (r) => fmt.eur(r.value) },
        { key: 'status', label: 'Status', sortable: true, render: (r) => badge(r.status) },
      ],
      rows: orders,
      searchKeys: ['id', 'outlet', 'city', 'ref', 'brand'],
      searchPlaceholder: 'Zoek order, outlet of referentie…',
      filters: [
        { key: 'brand', label: 'Merk', options: brandNames },
        { key: 'status', label: 'Status', options: KM.ORDER_STATUSES },
        { key: 'segment', label: 'Kanaal', options: ['On-Trade', 'Off-Trade'] },
      ],
      pageSize: 12,
      getRowId: (r) => r.key,
      onRowClick: (r) => { selectedOrderId = r.key; renderOrderDetail(d, r, '#order-detail', { scroll: true }); },
      empty: { icon: 'package-x', title: 'Geen orders gevonden', msg: 'Geen orders voldoen aan de huidige zoekopdracht of filters.' },
    });
    const initial = orders.find((o) => o.key === selectedOrderId) || orders[0];
    if (initial) { table.select(initial.key); }
    renderOrderDetail(d, initial, '#order-detail');
  }

  function viewRequests(d) {
    const fresh = d.requests.filter((r) => ['Nieuw', 'In review'].includes(r.status)).length;
    const approved = d.requests.filter((r) => r.status === 'Goedgekeurd').length;
    main.innerHTML = `<div class="view">
      ${viewHeader('Assortimentsverzoeken', 'Aanvragen van outlets voor uitbreiding of wijziging van het assortiment.')}
      ${kpiRow([
        { label: 'Te beoordelen', value: String(fresh), unit: '', delta: null, deltaLabel: 'nieuw + in review', icon: 'inbox' },
        { label: 'Goedgekeurd (30 dgn)', value: String(approved), unit: '', delta: null, deltaLabel: 'toegevoegd aan assortiment', icon: 'circle-check-big' },
        { label: 'Ø doorlooptijd', value: '3,2', unit: 'dgn', delta: -0.8, deltaLabel: 'vs. vorige maand', deltaAbs: true, invert: true, icon: 'timer' },
        { label: 'Verwachte rotatie Ø', value: fmt.dec(d.requests.reduce((s, r) => s + r.expectedRotation, 0) / d.requests.length), unit: '×/wk', delta: null, deltaLabel: 'over open verzoeken', icon: 'refresh-cw' },
      ])}
      <div class="split-view">
        <div id="tbl-requests"></div>
        <div class="card detail-pane" id="request-detail"></div>
      </div>
    </div>`;
    const table = new DataTable($('#tbl-requests'), {
      columns: [
        { key: 'id', label: 'Verzoek', sortable: true, render: (r) => `<span class="td-strong">${esc(r.id)}</span><span class="td-sub">${esc(r.date)}</span>` },
        { key: 'outlet', label: 'Outlet', sortable: true, render: (r) => `${esc(r.outlet)}<span class="td-sub">${esc(r.city)}</span>` },
        { key: 'product', label: 'Gevraagd product', sortable: true, render: (r) => `${esc(r.product)}<span class="td-sub">${esc(r.format)}</span>` },
        { key: 'expectedRotation', label: 'Verw. rotatie', sortable: true, num: true, render: (r) => fmt.dec(r.expectedRotation) + ' ×/wk' },
        { key: 'status', label: 'Status', sortable: true, render: (r) => badge(r.status) },
      ],
      rows: d.requests,
      searchKeys: ['id', 'outlet', 'product'],
      searchPlaceholder: 'Zoek verzoek, outlet of product…',
      filters: [{ key: 'status', label: 'Status', options: KM.AR_STATUSES }],
      pageSize: 10,
      getRowId: (r) => r.id,
      onRowClick: (r) => renderRequestDetail(d, r),
      empty: { icon: 'inbox', title: 'Geen verzoeken', msg: 'Er zijn geen assortimentsverzoeken die aan de filters voldoen.' },
    });
    if (d.requests.length) { table.select(d.requests[0].id); renderRequestDetail(d, d.requests[0]); }
  }

  function renderRequestDetail(d, r) {
    const open = ['Nieuw', 'In review'].includes(r.status);
    $('#request-detail').innerHTML = `
      <div class="detail-header">
        <div><div class="detail-title">${esc(r.id)} — ${esc(r.product)}</div>
        <div class="detail-sub">${esc(r.outlet)} · ${esc(r.city)}</div></div>
        <div class="card-header-actions">${badge(r.status)}</div>
      </div>
      <div class="detail-section">
        <div class="detail-section-title">Verzoek</div>
        <div class="kv-grid">
          <div class="kv"><div class="k">Product</div><div class="v">${esc(r.product)}</div></div>
          <div class="kv"><div class="k">Formaat</div><div class="v">${esc(r.format)}</div></div>
          <div class="kv"><div class="k">Ingediend</div><div class="v">${esc(r.date)}</div></div>
          <div class="kv"><div class="k">Verwachte rotatie</div><div class="v">${fmt.dec(r.expectedRotation)} ×/wk</div></div>
        </div>
      </div>
      <div class="detail-section">
        <div class="detail-section-title">Motivatie outlet</div>
        <div style="font-size:12.5px;color:var(--text-2);line-height:1.55">“${esc(r.motivation)}.” <span class="muted">— ${esc(r.outlet)}</span></div>
      </div>
      <div class="detail-section" style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-primary" id="btn-approve" ${open ? '' : 'disabled'}><i data-lucide="check"></i>Goedkeuren</button>
        <button class="btn" id="btn-reject" ${open ? '' : 'disabled'}><i data-lucide="x"></i>Afwijzen</button>
        ${r.status === 'Nieuw' ? '<button class="btn btn-ghost" id="btn-review"><i data-lucide="search"></i>In review nemen</button>' : ''}
      </div>`;
    $('#btn-approve')?.addEventListener('click', () => { if (open) { r.status = 'Goedgekeurd'; renderView(); } });
    $('#btn-reject')?.addEventListener('click', () => { if (open) { r.status = 'Afgewezen'; renderView(); } });
    $('#btn-review')?.addEventListener('click', () => { r.status = 'In review'; renderView(); });
    refreshIcons();
    if (window.matchMedia('(max-width: 1024px)').matches) $('#request-detail').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function viewKegs(d) {
    const f = d.kegs.fleet;
    const rows = d.kegs.rows.map((r) => ({ ...r, alertLabel: r.alert ? 'Retour laat' : 'Op schema' }));
    main.innerHTML = `<div class="view">
      ${viewHeader('Fustenbeheer', 'Uitstaande fusten (kegs) per outlet, omlooptijd en retourstatus van het emballagepark.')}
      ${kpiRow([
        { label: 'Fusten uitstaand', value: fmt.int(f.out), unit: '', delta: null, deltaLabel: 'bij horeca-outlets', icon: 'cylinder' },
        { label: 'In depot', value: fmt.int(f.depot), unit: '', delta: null, deltaLabel: 'gereed voor uitlevering', icon: 'warehouse' },
        { label: 'Ø omlooptijd', value: String(f.avgCycle), unit: 'dgn', delta: -2, deltaLabel: 'vs. vorig kwartaal', deltaAbs: true, invert: true, icon: 'refresh-cw' },
        { label: 'Retour te laat', value: String(f.overdue), unit: '', delta: null, deltaLabel: 'ouder dan 60 dagen', icon: 'triangle-alert' },
      ])}
      <div id="tbl-kegs"></div>
    </div>`;
    new DataTable($('#tbl-kegs'), {
      title: 'Fusten per outlet',
      subtitle: 'Retourstatus emballage · On-Trade',
      columns: [
        { key: 'outlet', label: 'Outlet', sortable: true, render: (r) => `<span class="td-strong">${esc(r.outlet)}</span><span class="td-sub">${esc(r.city)}</span>` },
        { key: 'kegsOut', label: 'Fusten uit', sortable: true, num: true },
        { key: 'oldestDays', label: 'Oudste (dgn)', sortable: true, num: true, render: (r) => r.alert ? `<span class="delta down">${r.oldestDays}</span>` : String(r.oldestDays) },
        { key: 'avgCycle', label: 'Ø omloop (dgn)', sortable: true, num: true },
        { key: 'lastReturn', label: 'Laatste retour', sortable: false },
        { key: 'alertLabel', label: 'Status', sortable: true, render: (r) => badge(r.alertLabel) },
      ],
      rows,
      searchKeys: ['outlet', 'city'],
      searchPlaceholder: 'Zoek outlet…',
      filters: [{ key: 'alertLabel', label: 'Status', options: ['Retour laat', 'Op schema'] }],
      initialSort: 'oldestDays',
      pageSize: 12,
    });
  }

  // =========================================================
  // 3. HORECA PORTAAL
  // =========================================================
  function viewHorecaHome(d) {
    const h = d.horeca;
    const openOrders = h.orders.filter((o) => !['Geleverd', 'Geannuleerd'].includes(o.status));
    main.innerHTML = `<div class="view">
      ${viewHeader(`${esc(h.outlet)} — ${esc(h.city)}`, esc(d.def.copy.horecaWelcome),
        '<button class="btn" id="btn-scan"><i data-lucide="qr-code"></i>Scan fust</button><button class="btn btn-primary" id="go-shop"><i data-lucide="shopping-cart"></i>Nieuwe bestelling</button>')}
      ${agentStrip(d)}
      ${kpiRow([
        { label: 'Openstaande orders', value: String(openOrders.length), unit: '', delta: null, deltaLabel: 'in behandeling of onderweg', icon: 'package' },
        { label: 'Fusten in bezit', value: String(h.kegsOut), unit: '', delta: null, deltaLabel: 'retour bij volgende levering', icon: 'cylinder' },
        { label: 'Volgende levering', value: h.nextDelivery, unit: '', delta: null, deltaLabel: 'vaste leverdag', icon: 'truck' },
        { label: 'Weekvolume', value: fmt.dec(h.weekVolume, 1), unit: 'HL', delta: 4.1, deltaLabel: 'vs. vorige week', icon: 'droplets' },
      ])}
      <div class="grid-2 section-gap">
        <div class="card">
          <div class="card-header"><div><div class="card-title">Lopende acties voor uw zaak</div><div class="card-sub">Campagnes waar u aan kunt deelnemen</div></div></div>
          <div class="card-body" style="display:flex;flex-direction:column;gap:10px">
            ${h.openCampaigns.length ? h.openCampaigns.map((c) => `
              <div style="display:flex;align-items:center;gap:10px;border:1px solid var(--offset);border-radius:var(--radius-sm);padding:10px 12px">
                <div style="min-width:0">
                  <div class="td-strong" style="font-size:12.5px">${esc(c.name)}</div>
                  <div class="td-sub">${esc(c.type)} · ${esc(c.period)}</div>
                </div>
                <button class="btn btn-sm" style="margin-left:auto">Doe mee</button>
              </div>`).join('') : emptyState('megaphone', 'Geen acties beschikbaar', 'Er lopen momenteel geen campagnes voor uw zaak. Kom later terug.')}
          </div>
        </div>
        <div class="card">
          <div class="card-header"><div><div class="card-title">Recente orders</div><div class="card-sub">Uw laatste bestellingen</div></div></div>
          <div class="card-body">
            <table class="line-items">${h.orders.slice(0, 6).map((o) => `
              <tr>
                <td><span class="td-strong">${esc(o.id)}</span><span class="td-sub">${esc(o.date)}</span></td>
                <td class="num">${fmt.eur(o.value)}</td>
                <td class="num">${badge(o.status)}</td>
              </tr>`).join('')}</table>
          </div>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><div><div class="card-title">Uw afname per maand</div><div class="card-sub">Volume in hectoliters, laatste 12 maanden</div></div></div>
        <div class="card-body"><div class="chart-wrap" style="height:200px"><canvas id="chart-horeca"></canvas></div></div>
      </div>
    </div>`;
    const scale = d.def.scale.avgOrderHL / d.monthly[0].total * 4.2;
    KMCharts.bar($('#chart-horeca'), d.monthLabels, [
      { label: 'Afname', data: d.monthly.map((m) => +(m.total * scale).toFixed(1)), colorVar: '--series-1' },
    ]);
    $('#go-shop').addEventListener('click', () => setView('shop'));
    $('#btn-scan').addEventListener('click', () => openQrScan(d));
  }

  function cartCount() { return Object.values(state.cart).reduce((s, q) => s + q, 0); }

  function viewShop(d) {
    const h = d.horeca;
    const cats = [...new Set(h.products.map((p) => p.cat))];
    main.innerHTML = `<div class="view">
      ${viewHeader('Bestellen', `Uw ${esc(d.def.name)}-assortiment. Bestel vóór 17:00 voor levering op ${esc(h.nextDelivery)}.`)}
      <div class="split-view" style="grid-template-columns: minmax(0,1.8fr) minmax(300px,1fr)">
        <div>
          <div class="card section-gap">
            <div class="toolbar" style="border-bottom:none">
              <div class="search-box"><i data-lucide="search"></i><input id="shop-search" type="search" placeholder="Zoek product…"></div>
              <select class="filter-select" id="shop-cat"><option value="">Categorie: alle</option>${cats.map((c) => `<option>${esc(c)}</option>`).join('')}</select>
            </div>
          </div>
          <div id="catalog" class="catalog-grid"></div>
        </div>
        <div class="card detail-pane" id="cart-pane"></div>
      </div>
    </div>`;

    function renderCatalog() {
      const q = $('#shop-search').value.trim().toLowerCase();
      const cat = $('#shop-cat').value;
      const items = h.products.filter((p) => (!q || p.name.toLowerCase().includes(q) || p.format.toLowerCase().includes(q)) && (!cat || p.cat === cat));
      const el = $('#catalog');
      if (!items.length) {
        el.innerHTML = `<div class="card" style="grid-column:1/-1">${emptyState('package-search', 'Geen producten gevonden', 'Pas uw zoekopdracht of categoriefilter aan.')}</div>`;
      } else {
        el.innerHTML = items.map((p) => `
          <div class="product-card">
            <div class="product-head">
              <div><div class="product-name">${esc(p.name)}</div><div class="product-format">${esc(p.format)}</div></div>
              <div class="product-price">${fmt.eur(p.price)}</div>
            </div>
            <div><span class="badge badge-neutral">${esc(p.cat)}</span></div>
            <div class="product-foot">
              <div class="qty-control">
                <button data-sku="${esc(p.sku)}" data-d="-1" aria-label="Minder"><i data-lucide="minus"></i></button>
                <span class="qty">${state.cart[p.sku] || 0}</span>
                <button data-sku="${esc(p.sku)}" data-d="1" aria-label="Meer"><i data-lucide="plus"></i></button>
              </div>
            </div>
          </div>`).join('');
        el.querySelectorAll('.qty-control button').forEach((b) => {
          b.addEventListener('click', () => {
            const sku = b.dataset.sku;
            state.cart[sku] = Math.max(0, (state.cart[sku] || 0) + Number(b.dataset.d));
            if (!state.cart[sku]) delete state.cart[sku];
            b.closest('.qty-control').querySelector('.qty').textContent = state.cart[sku] || 0;
            renderCart();
          });
        });
      }
      refreshIcons();
    }

    function renderCart() {
      const c = $('#cart-pane');
      const entries = Object.entries(state.cart);
      if (state.orderNote) {
        c.innerHTML = `<div class="detail-header"><div><div class="detail-title">Bestelling geplaatst</div><div class="detail-sub">${esc(state.orderNote)}</div></div></div>
          <div class="card-body">${emptyState('circle-check-big', 'Bedankt voor uw bestelling', `Uw order is ontvangen en wordt geleverd op ${esc(h.nextDelivery)}. U vindt de order terug onder “Mijn orders”.`, 'Nieuwe bestelling starten')}</div>`;
        c.querySelector('.es-action').addEventListener('click', () => { state.orderNote = null; renderCart(); });
        refreshIcons();
        return;
      }
      if (!entries.length) {
        c.innerHTML = `<div class="detail-header"><div><div class="detail-title">Uw bestelling</div><div class="detail-sub">${esc(h.outlet)}</div></div></div>
          ${emptyState('shopping-cart', 'Uw bestelling is leeg', 'Voeg producten toe uit het assortiment om een order samen te stellen.')}`;
        refreshIcons();
        return;
      }
      const lines = entries.map(([sku, qty]) => ({ p: h.products.find((x) => x.sku === sku), qty }));
      const total = lines.reduce((s, l) => s + l.p.price * l.qty, 0);
      const hl = lines.reduce((s, l) => s + l.p.hl * l.qty, 0);
      const kegs = lines.filter((l) => l.p.format.startsWith('Fust')).reduce((s, l) => s + l.qty, 0);
      c.innerHTML = `
        <div class="detail-header"><div><div class="detail-title">Uw bestelling</div><div class="detail-sub">${esc(h.outlet)} · levering ${esc(h.nextDelivery)}</div></div></div>
        <div class="detail-section">
          <table class="line-items">${lines.map((l) => `
            <tr><td><span class="td-strong">${esc(l.p.name)}</span><span class="td-sub">${esc(l.p.format)}</span></td>
            <td class="num">${l.qty} ×</td><td class="num">${fmt.eur(l.p.price * l.qty)}</td></tr>`).join('')}</table>
        </div>
        <div class="detail-section">
          <div class="kv-grid">
            <div class="kv"><div class="k">Volume</div><div class="v">${fmt.dec(hl, 2)} HL</div></div>
            <div class="kv"><div class="k">Fusten</div><div class="v">${kegs || '—'}</div></div>
            <div class="kv"><div class="k">Retouremballage</div><div class="v">${h.kegsOut} fusten</div></div>
            <div class="kv"><div class="k">Totaal excl. btw</div><div class="v">${fmt.eur(total)}</div></div>
          </div>
        </div>
        <div class="detail-section" style="display:flex;gap:8px">
          <button class="btn btn-primary" id="btn-submit-order" style="flex:1;justify-content:center"><i data-lucide="send"></i>Plaats bestelling</button>
          <button class="btn" id="btn-clear-cart" aria-label="Leegmaken"><i data-lucide="trash-2"></i></button>
        </div>`;
      $('#btn-submit-order').addEventListener('click', () => {
        const newOrder = {
          id: 'ORD-2026-' + String(900 + Math.floor(Math.random() * 90)).padStart(4, '0'),
          outlet: h.outlet, city: h.city, segment: 'On-Trade',
          date: 'vandaag', daysAgo: 0,
          lines: lines.map((l) => ({ sku: l.p.sku, name: l.p.name, format: l.p.format, qty: l.qty, price: l.p.price, hl: l.p.hl })),
          hl: +hl.toFixed(2), value: Math.round(total), kegs,
          status: 'In behandeling', delivery: h.nextDelivery, ref: 'PORTAAL',
        };
        h.orders.unshift(newOrder);
        state.cart = {};
        state.orderNote = `Ordernummer ${newOrder.id} · ${fmt.eur(newOrder.value)}`;
        toast('Bestelling geplaatst', `${newOrder.id} · levering ${h.nextDelivery}`, 'good');
        renderCart();
        renderCatalog();
        renderSidebarNav();
      });
      $('#btn-clear-cart').addEventListener('click', () => { state.cart = {}; renderCart(); renderCatalog(); });
      refreshIcons();
    }

    let deb;
    $('#shop-search').addEventListener('input', () => { clearTimeout(deb); deb = setTimeout(renderCatalog, 140); });
    $('#shop-cat').addEventListener('change', (e) => { e.target.classList.toggle('has-value', !!e.target.value); renderCatalog(); });
    renderCatalog();
    renderCart();
  }

  function viewMyOrders(d) {
    const h = d.horeca;
    main.innerHTML = `<div class="view">
      ${viewHeader('Mijn orders', `Alle bestellingen van ${esc(h.outlet)} — klik op een order voor regels en leverstatus.`)}
      <div class="split-view">
        <div id="tbl-myorders"></div>
        <div class="card detail-pane" id="myorder-detail"></div>
      </div>
    </div>`;
    const table = new DataTable($('#tbl-myorders'), {
      columns: [
        { key: 'id', label: 'Order', sortable: true, render: (r) => `<span class="td-strong">${esc(r.id)}</span><span class="td-sub">${esc(r.date)}</span>` },
        { key: 'hl', label: 'HL', sortable: true, num: true, render: (r) => fmt.dec(r.hl, 1) },
        { key: 'kegs', label: 'Fusten', sortable: true, num: true, render: (r) => r.kegs || '<span class="muted">—</span>' },
        { key: 'value', label: 'Waarde', sortable: true, num: true, render: (r) => fmt.eur(r.value) },
        { key: 'status', label: 'Status', sortable: true, render: (r) => badge(r.status) },
      ],
      rows: h.orders,
      searchKeys: ['id', 'date'],
      searchPlaceholder: 'Zoek order…',
      filters: [{ key: 'status', label: 'Status', options: KM.ORDER_STATUSES }],
      pageSize: 10,
      getRowId: (r) => r.id,
      onRowClick: (r) => renderOrderDetail(d, r, '#myorder-detail', { readonly: true, scroll: true }),
      empty: { icon: 'package-x', title: 'Nog geen orders', msg: 'U heeft nog geen bestellingen geplaatst. Start een nieuwe bestelling om te beginnen.' },
    });
    if (h.orders.length) { table.select(h.orders[0].id); }
    renderOrderDetail(d, h.orders[0] || null, '#myorder-detail', { readonly: true });
  }

  function viewAssortment(d) {
    const h = d.horeca;
    if (!h.myRequests) {
      h.myRequests = [
        { id: 'AV-9101', product: h.products[2]?.name || h.products[0].name, format: h.products[2]?.format || h.products[0].format, date: '2 jul', status: 'In review', motivation: 'Veel vraag van vaste gasten' },
        { id: 'AV-9084', product: h.products[4]?.name || h.products[1].name, format: h.products[4]?.format || h.products[1].format, date: '18 jun', status: 'Goedgekeurd', motivation: 'Tapkraan vrijgekomen' },
      ];
    }
    main.innerHTML = `<div class="view">
      ${viewHeader('Assortiment & acties', 'Vraag nieuwe producten aan voor uw tapkranen en schappen, en volg uw lopende verzoeken.')}
      <div class="grid-2 section-gap">
        <div class="card">
          <div class="card-header"><div><div class="card-title">Assortimentsverzoek indienen</div><div class="card-sub">Uitbreiding wordt binnen 3 werkdagen beoordeeld</div></div></div>
          <div class="card-body" style="display:flex;flex-direction:column;gap:10px">
            <label style="font-size:11.5px;color:var(--text-2);font-weight:500">Product
              <select class="filter-select" id="ar-product" style="width:100%;margin-top:4px;color:var(--text-1)">
                ${d.def.products.filter((p) => p.hl > 0).map((p) => `<option value="${esc(p.sku)}">${esc(p.name)} — ${esc(p.format)}</option>`).join('')}
              </select>
            </label>
            <label style="font-size:11.5px;color:var(--text-2);font-weight:500">Motivatie
              <select class="filter-select" id="ar-motivation" style="width:100%;margin-top:4px;color:var(--text-1)">
                <option>Veel vraag van vaste gasten</option>
                <option>Tapkraan vrijgekomen</option>
                <option>Past bij nieuw menuconcept</option>
                <option>Seizoensvraag verwacht</option>
                <option>Upgrade naar premium segment gewenst</option>
              </select>
            </label>
            <button class="btn btn-primary" id="ar-submit" style="align-self:flex-start"><i data-lucide="send"></i>Verzoek indienen</button>
          </div>
        </div>
        <div class="card">
          <div class="card-header"><div><div class="card-title">Mijn verzoeken</div><div class="card-sub">Status van uw aanvragen</div></div></div>
          <div class="card-body" id="ar-list"></div>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><div><div class="card-title">Beschikbare acties</div><div class="card-sub">Campagnes van ${esc(d.def.name)} waar uw zaak aan kan deelnemen</div></div></div>
        <div class="card-body" style="display:flex;flex-direction:column;gap:10px" id="campaign-list"></div>
      </div>
    </div>`;

    function renderList() {
      $('#ar-list').innerHTML = h.myRequests.length ? `<table class="line-items">${h.myRequests.map((r) => `
        <tr><td><span class="td-strong">${esc(r.product)}</span><span class="td-sub">${esc(r.id)} · ${esc(r.date)}</span></td>
        <td class="num">${badge(r.status)}</td></tr>`).join('')}</table>`
        : emptyState('list-plus', 'Nog geen verzoeken', 'Dien links een verzoek in om uw assortiment uit te breiden.');
      refreshIcons();
    }
    renderList();

    $('#campaign-list').innerHTML = h.openCampaigns.length ? h.openCampaigns.map((c) => `
      <div style="display:flex;align-items:center;gap:10px;border:1px solid var(--offset);border-radius:var(--radius-sm);padding:10px 12px;flex-wrap:wrap">
        <div style="min-width:0">
          <div class="td-strong" style="font-size:12.5px">${esc(c.name)}</div>
          <div class="td-sub">${esc(c.type)} · ${esc(c.period)}${c.uplift ? ` · gem. uplift +${fmt.dec(c.uplift)}%` : ''}</div>
        </div>
        <button class="btn btn-sm join-btn" style="margin-left:auto">Aanmelden</button>
      </div>`).join('') : emptyState('megaphone', 'Geen acties beschikbaar', 'Er lopen momenteel geen campagnes voor uw zaak.');
    $('#campaign-list').querySelectorAll('.join-btn').forEach((b) => {
      b.addEventListener('click', () => {
        b.outerHTML = '<span class="badge badge-good" style="margin-left:auto"><i data-lucide="check"></i>Aangemeld</span>';
        refreshIcons();
      });
    });

    $('#ar-submit').addEventListener('click', () => {
      const sku = $('#ar-product').value;
      const p = d.def.products.find((x) => x.sku === sku);
      h.myRequests.unshift({ id: 'AV-' + (9100 + Math.floor(Math.random() * 800)), product: p.name, format: p.format, date: 'vandaag', status: 'Nieuw', motivation: $('#ar-motivation').value });
      renderList();
    });
  }

  // =========================================================
  // AI-agent: gesimuleerde 24/7 inzichten, alerts & chatbot
  // =========================================================
  const AI_KINDS = { crit: 'trending-down', warn: 'triangle-alert', good: 'circle-check-big', info: 'lightbulb' };

  function agentSignals(d) {
    const env = state.env;
    if (env === 'insights') {
      const worst = d.outlets.filter((o) => o.status === 'Actief').reduce((a, b) => (b.trend < a.trend ? b : a));
      const best = d.def.campaigns.filter((c) => c.status === 'Actief' && c.uplift).reduce((a, b) => (b.uplift > a.uplift ? b : a));
      const focus = { heineken: 'On-Trade volume loopt voor op vorig jaar — activatiedruk vasthouden in het terrasseizoen.', duvel: 'Marge per HL stijgt; premium placements renderen — kwaliteit boven volume blijft het advies.', bavaria: 'Alcoholvrij groeit het hardst van het portfolio — extra schapruimte voor 0.0% loont.' }[state.brand];
      return [
        { kind: 'crit', text: `Rotatie bij <strong>${esc(worst.name)}</strong> (${esc(worst.city)}) daalt ${fmt.dec(Math.abs(worst.trend))}% — agent adviseert een activatiebezoek.` },
        { kind: 'good', text: `<strong>${esc(best.name)}</strong> levert +${fmt.dec(best.uplift)}% uplift — overweeg uitbreiding naar vergelijkbare outlets.` },
        { kind: 'info', text: focus },
      ];
    }
    if (env === 'orders') {
      const orders = allOrders();
      const pending = orders.filter((o) => o.status === 'In behandeling');
      const oldest = pending.reduce((a, b) => (b.daysAgo > (a?.daysAgo ?? -1) ? b : a), null);
      return [
        { kind: 'warn', text: `<strong>${d.kegs.fleet.overdue} outlets</strong> hebben fusten langer dan 60 dagen uitstaan — retourrit inplannen bespaart emballagekosten.` },
        oldest ? { kind: 'crit', text: `Order <strong>${esc(oldest.id)}</strong> (${esc(oldest.brand || '')}) wacht al ${oldest.daysAgo} dagen op bevestiging.` } : null,
        { kind: 'info', text: `${pending.length} orders in behandeling over alle merken — piek verwacht rond de vaste leverdagen.` },
      ].filter(Boolean);
    }
    const h = d.horeca;
    return [
      { kind: 'info', text: `Uw volgende levering staat gepland op <strong>${esc(h.nextDelivery)}</strong> — bestel vóór 17:00 om mee te gaan.` },
      { kind: 'warn', text: `U heeft <strong>${h.kegsOut} fusten</strong> in bezit. Scan ze bij retour, dan verrekenen we het emballagesaldo direct.` },
      h.openCampaigns[0] ? { kind: 'good', text: `Actie <strong>${esc(h.openCampaigns[0].name)}</strong> past bij uw zaak — aanmelden kan via Assortiment & acties.` } : null,
    ].filter(Boolean);
  }

  function agentStrip(d) {
    const s = agentSignals(d)[0];
    if (!s) return '';
    return `<div class="agent-strip">
      <span class="as-icon"><i data-lucide="bot"></i></span>
      <span><strong>AI-agent:</strong> ${s.text}</span>
      <button class="btn btn-sm" data-open-agent><i data-lucide="message-square"></i>Open agent</button>
    </div>`;
  }

  const AI_CHIPS = {
    insights: ['Grootste dalers', 'Beste campagne', 'Kanaalverdeling'],
    orders: ['Achterstallige fusten', 'Openstaande orders', 'Nieuwe verzoeken'],
    horeca: ['Volgende levering', 'Fusten retour', 'Lopende acties'],
  };

  function aiTime() { return new Date().toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' }); }

  function aiAddMsg(role, html, meta) {
    const body = $('#ai-body');
    const el = document.createElement('div');
    el.className = `ai-msg ${role}`;
    el.innerHTML = `<div class="bubble">${html}</div><div class="msg-meta">${esc(meta || aiTime())}</div>`;
    body.appendChild(el);
    body.scrollTop = body.scrollHeight;
    refreshIcons(body);
    return el;
  }

  function aiGreeting(d) {
    const name = { insights: 'Insights-agent', orders: 'Order-agent', horeca: 'Horeca-assistent' }[state.env];
    const tone = {
      heineken: `Goedendag. Ik ben uw ${name} voor Heineken en monitor volume, distributie en activaties — 24/7.`,
      duvel: `Welkom. Als ${name} voor Duvel bewaak ik marge, rotatie en schenkkwaliteit van het craft-portfolio.`,
      bavaria: `Hallo! Ik ben uw ${name} voor Bavaria. Ik hou acties, schaprotatie en 0.0% in de gaten. Waar kan ik mee helpen?`,
    }[state.brand];
    const signals = agentSignals(d).map((s) => `<li class="ai-alert ${s.kind}"><i data-lucide="${AI_KINDS[s.kind]}"></i><span>${s.text}</span></li>`).join('');
    return `${esc(tone)}<ul style="list-style:none;padding-left:0">${signals}</ul>`;
  }

  function aiReply(d, q) {
    const t = q.toLowerCase();
    const h = d.horeca;
    if (/(daler|rotatie|slechtst|outlet)/.test(t)) {
      const worst = d.outlets.filter((o) => o.status === 'Actief').sort((a, b) => a.trend - b.trend).slice(0, 3);
      return `De sterkste dalers in rotatie op dit moment:<ul>${worst.map((o) => `<li><strong>${esc(o.name)}</strong> (${esc(o.city)}): ${fmt.dec(o.trend)}% · ${fmt.dec(o.rotation)} ×/wk</li>`).join('')}</ul>Mijn advies: plan activatiebezoeken en check de tapkwaliteit.`;
    }
    if (/(campagne|actie|uplift|activatie)/.test(t)) {
      const act = d.def.campaigns.filter((c) => c.status === 'Actief' && c.uplift).sort((a, b) => b.uplift - a.uplift).slice(0, 3);
      return `Best presterende campagnes:<ul>${act.map((c) => `<li><strong>${esc(c.name)}</strong>: +${fmt.dec(c.uplift)}% uplift · ${fmt.int(c.outlets)} outlets</li>`).join('')}</ul>`;
    }
    if (/(kanaal|on-trade|off-trade|verdeling)/.test(t)) {
      const on = d.monthly.reduce((s, m) => s + m.on, 0); const off = d.monthly.reduce((s, m) => s + m.off, 0);
      const pct = Math.round((on / (on + off)) * 100);
      return `Kanaalverdeling laatste 12 maanden voor ${esc(d.def.name)}: <strong>${pct}% On-Trade</strong> (${fmt.int(on)} HL) tegenover <strong>${100 - pct}% Off-Trade</strong> (${fmt.int(off)} HL).`;
    }
    if (/fust|keg|emballage|retour/.test(t)) {
      if (state.env === 'horeca') return `U heeft <strong>${h.kegsOut} fusten</strong> in bezit. Scan de QR-code op het fust bij retour — het emballagesaldo wordt direct bijgewerkt.`;
      return `Er staan <strong>${fmt.int(d.kegs.fleet.out)} fusten</strong> uit bij outlets; ${d.kegs.fleet.overdue} outlets zitten boven de 60 dagen. De gemiddelde omlooptijd is ${d.kegs.fleet.avgCycle} dagen.`;
    }
    if (/order|bestell|levering/.test(t)) {
      if (state.env === 'horeca') return `Uw volgende levering: <strong>${esc(h.nextDelivery)}</strong>. U heeft ${h.orders.filter((o) => !['Geleverd', 'Geannuleerd'].includes(o.status)).length} openstaande orders. Bestellen kan tot 17:00 via “Bestellen”.`;
      const open = allOrders().filter((o) => !['Geleverd', 'Geannuleerd'].includes(o.status));
      return `Er staan <strong>${open.length} orders</strong> open over alle merken, waarvan ${open.filter((o) => o.status === 'In behandeling').length} nog te bevestigen. Het oudste onbevestigde order vindt u bovenaan Orderbeheer met status “In behandeling”.`;
    }
    if (/verzoek|assortiment/.test(t)) {
      const fresh = d.requests.filter((r) => ['Nieuw', 'In review'].includes(r.status));
      return `Er liggen <strong>${fresh.length} assortimentsverzoeken</strong> ter beoordeling. Gemiddelde verwachte rotatie: ${fmt.dec(d.requests.reduce((s, r) => s + r.expectedRotation, 0) / d.requests.length)} ×/wk.`;
    }
    if (/voorraad|prognose|dekking/.test(t)) {
      const weekly = d.def.scale.ytdHL / 52;
      return `De depotvoorraad dekt circa <strong>${fmt.dec(6.4, 1)} weken</strong> bij het huidige verbruik van ~${fmt.int(Math.round(weekly))} HL/wk. Zie Voorraadprognose voor de projectie per SKU.`;
    }
    if (/(hallo|hoi|help|hulp|wat kan)/.test(t)) {
      return `Ik analyseer continu de ${esc(d.def.name)}-data. Vraag me bijvoorbeeld naar <strong>rotatie-dalers</strong>, <strong>campagne-uplift</strong>, <strong>kanaalverdeling</strong>, <strong>fusten</strong> of <strong>openstaande orders</strong>.`;
    }
    return `Daar heb ik nog geen kant-en-klare analyse voor. Probeer een vraag over <strong>rotatie</strong>, <strong>campagnes</strong>, <strong>fusten</strong>, <strong>orders</strong> of <strong>voorraad</strong> — of gebruik de suggesties hieronder.`;
  }

  function aiReset() {
    const body = $('#ai-body');
    if (!body) return;
    body.innerHTML = '';
    $('#ai-title').textContent = { insights: 'Insights-agent', orders: 'Order-agent', horeca: 'Horeca-assistent' }[state.env] + ' · ' + data().def.name;
    $('#ai-chips').innerHTML = AI_CHIPS[state.env].map((c) => `<button class="ai-chip">${esc(c)}</button>`).join('');
    $('#ai-chips').querySelectorAll('.ai-chip').forEach((b) => b.addEventListener('click', () => aiSend(b.textContent)));
    aiAddMsg('agent', aiGreeting(data()));
  }

  function aiSend(text) {
    const q = (text || $('#ai-input').value).trim();
    if (!q) return;
    $('#ai-input').value = '';
    aiAddMsg('user', esc(q));
    const typing = aiAddMsg('agent', '<span class="typing"><i></i><i></i><i></i></span>', '…');
    setTimeout(() => {
      typing.querySelector('.bubble').innerHTML = aiReply(data(), q);
      typing.querySelector('.msg-meta').textContent = aiTime();
      $('#ai-body').scrollTop = $('#ai-body').scrollHeight;
      refreshIcons();
    }, 750 + Math.random() * 550);
  }

  function aiOpen() {
    state.aiOpen = true;
    $('#ai-drawer').hidden = false;
    if (!$('#ai-body').childElementCount) aiReset();
    $('#ai-input').focus();
  }
  function aiClose() { state.aiOpen = false; $('#ai-drawer').hidden = true; }

  // =========================================================
  // QR-scan flow (horeca): scan → statusupdate → toast
  // =========================================================
  let qrTimer = null;
  function qrClose() {
    clearTimeout(qrTimer);
    $('#qr-modal').hidden = true;
  }
  function openQrScan(d) {
    const frame = $('#qr-frame');
    frame.classList.remove('success');
    $('#qr-success').hidden = true;
    $('#qr-status').innerHTML = 'Richt de camera op de QR-code op het fust…';
    $('#qr-modal').hidden = false;
    clearTimeout(qrTimer);
    qrTimer = setTimeout(() => {
      const kegId = 'HK-' + (4700 + Math.floor(Math.random() * 300));
      frame.classList.add('success');
      $('#qr-success').hidden = false;
      $('#qr-status').innerHTML = `<strong>Fust ${kegId} herkend</strong><br>Retour geregistreerd voor ${esc(d.horeca.outlet)}`;
      refreshIcons();
      d.horeca.kegsOut = Math.max(0, d.horeca.kegsOut - 1);
      qrTimer = setTimeout(() => {
        qrClose();
        toast('Fust retour gemeld', `${kegId} verwerkt · emballagesaldo bijgewerkt`, 'good');
        if (state.env === 'horeca' && state.view === 'home') renderView();
      }, 1700);
    }, 2400);
  }

  // =========================================================
  // Init
  // =========================================================
  document.querySelectorAll('.env-btn').forEach((b) => b.addEventListener('click', () => { setEnv(b.dataset.env); closeSidebar(); }));
  document.querySelectorAll('.brand-btn').forEach((b) => {
    b.addEventListener('click', () => setBrand(b.dataset.brand));
    // label in span voor responsive verbergen
    const label = b.childNodes[b.childNodes.length - 1];
    const span = document.createElement('span');
    span.className = 'brand-label';
    span.textContent = label.textContent.trim();
    b.replaceChild(span, label);
  });
  $('#theme-toggle').addEventListener('click', toggleTheme);
  $('#menu-btn').addEventListener('click', () => {
    $('#sidebar').classList.toggle('open');
    $('#sidebar-scrim').classList.toggle('visible', $('#sidebar').classList.contains('open'));
  });
  $('#sidebar-scrim').addEventListener('click', closeSidebar);

  // Login hub: 3 rollen
  function login(role) {
    state.loggedIn = true;
    state.env = role;
    state.view = NAV[role].defaultView;
    $('#login-hub').classList.add('app-hidden');
    $('#app').classList.remove('app-hidden');
    $('#ai-body').innerHTML = '';
    render(true);
    const [name] = data().def.persona[role];
    toast('Ingelogd', `Welkom terug, ${name} — de AI-agent kijkt met u mee.`, 'info');
  }
  function logout() {
    state.loggedIn = false;
    aiClose();
    qrClose();
    KMCharts.destroyAll();
    $('#app').classList.add('app-hidden');
    $('#login-hub').classList.remove('app-hidden');
  }
  document.querySelectorAll('.role-card').forEach((b) => b.addEventListener('click', () => login(b.dataset.role)));
  $('#back-btn').addEventListener('click', logout);

  // AI-agent
  $('#ai-fab').addEventListener('click', () => (state.aiOpen ? aiClose() : aiOpen()));
  $('#ai-close').addEventListener('click', aiClose);
  $('#ai-send').addEventListener('click', () => aiSend());
  $('#ai-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') aiSend(); });
  main.addEventListener('click', (e) => {
    if (e.target.closest('[data-open-agent]')) aiOpen();
  });

  // QR-scan
  $('#qr-close').addEventListener('click', qrClose);
  $('#qr-modal').addEventListener('click', (e) => { if (e.target === $('#qr-modal')) qrClose(); });

  refreshIcons();
})();
