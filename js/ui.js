/* ============================================================
   Oracle — rendu de l'interface (vanilla, zéro dépendance).
   ============================================================ */

const UI = {
  view: "play",

  esc(s) { return (s == null ? "" : String(s)).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); },
  // markdown minimal : **gras**, *italique*, sauts de ligne
  md(s) {
    return this.esc(s)
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>")
      .replace(/(^|[\s(>])_([^_\n]+)_/g, "$1<em>$2</em>")
      .replace(/^\s*[—-]{2,}\s*$/gm, "<hr>")
      .replace(/\n/g, "<br>");
  },

  toast(msg, kind = "") {
    const box = document.getElementById("toasts");
    const el = document.createElement("div");
    el.className = "toast " + kind;
    el.innerHTML = msg;
    box.appendChild(el);
    setTimeout(() => { el.classList.add("show"); }, 10);
    setTimeout(() => { el.classList.remove("show"); setTimeout(() => el.remove(), 300); }, 2600);
  },

  /* ---------- Navigation ---------- */
  go(view) {
    this.view = view;
    document.querySelectorAll(".tab").forEach(t => t.classList.toggle("active", t.dataset.view === view));
    document.querySelectorAll(".view").forEach(v => v.classList.add("hidden"));
    document.getElementById("view-" + view).classList.remove("hidden");
    this.render();
    document.getElementById("views").scrollTop = view === "play" ? 999999 : 0;
  },

  renderHeader() {
    const c = State.current(); if (!c) return;
    const g = DATA.GENRES[c.genre] || DATA.GENRES.custom;
    document.getElementById("hudCrest").textContent = g.ico;
    document.getElementById("hudCampaign").textContent = c.name;
    document.getElementById("hudGenre").textContent = g.ico + " " + (g.name.split(" ")[0]);
    document.getElementById("hudScene").textContent = c.scene && c.scene.title ? "📍 " + c.scene.title : "Aucune scène";
    document.getElementById("hudSession").textContent = "Séance " + c.session;
    const st = Oracle.lastStatus;
    const badge = document.getElementById("hudAiBadge");
    badge.textContent = st ? (st.mode === "ai" ? "🟢" : "🔴") : "🔮";
    badge.title = st ? (st.mode === "ai" ? "Oracle IA actif (" + (st.provider || "") + ")" : "Oracle hors-ligne : " + (st.reason || "")) : "Oracle";
  },

  render() {
    this.renderHeader();
    const fn = { play: "renderPlay", heroes: "renderHeroes", world: "renderWorld", dice: "renderDice", oracle: "renderOracle", table: "renderTable" }[this.view];
    if (fn) this[fn]();
    State.applyTheme();
  },

  /* ============================================================
     PARTIE — le hub temps réel
     ============================================================ */
  renderPlay() {
    const c = State.current();
    const el = document.getElementById("view-play");
    const chron = c.chronicle.slice(-60);
    const feed = chron.length ? chron.map(e => this.chronItem(e)).join("") :
      `<div class="empty">La partie n'a pas commencé. Pose une scène, ou écris ce que font les joueurs ci-dessous — l'Oracle prend le relais. 🔮</div>`;

    const partyTokens = c.heroes.map(h => {
      const pct = Math.round((h.hp / Math.max(1, h.maxHp)) * 100);
      return `<div class="party-tok ${h.hp <= 0 ? "downed" : ""}">
        <div class="party-tok-top"><span class="party-ava">${h.avatar}</span><span class="party-name">${this.esc(h.name.split(" ")[0])}</span></div>
        <div class="party-hpbar"><div class="party-hpfill ${pct < 35 ? "low" : ""}" style="width:${pct}%"></div></div>
        <div class="party-hptxt"><span>${h.hp}/${h.maxHp} PV</span>${h.conditions && h.conditions.length ? `<span>⚠️${h.conditions.length}</span>` : `<span>🛡️${h.armor}</span>`}</div>
        <button class="party-tap" onclick="UI.openHeroSheet('${h.id}')" aria-label="${this.esc(h.name)}"></button>
      </div>`;
    }).join("");

    el.innerHTML = `
      ${this.setupBanner()}
      <div class="scene-banner ${c.scene && c.scene.mood ? "" : "muted-banner"}">
        <div class="scene-title">${c.scene && c.scene.title ? "📍 " + this.esc(c.scene.title) : "Scène libre"}</div>
        ${c.scene && c.scene.mood ? `<div class="scene-mood">${this.esc(c.scene.mood)}</div>` : ""}
      </div>
      ${c.heroes.length ? `<div class="party-bar">${partyTokens}</div>` : ""}
      <div class="feed" id="feed">${feed}</div>
      <div class="composer">
        <div class="chips">
          <button class="chip chip-intro" onclick="UI.introduce()">🎬 Introduire l'aventure</button>
          <button class="chip" onclick="UI.compose('Décris la scène et l\\'ambiance actuelle avec des détails immersifs.')">🖼️ Décris la scène</button>
          <button class="chip" onclick="UI.compose('Un PNJ intervient. Qui est-ce et que dit-il ?')">💬 Un PNJ parle</button>
          <button class="chip" onclick="UI.compose('Introduis une complication inattendue, maintenant.')">⚡ Complication</button>
          <button class="chip" onclick="UI.compose('Le groupe cherche quoi faire ensuite : donne 3 pistes ou accroches.')">🧭 3 pistes</button>
          <button class="chip" onclick="UI.go('dice')">🎲 Lancer un dé</button>
        </div>
        <div class="composer-row">
          <select id="playWho" class="who-select">
            <option value="">🎙️ Le MJ / la table</option>
            ${c.heroes.map(h => `<option value="${this.esc(h.name)}">${h.avatar} ${this.esc(h.name)}</option>`).join("")}
          </select>
          <textarea id="playInput" rows="1" placeholder="Ce que font ou choisissent les joueurs…" oninput="UI.autogrow(this)"></textarea>
          <button class="send-btn" id="playSend" onclick="UI.sendPlay()">▶</button>
        </div>
      </div>`;
    const feedEl = document.getElementById("feed");
    if (feedEl) feedEl.scrollTop = feedEl.scrollHeight;
    setTimeout(() => { const f = document.getElementById("feed"); if (f) f.scrollTop = f.scrollHeight; }, 30);
  },

  chronItem(e) {
    const time = new Date(e.t).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    if (e.kind === "scene") return `<div class="c-scene">📍 ${this.esc(e.text)}</div>`;
    if (e.kind === "event") return `<div class="c-event">⚡ ${this.esc(e.text)}</div>`;
    if (e.kind === "dice") return `<div class="c-dice">🎲 ${this.esc(e.text)}</div>`;
    if (e.kind === "pnj") return `<div class="c-pnj"><span class="c-pnj-name">${this.esc(e.who)}</span> ${this.esc(e.text)} <button class="speak-btn" onclick="UI.speakId('${e.id}')">🔊</button></div>`;
    if (e.kind === "action") return `<div class="c-action"><span class="c-who">${this.esc(e.who || "MJ")}</span>${this.md(e.text)}</div>`;
    if (e.kind === "oracle") return `<div class="c-oracle"><div class="c-oracle-head">🔮 Oracle <button class="speak-btn" onclick="UI.speakId('${e.id}')">🔊</button></div>${this.md(e.text)}${e.fx ? `<div class="c-fx">${e.fx}</div>` : ""}</div>`;
    return `<div class="c-note">${this.md(e.text)}</div>`;
  },

  // Bandeau d'activation de l'Oracle : s'affiche tant que l'IA n'a pas répondu
  // en ligne (aucune clé posée / dernier appel hors-ligne). Guide vers Table.
  setupBanner() {
    if (this.setupDismissed) return "";
    const ai = State.data.ai;
    const offline = Oracle.lastStatus && Oracle.lastStatus.mode === "offline";
    const online = Oracle.lastStatus && Oracle.lastStatus.mode === "ai";
    const noKey = ai.provider !== "backend" && !ai.key;
    if (online) return "";
    if (!offline && !noKey) return "";
    return `<div class="setup-banner">
      <div class="setup-txt">🔮 <b>Active l'Oracle gratuitement</b><span>Clé Groq ou Gemini, sans carte bancaire — 2 min.</span></div>
      <div class="setup-actions">
        <button class="btn btn-primary btn-sm" onclick="UI.go('table')">Configurer</button>
        <button class="setup-x" onclick="UI.dismissSetup()">✕</button>
      </div>
    </div>`;
  },
  dismissSetup() { this.setupDismissed = true; this.renderPlay(); },

  /* ---------- Lecture vocale (synthèse sur l'appareil, gratuite) ---------- */
  speak(text, kind) {
    if (!("speechSynthesis" in window)) { this.toast("Voix non disponible sur cet appareil", "warn"); return; }
    const clean = String(text || "")
      .replace(/\*\*|__|[*_#`~>]/g, "")
      .replace(/\[[^\]]*\]/g, "")
      .replace(/https?:\/\/\S+/g, "")
      .replace(/\s+/g, " ").trim();
    if (!clean) return;
    try {
      const synth = window.speechSynthesis;
      synth.cancel();
      const u = new SpeechSynthesisUtterance(clean);
      const voices = synth.getVoices() || [];
      let v = State.data.voiceName ? voices.find(x => x.name === State.data.voiceName) : null;
      if (!v) v = this.bestVoice(voices);
      if (v) { u.voice = v; u.lang = v.lang; } else u.lang = "fr-FR";
      // Voix naturelle : hauteur et débit normaux (pas de trafic qui rend le rendu haché).
      u.pitch = 1.0; u.rate = 1.0;
      synth.speak(u);
      // Correctif iOS : la synthèse se met parfois en pause juste après speak()
      setTimeout(() => { try { if (synth.paused) synth.resume(); } catch (e) {} }, 120);
    } catch (e) { /* ignore */ }
  },
  // Choisit la meilleure voix française dispo (évite les voix "compact" bas de gamme).
  bestVoice(voices) {
    const fr = (voices || []).filter(v => /^fr/i.test(v.lang));
    return fr.find(v => /(enhanced|premium|amélie|amelie|aurélie|aurelie|thomas|marie|siri)/i.test(v.name))
        || fr.find(v => !/compact|eloquence/i.test(v.name))
        || fr[0] || null;
  },
  setVoice(name) { State.data.voiceName = name || ""; State.save(); this.speak("Voix sélectionnée. La partie peut commencer.", "oracle"); },
  voicePicker(d) {
    const voices = ("speechSynthesis" in window) ? (window.speechSynthesis.getVoices() || []) : [];
    if (!voices.length) return `<div class="hint">Voix en cours de chargement… tape « 🔊 Tester la voix » une fois, puis reviens pour choisir.</div>`;
    const fr = voices.filter(v => /^fr/i.test(v.lang));
    const others = voices.filter(v => !/^fr/i.test(v.lang));
    const opt = v => `<option value="${this.esc(v.name)}" ${v.name === d.voiceName ? "selected" : ""}>${this.esc(v.name)} (${this.esc(v.lang)})</option>`;
    return `<label class="f">Voix<select onchange="UI.setVoice(this.value)">
      <option value="" ${!d.voiceName ? "selected" : ""}>Auto — meilleure voix française</option>
      ${fr.length ? `<optgroup label="Français">${fr.map(opt).join("")}</optgroup>` : ""}
      ${others.length ? `<optgroup label="Autres langues">${others.slice(0, 40).map(opt).join("")}</optgroup>` : ""}
    </select></label>`;
  },
  // Extrait uniquement les répliques entre guillemets (« », " ", " ") — ce qui est PARLÉ.
  dialogueOf(text) {
    const t = String(text || "");
    const re = /«\s*([^»]+?)\s*»|"([^"]+?)"|“([^”]+?)”/g;
    const spans = []; let m;
    while ((m = re.exec(t))) spans.push((m[1] || m[2] || m[3] || "").trim());
    return spans.filter(Boolean).join(". ");
  },
  speakId(id) {
    const c = State.current(); const e = (c.chronicle || []).find(x => x.id === id); if (!e) return;
    if (e.kind === "pnj") { this.speak((e.who ? e.who + ". " : "") + e.text, "pnj"); return; }
    if (State.data.readDialogueOnly !== false) {
      const d = this.dialogueOf(e.text);
      if (d) { this.speak(d, "pnj"); return; }     // uniquement le dialogue, voix de personnage
      this.speak(e.text, "oracle"); return;        // pas de dialogue → on lit tout (secours)
    }
    this.speak((e.who ? e.who + ". " : "") + e.text, e.kind);
  },
  // Lecture d'une réponse d'Oracle (auto ou manuelle) selon le réglage dialogues.
  speakNarration(text) {
    if (State.data.readDialogueOnly !== false) {
      const d = this.dialogueOf(text);
      if (d) this.speak(d, "pnj");                 // ne lit QUE les répliques « »
      return;                                       // pas de dialogue → rien (le MJ lit la description)
    }
    this.speak(text, "oracle");
  },
  stopSpeak() { if ("speechSynthesis" in window) window.speechSynthesis.cancel(); },

  compose(text) { const i = document.getElementById("playInput"); if (i) { i.value = text; this.autogrow(i); i.focus(); } },
  autogrow(el) { el.style.height = "auto"; el.style.height = Math.min(120, el.scrollHeight) + "px"; },

  async sendPlay() {
    const input = document.getElementById("playInput");
    const who = document.getElementById("playWho").value;
    const text = input.value.trim();
    if (!text) {
      // Champ vide : si la partie n'a pas encore commencé, on lance l'intro ;
      // sinon on rappelle quoi faire (au lieu de ne "rien" faire).
      const hasAction = (State.current().chronicle || []).some(e => e.kind === "action");
      if (!hasAction) { this.introduce(); return; }
      this.toast("Écris une action, ou tape 🎬 Introduire l'aventure", "warn");
      return;
    }
    input.value = ""; this.autogrow(input);
    State.log({ kind: "action", who, text });
    this.renderPlay();
    await this.runOracle(text, "play", who);
  },

  async quickHero(id) { this.go("heroes"); setTimeout(() => this.editHero(id), 50); },

  /* Feuille rapide : PV, états et jets en un tap, sans quitter la partie. */
  openHeroSheet(id) {
    const c = State.current();
    const h = State.hero(id); if (!h) return;
    const is5e = c.system === "dnd5e";
    const pct = Math.round((h.hp / Math.max(1, h.maxHp)) * 100);
    const conds = (is5e ? DND.CONDITIONS : ["Blessé", "Empoisonné", "Étourdi", "À terre", "Effrayé", "Inconscient"])
      .map(cd => `<button class="qs-cond ${(h.conditions || []).includes(cd) ? "on" : ""}" onclick="UI.qsCond('${id}','${this.esc(cd)}')">${this.esc(cd)}</button>`).join("");
    const rolls = is5e ? `
      <div class="qs-section-t">Jets rapides</div>
      <div class="qs-rolls">
        <button class="qs-roll" onclick="UI.qsRoll('${id}','init')">Initiative</button>
        <button class="qs-roll" onclick="UI.qsRoll('${id}','skill','Perception')">Perception</button>
        <button class="qs-roll" onclick="UI.qsRoll('${id}','save','DEX')">Sauv. DEX</button>
        <button class="qs-roll" onclick="UI.qsRoll('${id}','save','CON')">Sauv. CON</button>
        <button class="qs-roll" onclick="UI.qsRoll('${id}','save','SAG')">Sauv. SAG</button>
      </div>` : "";
    const host = document.createElement("div");
    host.className = "sheet-overlay"; host.id = "sheetHost";
    host.onclick = (e) => { if (e.target === host) UI.closeHeroSheet(); };
    host.innerHTML = `<div class="quick-sheet">
      <div class="qs-grip"></div>
      <div class="qs-head"><span class="qs-ava">${h.avatar}</span><span class="qs-name">${this.esc(h.name)}</span>
        <button class="qs-close" onclick="UI.closeHeroSheet()">✕</button></div>
      <div class="qs-hp">
        <div class="qs-hprow">
          <button class="hp-step dmg" onclick="UI.qsHp('${id}',-1)">−</button>
          <div class="hp-bar"><div class="hp-fill ${pct < 35 ? "low" : ""}" style="width:${pct}%"></div><span class="hp-txt" id="qsHpTxt">${h.hp} / ${h.maxHp} PV</span></div>
          <button class="hp-step" onclick="UI.qsHp('${id}',1)">＋</button>
        </div>
        <div class="qs-dmg-grid">
          <button class="qs-dmg d" onclick="UI.qsHp('${id}',-5)">−5</button>
          <button class="qs-dmg d" onclick="UI.qsHp('${id}',-10)">−10</button>
          <button class="qs-dmg h" onclick="UI.qsHp('${id}',5)">+5</button>
          <button class="qs-dmg h" onclick="UI.qsHp('${id}','full')">Repos</button>
        </div>
        <div class="qs-custom"><input type="number" id="qsCustom" placeholder="montant"><button class="btn btn-danger btn-sm" onclick="UI.qsHpCustom('${id}',-1)">Dégâts</button><button class="btn btn-ghost btn-sm" onclick="UI.qsHpCustom('${id}',1)">Soin</button></div>
      </div>
      <div class="qs-section-t">États</div>
      <div class="qs-conds">${conds}</div>
      ${rolls}
      <button class="btn btn-ghost btn-block" onclick="UI.closeHeroSheet();UI.quickHero('${id}')">📜 Fiche complète</button>
    </div>`;
    document.body.appendChild(host);
  },
  closeHeroSheet() { const h = document.getElementById("sheetHost"); if (h) h.remove(); },
  _refreshSheet(id) {
    const h = State.hero(id); if (!h) return;
    const txt = document.getElementById("qsHpTxt");
    const pct = Math.round((h.hp / Math.max(1, h.maxHp)) * 100);
    if (txt) { txt.textContent = `${h.hp} / ${h.maxHp} PV`;
      const fill = txt.previousElementSibling; if (fill) { fill.style.width = pct + "%"; fill.classList.toggle("low", pct < 35); } }
    if (this.view === "play") this.renderPlay();
    else if (this.view === "heroes") this.renderHeroes();
  },
  qsHp(id, delta) {
    const h = State.hero(id); if (!h) return;
    const before = h.hp;
    if (delta === "full") h.hp = h.maxHp;
    else h.hp = Math.max(0, Math.min(h.maxHp, h.hp + delta));
    State.save();
    const d = h.hp - before;
    if (d) State.log({ kind: "event", text: `${h.name} : ${d > 0 ? "+" : ""}${d} PV (→ ${h.hp}/${h.maxHp})` });
    this._refreshSheet(id);
  },
  qsHpCustom(id, sign) {
    const v = parseInt(document.getElementById("qsCustom").value, 10); if (!v) return;
    document.getElementById("qsCustom").value = "";
    this.qsHp(id, sign * Math.abs(v));
  },
  qsCond(id, cd) {
    const h = State.hero(id); h.conditions = h.conditions || [];
    const i = h.conditions.indexOf(cd);
    if (i < 0) h.conditions.push(cd); else h.conditions.splice(i, 1);
    State.save();
    this.closeHeroSheet(); this.openHeroSheet(id);
    if (this.view === "play") this.renderPlay(); else if (this.view === "heroes") this.renderHeroes();
  },
  qsRoll(id, kind, key) {
    const h = State.hero(id); const c = State.current();
    this.closeHeroSheet();
    if (State.data.physicalDice) {
      if (kind === "init") { this._rollQueue = [{ label: h.name + " · Initiative", mod: DND.abilityMod(h, "DEX"), dc: 0 }]; }
      else { const b = DND.buildRoll(h, kind, key); this._rollQueue = [{ label: h.name + " · " + b.label, mod: b.mod, dc: (DATA.DICE_SYSTEMS[c.system] || {}).defaultDC }]; }
      this.nextPhysicalRoll(); return;
    }
    if (kind === "init") { const res = Dice.initiative(h); Dice.show(res, h.name + " · Initiative"); State.log({ kind: "dice", text: `${h.name} Initiative : ${res.detail} = ${res.total}` }); return; }
    const dc = (DATA.DICE_SYSTEMS[c.system] || {}).defaultDC;
    const res = Dice.check5e(h, kind, key, dc);
    Dice.show(res, res.label);
    State.log({ kind: "dice", text: `${res.label} : ${res.detail} = ${res.total} vs DD ${dc} → ${res.outcome}` });
  },

  // Envoie à l'Oracle, applique directives, log la réponse, gère les jets.
  async runOracle(text, mode, who) {
    const btn = document.getElementById(mode === "play" ? "playSend" : "oracleSend");
    if (btn) { btn.disabled = true; btn.textContent = "…"; }
    this.log_thinking(mode);
    const prompt = who ? `[${who}] ${text}` : text;
    let raw = await Oracle.ask(prompt, mode);
    // jets demandés
    const { text: t1, rolls, damage } = Oracle.extractRolls(raw);
    const { clean, effects } = Oracle.applyDirectives(t1);
    this.remove_thinking();
    const fx = effects.length ? effects.join(" · ") : "";
    if (mode === "play") State.log({ kind: "oracle", text: clean, fx });
    else { State.current().chat.push({ kind: "oracle", text: clean, t: Date.now() }); State.save(); }
    if (mode === "play" && State.data.autoRead && clean) this.speakNarration(clean);
    if (btn) { btn.disabled = false; btn.textContent = mode === "play" ? "▶" : "▶"; }
    // exécute les jets demandés par l'Oracle
    if (rolls.length || damage.length) this.resolveAll(rolls, damage);
    if (mode === "play") this.renderPlay(); else this.renderOracle();
    this.renderHeader();
  },

  // Lance automatiquement la consigne de génération/reprise (une seule fois).
  runKickoff() {
    const c = State.current();
    if (!c || !c.kickoff) return;
    const prompt = c.kickoff;
    c.kickoff = ""; State.save();
    this.go("play");
    this.toast(c.origin === "resume" ? "🔄 L'Oracle reprend le fil…" : "✨ L'Oracle bâtit ta campagne…");
    this.runOracle(prompt, "play", "");
  },

  // Intro d'ouverture rejouable : présente l'histoire, les héros et le lieu de départ.
  introduce() {
    const prompt = "Fais l'INTRODUCTION de la partie en DEUX temps, claire et précise, pour que joueurs et MJ sachent exactement où on en est.\n\n" +
      "1) « 📖 CONTEXTE » (hors-fiction, pour situer la table) : en 4-6 phrases SIMPLES et CONCRÈTES, explique — QUI est le groupe (nomme CHAQUE héros et son rôle) ; OÙ ils se trouvent précisément ; COMMENT ils sont arrivés là ; la SITUATION actuelle (ce qui se passe maintenant) ; et leur OBJECTIF / l'enjeu immédiat. Pas de flou : on doit comprendre la mission et le point de départ.\n\n" +
      "2) « 🎬 OUVERTURE » (en RP, 100% immersif et diégétique) : après une ligne de séparation, plonge les héros dans la scène via une SOURCE DU MONDE (une voix / l'IA de bord, une transmission, un journal) ou une scène sensorielle forte, fidèle à l'univers et au ton. Termine par un élément de la fiction qui appelle une réaction (un événement, un danger, un PNJ qui s'adresse à eux) — jamais par une question méta type « que faites-vous ? ».\n\n" +
      "Mets bien les deux titres « 📖 CONTEXTE » et « 🎬 OUVERTURE ». Pose la scène et les éléments utiles via tes directives.";
    this.runOracle(prompt, "play", "");
  },

  log_thinking(mode) {
    const feed = document.getElementById(mode === "play" ? "feed" : "oracleFeed");
    if (!feed) return;
    const d = document.createElement("div");
    d.className = "c-oracle thinking"; d.id = "thinkingBubble";
    d.innerHTML = `<div class="c-oracle-head">🔮 Oracle</div><span class="dots"><i></i><i></i><i></i></span>`;
    feed.appendChild(d); feed.scrollTop = feed.scrollHeight;
  },
  remove_thinking() { const t = document.getElementById("thinkingBubble"); if (t) t.remove(); },

  /* ---------- Résolution des jets + dégâts demandés par l'Oracle ---------- */
  resolveAll(rolls, damage) {
    const c = State.current();
    if (State.data.physicalDice) {
      this._rollQueue = [
        ...rolls.map(r => this.buildRollReq(c, r)),
        ...(damage || []).map(dg => this.buildDamageReq(c, dg)),
      ];
      this.nextPhysicalRoll();
    } else {
      rolls.forEach(r => this.autoRoll(c, r));
      (damage || []).forEach(dg => this.autoDamage(c, dg));
    }
  },
  buildRollReq(c, r) {
    const h = State.heroByName(r.who);
    const dc = r.dc || (DATA.DICE_SYSTEMS[c.system] || {}).defaultDC;
    if (c.system === "dnd5e" && h && (r.skill || r.save || r.ability || r.attack)) {
      const kind = r.skill ? "skill" : r.save ? "save" : r.attack ? "attack" : "ability";
      const key = r.skill || r.save || r.attack || r.ability;
      const b = DND.buildRoll(h, kind, key, r.bonus || 0);
      return { kind: "check", label: (h ? h.name + " · " : "") + b.label, mod: b.mod, dc, adv: r.adv, dis: r.dis };
    }
    return { kind: "check", label: (r.who ? r.who + " · " : "") + (r.skill || r.save || "Jet"), mod: 0, dc, adv: r.adv, dis: r.dis };
  },
  buildDamageReq(c, dg) {
    const h = State.heroByName(dg.target);
    return { kind: "damage", label: dg.label + (dg.type ? " (" + dg.type + ")" : ""), formula: dg.formula, targetHeroId: h ? h.id : null, targetName: dg.target };
  },
  autoDamage(c, dg) {
    const r = Dice.roll(dg.formula);
    Dice.show(r, dg.label + " · dégâts");
    this._applyDmg(r.total, null, dg.target, dg.label + " " + dg.formula);
  },
  // Applique des dégâts : à un héros (PV + entrée de combat) OU à un ennemi du suivi d'initiative.
  _applyDmg(total, heroId, targetName, note) {
    const c = State.current();
    const h = heroId ? State.hero(heroId) : (targetName ? State.heroByName(targetName) : null);
    let line;
    if (h) {
      const before = h.hp;
      h.hp = Math.max(0, before - total);
      if (c.combat) { const e = c.combat.order.find(o => o.id === h.id || o.name === h.name); if (e && e.hp != null) e.hp = Math.max(0, e.hp - total); }
      let extra = "";
      if (before === 0) { // déjà inconscient : dégâts = échec de sauvegarde contre la mort (règle 5e)
        h.deathSaves.f = Math.min(3, (h.deathSaves.f || 0) + 1);
        extra = h.deathSaves.f >= 3 ? " — 💀 mort" : ` — échec contre la mort (${h.deathSaves.f}/3)`;
      } else if ((total - before) >= h.maxHp) { // dégâts massifs → mort instantanée
        h.deathSaves = { s: 0, f: 3 }; extra = " — 💀 mort sur le coup (dégâts massifs)";
      } else if (h.hp === 0) extra = " — à terre, inconscient";
      line = `${h.name} subit ${total} dégâts (→ ${h.hp}/${h.maxHp})${extra}`;
      State.log({ kind: "event", text: line });
    } else if (targetName && c.combat) {
      const e = c.combat.order.find(o => o.name.toLowerCase() === (targetName || "").toLowerCase());
      if (e && e.hp != null) { e.hp = Math.max(0, e.hp - total); line = `${targetName} subit ${total} dégâts (→ ${e.hp} PV)${e.hp <= 0 ? " — vaincu !" : ""}`; }
      else line = `Dégâts sur ${targetName} : ${total}`;
      State.log({ kind: "event", text: line });
    } else {
      line = `Dégâts : ${note || total}`;
      State.log({ kind: "dice", text: line });
    }
    State.save();
    return line;
  },
  autoRoll(c, r) {
    const h = State.heroByName(r.who);
    const dc = r.dc || (DATA.DICE_SYSTEMS[c.system] || {}).defaultDC;
    if (c.system === "dnd5e" && h && (r.skill || r.save || r.ability || r.attack)) {
      const kind = r.skill ? "skill" : r.save ? "save" : r.attack ? "attack" : "ability";
      const key = r.skill || r.save || r.attack || r.ability;
      const res = Dice.check5e(h, kind, key, dc, { bonus: r.bonus, adv: r.adv, dis: r.dis });
      Dice.show(res, res.label);
      State.log({ kind: "dice", text: `${res.label} : ${res.detail} = ${res.total} vs DD ${dc} → ${res.outcome}` });
    } else {
      const formula = r.formula || (DATA.DICE_SYSTEMS[c.system] || {}).formula || "1d20";
      const res = Dice.check(formula, dc, c.system);
      Dice.show(res, (r.who ? r.who + " · " : "") + (r.skill || r.save || "Jet"));
      State.log({ kind: "dice", text: `${r.who || ""} ${r.skill || r.save || ""} : ${res.detail} = ${res.total} → ${res.outcome}` });
    }
  },
  nextPhysicalRoll() {
    if (!this._rollQueue || !this._rollQueue.length) { if (this.view === "play") this.renderPlay(); return; }
    this._curRoll = this._rollQueue.shift();
    if (this._curRoll.kind === "damage") this.showDamageRequest(this._curRoll);
    else this.showRollRequest(this._curRoll);
  },
  showDamageRequest(req) {
    const host = document.createElement("div");
    host.className = "dice-overlay"; host.id = "rollReq";
    host.innerHTML = `<div class="dice-pop">
      <div class="rr-label">💥 ${this.esc(req.label)} — dégâts</div>
      <div class="rr-dc">Lance <b>${this.esc(req.formula)}</b>${req.targetName ? " sur " + this.esc(req.targetName) : ""}</div>
      <div class="rr-hint">Lance tes <b>dés de dégâts physiques</b> et entre le <b>total</b> :</div>
      <input type="number" id="rrFace" min="0" inputmode="numeric" placeholder="total">
      <button class="btn btn-primary btn-block" onclick="UI.submitDamage()">Valider</button>
    </div>`;
    document.body.appendChild(host);
    setTimeout(() => { const i = document.getElementById("rrFace"); if (i) { i.focus(); i.onkeydown = e => { if (e.key === "Enter") UI.submitDamage(); }; } }, 30);
  },
  submitDamage() {
    const total = parseInt(document.getElementById("rrFace").value, 10);
    if (isNaN(total) || total < 0) { this.toast("Entre le total des dégâts", "warn"); return; }
    const req = this._curRoll;
    const line = this._applyDmg(total, req.targetHeroId, req.targetName, req.label + " " + req.formula + " = " + total);
    const pop = document.querySelector("#rollReq .dice-pop");
    if (pop) pop.innerHTML = `<div class="dice-pop-face">${total}</div>
      <div class="dice-pop-formula">${this.esc(req.label)} · ${this.esc(req.formula)}</div>
      <div class="dice-pop-result ko">${this.esc(line)}</div>
      <button class="btn btn-primary btn-block" onclick="UI.closeRollRequest()">Continuer</button>`;
  },
  showRollRequest(req) {
    const modTxt = req.mod ? (req.mod >= 0 ? "+" + req.mod : "" + req.mod) : "+0";
    const advNote = req.adv ? " · avantage (lance 2d20, garde le meilleur)" : req.dis ? " · désavantage (lance 2d20, garde le pire)" : "";
    const host = document.createElement("div");
    host.className = "dice-overlay"; host.id = "rollReq";
    host.innerHTML = `<div class="dice-pop">
      <div class="rr-label">🎲 ${this.esc(req.label)}</div>
      <div class="rr-dc">DD ${req.dc} · modificateur <b>${modTxt}</b>${advNote}</div>
      <div class="rr-hint">Lance ton <b>d20 physique</b> et entre le chiffre du dé :</div>
      <input type="number" id="rrFace" min="1" max="20" inputmode="numeric" placeholder="d20" autofocus>
      <div class="rr-total" id="rrTotal"></div>
      <button class="btn btn-primary btn-block" id="rrValid" onclick="UI.submitPhysicalRoll()">Valider</button>
    </div>`;
    document.body.appendChild(host);
    setTimeout(() => { const i = document.getElementById("rrFace"); if (i) { i.focus(); i.oninput = () => UI.previewRollTotal(); i.onkeydown = e => { if (e.key === "Enter") UI.submitPhysicalRoll(); }; } }, 30);
  },
  previewRollTotal() {
    const face = parseInt(document.getElementById("rrFace").value, 10);
    const el = document.getElementById("rrTotal"); if (!el) return;
    if (!face) { el.textContent = ""; return; }
    el.textContent = `Total : ${face} ${this._curRoll.mod >= 0 ? "+" : ""}${this._curRoll.mod} = ${face + this._curRoll.mod}`;
  },
  submitPhysicalRoll() {
    const face = parseInt(document.getElementById("rrFace").value, 10);
    if (!face || face < 1 || face > 20) { this.toast("Entre le chiffre du dé (1-20)", "warn"); return; }
    const req = this._curRoll;
    const total = face + req.mod;
    const modS = `${req.mod >= 0 ? "+" : ""}${req.mod}`;
    let outcome = null, cls = "";
    if (req.dc) {
      if (face === 20) { outcome = "Réussite critique !"; cls = "crit"; }
      else if (face === 1) { outcome = "Échec critique !"; cls = "ko"; }
      else if (total >= req.dc) { outcome = "Réussite"; cls = "ok"; }
      else { outcome = "Échec"; cls = "ko"; }
    }
    State.log({ kind: "dice", text: `${req.label} : d20(${face})${modS} = ${total}${req.dc ? " vs DD " + req.dc + " → " + outcome : ""}` });
    const pop = document.querySelector("#rollReq .dice-pop");
    if (pop) pop.innerHTML = `<div class="dice-pop-face">${total}</div>
      <div class="dice-pop-formula">${this.esc(req.label)} · d20(${face}) ${modS}</div>
      <div class="dice-pop-result ${cls}">${outcome ? outcome + " — " + total + " vs DD " + req.dc : "Total : " + total}</div>
      <button class="btn btn-primary btn-block" onclick="UI.closeRollRequest()">Continuer</button>`;
  },
  closeRollRequest() { const h = document.getElementById("rollReq"); if (h) h.remove(); this._curRoll = null; this.nextPhysicalRoll(); },

  /* ============================================================
     HÉROS
     ============================================================ */
  renderHeroes() {
    const c = State.current();
    const is5e = c.system === "dnd5e";
    const el = document.getElementById("view-heroes");
    const cards = c.heroes.map(h => {
      const hpPct = Math.round((h.hp / Math.max(1, h.maxHp)) * 100);
      const stats = is5e
        ? DND.ABILITY_ORDER.map(a => `<span class="stat-pill">${a} <b>${DND.modStr(h.abilities[a])}</b> <i>${h.abilities[a] || 10}</i></span>`).join("")
        : Object.entries(h.stats || {}).map(([k, v]) => `<span class="stat-pill">${this.esc(k.slice(0, 3))} <b>${v >= 0 ? "+" : ""}${v}</b></span>`).join("");
      const clsName = this.skinCls(h.cls);
      const clsLabel = clsName !== h.cls ? `${this.esc(clsName)} <span class="cls-base">(${this.esc(h.cls)})</span>` : this.esc(h.cls);
      const subtitle = is5e
        ? `${this.esc(h.race)} · ${clsLabel} niv.${h.level}`
        : this.esc(h.concept || "—");
      return `<div class="card hero-card" onclick="UI.editHero('${h.id}')">
        <div class="hero-top">
          <div class="hero-ava">${h.avatar}</div>
          <div class="hero-id">
            <div class="hero-name">${this.esc(h.name)}</div>
            <div class="hero-concept">${subtitle}${h.player ? " · <span class='hero-player'>" + this.esc(h.player) + "</span>" : ""}</div>
          </div>
          <div class="hero-armor">🛡️ ${h.armor}${is5e ? `<span class="prof-b">maît. +${DND.profBonus(h.level)}</span>` : ""}</div>
        </div>
        <div class="hp-row" onclick="event.stopPropagation()">
          <button class="hp-step dmg" onclick="UI.qsHp('${h.id}',-1)">−</button>
          <div class="hp-bar"><div class="hp-fill ${hpPct < 30 ? "low" : ""}" style="width:${hpPct}%"></div><span class="hp-txt">${h.hp} / ${h.maxHp} PV</span></div>
          <button class="hp-step" onclick="UI.qsHp('${h.id}',1)">＋</button>
        </div>
        ${stats ? `<div class="stat-row">${stats}</div>` : ""}
        ${h.conditions && h.conditions.length ? `<div class="cond-row">${h.conditions.map(x => `<span class="cond">${this.esc(x)}</span>`).join("")}</div>` : ""}
        ${h.gear && h.gear.length ? `<div class="gear-row">🎒 ${h.gear.map(x => this.esc(x)).join(", ")}</div>` : ""}
        ${is5e && DND.canLevelUp(h) ? `<div class="card-lvlup">⬆️ Peut monter de niveau ${DND.levelForXp(h.xp)} !</div>` : ""}
        ${is5e && this.isBlankHero(h) ? `<button class="card-optimize" onclick="event.stopPropagation();UI.optimizeHero('${h.id}')">⚡ Optimiser ce héros (caracs + compétences de sa classe)</button>` : ""}
      </div>`;
    }).join("");
    el.innerHTML = `
      <div class="section-head"><h2>🛡️ Les héros</h2><span class="count">${c.heroes.length}</span></div>
      ${c.heroes.length ? cards : `<div class="empty">Aucun héros. Ajoute les personnages de tes 4 joueurs.</div>`}
      ${c.heroes.some(h => this.isBlankHero(h)) ? `<button class="btn btn-primary btn-block" onclick="UI.optimizeAll()">⚡ Optimiser tous les héros (caracs + compétences)</button>` : ""}
      <button class="btn btn-ghost btn-block" onclick="UI.newHero()">＋ Ajouter un héros</button>`;
  },

  newHero() { const h = State.addHero(); this.renderHeroes(); this.editHero(h.id); },
  isBlankHero(h) { return DND.ABILITY_ORDER.every(a => (h.abilities[a] || 10) === 10) && (!h.skillProfs || !h.skillProfs.length); },
  optimizeHero(id) {
    const h = State.hero(id); if (!h) return;
    State.applyBuild(h); State.save();
    this.toast(`⚡ ${h.name} optimisé (${h.cls}) — caracs, compétences, équipement`, "ok");
    if (this.view === "heroes") this.renderHeroes(); else this.editHero(id);
  },
  optimizeAll() {
    const c = State.current(); let n = 0;
    (c.heroes || []).forEach(h => { if (this.isBlankHero(h)) { State.applyBuild(h); n++; } });
    State.save(); this.renderHeroes();
    this.toast(n ? `⚡ ${n} héros optimisé(s)` : "Tous les héros sont déjà optimisés", "ok");
  },

  editHero(id) {
    const c = State.current();
    const h = State.hero(id); if (!h) return;
    const is5e = c.system === "dnd5e";
    const el = document.getElementById("view-heroes");
    const avatars = DATA.AVATARS.map(a => `<button class="ava-opt ${a === h.avatar ? "sel" : ""}" onclick="UI.setHeroField('${id}','avatar','${a}')">${a}</button>`).join("");

    let body;
    if (is5e) {
      const abInputs = DND.ABILITY_ORDER.map(a => `<label class="ab-edit">
        <span class="ab-key">${a}</span>
        <input type="number" min="1" max="30" value="${h.abilities[a] || 10}" onchange="UI.setAbility('${id}','${a}',this.value)">
        <span class="ab-mod" id="mod-${id}-${a}">${DND.modStr(h.abilities[a])}</span></label>`).join("");
      const cl = DND.CLASSES[h.cls] || {};
      const skillGroups = Object.entries(DND.SKILLS).map(([sk, ab]) => {
        const on = (h.skillProfs || []).includes(sk);
        const m = DND.skillMod(h, sk);
        return `<button class="sk-chip ${on ? "on" : ""}" onclick="UI.toggleSkill('${id}','${this.esc(sk)}')">${this.esc(sk)} <b>${m >= 0 ? "+" : ""}${m}</b> <i>${ab}</i></button>`;
      }).join("");
      const saveChips = DND.ABILITY_ORDER.map(a => {
        const on = (h.saveProfs || []).includes(a);
        const m = DND.saveMod(h, a);
        return `<button class="sk-chip ${on ? "on" : ""}" onclick="UI.toggleSave('${id}','${a}')">${a} <b>${m >= 0 ? "+" : ""}${m}</b></button>`;
      }).join("");
      body = `
        <div class="two">
          <label class="f">Espèce (race)<select onchange="UI.setHeroField('${id}','race',this.value)">${Object.keys(DND.RACES).map(r => `<option ${r === h.race ? "selected" : ""}>${r}</option>`).join("")}</select></label>
          <label class="f">Classe<select onchange="UI.setHeroClass('${id}',this.value)">${Object.keys(DND.CLASSES).map(cl => `<option ${cl === h.cls ? "selected" : ""}>${cl}</option>`).join("")}</select></label>
          <label class="f">Niveau<input type="number" min="1" max="20" value="${h.level}" onchange="UI.setHeroLevel('${id}',this.value)"></label>
          <label class="f">Sous-classe / archétype<input value="${this.esc(h.concept)}" placeholder="optionnel" onchange="UI.setHeroField('${id}','concept',this.value)"></label>
        </div>
        <div class="race-note">${this.esc((DND.RACES[h.race] || {}).note || "")} · maîtrise <b>+${DND.profBonus(h.level)}</b></div>

        <button class="btn btn-primary btn-block" onclick="UI.optimizeHero('${id}')">⚡ Optimiser pour ${this.esc(h.cls)} (caracs, compétences, équipement recommandés)</button>
        <h3 class="mini-h3">Caractéristiques <button class="gen-btn" onclick="UI.genAbilities('${id}','array')">Tableau standard</button><button class="gen-btn" onclick="UI.genAbilities('${id}','roll')">🎲 4d6</button></h3>
        <div class="ab-grid">${abInputs}</div>

        <div class="two">
          <label class="f">PV actuels<input type="number" value="${h.hp}" onchange="UI.setHeroHp('${id}',this.value)"></label>
          <label class="f">PV max<input type="number" value="${h.maxHp}" onchange="UI.setHeroHp('${id}',this.value,true)"></label>
          <label class="f">CA (armure)<input type="number" value="${h.armor}" onchange="UI.setHeroField('${id}','armor',this.value)"></label>
          <label class="f">Vitesse (m)<input type="number" step="1.5" value="${h.speed}" onchange="UI.setHeroField('${id}','speed',this.value)"></label>
        </div>
        <div class="hd-line">🎲 Dés de vie : <b>${this.esc(h.hitDice)}</b> · Init : <b>+${DND.abilityMod(h, "DEX")}</b> · Jets de mort : ${"●".repeat(h.deathSaves.s)}${"○".repeat(3 - h.deathSaves.s)} / ${"✕".repeat(h.deathSaves.f)}${"○".repeat(3 - h.deathSaves.f)}</div>
        <div class="xp-line">✨ XP : <b>${h.xp || 0}</b>${DND.xpForNext(h.level) != null ? ` / ${DND.xpForNext(h.level)} <span class="cls-base">(niv. ${h.level + 1})</span>` : " — niveau max"}
          <input type="number" class="xp-in" value="${h.xp || 0}" onchange="UI.setHeroField('${id}','xp',this.value)" title="XP">
          ${DND.canLevelUp(h) ? `<button class="btn btn-primary btn-sm lvlup" onclick="UI.levelUp('${id}')">⬆️ Passer niveau ${DND.levelForXp(h.xp)}</button>` : ""}</div>

        ${this.restBlock(h, id)}

        <h3 class="mini-h3">Sauvegardes maîtrisées</h3>
        <div class="sk-wrap">${saveChips}</div>
        <h3 class="mini-h3">Compétences maîtrisées</h3>
        <div class="sk-wrap">${skillGroups}</div>

        <label class="f">Sorts / emplacements<textarea rows="2" onchange="UI.setHeroField('${id}','spells',this.value)" placeholder="ex : niv.1 (3), Projectile magique, Bouclier…">${this.esc(h.spells)}</textarea></label>
        <label class="f">Dons / capacités / atouts<textarea rows="2" onchange="UI.setHeroField('${id}','feats',this.value)">${this.esc(h.feats)}</textarea></label>`;
    } else {
      const statInputs = c.attrs.map(a =>
        `<label class="stat-edit">${this.esc(a)}<input type="number" value="${h.stats[a] || 0}" onchange="UI.setHeroStat('${id}','${this.esc(a)}',this.value)"></label>`).join("");
      body = `
        <label class="f">Concept / classe / rôle<input value="${this.esc(h.concept)}" placeholder="ex : Netrunner…" onchange="UI.setHeroField('${id}','concept',this.value)"></label>
        <div class="two">
          <label class="f">PV actuels<input type="number" value="${h.hp}" onchange="UI.setHeroField('${id}','hp',this.value)"></label>
          <label class="f">PV max<input type="number" value="${h.maxHp}" onchange="UI.setHeroField('${id}','maxHp',this.value)"></label>
          <label class="f">Défense<input type="number" value="${h.armor}" onchange="UI.setHeroField('${id}','armor',this.value)"></label>
          <label class="f">XP<input type="number" value="${h.xp}" onchange="UI.setHeroField('${id}','xp',this.value)"></label>
        </div>
        <h3 class="mini-h3">Attributs (${this.esc((DATA.DICE_SYSTEMS[c.system] || {}).name || c.system)})</h3>
        <div class="stats-edit">${statInputs}</div>
        <label class="f">Capacités spéciales<textarea rows="2" onchange="UI.setHeroField('${id}','feats',this.value)">${this.esc(h.feats)}</textarea></label>`;
    }

    el.innerHTML = `
      <button class="btn btn-ghost btn-sm" onclick="UI.renderHeroes()">← Retour</button>
      <div class="card">
        <div class="ava-picker">${avatars}</div>
        <label class="f">Nom du personnage<input value="${this.esc(h.name)}" onchange="UI.setHeroField('${id}','name',this.value)"></label>
        <label class="f">Joueur (à la table)<input value="${this.esc(h.player)}" placeholder="ex : Loris" onchange="UI.setHeroField('${id}','player',this.value)"></label>
        ${body}
        <label class="f">Inventaire (un objet par ligne)<textarea rows="3" onchange="UI.setHeroGear('${id}',this.value)">${(h.gear || []).map(x => this.esc(x)).join("\n")}</textarea></label>
        <label class="f">États / conditions (virgules)<input value="${(h.conditions || []).map(x => this.esc(x)).join(", ")}" onchange="UI.setHeroCond('${id}',this.value)"></label>
        <label class="f">Liens / relations<input value="${this.esc(h.bonds)}" onchange="UI.setHeroField('${id}','bonds',this.value)"></label>
        <label class="f">Notes<textarea rows="2" onchange="UI.setHeroField('${id}','notes',this.value)">${this.esc(h.notes)}</textarea></label>
        <button class="btn btn-danger btn-sm" onclick="UI.delHero('${id}')">Supprimer ce héros</button>
      </div>`;
  },
  setAbility(id, a, v) { const h = State.hero(id); h.abilities[a] = Math.max(1, Math.min(30, parseInt(v, 10) || 10)); State.save(); const el = document.getElementById(`mod-${id}-${a}`); if (el) el.textContent = DND.modStr(h.abilities[a]); this.renderHeader(); },
  setHeroClass(id, v) { const h = State.hero(id); h.cls = v; const cl = DND.CLASSES[v]; if (cl) { h.saveProfs = cl.saves.slice(); h.hitDice = h.level + "d" + cl.hd; } State.save(); this.editHero(id); },
  setHeroLevel(id, v) { const h = State.hero(id); h.level = Math.max(1, Math.min(20, parseInt(v, 10) || 1)); const cl = DND.CLASSES[h.cls]; if (cl) h.hitDice = h.level + "d" + cl.hd; State.save(); this.editHero(id); },
  levelUp(id) {
    const h = State.hero(id); if (!h || !DND.canLevelUp(h)) return;
    h.level = Math.min(20, (h.level || 1) + 1);
    const cl = DND.CLASSES[h.cls]; const conMod = DND.mod(h.abilities.CON);
    const gain = DND.hpGainOnLevel(h.cls, conMod);
    h.maxHp += gain; h.hp += gain;
    if (cl) h.hitDice = h.level + "d" + cl.hd;
    State.save();
    State.log({ kind: "event", text: `⬆️ ${h.name} passe niveau ${h.level} ! +${gain} PV, maîtrise +${DND.profBonus(h.level)}. Demande à l'Oracle les capacités débloquées.` });
    this.toast(`⬆️ ${h.name} niveau ${h.level} ! +${gain} PV`, "ok");
    this.editHero(id); this.renderHeader();
  },
  setHeroHp(id, v, max) { const h = State.hero(id); h._hpTouched = true; if (max) h.maxHp = parseInt(v, 10) || 0; else h.hp = parseInt(v, 10) || 0; State.save(); },
  toggleSkill(id, sk) { const h = State.hero(id); h.skillProfs = h.skillProfs || []; const i = h.skillProfs.indexOf(sk); if (i < 0) h.skillProfs.push(sk); else h.skillProfs.splice(i, 1); State.save(); this.editHero(id); },
  toggleSave(id, a) { const h = State.hero(id); h.saveProfs = h.saveProfs || []; const i = h.saveProfs.indexOf(a); if (i < 0) h.saveProfs.push(a); else h.saveProfs.splice(i, 1); State.save(); this.editHero(id); },
  genAbilities(id, mode) {
    const h = State.hero(id);
    let vals;
    if (mode === "array") vals = DND.STANDARD_ARRAY.slice();
    else vals = DND.ABILITY_ORDER.map(() => Dice.roll("4d6k3").total).sort((a, b) => b - a);
    // affecte aux caracs principales de la classe en priorité
    const cl = DND.CLASSES[h.cls] || { primary: [] };
    const order = [...cl.primary, ...DND.ABILITY_ORDER.filter(a => !cl.primary.includes(a))];
    order.forEach((a, i) => { h.abilities[a] = vals[i]; });
    State.applyClassDefaults(h);
    State.save(); this.editHero(id);
    this.toast(mode === "array" ? "Tableau standard réparti (caracs de classe en priorité)" : "🎲 Caracs tirées au 4d6 garde 3", "ok");
  },
  setHeroField(id, f, v) { const h = State.hero(id); if (!h) return; if (["hp", "maxHp", "armor", "xp", "gold"].includes(f)) v = parseInt(v, 10) || 0; else if (f === "speed") v = parseFloat(v) || 0; h[f] = v; State.save(); if (f === "avatar") this.editHero(id); this.renderHeader(); },

  /* ---------- Repos, emplacements de sorts, jets de mort, or ---------- */
  restBlock(h, id) {
    const isCaster = DND.isCaster(h.cls);
    const maxSlots = isCaster ? DND.slotsFor(h.cls, h.level) : {};
    const hdMax = h.level; const hdLeft = hdMax - (h.hitDiceUsed || 0);
    let slotsHtml = "";
    if (isCaster) {
      const levels = Object.keys(maxSlots).filter(k => k !== "pact").map(Number).sort((a, b) => a - b);
      if (levels.length) slotsHtml = `<div class="qs-section-t">Emplacements de sorts${maxSlots.pact ? " · Pacte (niv. " + maxSlots.pact + ")" : ""}</div>
        <div class="slot-wrap">${levels.map(lv => {
          const max = maxSlots[lv]; const used = (h.slotsUsed && h.slotsUsed[lv]) || 0;
          const pips = Array.from({ length: max }, (_, i) => `<button class="slot-pip ${i < used ? "used" : ""}" onclick="UI.setSlot('${id}',${lv},${i + 1})"></button>`).join("");
          return `<div class="slot-row"><span class="slot-lv">Niv.${lv}</span>${pips}<span class="slot-n">${max - used}/${max}</span></div>`;
        }).join("")}</div>`;
    }
    const downed = h.hp <= 0 ? `<div class="death-box">
        <div class="qs-section-t">💀 Sauvegardes contre la mort</div>
        <div class="death-row">Réussites ${"●".repeat(h.deathSaves.s)}${"○".repeat(3 - h.deathSaves.s)} · Échecs ${"✕".repeat(h.deathSaves.f)}${"○".repeat(3 - h.deathSaves.f)}</div>
        <div class="two-inline"><button class="btn btn-primary btn-sm btn-block" onclick="UI.deathSave('${id}')">🎲 Jet contre la mort</button><button class="btn btn-ghost btn-sm" onclick="UI.resetDeath('${id}')">↺</button></div>
      </div>` : "";
    return `<h3 class="mini-h3">Repos & ressources</h3>
      <div class="rest-row">
        <button class="btn btn-ghost btn-sm" onclick="UI.restShort('${id}')">🌙 Repos court · dés de vie ${hdLeft}/${hdMax}</button>
        <button class="btn btn-primary btn-sm" onclick="UI.restLong('${id}')">🛌 Repos long</button>
      </div>
      <label class="f" style="margin-top:11px">💰 Or (po)<input type="number" value="${h.gold || 0}" onchange="UI.setHeroField('${id}','gold',this.value)"></label>
      ${slotsHtml}${downed}`;
  },
  setSlot(id, lv, n) { const h = State.hero(id); h.slotsUsed = h.slotsUsed || {}; const cur = h.slotsUsed[lv] || 0; const max = DND.slotsFor(h.cls, h.level)[lv] || 0; h.slotsUsed[lv] = Math.max(0, Math.min(max, cur === n ? n - 1 : n)); State.save(); this.editHero(id); },
  restLong(id) {
    const h = State.hero(id);
    // Règle 5e : PV au max, tous les emplacements, et la MOITIÉ des dés de vie (min 1)
    const regain = Math.max(1, Math.floor(h.level / 2));
    h.hp = h.maxHp; h.deathSaves = { s: 0, f: 0 }; h.slotsUsed = {};
    h.hitDiceUsed = Math.max(0, (h.hitDiceUsed || 0) - regain);
    State.save(); State.log({ kind: "event", text: `🛌 ${h.name} termine un repos long : PV au max, emplacements récupérés, +${regain} dé(s) de vie.` });
    this.toast("🛌 Repos long", "ok"); this.editHero(id); this.renderHeader();
  },
  restShort(id) {
    const h = State.hero(id);
    if ((h.hitDiceUsed || 0) >= h.level) { this.toast("Plus de dés de vie (repos long nécessaire)", "warn"); return; }
    const hd = (DND.CLASSES[h.cls] || { hd: 8 }).hd;
    const heal = Math.max(1, Dice.rollDie(hd) + DND.mod(h.abilities.CON));
    h.hp = Math.min(h.maxHp, h.hp + heal); h.hitDiceUsed = (h.hitDiceUsed || 0) + 1;
    if (DND.CASTER_TYPE[h.cls] === "pact") h.slotsUsed = {}; // le Pacte récupère au repos court
    State.save(); State.log({ kind: "event", text: `🌙 ${h.name} : repos court, dé de vie 1d${hd} → +${heal} PV (${h.hp}/${h.maxHp}).` });
    this.toast(`🌙 +${heal} PV`, "ok"); this.editHero(id);
  },
  resetDeath(id) { const h = State.hero(id); h.deathSaves = { s: 0, f: 0 }; State.save(); this.editHero(id); },
  deathSave(id) {
    if (State.data.physicalDice) { this._deathId = id; this.showDeathRequest(id); }
    else this._applyDeath(id, Dice.rollDie(20));
  },
  showDeathRequest(id) {
    const host = document.createElement("div");
    host.className = "dice-overlay"; host.id = "rollReq";
    host.innerHTML = `<div class="dice-pop">
      <div class="rr-label">💀 Sauvegarde contre la mort</div>
      <div class="rr-dc">Réussite sur <b>10+</b> · 20 = tu reviens à toi · 1 = 2 échecs</div>
      <div class="rr-hint">Lance ton <b>d20 physique</b> :</div>
      <input type="number" id="rrFace" min="1" max="20" inputmode="numeric" placeholder="d20">
      <button class="btn btn-primary btn-block" onclick="UI.submitDeath()">Valider</button>
    </div>`;
    document.body.appendChild(host);
    setTimeout(() => { const i = document.getElementById("rrFace"); if (i) { i.focus(); i.onkeydown = e => { if (e.key === "Enter") UI.submitDeath(); }; } }, 30);
  },
  submitDeath() {
    const face = parseInt(document.getElementById("rrFace").value, 10);
    if (!face || face < 1 || face > 20) { this.toast("Entre le d20 (1-20)", "warn"); return; }
    const h = document.getElementById("rollReq"); if (h) h.remove();
    this._applyDeath(this._deathId, face);
  },
  _applyDeath(id, face) {
    const h = State.hero(id); if (!h) return;
    let msg;
    if (face === 20) { h.hp = 1; h.deathSaves = { s: 0, f: 0 }; msg = `${h.name} revient à lui avec 1 PV ! (20 naturel)`; }
    else if (face === 1) { h.deathSaves.f = Math.min(3, h.deathSaves.f + 2); msg = `${h.name} : 1 naturel — 2 échecs !`; }
    else if (face >= 10) { h.deathSaves.s = Math.min(3, h.deathSaves.s + 1); msg = `${h.name} : réussite (${face}).`; }
    else { h.deathSaves.f = Math.min(3, h.deathSaves.f + 1); msg = `${h.name} : échec (${face}).`; }
    if (h.deathSaves.s >= 3) msg += " Stabilisé.";
    if (h.deathSaves.f >= 3) msg += " 💀 Mort.";
    State.save(); State.log({ kind: "event", text: "💀 " + msg });
    this.toast(msg, face >= 10 && face !== 1 ? "ok" : "warn");
    this.editHero(id); this.renderHeader();
  },
  setHeroStat(id, k, v) { const h = State.hero(id); h.stats[k] = parseInt(v, 10) || 0; State.save(); },
  setHeroGear(id, v) { const h = State.hero(id); h.gear = v.split("\n").map(s => s.trim()).filter(Boolean); State.save(); },
  setHeroCond(id, v) { const h = State.hero(id); h.conditions = v.split(",").map(s => s.trim()).filter(Boolean); State.save(); },
  delHero(id) { if (confirm("Supprimer ce héros ?")) { State.removeHero(id); this.renderHeroes(); } },

  /* ============================================================
     UNIVERS
     ============================================================ */
  renderWorld() {
    const c = State.current();
    const el = document.getElementById("view-world");
    const g = DATA.GENRES[c.genre] || DATA.GENRES.custom;
    const list = (arr, render, empty) => arr.length ? arr.map(render).join("") : `<div class="empty-sm">${empty}</div>`;
    el.innerHTML = `
      <div class="card">
        <h3>🌍 La campagne</h3>
        <div class="pitch-line"><b>${g.ico} ${this.esc(g.name)}</b> · ${this.esc((DATA.TONES[c.tone] || {}).name || c.tone)}</div>
        <label class="f">Pitch<textarea rows="3" onchange="UI.setCampField('pitch',this.value)">${this.esc(c.pitch)}</textarea></label>
        <label class="f">Enjeu central<textarea rows="2" onchange="UI.setCampField('stakes',this.value)">${this.esc(c.stakes)}</textarea></label>
      </div>

      <div class="card">
        <h3>🎯 Quêtes & objectifs <button class="add-x" onclick="UI.addWorld('quest')">＋</button></h3>
        ${list(c.quests, q => `<div class="wrow ${q.state === "faite" ? "done" : ""}">
          <button class="wcheck" onclick="UI.toggleQuest('${q.id}')">${q.state === "faite" ? "✔" : "○"}</button>
          <div class="wbody"><b>${this.esc(q.title)}</b>${q.desc ? "<div class='wdesc'>" + this.esc(q.desc) + "</div>" : ""}</div>
          <button class="wdel" onclick="UI.delWorld('quests','${q.id}')">✕</button></div>`, "Aucune quête. L'Oracle en créera pendant la partie.")}
      </div>

      <div class="card">
        <h3>💬 PNJ <button class="add-x" onclick="UI.addWorld('npc')">＋</button></h3>
        ${list(c.npcs, n => `<div class="wrow"><div class="wbody"><b>${this.esc(n.name)}</b>${n.role ? " — " + this.esc(n.role) : ""}${n.trait ? "<div class='wdesc'>" + this.esc(n.trait) + "</div>" : ""}${n.place ? "<span class='wtag'>📍 " + this.esc(n.place) + "</span>" : ""}${n.attitude ? "<span class='wtag'>" + this.esc(n.attitude) + "</span>" : ""}</div><button class="wdel" onclick="UI.delWorld('npcs','${n.id}')">✕</button></div>`, "Aucun PNJ pour l'instant.")}
      </div>

      <div class="card">
        <h3>🗺️ Lieux <button class="add-x" onclick="UI.addWorld('place')">＋</button></h3>
        ${list(c.places, p => `<div class="wrow"><div class="wbody"><b>${this.esc(p.name)}</b>${p.desc ? "<div class='wdesc'>" + this.esc(p.desc) + "</div>" : ""}</div><button class="wdel" onclick="UI.delWorld('places','${p.id}')">✕</button></div>`, "Aucun lieu.")}
      </div>

      <div class="card">
        <h3>🐉 Bestiaire <button class="add-x" onclick="UI.addWorld('beast')">＋</button></h3>
        ${list(c.bestiary, b => `<div class="wrow"><div class="wbody"><b>${this.esc(b.name)}</b>${b.hp ? " <span class='wtag'>PV " + this.esc(b.hp) + "</span>" : ""}${b.threat ? "<span class='wtag'>" + this.esc(b.threat) + "</span>" : ""}${b.trait ? "<div class='wdesc'>" + this.esc(b.trait) + "</div>" : ""}</div><button class="wdel" onclick="UI.delWorld('bestiary','${b.id}')">✕</button></div>`, "Aucune créature.")}
      </div>

      <div class="card">
        <h3>🧠 Canon / mémoire de l'Oracle</h3>
        <div class="hint">Les faits établis que l'Oracle retiendra pour toujours. Il en ajoute automatiquement pendant la partie.</div>
        ${list(c.lore, (l, i) => `<div class="lore-row"><span>• ${this.esc(l)}</span><button class="wdel" onclick="UI.delLore(${i})">✕</button></div>`, "Rien encore.")}
        <div class="two-inline"><input id="loreInput" placeholder="Ajouter un fait canon…"><button class="btn btn-ghost btn-sm" onclick="UI.addLore()">Ajouter</button></div>
      </div>

      <div class="card seed-card">
        <h3>📥 Nourrir l'Oracle</h3>
        <div class="hint">Colle ici <b>tes notes ou tes conversations passées</b> sur cette campagne (idées, univers, historique, discussions RP). L'Oracle les traitera comme du canon et s'en servira dans chaque réponse.</div>
        <textarea rows="6" id="seedInput" placeholder="Colle tes notes / anciennes conversations sur le jeu de rôle ici…">${this.esc(c.seed)}</textarea>
        <button class="btn btn-primary btn-block" onclick="UI.saveSeed()">💾 Enregistrer la matière</button>
      </div>`;
  },
  setCampField(f, v) { const c = State.current(); c[f] = v; State.save(); this.renderHeader(); },
  saveSeed() { const c = State.current(); c.seed = document.getElementById("seedInput").value; State.save(); this.toast("Matière enregistrée — l'Oracle s'en souviendra 🧠", "ok"); },
  addLore() { const v = document.getElementById("loreInput").value.trim(); if (v) { State.remember(v); this.renderWorld(); } },
  delLore(i) { const c = State.current(); c.lore.splice(i, 1); State.save(); this.renderWorld(); },
  toggleQuest(id) { const q = State.current().quests.find(x => x.id === id); q.state = q.state === "faite" ? "active" : "faite"; State.save(); this.renderWorld(); },
  delWorld(coll, id) { const c = State.current(); c[coll] = c[coll].filter(x => x.id !== id); State.save(); this.renderWorld(); },
  addWorld(kind) {
    const c = State.current();
    if (kind === "quest") { const t = prompt("Titre de la quête ?"); if (t) c.quests.push({ id: "q_" + Math.random().toString(36).slice(2, 7), title: t, desc: "", state: "active" }); }
    if (kind === "npc") { const t = prompt("Nom du PNJ ?"); if (t) c.npcs.push({ id: "n_" + Math.random().toString(36).slice(2, 7), name: t, role: prompt("Rôle ? (optionnel)") || "" }); }
    if (kind === "place") { const t = prompt("Nom du lieu ?"); if (t) c.places.push({ id: "l_" + Math.random().toString(36).slice(2, 7), name: t, desc: prompt("Description ? (optionnel)") || "" }); }
    if (kind === "beast") { const t = prompt("Nom de la créature ?"); if (t) c.bestiary.push({ id: "b_" + Math.random().toString(36).slice(2, 7), name: t, hp: prompt("PV ? (optionnel)") || "", threat: "", trait: "" }); }
    State.save(); this.renderWorld();
  },

  /* ============================================================
     DÉS
     ============================================================ */
  renderDice() {
    const c = State.current();
    const is5e = c.system === "dnd5e";
    const el = document.getElementById("view-dice");
    const sys = DATA.DICE_SYSTEMS[c.system] || DATA.DICE_SYSTEMS.d20;
    const quick = ["1d20", "1d12", "1d10", "1d8", "1d6", "1d4", "1d100", "2d6", "3d6", "4d6k3"];

    const checkCard = is5e ? `
      <div class="card">
        <h3>🎯 Test D&D 5e <span class="h3-note">1d20 + carac (+ maîtrise)</span></h3>
        <div class="two">
          <label class="f">Héros<select id="ckHero" onchange="UI.previewCheck()">${c.heroes.map(h => `<option value="${h.id}">${h.avatar} ${this.esc(h.name)}</option>`).join("") || "<option>—</option>"}</select></label>
          <label class="f">Type<select id="ckKind" onchange="UI.fillCheckKeys();UI.previewCheck()">
            <option value="skill">Compétence</option><option value="save">Sauvegarde</option><option value="ability">Carac brute</option></select></label>
          <label class="f" id="ckKeyWrap">Compétence<select id="ckKey" onchange="UI.previewCheck()">${Object.keys(DND.SKILLS).map(s => `<option>${s}</option>`).join("")}</select></label>
          <label class="f">DD<input type="number" id="ckDC" value="15"></label>
        </div>
        <div class="dc-help">DD : ${DND.DC_SCALE.map(d => `${d.name} <b>${d.dc}</b>`).join(" · ")}</div>
        <div class="adv-row">
          <label class="chk"><input type="checkbox" id="adv5e"> Avantage</label>
          <label class="chk"><input type="checkbox" id="dis5e"> Désavantage</label>
          <span class="ck-preview" id="ckPreview"></span>
        </div>
        <button class="btn btn-primary btn-block" onclick="UI.rollCheck5e()">🎯 Lancer le test</button>
      </div>` : `
      <div class="card">
        <h3>🎯 Jet de compétence <span class="h3-note">${this.esc(sys.name)}</span></h3>
        <div class="hint">${this.esc(sys.help)}</div>
        <div class="two">
          <label class="f">Héros<select id="ckHero">${c.heroes.map(h => `<option value="${this.esc(h.name)}">${h.avatar} ${this.esc(h.name)}</option>`).join("") || "<option>—</option>"}</select></label>
          <label class="f">Compétence<input id="ckSkill" placeholder="ex : Discrétion"></label>
          <label class="f">Formule<input id="ckFormula" value="${sys.formula}"></label>
          <label class="f">${this.esc(sys.target)}<input type="number" id="ckDC" value="${sys.defaultDC}"></label>
        </div>
        <button class="btn btn-primary btn-block" onclick="UI.rollCheck()">🎯 Jet de compétence</button>
      </div>`;

    el.innerHTML = `
      ${this.combatCard()}
      <div class="card">
        <h3>🎲 Jet rapide</h3>
        <div class="dice-grid">${quick.map(f => `<button class="dice-btn" onclick="UI.quickRoll('${f}')">${f}</button>`).join("")}</div>
      </div>
      ${checkCard}
      <div class="card">
        <h3>✍️ Formule libre</h3>
        <div class="two-inline"><input id="diceFormula" value="1d20+3" placeholder="ex : 2d6+1, 4d6k3"><button class="btn btn-primary" onclick="UI.rollFormula()">Lancer</button></div>
        <div class="adv-row">
          <label class="chk"><input type="checkbox" id="advChk"> Avantage</label>
          <label class="chk"><input type="checkbox" id="disChk"> Désavantage</label>
        </div>
      </div>`;
    if (is5e) this.previewCheck();
  },

  fillCheckKeys() {
    const kind = document.getElementById("ckKind").value;
    const wrap = document.getElementById("ckKeyWrap");
    if (kind === "skill") wrap.innerHTML = `Compétence<select id="ckKey" onchange="UI.previewCheck()">${Object.keys(DND.SKILLS).map(s => `<option>${s}</option>`).join("")}</select>`;
    else wrap.innerHTML = `Caractéristique<select id="ckKey" onchange="UI.previewCheck()">${DND.ABILITY_ORDER.map(a => `<option value="${a}">${DND.ABILITIES[a]}</option>`).join("")}</select>`;
  },
  previewCheck() {
    const c = State.current();
    const h = State.hero(document.getElementById("ckHero")?.value); if (!h) return;
    const kind = document.getElementById("ckKind").value;
    const key = document.getElementById("ckKey").value;
    const b = DND.buildRoll(h, kind, key);
    const el = document.getElementById("ckPreview");
    if (el) el.innerHTML = `→ <b>${b.formula}</b>`;
  },
  rollCheck5e() {
    const c = State.current();
    const h = State.hero(document.getElementById("ckHero").value); if (!h) { this.toast("Ajoute d'abord un héros", "warn"); return; }
    const kind = document.getElementById("ckKind").value;
    const key = document.getElementById("ckKey").value;
    const dc = parseInt(document.getElementById("ckDC").value, 10);
    const res = Dice.check5e(h, kind, key, dc, { adv: document.getElementById("adv5e").checked, dis: document.getElementById("dis5e").checked });
    Dice.show(res, res.label);
    State.log({ kind: "dice", text: `${res.label} : ${res.detail} = ${res.total} vs DD ${dc} → ${res.outcome}` });
  },

  /* Suivi d'initiative de combat */
  combatCard() {
    const c = State.current();
    const cb = c.combat || { active: false, order: [] };
    if (!cb.active) {
      return `<div class="card combat-card">
        <h3>⚔️ Combat</h3>
        <div class="hint">Lance l'initiative de tous les héros et mène le combat au tour par tour.</div>
        <button class="btn btn-primary btn-block" onclick="UI.startCombat()">⚔️ Démarrer un combat</button>
      </div>`;
    }
    const rows = cb.order.map((o, i) => `<div class="init-row ${i === cb.turn ? "cur" : ""} ${o.isHero ? "hero" : "foe"}">
      <span class="init-num">${o.init}</span>
      <span class="init-name">${i === cb.turn ? "▶ " : ""}${this.esc(o.name)}</span>
      ${o.hp != null ? `<span class="init-hp">${o.hp} PV</span>` : ""}
      <button class="wdel" onclick="UI.removeInit(${i})">✕</button>
    </div>`).join("");
    return `<div class="card combat-card active">
      <h3>⚔️ Combat — round ${cb.round}</h3>
      <div class="init-list">${rows}</div>
      <div class="two-inline" style="margin-top:8px">
        <input id="foeName" placeholder="Ajouter un ennemi…"><input id="foeInit" type="number" placeholder="init" style="max-width:70px">
        <button class="btn btn-ghost btn-sm" onclick="UI.addFoe()">＋</button>
      </div>
      <div class="two" style="margin-top:8px">
        <button class="btn btn-primary" onclick="UI.nextTurn()">⏭️ Tour suivant</button>
        <button class="btn btn-danger" onclick="UI.stopCombat()">🏁 Fin du combat</button>
      </div>
    </div>`;
  },
  startCombat() {
    const c = State.current();
    c.combat = { active: true, round: 1, turn: 0, order: [] };
    c.heroes.forEach(h => c.combat.order.push({ name: h.name, id: h.id, isHero: true, init: Dice.initiative(h).total, hp: h.hp }));
    c.combat.order.sort((a, b) => b.init - a.init);
    State.log({ kind: "event", text: "⚔️ Combat ! Initiative : " + c.combat.order.map(o => o.name + "(" + o.init + ")").join(" → ") });
    State.save(); this.renderDice();
  },
  addFoe() {
    const c = State.current();
    const name = document.getElementById("foeName").value.trim(); if (!name) return;
    const init = parseInt(document.getElementById("foeInit").value, 10) || Dice.roll("1d20").total;
    c.combat.order.push({ name, init, isHero: false, hp: null });
    c.combat.order.sort((a, b) => b.init - a.init);
    State.save(); this.renderDice();
  },
  removeInit(i) { const c = State.current(); c.combat.order.splice(i, 1); if (c.combat.turn >= c.combat.order.length) c.combat.turn = 0; State.save(); this.renderDice(); },
  nextTurn() { const c = State.current(); c.combat.turn++; if (c.combat.turn >= c.combat.order.length) { c.combat.turn = 0; c.combat.round++; } State.save(); this.renderDice(); },
  stopCombat() { const c = State.current(); c.combat.active = false; State.log({ kind: "event", text: "🏁 Fin du combat." }); State.save(); this.renderDice(); },
  quickRoll(f) { const r = Dice.roll(f); Dice.show(r); State.log({ kind: "dice", text: `${f} = ${r.total} (${r.detail})` }); this.toast(`🎲 ${f} → <b>${r.total}</b>`); },
  rollFormula() {
    const f = document.getElementById("diceFormula").value;
    const r = Dice.roll(f, { adv: document.getElementById("advChk").checked, dis: document.getElementById("disChk").checked });
    Dice.show(r); State.log({ kind: "dice", text: `${f} = ${r.total} (${r.detail})` });
  },
  rollCheck() {
    const c = State.current();
    const who = document.getElementById("ckHero").value;
    const skill = document.getElementById("ckSkill").value;
    const formula = document.getElementById("ckFormula").value;
    const dc = parseInt(document.getElementById("ckDC").value, 10);
    const res = Dice.check(formula, dc, c.system);
    Dice.show(res, (who ? who + " · " : "") + (skill || "Jet"));
    State.log({ kind: "dice", text: `${who} ${skill} : ${res.detail} = ${res.total} → ${res.outcome}` });
  },

  /* ============================================================
     ORACLE (atelier)
     ============================================================ */
  renderOracle() {
    const c = State.current();
    const el = document.getElementById("view-oracle");
    const feed = c.chat.length ? c.chat.map(m => m.kind === "oracle"
      ? `<div class="c-oracle"><div class="c-oracle-head">🔮 Oracle</div>${this.md(m.text)}</div>`
      : `<div class="c-action"><span class="c-who">MJ</span>${this.md(m.text)}</div>`).join("")
      : `<div class="empty">🔮 Atelier de l'Oracle — demande-lui d'improviser un PNJ, un lieu, un donjon, un rebondissement, un nom, une énigme, ou pose « et si… ». Ce qu'il crée peut être enregistré direct dans ta campagne.</div>`;
    el.innerHTML = `
      <div class="feed" id="oracleFeed">${feed}</div>
      <div class="composer">
        <div class="chips">
          <button class="chip" onclick="UI.composeOracle('Improvise-moi un PNJ marquant pour cette campagne, et enregistre-le.')">💬 Un PNJ</button>
          <button class="chip" onclick="UI.composeOracle('Génère un lieu intrigant à explorer, avec 3 détails et un secret. Enregistre-le.')">🗺️ Un lieu</button>
          <button class="chip" onclick="UI.composeOracle('Propose 3 rebondissements possibles pour la suite de l\\'histoire.')">⚡ Rebondissements</button>
          <button class="chip" onclick="UI.composeOracle('Donne-moi 6 noms adaptés à l\\'univers.')">🔤 Des noms</button>
          <button class="chip" onclick="UI.composeOracle('Improvise une rencontre / un combat équilibré pour le groupe. Ajoute la créature au bestiaire.')">🐉 Une rencontre</button>
        </div>
        <div class="composer-row">
          <textarea id="oracleInput" rows="1" placeholder="Demande à l'Oracle (préparation, impro, idées)…" oninput="UI.autogrow(this)"></textarea>
          <button class="send-btn" id="oracleSend" onclick="UI.sendOracle()">▶</button>
        </div>
      </div>`;
    const f = document.getElementById("oracleFeed"); if (f) f.scrollTop = f.scrollHeight;
  },
  composeOracle(t) { const i = document.getElementById("oracleInput"); i.value = t; this.autogrow(i); i.focus(); },
  async sendOracle() {
    const input = document.getElementById("oracleInput");
    const text = input.value.trim(); if (!text) return;
    input.value = ""; this.autogrow(input);
    State.current().chat.push({ kind: "action", text, t: Date.now() }); State.save();
    this.renderOracle();
    await this.runOracle(text, "oracle", "");
  },

  /* ============================================================
     TABLE (réglages)
     ============================================================ */
  renderTable() {
    const c = State.current() || State.blankCampaign();  // évite tout plantage si aucune campagne
    const d = State.data;
    const el = document.getElementById("view-table");
    const ai = d.ai, be = d.backend;
    const prov = DATA.AI_PROVIDERS[ai.provider] || {};
    el.innerHTML = `
      <div class="card">
        <h3>🎭 Campagne courante</h3>
        <label class="f">Nom<input value="${this.esc(c.name)}" onchange="UI.setCampField('name',this.value)"></label>
        <div class="two">
          <label class="f">Univers<select onchange="UI.changeGenre(this.value)">${Object.entries(DATA.GENRES).map(([k, g]) => `<option value="${k}" ${k === c.genre ? "selected" : ""}>${g.ico} ${g.name}</option>`).join("")}</select></label>
          <label class="f">Ton<select onchange="UI.setCampField('tone',this.value)">${Object.entries(DATA.TONES).map(([k, t]) => `<option value="${k}" ${k === c.tone ? "selected" : ""}>${t.ico} ${t.name}</option>`).join("")}</select></label>
        </div>
        <div class="two">
          <label class="f">Système de dés<select onchange="UI.setCampField('system',this.value)">${Object.entries(DATA.DICE_SYSTEMS).map(([k, s]) => `<option value="${k}" ${k === c.system ? "selected" : ""}>${s.name}</option>`).join("")}</select></label>
          <label class="f">Séance n°<input type="number" value="${c.session}" onchange="UI.setCampField('session',parseInt(this.value)||1)"></label>
        </div>
        <label class="f">Attributs (virgules, s'appliquent aux nouveaux héros)<input value="${(c.attrs || []).map(a => this.esc(a)).join(", ")}" onchange="UI.setAttrs(this.value)"></label>
      </div>

      <div class="card">
        <h3>🌌 Ambiance visuelle</h3>
        <div class="theme-grid">${Object.entries(DATA.THEMES).map(([k, t]) => `<button class="theme-opt ${k === c.theme ? "sel" : ""}" onclick="UI.setTheme('${k}')">${t.ico}<span>${t.name}</span></button>`).join("")}</div>
        <label class="f">Couleur d'accent<input type="color" value="${c.accent || '#6c5ce7'}" onchange="UI.setCampField('accent',this.value)"></label>
        <button class="btn btn-ghost btn-sm" onclick="UI.setCampField('accent','');UI.setStyleReset()">↺ Réinitialiser le style</button>
      </div>

      <div class="card">
        <h3>🔮 Oracle IA</h3>
        <div class="ai-status ${ai.key || ai.provider === "backend" ? "on" : "off"}">${this.aiStatusLabel()}</div>
        ${ai.key ? `<div class="key-saved">🔐 Clé enregistrée : <code>${this.esc(ai.key.slice(0, 6))}…${this.esc(ai.key.slice(-4))}</code> <span class="key-len">(${ai.key.length} car.)</span></div>` : ""}
        ${(State.data.backupAi && State.data.backupAi.key) ? `<div class="key-saved">🛟 Secours : <b>${this.esc((DATA.AI_PROVIDERS[State.data.backupAi.provider] || {}).name || State.data.backupAi.provider)}</b> — bascule auto si le principal sature. <button class="btn-linkx" onclick="UI.clearBackup()">retirer</button></div>` : ""}
        <div class="key-quick">
          <label class="f">🔑 Colle ta clé ici (Groq ou Gemini — gratuit)<input id="quickKey" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="gsk_…  ou  AIza… / AQ.…" onchange="UI.pasteKey(this.value)"></label>
          <div class="hint">Colle et c'est tout : l'app détecte le fournisseur et active l'Oracle. <b>Colle une 2ᵉ clé d'un autre fournisseur</b> (ex. Gemini) → elle devient un <b>secours automatique</b>. Ta clé reste sur ton téléphone. <a class="link" href="https://console.groq.com/keys" target="_blank">↗ Clé Groq gratuite</a></div>
          ${ai.provider !== "backend" && ai.key ? `<button class="btn btn-ghost btn-sm" onclick="UI.testAiKey()">🔌 Tester la clé (appel réel)</button>` : ""}
        </div>
        <details class="ai-adv"><summary>Réglages avancés</summary>
        <label class="f">Fournisseur<select id="aiProv" onchange="UI.setAIProvider(this.value)">${Object.entries(DATA.AI_PROVIDERS).map(([k, p]) => `<option value="${k}" ${k === ai.provider ? "selected" : ""}>${p.name}</option>`).join("")}</select></label>
        ${ai.provider === "backend" ? `
          <label class="f">URL du backend<input value="${this.esc(be.url)}" onchange="UI.setBackend('url',this.value)" placeholder="https://…up.railway.app"></label>
          <label class="f">Token (si défini sur Railway)<input value="${this.esc(be.token)}" onchange="UI.setBackend('token',this.value)" placeholder="optionnel"></label>
          <button class="btn btn-ghost btn-sm" onclick="UI.testBackend()">🔌 Tester la connexion</button>
        ` : `
          <label class="f">Clé API ${prov.needsKey ? "" : ""}<input type="password" value="${this.esc(ai.key)}" onchange="UI.setAIKey(this.value)" placeholder="colle ta clé…"></label>
          <label class="f">Modèle<input value="${this.esc(ai.model || prov.model || '')}" onchange="UI.setAIModel(this.value)"></label>
          ${prov.url ? `<a class="link" href="${prov.url}" target="_blank">↗ Obtenir une clé</a>` : ""}
          <div class="hint">Ta clé reste sur ton téléphone.</div>
        `}
        </details>
      </div>

      <div class="card">
        <h3>🎲 Dés</h3>
        <label class="chk chk-row"><input type="checkbox" ${d.physicalDice ? "checked" : ""} onchange="UI.setPhysicalDice(this.checked)"> <span><b>Je lance mes propres dés</b> — quand l'Oracle demande un jet, il indique le DD et le modificateur, et tu entres le résultat de ton d20 physique. Décoché : l'app lance à ta place.</span></label>
      </div>

      <div class="card">
        <h3>🔊 Voix</h3>
        <div class="hint">Lecture à voix haute (synthèse de ton téléphone, gratuite). Un bouton 🔊 apparaît sur chaque narration de l'Oracle et chaque réplique de PNJ dans la Partie.</div>
        ${this.voicePicker(d)}
        <label class="chk chk-row"><input type="checkbox" ${d.readDialogueOnly !== false ? "checked" : ""} onchange="UI.setDialogueOnly(this.checked)"> <span><b>Lire seulement les dialogues « »</b> — la voix ne dit que les répliques des personnages/IA ; toi, tu lis la description à voix haute.</span></label>
        <label class="chk chk-row"><input type="checkbox" ${d.autoRead ? "checked" : ""} onchange="UI.setAutoRead(this.checked)"> <span><b>Lire automatiquement</b> les réponses de l'Oracle à voix haute.</span></label>
        <button class="btn btn-ghost btn-sm" onclick="UI.speak('Ceci est un test de la voix. La partie peut commencer.','oracle')">🔊 Tester la voix</button>
        <div class="hint" style="margin-top:10px">💡 Pour une voix bien plus naturelle sur iPhone : Réglages → Accessibilité → <b>Contenu énoncé</b> → Voix → Français → télécharge une voix <b>« Premium »</b>. Elle apparaîtra ensuite dans la liste ci-dessus.</div>
      </div>

      <div class="card">
        <h3>🎭 Ton rôle (MJ + joueur)</h3>
        <div class="hint">Tu es le MJ mais tu incarnes aussi un perso ? Indique-le : l'Oracle t'assistera pour toute la table ET donnera des moments forts à ton personnage, sans jamais jouer à ta place.</div>
        <label class="f">Mon personnage<select onchange="UI.setMjHero(this.value)">
          <option value="">— Je suis MJ uniquement —</option>
          ${c.heroes.map(h => `<option value="${h.id}" ${h.id === c.mjHeroId ? "selected" : ""}>${h.avatar} ${this.esc(h.name)}</option>`).join("")}
        </select></label>
      </div>

      <div class="card">
        <h3>👥 Joueurs à la table</h3>
        <div class="hint">Les 4 (ou plus) personnes réelles. Sert à relier les héros aux joueurs.</div>
        <textarea rows="4" id="playersInput" placeholder="Un joueur par ligne">${(d.players || []).map(p => this.esc(p)).join("\n")}</textarea>
        <button class="btn btn-ghost btn-sm" onclick="UI.savePlayers()">Enregistrer</button>
      </div>

      <div class="card">
        <h3>📚 Mes campagnes</h3>
        ${d.campaigns.map(cc => `<div class="camp-row ${cc.id === d.currentId ? "cur" : ""}">
          <button class="camp-pick" onclick="UI.switchCamp('${cc.id}')">${(DATA.GENRES[cc.genre] || {}).ico || "🎲"} ${this.esc(cc.name)}${cc.id === d.currentId ? " ✓" : ""}</button>
          ${d.campaigns.length > 1 ? `<button class="wdel" onclick="UI.delCamp('${cc.id}')">✕</button>` : ""}
        </div>`).join("")}
        <button class="btn btn-primary btn-block" onclick="UI.newCampaignFlow()">＋ Nouvelle campagne</button>
      </div>

      <div class="card">
        <h3>💾 Données</h3>
        <button class="btn btn-ghost btn-block" onclick="UI.exportData()">⬇️ Exporter (sauvegarde JSON)</button>
        <label class="btn btn-ghost btn-block" style="cursor:pointer">⬆️ Importer une sauvegarde<input type="file" accept="application/json" style="display:none" onchange="UI.importData(this)"></label>
        <button class="btn btn-danger btn-block" onclick="UI.resetAll()">🗑️ Tout effacer</button>
      </div>
      <div class="foot">Oracle · compagnon de jeu de rôle · v1 — tes données restent sur ton appareil.</div>`;
  },
  changeGenre(v) { const c = State.current(); c.genre = v; const g = DATA.GENRES[v]; if (g) { if (!c.pitch) c.pitch = g.pitch; if (c.system !== "dnd5e") c.attrs = g.attrs.slice(); c.theme = g.theme; } State.save(); this.renderTable(); this.renderHeader(); State.applyTheme(); },
  setAttrs(v) { const c = State.current(); c.attrs = v.split(",").map(s => s.trim()).filter(Boolean); State.save(); },
  setTheme(k) { const c = State.current(); c.theme = k; State.save(); State.applyTheme(); this.renderTable(); this.renderHeader(); },
  setStyleReset() { const c = State.current(); c.style = {}; c.customCss = ""; State.save(); State.applyTheme(); this.renderTable(); },
  aiStatusLabel() {
    const ai = State.data.ai;
    if (ai.provider === "backend") return "🛰️ Mode backend — clé sur ton serveur Railway.";
    if (ai.key) { const n = (DATA.AI_PROVIDERS[ai.provider] || {}).name || ai.provider; return "✅ Oracle actif — " + n; }
    return "⚠️ Oracle pas encore activé — colle ta clé ci-dessous.";
  },
  pasteKey(v) {
    v = (v || "").trim();
    if (!v) return;
    const d = State.data;
    // Devine le fournisseur d'après le préfixe de la clé.
    let prov = null;
    if (/^gsk_/.test(v)) prov = "groq";
    else if (/^AIza/.test(v) || /^AQ\./.test(v)) prov = "gemini";  // Gemini : ancien (AIza) et nouveau (AQ.) formats
    else if (/^sk-or-/.test(v)) prov = "openrouter";
    const names = { groq: "Groq", gemini: "Gemini", openrouter: "OpenRouter" };
    if (!prov) {
      d.ai.key = v; if (d.ai.provider === "backend") d.ai.provider = "groq";
      this.toast("Clé enregistrée. Vérifie le fournisseur dans les réglages avancés.", "warn");
    } else if (!d.ai.key || d.ai.provider === prov) {
      // Première clé, ou même fournisseur → fournisseur PRINCIPAL.
      d.ai.provider = prov; d.ai.model = DATA.AI_PROVIDERS[prov].model; d.ai.key = v;
      this.toast(`🔮 Clé ${names[prov]} détectée — Oracle activé ✅`, "ok");
    } else {
      // Un principal existe déjà, d'un autre fournisseur → clé de SECOURS (bascule auto).
      d.backupAi = { provider: prov, key: v, model: DATA.AI_PROVIDERS[prov].model };
      this.toast(`🛟 ${names[prov]} ajouté en secours — bascule auto si ${names[d.ai.provider] || d.ai.provider} sature`, "ok");
    }
    Oracle.lastStatus = null; this.setupDismissed = false;
    State.save(); this.renderTable();
    if (d.ai.key && d.ai.provider !== "backend") setTimeout(() => this.testAiKey(), 150); // vérifie tout de suite
  },
  setAIProvider(v) { State.data.ai.provider = v; State.data.ai.model = DATA.AI_PROVIDERS[v].model || ""; State.save(); this.renderTable(); },
  clearBackup() { State.data.backupAi = { provider: "", key: "", model: "" }; State.save(); this.toast("Secours retiré", "ok"); this.renderTable(); },
  setAIKey(v) { State.data.ai.key = v.trim(); State.save(); },
  setAIModel(v) { State.data.ai.model = v.trim(); State.save(); },
  setBackend(f, v) { State.data.backend[f] = v.trim(); State.save(); },
  async testBackend() {
    const be = State.data.backend;
    const url = (be.url || location.origin).replace(/\/+$/, "") + "/api/oracle/ping";
    this.toast("Test en cours…");
    try {
      const r = await fetch(url); const j = await r.json();
      if (j.ok) this.toast(`✅ Backend OK — fournisseurs : ${(j.providers || []).join(", ") || "aucun !"}`, "ok");
      else this.toast("⚠️ " + (j.error || "réponse inattendue"), "warn");
    } catch (e) { this.toast("❌ Injoignable : " + e.message, "warn"); }
  },
  savePlayers() { State.data.players = document.getElementById("playersInput").value.split("\n").map(s => s.trim()).filter(Boolean); State.save(); this.toast("Joueurs enregistrés", "ok"); },
  setMjHero(id) { const c = State.current(); c.mjHeroId = id; State.save(); this.toast(id ? "L'Oracle sait que tu joues aussi 🎭" : "MJ uniquement", "ok"); },
  setPhysicalDice(v) { State.data.physicalDice = v; State.save(); this.toast(v ? "🎲 Tu lances tes vrais dés" : "L'app lance les dés", "ok"); },
  setAutoRead(v) { State.data.autoRead = v; State.save(); if (!v) this.stopSpeak(); this.toast(v ? "🔊 Lecture auto activée" : "Lecture auto coupée", "ok"); },
  setDialogueOnly(v) { State.data.readDialogueOnly = v; State.save(); this.toast(v ? "🗣️ Voix : dialogues « » uniquement" : "Voix : tout le texte", "ok"); },
  async testAiKey() {
    const ai = State.data.ai; const model = ai.model || (DATA.AI_PROVIDERS[ai.provider] || {}).model;
    this.toast("Test en cours…");
    const msg = [{ role: "user", content: "Réponds juste : OK" }];
    try {
      let t;
      if (ai.provider === "claude") t = await Oracle.callClaude(ai.key, model, "Réponds OK", msg);
      else if (ai.provider === "gemini") t = await Oracle.callGemini(ai.key, model, "Réponds OK", msg);
      else if (ai.provider === "openrouter") t = await Oracle.callOAI(ai.key, model, "Réponds OK", msg, "https://openrouter.ai/api/v1/chat/completions");
      else t = await Oracle.callOAI(ai.key, model, "Réponds OK", msg, "https://api.groq.com/openai/v1/chat/completions");
      Oracle.lastStatus = { mode: "ai", provider: ai.provider }; this.setupDismissed = true;
      this.toast("✅ Clé valide — l'Oracle est opérationnel !", "ok"); this.renderTable(); this.renderHeader();
    } catch (e) { this.toast("❌ " + Oracle.cause(e.message) + " — recolle une clé complète", "warn"); }
  },
  // Nom de classe reskiné selon l'univers de la campagne (mécanique inchangée)
  skinCls(cls) { const c = State.current(); const sk = c && c.skin ? DATA.SKINS[c.skin] : null; return (sk && sk.classNames && sk.classNames[cls]) || cls; },
  switchCamp(id) { State.switchCampaign(id); this.go("play"); },
  delCamp(id) { if (confirm("Supprimer cette campagne définitivement ?")) { State.deleteCampaign(id); this.renderTable(); this.renderHeader(); } },
  newCampaignFlow() { App.startOnboarding(true); },
  exportData() {
    const blob = new Blob([State.exportJSON()], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = "oracle-sauvegarde-" + new Date().toISOString().slice(0, 10) + ".json"; a.click();
  },
  importData(inp) {
    const file = inp.files[0]; if (!file) return;
    const rd = new FileReader();
    rd.onload = () => { try { State.importJSON(rd.result); this.toast("Sauvegarde importée ✅", "ok"); this.go("play"); } catch (e) { this.toast("❌ " + e.message, "warn"); } };
    rd.readAsText(file);
  },
  resetAll() { if (confirm("Effacer TOUTES les campagnes et réglages ?")) { localStorage.removeItem(State.KEY); location.reload(); } },
};
