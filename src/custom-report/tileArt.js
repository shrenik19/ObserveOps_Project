// The Report Type tiles' pictures. The product draws each type as muted line art on a faint grid;
// the DS ships none of them (see DS-GAPS), so these are hand-drawn in the same idiom. Every colour
// comes from CSS (customReport.css) through the classes below — no colour lives in this file.

const GRID = Array.from({ length: 5 }, (_, i) => `<line class="art-grid" x1="${10 + i * 35}" y1="4" x2="${10 + i * 35}" y2="76"/>`).join('') +
  Array.from({ length: 4 }, (_, i) => `<line class="art-grid" x1="0" y1="${10 + i * 20}" x2="160" y2="${10 + i * 20}"/>`).join('')

const MOTIFS = {
  table: `<rect class="art-line" x="30" y="12" width="100" height="56" rx="3"/>
    <line class="art-line" x1="30" y1="24" x2="130" y2="24"/><line class="art-line" x1="30" y1="38" x2="130" y2="38"/>
    <line class="art-line" x1="30" y1="52" x2="130" y2="52"/><line class="art-line" x1="70" y1="12" x2="70" y2="68"/>
    <line class="art-line" x1="100" y1="12" x2="100" y2="68"/>
    <line class="art-bar" x1="36" y1="18" x2="62" y2="18"/><line class="art-bar" x1="76" y1="18" x2="94" y2="18"/>
    <line class="art-bar" x1="106" y1="18" x2="124" y2="18"/><line class="art-bar" x1="36" y1="31" x2="58" y2="31"/>
    <line class="art-bar" x1="36" y1="45" x2="54" y2="45"/><line class="art-bar" x1="36" y1="59" x2="60" y2="59"/>`,
  line: `<polyline class="art-line" points="20,62 40,50 60,56 80,34 100,42 120,22 140,30"/>
    <polyline class="art-line art-faint" points="20,66 45,58 70,62 95,48 120,52 140,40"/>
    <line class="art-line" x1="130" y1="10" x2="130" y2="70"/><circle class="art-dot" cx="130" cy="26" r="4"/><circle class="art-dot" cx="130" cy="46" r="4"/>`,
  area: `<path class="art-fill" d="M20 68 L45 52 L65 30 L85 54 L105 48 L125 60 L140 56 L140 68 Z"/>`,
  pie: `<circle class="art-line" cx="80" cy="40" r="26"/><path class="art-fill" d="M80 40 L80 14 A26 26 0 0 1 104 50 Z"/><circle class="art-hole" cx="80" cy="40" r="7"/>`,
  flow: `<path class="art-line" d="M30 18 C70 18 90 62 130 62"/><path class="art-line" d="M30 62 C70 62 90 18 130 18"/>
    <path class="art-line" d="M30 40 C70 40 90 30 130 40"/><path class="art-line art-faint" d="M30 28 C70 28 90 52 130 50"/>`,
  code: `<rect class="art-line" x="50" y="10" width="60" height="60" rx="4"/><line class="art-line" x1="50" y1="22" x2="110" y2="22"/>
    <polyline class="art-line" points="70,38 62,46 70,54"/><polyline class="art-line" points="90,38 98,46 90,54"/>`,
  shield: `<rect class="art-line" x="48" y="22" width="44" height="50" rx="3"/><line class="art-bar" x1="56" y1="34" x2="80" y2="34"/>
    <line class="art-bar" x1="56" y1="44" x2="84" y2="44"/><path class="art-line" d="M100 10 L116 16 L116 30 C116 40 108 46 100 50 C92 46 84 40 84 30 L84 16 Z"/>
    <polyline class="art-line" points="93,29 99,35 109,23"/>`,
  lines: `<line class="art-line" x1="30" y1="20" x2="130" y2="20"/><line class="art-bar" x1="44" y1="32" x2="104" y2="32"/>
    <line class="art-bar" x1="36" y1="44" x2="96" y2="44"/><line class="art-bar" x1="60" y1="56" x2="120" y2="56"/>`,
  device: `<rect class="art-line" x="34" y="12" width="76" height="46" rx="3"/><line class="art-line" x1="72" y1="58" x2="72" y2="70"/>
    <line class="art-line" x1="56" y1="70" x2="88" y2="70"/><rect class="art-line" x="104" y="34" width="22" height="36" rx="3"/>
    <circle class="art-line" cx="52" cy="28" r="6"/><line class="art-bar" x1="70" y1="40" x2="70" y2="28"/><line class="art-bar" x1="80" y1="40" x2="80" y2="22"/>
    <line class="art-bar" x1="90" y1="40" x2="90" y2="32"/>`,
  globe: `<circle class="art-line" cx="80" cy="40" r="18"/><ellipse class="art-line" cx="80" cy="40" rx="8" ry="18"/>
    <line class="art-line" x1="62" y1="40" x2="98" y2="40"/><rect class="art-line" x="36" y="8" width="14" height="10" rx="2"/>
    <rect class="art-line" x="110" y="8" width="14" height="10" rx="2"/><rect class="art-line" x="36" y="62" width="14" height="10" rx="2"/>
    <rect class="art-line" x="110" y="62" width="14" height="10" rx="2"/>`,
  // SLO: a solid gauge filling towards its target, with the target marked.
  slo: `<path class="art-track" d="M40 64 A40 40 0 0 1 120 64"/><path class="art-accent" d="M40 64 A40 40 0 0 1 108.3 35.7"/>
    <line class="art-target" x1="113.8" y1="30.2" x2="104" y2="38.5"/><circle class="art-dot" cx="80" cy="64" r="4"/>
    <line class="art-line" x1="80" y1="64" x2="102" y2="44"/>`,
}

const MOTIF_OF = {
  Availability: 'table', Performance: 'line', Inventory: 'table', 'Active Alerts': 'table',
  'Availability Flap Summary': 'line', 'Metric Alerts': 'table', Audit: 'pie', 'Log Events': 'table',
  'Trap Events': 'table', 'Log Analytics': 'area', 'Flow Analytics': 'flow', 'Custom Script': 'code',
  'Polling Data': 'table', 'Historical Trend': 'line', Compliance: 'shield', APM: 'lines',
  RUM: 'device', NetRoute: 'globe', SLO: 'slo',
}

export const tileArt = (type) =>
  `<svg class="tile-art" viewBox="0 0 160 80" aria-hidden="true">${GRID}${MOTIFS[MOTIF_OF[type] ?? 'table']}</svg>`
