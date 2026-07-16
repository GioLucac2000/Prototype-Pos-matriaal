# Keymerch — POS Visibility Platform

Professioneel B2B SaaS data-platform voor bierbrouwers en horeca, met drie omgevingen:

1. **Merkhouder Insights Dashboard** — volume (HL), rotatie, outlets en campagne-activatie
2. **Order Management** — orderbeheer, assortimentsverzoeken en fustenbeheer (kegs)
3. **Horeca Portaal** — bestellen, orders volgen, assortiment aanvragen en acties

## Brand-personalisatie

De brand switcher in de header schakelt realtime tussen drie merken; toon, terminologie,
datanadruk en inhoud passen zich per merk aan:

| Merk | Toon | Datanadruk |
|---|---|---|
| Heineken | corporate | volume, activatie, On-Trade vs Off-Trade |
| Duvel | premium | marge, craft-portfolio, kwaliteit |
| Bavaria | nuchter/commercieel | retail-acties, alcoholvrij |

## Starten

```bash
node server.js        # PORT env var of 3000 als fallback (8844 wordt nooit gebruikt)
```

Geen build-stap en geen dependencies: de server is dependency-vrij Node en de frontend
is vanilla HTML/CSS/JS. Chart.js, Lucide en het Inter-font staan lokaal in `public/vendor/`.

## Structuur

```
server.js              — statische fileserver (zero-dep)
public/
  index.html           — app-shell (sidebar, header, brand switcher)
  css/app.css          — design-systeem: tokens, light/dark, componenten, responsive
  js/data.js           — datalaag: per-brand terminologie + deterministische mock-data
  js/charts.js         — Chart.js wrappers (bar HL/periode, donut On/Off-Trade)
  js/components.js     — data table (search/filter/sort/paginering), KPI's, badges,
                         skeletons, empty states
  js/app.js            — routing, brand switching en de 11 views van de 3 omgevingen
  vendor/              — Chart.js, Lucide, Inter (lokaal gehost)
```

Er wordt bewust geen localStorage/sessionStorage gebruikt; alle state leeft in het geheugen.

---

*Oorspronkelijke repo-notitie (investeringbot): het doel is om meerdere investeringsbots te maken.*
