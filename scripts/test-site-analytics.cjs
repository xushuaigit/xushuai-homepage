/* Run: node scripts/test-site-analytics.cjs
 * Optional provider compatibility check (GET only, every send stubbed in VM):
 * node scripts/test-site-analytics.cjs --verify-live-tracker
 */
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const https = require('node:https');
const crypto = require('node:crypto');

const root = path.resolve(__dirname, '..');
const runtime = fs.readFileSync(path.join(root, 'public/site-analytics.js'), 'utf8');
const actualConfig = JSON.parse(fs.readFileSync(path.join(root, 'public/analytics-config.json'), 'utf8'));
const disabledConfig = { enabled: false, websiteId: '' };
const pmoHTML = fs.readFileSync(path.join(root, 'public/pmo-system.html'), 'utf8');
const pmoData = pmoHTML.match(/<script id="system-data" type="application\/json">([\s\S]*?)<\/script>/)[1];
// Synthetic fixture only: never use the deployed Website ID in VM requests.
const WEBSITE = '12345678-1234-4123-8123-123456789abc';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ORIGIN = 'https://xushuaigit.github.io';
const BASE = '/xushuai-homepage/';
const SOURCE_KEY = 'site-analytics-source-v1';
const OPT_OUT_KEY = 'site-analytics-opt-out';
const tests = [];

function test(name, run) { tests.push({ name, run }); }
function plain(value) { return JSON.parse(JSON.stringify(value)); }
async function settle() { for (let i = 0; i < 5; i++) await Promise.resolve(); }

class Storage {
  constructor(values = {}) { this.values = new Map(Object.entries(values)); }
  getItem(key) { return this.values.has(key) ? this.values.get(key) : null; }
  setItem(key, value) { this.values.set(key, String(value)); }
  removeItem(key) { this.values.delete(key); }
}

class Element {
  constructor(tagName, attrs = {}, parentElement = null) {
    this.tagName = tagName.toUpperCase();
    this.attrs = { ...attrs };
    this.parentElement = parentElement;
    this.id = attrs.id || '';
    this.open = false;
    this.textContent = '';
  }
  setAttribute(key, value) { this.attrs[key] = String(value); }
  getAttribute(key) { return Object.hasOwn(this.attrs, key) ? this.attrs[key] : null; }
  hasAttribute(key) { return Object.hasOwn(this.attrs, key); }
  closest(selector) {
    const matches = node => selector.split(',').some(part => {
      part = part.trim();
      if (part === 'a[href]') return node.tagName === 'A' && node.hasAttribute('href');
      const attr = part.match(/^\[([^\]]+)\]$/);
      return attr && node.hasAttribute(attr[1]);
    });
    for (let node = this; node; node = node.parentElement) if (matches(node)) return node;
    return null;
  }
}

