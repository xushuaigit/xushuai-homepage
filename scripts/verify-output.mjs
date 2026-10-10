import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import nextConfig, { pagesBasePath } from '../next.config.mjs';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const outputRoot = path.join(projectRoot, 'dist/client');
const pagesOrigin = 'https://xushuaigit.github.io';
assert.equal(
  nextConfig.basePath,
  '',
  'Static route rendering must use an empty basePath.',
);
assert.equal(
  nextConfig.assetPrefix,
  `${pagesOrigin}${pagesBasePath}`,
  'The asset prefix must match the configured GitHub Pages URL.',
);
const html = readFileSync(path.join(outputRoot, 'index.html'), 'utf8');
const visibleHtml = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/giu, '');

function decodeHtml(text) {
  const named = { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: ' ' };
  return text
    .replace(/&#(x[\da-f]+|\d+);/giu, (_, value) =>
      String.fromCodePoint(
        value[0].toLowerCase() === 'x'
          ? Number.parseInt(value.slice(1), 16)
          : Number.parseInt(value, 10),
      ),
    )
    .replace(/&(amp|quot|apos|lt|gt|nbsp);/gu, (_, name) => named[name]);
}

function normalizeText(text) {
  return decodeHtml(text).replace(/[\s，。、；：！？,.!?:;]/gu, '');
}

const visibleText = normalizeText(visibleHtml.replace(/<[^>]*>/gu, ''));
const displayedProperties = new Set([
  'name',
  'email',
  'phone',
  'careerIntroduction',
  'cooperation',
  'description',
  'title',
  'label',
  'organization',
  'period',
  'summary',
  'text',
  'problem',
  'contribution',
  'result',
  'education',
  'language',
]);
const requiredText = new Set();
const dataSource = ts.createSourceFile(
  'apple-homepage.ts',
  readFileSync(path.join(projectRoot, 'lib/apple-homepage.ts'), 'utf8'),
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TS,
);

function propertyName(node) {
  return ts.isIdentifier(node) || ts.isStringLiteral(node) ? node.text : '';
}

function collectDataText(node) {
  if (ts.isPropertyAssignment(node)) {
    const name = propertyName(node.name);
    if (displayedProperties.has(name) && ts.isStringLiteral(node.initializer)) {
      requiredText.add(node.initializer.text);
    }
    if (
      name === 'certifications' &&
      ts.isArrayLiteralExpression(node.initializer)
    ) {
      for (const item of node.initializer.elements) {
        if (ts.isStringLiteral(item)) requiredText.add(item.text);
      }
    }
  }
  ts.forEachChild(node, collectDataText);
}

collectDataText(dataSource);
const pageSource = ts.createSourceFile(
  'page.tsx',
  readFileSync(path.join(projectRoot, 'app/page.tsx'), 'utf8'),
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX,
);

function collectSentenceText(node) {
  if (
    ts.isJsxAttribute(node) &&
    node.name.getText(pageSource) === 'text' &&
    node.initializer &&
    ts.isStringLiteral(node.initializer)
  ) {
    requiredText.add(node.initializer.text);
  }
  ts.forEachChild(node, collectSentenceText);
}

collectSentenceText(pageSource);
assert(
  requiredText.size >= 60,
  'The source content check found too few visible text fields.',
);
const missingText = [...requiredText].filter(
  (text) => !visibleText.includes(normalizeText(text)),
);
assert.equal(
  missingText.length,
  0,
  `Missing prerendered text: ${missingText.join('\n')}`,
);

const caseIds = [
  'enterprise-pmo',
  'retail-governance',
  'art-delivery',
  'staged-delivery',
  'ai-workflow',
];
const layerIds = ['foundation', 'workflow', 'delivery', 'ai'];
const careerIds = ['consultant', 'porsche', 'dingdong', 'aotu', 'dada'];
const elementCount = (tag, id) =>
  [...visibleHtml.matchAll(new RegExp(`<${tag}\\b[^>]*\\bid="${id}"`, 'gu'))]
    .length;

for (const id of caseIds) {
  assert.equal(elementCount('article', id), 1, `Expected one case: ${id}`);
  assert.equal(
    elementCount('details', `${id}-details`),
    1,
    `Expected one expandable case card: ${id}`,
  );
  const disclosure = visibleHtml.match(
    new RegExp(`<details\\b[^>]*\\bid="${id}-details"[^>]*>`, 'u'),
  )?.[0];
  assert(
    disclosure && !/\sopen(?:\s|=|>)/u.test(disclosure),
    `Case card should start collapsed: ${id}`,
  );
}
for (const id of layerIds)
  assert.equal(
    elementCount('section', `stories-${id}`),
    1,
    `Expected one layer: ${id}`,
  );
