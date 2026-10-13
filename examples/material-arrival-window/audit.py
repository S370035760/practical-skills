"""Independently check this fixed teaching example; not a scheduling engine."""
import json
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent
orders = json.loads((ROOT / 'orders.json').read_text(encoding='utf-8'))
lookup = {o['id']: o for o in orders}
base = datetime.fromisoformat('2026-10-12T08:00:00')
checks = []
def check(name, actual, expected):
    ok = abs(actual-expected) < 1e-6 if isinstance(expected, (int,float)) else actual == expected
    assert ok, (name, actual, expected)
    checks.append({'name': name, 'actual': actual, 'expected': expected, 'passed': True})
def hours(a,b):
    return (a-b).total_seconds()/3600
check('Unique order IDs',len(lookup),3)
check('Total processing hours',sum(o['quantity']*o['cycle_time_per_unit'] for o in orders),4.5)
result = {}
for alg,sequence,end_hour,span,window,idle,reported_flow,release_flow in [
    ('edd',['M-A','M-B','M-C'],15.5,4.5,7.5,3,3.2,37/6),
    ('spt',['M-B','M-C','M-A'],13,5,5,0.5,2.8,17/6)]:
    raw=json.loads((ROOT/f'schedule-{alg}.json').read_text(encoding='utf-8'))
    jobs=raw['schedule']['jobs']
    check(alg+' exact sequence',[j['order_id'] for j in jobs],sequence)
    check(alg+' order IDs',sorted(j['order_id'] for j in jobs),sorted(lookup))
    ends=[];starts=[];flows=[];busy=0;previous=base
    for j in jobs:
        o=lookup[j['order_id']]
        start=datetime.fromisoformat(j['start']);end=datetime.fromisoformat(j['end'])
        release=datetime.fromisoformat(o['release_date']);eta=datetime.fromisoformat(o['material_eta'])
        due=datetime.fromisoformat(o['due_date'])
        duration=o['quantity']*o['cycle_time_per_unit']
        check(alg+j['order_id']+' ready constraint',start>=max(base,release,eta),True)
        check(alg+j['order_id']+' nonoverlap',start>=previous,True)
        check(alg+j['order_id']+' duration',hours(end,start),duration)
        check(alg+j['order_id']+' recorded duration',j['duration_hours'],duration)
        check(alg+j['order_id']+' quantity',j['quantity'],o['quantity'])
        check(alg+j['order_id']+' on time',end<=due,True)
        check(alg+j['order_id']+' no modeled setup',o['setup_time'],0)
        if o['id']=='M-A':
            check(alg+' A starts 11',start.hour+start.minute/60,11)
            check(alg+' A zero due buffer',hours(due,end),0)
        starts.append(start);ends.append(end);flows.append(hours(end,release));busy+=duration;previous=end
    check(alg+' final clock',max(ends).hour+max(ends).minute/60,end_hour)
    check(alg+' first to last span',hours(max(ends),min(starts)),span)
    check(alg+' recorded span',raw['kpis']['makespan_hours'],span)
    check(alg+' common 08 window',hours(max(ends),base),window)
    check(alg+' total processing',busy,4.5)
    check(alg+' idle in common window',window-busy,idle)
    check(alg+' reported average flow',raw['kpis']['avg_flow_time_hours'],reported_flow)
    check(alg+' release based average flow',sum(flows)/len(flows),release_flow)
    result[alg]={'first_to_last_hours':span,'common_08_window_hours':window,'busy_hours':busy,'idle_hours':idle,'ends_at':max(ends).strftime('%H:%M'),'reported_avg_flow':reported_flow,'release_based_avg_flow':round(release_flow,4)}
check('Earlier finish in this example',result['edd']['common_08_window_hours']-result['spt']['common_08_window_hours'],2.5)
report={'ok':True,'checks':len(checks),'results':result,'tests':checks,'source_run_date':'2026-10-12','new_engine_run':False,'customer_data':False,'limits':'Fixed sample only. No proof of optimality, shifts, arbitrary inputs or all product algorithms.'}
(ROOT/'audit-result.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')

# Format only the observed intervals onto a common 08:00 to 16:00 axis.
parts=['<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="620" viewBox="0 0 1200 620">',
       '<rect width="1200" height="620" fill="#f5f8fc"/>',
       '<style>text{font-family:Microsoft YaHei,sans-serif;fill:#17324d;font-size:22px}.s{font-size:18px}.w{fill:white;font-weight:bold}</style>',
       '<text x="40" y="48" font-size="30" font-weight="bold">物料11点才到：把两张排程放回同一条时间轴</text>',
       '<text x="40" y="87" class="s">合成教学订单 · 2026-10-12原始输出复核 · 非客户改善或最优性证明</text>']
x0=195;scale=112
for hour in range(8,17):
    x=x0+(hour-8)*scale
    parts.append(f'<line x1="{x}" y1="132" x2="{x}" y2="370" stroke="#d3dfeb"/><text x="{x-26}" y="123" class="s">{hour:02}:00</text>')
colors={'M-A':'#c47c20','M-B':'#2563a6','M-C':'#14827c'}
for index,alg in enumerate(['edd','spt']):
    y=165+index*115
    parts.append(f'<text x="40" y="{y+36}" font-weight="bold">{alg.upper()}</text>')
    raw=json.loads((ROOT/f'schedule-{alg}.json').read_text(encoding='utf-8'))
    previous=base
    for j in raw['schedule']['jobs']:
        start=datetime.fromisoformat(j['start']);end=datetime.fromisoformat(j['end'])
        if start>previous:
            x=x0+hours(previous,base)*scale;w=hours(start,previous)*scale
            parts.append(f'<rect x="{x}" y="{y}" width="{w}" height="56" fill="#dce5ee"/>')
        x=x0+hours(start,base)*scale;w=hours(end,start)*scale
        parts.append(f'<rect x="{x}" y="{y}" width="{w}" height="56" rx="4" fill="{colors[j["order_id"]]}"/><text x="{x+10}" y="{y+36}" class="w">{j["order_id"][-1]}</text>')
        previous=end
    parts.append(f'<text x="{x0}" y="{y+85}" class="s">首作业至末作业 {result[alg]["first_to_last_hours"]}h｜08点至完工 {result[alg]["common_08_window_hours"]}h｜等待 {result[alg]["idle_hours"]}h</text>')
parts.extend(['<text x="40" y="433" font-size="27" font-weight="bold">加工同为4.5h，完工却相差2.5h；A两种方案都零缓冲。</text>',
              '<text x="40" y="480" class="s">灰色为等待；EDD从11点才开工，SPT从08点开工，不能只比报告的4.5h与5h。</text>',
              '<text x="40" y="522" class="s">单线、连续日历、无换型/休息/停机；结果只适用于附带输入与原工具实现。</text>',
              '<text x="40" y="566" class="s">LeanEdge 原创案例整理 · AI辅助 · 未修改排程引擎</text></svg>'])
(ROOT/'timeline.svg').write_text('\n'.join(parts),encoding='utf-8')
print(json.dumps({'ok':True,'checks':len(checks),'results':result},ensure_ascii=False))
