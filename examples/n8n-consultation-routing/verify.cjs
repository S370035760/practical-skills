// Local harness for the article's unchanged Code-node snippet, not an n8n runtime.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const snippet = fs.readFileSync(path.join(__dirname, 'code-node.js'), 'utf8');
const run = new Function('$input', snippet);
const route = rows => run({all: () => rows.map(json => ({json}))});
const valid = id => ({request_id: id, contact: 'demo-contact', need: 'demo-need'});
const checks = [];
function test(name, fn) { fn(); checks.push({name, status: 'PASS'}); }

test('complete request becomes REVIEW and JSON fields are preserved', () => {
  const input = {...valid('ok'), custom_field: 'keep-me'};
  assert.deepEqual(route([input]), [{json: {...input, route: 'REVIEW', reason: ''}}]);
});
test('missing contact becomes FIX', () => {
  const [item] = route([{request_id: 'missing', need: 'demo-need'}]);
  assert.equal(item.json.route, 'FIX');
  assert.equal(item.json.reason, 'contact');
});
test('same batch duplicate becomes HOLD', () => {
  const out = route([valid('same'), valid('same')]);
  assert.deepEqual(out.map(x => x.json.route), ['REVIEW', 'HOLD']);
  assert.equal(out[1].json.reason, 'duplicate_in_batch');
});
test('blank ID becomes FIX', () => {
  assert.equal(route([valid(' ')])[0].json.reason, 'request_id');
});
test('numeric contact is not accepted as a nonempty string', () => {
  assert.equal(route([{...valid('number'), contact: 123}])[0].json.reason, 'contact');
});
test('ID surrounding whitespace is ignored for duplicate comparison', () => {
  assert.deepEqual(route([valid('trim'), valid(' trim ')]).map(x => x.json.route), ['REVIEW', 'HOLD']);
});
test('incomplete first item does not reserve ID against later complete item', () => {
  assert.deepEqual(route([{request_id: 'retry', need: 'n'}, valid('retry')]).map(x => x.json.route), ['FIX', 'REVIEW']);
});
test('separate executions do not share the in-memory Set', () => {
  assert.equal(route([valid('again')])[0].json.route, 'REVIEW');
  assert.equal(route([valid('again')])[0].json.route, 'REVIEW');
});
test('downloadable fixture matches the complete expected output', () => {
  const input = JSON.parse(fs.readFileSync(path.join(__dirname, 'sample-input.json'), 'utf8'));
  const expected = JSON.parse(fs.readFileSync(path.join(__dirname, 'expected-output.json'), 'utf8'));
  const before = JSON.stringify(input);
  assert.deepEqual(run({all: () => input}), expected);
  assert.equal(JSON.stringify(input), before);
});

console.log(JSON.stringify({status: 'PASS', scenarios: checks.length, checks,
  fixture_routes: ['REVIEW', 'FIX', 'HOLD', 'FIX'],
  boundary: 'Pure JavaScript harness only; no n8n runtime, delivery, persistent deduplication or model call'}, null, 2));