for (const id of careerIds)
  assert.equal(
    elementCount('details', `career-${id}`),
    1,
    `Expected one experience: ${id}`,
  );
assert.equal(
  [...visibleHtml.matchAll(/<details\b/gu)].length,
  10,
  'Expected five case cards and five native experience panels.',
);

const ids = [...visibleHtml.matchAll(/\bid="([^"]+)"/gu)].map(
  (match) => match[1],
);
assert.equal(new Set(ids).size, ids.length, 'Duplicate HTML IDs found.');
for (const [, href] of visibleHtml.matchAll(/\bhref="(#[^"]+)"/gu)) {
  assert(
    ids.includes(decodeHtml(href.slice(1))),
    `Missing anchor target: ${href}`,
  );
}
assert(
  !/\bhref="(?:\/demo|\/resume|\/studio|\/editorial)(?:[\/"?#])/u.test(
    visibleHtml,
  ),
  'An unpublished demo or archive link remains.',
);

function filesIn(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory() ? filesIn(fullPath) : [fullPath];
  });
}

const files = filesIn(outputRoot);
assert(
  existsSync(path.join(outputRoot, '404.html')),
  'Static 404.html is missing.',
);
const allowedHtml = new Set([
  'index.html',
  'pmo.html',
  'pmo-system.html',
  '404.html',
  '404/index.html',
]);
for (const file of files.filter((item) => item.endsWith('.html'))) {
  const relativePath = path
    .relative(outputRoot, file)
    .split(path.sep)
    .join('/');
  assert(
    allowedHtml.has(relativePath),
    `Unexpected exported page: ${relativePath}`,
  );
}
assert(
  !files.some((file) =>
    /(?:^|[\/\\])demo(?:[\/\\]|$)/u.test(path.relative(outputRoot, file)),
  ),
  'The static artifact includes another demo.',
);

