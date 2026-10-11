/* Anonymous, opt-in-by-configuration analytics for the published personal site.
 * Umami docs: https://docs.umami.is/docs/tracker-functions
 * No account/API secret belongs in this file or analytics-config.json.
 */
(function () {
  'use strict';

  if (window.siteAnalytics) return;

  var HOST = 'xushuaigit.github.io';
  var BASE = '/xushuai-homepage/';
  var TRACKER = 'https://cloud.umami.is/script.js';
  var OPT_OUT_KEY = 'site-analytics-opt-out';
  var SOURCE_KEY = 'site-analytics-source-v1';
  var SOURCE_TTL = 30 * 60 * 1000;
  var SOURCE_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'ref'];
  var EVENTS = ['nav_click', 'case_open', 'career_open', 'contact_mailto', 'contact_tel', 'pmo_module_select', 'pmo_details_open'];
  var UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  var CASE_IDS = ['enterprise-pmo', 'art-delivery', 'ai-workflow', 'staged-delivery', 'retail-governance'];
  var CAREER_IDS = ['consultant', 'porsche', 'dingdong', 'aotu', 'dada'];
  var HOME_ANCHORS = ['content', 'about', 'approach', 'verification', 'stories', 'career', 'contact', 'stories-foundation', 'stories-workflow', 'stories-delivery', 'stories-ai'];
  var PMO_VIEWS = ['overview', 'mindmap', 'mechanisms', 'gates', 'roles', 'metrics', 'templates', 'rollout', 'evidence'];
  var scriptURL = document.currentScript && document.currentScript.src;
  var config = null;
  var sources = {};
  var modules = new Set();
  var nodes = new Set();
  var records = new Map();
  var detailIDs = new Set();
  var anchors = new Set(HOME_ANCHORS.concat(PMO_VIEWS));
  var memoryOptOut = false;
  var status = 'disabled';
  var ready = false;
  var pageviewSent = false;
  var pending = [];
  var startupPage = pageFor(window.location.pathname);

  CASE_IDS.forEach(function (id) { anchors.add(id); anchors.add(id + '-details'); });
  CAREER_IDS.forEach(function (id) { anchors.add('career-' + id); });

  // A storage failure is treated as opted out: an existing preference must not
  // become invisible simply because the browser denies access to localStorage.
  function privacyBlocked() {
    try {
      return memoryOptOut || navigator.doNotTrack === '1' || navigator.globalPrivacyControl === true ||
        window.localStorage.getItem(OPT_OUT_KEY) === '1' || Boolean(window.localStorage.getItem('umami.disabled'));
    } catch (_) { return true; }
  }

  function clearSources() {
    sources = {};
    try { window.sessionStorage.removeItem(SOURCE_KEY); } catch (_) { /* Optional storage. */ }
  }

  window.siteAnalytics = Object.freeze({
    isOptedOut: privacyBlocked,
    getStatus: function () { return privacyBlocked() ? 'opted-out' : status; },
    setOptOut: function (value) {
      if (typeof value !== 'boolean') return false;
      memoryOptOut = value;
      if (value) { pending = []; clearSources(); }
      try {
        if (value) window.localStorage.setItem(OPT_OUT_KEY, '1');
        else window.localStorage.removeItem(OPT_OUT_KEY);
        return true;
      } catch (_) { memoryOptOut = true; return false; }
    }
  });

  function pageFor(pathname) {
    if (pathname === BASE || pathname === BASE.slice(0, -1) || pathname === BASE + 'index.html') return 'homepage';
    if (pathname === BASE + 'pmo-system.html') return 'pmo';
    return null;
  }

  function sourceCode(value) {
    return typeof value === 'string' && /^[A-Za-z0-9_-]{1,40}$/.test(value) && /[A-Za-z]/.test(value) &&
      !/[0-9]{7,}/.test(value.replace(/[_-]/g, '')) ? value : null;
  }

  function sourceObject(value) {
    var clean = {};
    if (!value || typeof value !== 'object' || Array.isArray(value)) return clean;
    SOURCE_KEYS.forEach(function (key) {
      var code = sourceCode(value[key]);
      if (code) clean[key] = code;
    });
    return clean;
  }

  function loadSources() {
    var query = new URLSearchParams(window.location.search);
    var hasSource = SOURCE_KEYS.some(function (key) { return query.has(key); });
    var now = Date.now();
    if (hasSource) {
      SOURCE_KEYS.forEach(function (key) {
        // Multiple values are ambiguous and are deliberately discarded.
        var values = query.getAll(key);
        var code = values.length === 1 ? sourceCode(values[0]) : null;
        if (code) sources[key] = code;
      });
      try {
        window.sessionStorage.setItem(SOURCE_KEY, JSON.stringify({ origin: window.location.origin, expires: now + SOURCE_TTL, values: sources }));
      } catch (_) { /* Attribution still works on this page without storage. */ }
      return;
    }
    try {
      var cached = JSON.parse(window.sessionStorage.getItem(SOURCE_KEY) || 'null');
      if (cached && cached.origin === window.location.origin && Number.isFinite(cached.expires) &&
          cached.expires > now && cached.expires <= now + SOURCE_TTL) sources = sourceObject(cached.values);
      else window.sessionStorage.removeItem(SOURCE_KEY);
    } catch (_) { /* Invalid or unavailable attribution never blocks the page. */ }
  }

  function publicID(value) {
    return typeof value === 'string' && /^[A-Za-z][A-Za-z0-9_.-]{0,63}$/.test(value) && !/[0-9]{7,}/.test(value);
  }

  function readPublicPMOIDs() {
    if (startupPage !== 'pmo') return;
    try {
      var element = document.getElementById('system-data');
      if (!element) return;
      var data = JSON.parse(element.textContent);
      function addNode(node) {
        if (!node || !publicID(node.id)) return;
        nodes.add(node.id);
        anchors.add('node-' + node.id);
        if (Array.isArray(node.children)) node.children.forEach(addNode);
      }
      addNode(data.root);
      if (Array.isArray(data.modules)) data.modules.forEach(function (module) {
        if (!module || !publicID(module.id)) return;
        modules.add(module.id);
        anchors.add('module-' + module.id);
        addNode(module);
      });
      ['mechanisms', 'gates', 'roles', 'metrics', 'templates', 'rollout', 'gaps'].forEach(function (key) {
        if (!Array.isArray(data[key])) return;
        data[key].forEach(function (record) {
          if (!record || !publicID(record.id)) return;
          var view = key === 'gaps' ? 'evidence' : key;
          records.set(record.id, view);
          detailIDs.add('record-' + record.id);
          anchors.add('record-' + record.id);
          anchors.add(view + '/' + record.id);
        });
      });
      nodes.forEach(function (id) {
        detailIDs.add('node-' + id);
        anchors.add('mindmap/' + id);
      });
      modules.forEach(function (id) { anchors.add('module/' + id); });
    } catch (_) { /* Unknown structure produces no inferred module/detail IDs. */ }
  }

  function safeHash(value) {
    try {
      var decoded = decodeURIComponent(value.replace(/^#/, ''));
      return anchors.has(decoded) ? '#' + decoded : '';
    } catch (_) { return ''; }
  }

  function safeURL(value) {
    var page = pageFor(window.location.pathname);
    if (!page) return null;
    var hash = '';
    try { hash = safeHash(new URL(value || window.location.href, window.location.origin).hash); } catch (_) { /* Drop invalid URLs. */ }
    var query = new URLSearchParams();
    SOURCE_KEYS.forEach(function (key) { if (sources[key]) query.set(key, sources[key]); });
    var pathname = page === 'pmo' ? BASE + 'pmo-system.html' : BASE;
    return pathname + (query.toString() ? '?' + query.toString() : '') + hash;
  }

  function safeReferrer() {
    // Referrer paths, queries, fragments and user info can all contain PII.
    // Keep only a public HTTP(S) origin with a DNS hostname.
    try {
      if (!document.referrer) return '';
      var ref = new URL(document.referrer);
      if (ref.origin === window.location.origin) return '';
      if ((ref.protocol !== 'https:' && ref.protocol !== 'http:') || ref.username || ref.password ||
          !/^[A-Za-z0-9.-]+$/.test(ref.hostname) || !/[A-Za-z]/.test(ref.hostname)) return '';
      return ref.protocol + '//' + ref.hostname;
    } catch (_) { return ''; }
  }

  function cleanData(name, value) {
    var data = { page: pageFor(window.location.pathname) };
    SOURCE_KEYS.forEach(function (key) { if (sources[key]) data[key] = sources[key]; });
    value = value && typeof value === 'object' ? value : {};
    if (name === 'nav_click' && anchors.has(value.target)) data.target = value.target;
    else if (name === 'nav_click' && (value.target === 'homepage' || value.target === 'pmo')) data.target = value.target;
    else if (name === 'case_open' && CASE_IDS.indexOf(value.target) !== -1) data.target = value.target;
    else if (name === 'career_open' && CAREER_IDS.indexOf(value.target) !== -1) data.target = value.target;
    else if (name === 'pmo_module_select' && modules.has(value.target)) data.target = value.target;
    else if (name === 'pmo_details_open' && detailIDs.has(value.target)) data.target = value.target;
    if (name !== 'contact_mailto' && name !== 'contact_tel' && !data.target) return null;
    return data;
  }

  // Defense in depth for every Umami send, including unexpected default fields.
  // A new object, rather than {...payload}, ensures distinct IDs, text, screen
  // dimensions, session metadata, and arbitrary data never pass through.
  window.siteAnalyticsBeforeSend = function (type, payload) {
    if (type !== 'event' || !config || privacyBlocked() || window.location.hostname !== HOST || !pageFor(window.location.pathname)) return false;
    var url = safeURL(payload && payload.url);
    if (!url) return false;
    var result = {
      website: config.websiteId,
      hostname: HOST,
      url: url,
      title: pageFor(window.location.pathname) === 'pmo' ? 'PMO system' : 'Personal homepage',
      referrer: safeReferrer()
    };
    if (payload && payload.name) {
      if (EVENTS.indexOf(payload.name) === -1) return false;
      var data = cleanData(payload.name, payload.data);
      if (!data) return false;
      result.name = payload.name;
      result.data = data;
    }
    return result;
  };

  function send(payload) {
    try {
      var clean = window.siteAnalyticsBeforeSend('event', payload);
      if (!clean) return;
      var task = window.umami.track(clean);
      if (task && typeof task.catch === 'function') task.catch(function () {});
    } catch (_) { /* Analytics must never affect navigation or business code. */ }
  }

  function trackEvent(name, target) {
    if (!config || privacyBlocked()) return;
    var payload = { name: name, data: { target: target }, url: window.location.href };
    if (ready) send(payload);
    else if (pending.length < 30) pending.push(payload);
  }

  function onClick(event) {
    try {
      var target = event.target;
      if (!target || typeof target.closest !== 'function') return;
      if (startupPage === 'pmo') {
        var module = target.closest('[data-module], [data-node]');
        if (module) {
          var id = module.getAttribute('data-module') || module.getAttribute('data-node');
          if (modules.has(id)) trackEvent('pmo_module_select', id);
        }
      }
      var link = target.closest('a[href]');
      if (!link) return;
      var href = link.getAttribute('href') || '';
      if (/^mailto:/i.test(href)) { trackEvent('contact_mailto'); return; }
      if (/^tel:/i.test(href)) { trackEvent('contact_tel'); return; }
      // Module links have their own fixed event and must not count twice.
      if (startupPage === 'pmo' && link.hasAttribute('data-module')) return;
      var destination = new URL(href, window.location.href);
      if (destination.origin !== window.location.origin) return;
      var destinationPage = pageFor(destination.pathname);
      if (!destinationPage) return;
      var anchor = safeHash(destination.hash);
      if (destinationPage !== startupPage) trackEvent('nav_click', destinationPage);
      else if (anchor) trackEvent('nav_click', anchor.slice(1));
    } catch (_) { /* No preventDefault, stopPropagation, or onclick replacement. */ }
  }

  function onToggle(event) {
    try {
      var element = event.target;
      if (!element || element.tagName !== 'DETAILS' || !element.open) return;
      var id = element.id;
      if (startupPage === 'homepage') {
        if (id && id.endsWith('-details') && CASE_IDS.indexOf(id.slice(0, -8)) !== -1) trackEvent('case_open', id.slice(0, -8));
        else if (id && id.startsWith('career-') && CAREER_IDS.indexOf(id.slice(7)) !== -1) trackEvent('career_open', id.slice(7));
      } else if (detailIDs.has(id)) trackEvent('pmo_details_open', id);
    } catch (_) { /* Detail disclosure remains independent of statistics. */ }
  }

  function startTracker() {
    if (privacyBlocked()) { status = 'opted-out'; return; }
    var tracker = document.createElement('script');
    tracker.src = TRACKER;
    tracker.async = true;
    tracker.referrerPolicy = 'no-referrer';
    tracker.setAttribute('data-website-id', config.websiteId);
    tracker.setAttribute('data-domains', HOST);
    tracker.setAttribute('data-auto-track', 'false');
    tracker.setAttribute('data-auto-pageview', 'false');
    tracker.setAttribute('data-do-not-track', 'true');
    tracker.setAttribute('data-exclude-search', 'true');
    tracker.setAttribute('data-exclude-hash', 'true');
    tracker.setAttribute('data-before-send', 'siteAnalyticsBeforeSend');
    tracker.onload = function () {
      if (ready || privacyBlocked()) return;
      if (!window.umami || typeof window.umami.track !== 'function') { status = 'failed'; pending = []; return; }
      ready = true;
      status = 'ready';
      if (!pageviewSent) {
        pageviewSent = true;
        send({ url: window.location.href });
      }
      var events = pending;
      pending = [];
      events.forEach(send);
    };
    tracker.onerror = function () { status = 'failed'; pending = []; };
    document.addEventListener('click', onClick, { capture: true, passive: true });
    // toggle does not bubble; capture delegation also covers dynamically rendered details.
    document.addEventListener('toggle', onToggle, { capture: true, passive: true });
    document.head.appendChild(tracker);
  }

  if (window.location.hostname !== HOST || !startupPage || privacyBlocked()) return;
  try {
    var loader = new URL(scriptURL);
    if (loader.origin !== window.location.origin || loader.pathname !== BASE + 'site-analytics.js') return;
    status = 'loading';
    window.fetch(new URL('analytics-config.json', loader).href, {
      credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer'
    }).then(function (response) {
      if (!response.ok) throw new Error('Unavailable analytics configuration');
      return response.json();
    }).then(function (value) {
      if (!value || value.enabled !== true || typeof value.websiteId !== 'string' || !UUID.test(value.websiteId)) {
        status = 'disabled'; return;
      }
      if (privacyBlocked()) { status = 'opted-out'; return; }
      config = { websiteId: value.websiteId };
      loadSources();
      readPublicPMOIDs();
      startTracker();
    }).catch(function () { status = 'failed'; });
  } catch (_) { status = 'failed'; }
}());
