import { chromium } from 'playwright-core';

const FILE = 'file:///D:/Claude%20design/observeops-app-share/wan-link-discovery/wireframe.html';
const OUT  = 'C:/Users/SHRENI~1/AppData/Local/Temp/claude/d--Claude-design-observeops-app-share/4ed436c0-2044-4e19-bf74-0899690ead18/scratchpad/';

const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const errs = [];
p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE: ' + m.text()); });
await p.goto(FILE);

const shot = async n => p.screenshot({ path: OUT + n + '.png' });

// 1 — list
await shot('01-list');

// 2 — create form, empty
await p.click('text=Create Discovery Profile');
await p.waitForTimeout(200);
const gatedBefore = await p.$eval('#f-gated', e => e.className);
await shot('02-form-empty');

// pick the NX-OS monitor
await p.selectOption('#f-monitor', { index: 3 }); // CORE-NX-01 (0 = placeholder)
await p.waitForTimeout(200);
const afterMonitor = await p.evaluate(() => ({
  gated:   document.getElementById('f-gated').className,
  vendor:  document.getElementById('f-vendor').value,
  vendorD: document.getElementById('f-vendor').disabled,
  os:      document.getElementById('f-os').value,
  osD:     document.getElementById('f-os').disabled,
  osOpts:  [...document.getElementById('f-os').options].map(o => o.value),
  cred:    document.getElementById('f-cred').value,
  credHint:document.getElementById('f-cred-hint').textContent,
  probes:  [...document.getElementById('f-probe').options].map(o => o.value),
  ifaces:  [...document.getElementById('f-iface').options].map(o => o.value),
  portRow: getComputedStyle(document.getElementById('f-portrow')).display,
}));

// UDP Jitter -> destination port appears
await p.selectOption('#f-probe', 'UDP Jitter');
await p.waitForTimeout(150);
const portOn = await p.$eval('#f-portrow', e => getComputedStyle(e).display);
await shot('03-form-nxos-udpjitter');

// switch Device OS to IOS XE -> probe must clear + warn, port row hides
await p.selectOption('#f-os', 'IOS XE');
await p.waitForTimeout(150);
const afterOsSwitch = await p.evaluate(() => ({
  probe:   document.getElementById('f-probe').value,
  warn:    document.getElementById('f-os-warn').className,
  portRow: getComputedStyle(document.getElementById('f-portrow')).display,
  probes:  [...document.getElementById('f-probe').options].map(o => o.value),
  cred:    document.getElementById('f-cred').value,
  credHint:document.getElementById('f-cred-hint').textContent,
}));
await shot('04-form-os-switched');

// Juniper monitor -> single probe, SNMP, no matching credential
await p.selectOption('#f-monitor', { index: 4 });
await p.waitForTimeout(150);
const juniper = await p.evaluate(() => ({
  vendor:  document.getElementById('f-vendor').value,
  osOpts:  [...document.getElementById('f-os').options].map(o => o.value),
  probes:  [...document.getElementById('f-probe').options].map(o => o.value),
  cred:    document.getElementById('f-cred').value,
  credHint:document.getElementById('f-cred-hint').textContent,
}));

// validation: Save and Run with holes
await p.click('text=Save and Run');
await p.waitForTimeout(150);
const errText = await p.$eval('#f-err', e => ({ txt: e.textContent, disp: getComputedStyle(e).display }));
const stillOnForm = await p.$eval('#s-form', e => e.classList.contains('on'));

// fill it properly on the NX-OS device via the deep link path instead
await p.click('button[data-s="device"]');
await p.waitForTimeout(100);
await p.click('text=Add WAN Link');
await p.waitForTimeout(250);
const locked = await p.evaluate(() => ({
  monDisabled: document.getElementById('f-monitor').disabled,
  hint:        document.getElementById('f-monitor-hint').textContent,
  name:        document.getElementById('f-name').value,
  os:          document.getElementById('f-os').value,
}));
await shot('05-form-locked-from-device');

await p.selectOption('#f-probe', 'ICMP Echo');
await p.selectOption('#f-iface', 'Ethernet1/48');
await p.fill('#f-isp', 'Airtel');
await p.fill('#f-dip', '8.8.8.8');
await p.click('text=Save and Run');
await p.waitForTimeout(300);
const onProg = await p.$eval('#s-prog', e => e.classList.contains('on'));
await shot('06-progress-mid');
await p.waitForTimeout(4600);
const progDone = await p.evaluate(() => ({
  pct:   document.getElementById('p-pct').textContent,
  ok:    document.getElementById('p-ok').textContent,
  bad:   document.getElementById('p-bad').textContent,
  next:  document.getElementById('p-next').disabled,
  steps: [...document.querySelectorAll('#p-steps li')].map(li => li.className + ' | ' + li.textContent),
}));
await shot('07-progress-done');

// provision
await p.click('#p-next');
await p.waitForTimeout(200);
const provBefore = await p.evaluate(() => ({
  addDisabled: document.getElementById('v-add').disabled,
  name: document.getElementById('v-name').textContent,
  mon:  document.getElementById('v-mon').textContent,
  probe:document.getElementById('v-probe').textContent,
  iface:document.getElementById('v-if').textContent,
}));
await p.click('#v-one');
await p.waitForTimeout(150);
const provAfter = await p.$eval('#v-add', e => e.disabled);
await shot('08-provision');

await p.click('#v-add');
await p.waitForTimeout(250);
const deviceRows = await p.$$eval('#d-rows tr', rs => rs.map(r => r.className + ' | ' + r.textContent.replace(/\s+/g, ' ').trim()));
await shot('09-device-tab');

// failure simulation
await p.selectOption('#sim', 'f3');
await p.click('button[data-s="prog"]');
await p.waitForTimeout(3400);
const failRun = await p.$$eval('#p-steps li', ls => ls.map(l => l.className + ' | ' + l.textContent));
const failCounts = await p.evaluate(() => ({ ok: document.getElementById('p-ok').textContent, bad: document.getElementById('p-bad').textContent }));
await shot('10-progress-fail');

// annotations
await p.click('button[data-s="list"]');
await p.check('#anno');
await p.waitForTimeout(150);
const annoVisible = await p.$$eval('#s-list .anno', ns => ns.map(n => getComputedStyle(n).display));
await shot('11-annotations');

// horizontal overflow check on every screen
const overflow = {};
for (const s of ['list','form','prog','prov','device']) {
  await p.click(`button[data-s="${s}"]`);
  await p.waitForTimeout(120);
  overflow[s] = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
}

console.log(JSON.stringify({
  gatedBefore, afterMonitor, portOn, afterOsSwitch, juniper,
  errText, stillOnForm, locked, onProg, progDone, provBefore, provAfter,
  deviceRows, failRun, failCounts, annoVisible, overflow, errs
}, null, 2));

await b.close();