function makeEnvironment(options = {}) {
  const location = new URL(options.url || ORIGIN + BASE);
  const localStorage = options.localStorage || new Storage();
  const sessionStorage = options.sessionStorage || new Storage();
  const configRequests = [];
  const trackingRequests = [];
  const scripts = [];
  const listeners = new Map();
  const document = {
    currentScript: { src: options.loaderURL || ORIGIN + BASE + 'site-analytics.js' },
    title: 'Private page title that must never be submitted',
    referrer: options.referrer || '',
    readyState: 'complete',
    createElement: name => new Element(name),
    getElementById: id => id === 'system-data' && options.pmo !== false ? { textContent: pmoData } : null,
    addEventListener(type, handler, config) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push({ handler, config });
    },
    head: { appendChild: element => scripts.push(element) }
  };
  const navigator = { doNotTrack: options.doNotTrack || '0', globalPrivacyControl: options.gpc || false, language: 'en-US' };
  const window = {
    location, document, navigator, localStorage, sessionStorage,
    screen: { width: 1920, height: 1080 },
    history: {},
    fetch(url, config) {
      configRequests.push({ url, config });
      if (options.configFailure) return Promise.reject(new Error('Offline'));
      return Promise.resolve({
        ok: options.configHTTPFailure ? false : true,
        json: () => options.configJSONFailure ? Promise.reject(new Error('Invalid JSON')) : Promise.resolve(options.config || { enabled: true, websiteId: WEBSITE })
      });
    },
    addEventListener() {}
  };
  window.top = window;
  if (options.storageBlocked) Object.defineProperty(window, 'localStorage', { get() { throw new Error('Storage denied'); } });
  const context = vm.createContext({ window, document, navigator, URL, URLSearchParams, Set, Map, Date, Number, Boolean, Object, Promise });
  vm.runInContext(runtime, context, { filename: 'site-analytics.js' });
  async function loadTracker() {
    await settle();
    assert.equal(scripts.length, 1, 'Exactly one cloud script is loaded');
    window.umami = {
      track(payload) {
        const clean = window.siteAnalyticsBeforeSend('event', payload);
        if (clean) trackingRequests.push(plain(clean));
        return Promise.resolve();
      }
    };
    scripts[0].onload();
    await settle();
  }
  function dispatch(type, target, businessHandler = () => {}) {
    const event = {
      target, defaultPrevented: false, propagationStopped: false,
      preventDefault() { this.defaultPrevented = true; },
      stopPropagation() { this.propagationStopped = true; }
    };
    for (const listener of listeners.get(type) || []) listener.handler(event);
    if (!event.propagationStopped) businessHandler(event);
    return event;
  }
  return { window, document, context, scripts, listeners, configRequests, trackingRequests, localStorage, sessionStorage, loadTracker, dispatch };
}

test('deployed configuration has a valid public schema and contains no account secret', () => {
  // Both configured and unconfigured deployments are legitimate CI inputs.
  for (const config of [actualConfig, disabledConfig, { enabled: true, websiteId: WEBSITE }]) {
    assert.ok(config && typeof config === 'object' && !Array.isArray(config));
    assert.deepEqual(Object.keys(config).sort(), ['enabled', 'websiteId']);
    assert.equal(typeof config.enabled, 'boolean');
    assert.equal(typeof config.websiteId, 'string');
    if (config.enabled || config.websiteId !== '') assert.match(config.websiteId, UUID);
  }
});

test('localhost, wrong hosts, unrelated paths and mismatched loader origins make no request', async () => {
  for (const options of [
    { url: 'http://localhost:3000/demo/apple' },
    { url: 'http://127.0.0.1:3000/' },
    { url: 'https://preview.example.com/xushuai-homepage/' },
    { url: ORIGIN + '/another-private-page?email=user@example.com' },
    { url: ORIGIN + BASE + 'privacy.html' },
    { loaderURL: 'https://cdn.example.com/site-analytics.js' },
    { loaderURL: ORIGIN + '/other/site-analytics.js' }
  ]) {
    const env = makeEnvironment(options);
    await settle();
    assert.equal(env.configRequests.length, 0);
    assert.equal(env.scripts.length, 0);
    assert.equal(env.trackingRequests.length, 0);
  }
});

test('Do Not Track, GPC, site opt-out, Umami opt-out and blocked storage fail closed', async () => {
  for (const options of [
    { doNotTrack: '1' }, { gpc: true },
    { localStorage: new Storage({ [OPT_OUT_KEY]: '1' }) },
    { localStorage: new Storage({ 'umami.disabled': '1' }) }, { storageBlocked: true }
  ]) {
    const env = makeEnvironment(options);
    await settle();
    assert.equal(env.configRequests.length, 0);
    assert.equal(env.scripts.length, 0);
    assert.equal(env.window.siteAnalytics.isOptedOut(), true);
  }
});

test('disabled, incomplete, malformed and non-UUID configurations do not load a tracker', async () => {
  for (const config of [disabledConfig, {}, { enabled: 'true', websiteId: WEBSITE }, { enabled: true, websiteId: '' }, { enabled: true, websiteId: 'api-secret' }, { enabled: true, websiteId: '00000000-0000-0000-0000-000000000000' }]) {
    const env = makeEnvironment({ config });
    await settle();
    assert.equal(env.configRequests.length, 1);
    assert.equal(env.scripts.length, 0);
    assert.equal(env.window.siteAnalytics.getStatus(), 'disabled');
  }
});

