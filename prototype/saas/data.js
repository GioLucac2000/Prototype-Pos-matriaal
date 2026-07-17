/* ============================================================
   Keymerch POS Materiaal Platform — mock data (demo, geen echte data)
   ============================================================ */

(function () {
  'use strict';

  const BRANDS = {
    heineken: {
      key: 'heineken', name: 'Heineken', color: '#037A3B',
      intel: [
        { icon: '📈', text: 'Voorraadrotatie stijgt met +12% t.o.v. vorige maand', badge: 'Positief' },
        { icon: '⚠️', text: 'Tap displays in Rotterdam: 23% hogere vermissingsgraad dan landelijk gemiddeld', badge: 'Let op' },
        { icon: '💡', text: 'Aanbeveling: Bestel 40 extra Duvel glazenrekken vóór week 28', badge: 'Actie' },
      ],
      kpis: [
        { label: 'Actieve locaties', value: '412', icon: 'map-pin', foot: '<span class="up">+18</span> deze maand' },
        { label: 'Items in omloop', value: '3.184', icon: 'package', foot: '<span class="up">+4,2%</span> t.o.v. Q1' },
        { label: 'Scan-compliance', value: '87', unit: '%', icon: 'scan-line', foot: 'doel: 90%' },
        { label: 'Vermissingsgraad', value: '2,8', unit: '%', icon: 'triangle-alert', foot: '<span class="down">+0,4pt</span> t.o.v. Q1' },
      ],
      scansPerWeek: [612, 588, 655, 701, 668, 734, 795, 762],
      statusSplit: { goed: 78, slijtage: 13, reparatie: 4, vermist: 5 },
    },
    duvel: {
      key: 'duvel', name: 'Duvel', color: '#B3202C',
      intel: [
        { icon: '📈', text: 'Fleshouders zijn meest gescande categorie (+34% activiteit)', badge: 'Positief' },
        { icon: '⚠️', text: 'Antwerpen-regio: 4 locaties hebben al >30 dagen niet gescand', badge: 'Let op' },
        { icon: '💡', text: 'Aanbeveling: Plan een controlebezoek in Antwerpen voor week 29', badge: 'Actie' },
      ],
      kpis: [
        { label: 'Actieve locaties', value: '148', icon: 'map-pin', foot: '<span class="up">+6</span> deze maand' },
        { label: 'Items in omloop', value: '1.126', icon: 'package', foot: '<span class="up">+7,1%</span> t.o.v. Q1' },
        { label: 'Scan-compliance', value: '91', unit: '%', icon: 'scan-line', foot: 'doel: 90% ✓' },
        { label: 'Vermissingsgraad', value: '1,6', unit: '%', icon: 'triangle-alert', foot: '<span class="up">-0,3pt</span> t.o.v. Q1' },
      ],
      scansPerWeek: [201, 214, 228, 246, 239, 262, 281, 274],
      statusSplit: { goed: 85, slijtage: 9, reparatie: 3, vermist: 3 },
    },
    bavaria: {
      key: 'bavaria', name: 'Bavaria', color: '#1B4B9B',
      intel: [
        { icon: '📈', text: 'Zomerseizoen: parasoldisplays +28% meer scans dan Q1', badge: 'Positief' },
        { icon: '⚠️', text: "8 locaties melden 'lichte slijtage' op tapinstallaties", badge: 'Let op' },
        { icon: '💡', text: 'Aanbeveling: Overweeg vervanging van 8 tapinstallaties in Q3', badge: 'Actie' },
      ],
      kpis: [
        { label: 'Actieve locaties', value: '264', icon: 'map-pin', foot: '<span class="up">+11</span> deze maand' },
        { label: 'Items in omloop', value: '2.052', icon: 'package', foot: '<span class="up">+3,5%</span> t.o.v. Q1' },
        { label: 'Scan-compliance', value: '84', unit: '%', icon: 'scan-line', foot: 'doel: 90%' },
        { label: 'Vermissingsgraad', value: '3,1', unit: '%', icon: 'triangle-alert', foot: '<span class="down">+0,6pt</span> t.o.v. Q1' },
      ],
      scansPerWeek: [388, 402, 371, 415, 452, 489, 522, 501],
      statusSplit: { goed: 74, slijtage: 16, reparatie: 5, vermist: 5 },
    },
  };

  // Horeca: POS-items van de ingelogde locatie (Café De Kroon, Utrecht Centrum)
  const HORECA_LOCATION = { name: 'Café De Kroon', city: 'Utrecht Centrum' };
  const HORECA_ITEMS = [
    { sn: 'KM-2024-HEI-0042', brand: 'Heineken', item: 'Tap Display Unit Premium', since: '12 maart 2024', lastScan: 14, status: 'Aanwezig — goede staat' },
    { sn: 'KM-2024-HEI-0038', brand: 'Heineken', item: 'LED Bar Sign', since: '12 maart 2024', lastScan: 3, status: 'Aanwezig — goede staat' },
    { sn: 'KM-2024-HEI-0051', brand: 'Heineken', item: 'Terras Vlaggenset', since: '2 april 2024', lastScan: 47, status: 'Aanwezig — goede staat' },
    { sn: 'KM-2024-BAV-0019', brand: 'Bavaria', item: 'Parasol 0.0%', since: '18 april 2024', lastScan: 62, status: 'Aanwezig — lichte slijtage' },
    { sn: 'KM-2024-BAV-0023', brand: 'Bavaria', item: 'Kassadisplay 0.0%', since: '18 april 2024', lastScan: 3, status: 'Aanwezig — goede staat' },
    { sn: 'KM-2024-DUV-0011', brand: 'Duvel', item: 'Glazenrek Tulpglas', since: '5 mei 2024', lastScan: 8, status: 'Aanwezig — goede staat' },
    { sn: 'KM-2024-DUV-0014', brand: 'Duvel', item: 'Fleshouder Bar Edition', since: '5 mei 2024', lastScan: 8, status: 'Aanwezig — goede staat' },
    { sn: 'KM-2024-HEI-0060', brand: 'Heineken', item: 'Menubord Krijt', since: '20 mei 2024', lastScan: 3, status: 'Aanwezig — goede staat' },
    { sn: 'KM-2024-BAV-0031', brand: 'Bavaria', item: 'Barmat Set (6x)', since: '20 mei 2024', lastScan: 21, status: 'Aanwezig — lichte slijtage' },
    { sn: 'KM-2024-HEI-0071', brand: 'Heineken', item: 'Koelkast Branded 90L', since: '3 juni 2024', lastScan: 3, status: 'Aanwezig — goede staat' },
    { sn: 'KM-2024-DUV-0018', brand: 'Duvel', item: 'Wandbord Vintage', since: '3 juni 2024', lastScan: 30, status: 'Vermist' },
    { sn: 'KM-2024-HEI-0075', brand: 'Heineken', item: 'Tafelstandaard Set (12x)', since: '17 juni 2024', lastScan: 5, status: 'Aanwezig — goede staat' },
  ];

  // Admin: bestellingen over alle merken
  const ORDERS = [
    { id: 'KM-2024-089', brand: 'Bavaria', location: 'Grand Café Luxor', city: 'Tilburg', date: '10 jul', items: 6, status: 'Wacht op bevestiging' },
    { id: 'KM-2024-090', brand: 'Heineken', location: 'Bar Centraal', city: 'Utrecht', date: '10 jul', items: 3, status: 'In behandeling' },
    { id: 'KM-2024-091', brand: 'Heineken', location: 'Café De Kroon', city: 'Utrecht Centrum', date: '11 jul', items: 4, status: 'In behandeling' },
    { id: 'KM-2024-092', brand: 'Duvel', location: "Proeflokaal 't Anker", city: 'Utrecht', date: '11 jul', items: 2, status: 'Verzonden' },
    { id: 'KM-2024-093', brand: 'Bavaria', location: 'Eetcafé De Zwaan', city: 'Eindhoven', date: '12 jul', items: 5, status: 'Geleverd' },
    { id: 'KM-2024-094', brand: 'Duvel', location: 'Biercafé Hop & Mout', city: 'Antwerpen', date: '12 jul', items: 3, status: 'Wacht op depot' },
    { id: 'KM-2024-095', brand: 'Heineken', location: 'Strandpaviljoen Zee', city: 'Scheveningen', date: '13 jul', items: 8, status: 'In behandeling' },
    { id: 'KM-2024-096', brand: 'Bavaria', location: 'Lokaal Noord', city: 'Amsterdam', date: '13 jul', items: 2, status: 'Verificatie nodig' },
    { id: 'KM-2024-097', brand: 'Duvel', location: 'De Gouden Leeuw', city: 'Den Bosch', date: '14 jul', items: 4, status: 'Verzonden' },
    { id: 'KM-2024-098', brand: 'Heineken', location: 'Muziekcafé Mojo', city: 'Delft', date: '14 jul', items: 6, status: 'In behandeling' },
    { id: 'KM-2024-099', brand: 'Bavaria', location: 'Café De Sport', city: 'Breda', date: '15 jul', items: 3, status: 'Geleverd' },
    { id: 'KM-2024-100', brand: 'Heineken', location: 'Herberg De Waag', city: 'Zwolle', date: '15 jul', items: 5, status: 'Nieuw' },
  ];

  const URGENT = [
    { id: 'KM-2024-089', brand: 'Bavaria', wait: '6 dagen', reason: 'Merkhouder non-respons', action: 'Herinnering' },
    { id: 'KM-2024-091', brand: 'Heineken', wait: '5 dagen', reason: 'Adres onduidelijk', action: 'Controleer' },
    { id: 'KM-2024-094', brand: 'Duvel', wait: '5 dagen', reason: 'Voorraad laag depot', action: 'Bestelling' },
    { id: 'KM-2024-096', brand: 'Bavaria', wait: '4 dagen', reason: 'Nieuwe locatie, onbekend', action: 'Verifieer' },
    { id: 'KM-2024-098', brand: 'Heineken', wait: '3 dagen', reason: 'Piekperiode vertraging', action: 'Prioriteer' },
  ];

  const NOTIFICATIONS = [
    { text: '📦 Heineken: 3 items >45 dagen niet gescand', time: '10 min geleden' },
    { text: '⚠️ Bavaria: Bestelling #KM-2024-089 wacht op bevestiging', time: '1 uur geleden' },
    { text: '💡 AI Advies: Bestel 40 Duvel glazenrekken vóór week 28', time: 'vandaag 08:15' },
  ];

  window.KMDATA = { BRANDS, HORECA_LOCATION, HORECA_ITEMS, ORDERS, URGENT, NOTIFICATIONS };
})();
