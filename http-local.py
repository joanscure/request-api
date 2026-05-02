#!/usr/bin/env python3
"""
http-local.py — cliente HTTP minimalista para terminal/Neovim
Sin login, sin nube, sin cuentas. Todo local.

Uso:
  python http-local.py                          # modo interactivo TUI
  python http-local.py GET https://api.com/v1   # modo directo
  python http-local.py POST https://api.com/v1 '{"key":"val"}'

Desde Neovim:
  :terminal python http-local.py
  :terminal python http-local.py GET https://httpbin.org/get

Atajos en modo interactivo:
  q  → salir
  s  → guardar request actual
  l  → listar/cargar requests guardadas
  h  → ayuda
"""

import sys
import os
import json
import time
import urllib.request
import urllib.error
import urllib.parse
from pathlib import Path

SAVE_FILE = Path.home() / ".config" / "http-local" / "requests.json"
SAVE_FILE.parent.mkdir(parents=True, exist_ok=True)

COLORS = {
    "reset":  "\033[0m",
    "bold":   "\033[1m",
    "dim":    "\033[2m",
    "green":  "\033[32m",
    "yellow": "\033[33m",
    "red":    "\033[31m",
    "blue":   "\033[34m",
    "cyan":   "\033[36m",
    "purple": "\033[35m",
}

def c(name, text):
    return COLORS.get(name, "") + str(text) + COLORS["reset"]

def method_color(m):
    colors = {"GET": "green", "POST": "blue", "PUT": "yellow", "DELETE": "red", "PATCH": "purple"}
    return c(colors.get(m, "dim"), m.ljust(7))

def status_color(code):
    if code < 300:   return c("green", str(code))
    elif code < 400: return c("yellow", str(code))
    else:            return c("red", str(code))

def load_saved():
    if SAVE_FILE.exists():
        try:
            with open(SAVE_FILE) as f:
                return json.load(f)
        except Exception:
            pass
    return []

def save_requests(reqs):
    with open(SAVE_FILE, "w") as f:
        json.dump(reqs, f, indent=2, ensure_ascii=False)

def do_request(method, url, headers=None, body=None, params=None):
    if not url.startswith("http"):
        url = "https://" + url

    if params:
        url += ("&" if "?" in url else "?") + urllib.parse.urlencode(params)

    req_headers = {"Accept": "application/json", "User-Agent": "http-local/1.0"}
    if headers:
        req_headers.update(headers)

    data = None
    if body:
        if isinstance(body, dict):
            body = json.dumps(body)
        data = body.encode("utf-8")
        if "Content-Type" not in req_headers:
            req_headers["Content-Type"] = "application/json"

    req = urllib.request.Request(url, data=data, headers=req_headers, method=method)

    t0 = time.time()
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            ms = int((time.time() - t0) * 1000)
            body_bytes = resp.read()
            text = body_bytes.decode("utf-8", errors="replace")
            try:
                parsed = json.loads(text)
                text = json.dumps(parsed, indent=2, ensure_ascii=False)
            except Exception:
                pass
            return resp.status, resp.reason, ms, text, dict(resp.headers)
    except urllib.error.HTTPError as e:
        ms = int((time.time() - t0) * 1000)
        body_bytes = e.read()
        text = body_bytes.decode("utf-8", errors="replace")
        try:
            parsed = json.loads(text)
            text = json.dumps(parsed, indent=2, ensure_ascii=False)
        except Exception:
            pass
        return e.code, e.reason, ms, text, {}
    except Exception as e:
        ms = int((time.time() - t0) * 1000)
        return 0, str(e), ms, "", {}

def print_response(status, reason, ms, body, req_info=None):
    print()
    sep = c("dim", "─" * 60)
    print(sep)
    if req_info:
        print(f"  {method_color(req_info['method'])} {c('dim', req_info['url'])}")
    if status == 0:
        print(f"  {c('red', 'Error de red:')} {reason}")
    else:
        print(f"  {status_color(status)} {c('dim', reason)}  {c('dim', str(ms)+'ms')}")
    print(sep)
    if body:
        lines = body.split("\n")
        for line in lines[:200]:
            print("  " + c("dim", line) if not line.strip().startswith('"') else "  " + line)
        if len(lines) > 200:
            print(c("dim", f"  ... ({len(lines) - 200} líneas más)"))
    print()