test('network, HTTP and JSON failures leave navigation functional', async () => {
  for (const options of [{ configFailure: true }, { configHTTPFailure: true }, { configJSONFailure: true }]) {
    const env = makeEnvironment(options);
    await settle();
    assert.equal(env.scripts.length, 0);
    assert.equal(env.window.siteAnalytics.getStatus(), 'failed');
    let handled = 0;
    const event = env.dispatch('click', new Element('a', { href: '#about' }), () => handled++);
    assert.equal(handled, 1);
    assert.equal(event.defaultPrevented, false);
  }
});

test('one manual homepage pageview uses a fixed script and no auto tracking or identifying fields', async () => {
  const env = makeEnvironment();
  await env.loadTracker();
  const tracker = env.scripts[0];
  assert.equal(tracker.src, 'https://cloud.umami.is/script.js');
  assert.equal(tracker.async, true);
  assert.equal(tracker.referrerPolicy, 'no-referrer');
  assert.equal(tracker.getAttribute('data-auto-track'), 'false');
  assert.equal(tracker.getAttribute('data-auto-pageview'), 'false');
  assert.equal(tracker.getAttribute('data-before-send'), 'siteAnalyticsBeforeSend');
  assert.equal(tracker.getAttribute('data-distinct-id'), null);
  assert.equal(tracker.getAttribute('data-performance'), null);
  assert.deepEqual(env.trackingRequests, [{ website: WEBSITE, hostname: 'xushuaigit.github.io', url: BASE, title: 'Personal homepage', referrer: '' }]);
  tracker.onload();
  vm.runInContext(runtime, env.context);
  assert.equal(env.trackingRequests.length, 1);
  assert.equal(env.configRequests.length, 1);
  assert.equal(env.scripts.length, 1);
});

test('sensitive URL values, arbitrary metadata, title and referrer paths are removed', async () => {
  const env = makeEnvironment({
    url: ORIGIN + BASE + '?utm_source=qr_v1&utm_medium=user%40example.com&utm_campaign=13800138000&utm_content=tel_138_0013_8000&ref=c1&email=user@example.com&phone=13800138000#user@example.com',
    referrer: 'https://search.example.com/people/13800138000?email=user@example.com#private'
  });
  await env.loadTracker();
  assert.equal(env.trackingRequests[0].url, BASE + '?utm_source=qr_v1&ref=c1');
  assert.equal(env.trackingRequests[0].referrer, 'https://search.example.com');
  const cleaned = plain(env.window.siteAnalyticsBeforeSend('event', {
    website: 'fake', url: '/private/user@example.com?phone=13800138000#private',
    title: 'Sensitive text', referrer: 'https://evil.example/private', id: 'real-user',
    screen: '1920x1080', language: 'en-US', data: { email: 'user@example.com', phone: '13800138000' }
  }));
  assert.deepEqual(Object.keys(cleaned).sort(), ['hostname', 'referrer', 'title', 'url', 'website']);
  assert.equal(cleaned.url, BASE + '?utm_source=qr_v1&ref=c1');
  const serialized = JSON.stringify(cleaned);
  for (const privateValue of ['user@example.com', '13800138000', 'Sensitive text', 'real-user', '1920x1080']) assert.equal(serialized.includes(privateValue), false);
  assert.equal(env.window.siteAnalyticsBeforeSend('identify', { data: { email: 'user@example.com' } }), false);
  assert.equal(env.window.siteAnalyticsBeforeSend('performance', {}), false);
  assert.equal(env.window.siteAnalyticsBeforeSend('event', { name: 'arbitrary_text_event' }), false);
});

test('only known public hashes survive and internal or credentialed referrers are dropped', async () => {
  const env = makeEnvironment({ url: ORIGIN + BASE + '#stories-ai', referrer: ORIGIN + BASE + '?phone=13800138000' });
  await env.loadTracker();
  assert.equal(env.trackingRequests[0].url, BASE + '#stories-ai');
  assert.equal(env.trackingRequests[0].referrer, '');
  for (const hash of ['#email=user@example.com', '#13800138000', '#%E0%A4%A', '#not-an-anchor']) {
    const clean = env.window.siteAnalyticsBeforeSend('event', { url: BASE + hash });
    assert.equal(clean.url, BASE);
  }
  env.document.referrer = 'https://user:password@example.com/path';
  assert.equal(env.window.siteAnalyticsBeforeSend('event', {}).referrer, '');
});

