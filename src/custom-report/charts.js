// Top N charts as inline SVG strings. The DS ships no chart element (G34/G35), so these are drawn
// here, the way the WAN Link screens draw theirs. No colour lives in this file: marks carry
// `cr-series-<n>` classes and customReport.css maps them onto the DS's --chart-* tokens.

const W = 640
const H = 280
const PAD = { top: 16, right: 16, bottom: 48, left: 56 }
const SERIES = 8
const GAUGE_ROW = 104

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const short = (s, n = 18) => (s.length > n ? `${s.slice(0, n - 1)}…` : s)
const fmt = (v) => (Math.abs(v) >= 1000 ? Math.round(v).toLocaleString('en-US') : String(Math.round(v * 100) / 100))

export const topN = (items, n = 10) => [...items].sort((a, b) => b.value - a.value).slice(0, n)

// 1, 2, 2.5, 5 or 10 × a power of ten — the smallest at or above max.
export function niceMax(max) {
  if (!(max > 0)) return 1
  const p = 10 ** Math.floor(Math.log10(max))
  return [1, 2, 2.5, 5, 10].map((m) => m * p).find((v) => v >= max)
}

const svg = (body, label, height = H) =>
  `<svg class="cr-chart" viewBox="0 0 ${W} ${height}" role="img" aria-label="${esc(label)}" preserveAspectRatio="xMidYMid meet">${body}</svg>`

function valueAxis(max, unit) {
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * max)
  const plotH = H - PAD.top - PAD.bottom
  return ticks.map((t) => {
    const y = H - PAD.bottom - (t / max) * plotH
    return `<line class="cr-grid" x1="${PAD.left}" y1="${y}" x2="${W - PAD.right}" y2="${y}"/>` +
      `<text class="cr-axis" x="${PAD.left - 8}" y="${y + 4}" text-anchor="end">${fmt(t)}${esc(unit)}</text>`
  }).join('')
}

function categoryLabels(items, xOf) {
  return items.map((it, i) =>
    `<text class="cr-axis" x="${xOf(i)}" y="${H - PAD.bottom + 16}" text-anchor="middle"><title>${esc(it.label)}</title>${esc(short(it.label, 14))}</text>`).join('')
}

function pointChart(items, unit, filled) {
  const max = niceMax(Math.max(...items.map((i) => i.value)))
  const plotW = W - PAD.left - PAD.right
  const plotH = H - PAD.bottom - PAD.top
  // Points sit mid-slot, as bars do, so the end labels are not cut by the plot edge.
  const slot = plotW / items.length
  const xOf = (i) => PAD.left + slot * i + slot / 2
  const yOf = (v) => H - PAD.bottom - (v / max) * plotH
  const pts = items.map((it, i) => `${xOf(i)},${yOf(it.value)}`).join(' ')
  const area = filled
    ? `<polygon class="cr-area cr-series-0" points="${xOf(0)},${H - PAD.bottom} ${pts} ${xOf(items.length - 1)},${H - PAD.bottom}"/>`
    : ''
  const dots = items.map((it, i) =>
    `<circle class="cr-point cr-series-0" data-item="${i}" cx="${xOf(i)}" cy="${yOf(it.value)}" r="4"><title>${esc(it.label)}: ${fmt(it.value)}${esc(unit)}</title></circle>`).join('')
  return valueAxis(max, unit) + area + `<polyline class="cr-line cr-series-0" points="${pts}"/>` + dots + categoryLabels(items, xOf)
}

function verticalBars(items, unit) {
  const max = niceMax(Math.max(...items.map((i) => i.value)))
  const plotW = W - PAD.left - PAD.right
  const plotH = H - PAD.bottom - PAD.top
  const slot = plotW / items.length
  const bw = Math.min(48, slot * 0.6)
  const xOf = (i) => PAD.left + slot * i + slot / 2
  const bars = items.map((it, i) => {
    const h = (it.value / max) * plotH
    return `<rect class="cr-bar cr-series-${i % SERIES}" data-item="${i}" x="${xOf(i) - bw / 2}" y="${H - PAD.bottom - h}" width="${bw}" height="${h}" rx="2"><title>${esc(it.label)}: ${fmt(it.value)}${esc(unit)}</title></rect>`
  }).join('')
  return valueAxis(max, unit) + bars + categoryLabels(items, xOf)
}

