"""End-to-end walkthrough of ThinkR against the live API on :8000."""
import json, urllib.request, urllib.error

BASE = "http://localhost:8000"
PW = "ThinkR2026!"

def call(method, path, token=None, body=None):
    url = BASE + path
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    try:
        with urllib.request.urlopen(req) as r:
            return r.status, json.loads(r.read() or "null")
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read() or "null")

def login(email):
    s, d = call("POST", "/auth/login", body={"email": email, "password": PW})
    assert s == 200, f"login {email} -> {s} {d}"
    return d["access_token"]

ok = 0
def check(label, cond, extra=""):
    global ok
    mark = "PASS" if cond else "FAIL"
    if cond: ok += 1
    print(f"  [{mark}] {label}{(' — ' + extra) if extra else ''}")
    assert cond, f"FAILED: {label} {extra}"

print("\n========== SCENE 1: Student discover + scoring/breakdown ==========")
alex = login("alex.kim@student.edu")
s, feed = call("GET", "/discover", alex)
check("discover returns ranked projects", s == 200 and len(feed) > 0, f"{len(feed)} projects")
top = feed[0]
check("top project is highest score (sorted desc)",
      all(feed[i]["compatibility_score"] >= feed[i+1]["compatibility_score"] for i in range(len(feed)-1)),
      f"top={top['compatibility_score']}% {top['tier']['label']}")
check("project carries a 6-signal score_breakdown",
      top.get("score_breakdown") and len(top["score_breakdown"]) == 6)
print("       Breakdown for '%s' (%.1f%%):" % (top["title"], top["compatibility_score"]))
for b in top["score_breakdown"]:
    print(f"         - {b['label']:<18} {b['earned']:>5}/{b['max']:<3} {b['detail']}")
check("breakdown maxes sum to 100", sum(b["max"] for b in top["score_breakdown"]) == 100)

s, sw = call("POST", "/matches/swipe", alex, {"project_id": top["id"], "direction": "right"})
check("student swipe right creates a match", s == 201 and sw["student_interest"] is True,
      f"match {sw['id'][:8]} status={sw['status']}")

print("\n========== SCENE 2: Professor queue shows WHO swiped (+score) ==========")
marcus = login("marcus.chen@university.edu")
s, msum = call("GET", "/notifications/summary", marcus)
check("notif summary has role-aware keys", s == 200 and "pending_swipes" in msum and "incoming_requests" in msum,
      json.dumps(msum))
check("professor sees pending swipes > 0", msum["pending_swipes"] > 0, f"pending_swipes={msum['pending_swipes']}")
s, mq = call("GET", "/matches", marcus)
queue = [m for m in mq if m["student_interest"] and not m["researcher_interest"]]
check("professor queue is non-empty", len(queue) > 0, f"{len(queue)} interested students")
named = [m for m in queue if m.get("student") and m["student"].get("user")]
check("queue entries carry student identity + score",
      len(named) > 0,
      ", ".join(f"{m['student']['user']['name']}({m['compatibility_score']}%)" for m in named[:3]))

# Accept the highest-scoring interested student -> mutual match
target = max(queue, key=lambda m: m["compatibility_score"] or 0)
s, acc = call("POST", "/matches/researcher-swipe", marcus, {"match_id": target["id"], "direction": "right"})
check("researcher accept -> mutual match", s == 200 and acc["is_mutual"] is True and acc["status"] == "Matched",
      f"matched with {target['student']['user']['name'] if target.get('student') and target['student'].get('user') else '?'}")
mutual_match_id = acc["id"]

print("\n========== SCENE 3: Professor browses + sends proactive request ==========")
s, projs = call("GET", "/researchers/me/projects", marcus)
proj = next(p for p in projs if p["is_active"])
s, scored = call("GET", f"/students?project_id={proj['id']}", marcus)
check("browse students returns scored list", s == 200 and len(scored) > 0, f"{len(scored)} students")
check("students sorted by score desc",
      all((scored[i]["compatibility_score"] or 0) >= (scored[i+1]["compatibility_score"] or 0) for i in range(len(scored)-1)))
check("scored student carries breakdown",
      bool(scored[0].get("score_breakdown")),
      f"{scored[0]['user']['name']} {scored[0]['compatibility_score']}% for '{proj['title']}'")

# Pick a student with NO existing match on this project to send a fresh request
s, marcus_matches = call("GET", "/matches", marcus)
matched_pairs = {(m["student_id"], m["project_id"]) for m in marcus_matches}
candidate = next(st for st in scored if (st["id"], proj["id"]) not in matched_pairs)
s, pr = call("POST", "/matches/professor-request", marcus,
             {"student_id": candidate["id"], "project_id": proj["id"]})
check("professor-request creates a request match", s == 201 and pr["researcher_interest"] is True and pr["student_interest"] is False,
      f"-> {candidate['user']['name']}")
target_student_email = candidate["user"]["email"]

print("\n========== SCENE 4: Student SEES + ACCEPTS professor request (new flow) ==========")
stu = login(target_student_email)
s, ssum = call("GET", "/notifications/summary", stu)
check("student notif summary shows incoming_requests", s == 200 and ssum["incoming_requests"] > 0,
      f"incoming_requests={ssum['incoming_requests']}")
s, smatches = call("GET", "/matches", stu)
incoming = [m for m in smatches if m["researcher_interest"] and not m["student_interest"] and not m["is_mutual"]]
check("student can see the incoming professor request", len(incoming) > 0,
      f"from project '{incoming[0]['project']['title']}'")
# Accept it -> mutual
s, accepted = call("POST", "/matches/swipe", stu, {"project_id": incoming[0]["project_id"], "direction": "right"})
check("student accept -> mutual match", s in (200, 201) and accepted["is_mutual"] is True,
      f"status={accepted['status']}")

print("\n========== SCENE 5: Mutual-match chat ==========")
s, sent = call("POST", f"/messages/{mutual_match_id}", marcus, {"content": "Hi! Loved your profile — want to chat this week?"})
check("professor sends a message in mutual match", s in (200, 201) and sent["content"].startswith("Hi!"))
# The student on the other side reads it
s, who = call("GET", "/matches", marcus)
s, thread = call("GET", f"/messages/{mutual_match_id}", marcus)
check("message thread is retrievable", s == 200 and len(thread) >= 1, f"{len(thread)} message(s)")

print("\n========== SUMMARY ==========")
print(f"  {ok} checks passed.")
print("  Verified: auth · discover+scoring+breakdown · student swipe · professor queue w/ identity ·")
print("            researcher accept→mutual · browse+scored students · professor-request ·")
print("            student-accepts-request→mutual · notifications (incoming_requests/pending_swipes) · chat")
