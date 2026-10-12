"""Independent check of the published synthetic example, not a scheduling engine.

Run: python audit.py
Standard library only; reads the input and two result files beside this script.
"""
import json
import math
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent
START = datetime.fromisoformat("2026-10-12T08:00:00")


def audit(root=ROOT):
    orders = {o["id"]: o for o in json.loads((root / "demo-input.json").read_text(encoding="utf-8"))["orders"]}
    result = {"scenario": "Synthetic example; not a customer deployment", "checks": 0, "rules": {}}

    def check(condition, message):
        if not condition:
            raise AssertionError(message)
        result["checks"] += 1

    for rule, expected in (("edd", ["A-URGENT", "B-SHORT", "C-MEDIUM"]), ("spt", ["B-SHORT", "C-MEDIUM", "A-URGENT"])):
        data = json.loads((root / f"schedule-{rule}.json").read_text(encoding="utf-8"))
        jobs = data["schedule"]["jobs"]
        check([j["order_id"] for j in jobs] == expected, f"{rule}: wrong sequence")
        check(len(jobs) == len(orders) and {j["order_id"] for j in jobs} == set(orders), f"{rule}: missing or duplicate order")
        previous = START
        flow, tardiness, completion = [], [], {}
        for job in jobs:
            order = orders[job["order_id"]]
            start, end = map(datetime.fromisoformat, (job["start"], job["end"]))
            due = datetime.fromisoformat(order["due_date"])
            ready = max(START, datetime.fromisoformat(order["release_date"]), datetime.fromisoformat(order["material_eta"]))
            hours = (end - start).total_seconds() / 3600
            check(start >= ready, f"{rule}/{order['id']}: before release or material arrival")
            check(start >= previous, f"{rule}/{order['id']}: overlapping line allocation")
            check(math.isfinite(hours) and hours > 0, f"{rule}/{order['id']}: nonpositive duration")
            check(math.isclose(hours, order["quantity"] * order["cycle_time_per_unit"], abs_tol=1e-9), f"{rule}/{order['id']}: duration differs from input")
            check(math.isclose(hours, job["duration_hours"], abs_tol=1e-9), f"{rule}/{order['id']}: reported duration differs")
            check(job["due_date"] == order["due_date"] and job["quantity"] == order["quantity"], f"{rule}/{order['id']}: input changed")
            check(job["setup_start"] is None and job["setup_end"] is None, f"{rule}: this example specifies zero setup")
            previous = end
            flow.append((end - max(START, datetime.fromisoformat(order["release_date"]))).total_seconds() / 3600)
            tardiness.append(max(0, (end - due).total_seconds() / 3600))
            completion[order["id"]] = end.isoformat()
        kpis = data["kpis"]
        independently_calculated = {
            "total_orders": len(jobs),
            "makespan_hours": (previous - START).total_seconds() / 3600,
            "on_time_delivery_pct": round(100 * sum(t == 0 for t in tardiness) / len(jobs), 1),
            "avg_tardiness_hours": round(sum(tardiness) / len(jobs), 1),
            "max_tardiness_hours": max(tardiness),
            "avg_flow_time_hours": round(sum(flow) / len(jobs), 1),
        }
        for key, value in independently_calculated.items():
            check(math.isclose(kpis[key], value, abs_tol=1e-9), f"{rule}: incorrect {key}")
        check(math.isclose(data["schedule"]["makespan_hours"], 7), f"{rule}: total processing should be seven hours")
        result["rules"][rule] = {**independently_calculated, "sequence": expected, "completion": completion, "tardy_orders": sum(t > 0 for t in tardiness)}
    check(result["rules"]["edd"]["max_tardiness_hours"] == 0, "EDD should have no late order in this input")
    check(result["rules"]["spt"]["max_tardiness_hours"] == 3, "SPT should finish A three hours late")
    check(result["rules"]["edd"]["completion"]["A-URGENT"] == orders["A-URGENT"]["due_date"], "EDD A has exactly zero delivery buffer")
    return result


if __name__ == "__main__":
    print(json.dumps(audit(), ensure_ascii=False, indent=2))
