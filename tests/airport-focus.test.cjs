const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const path = require('node:path');

function setup() {
  const sources = new Map();
  const cameraCalls = [], fitCalls = [];
  const viewer = {
    dataSources: {
      getByName: name => sources.has(name) ? [sources.get(name)] : [],
      add: source => { sources.set(source.name, source); return Promise.resolve(source); },
      remove: source => sources.delete(source.name),
    },
    camera: { cancelFlight() {}, flyToBoundingSphere: (sphere, options) => cameraCalls.push({ sphere, options }) },
    flyTo: (source, options) => { fitCalls.push({ source, options }); },
    isDestroyed: () => false,
  };
  const cesium = {
    CustomDataSource: class {
      constructor(name) { this.name = name; this.items = []; this.entities = { add: item => this.items.push(item) }; }
    },
    Cartesian3: { fromDegrees: (lon, lat, height) => ({ lon, lat, height }) },
    Cartesian2: class { constructor(x, y) { this.x = x; this.y = y; } },
    HeadingPitchRange: class { constructor(heading, pitch, range) { Object.assign(this, { heading, pitch, range }); } },
    BoundingSphere: class {
      constructor(center, radius) { Object.assign(this, { center, radius }); }
      static fromPoints() { return { radius: 100 }; }
    },
    HeightReference: { CLAMP_TO_GROUND: 1 },
    Color: { WHITE: 'white', BLACK: { withAlpha: () => 'black' } },
  };
  let fetchImpl;
  const sandbox = { exports: {}, Promise, Map, AbortController,
    require: name => name === 'vue' ? { ref: value => ({ value }) }
      : name.includes('mapService') ? { getViewer: () => viewer }
      : name.includes('/auth') ? { getToken: () => 'platform-test-token' }
      : { default: name },
    fetch: (...args) => fetchImpl(...args), Cesium: cesium,
  };
  const source = fs.readFileSync(path.join(__dirname, '../src/services/airportFocus.ts'), 'utf8');
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, sandbox);
  return { api: sandbox.exports, viewer, cesium, cameraCalls, fitCalls, sources, fetch: impl => { fetchImpl = impl; } };
}

const airport = (sn, status) => ({ deviceSn: sn, name: '同名机场', longitude: 113.9, latitude: 29.7, onlineStatus: status });

test('homonyms keep separate status icons and fit all markers; coincident points spread', async () => {
  const s = setup();
  s.api.renderAirportFocus(s.viewer, s.cesium, [airport('online', 1), airport('offline', 0)]);
  await Promise.resolve();
  const markers = [...s.sources.values()][0].items;
  assert.equal(markers.length, 2);
  assert.notEqual(markers[0].billboard.image, markers[1].billboard.image);
  assert.notEqual(markers[0].billboard.pixelOffset.x, markers[1].billboard.pixelOffset.x);
  assert.match(markers[0].label.text, /在线/);
  assert.match(markers[1].label.text, /离线/);
  assert.equal(s.fitCalls.length, 1);
  assert.equal(s.cameraCalls.length, 0);
});

test('unique airport flies to its coordinates; clearing removes only own overlay', async () => {
  const s = setup();
  s.sources.set('other-layer', { name: 'other-layer' });
  s.api.renderAirportFocus(s.viewer, s.cesium, [airport('one', 1)]);
  await Promise.resolve();
  assert.equal(s.cameraCalls[0].sphere.center.lon, 113.9);
  assert.equal(s.cameraCalls[0].sphere.center.lat, 29.7);
  assert.equal(s.cameraCalls[0].options.offset.range, 5000);
  s.api.clearAirportFocus();
  assert.equal(s.sources.size, 1);
  assert.equal(s.sources.has('other-layer'), true);
});

test('late cleared rendering does not move the camera', async () => {
  const s = setup();
  s.api.renderAirportFocus(s.viewer, s.cesium, [airport('one', 1)]);
  s.api.clearAirportFocus();
  await Promise.resolve();
  assert.equal(s.cameraCalls.length, 0);
});

test('structured device references exclude route and recognition candidates', () => {
  const s = setup();
  assert.equal(s.api.airportReferences({ clarification: { missing_fields: ['routeId'], lowAltitude: { candidates: [{ id: 'route-id', name: 'route' }] } } }).length, 0);
  const data = s.api.airportReferences({ clarification: { lowAltitude: { args: { deviceName: '机场', deviceSn: 'one' } } } });
  assert.equal(data[0].deviceSn, 'one');
});

test('stale resolution cannot replace newer conversation focus', async () => {
  const s = setup();
  let finishOld;
  s.fetch(() => new Promise(resolve => { finishOld = resolve; }));
  const old = s.api.focusConversationAirports('old', {}, async () => {});
  s.fetch(async () => ({ ok: true, json: async () => ({ airports: [airport('new', 1)], unlocated: [] }) }));
  await s.api.focusConversationAirports('new', {}, async () => {});
  finishOld({ ok: true, json: async () => ({ airports: [airport('old', 0)], unlocated: [] }) });
  await old;
  assert.equal(s.api.airportFocusState.value.airports[0].deviceSn, 'new');
});

test('verified location answer and map consume the same facts without a second lookup', async () => {
  const s = setup();
  s.fetch(() => assert.fail('verified facts must not be replaced by another lookup'));
  await s.api.focusConversationAirports('科信局机场在哪里', { content: [
    { metadata: { airportFocus: { airports: [airport('science', 1)], unlocated: [] } } },
  ] }, async () => {});
  assert.equal(s.api.airportFocusState.value.airports[0].deviceSn, 'science');
});

test('camera target uses terrain height so the ground airport remains centered', async () => {
  const s = setup();
  s.cesium.Cartographic = { fromDegrees: (lon, lat) => ({ lon, lat }) };
  s.viewer.scene = { globe: { getHeight: () => 120 } };
  s.api.renderAirportFocus(s.viewer, s.cesium, [airport('one', 1)]);
  await Promise.resolve();
  assert.equal(s.cameraCalls[0].sphere.center.height, 120);
});