test('source codes inherit for 30 minutes across same-origin homepage and PMO page', async () => {
  const sessionStorage = new Storage();
  const home = makeEnvironment({ url: ORIGIN + BASE + '?utm_source=qr_v1&utm_medium=offline&utm_campaign=pmo_demo&utm_content=card_A&ref=friend_1', sessionStorage });
  await home.loadTracker();
  const pmo = makeEnvironment({ url: ORIGIN + BASE + 'pmo-system.html#module-M01', sessionStorage });
  await pmo.loadTracker();
  assert.equal(pmo.trackingRequests.length, 1);
  assert.equal(pmo.trackingRequests[0].title, 'PMO system');
  assert.equal(pmo.trackingRequests[0].url, BASE + 'pmo-system.html?utm_source=qr_v1&utm_medium=offline&utm_campaign=pmo_demo&utm_content=card_A&ref=friend_1#module-M01');
  pmo.dispatch('click', new Element('a', { href: '#module-M01', 'data-module': 'M01' }));
  const event = pmo.trackingRequests.at(-1);
  assert.equal(event.name, 'pmo_module_select');
  assert.deepEqual(event.data, { page: 'pmo', utm_source: 'qr_v1', utm_medium: 'offline', utm_campaign: 'pmo_demo', utm_content: 'card_A', ref: 'friend_1', target: 'M01' });
  const cached = JSON.parse(sessionStorage.getItem(SOURCE_KEY));
  assert.equal(cached.origin, ORIGIN);
  assert.ok(cached.expires > Date.now() && cached.expires <= Date.now() + 30 * 60 * 1000);
});

test('expired, foreign, malformed sources and invalid current codes never inherit', async () => {
  for (const cached of [
    { origin: ORIGIN, expires: Date.now() - 1, values: { utm_source: 'old_code' } },
    { origin: 'https://foreign.example', expires: Date.now() + 50000, values: { utm_source: 'foreign_code' } },
    { origin: ORIGIN, expires: Date.now() + 60 * 60 * 1000, values: { utm_source: 'bad_expiry' } },
    { origin: ORIGIN, expires: Date.now() + 50000, values: { utm_source: 'user@example.com', phone: '13800138000' } }
  ]) {
    const env = makeEnvironment({ sessionStorage: new Storage({ [SOURCE_KEY]: JSON.stringify(cached) }) });
    await env.loadTracker();
    assert.equal(env.trackingRequests[0].url, BASE);
  }
  const storage = new Storage({ [SOURCE_KEY]: JSON.stringify({ origin: ORIGIN, expires: Date.now() + 50000, values: { utm_source: 'old_code' } }) });
  const env = makeEnvironment({ url: ORIGIN + BASE + '?utm_source=invalid%20text&ref=123456789&utm_campaign=' + 'x'.repeat(41), sessionStorage: storage });
  await env.loadTracker();
  assert.equal(env.trackingRequests[0].url, BASE);
  const duplicate = makeEnvironment({ url: ORIGIN + BASE + '?utm_source=one&utm_source=two' });
  await duplicate.loadTracker();
  assert.equal(duplicate.trackingRequests[0].url, BASE);
});

