const seen = new Set();
return $input.all().map(({json}) => {
  const x = {...json};
  const keys = ['request_id', 'contact', 'need'];
  const missing = keys.filter(k =>
    typeof x[k] !== 'string' || !x[k].trim());
  const id = typeof x.request_id === 'string'
    ? x.request_id.trim() : '';
  const duplicate = id && seen.has(id);
  if (id && !missing.length) seen.add(id);
  return {json: {...x,
    route: missing.length ? 'FIX'
      : duplicate ? 'HOLD' : 'REVIEW',
    reason: missing.length ? missing.join(',')
      : duplicate ? 'duplicate_in_batch' : ''}};
});
