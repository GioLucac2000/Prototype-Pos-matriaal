/* ============================================================
   Keymerch — datalaag met brand-personalisatie.
   Alle data is deterministisch gegenereerd (seeded RNG) zodat
   de applicatie stabiel oogt zonder backend of storage.
   ============================================================ */

(function () {
  'use strict';

  // Mulberry32 — deterministische RNG per merk
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const pick = (r, arr) => arr[Math.floor(r() * arr.length)];
  const ri = (r, min, max) => Math.floor(r() * (max - min + 1)) + min;
  const rf = (r, min, max, dec = 1) => +(r() * (max - min) + min).toFixed(dec);

  const CITIES = ['Amsterdam', 'Rotterdam', 'Utrecht', 'Den Haag', 'Eindhoven', 'Groningen', 'Tilburg', 'Breda', 'Nijmegen', 'Haarlem', 'Arnhem', 'Zwolle', 'Maastricht', 'Leiden', 'Delft', 'Den Bosch', 'Alkmaar', 'Amersfoort'];

  const ONTRADE_NAMES = ['Café De Kroon', "Proeflokaal 't Anker", 'Bar Centraal', 'Grand Café Brinkmann', 'Eetcafé De Zwaan', 'Café Vrijdag', 'Biercafé Hop & Mout', 'De Gouden Leeuw', 'Café De Sport', 'Brasserie Zuid', 'Lokaal Noord', "Café 't Vat", 'De Blauwe Druif', 'Muziekcafé Mojo', 'Strandpaviljoen Zee', 'Café De Buren', 'Bierhuis De Pomp', 'Stadscafé Rembrandt', 'Café De Klok', 'Herberg De Waag', 'Grand Café Luxor', 'Café Stampij', 'De Verloren Zoon', 'Café Batavia', 'Taveerne De Molen', 'Café De Beurs', 'Restaurant Vermeer', "Grandcafé 't Gerecht", 'Café De Unie', 'Paviljoen De Kade'];
  const OFFTRADE_NAMES = ['Albert Heijn', 'Jumbo', 'PLUS', 'Dirk van den Broek', 'Coop', 'Spar City', 'Vomar', 'DekaMarkt', 'Hoogvliet', 'Poiesz', 'Boni', 'MCD', 'Slijterij Van Erp', 'Gall & Gall', 'Mitra'];
  const CONTACTS = ['J. van Dijk', 'S. Jansen', 'M. de Boer', 'L. Visser', 'A. Bakker', 'P. de Groot', 'R. Mulder', 'E. Smit', 'T. Meijer', 'K. Bos', 'F. Vos', 'D. Peters', 'N. Hendriks', 'W. Dekker', 'C. van Leeuwen'];

  const ORDER_STATUSES = ['Concept', 'In behandeling', 'Bevestigd', 'In levering', 'Geleverd', 'Geannuleerd'];
  const AR_STATUSES = ['Nieuw', 'In review', 'Goedgekeurd', 'Afgewezen'];

  // ---------------------------------------------------------
  // Merkdefinities: toon, terminologie, datanadruk, portfolio
  // ---------------------------------------------------------
  const BRAND_DEFS = {
    heineken: {
      key: 'heineken',
      name: 'Heineken',
      seed: 190847,
      chip: '#037A3B',
      tone: 'corporate',
      persona: { insights: ['M. van Bergen', 'Global Insights Manager'], orders: ['R. Koster', 'Order Operations'], horeca: ['Café De Kroon', 'Horeca-partner Amsterdam'] },
      horecaOutletName: 'Café De Kroon',
      horecaCity: 'Amsterdam',
      copy: {
        insightsSub: 'Volume- en activatieprestaties over alle On-Trade en Off-Trade kanalen, in hectoliters.',
        insightsBanner: 'Focus deze periode: <strong>On-Trade activatie</strong>. Terrasseizoen loopt — stuur op volume, distributiegraad en campagne-uitrol per regio.',
        ordersSub: 'Centrale orderafhandeling voor het volledige Heineken-portfolio: fusten, kratten en blik.',
        horecaWelcome: 'Welkom terug. Bestel fusten en activatiematerialen, volg leveringen en meld u aan voor campagnes.',
        volumeCard: 'Volume per maand (HL)',
        channelCard: 'Kanaalverdeling volume',
      },
      // datanadruk: volume & activatie
      emphasis: { primaryMetric: 'volume', secondary: 'activatie' },
      scale: { ytdHL: 48520, avgOrderHL: 14, priceHL: 205 },
      channelSplit: { on: 58, off: 42 },
      monthlyBase: [3480, 3320, 3610, 3390, 3180, 3050, 3260, 3540, 3920, 4260, 4480, 4030],
      products: [
        { sku: 'HEI-F50', name: 'Heineken Pilsener', format: 'Fust 50L', hl: 0.5, price: 148, cat: 'Pils', channel: 'On-Trade' },
        { sku: 'HEI-F20', name: 'Heineken Pilsener', format: 'Fust 20L', hl: 0.2, price: 64, cat: 'Pils', channel: 'On-Trade' },
        { sku: 'HEI-00-F20', name: 'Heineken 0.0', format: 'Fust 20L', hl: 0.2, price: 61, cat: 'Alcoholvrij', channel: 'On-Trade' },
        { sku: 'HEI-KR24', name: 'Heineken Pilsener', format: 'Krat 24×30cl', hl: 0.072, price: 16.8, cat: 'Pils', channel: 'Off-Trade' },
        { sku: 'HEI-00-TR', name: 'Heineken 0.0', format: 'Tray 24×33cl blik', hl: 0.079, price: 15.9, cat: 'Alcoholvrij', channel: 'Off-Trade' },
        { sku: 'HEI-SIL-F50', name: 'Heineken Silver', format: 'Fust 50L', hl: 0.5, price: 142, cat: 'Pils', channel: 'On-Trade' },
        { sku: 'AMS-F50', name: 'Amstel Bier', format: 'Fust 50L', hl: 0.5, price: 132, cat: 'Pils', channel: 'On-Trade' },
        { sku: 'AMS-RAD-TR', name: 'Amstel Radler 2.0', format: 'Tray 24×33cl blik', hl: 0.079, price: 14.2, cat: 'Radler', channel: 'Off-Trade' },
        { sku: 'BRA-F20', name: 'Brand IPA', format: 'Fust 20L', hl: 0.2, price: 74, cat: 'Speciaal', channel: 'On-Trade' },
        { sku: 'AFF-F20', name: 'Affligem Blond', format: 'Fust 20L', hl: 0.2, price: 78, cat: 'Speciaal', channel: 'On-Trade' },
        { sku: 'DES-TR', name: 'Desperados Original', format: 'Tray 24×33cl', hl: 0.079, price: 21.4, cat: 'Speciaal', channel: 'Off-Trade' },
        { sku: 'HEI-PREM-GL', name: 'Heineken Glaswerk Premium', format: 'Doos 24 vaasjes', hl: 0, price: 38, cat: 'POS-materiaal', channel: 'On-Trade' },
      ],
      campaigns: [
        { name: 'UEFA EK Zomeractivatie', type: 'Campagne-activatie', period: 'jun – jul 2026', status: 'Actief', outlets: 412, uplift: 12.4, budget: '€ 480K' },
        { name: 'Terrasseizoen Kick-off', type: 'On-Trade activatie', period: 'apr – sep 2026', status: 'Actief', outlets: 688, uplift: 8.1, budget: '€ 350K' },
        { name: 'Heineken 0.0 Sampling', type: 'Sampling', period: 'mei – aug 2026', status: 'Actief', outlets: 240, uplift: 15.2, budget: '€ 190K' },
        { name: 'Premium Placement Off-Trade', type: 'Retail display', period: 'jul – aug 2026', status: 'Actief', outlets: 156, uplift: 9.6, budget: '€ 210K' },
        { name: 'Festivalpartnerships 2026', type: 'Event', period: 'jun – sep 2026', status: 'Actief', outlets: 24, uplift: 22.0, budget: '€ 620K' },
        { name: 'Amstel Pubquiz Tour', type: 'On-Trade activatie', period: 'sep – nov 2026', status: 'Gepland', outlets: 180, uplift: null, budget: '€ 95K' },
        { name: 'Winter Warmers Display', type: 'Retail display', period: 'nov – dec 2026', status: 'Gepland', outlets: 320, uplift: null, budget: '€ 140K' },
        { name: 'Koningsdag Activatie', type: 'Campagne-activatie', period: 'apr 2026', status: 'Afgerond', outlets: 540, uplift: 18.7, budget: '€ 260K' },
      ],
      kpisInsights: [
        { label: 'Volume YTD', value: '48.520', unit: 'HL', delta: 4.2, deltaLabel: 'vs. vorig jaar', icon: 'droplets' },
        { label: 'On-Trade aandeel', value: '58', unit: '%', delta: 1.8, deltaLabel: 'pt vs. Q1', icon: 'store' },
        { label: 'Actieve outlets', value: '1.248', unit: '', delta: 3.1, deltaLabel: 'vs. vorig jaar', icon: 'map-pin' },
        { label: 'Lopende activaties', value: '5', unit: '', delta: 2, deltaLabel: 'nieuw dit kwartaal', icon: 'megaphone', deltaAbs: true },
      ],
      outletCount: 58, orderCount: 92, arCount: 14,
    },

    duvel: {
      key: 'duvel',
      name: 'Duvel',
      seed: 871226,
      chip: '#B3202C',
      tone: 'premium',
      persona: { insights: ['C. Moortgat', 'Portfolio & Margin Insights'], orders: ['E. Verhoeven', 'Craft Order Desk'], horeca: ["Proeflokaal 't Anker", 'Speciaalbier-partner Utrecht'] },
      horecaOutletName: "Proeflokaal 't Anker",
      horecaCity: 'Utrecht',
      copy: {
        insightsSub: 'Marge-, rotatie- en kwaliteitsontwikkeling van het craft-portfolio in het premium segment.',
        insightsBanner: 'Focus deze periode: <strong>marge boven volume</strong>. Bewaak schenkkwaliteit, premium placement en rotatie per tapkraan — niet elke HL is gelijk.',
        ordersSub: 'Zorgvuldige orderafhandeling voor het craft-portfolio: kleine drops, hoge kwaliteitseisen.',
        horecaWelcome: 'Goed u weer te zien. Bestel uw craft-assortiment, plan degustaties en bewaak uw schenkkwaliteit.',
        volumeCard: 'Volume per maand (HL) — premium segment',
        channelCard: 'Kanaalverdeling omzet',
      },
      emphasis: { primaryMetric: 'marge', secondary: 'kwaliteit' },
      scale: { ytdHL: 6240, avgOrderHL: 3.2, priceHL: 412 },
      channelSplit: { on: 47, off: 53 },
      monthlyBase: [455, 430, 468, 442, 418, 405, 432, 465, 512, 548, 566, 530],
      products: [
        { sku: 'DUV-F20', name: 'Duvel 8,5%', format: 'Fust 20L', hl: 0.2, price: 98, cat: 'Golden Ale', channel: 'On-Trade' },
        { sku: 'DUV-666-F20', name: 'Duvel 6,66%', format: 'Fust 20L', hl: 0.2, price: 92, cat: 'Golden Ale', channel: 'On-Trade' },
        { sku: 'DUV-THC-F20', name: 'Duvel Tripel Hop Citra', format: 'Fust 20L', hl: 0.2, price: 108, cat: 'Golden Ale', channel: 'On-Trade' },
        { sku: 'DUV-KR12', name: 'Duvel 8,5%', format: 'Krat 12×33cl', hl: 0.04, price: 22.6, cat: 'Golden Ale', channel: 'Off-Trade' },
        { sku: 'VED-F20', name: 'Vedett Extra IPA', format: 'Fust 20L', hl: 0.2, price: 86, cat: 'IPA', channel: 'On-Trade' },
        { sku: 'VED-WIT-F20', name: 'Vedett Extra White', format: 'Fust 20L', hl: 0.2, price: 82, cat: 'Witbier', channel: 'On-Trade' },
        { sku: 'CHO-F20', name: 'La Chouffe Blond', format: 'Fust 20L', hl: 0.2, price: 96, cat: 'Blond', channel: 'On-Trade' },
        { sku: 'CHO-CHERRY', name: 'Cherry Chouffe', format: 'Doos 12×33cl', hl: 0.04, price: 26.4, cat: 'Fruit', channel: 'Off-Trade' },
        { sku: 'MAR-BRU-F20', name: 'Maredsous Bruin', format: 'Fust 20L', hl: 0.2, price: 94, cat: 'Abdij', channel: 'On-Trade' },
        { sku: 'LIE-KRIEK', name: 'Liefmans Kriek-Brut', format: 'Doos 12×33cl', hl: 0.04, price: 24.8, cat: 'Fruit', channel: 'Off-Trade' },
        { sku: 'DUV-GLAS', name: 'Duvel Tulpglas Origineel', format: 'Doos 6 glazen', hl: 0, price: 31, cat: 'Glaswerk', channel: 'On-Trade' },
        { sku: 'DUV-BARREL', name: 'Duvel Barrel Aged №8', format: 'Geschenkdoos 75cl', hl: 0.0075, price: 27.5, cat: 'Limited', channel: 'Off-Trade' },
      ],
      campaigns: [
        { name: 'Duvel Degustatie Tour', type: 'Proeverij', period: 'mei – sep 2026', status: 'Actief', outlets: 86, uplift: 11.8, budget: '€ 120K' },
        { name: 'Tripel Hop Citra Launch', type: 'Productlancering', period: 'jun – aug 2026', status: 'Actief', outlets: 142, uplift: 19.4, budget: '€ 165K' },
        { name: 'Perfect Serve Programma', type: 'Kwaliteitsprogramma', period: 'doorlopend', status: 'Actief', outlets: 210, uplift: 6.2, budget: '€ 90K' },
        { name: 'Premium Glaswerk Upgrade', type: 'On-Trade activatie', period: 'jul – okt 2026', status: 'Actief', outlets: 124, uplift: 4.9, budget: '€ 75K' },
        { name: 'Barrel Aged Release №9', type: 'Limited release', period: 'nov 2026', status: 'Gepland', outlets: 60, uplift: null, budget: '€ 55K' },
        { name: 'Winterdegustaties Horeca', type: 'Proeverij', period: 'dec 2026 – jan 2027', status: 'Gepland', outlets: 70, uplift: null, budget: '€ 48K' },
        { name: 'Lente Craft Festival', type: 'Event', period: 'mrt – apr 2026', status: 'Afgerond', outlets: 38, uplift: 14.6, budget: '€ 82K' },
      ],
      kpisInsights: [
        { label: 'Brutomarge portfolio', value: '38,4', unit: '%', delta: 1.1, deltaLabel: 'pt vs. vorig jaar', icon: 'percent' },
        { label: 'Omzet per HL', value: '€ 412', unit: '', delta: 5.6, deltaLabel: 'vs. vorig jaar', icon: 'euro' },
        { label: 'Premium placements', value: '214', unit: '', delta: 8.9, deltaLabel: 'vs. vorig jaar', icon: 'award' },
        { label: 'Schenkkwaliteit Ø', value: '9,1', unit: '/ 10', delta: 0.3, deltaLabel: 'pt vs. audit Q1', icon: 'sparkles', deltaAbs: true },
      ],
      outletCount: 44, orderCount: 78, arCount: 12,
    },

    bavaria: {
      key: 'bavaria',
      name: 'Bavaria',
      seed: 471903,
      chip: '#1B4B9B',
      tone: 'nuchter',
      persona: { insights: ['H. Swinkels', 'Commercie & Retail'], orders: ['B. van Rooij', 'Orderadministratie'], horeca: ['Eetcafé De Zwaan', 'Horeca-klant Eindhoven'] },
      horecaOutletName: 'Eetcafé De Zwaan',
      horecaCity: 'Eindhoven',
      copy: {
        insightsSub: 'Verkoop, retail-acties en het aandeel alcoholvrij — nuchter en commercieel in één oogopslag.',
        insightsBanner: 'Focus deze periode: <strong>retail-acties en 0.0%</strong>. De zomerpromo loopt in 9 ketens — stuur op schaprotatie en actie-rendement.',
        ordersSub: 'Vlotte, no-nonsense orderafhandeling voor horeca en retail. Vandaag besteld, snel geleverd.',
        horecaWelcome: 'Hallo! Bestel snel uw vaste assortiment of profiteer van de lopende acties.',
        volumeCard: 'Volume per maand (HL)',
        channelCard: 'Kanaalverdeling volume',
      },
      emphasis: { primaryMetric: 'acties', secondary: 'alcoholvrij' },
      scale: { ytdHL: 21340, avgOrderHL: 9, priceHL: 168 },
      channelSplit: { on: 31, off: 69 },
      monthlyBase: [1560, 1480, 1620, 1510, 1420, 1380, 1490, 1610, 1760, 1930, 2010, 1830],
      products: [
        { sku: 'BAV-F50', name: 'Bavaria Pilsener', format: 'Fust 50L', hl: 0.5, price: 118, cat: 'Pils', channel: 'On-Trade' },
        { sku: 'BAV-F20', name: 'Bavaria Pilsener', format: 'Fust 20L', hl: 0.2, price: 52, cat: 'Pils', channel: 'On-Trade' },
        { sku: 'BAV-KR24', name: 'Bavaria Pilsener', format: 'Krat 24×30cl', hl: 0.072, price: 12.4, cat: 'Pils', channel: 'Off-Trade' },
        { sku: 'BAV-00-TR', name: 'Bavaria 0.0% Original', format: 'Tray 24×33cl blik', hl: 0.079, price: 11.8, cat: 'Alcoholvrij', channel: 'Off-Trade' },
        { sku: 'BAV-00-WIT', name: 'Bavaria 0.0% Wit', format: 'Tray 24×33cl blik', hl: 0.079, price: 12.6, cat: 'Alcoholvrij', channel: 'Off-Trade' },
        { sku: 'BAV-00-F20', name: 'Bavaria 0.0% Original', format: 'Fust 20L', hl: 0.2, price: 49, cat: 'Alcoholvrij', channel: 'On-Trade' },
        { sku: 'BAV-RAD-TR', name: 'Bavaria Radler Citroen', format: 'Tray 24×33cl blik', hl: 0.079, price: 12.2, cat: 'Radler', channel: 'Off-Trade' },
        { sku: 'SWI-F20', name: 'Swinckels’ Superior Pilsner', format: 'Fust 20L', hl: 0.2, price: 68, cat: 'Premium pils', channel: 'On-Trade' },
        { sku: 'LAT-TR', name: 'La Trappe Blond', format: 'Doos 12×33cl', hl: 0.04, price: 19.8, cat: 'Trappist', channel: 'Off-Trade' },
        { sku: 'LAT-F20', name: 'La Trappe Dubbel', format: 'Fust 20L', hl: 0.2, price: 88, cat: 'Trappist', channel: 'On-Trade' },
        { sku: 'BAV-8-6-TR', name: '8.6 Original', format: 'Tray 24×50cl blik', hl: 0.12, price: 18.6, cat: 'Sterk', channel: 'Off-Trade' },
        { sku: 'BAV-DISPLAY', name: 'Actiedisplay 0.0% Zomer', format: 'Kant-en-klaar display', hl: 0, price: 45, cat: 'POS-materiaal', channel: 'Off-Trade' },
      ],
      campaigns: [
        { name: 'EK Retail Display Actie', type: 'Retail-actie', period: 'jun – jul 2026', status: 'Actief', outlets: 290, uplift: 16.2, budget: '€ 240K' },
        { name: '0.0% Zomerpromo', type: 'Retail-actie', period: 'jun – aug 2026', status: 'Actief', outlets: 340, uplift: 21.5, budget: '€ 180K' },
        { name: '2e Krat Halve Prijs', type: 'Prijspromotie', period: 'jul 2026 (wk 28-30)', status: 'Actief', outlets: 415, uplift: 34.0, budget: '€ 310K' },
        { name: 'Terrasactie Brabant', type: 'On-Trade activatie', period: 'mei – aug 2026', status: 'Actief', outlets: 96, uplift: 7.4, budget: '€ 65K' },
        { name: 'Schapoptimalisatie Q3', type: 'Category management', period: 'jul – sep 2026', status: 'Actief', outlets: 128, uplift: 5.1, budget: '€ 40K' },
        { name: 'Oktoberfest Displays', type: 'Retail-actie', period: 'sep – okt 2026', status: 'Gepland', outlets: 260, uplift: null, budget: '€ 150K' },
        { name: 'Carnaval Zuid 2026', type: 'Campagne-activatie', period: 'feb 2026', status: 'Afgerond', outlets: 185, uplift: 28.3, budget: '€ 130K' },
      ],
      kpisInsights: [
        { label: 'Volume YTD', value: '21.340', unit: 'HL', delta: 2.7, deltaLabel: 'vs. vorig jaar', icon: 'droplets' },
        { label: 'Aandeel alcoholvrij', value: '18,6', unit: '%', delta: 2.3, deltaLabel: 'pt vs. vorig jaar', icon: 'leaf' },
        { label: 'Actieve retail-acties', value: '5', unit: '', delta: 2, deltaLabel: 'meer dan vorig kwartaal', icon: 'tag', deltaAbs: true },
        { label: 'Schaprotatie Ø', value: '4,8', unit: '×/wk', delta: 0.4, deltaLabel: 'vs. vorig kwartaal', icon: 'refresh-cw', deltaAbs: true },
      ],
      outletCount: 52, orderCount: 86, arCount: 11,
    },
  };

  const MONTH_LABELS = ['aug', 'sep', 'okt', 'nov', 'dec', 'jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul'];

  // ---------------------------------------------------------
  // Generatoren
  // ---------------------------------------------------------
  function genMonthly(def, r) {
    const onPct = def.channelSplit.on / 100;
    return def.monthlyBase.map((base) => {
      const wobble = 1 + (r() - 0.5) * 0.06;
      const total = Math.round(base * wobble);
      const on = Math.round(total * (onPct + (r() - 0.5) * 0.08));
      return { total, on, off: total - on };
    });
  }

  function genOutlets(def, r) {
    const outlets = [];
    const usedNames = new Set();
    for (let i = 0; i < def.outletCount; i++) {
      const isOn = r() < def.channelSplit.on / 100 + 0.05;
      const baseName = pick(r, isOn ? ONTRADE_NAMES : OFFTRADE_NAMES);
      const city = pick(r, CITIES);
      let name = isOn ? baseName : `${baseName} ${city}`;
      if (usedNames.has(name + city)) { i--; continue; }
      usedNames.add(name + city);
      const volume = isOn
        ? rf(r, def.scale.ytdHL * 0.0006, def.scale.ytdHL * 0.004, 1)
        : rf(r, def.scale.ytdHL * 0.002, def.scale.ytdHL * 0.012, 1);
      const trend = rf(r, -9, 16, 1);
      const rotation = isOn ? rf(r, 0.8, 4.6, 1) : rf(r, 2.2, 7.8, 1);
      outlets.push({
        id: `OUT-${def.name.substring(0, 2).toUpperCase()}${1000 + i}`,
        name, city,
        segment: isOn ? 'On-Trade' : 'Off-Trade',
        contact: pick(r, CONTACTS),
        volumeYTD: volume,
        rotation,
        trend,
        status: r() < 0.86 ? 'Actief' : (r() < 0.5 ? 'Prospect' : 'Inactief'),
        premiumPlacement: isOn && r() < 0.35,
        since: `20${ri(r, 15, 25)}`,
      });
    }
    outlets.sort((a, b) => b.volumeYTD - a.volumeYTD);
    return outlets;
  }

  function daysAgoStr(days) {
    const d = new Date(2026, 6, 16); // vaste referentiedatum
    d.setDate(d.getDate() - days);
    return d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' });
  }

  function genOrders(def, r, outlets) {
    const orders = [];
    const sellable = def.products.filter((p) => p.hl > 0);
    for (let i = 0; i < def.orderCount; i++) {
      const outlet = pick(r, outlets.filter((o) => o.status === 'Actief'));
      const nLines = ri(r, 1, 4);
      const lines = [];
      const chosen = new Set();
      for (let l = 0; l < nLines; l++) {
        const prod = pick(r, sellable.filter((p) => p.channel === outlet.segment) .length ? sellable.filter((p) => p.channel === outlet.segment) : sellable);
        if (chosen.has(prod.sku)) continue;
        chosen.add(prod.sku);
        const qty = prod.hl >= 0.2 ? ri(r, 1, 8) : ri(r, 4, 40);
        lines.push({ sku: prod.sku, name: prod.name, format: prod.format, qty, price: prod.price, hl: prod.hl });
      }
      const hl = +lines.reduce((s, l) => s + l.hl * l.qty, 0).toFixed(2);
      const value = Math.round(lines.reduce((s, l) => s + l.price * l.qty, 0));
      const kegs = lines.filter((l) => l.format.startsWith('Fust')).reduce((s, l) => s + l.qty, 0);
      const daysAgo = ri(r, 0, 88);
      const sWeights = daysAgo < 3 ? [18, 30, 30, 16, 4, 2] : daysAgo < 10 ? [4, 14, 22, 22, 34, 4] : [0, 2, 5, 6, 82, 5];
      let acc = 0; const roll = r() * 100; let status = 'Geleverd';
      for (let s = 0; s < ORDER_STATUSES.length; s++) { acc += sWeights[s]; if (roll < acc) { status = ORDER_STATUSES[s]; break; } }
      orders.push({
        id: `ORD-2026-${String(1000 - i).padStart(4, '0')}`,
        outlet: outlet.name, city: outlet.city, segment: outlet.segment,
        date: daysAgoStr(daysAgo), daysAgo,
        lines, hl, value, kegs, status,
        delivery: status === 'Geleverd' ? daysAgoStr(Math.max(0, daysAgo - ri(r, 1, 3))) : daysAgoStr(Math.max(-4, daysAgo - 4)),
        ref: `PO-${ri(r, 10000, 99999)}`,
      });
    }
    orders.sort((a, b) => a.daysAgo - b.daysAgo);
    return orders;
  }

  function genAssortmentRequests(def, r, outlets) {
    const reqs = [];
    const motivations = [
      'Veel vraag van vaste gasten', 'Rotatie huidig assortiment te laag', 'Concurrent geplaatst bij buurzaak',
      'Seizoensvraag verwacht', 'Past bij nieuw menuconcept', 'Actie-aanvraag vanuit keten-HQ',
      'Tapkraan vrijgekomen', 'Upgrade naar premium segment gewenst',
    ];
    for (let i = 0; i < def.arCount; i++) {
      const outlet = pick(r, outlets);
      const prod = pick(r, def.products.filter((p) => p.hl > 0));
      const daysAgo = ri(r, 0, 30);
      reqs.push({
        id: `AV-${2600 + i}`,
        outlet: outlet.name, city: outlet.city, segment: outlet.segment,
        product: prod.name, format: prod.format,
        motivation: pick(r, motivations),
        expectedRotation: rf(r, 0.4, 3.2, 1),
        date: daysAgoStr(daysAgo), daysAgo,
        status: pick(r, daysAgo < 5 ? ['Nieuw', 'Nieuw', 'In review'] : AR_STATUSES),
      });
    }
    reqs.sort((a, b) => a.daysAgo - b.daysAgo);
    return reqs;
  }

  function genKegs(def, r, outlets) {
    const onTrade = outlets.filter((o) => o.segment === 'On-Trade' && o.status === 'Actief');
    const rows = onTrade.slice(0, 26).map((o) => {
      const out = ri(r, 2, 34);
      const oldest = ri(r, 2, 95);
      return {
        outlet: o.name, city: o.city,
        kegsOut: out,
        oldestDays: oldest,
        avgCycle: ri(r, 14, 48),
        lastReturn: daysAgoStr(ri(r, 1, 21)),
        alert: oldest > 60,
      };
    });
    rows.sort((a, b) => b.oldestDays - a.oldestDays);
    const fleetOut = rows.reduce((s, x) => s + x.kegsOut, 0);
    return {
      rows,
      fleet: {
        out: fleetOut,
        depot: Math.round(fleetOut * rf(r, 0.6, 0.9, 2)),
        transit: ri(r, 18, 60),
        avgCycle: Math.round(rows.reduce((s, x) => s + x.avgCycle, 0) / rows.length),
        overdue: rows.filter((x) => x.alert).length,
      },
    };
  }

  // ---------------------------------------------------------
  // Samenstellen + cache
  // ---------------------------------------------------------
  const cache = {};
  function getBrandData(key) {
    if (cache[key]) return cache[key];
    const def = BRAND_DEFS[key];
    const r = rng(def.seed);
    const monthly = genMonthly(def, r);
    const outlets = genOutlets(def, r);
    const orders = genOrders(def, r, outlets);
    const requests = genAssortmentRequests(def, r, outlets);
    const kegs = genKegs(def, r, outlets);

    // Horeca-portaal data: eigen zaak van de ingelogde horeca-gebruiker
    const hr = rng(def.seed + 7);
    const horecaProducts = def.products.filter((p) => p.channel === 'On-Trade' || p.cat === 'POS-materiaal' || p.hl === 0 || p.cat === 'Limited');
    const horecaOrders = orders.filter((o) => o.segment === 'On-Trade').slice(0, 14).map((o, i) => ({
      ...o,
      id: `ORD-2026-${String(880 - i * 3).padStart(4, '0')}`,
      outlet: def.horecaOutletName,
      city: def.horecaCity,
    }));
    const horeca = {
      outlet: def.horecaOutletName,
      city: def.horecaCity,
      products: horecaProducts,
      orders: horecaOrders,
      kegsOut: ri(hr, 6, 18),
      nextDelivery: 'vr 18 jul',
      weekVolume: rf(hr, def.scale.avgOrderHL * 0.5, def.scale.avgOrderHL * 1.4, 1),
      openCampaigns: def.campaigns.filter((c) => c.status === 'Actief').slice(0, 3),
    };

    cache[key] = { def, monthly, outlets, orders, requests, kegs, horeca, monthLabels: MONTH_LABELS };
    return cache[key];
  }

  // ---------------------------------------------------------
  // Formatters
  // ---------------------------------------------------------
  const fmt = {
    int: (n) => n.toLocaleString('nl-NL'),
    hl: (n) => n.toLocaleString('nl-NL', { minimumFractionDigits: n < 10 ? 1 : 0, maximumFractionDigits: n < 10 ? 1 : 0 }),
    eur: (n) => '€ ' + Math.round(n).toLocaleString('nl-NL'),
    pct: (n) => n.toLocaleString('nl-NL', { maximumFractionDigits: 1 }) + '%',
    dec: (n, d = 1) => n.toLocaleString('nl-NL', { minimumFractionDigits: d, maximumFractionDigits: d }),
  };

  window.KM = { BRAND_DEFS, getBrandData, fmt, ORDER_STATUSES, AR_STATUSES };
})();
