"""Independent quantity/time audit of the original teaching example."""
import json
from datetime import datetime
from decimal import Decimal
from pathlib import Path

root=Path(__file__).resolve().parent
d=json.loads((root/'example.json').read_text(encoding='utf-8'))
parse=datetime.fromisoformat
t0,t1,t2=map(parse,[d['snapshot_time'],d['cutoff_time'],d['count_time']])
checks=0
def check(condition,message):
    global checks
    assert condition,message
    checks+=1
check(t0<t1<=t2,'Wrong time order')
check(len({m['id'] for m in d['movements']})==3,'Duplicate movement')
for m in d['movements']:
    check(t0<parse(m['event_time'])<=t2,'Movement outside reconstruction window')
    check(m['scope_id']==d['scope_id'],'Scope mismatch')
    check(m['evidence']=='已核' and m['document'],'Missing evidence')
    check(m['in']>=0 and m['out']>=0 and not(m['in'] and m['out']),'Invalid direction/quantity')
pre=[m for m in d['movements'] if parse(m['event_time'])<=t1]
post=[m for m in d['movements'] if parse(m['event_time'])>t1]
qty=lambda ms,key:sum(Decimal(str(m[key])) for m in ms)
before=d['opening_quantity']+qty(pre,'in')-qty(pre,'out')
physical=d['observed_quantity']-qty(post,'in')+qty(post,'out')
actual={'pre_in':qty(pre,'in'),'pre_out':qty(pre,'out'),'book_at_cutoff':before,'post_in':qty(post,'in'),'post_out':qty(post,'out'),'physical_at_cutoff':physical,'difference':physical-before,'wrong_old_snapshot_difference':physical-d['opening_quantity'],'book_at_count':before+qty(post,'in')-qty(post,'out'),'difference_at_count':Decimal(d['observed_quantity'])-(before+qty(post,'in')-qty(post,'out'))}
for key,value in actual.items():check(value==d['expected'][key],key)
check(actual['difference']==actual['difference_at_count'],'Bridge not conserved')
check(actual['difference']<0<actual['wrong_old_snapshot_difference'],'Example must demonstrate sign reversal')
report={'ok':True,'checks':checks,'values':{k:float(v) for k,v in actual.items()},'scope':d['scope'],'financial_posting_performed':False}
(root/'example-check.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(report,ensure_ascii=False))