assert(
  !/href="\.\/pmo\.html"/u.test(visibleHtml),
  'The homepage must only link to the latest PMO system.',
);
assert(/href="\.\/pmo-system\.html"/u.test(visibleHtml), 'The complete PMO-system link is missing.');
const pmoSystemHtml = readFileSync(path.join(outputRoot, 'pmo-system.html'), 'utf8');
const pmoSystem = JSON.parse(pmoSystemHtml.match(/<script id="system-data" type="application\/json">([\s\S]*?)<\/script>/u)?.[1] || 'null');
assert.equal(pmoSystem?.modules?.length, 10, 'Expected ten complete-system modules.');
const systemNodes = [];
function visitSystem(node) { systemNodes.push(node); node.children.forEach(visitSystem); }
visitSystem(pmoSystem.root);
assert.equal(systemNodes.length, 255);
assert.equal(new Set(systemNodes.map(n => n.id)).size, 255);
assert.equal(pmoSystem.mechanisms.length, 30);
assert.equal(pmoSystem.gates.length, 8);
assert.equal(pmoSystem.metrics.length, 19);
assert.equal(pmoSystem.templates.length, 28);
assert(pmoSystem.raci.every(row => row.A.length === 1));
assert(!/<header\b/u.test(pmoSystemHtml), 'The removed top header reappeared.');
assert(!/(?:(?<![a-z])[a-z]:[\\/]|file:\/\/|WorkBuddy|SOW|V5\.7|Claw)/iu.test(pmoSystemHtml), 'Private PMO-system source information remains.');
assert(!/<(?:script|link)\b[^>]*(?:src|href)="https?:/iu.test(pmoSystemHtml), 'The complete system has an external dependency.');
for (const name of ['pmo-system.json','pmo-system.md','pmo-system.xmind','pmo-system-backup.zip']) {
  assert(!existsSync(path.join(outputRoot, 'downloads/pmo-system', name)), 'The view-only site still publishes a download: ' + name);
}
assert(!/\bdownload\b|downloads\/|下载|createObjectURL|new Blob|window\.print/iu.test(pmoSystemHtml), 'The PMO page must only provide viewing.');
assert(/class="home-button" href="\.\/"/u.test(pmoSystemHtml), 'The PMO return button is missing.');
assert(!/<aside class="side">|<nav class="nav"/u.test(pmoSystemHtml), 'The removed sidebar returned.');
const viewSwitch = pmoSystemHtml.match(/<select id="view-switch"[^>]*>([\s\S]*?)<\/select>/u)?.[1] || '';
assert.equal([...viewSwitch.matchAll(/<option value=/gu)].length, 9, 'The compact view switch must reach every section.');
assert(/<details class="reading-help"><summary>阅读说明<\/summary>/u.test(pmoSystemHtml), 'Reading help must start collapsed.');
assert(/class="map-branch/u.test(pmoSystemHtml), 'The overview mindmap must contain connected branches.');
assert(existsSync(path.join(outputRoot, 'fonts/apple-demo-sans.woff2')), 'The PMO site font is missing.');
const pmoHtml = readFileSync(path.join(outputRoot, 'pmo.html'), 'utf8');
assert(!/pmoData|PMO 脑图|原版 PMO/u.test(pmoHtml), 'Legacy PMO content must be removed.');
assert(/http-equiv="refresh" content="0;url=\.\/pmo-system\.html"/u.test(pmoHtml), 'Legacy PMO URL must redirect to the latest system.');
assert(/location\.replace\('\.\/pmo-system\.html'\)/u.test(pmoHtml), 'The legacy URL JavaScript redirect is missing.');
assert(!/href="\.\/pmo\.html"|原版 PMO/u.test(pmoSystemHtml), 'The latest page must not link to the legacy PMO.');

function assertPublishedAsset(url, description) {
  const decoded = decodeHtml(url);
  const assetUrl = new URL(decoded, `${pagesOrigin}${pagesBasePath}/`);
  assert.equal(
    assetUrl.origin,
    pagesOrigin,
    `${description} must use the GitHub Pages host: ${decoded}`,
  );
  const pathname = decodeURIComponent(assetUrl.pathname);
  assert(
    pathname.startsWith(`${pagesBasePath}/`),
    `${description} has an incorrect deployment prefix: ${decoded}`,
  );
  const relativePath = pathname.slice(pagesBasePath.length).replace(/^\//u, '');
  const assetPath = path.resolve(outputRoot, relativePath);
  assert(
    assetPath.startsWith(`${outputRoot}${path.sep}`),
    `${description} leaves the static directory.`,
  );
  assert(
    existsSync(assetPath),
    `${description} file does not exist: ${relativePath}`,
  );
}

const cssFiles = files.filter((file) => file.endsWith('.css'));
assert(cssFiles.length > 0, 'Built CSS is missing.');
const stylesheetUrls = [...visibleHtml.matchAll(/<link\b[^>]*>/gu)]
  .filter((match) => /\brel="stylesheet"/u.test(match[0]))
  .map((match) => match[0].match(/\bhref="([^"]+)"/u)?.[1]);
assert(
  stylesheetUrls.length > 0,
  'The exported page does not load a stylesheet.',
);
for (const url of stylesheetUrls) {
  assert(url, 'A stylesheet link has no URL.');
  assertPublishedAsset(url, 'Stylesheet');
}
for (const [, url] of html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/gu)) {
  assertPublishedAsset(url, 'Client script');
}
const fontUrls = cssFiles.flatMap((file) =>
  [
    ...readFileSync(file, 'utf8').matchAll(
      /url\(\s*["']?([^\s"')]+\.woff2(?:\?[^\s"')]*)?)["']?\s*\)/gu,
    ),
  ].map((match) => match[1]),
);
assert(fontUrls.length > 0, 'The local WOFF2 font reference is missing.');
for (const url of fontUrls) assertPublishedAsset(url, 'WOFF2 font');

const faviconHref = [...visibleHtml.matchAll(/<link\b[^>]*>/gu)]
  .find((match) => /\brel="(?:shortcut )?icon"/u.test(match[0]))?.[0]
  .match(/\bhref="([^"]+)"/u)?.[1];
assert(faviconHref, 'The favicon metadata is missing.');
assertPublishedAsset(faviconHref, 'Favicon');
assert(
  existsSync(path.join(outputRoot, 'fonts/OFL.txt')),
  'The font license is missing.',
);

console.log(
  JSON.stringify(
    {
      status: 'passed',
      pagesBasePath,
      routeBasePath: nextConfig.basePath,
      assetOrigin: pagesOrigin,
      contentFields: requiredText.size,
      cases: caseIds.length,
      layers: layerIds.length,
      experiences: careerIds.length,
      cssFiles: cssFiles.length,
      fonts: fontUrls.length,
      favicon: true,
      static404: true,
      additionalDemos: false,
      mindMap: {
        branches: pmoSystem.modules.length,
        nodes: systemNodes.length,
        privateSources: false,
        legacyUrlRedirect: true,
        viewOnly: true,
      },
    },
    null,
    2,
  ),
);