function horizontalBars(items, unit) {
  const max = niceMax(Math.max(...items.map((i) => i.value)))
  const left = 160
  const plotW = W - left - PAD.right
  const plotH = H - PAD.top - PAD.bottom
  const slot = plotH / items.length
  const bh = Math.min(22, slot * 0.6)
  // Wider left margin than the other charts, for the SLO names, so it draws its own value grid.
  const scaled = (v) => left + (v / max) * plotW
  const grid = [0, 0.25, 0.5, 0.75, 1].map((f) => {
    const x = scaled(f * max)
    return `<line class="cr-grid" x1="${x}" y1="${PAD.top}" x2="${x}" y2="${H - PAD.bottom}"/>` +
      `<text class="cr-axis" x="${x}" y="${H - PAD.bottom + 16}" text-anchor="middle">${fmt(f * max)}${esc(unit)}</text>`
  }).join('')
  const bars = items.map((it, i) => {
    const y = PAD.top + slot * i + (slot - bh) / 2
    return `<text class="cr-axis" x="${left - 8}" y="${y + bh / 2 + 4}" text-anchor="end"><title>${esc(it.label)}</title>${esc(short(it.label, 22))}</text>` +
      `<rect class="cr-bar cr-series-${i % SERIES}" data-item="${i}" x="${left}" y="${y}" width="${(it.value / max) * plotW}" height="${bh}" rx="2"><title>${esc(it.label)}: ${fmt(it.value)}${esc(unit)}</title></rect>`
  }).join('')
  return grid + bars
}

function pie(items, unit) {
  const total = items.reduce((n, i) => n + Math.max(0, i.value), 0) || 1
  const cx = 160
  const cy = H / 2
  const r = 110
  let a = -Math.PI / 2
  const slices = items.map((it, i) => {
    const sweep = (Math.max(0, it.value) / total) * Math.PI * 2
    const a2 = a + sweep
    const large = sweep > Math.PI ? 1 : 0
    const p = (ang) => `${cx + r * Math.cos(ang)},${cy + r * Math.sin(ang)}`
    // A single item fills the circle; an arc from a point to itself draws nothing.
    const d = sweep >= Math.PI * 2 - 1e-6
      ? `M${cx - r},${cy} A${r},${r} 0 1 1 ${cx + r},${cy} A${r},${r} 0 1 1 ${cx - r},${cy} Z`
      : `M${cx},${cy} L${p(a)} A${r},${r} 0 ${large} 1 ${p(a2)} Z`
    a = a2
    return `<path class="cr-slice cr-series-${i % SERIES}" data-item="${i}" d="${d}"><title>${esc(it.label)}: ${fmt(it.value)}${esc(unit)}</title></path>`
  }).join('')
  const legend = items.map((it, i) =>
    `<rect class="cr-swatch cr-series-${i % SERIES}" x="320" y="${24 + i * 22}" width="10" height="10" rx="2"/>` +
    `<text class="cr-legend" x="338" y="${33 + i * 22}">${esc(short(it.label, 30))} — ${fmt(it.value)}${esc(unit)}</text>`).join('')
  return slices + legend
}

// One solid gauge per item, five to a row. Percent counters fill against 100; others against the
// largest value in the set.
function gauges(items, unit) {
  const max = unit === '%' ? 100 : niceMax(Math.max(...items.map((i) => i.value)))
  const cols = Math.min(5, items.length)
  const cw = W / cols
  const ch = GAUGE_ROW
  const r = Math.min(cw * 0.36, 52)
  return items.map((it, i) => {
    const cx = cw * (i % cols) + cw / 2
    const cy = 8 + ch * Math.floor(i / cols) + r + 4
    const f = Math.max(0, Math.min(1, it.value / max))
    const end = Math.PI + f * Math.PI
    const arc = (to) => `M${cx - r},${cy} A${r},${r} 0 0 1 ${cx + r * Math.cos(to)},${cy + r * Math.sin(to)}`
    return `<path class="cr-gauge-track" d="${arc(2 * Math.PI - 1e-4)}"/>` +
      `<path class="cr-gauge cr-series-${i % SERIES}" data-item="${i}" d="${arc(end)}"><title>${esc(it.label)}: ${fmt(it.value)}${esc(unit)}</title></path>` +
      `<text class="cr-gauge-value" x="${cx}" y="${cy - 4}" text-anchor="middle">${fmt(it.value)}${esc(unit)}</text>` +
      `<text class="cr-axis" x="${cx}" y="${cy + 16}" text-anchor="middle"><title>${esc(it.label)}</title>${esc(short(it.label, 16))}</text>`
  }).join('')
}

export function chartSvg(view, items, { unit = '' } = {}) {
  const label = `Top ${items.length} by value`
  if (!items.length) return svg('', label)
  switch (view) {
    case 'area': return svg(pointChart(items, unit, true), label)
    case 'line': return svg(pointChart(items, unit, false), label)
    case 'vbar': return svg(verticalBars(items, unit), label)
    case 'hbar': return svg(horizontalBars(items, unit), label)
    case 'pie': return svg(pie(items, unit), label)
    // As tall as its rows of gauges, not the other charts' fixed height.
    case 'gauge': return svg(gauges(items, unit), label, Math.ceil(items.length / Math.min(5, items.length)) * GAUGE_ROW + 8)
    default: return svg('', label)
  }
}
