/* ============================================================
   Keymerch — DataService (repository-laag).

   Doel: één asynchrone koppelvlaklaag tussen de views en de
   databron. Views praten uitsluitend met `KMDS`; waar de data
   vandaan komt (seeded mock, REST-API, Salesforce, Oracle) is
   een adapterkeuze en raakt de views niet.

   Ontwerp:
   - Alle reads/writes zijn async en geven een REST-achtige
     envelope terug: { data, meta: { resource, total, … } }.
   - Reads:  KMDS.snapshot(brand)          → dashboard-payload
             KMDS.query(resource, params)  → OData-achtige query
             KMDS.getAllOrders()           → cross-brand orderbook
             KMDS.getNavCounts(brand)      → badge-tellers
   - Writes: KMDS.execute(command, payload) — command-gebaseerd;
             views muteren nooit zelf data-objecten.
   - Afgeleide analytics: KMDS.select.* — pure functies over een
     snapshot; later 1-op-1 vervangbaar door analytics-endpoints.
   - Adapters: createMockAdapter() (default, seeded generatoren
     uit data.js) en createHttpAdapter() (skelet voor een echte
     backend). Swappen via KMDS.configure(adapter).
   ============================================================ */

(function () {
  'use strict';

  // ---------------------------------------------------------
  // Envelope: uniforme response-vorm (REST-achtig)
  // ---------------------------------------------------------
  function envelope(data, meta = {}) {
    return { data, meta: Object.assign({ source: activeAdapter.name, at: Date.now() }, meta) };
  }

  // ---------------------------------------------------------
  // Generieke query-engine (OData-achtig): q, filter, sort, top, skip.
  // Bij een echte backend vertaalt de HttpAdapter dit naar
  // $search / $filter / $orderby / $top / $skip querystrings.
  // ---------------------------------------------------------
  const collator = new Intl.Collator('nl');
  function applyQuery(rows, params = {}) {
    let out = rows;
    if (params.q) {
      const needle = String(params.q).toLowerCase();
      const keys = params.qKeys || Object.keys(rows[0] || {});
      out = out.filter((r) => keys.some((k) => String(r[k] ?? '').toLowerCase().includes(needle)));
    }
    if (params.filter) {
      for (const [k, v] of Object.entries(params.filter)) {
        if (v !== undefined && v !== null && v !== '') out = out.filter((r) => String(r[k]) === String(v));
      }
    }
    if (params.sort) {
      const dir = params.dir === 'asc' ? 1 : -1;
      out = out.slice().sort((a, b) => {
        const av = a[params.sort], bv = b[params.sort];
        if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
        return collator.compare(String(av), String(bv)) * dir;
      });
    }
    const total = out.length;
    if (params.skip) out = out.slice(params.skip);
    if (params.top) out = out.slice(0, params.top);
    return { rows: out, total };
  }

  // ---------------------------------------------------------
  // MockAdapter — wrapt de seeded generatoren uit data.js.
  // Dit is de "backend" van het prototype; hij bezit de store
  // en voert alle commands (writes) uit.
  // ---------------------------------------------------------
  function createMockAdapter() {
    function store(brand) {
      const snap = KM.getBrandData(brand);
      // Horeca "mijn verzoeken" hoort bij de store, niet bij een view.
      if (!snap.horeca.myRequests) {
        const p = snap.horeca.products;
        snap.horeca.myRequests = [
          { id: 'AV-9101', product: p[2]?.name || p[0].name, format: p[2]?.format || p[0].format, date: '2 jul', status: 'In review', motivation: 'Veel vraag van vaste gasten' },
          { id: 'AV-9084', product: p[4]?.name || p[1].name, format: p[4]?.format || p[1].format, date: '18 jun', status: 'Goedgekeurd', motivation: 'Tapkraan vrijgekomen' },
        ];
      }
      return snap;
    }

    function collection(snap, resource) {
      switch (resource) {
        case 'outlets': return snap.outlets;
        case 'orders': return snap.orders;
        case 'requests': return snap.requests;
        case 'campaigns': return snap.def.campaigns;
        case 'products': return snap.def.products;
        case 'kegs': return snap.kegs.rows;
        default: throw new Error(`Onbekende resource: ${resource}`);
      }
    }

    const commands = {
      // PATCH /orders/{id} { status }
      'orders.setStatus'({ key, status }) {
        const [brandKey, id] = String(key).split(':');
        const order = store(brandKey).orders.find((o) => o.id === id);
        if (!order) throw new Error(`Order niet gevonden: ${key}`);
        order.status = status;
        return order;
      },
      // PATCH /assortment-requests/{id} { status }
      'requests.setStatus'({ brand, id, status }) {
        const req = store(brand).requests.find((r) => r.id === id);
        if (!req) throw new Error(`Verzoek niet gevonden: ${id}`);
        req.status = status;
        return req;
      },
      // POST /horeca/orders { lines: [{ sku, qty }] }
      'horeca.createOrder'({ brand, lines }) {
        const snap = store(brand);
        const h = snap.horeca;
        const full = lines.map(({ sku, qty }) => {
          const p = h.products.find((x) => x.sku === sku);
          return { sku: p.sku, name: p.name, format: p.format, qty, price: p.price, hl: p.hl };
        });
        const hl = full.reduce((s, l) => s + l.hl * l.qty, 0);
        const value = full.reduce((s, l) => s + l.price * l.qty, 0);
        const kegs = full.filter((l) => l.format.startsWith('Fust')).reduce((s, l) => s + l.qty, 0);
        const order = {
          id: 'ORD-2026-' + String(900 + Math.floor(Math.random() * 90)).padStart(4, '0'),
          outlet: h.outlet, city: h.city, segment: 'On-Trade',
          date: 'vandaag', daysAgo: 0,
          lines: full, hl: +hl.toFixed(2), value: Math.round(value), kegs,
          status: 'In behandeling', delivery: h.nextDelivery, ref: 'PORTAAL',
        };
        h.orders.unshift(order);
        return order;
      },
      // POST /horeca/assortment-requests { sku, motivation }
      'horeca.createRequest'({ brand, sku, motivation }) {
        const snap = store(brand);
        const p = snap.def.products.find((x) => x.sku === sku);
        if (!p) throw new Error(`Product niet gevonden: ${sku}`);
        const req = { id: 'AV-' + (9100 + Math.floor(Math.random() * 800)), product: p.name, format: p.format, date: 'vandaag', status: 'Nieuw', motivation };
        snap.horeca.myRequests.unshift(req);
        return req;
      },
      // POST /horeca/keg-returns {}
      'horeca.registerKegReturn'({ brand }) {
        const h = store(brand).horeca;
        h.kegsOut = Math.max(0, h.kegsOut - 1);
        return { kegId: 'HK-' + (4700 + Math.floor(Math.random() * 300)), kegsOut: h.kegsOut };
      },
    };

    return {
      name: 'mock',
      async fetchSnapshot(brand) { return store(brand); },
      async fetchCollection(brand, resource, params) {
        const { rows, total } = applyQuery(collection(store(brand), resource), params);
        return { rows, total };
      },
      async execute(command, payload) {
        const fn = commands[command];
        if (!fn) throw new Error(`Onbekend command: ${command}`);
        return fn(payload);
      },
    };
  }

  // ---------------------------------------------------------
  // HttpAdapter — skelet voor de echte backend-koppeling.
  // Zelfde interface als de MockAdapter; de service en de views
  // veranderen niet bij de swap. Een integratielaag (bv. een
  // BFF vóór Salesforce/Oracle) levert de payloads in dezelfde
  // vorm als de mock-snapshot.
  //
  //   KMDS.configure(KMDS.createHttpAdapter({ baseUrl: '/api/v1' }));
  // ---------------------------------------------------------
  function createHttpAdapter({ baseUrl, headers = {} } = {}) {
    async function http(method, path, body) {
      const res = await fetch(baseUrl + path, {
        method,
        headers: Object.assign({ 'Content-Type': 'application/json' }, headers),
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) throw new Error(`API ${method} ${path} → ${res.status}`);
      return res.json();
    }
    return {
      name: 'http',
      // GET /brands/{brand}/snapshot → zelfde vorm als de mock-snapshot
      async fetchSnapshot(brand) { return http('GET', `/brands/${brand}/snapshot`); },
      // GET /brands/{brand}/{resource}?$search=&$filter=&$orderby=&$top=&$skip=
      async fetchCollection(brand, resource, params = {}) {
        const qs = new URLSearchParams();
        if (params.q) qs.set('$search', params.q);
        if (params.filter) qs.set('$filter', Object.entries(params.filter).filter(([, v]) => v).map(([k, v]) => `${k} eq '${v}'`).join(' and '));
        if (params.sort) qs.set('$orderby', `${params.sort} ${params.dir || 'desc'}`);
        if (params.top) qs.set('$top', params.top);
        if (params.skip) qs.set('$skip', params.skip);
        const body = await http('GET', `/brands/${brand}/${resource}?${qs}`);
        return { rows: body.value, total: body['@odata.count'] ?? body.value.length };
      },
      // POST /commands/{command} — of specifieke REST-routes per command
      async execute(command, payload) { return http('POST', `/commands/${command}`, payload); },
    };
  }

  // ---------------------------------------------------------
  // Service-kern
  // ---------------------------------------------------------
  let activeAdapter = createMockAdapter();

  const KMDS = {
    configure(adapter) { activeAdapter = adapter; },
    createHttpAdapter,
    createMockAdapter,

    // Statische merk-metadata (topbar, chips, persona's).
    brands() {
      return Object.values(KM.BRAND_DEFS).map((b) => ({ key: b.key, name: b.name, chip: b.chip }));
    },
    brandMeta(key) {
      const b = KM.BRAND_DEFS[key];
      return { key: b.key, name: b.name, chip: b.chip, persona: b.persona };
    },

    enums: { ORDER_STATUSES: KM.ORDER_STATUSES, AR_STATUSES: KM.AR_STATUSES },

    // Volledige dashboard-payload per merk (envelope).
    async getSnapshot(brand) {
      const snap = await activeAdapter.fetchSnapshot(brand);
      return envelope(snap, { resource: 'snapshot', brand });
    },
    // Convenience: alleen de payload.
    async snapshot(brand) { return (await this.getSnapshot(brand)).data; },

    // OData-achtige collectie-query.
    async query(resource, params = {}) {
      const { rows, total } = await activeAdapter.fetchCollection(params.brand, resource, params);
      return envelope(rows, { resource, brand: params.brand, total, returned: rows.length });
    },

    // Cross-brand orderbook: samenstelling + annotatie hoort bij
    // de datalaag (bij een echte backend: GET /orders?expand=brand).
    async getAllOrders() {
      const rows = [];
      for (const b of this.brands()) {
        const snap = await activeAdapter.fetchSnapshot(b.key);
        for (const o of snap.orders) {
          if (!o.key) { o.key = b.key + ':' + o.id; o.brand = b.name; o.brandKey = b.key; }
          rows.push(o);
        }
      }
      rows.sort((a, b) => a.daysAgo - b.daysAgo);
      return envelope(rows, { resource: 'orders', scope: 'all-brands', total: rows.length });
    },

    // Badge-tellers voor de navigatie (bij een echte backend:
    // GET /nav/counts — één goedkope geaggregeerde call).
    async getNavCounts(brand) {
      const [{ data: all }, snap] = await Promise.all([this.getAllOrders(), this.snapshot(brand)]);
      return envelope({
        orderbook: all.filter((o) => !['Geleverd', 'Geannuleerd'].includes(o.status)).length,
        requests: snap.requests.filter((r) => ['Nieuw', 'In review'].includes(r.status)).length,
        kegs: snap.kegs.fleet.overdue,
      }, { resource: 'nav-counts', brand });
    },

    // Writes: command-gebaseerd. Elke mutatie loopt hierdoor;
    // bij een echte backend wordt elk command een POST/PATCH.
    async execute(command, payload) {
      const result = await activeAdapter.execute(command, payload);
      return envelope(result, { command });
    },

    // -------------------------------------------------------
    // Selectors: afgeleide analytics als pure functies over een
    // snapshot. Nu client-side berekend; later te vervangen door
    // analytics-endpoints met identieke uitvoer.
    // -------------------------------------------------------
    select: {
      // Volume/rotatie/trend per verkoopbare SKU (deterministisch).
      skuPerformance(d) {
        const sellable = d.def.products.filter((p) => p.hl > 0);
        const weights = sellable.map((_, i) => 1 / (i + 1.6));
        const wSum = weights.reduce((a, b) => a + b, 0);
        return sellable.map((p, i) => ({
          ...p,
          volume: +(d.def.scale.ytdHL * (weights[i] / wSum)).toFixed(0),
          rotation: +(1.1 + ((i * 37) % 30) / 8).toFixed(1),
          trend: +(-6 + ((i * 53) % 170) / 10).toFixed(1),
        }));
      },
      // Voorraaddekking per SKU voor de prognose-view.
      skuCoverage(d) {
        const sellable = d.def.products.filter((p) => p.hl > 0);
        const weights = sellable.map((_, i) => 1 / (i + 1.6));
        const wSum = weights.reduce((a, b) => a + b, 0);
        return sellable.map((p, i) => {
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
      },
      // 12-weekse depotprojectie: voorraad vs. verwacht verbruik.
      forecastProjection(d) {
        const weeklyUse = d.def.scale.ytdHL / 52;
        const currentStock = Math.round(weeklyUse * 6.4);
        const reorderPoint = Math.round(weeklyUse * 3);
        const weeks = Array.from({ length: 12 }, (_, i) => 'wk ' + (29 + i));
        const seasonal = [1.06, 1.09, 1.11, 1.04, 0.98, 0.95, 0.92, 0.9, 0.93, 0.97, 1.0, 1.02];
        let stock = currentStock;
        let cumUse = 0;
        const stockLine = [], useLine = [];
        seasonal.forEach((f) => {
          const use = weeklyUse * f;
          cumUse += use;
          stock -= use;
          if (stock < reorderPoint) stock += weeklyUse * 5; // geplande aanvulling vanuit brouwerij
          stockLine.push(Math.round(stock));
          useLine.push(Math.round(cumUse));
        });
        return { weeks, stockLine, useLine, weeklyUse, currentStock, reorderPoint, coverWeeks: currentStock / weeklyUse };
      },
      // Kanaaltotalen laatste 12 maanden.
      channelTotals(d) {
        const on = d.monthly.reduce((s, m) => s + m.on, 0);
        const off = d.monthly.reduce((s, m) => s + m.off, 0);
        return { on, off, onPct: Math.round((on / (on + off)) * 100) };
      },
    },
  };

  window.KMDS = KMDS;
})();