def prompt(label, default=""):
    try:
        val = input(f"  {c('cyan', label)}{' ['+default+']' if default else ''}: ").strip()
        return val if val else default
    except (KeyboardInterrupt, EOFError):
        return default

def parse_headers_input(s):
    headers = {}
    if not s:
        return headers
    for part in s.split(","):
        if ":" in part:
            k, v = part.split(":", 1)
            headers[k.strip()] = v.strip()
    return headers

def interactive_mode():
    saved = load_saved()

    print()
    print(c("bold", "  http.local") + c("dim", " — cliente HTTP sin login"))
    print(c("dim", "  datos guardados en: " + str(SAVE_FILE)))
    print(c("dim", "  Ctrl+C para salir\n"))

    while True:
        try:
            print(c("dim", "  ─────────────────────────"))
            action = prompt("método o [l]istar/[q]salir", "GET").upper()

            if action in ("Q", "QUIT", "EXIT"):
                print(c("dim", "\n  chau!\n"))
                break

            if action in ("L", "LIST"):
                saved = load_saved()
                if not saved:
                    print(c("dim", "  sin requests guardadas"))
                    continue
                print()
                for i, r in enumerate(saved):
                    print(f"  {c('dim', str(i+1)+'.')} {method_color(r['method'])} {c('bold', r['name'])} {c('dim', r['url'])}")
                print()
                sel = prompt("número a cargar (enter=cancelar)")
                if sel.isdigit():
                    idx = int(sel) - 1
                    if 0 <= idx < len(saved):
                        r = saved[idx]
                        status, reason, ms, body, _ = do_request(
                            r["method"], r["url"],
                            headers=r.get("headers"),
                            body=r.get("body"),
                            params=r.get("params")
                        )
                        print_response(status, reason, ms, body, {"method": r["method"], "url": r["url"]})
                continue

            if action in ("H", "HELP", "?", "AYUDA"):
                print(c("dim", """
  métodos: GET POST PUT PATCH DELETE HEAD
  l        → listar y cargar requests guardadas
  s        → (después de ingresar URL) guardar request
  q        → salir

  headers:  nombre:valor,nombre2:valor2
  params:   nombre=valor&nombre2=valor2
  body:     JSON directo o string
"""))
                continue

            method = action if action in ("GET", "POST", "PUT", "PATCH", "DELETE", "HEAD") else "GET"
            url = prompt("URL")
            if not url:
                continue

            headers_raw = prompt("headers (key:val,key2:val2)", "")
            params_raw  = prompt("params (?key=val)", "")
            body_raw    = "" if method in ("GET", "HEAD") else prompt("body (JSON)", "")

            headers = parse_headers_input(headers_raw)
            params  = dict(urllib.parse.parse_qsl(params_raw.lstrip("?"))) if params_raw else None
            body    = None
            if body_raw:
                try:    body = json.loads(body_raw)
                except: body = body_raw

            status, reason, ms, resp_body, _ = do_request(method, url, headers, body, params)
            print_response(status, reason, ms, resp_body, {"method": method, "url": url})

            save_q = prompt("guardar esta request? [s/N]", "N").upper()
            if save_q in ("S", "Y", "SI", "YES"):
                name = prompt("nombre")
                if name:
                    saved = load_saved()
                    saved = [r for r in saved if r.get("name") != name]
                    saved.insert(0, {
                        "name": name, "method": method, "url": url,
                        "headers": headers, "params": params or {},
                        "body": body_raw
                    })
                    save_requests(saved)
                    print(c("green", f"  ✓ guardada: {name}\n"))

        except KeyboardInterrupt:
            print(c("dim", "\n\n  chau!\n"))
            break
        except Exception as e:
            print(c("red", f"  error inesperado: {e}"))

def cli_mode():
    """Modo directo: python http-local.py METHOD URL [body]"""
    method = sys.argv[1].upper()
    url    = sys.argv[2]
    body   = None

    if len(sys.argv) > 3:
        raw = sys.argv[3]
        try:    body = json.loads(raw)
        except: body = raw

    status, reason, ms, resp_body, _ = do_request(method, url, body=body)
    print_response(status, reason, ms, resp_body, {"method": method, "url": url})
    sys.exit(0 if status and status < 400 else 1)

if __name__ == "__main__":
    if len(sys.argv) >= 3:
        cli_mode()
    else:
        interactive_mode()
