/* ============================================================
   Keymerch — Chart.js wrappers.
   Kleuren komen uit de CSS-tokens zodat light/dark automatisch
   klopt; charts worden bij thema- of merkwissel opnieuw gebouwd.
   ============================================================ */

(function () {
  'use strict';

  const registry = [];

  function cssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  function baseTooltip() {
    return {
      backgroundColor: cssVar('--surface'),
      borderColor: cssVar('--offset'),
      borderWidth: 1,
      titleColor: cssVar('--text-1'),
      bodyColor: cssVar('--text-2'),
      titleFont: { family: 'Inter', size: 12, weight: '600' },
      bodyFont: { family: 'Inter', size: 12 },
      padding: 10,
      cornerRadius: 6,
      boxPadding: 4,
      displayColors: true,
      usePointStyle: true,
    };
  }

  function destroyAll() {
    while (registry.length) registry.pop().destroy();
  }

  /**
   * Gestapelde bar chart: HL per periode, On-Trade vs Off-Trade.
   * series: [{ label, data, colorVar }] — vaste volgorde, nooit gecycled.
   */
  function bar(canvas, labels, series, opts = {}) {
    const surface = cssVar('--surface');
    const chart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: series.map((s, i) => ({
          label: s.label,
          data: s.data,
          backgroundColor: cssVar(s.colorVar),
          stack: 'hl',
          borderColor: surface,
          borderWidth: { top: i === series.length - 1 ? 0 : 2, right: 0, bottom: 0, left: 0 },
          borderSkipped: false,
          borderRadius: i === series.length - 1 ? { topLeft: 4, topRight: 4, bottomLeft: 0, bottomRight: 0 } : 0,
          barPercentage: 0.55,
          categoryPercentage: 0.8,
        })),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            ...baseTooltip(),
            callbacks: {
              label: (ctx) => ` ${ctx.dataset.label}: ${KM.fmt.int(ctx.parsed.y)} HL`,
              footer: (items) => 'Totaal: ' + KM.fmt.int(items.reduce((s, it) => s + it.parsed.y, 0)) + ' HL',
            },
            footerColor: cssVar('--text-1'),
            footerFont: { family: 'Inter', size: 12, weight: '600' },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            border: { color: cssVar('--offset') },
            ticks: { color: cssVar('--text-3'), font: { family: 'Inter', size: 11 } },
            stacked: true,
          },
          y: {
            grid: { color: cssVar('--grid-line'), drawTicks: false },
            border: { display: false },
            ticks: {
              color: cssVar('--text-3'),
              font: { family: 'Inter', size: 11 },
              maxTicksLimit: 5,
              callback: (v) => KM.fmt.int(v),
            },
            stacked: true,
            beginAtZero: true,
          },
        },
        ...opts,
      },
    });
    registry.push(chart);
    return chart;
  }

  /**
   * Donut: kanaalverdeling (On-Trade vs Off-Trade).
   * items: [{ label, value, colorVar }]
   */
  function donut(canvas, items, unit = 'HL') {
    const surface = cssVar('--surface');
    const chart = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: items.map((i) => i.label),
        datasets: [{
          data: items.map((i) => i.value),
          backgroundColor: items.map((i) => cssVar(i.colorVar)),
          borderColor: surface,
          borderWidth: 2,
          hoverOffset: 5,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '70%',
        plugins: {
          legend: { display: false },
          tooltip: {
            ...baseTooltip(),
            callbacks: {
              label: (ctx) => {
                const total = ctx.dataset.data.reduce((s, v) => s + v, 0);
                const pct = Math.round((ctx.parsed / total) * 100);
                return ` ${ctx.label}: ${KM.fmt.int(ctx.parsed)} ${unit} (${pct}%)`;
              },
            },
          },
        },
      },
    });
    registry.push(chart);
    return chart;
  }

  /**
   * Lijnchart: prognose (bv. voorraad vs. verwacht verbruik), één as, HL.
   * series: [{ label, data, colorVar, dashed, noTooltip }]
   */
  function line(canvas, labels, series, unit = 'HL') {
    const chart = new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: series.map((s) => ({
          label: s.label,
          data: s.data,
          borderColor: cssVar(s.colorVar),
          backgroundColor: cssVar(s.colorVar),
          borderWidth: 2,
          borderDash: s.dashed ? [6, 5] : undefined,
          pointRadius: 0,
          pointHoverRadius: s.noTooltip ? 0 : 4,
          pointHoverBackgroundColor: cssVar(s.colorVar),
          pointHoverBorderColor: cssVar('--surface'),
          pointHoverBorderWidth: 2,
          tension: 0.25,
          fill: false,
        })),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            ...baseTooltip(),
            filter: (item) => !series[item.datasetIndex].noTooltip,
            callbacks: {
              label: (ctx) => ` ${ctx.dataset.label}: ${KM.fmt.int(Math.round(ctx.parsed.y))} ${unit}`,
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            border: { color: cssVar('--offset') },
            ticks: { color: cssVar('--text-3'), font: { family: 'Inter', size: 11 }, maxRotation: 0, autoSkipPadding: 12 },
          },
          y: {
            grid: { color: cssVar('--grid-line'), drawTicks: false },
            border: { display: false },
            ticks: {
              color: cssVar('--text-3'),
              font: { family: 'Inter', size: 11 },
              maxTicksLimit: 5,
              callback: (v) => KM.fmt.int(v),
            },
            beginAtZero: true,
          },
        },
      },
    });
    registry.push(chart);
    return chart;
  }

  window.KMCharts = { bar, donut, line, destroyAll, cssVar };
})();
