#!/usr/bin/env python3
"""Oracle — serveur autonome (Railway).

Sert la PWA Oracle ET un proxy « Oracle IA », pour que l'app fonctionne
depuis une seule URL sans coller de clé dans le téléphone. Les clés IA
vivent dans les variables Railway de CE service :

  ANTHROPIC_API_KEY   → Claude (co-MJ par défaut, le plus créatif)
  GEMINI_API_KEY      → Gemini (secours gratuit)
  GROQ_API_KEY        → Groq (gratuit, rapide)
  OPENAI_API_KEY      → GPT
  ORACLE_PROVIDER=gemini pour forcer un fournisseur en priorité
  ORACLE_TOKEN        → (optionnel) protège l'API du proxy
"""
import os
import requests
from flask import Flask, jsonify, request, send_from_directory

HERE = os.path.dirname(os.path.abspath(__file__))
app = Flask(__name__, static_folder=None)


# ── CORS + auth léger (l'API seulement ; la PWA est publique) ──────
def _cors(resp):
    resp.headers["Access-Control-Allow-Origin"] = "*"
    resp.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    resp.headers["Access-Control-Allow-Headers"] = "Content-Type, X-Oracle-Token"
    return resp


@app.after_request
def _add_cors(resp):
    return _cors(resp)


def _token_ok():
    expected = os.environ.get("ORACLE_TOKEN", "")
    return not expected or request.headers.get("X-Oracle-Token", "") == expected


@app.before_request
def _guard():
    if not request.path.startswith("/api/"):
        return None
    if request.method == "OPTIONS":
        return _cors(jsonify({}))
    if request.path.rstrip("/").endswith("/api/oracle/ping"):
        return None  # public : auto-détection
    if not _token_ok():
        return _cors(jsonify({"ok": False, "error": "token invalide"})), 401


# ── Fournisseurs IA ───────────────────────────────────────────────
def _providers():
    return {
        "claude": os.environ.get("ANTHROPIC_API_KEY", ""),
        "gemini": os.environ.get("GEMINI_API_KEY", ""),
        "groq":   os.environ.get("GROQ_API_KEY", ""),
        "gpt":    os.environ.get("OPENAI_API_KEY", ""),
    }


@app.route("/api/oracle/ping", methods=["GET"])
def ping():
    keys = _providers()
    return jsonify({"ok": True, "app": "oracle", "version": "v1",
                    "providers": [n for n, k in keys.items() if k],
                    "proxy": any(keys.values())})


def _call_claude(key, system, messages, model=None, max_tokens=1600):
    model = model or os.environ.get("ANTHROPIC_MODEL", "claude-haiku-4-5-20251001")
    r = requests.post("https://api.anthropic.com/v1/messages",
        headers={"x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json"},
        json={"model": model, "max_tokens": max_tokens,
              "system": [{"type": "text", "text": system, "cache_control": {"type": "ephemeral"}}],
              "messages": [{"role": "assistant" if m["role"] == "ai" else "user", "content": m["content"]} for m in messages]},
        timeout=90)
    r.raise_for_status()
    return "".join(b.get("text", "") for b in r.json().get("content", []) if b.get("type") == "text") or "(réponse vide)"


def _call_gemini(key, system, messages):
    model = os.environ.get("GEMINI_MODEL", "gemini-2.0-flash")
    r = requests.post("https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent" % model,
        params={"key": key},
        json={"system_instruction": {"parts": [{"text": system}]},
              "contents": [{"role": "model" if m["role"] == "ai" else "user", "parts": [{"text": m["content"]}]} for m in messages],
              "generationConfig": {"maxOutputTokens": 1600}},
        timeout=60)
    r.raise_for_status()
    j = r.json()
    return "".join(p.get("text", "") for c in j.get("candidates", [])[:1]
                   for p in c.get("content", {}).get("parts", [])) or "(réponse vide)"


def _call_openai_compat(key, url, model, system, messages):
    r = requests.post(url,
        headers={"authorization": "Bearer " + key, "content-type": "application/json"},
        json={"model": model, "max_tokens": 1600,
              "messages": [{"role": "system", "content": system}] +
                          [{"role": "assistant" if m["role"] == "ai" else "user", "content": m["content"]} for m in messages]},
        timeout=60)
    r.raise_for_status()
    j = r.json()
    return (j.get("choices", [{}])[0].get("message", {}).get("content") or "(réponse vide)")


@app.route("/api/oracle/chat", methods=["POST"])
def chat():
    b = request.get_json(silent=True) or {}
    system = str(b.get("system") or "")[:120000]
    messages = b.get("messages") or []
    if not isinstance(messages, list) or not messages:
        return jsonify({"ok": False, "error": "messages requis"}), 400
    messages = [{"role": "ai" if m.get("role") == "ai" else "user", "content": str(m.get("content", ""))[:8000]}
                for m in messages[-16:]]

    keys = _providers()
    prefer = os.environ.get("ORACLE_PROVIDER", "").strip().lower()
    catalog = {
        "claude": (keys["claude"], lambda: _call_claude(keys["claude"], system, messages)),
        "gemini": (keys["gemini"], lambda: _call_gemini(keys["gemini"], system, messages)),
        "groq":   (keys["groq"],   lambda: _call_openai_compat(keys["groq"], "https://api.groq.com/openai/v1/chat/completions",
                                                               os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile"), system, messages)),
        "gpt":    (keys["gpt"],    lambda: _call_openai_compat(keys["gpt"], "https://api.openai.com/v1/chat/completions",
                                                               os.environ.get("OPENAI_MODEL", "gpt-4o-mini"), system, messages)),
    }
    order = ["claude", "gemini", "groq", "gpt"]
    if prefer in catalog:
        order = [prefer] + [p for p in order if p != prefer]
    providers = [(n, catalog[n][1]) for n in order if catalog[n][0]]
    if not providers:
        return jsonify({"ok": False, "error": "Aucune clé IA sur ce service Railway. Ajoute ANTHROPIC_API_KEY, "
                        "GEMINI_API_KEY, GROQ_API_KEY ou OPENAI_API_KEY dans les variables."}), 200

    errors = []
    for name, fn in providers:
        try:
            text = fn()
            if not text or not text.strip() or text.strip() == "(réponse vide)":
                errors.append("%s: réponse vide" % name)
                continue
            return jsonify({"ok": True, "text": text, "provider": name})
        except requests.HTTPError as e:
            errors.append("%s: HTTP %s" % (name, e.response.status_code if e.response is not None else "?"))
        except Exception as e:
            errors.append("%s: %s" % (name, str(e)[:80]))
    return jsonify({"ok": False, "error": "Tous les fournisseurs IA ont échoué → " + " · ".join(errors)}), 200


# ── PWA statique ──────────────────────────────────────────────────
@app.route("/", defaults={"path": "index.html"})
@app.route("/<path:path>")
def static_files(path):
    full = os.path.join(HERE, path)
    if os.path.isfile(full):
        return send_from_directory(HERE, path)
    return send_from_directory(HERE, "index.html")


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 8080)))
