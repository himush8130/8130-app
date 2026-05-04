#!/usr/bin/env python3
"""
One-shot: restore the leading 0 on Israeli mobile phones in employees.

Excel dropped the leading zero on import. Any phone that's exactly 9
digits starting with '5' gets a '0' prepended.

Usage:
    python3 scripts/fix_phones.py [--dry-run]
"""

from __future__ import annotations
import argparse
import json
import os
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def load_env() -> dict[str, str]:
    env: dict[str, str] = dict(os.environ)
    p = ROOT / ".env.local"
    if p.exists():
        for line in p.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, _, v = line.partition("=")
            env.setdefault(k.strip(), v.strip())
    return env


def sb(env, method: str, path: str, body=None):
    url = env["VITE_SUPABASE_URL"].rstrip("/") + "/rest/v1/" + path.lstrip("/")
    key = env["SUPABASE_SERVICE_ROLE_KEY"]
    data = json.dumps(body, ensure_ascii=False).encode("utf-8") if body is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("apikey", key)
    req.add_header("Authorization", f"Bearer {key}")
    if data is not None:
        req.add_header("Content-Type", "application/json")
        req.add_header("Prefer", "return=minimal")
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, resp.read().decode("utf-8")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    env = load_env()
    if not env.get("VITE_SUPABASE_URL") or not env.get("SUPABASE_SERVICE_ROLE_KEY"):
        raise SystemExit("חסרים VITE_SUPABASE_URL או SUPABASE_SERVICE_ROLE_KEY ב-.env.local")

    status, body = sb(env, "GET", "employees?select=employee_number,name,phone")
    if status >= 400:
        raise SystemExit(f"GET employees failed: HTTP {status}\n{body}")
    employees = json.loads(body)

    fixed = 0
    skipped = 0
    for e in employees:
        phone = e.get("phone")
        if not phone:
            skipped += 1
            continue
        digits = ''.join(c for c in str(phone) if c.isdigit())
        if len(digits) == 9 and digits.startswith('5'):
            new_phone = '0' + digits
            print(f"  {e['employee_number']:>8}  {e['name']:<25}  {phone}  →  {new_phone}")
            if not args.dry_run:
                st, bd = sb(env, "PATCH", f"employees?employee_number=eq.{e['employee_number']}",
                            {"phone": new_phone})
                if st >= 400:
                    raise SystemExit(f"PATCH failed for {e['employee_number']}: HTTP {st}\n{bd}")
            fixed += 1
        else:
            skipped += 1

    print()
    print(f"תוקנו: {fixed}")
    print(f"דולגו: {skipped}")
    if args.dry_run:
        print("(dry-run — לא נוגעים ב-DB)")


if __name__ == "__main__":
    main()
