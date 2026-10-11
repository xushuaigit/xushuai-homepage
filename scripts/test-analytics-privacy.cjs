'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const pagePath = path.resolve(__dirname, '../public/analytics-privacy.html');
const source = fs.readFileSync(pagePath, 'utf8');
const scripts = [...source.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
const key = 'site-analytics-opt-out';
assert.equal(scripts.length, 1, 'The page should contain only its local preference script.');
assert.equal(scripts[0][1].trim(), '', 'The page must not load a tracker script.');
assert.doesNotMatch(source, /<script\b[^>]*src=|<iframe\b|<img\b|fetch\s*\(|XMLHttpRequest|sendBeacon|document\.cookie|https?:\/\//i, 'The privacy page must not load external resources or make network calls.');
assert.match(source, /id="analytics-status"\s+role="status"\s+aria-live="polite"/);
assert.match(source, /width:\s*min\(880px,/);
assert.match(source, /@media\s*\(max-width:\s*520px\)/);
assert.match(source, /@font-face[\s\S]*?\.\/fonts\/apple-demo-sans\.woff2/);
assert(fs.existsSync(path.resolve(path.dirname(pagePath), 'fonts/apple-demo-sans.woff2')), 'The website font must exist.');
assert.match(source, /href="\.\/"/);
assert.match(source, /href="\.\/pmo-system\.html"/);
assert.match(source, /默认账号配置待启用/);
assert.match(source, /<noscript>[\s\S]*?JavaScript[\s\S]*?<\/noscript>/);

function makeEnvironment(options = {}) {
  const values = new Map(Object.entries(options.values || {}));
  const writes = [];
  const networkCalls = [];
  const storage = {
    getItem(name) {
      if (options.readFailure) throw new Error('Storage read denied.');
      return values.get(name) || null;
    },
    setItem(name, value) {
      writes.push({ action: 'set', key: name, value });
      if (options.writeFailure) throw new Error('Storage write denied.');
      if (!options.silentWriteFailure) values.set(name, String(value));
    },
    removeItem(name) {
      writes.push({ action: 'remove', key: name });
      if (options.removeFailure) throw new Error('Storage removal denied.');
      if (!options.silentRemoveFailure) values.delete(name);
    },
  };
  const elements = new Map();
  for (const id of ['analytics-status', 'disable-analytics', 'restore-analytics']) {
    elements.set(id, {
      textContent: '',
      disabled: true,
      handlers: {},
      addEventListener(type, callback) { this.handlers[type] = callback; },
    });
  }
  const navigator = { doNotTrack: options.dnt || '0', globalPrivacyControl: options.gpc === true };
  const failOnNetwork = (...args) => {
    networkCalls.push(args);
    throw new Error('The privacy page must not contact the network.');
  };
  const window = { localStorage: storage, navigator, fetch: failOnNetwork };
  if (options.storageUnavailable) {
    Object.defineProperty(window, 'localStorage', { get() { throw new Error('Storage access denied.'); } });
  }
  const document = { getElementById: id => elements.get(id) };
  vm.runInNewContext(scripts[0][2], { window, navigator, document, fetch: failOnNetwork, XMLHttpRequest: failOnNetwork }, { timeout: 1000, filename: pagePath });
  assert.equal(elements.get('disable-analytics').disabled, false);
  assert.equal(elements.get('restore-analytics').disabled, false);
  assert.equal(writes.length, 0, 'Opening the page must not change the preference.');
  assert.equal(networkCalls.length, 0);
  return {
    values,
    writes,
    status: () => elements.get('analytics-status').textContent,
    click(id) {
      elements.get(id).handlers.click();
      assert.equal(networkCalls.length, 0, 'Changing preferences must remain local.');
    },
  };
}

let checks = 0;
function check(name, callback) {
  callback();
  checks += 1;
  process.stdout.write(`PASS ${name}\n`);
}

check('new browser is described as a preference, without claiming analytics is active', () => {
  const environment = makeEnvironment();
  assert.match(environment.status(), /未设置关闭统计/);
  assert.match(environment.status(), /取决于站点配置/);
});

check('an existing opt-out is reflected in the status', () => {
  assert.match(makeEnvironment({ values: { [key]: '1' } }).status(), /已关闭本浏览器统计/);
  assert.match(makeEnvironment({ values: { [key]: '0' } }).status(), /未设置关闭统计/);
});

check('disable stores exactly the shared key and restore removes it', () => {
  const environment = makeEnvironment({ values: { unrelated: 'keep' } });
  environment.click('disable-analytics');
  assert.equal(environment.values.get(key), '1');
  assert.match(environment.status(), /已关闭本浏览器统计/);
  environment.click('restore-analytics');
  assert.equal(environment.values.has(key), false);
  assert.match(environment.status(), /已移除本浏览器的关闭设置/);
  assert.equal(environment.values.get('unrelated'), 'keep');
  assert.deepEqual(environment.writes, [
    { action: 'set', key, value: '1' },
    { action: 'remove', key },
  ]);
});

check('a blocked write clearly reports disable failure', () => {
  const environment = makeEnvironment({ writeFailure: true });
  environment.click('disable-analytics');
  assert.equal(environment.values.has(key), false);
  assert.match(environment.status(), /关闭失败.*未确认操作生效/);
  assert.doesNotMatch(environment.status(), /已关闭本浏览器统计/);
});

check('a blocked removal reports restore failure and leaves the stored opt-out', () => {
  const environment = makeEnvironment({ values: { [key]: '1' }, removeFailure: true });
  environment.click('restore-analytics');
  assert.equal(environment.values.get(key), '1');
  assert.match(environment.status(), /恢复失败.*未确认操作生效/);
});

check('silently discarded storage writes and removals are detected', () => {
  const disable = makeEnvironment({ silentWriteFailure: true });
  disable.click('disable-analytics');
  assert.match(disable.status(), /关闭失败/);
  const restore = makeEnvironment({ values: { [key]: '1' }, silentRemoveFailure: true });
  restore.click('restore-analytics');
  assert.match(restore.status(), /恢复失败/);
});

check('unavailable or unreadable storage fails visibly without claiming success', () => {
  for (const options of [{ storageUnavailable: true }, { readFailure: true }]) {
    const environment = makeEnvironment(options);
    assert.match(environment.status(), /读取失败.*按关闭统计处理/);
    environment.click('disable-analytics');
    assert.match(environment.status(), /关闭失败/);
    environment.click('restore-analytics');
    assert.match(environment.status(), /恢复失败/);
  }
});

check('DNT and GPC continue to apply after restoring the local preference', () => {
  for (const [options, signal] of [[{ dnt: '1' }, 'DNT'], [{ gpc: true }, 'GPC'], [{ dnt: '1', gpc: true }, 'DNT、GPC']]) {
    const environment = makeEnvironment({ ...options, values: { [key]: '1' } });
    assert(environment.status().includes('浏览器已开启 ' + signal));
    environment.click('restore-analytics');
    assert.equal(environment.values.has(key), false);
    assert(environment.status().includes('浏览器已开启 ' + signal));
    assert.match(environment.status(), /主站仍会停止统计.*不会取消浏览器的隐私设置/);
  }
});

process.stdout.write(`Analytics privacy: ${checks} checks passed; preferences stay local, no browser or network used.\n`);
