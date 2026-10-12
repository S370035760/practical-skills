// LeanEdge original teaching companion. No network, model calls or dependencies.
'use strict';
const fs = require('node:fs');

function analyze(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('INPUT_ERROR: expected a JSON object');
  }
  if ('error' in input) throw new Error('API_ERROR: inspect the original response locally');
  if (input.done !== true) throw new Error('INPUT_ERROR: done must be true; use final response');
  const fields = ['total_duration','load_duration','prompt_eval_duration','eval_count','eval_duration'];
  for (const field of fields) {
    if (!Number.isSafeInteger(input[field]) || input[field] < 0) {
      throw new Error('INPUT_ERROR: '+field+' must be a non-negative safe integer');
    }
  }
  const phases = [
    ['load',input.load_duration],
    ['prompt',input.prompt_eval_duration],
    ['generate',input.eval_duration],
  ];
  const sum = phases.reduce((n,p) => n+BigInt(p[1]), 0n);
  const remainder = BigInt(input.total_duration)-sum;
  const warnings = [];
  if (input.eval_duration === 0) warnings.push('NO_GENERATION_DURATION');
  if (remainder < 0n) warnings.push('PHASE_SUM_EXCEEDS_TOTAL');
  if (input.done_reason === 'length') warnings.push('OUTPUT_STOPPED_AT_LENGTH');
  const max = Math.max(...phases.map(p=>p[1]));
  return {
    seconds: {
      total: input.total_duration/1e9,
      load: input.load_duration/1e9,
      prompt: input.prompt_eval_duration/1e9,
      generate: input.eval_duration/1e9,
      unassigned: remainder < 0n ? null : Number(remainder)/1e9,
    },
    output_tokens: input.eval_count,
    output_tokens_per_second: input.eval_duration > 0 ? input.eval_count/(input.eval_duration/1e9) : null,
    largest_recorded_phases: max > 0 ? phases.filter(p=>p[1]===max).map(p=>p[0]) : [],
    warnings,
  };
}
module.exports = { analyze };

if (require.main === module) {
  try {
    const args = process.argv.slice(2);
    if (args.length > 1) throw new Error('USAGE: node timing.cjs [response.json]');
    let text;
    try { text = fs.readFileSync(args.length ? args[0] : 0, 'utf8').replace(/^\uFEFF/, ''); }
    catch { throw new Error('INPUT_ERROR: cannot read input'); }
    let input;
    try { input = JSON.parse(text); }
    catch { throw new Error('INPUT_ERROR: invalid JSON; use stream:false, not NDJSON'); }
    if (Array.isArray(input) && input.length === 0) throw new Error('INPUT_ERROR: empty array');
    const result = Array.isArray(input) ? input.map(analyze) : analyze(input);
    process.stdout.write(JSON.stringify(result, null, 2)+'\n');
  } catch (e) {
    process.stderr.write(e.message+'\n');
    process.exitCode = 1;
  }
}