test('navigation, case, career, email and phone events carry only fixed names and IDs', async () => {
  const env = makeEnvironment();
  await env.loadTracker();
  let businessClicks = 0;
  for (const href of ['#about', './pmo-system.html', 'mailto:user@example.com?subject=Private', 'tel:13800138000']) {
    const link = new Element('a', { href });
    link.textContent = 'Private visible text';
    const child = new Element('span', {}, link);
    const click = env.dispatch('click', child, () => businessClicks++);
    assert.equal(click.defaultPrevented, false);
    assert.equal(click.propagationStopped, false);
  }
  assert.equal(businessClicks, 4);
  const caseDetail = new Element('details', { id: 'enterprise-pmo-details' });
  caseDetail.open = true;
  env.dispatch('toggle', caseDetail);
  caseDetail.open = false;
  env.dispatch('toggle', caseDetail);
  const careerDetail = new Element('details', { id: 'career-consultant' });
  careerDetail.open = true;
  env.dispatch('toggle', careerDetail);
  const unknownDetail = new Element('details', { id: 'user@example.com' });
  unknownDetail.open = true;
  env.dispatch('toggle', unknownDetail);
  env.dispatch('click', new Element('a', { href: '#user@example.com' }));
  env.dispatch('click', new Element('a', { href: 'https://external.example.com/private' }));
  const events = env.trackingRequests.filter(item => item.name);
  assert.deepEqual(events.map(item => [item.name, item.data.target]), [
    ['nav_click', 'about'], ['nav_click', 'pmo'], ['contact_mailto', undefined], ['contact_tel', undefined], ['case_open', 'enterprise-pmo'], ['career_open', 'consultant']
  ]);
  const serialized = JSON.stringify(events);
  for (const privateValue of ['user@example.com', '13800138000', 'Private visible text', 'subject']) assert.equal(serialized.includes(privateValue), false);
  for (const entries of env.listeners.values()) for (const { config } of entries) assert.deepEqual(plain(config), { capture: true, passive: true });
});

test('PMO dynamically created module selections and details use actual public ID allowlists', async () => {
  const env = makeEnvironment({ url: ORIGIN + BASE + 'pmo-system.html' });
  await env.loadTracker();
  let businessClicks = 0;
  env.dispatch('click', new Element('a', { href: '#module-M01', 'data-module': 'M01' }), () => businessClicks++);
  env.dispatch('click', new Element('button', { 'data-node': 'M02' }), () => businessClicks++);
  env.dispatch('click', new Element('button', { 'data-module': 'M99' }), () => businessClicks++);
  for (const id of ['node-M01-B01', 'record-M01-K01', 'record-T01']) {
    const detail = new Element('details', { id });
    detail.open = true;
    env.dispatch('toggle', detail);
  }
  const unknownDetail = new Element('details', { id: 'record-user@example.com' });
  unknownDetail.open = true;
  env.dispatch('toggle', unknownDetail);
  assert.equal(businessClicks, 3);
  assert.deepEqual(env.trackingRequests.filter(item => item.name).map(item => [item.name, item.data.target]), [
    ['pmo_module_select', 'M01'], ['pmo_module_select', 'M02'], ['pmo_details_open', 'node-M01-B01'], ['pmo_details_open', 'record-M01-K01'], ['pmo_details_open', 'record-T01']
  ]);
  assert.equal(env.window.siteAnalyticsBeforeSend('event', { url: BASE + 'pmo-system.html#templates/T01' }).url, BASE + 'pmo-system.html#templates/T01');
});

test('events queue before tracker load; failures and opt-out prevent sends without swallowing clicks', async () => {
  const env = makeEnvironment({ url: ORIGIN + BASE + '?utm_source=qr_v1' });
  await settle();
  env.dispatch('click', new Element('a', { href: '#about' }));
  await env.loadTracker();
  assert.equal(env.trackingRequests.length, 2);
  assert.equal(env.trackingRequests[1].name, 'nav_click');
  assert.equal(env.window.siteAnalytics.setOptOut(true), true);
  assert.equal(env.localStorage.getItem(OPT_OUT_KEY), '1');
  assert.equal(env.sessionStorage.getItem(SOURCE_KEY), null);
  let handled = false;
  const event = env.dispatch('click', new Element('a', { href: '#contact' }), () => handled = true);
  assert.equal(handled, true);
  assert.equal(event.defaultPrevented, false);
  assert.equal(env.trackingRequests.length, 2);
  assert.equal(env.window.siteAnalyticsBeforeSend('event', {}), false);
  assert.equal(env.window.siteAnalytics.setOptOut(false), true);
  assert.equal(env.localStorage.getItem(OPT_OUT_KEY), null);
  assert.equal(env.window.siteAnalytics.setOptOut('false'), false);
  const failed = makeEnvironment();
  await settle();
  failed.scripts[0].onerror();
  assert.equal(failed.window.siteAnalytics.getStatus(), 'failed');
  assert.equal(failed.trackingRequests.length, 0);
});

