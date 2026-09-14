"""Read-only audit of the thesis evidence; writes only paper-merged/analysis/outputs.

Origin: paper-astra/analysis/audit_evidence.py (independent audit), extended for the
merged manuscript with per-status context-preservation medians and per-intervention
sweep medians. Run from any directory with Python 3.10+; standard library only.
No prior paper draft, pickle cache, model artifact, or application is executed.
The cohort is explicitly the two context-preservation folders. Root-level
exports are classified by schema and analysed separately by session ID.
"""
from __future__ import annotations

import csv
import copy
import hashlib
import json
import statistics as st
import subprocess
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).resolve().parent / "outputs"
DATA = ROOT / "Experiments/data"
CONDITIONS = {"with": "with-context-preservation", "without": "without-context-preservation"}


def read(path):
    return json.loads(path.read_bytes())


def quantile(values, q):
    xs = sorted(v for v in values if v is not None)
    if not xs:
        return None
    pos = (len(xs) - 1) * q
    lo = int(pos)
    hi = min(lo + 1, len(xs) - 1)
    return xs[lo] + (xs[hi] - xs[lo]) * (pos - lo)


def mean(values):
    xs = [v for v in values if v is not None]
    return st.mean(xs) if xs else None


def stats(values):
    xs = [v for v in values if v is not None]
    return {"n": len(xs), "p50": quantile(xs, .5), "p95": quantile(xs, .95),
            "p99": quantile(xs, .99), "max": max(xs) if xs else None,
            "over_100ms_n": sum(v > 100 for v in xs)}


def duplicates(values):
    return len(values) - len(set(values))


