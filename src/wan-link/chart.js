// The DS ships no chart element — its 47 components include obs-dataviz-tooltip and
// obs-metric-list, but nothing that draws a series, because the product's charts are Highcharts
// (see @mtdt/observeops-ds-spec/tokens/chart-palette.json). These charts are therefore ours, but
// every colour still comes from a DS --chart-* custom property, so the no-hardcoded-colours rule
// holds and light/dark come for free.

/** The DS categorical series palette, consumed in order per the palette's own rules. */
export const SERIES_TOKENS = [
  '--chart-vivid-teal',
  '--chart-sunset-orange',
  '--chart-neon-purple',
  '--chart-lime-green',
  '--chart-hot-pink',
  '--chart-aqua',
  '--chart-golden-yellow',
  '--chart-rose-red',
]

/** Series n takes hue n, wrapping after the last. Never hand-picked. */
export const seriesToken = (index) => SERIES_TOKENS[index % SERIES_TOKENS.length]

const escape = (value) =>
  String(value).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ))

const VIEW_W = 600
const VIEW_H = 104
const POINTS = 70

/**
 * A deterministic pseudo-random trace, so a chart looks the same on every open. Real data would
 * replace this; the shape is what is being designed.
 */
export function trace(seed, base) {
  let s = seed >>> 0
  const points = []
  for (let i = 0; i < POINTS; i += 1) {
    s = (Math.imul(s, 1103515245) + 12345) >>> 0
    const v = Math.max(5, Math.min(VIEW_H - 5, base + (s / 4294967295 - 0.5) * 46))
    points.push(`${((i / (POINTS - 1)) * VIEW_W).toFixed(1)},${v.toFixed(1)}`)
  }
  return points.join(' ')
}

const BASES = [70, 52, 34, 86, 62, 44]

export function chartHTML(def) {
  const { title, span, series = [], yTicks = [], xTicks = [], flat } = def

  const plot = flat
    ? `<line x1="0" y1="34" x2="${VIEW_W}" y2="34" style="stroke:var(${seriesToken(0)})"/>`
    : series
      .map((_, i) => {
        const points = trace(title.length * 7717 + i * 9973 + 31, BASES[i % BASES.length])
        return `<polyline points="${points}" style="stroke:var(${seriesToken(i)})"/>`
      })
      .join('')

  const legend = series
    .map((name, i) => `<span class="wl-chart__key"><i style="background:var(${seriesToken(i)})"></i>${escape(name)}</span>`)
    .join('')

  return `
    <section class="wl-card wl-card--chart" style="--wl-span:${Number(span) || 12}">
      <h3 class="wl-card__title">${escape(title)}</h3>
      <div class="wl-chart">
        <div class="wl-chart__y">${yTicks.map((t) => `<span>${escape(t)}</span>`).join('')}</div>
        <svg class="wl-chart__plot" viewBox="0 0 ${VIEW_W} ${VIEW_H}" preserveAspectRatio="none" aria-hidden="true">${plot}</svg>
        <div class="wl-chart__x">${xTicks.map((t) => `<span>${escape(t)}</span>`).join('')}</div>
        <div class="wl-chart__legend">${legend}</div>
      </div>
    </section>`
}