test('privacy changes during configuration loading are respected before third-party script load', async () => {
  const env = makeEnvironment();
  env.window.siteAnalytics.setOptOut(true);
  await settle();
  assert.equal(env.scripts.length, 0);
  assert.equal(env.window.siteAnalytics.getStatus(), 'opted-out');
});

function getOfficialTracker() {
  return new Promise((resolve, reject) => {
    https.get('https://cloud.umami.is/script.js', response => {
      if (response.statusCode !== 200) { response.resume(); reject(new Error('Official tracker GET returned ' + response.statusCode)); return; }
      let body = '';
      response.setEncoding('utf8');
      response.on('data', chunk => { body += chunk; if (body.length > 1000000) response.destroy(new Error('Tracker unexpectedly large')); });
      response.on('end', () => resolve(body));
      response.on('error', reject);
    }).on('error', reject).setTimeout(15000, function () { this.destroy(new Error('Official tracker GET timed out')); });
  });
}

async function verifyLiveTracker() {
  const source = await getOfficialTracker();
  const env = makeEnvironment({ url: ORIGIN + BASE + '?utm_source=qr_v1&email=user@example.com#contact' });
  await settle();
  const requests = [];
  env.document.currentScript = env.scripts[0];
  env.window.fetch = (url, options) => {
    // This stub never calls a network function, even for valid provider requests.
    requests.push({ url, options, body: JSON.parse(options.body) });
    return Promise.resolve({ json: () => Promise.resolve({}) });
  };
  env.context.fetch = env.window.fetch;
  vm.runInContext(source, env.context, { filename: 'official-umami-cloud-script.js', timeout: 1000 });
  await settle();
  assert.equal(requests.length, 0, 'data-auto-track=false causes zero automatic sends');
  assert.equal(typeof env.window.umami.track, 'function', 'Manual tracker is available with auto tracking disabled');
  env.scripts[0].onload();
  await settle();
  assert.equal(requests.length, 1, 'Exactly one manual pageview');
  assert.equal(requests[0].url, 'https://gateway.umami.is/api/send');
  assert.equal(requests[0].body.type, 'event');
  assert.deepEqual(requests[0].body.payload, { website: WEBSITE, hostname: 'xushuaigit.github.io', url: BASE + '?utm_source=qr_v1#contact', title: 'Personal homepage', referrer: '' });
  env.dispatch('click', new Element('a', { href: 'mailto:user@example.com' }));
  await settle();
  assert.equal(requests.length, 2);
  assert.deepEqual(requests[1].body.payload, {
    website: WEBSITE, hostname: 'xushuaigit.github.io',
    url: BASE + '?utm_source=qr_v1#contact', title: 'Personal homepage', referrer: '',
    name: 'contact_mailto', data: { page: 'homepage', utm_source: 'qr_v1' }
  });
  for (const request of requests) {
    const payload = request.body.payload;
    for (const excluded of ['screen', 'language', 'id', 'ip', 'rawURL']) assert.equal(Object.hasOwn(payload, excluded), false);
    assert.equal(payload.url, BASE + '?utm_source=qr_v1#contact');
    assert.equal(payload.url.includes('email='), false);
  }
  assert.equal(JSON.stringify(requests).includes('user@example.com'), false);
  console.log('PASS official cloud tracker GET-only VM compatibility (' + source.length + ' bytes, sha256 ' + crypto.createHash('sha256').update(source).digest('hex') + ')');
}

(async function () {
  let passed = 0;
  for (const item of tests) {
    await item.run();
    passed++;
    console.log('PASS ' + item.name);
  }
  if (process.argv.includes('--verify-live-tracker')) await verifyLiveTracker();
  console.log('PASS ' + passed + ' local analytics tests; no real analytics POSTs were sent.');
}()).catch(error => { console.error(error); process.exitCode = 1; });
