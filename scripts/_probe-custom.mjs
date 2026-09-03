import { chromium } from 'playwright-core'
const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' })
const p = await b.newPage()
await p.goto('http://localhost:5177/#/monitors/wan-link', { waitUntil: 'networkidle' })
await p.waitForTimeout(900)
const names = ['custom-report','customReport','custom','custom-dashboard','customDashboard',
  'report','custom-category','customCategory','category','folder']
const out = await p.evaluate(async (names) => {
  const res = {}
  for (const n of names) {
    const el = document.createElement('obs-icon')
    el.setAttribute('name', n); el.setAttribute('size', '18')
    document.body.append(el)
    await new Promise(r => setTimeout(r, 80))
    const html = el.shadowRoot ? el.shadowRoot.innerHTML : ''
    res[n] = /<svg|<path|<use/.test(html) ? 'draws' : 'EMPTY'
    el.remove()
  }
  return res
}, names)
for (const [k, v] of Object.entries(out)) console.log((v === 'draws' ? '  OK      ' : '  missing ') + k)
await b.close()