def save_csv(name, rows):
    if not rows:
        return
    with (OUT / name).open("w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)


def post_events(doc, participant, condition, window=5):
    """Match _lib.compute_post_intervention: start time, adjacent-event caps.

    Missing forward movements remain None, never zero. These reproduce the
    existing descriptive estimator, without treating interventions as people.
    """
    interventions = sorted((e["intervention"] for e in doc["interventions"]["interventionEvents"]),
                           key=lambda x: x["appliedAtUnixMs"])
    sacs = []
    for e in doc["derived"]["saccadeEvents"]:
        s = e["saccade"]
        t = s.get("startedAtUnixMs")
        if t is None:
            t = e.get("occurredAtUnixMs")
        if t is not None:
            sacs.append((t, s))
    times = [i["appliedAtUnixMs"] for i in interventions]
    rows = []
    for iv in interventions:
        t = iv["appliedAtUnixMs"]
        nxt = min((u for u in times if u > t), default=float("inf"))
        prv = max((u for u in times if u < t), default=float("-inf"))
        pre = [s for u, s in sacs if max(t-window*1000, prv) < u <= t]
        post = [s for u, s in sacs if t < u <= min(t+window*1000, nxt)]
        forward = [u for u, s in sacs if t < u <= min(t+30000, nxt)
                   and s["direction"] in {"forward", "line-change-forward"}]
        pre_rate = mean([int(s["isRegression"]) for s in pre])
        post_rate = mean([int(s["isRegression"]) for s in post])
        rows.append({"participant": participant, "condition": condition,
                     "intervention_index": len(rows)+1, "module": iv["moduleId"],
                     "rrt_ms": min(forward)-t if forward else None,
                     "pre_n": len(pre), "post_n": len(post),
                     "post_regressions": sum(s["isRegression"] for s in post),
                     "pre_rate": pre_rate, "post_rate": post_rate,
                     "delta": post_rate-pre_rate if pre_rate is not None and post_rate is not None else None})
    return rows


def behavioural_summary(rows):
    return {"interventions": len(rows), "rrt_observed": sum(r["rrt_ms"] is not None for r in rows),
            "rrt_missing": sum(r["rrt_ms"] is None for r in rows),
            "rrt_median_ms": quantile([r["rrt_ms"] for r in rows], .5),
            "rrt_mean_ms": mean([r["rrt_ms"] for r in rows]),
            "pre_rate_observed": sum(r["pre_rate"] is not None for r in rows),
            "post_rate_observed": sum(r["post_rate"] is not None for r in rows),
            "pre_rate_event_mean": mean([r["pre_rate"] for r in rows]),
            "post_rate_event_mean": mean([r["post_rate"] for r in rows]),
            "delta_event_mean": mean([r["delta"] for r in rows])}


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    # Freeze cohort membership before labelling; extra advisory files cannot shift it.
    files = {c: sorted((DATA / folder).glob(f"*-{c}.json")) for c, folder in CONDITIONS.items()}
    names = sorted({p.stem.removesuffix(f"-{c}") for c, ps in files.items() for p in ps})
    aliases = {name: f"P{i+1}" for i, name in enumerate(names)}
    sessions, events, cp_events, integrity, inputs = [], [], [], [], []
    cohort_rtt, docs, hashes = defaultdict(list), [], set()
    session_order = defaultdict(list)

    def input_hash(path, label):
        inputs.append({"source_label": label, "sha256": hashlib.sha256(path.read_bytes()).hexdigest()})

    for condition, paths in files.items():
        for path in paths:
            name = path.stem.removesuffix(f"-{condition}")
            pid = aliases[name]
            doc = read(path)
            assert doc["manifest"]["schema"] == "rtr.experiment-export"
            assert doc["manifest"]["version"] == 7
            exp, derived = doc["experiment"], doc["derived"]
            telemetry_path = path.parent / "telemetry" / f"{name}.json"
            tel = read(telemetry_path)
            assert tel["manifest"]["schema"] == "rtr.experiment-telemetry"
            assert tel["sessionId"] == exp["sessionId"]
            assert tel["startedAtUnixMs"] == exp["startedAtUnixMs"]
            assert tel["endedAtUnixMs"] == exp["endedAtUnixMs"]
            input_hash(path, f"{pid}/{condition}/session")
            input_hash(telemetry_path, f"{pid}/{condition}/telemetry")
            gaze = doc["sensing"]["gazeSamples"]
            ts = [g["deviceTimeStampUs"] for g in gaze if g.get("deviceTimeStampUs")]
            hz = (len(ts)-1) / ((ts[-1]-ts[0])/1e6)
            valid = sum(any(g.get(side, {}).get("gazePoint2D", {}).get("validity") == "Valid"
                            for side in ["left", "right"]) for g in gaze)
            ivs = [e["intervention"] for e in doc["interventions"]["interventionEvents"]]
            props = doc["interventions"].get("decisionProposals", [])
            cps = [e["contextPreservation"] for e in derived["contextPreservationEvents"]]
            row = {"participant": pid, "condition": condition, "duration_s": exp["durationMs"]/1000,
                   "text_title": doc["content"]["title"],
                   "gaze_samples": len(gaze), "hz": hz, "validity_pct": 100*valid/len(gaze),
                   "fixations": len(derived["fixationEvents"]), "saccades": len(derived["saccadeEvents"]),
                   "interventions": len(ivs), "context_events": len(cps),
                   "provider_metadata": exp["condition"]["providerId"],
                   "manual_interventions": sum(i.get("source") == "manual" for i in ivs),
                   "proposal_records": len(props),
                   "calibration_pass": exp["calibration"]["validationPassed"],
                   "accuracy_deg": exp["calibration"]["averageAccuracyDegrees"],
                   "precision_deg": exp["calibration"]["averagePrecisionDegrees"],
                   "boundaries": dict(Counter(i.get("appliedBoundary") for i in ivs)),
                   "module_counts": dict(Counter(i["moduleId"] for i in ivs)),
                   "quiz_answers": len(doc.get("quiz", {}).get("answers", []))}
            sessions.append(row)
            session_order[pid].append((exp["startedAtUnixMs"],condition))
            # Absolute dates and participant fields are intentionally absent from outputs.
            integrity.append({"participant": pid, "condition": condition,
                "duplicate_gaze_timestamps": duplicates(ts),
                "nonincreasing_gaze_timestamps": sum(b <= a for a,b in zip(ts,ts[1:])),
                "duplicate_gaze_sequence": duplicates([g["sequenceNumber"] for g in gaze]),
                "duplicate_intervention_ids": duplicates([i["id"] for i in ivs]),
                "duplicate_fixation_payloads": duplicates([json.dumps(e["fixation"],sort_keys=True) for e in derived["fixationEvents"]]),
                "duplicate_saccade_payloads": duplicates([json.dumps(e["saccade"],sort_keys=True) for e in derived["saccadeEvents"]]),
                "context_unmatched_intervention_time": sum(cp["interventionAppliedAtUnixMs"] not in {i["appliedAtUnixMs"] for i in ivs} for cp in cps),
                "telemetry_session_and_times_match": True})
            for s in tel["samples"]:
                if s.get("rttMs") is not None:
                    cohort_rtt[s["role"]].append(s["rttMs"])
            events.extend(post_events(doc,pid,condition))
            cp_events.extend(cps)
            docs.append((doc,pid,condition))
            hashes.add(doc["content"].get("contentHash"))

    behaviour = {c: behavioural_summary([r for r in events if r["condition"] == c]) for c in CONDITIONS}
    participant_results = [{"participant": pid,"condition": c,
                            **behavioural_summary([r for r in events if r["participant"] == pid and r["condition"] == c])}
                           for pid in aliases.values() for c in CONDITIONS]
    sensitivity = []
    for window in [3,5,10]:
        rs = [r for doc,pid,c in docs for r in post_events(doc,pid,c,window)]
        sensitivity.extend({"window_s": window,"condition": c,
                            **behavioural_summary([r for r in rs if r["condition"] == c])} for c in CONDITIONS)

    # Sensitivity only: exact payload deduplication is not a validated event-identity policy.
    dedup_events = []
    for doc,pid,c in docs:
        candidate = copy.deepcopy(doc)
        seen = set(); unique = []
        for event in candidate["derived"]["saccadeEvents"]:
            key = json.dumps(event["saccade"],sort_keys=True)
            if key not in seen:
                seen.add(key); unique.append(event)
        candidate["derived"]["saccadeEvents"] = unique
        dedup_events.extend(post_events(candidate,pid,c))
    dedup_sensitivity = {c:behavioural_summary([r for r in dedup_events if r["condition"]==c]) for c in CONDITIONS}

    # Verify agreement with committed thesis outputs, without using those as input data.
    with (ROOT / "Experiments/analysis/outputs/tables/post_intervention_summary.csv").open() as f:
        for r in csv.DictReader(f):
            actual = behaviour[r["condition"]]
            for a,b in [("rrt_median_ms","rrt_median_ms"),("rrt_mean_ms","rrt_mean_ms"),
                        ("pre_reg_rate","pre_rate_event_mean"),("post_reg_rate","post_rate_event_mean")]:
                assert abs(float(r[a])-actual[b]) < 1e-8, (a, r, actual)

    # Context-preservation outcomes of the original restore, by graded status.
    context_by_status = {}
    for status in sorted({cp["status"] for cp in cp_events}):
        group = [cp for cp in cp_events if cp["status"] == status]
        context_by_status[status] = {
            "n": len(group),
            "anchor_error_median_px": quantile([cp.get("anchorErrorPx") for cp in group], .5),
            "viewport_delta_median_px": quantile([cp.get("viewportDeltaPx") for cp in group], .5),
            "commit_boundaries": dict(Counter(cp.get("commitBoundary") for cp in group))}

    extras = [p for p in sorted(DATA.glob("*.json"))]
    extra_docs = [(p,read(p)) for p in extras]
    advisory = []
    for path,doc in extra_docs:
        if doc.get("manifest",{}).get("schema") != "rtr.experiment-export":
            continue
        exp = doc["experiment"]
        tp,tel = next((p,d) for p,d in extra_docs if d.get("manifest",{}).get("schema") == "rtr.experiment-telemetry"
                      and d.get("sessionId") == exp["sessionId"])
        input_hash(path,"advisory/session"); input_hash(tp,"advisory/telemetry")
        grouped = defaultdict(list)
        for sample in tel["samples"]:
            if sample.get("rttMs") is not None:
                grouped[sample["role"]].append(sample["rttMs"])
        advisory.append({"duration_s": exp["durationMs"]/1000,"condition": exp["condition"],
                         "gaze_samples": len(doc["sensing"]["gazeSamples"]),
                         "interventions": len(doc["interventions"]["interventionEvents"]),
                         "decision_proposal_records": len(doc["interventions"].get("decisionProposals",[])),
                         "unique_proposal_ids": len({e["proposal"]["proposalId"] for e in doc["interventions"].get("decisionProposals",[])}),
                         "proposal_record_statuses":dict(Counter(e["proposal"]["status"] for e in doc["interventions"].get("decisionProposals",[]))),
                         "latency": {k:stats(v) for k,v in grouped.items()}})

    sweep, sweep_rows = {}, {}
    for version in ["original","revised"]:
        path = ROOT / f"Frontend/experiments/context-displacement/results/onoff-{version}-raw.json"
        doc = read(path); rows = doc["rows"]
        input_hash(path,f"sweep/{version}")
        pair = [r for r in rows if r["offDisplacementPx"] is not None and r["onDisplacementPx"] is not None]
        sweep_rows[version] = {(r["intervention"],r["pageIndex"]):r for r in rows}
        assert len(sweep_rows[version]) == len(rows)
        per_intervention = []
        for label in dict.fromkeys(r["intervention"] for r in rows):
            group = [r for r in rows if r["intervention"] == label]
            per_intervention.append({
                "intervention": label,
                "off_median_px": quantile([r["offDisplacementPx"] for r in group], .5),
                "off_n": sum(r["offDisplacementPx"] is not None for r in group),
                "on_median_px": quantile([r["onDisplacementPx"] for r in group], .5),
                "on_n": sum(r["onDisplacementPx"] is not None for r in group)})
        sweep[version] = {"scheduled_trials": len(rows),"measurable_pairs": len(pair),
                          "missing_pairs": len(rows)-len(pair),
                          "off_observed": sum(r["offDisplacementPx"] is not None for r in rows),
                          "on_observed": sum(r["onDisplacementPx"] is not None for r in rows),
                          "off_median_px": quantile([r["offDisplacementPx"] for r in rows],.5),
                          "on_median_px": quantile([r["onDisplacementPx"] for r in rows],.5),
                          "over_reposition_n": sum(r["onDisplacementPx"] > r["offDisplacementPx"]+1 for r in pair),
                          "threshold_px": 1,
                          "per_intervention": per_intervention,
                          "missing_rows": [{k:r[k] for k in ["intervention","pageIndex","offDisplacementPx","onDisplacementPx"]}
                                           for r in rows if r["offDisplacementPx"] is None or r["onDisplacementPx"] is None]}
    same_keys = set(sweep_rows["original"]) & set(sweep_rows["revised"])
    comparisons = [(sweep_rows["original"][k],sweep_rows["revised"][k]) for k in same_keys]
    sweep["cross_version"] = {"same_trial_keys":len(same_keys),
        "anchor_id_differences":sum(a["anchorTokenId"]!=b["anchorTokenId"] for a,b in comparisons),
        "off_displacement_diff_over_1px":sum(a["offDisplacementPx"] is not None and b["offDisplacementPx"] is not None
                 and abs(a["offDisplacementPx"]-b["offDisplacementPx"])>1 for a,b in comparisons)}

    # Demonstrate the loader discovery issue without importing pandas or executing caches.
    invalid_for_legacy_loader = sum(read(p).get("manifest",{}).get("schema") != "rtr.experiment-export" for p in extras)
    result = {"review_commit": subprocess.check_output(["git","rev-parse","HEAD"],cwd=ROOT,text=True).strip(),
              "cohort": {"participants":len(names),"sessions":len(sessions),
                         "distinct_content_hashes":len(hashes),"gaze_samples":sum(r["gaze_samples"] for r in sessions),
                         "session_mean_hz":mean([r["hz"] for r in sessions]),
                         "session_sd_hz":st.stdev(r["hz"] for r in sessions),
                         "session_mean_validity_pct":mean([r["validity_pct"] for r in sessions])},
              "sessions":sessions,"integrity":integrity,"behaviour":behaviour,
              "duplicate_payload_sensitivity":dedup_sensitivity,
              "condition_order":{pid:[c for _,c in sorted(values)] for pid,values in session_order.items()},
              "participant_behaviour":participant_results,"sensitivity":sensitivity,
              "cohort_rtt":{k:stats(v) for k,v in cohort_rtt.items()},
              "context_status":dict(Counter(r["status"] for r in cp_events)),
              "context_by_status":context_by_status,
              "advisory":advisory,"sweep":sweep,
              "legacy_loader": {"root_files_discovered_as_cohort":len(extras),
                                "root_files_with_wrong_full_schema":invalid_for_legacy_loader},
              "input_hashes":inputs,
              "limits":["Descriptive reproduction; no efficacy or significance inference.",
                        "No live hardware, browser sweep, or learned model rerun.",
                        "Condition labels come from explicit folders, not an independently recorded assignment log.",
                        "Participant labels preserve the existing four-person ordering; not a general anonymisation tool."]}
    (OUT / "evidence-audit.json").write_text(json.dumps(result,indent=2,allow_nan=False)+"\n")
    save_csv("session-audit.csv",sessions)
    save_csv("integrity-audit.csv",integrity)
    save_csv("post-intervention-audit.csv",events)
    save_csv("participant-behaviour.csv",participant_results)
    save_csv("window-sensitivity.csv",sensitivity)
    print(json.dumps({k:result[k] for k in ["cohort","behaviour","cohort_rtt","context_status","context_by_status","advisory","legacy_loader"]},indent=2))
    return result


if __name__ == "__main__":
    main()
