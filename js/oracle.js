/* ============================================================
   Oracle — le co-Maître du Jeu IA.
   • Construit un prompt système avec TOUT le contexte de la campagne.
   • Exécute des DIRECTIVES renvoyées par l'IA pour modifier la partie
     en temps réel (PNJ, PV, scène, quêtes, ambiance…).
   • Cascade de fournisseurs (backend Railway ou clé locale) + secours
     hors-ligne (oracle oui/non & générateurs).
   ============================================================ */

const Oracle = {
  lastStatus: null,

  /* ---------- Prompt système : tout le contexte de la table ---------- */
  systemPrompt(mode = "play") {
    const c = State.current();
    if (!c) return "Tu es un Maître du Jeu assistant.";
    const g = DATA.GENRES[c.genre] || DATA.GENRES.custom;
    const tone = (DATA.TONES[c.tone] || {}).name || c.tone;
    const sys = (DATA.DICE_SYSTEMS[c.system] || {});

    const is5e = c.system === "dnd5e";
    const heroes = c.heroes.length ? c.heroes.map(h => {
      if (is5e && typeof DND !== "undefined") {
        const ab = DND.ABILITY_ORDER.map(a => `${a} ${(h.abilities[a] || 10)}(${DND.modStr(h.abilities[a])})`).join(" ");
        const prof = "+" + DND.profBonus(h.level || 1);
        const profSk = (h.skillProfs || []).length ? " | maîtrises : " + h.skillProfs.join(", ") : "";
        const saves = (h.saveProfs || []).length ? " | sauv. maîtrisées : " + h.saveProfs.join(",") : "";
        return `• ${h.name}${h.player ? " (joué par " + h.player + ")" : ""} — ${h.race} ${h.cls} niv.${h.level}${h.concept ? " (" + h.concept + ")" : ""} | PV ${h.hp}/${h.maxHp}, CA ${h.armor}, init +${DND.abilityMod(h, "DEX")}, maîtrise ${prof} | ${ab}${profSk}${saves}${h.gear && h.gear.length ? " | sac : " + h.gear.join(", ") : ""}${h.conditions && h.conditions.length ? " | ÉTATS : " + h.conditions.join(", ") : ""}${h.feats ? " | atouts : " + h.feats : ""}`;
      }
      const st = Object.entries(h.stats || {}).filter(([, v]) => v !== 0 && v !== "")
        .map(([k, v]) => `${k} ${v >= 0 ? "+" : ""}${v}`).join(", ");
      return `• ${h.name}${h.player ? " (joué par " + h.player + ")" : ""} — ${h.concept || "aventurier"} | PV ${h.hp}/${h.maxHp}, Déf ${h.armor}${st ? " | " + st : ""}${h.gear && h.gear.length ? " | sac : " + h.gear.join(", ") : ""}${h.conditions && h.conditions.length ? " | états : " + h.conditions.join(", ") : ""}${h.feats ? " | capacités : " + h.feats : ""}${h.bonds ? " | liens : " + h.bonds : ""}`;
    }).join("\n") : "• (aucun héros créé pour l'instant)";
    const combat = c.combat && c.combat.active
      ? `\n⚔️ COMBAT EN COURS — round ${c.combat.round}. Ordre d'initiative : ${c.combat.order.map((o, i) => `${i === c.combat.turn ? "▶ " : ""}${o.name} (${o.init})${o.hp != null ? " PV" + o.hp : ""}`).join(" → ")}`
      : "";

    const npcs = c.npcs.length ? c.npcs.slice(-20).map(n =>
      `• ${n.name}${n.role ? " — " + n.role : ""}${n.trait ? " (" + n.trait + ")" : ""}${n.place ? " @ " + n.place : ""}${n.attitude ? " · " + n.attitude : ""}`).join("\n") : "• (aucun)";
    const places = c.places.length ? c.places.map(p => `• ${p.name}${p.desc ? " — " + p.desc : ""}`).join("\n") : "• (aucun)";
    const quests = c.quests.length ? c.quests.map(q => `• [${q.state === "faite" ? "✔ FAITE" : "EN COURS"}] ${q.title}${q.desc ? " — " + q.desc : ""}`).join("\n") : "• (aucune)";
    const beasts = c.bestiary.length ? c.bestiary.map(b => `• ${b.name}${b.hp ? " (PV " + b.hp + ")" : ""}${b.threat ? " · " + b.threat : ""}${b.trait ? " — " + b.trait : ""}`).join("\n") : "• (aucune)";
    const lore = c.lore.length ? c.lore.map(l => "- " + l).join("\n") : "- (rien encore)";
    const chron = State.recentChronicle(16).map(e => {
      const tag = { action: "🎬 ACTION", oracle: "🔮 MJ", dice: "🎲 DÉ", pnj: "💬 PNJ", scene: "📍 SCÈNE", event: "⚡ FAIT", note: "📝" }[e.kind] || "📝";
      return `${tag}${e.who ? " " + e.who : ""} : ${e.text}`;
    }).join("\n") || "(la partie commence)";
    const seed = (c.seed || "").trim()
      ? "\n═══ NOTES & CONVERSATIONS PASSÉES (matière première fournie par le MJ — traite-la comme canon) ═══\n" + c.seed.trim().slice(0, 6000)
      : "";

    const common = `Tu es « l'ORACLE », le co-Maître du Jeu IA de cette table de jeu de rôle. Tu assistes ${c.name ? "la campagne « " + c.name + " »" : "la partie"}. Il y a 4 joueurs autour de la table et un MJ humain qui pilote via cette app ; tu es son bras droit narratif.

UNIVERS : ${g.name} — ${g.ico}
TON : ${tone}
SYSTÈME DE DÉS : ${sys.name || c.system} (${sys.help || ""})
PITCH : ${c.pitch || g.pitch}
ENJEU CENTRAL : ${c.stakes || "(à définir avec le MJ)"}
SCÈNE ACTUELLE : ${c.scene && c.scene.title ? c.scene.title + (c.scene.mood ? " — ambiance : " + c.scene.mood : "") : "(aucune scène posée)"}
Séance n°${c.session}.${combat}
${is5e ? `
═══ RÈGLES D&D 5e (tu mènes selon la 5e ; le LORE est adapté à l'univers ci-dessus) ═══
• Résolution : quand une action est incertaine, demande un test → 1d20 + modificateur de caractéristique (+ bonus de maîtrise si le héros maîtrise la compétence/sauvegarde). Tu NE lances PAS toi-même : émets [JET: …] et l'app calcule le bon modificateur du héros et lance.
• Choisis la bonne caractéristique/compétence : Athlétisme(FOR) ; Acrobaties/Discrétion/Escamotage(DEX) ; Dressage/Médecine/Perception/Perspicacité/Survie(SAG) ; Arcanes/Histoire/Investigation/Nature/Religion(INT) ; Intimidation/Persuasion/Représentation/Tromperie(CHA).
• Degré de Difficulté (DD) : Très facile 5 · Facile 10 · Moyen 15 · Difficile 20 · Très difficile 25 · Quasi impossible 30. Choisis un DD juste et annonce-le.
• Sauvegardes : contre pièges, sorts, poisons, peur… → [JET: cible=…; sauvegarde=DEX; diff=…].
• Combat : lance l'initiative ([COMBAT: start] démarre le suivi, l'app tire l'init des héros). Les attaques = 1d20 + mod + maîtrise vs CA ([JET: cible=…; attaque=Épée; bonus=5; diff=<CA cible>]). Dégâts = décris et applique via [PV: cible=…; delta=-X]. 20 naturel = critique (double les dés de dégâts).
• États (5e) : applique-les via [PJ: cible=…; condition+=Empoisonné] (à terre, agrippé, aveuglé, charmé, effrayé, empoisonné, entravé, étourdi, inconscient, paralysé, pétrifié, neutralisé, invisible, épuisement).
• À 0 PV : le héros tombe → jets de sauvegarde contre la mort. Reste dramatique mais équitable.
• Repos : court (dés de vie) / long (PV + emplacements récupérés). Récompense l'XP en fin de rencontre si pertinent via [PJ: cible=…; xp=…].
` : ""}
LES HÉROS (personnages-joueurs) :
${heroes}

PNJ CONNUS :
${npcs}

LIEUX :
${places}

QUÊTES / OBJECTIFS :
${quests}

BESTIAIRE / MENACES :
${beasts}

CANON / MÉMOIRE DE LA CAMPAGNE (faits établis, ne les contredis jamais) :
${lore}
${seed}

═══ CHRONIQUE RÉCENTE (les derniers événements de la partie) ═══
${chron}`;

    const directives = `
═══ TES POUVOIRS — DIRECTIVES QUE L'APP EXÉCUTE EN TEMPS RÉEL ═══
Tu peux modifier la partie ET l'ambiance visuelle en direct en ajoutant, À LA FIN de ta réponse, des lignes au format exact ci-dessous. L'app les exécute puis les retire du texte affiché — ne les montre JAMAIS comme du texte à copier, et n'en abuse pas (uniquement quand c'est réellement pertinent). Continue toujours à écrire ta narration normale à côté.

• [SCENE: titre=Les égouts de Valmyr; ambiance=oppressante, humide]  → pose la scène actuelle (affichée en tête d'app).
• [PNJ: nom=Sian; role=informateur; trait=cache un tatouage; lieu=La Taverne; attitude=méfiant]  → crée/complète un PNJ.
• [PNJVOIX: nom=Sian; texte=« Vous n'auriez jamais dû venir ici… »]  → réplique parlée d'un PNJ (mise en valeur).
• [PV: cible=Kael; delta=-6]  → modifie les points de vie d'un héros (delta négatif = dégâts, positif = soin).
• [PJ: cible=Kael; armor=14; condition+=empoisonné; concept=Rôdeur]  → modifie des champs d'un héros (condition+= ajoute un état, condition-= le retire).
• [OBJET: cible=Kael; ajoute=Clé rouillée]  ou  [OBJET: cible=Kael; retire=Torche]  → inventaire.
• [QUETE: titre=Retrouver l'héritier; desc=piste vers le nord; etat=active]  (etat=active|faite)  → objectif.
• [LIEU: nom=Fort de Braise; desc=citadelle en ruine sur la falaise]  → lieu.
• [BESTIAIRE: nom=Goule; pv=15; menace=moyenne; trait=paralyse au toucher]  → créature/ennemi.
• [JET: cible=Kael; comp=Discrétion; diff=15]  → DEMANDE un test de COMPÉTENCE : l'app calcule le modificateur du héros (carac + maîtrise) et lance 1d20. Variantes 5e : sauvegarde=DEX (jet de sauvegarde), carac=FOR (test de carac brut), attaque=Épée; bonus=5 (jet d'attaque vs CA=diff). Tu peux ajouter avantage=1 ou desavantage=1. Ne donne JAMAIS toi-même le résultat chiffré — laisse l'app lancer avec les vraies stats.
• [COMBAT: start]  démarre le suivi d'initiative (l'app tire l'init des héros). [COMBAT: stop] le termine. [INIT: nom=Goule; valeur=14; pv=15]  ajoute un ennemi dans l'ordre d'initiative. [TOUR]  passe au combattant suivant.
• [FAIT: Le pont s'effondre derrière eux]  → inscrit un événement marquant dans la chronique.
• [MEMO: L'héritier porte une marque de naissance en forme de croissant]  → ajoute un fait durable au CANON de la campagne (à retenir pour toujours). Max 2 par réponse.
• [AMBIANCE: theme=ember; accent=#ff5500]  → change le THÈME visuel de l'app pour coller au moment (thèmes : default, royal, ember, neon, matrix, forest, ocean, light, cream).
• [STYLE: bg=#0c1a12; card=#12271b; accent=#3ddc84; text=#eafff0]  → palette 100% sur-mesure (tokens : bg, bg2, card, card2, border, text, muted, accent, accent2, gold, green, red, blue, orange, radius). Garde TOUJOURS un fort contraste texte/fond. [STYLE: reset] enlève le custom.

RÈGLES DU CO-MJ :
1. Tu ne décides JAMAIS à la place des joueurs : tu décris le monde, les conséquences, les PNJ, et tu proposes. Tu laisses les choix aux 4 joueurs.
2. Adapte-toi TOTALEMENT à l'univers et au ton choisis (${g.name}, ton ${tone}). Ton vocabulaire, tes PNJ, tes menaces doivent coller.
3. Sers-toi des données réelles : cite les héros par leur nom, respecte leurs PV/objets/états, tiens compte du canon et de la chronique.
4. Quand une action est incertaine, DEMANDE un jet via [JET: …] plutôt que de trancher arbitrairement.
5. Quand un fait change le monde (mort, révélation, objet gagné, PNJ rencontré, PV perdus), émets la directive correspondante pour que la fiche/le journal reste à jour — c'est TOI qui tiens l'app à jour, en direct.
6. Réponses immersives mais efficaces (lisibles sur mobile, ~120-200 mots), prêtes à être lues à voix haute à la table.
7. Fais monter la tension : introduis complications, dilemmes et enjeux. Récompense l'astuce.`;

    if (mode === "oracle") {
      return common + directives + `
\n═══ MODE ATELIER (hors-scène) ═══
Ici le MJ te consulte en coulisses pour PRÉPARER et IMPROVISER : générer un PNJ, un lieu, un donjon, un rebondissement, un nom, une rumeur, une rencontre, une énigme, ou répondre à « et si… ». Sois généreux et concret, propose des options prêtes à l'emploi. Utilise les directives ci-dessus pour enregistrer directement ce que le MJ valide (ex : créer le PNJ ou le lieu que tu viens d'inventer).`;
    }
    return common + directives + `
\n═══ MODE PARTIE (temps réel) ═══
Le MJ t'envoie ce que font/choisissent les joueurs, en direct. Réagis en co-MJ : décris ce qui se passe, incarne les PNJ, applique les conséquences, demande les jets nécessaires, et tiens l'app à jour via tes directives. Tu es la voix du monde autour des héros.`;
  },

  /* ---------- Envoi à l'IA ---------- */
  async ask(userMessage, mode = "play") {
    const c = State.current();
    const history = (mode === "oracle" ? c.chat : c.chronicle.filter(e => e.kind === "action" || e.kind === "oracle"))
      .slice(-14).map(e => ({ role: e.kind === "oracle" ? "ai" : "user", content: (e.who ? e.who + " : " : "") + e.text }));
    const messages = [...history, { role: "user", content: userMessage }];
    const system = this.systemPrompt(mode);
    const ai = State.data.ai;

    // 1) Backend Railway (aucune clé dans le téléphone)
    if (ai.provider === "backend") {
      const be = State.data.backend;
      const url = (be.url || location.origin).replace(/\/+$/, "") + "/api/oracle/chat";
      try {
        const r = await fetch(url, {
          method: "POST",
          headers: Object.assign({ "content-type": "application/json" }, be.token ? { "X-Oracle-Token": be.token } : {}),
          body: JSON.stringify({ system, messages }),
        });
        const j = await r.json();
        if (j.ok) { this.lastStatus = { mode: "ai", provider: j.provider || "backend" }; return j.text; }
        this.lastStatus = { mode: "offline", reason: this.cause(j.error) };
        return this.fallback(userMessage) + this.downNote(j.error);
      } catch (e) {
        this.lastStatus = { mode: "offline", reason: this.cause("réseau : " + e.message) };
        return this.fallback(userMessage) + this.downNote("réseau : " + e.message);
      }
    }

    // 2) Clé directe côté téléphone
    if (!ai.key) { this.lastStatus = { mode: "offline", reason: "aucune clé" }; return this.fallback(userMessage); }
    const model = ai.model || DATA.AI_PROVIDERS[ai.provider].model;
    try {
      let text;
      if (ai.provider === "claude") text = await this.callClaude(ai.key, model, system, messages);
      else if (ai.provider === "gemini") text = await this.callGemini(ai.key, model, system, messages);
      else if (ai.provider === "openrouter") text = await this.callOAI(ai.key, model, system, messages, "https://openrouter.ai/api/v1/chat/completions");
      else text = await this.callOAI(ai.key, model, system, messages, "https://api.groq.com/openai/v1/chat/completions");
      this.lastStatus = { mode: "ai", provider: ai.provider };
      return text;
    } catch (e) {
      this.lastStatus = { mode: "offline", reason: this.cause(e.message) };
      return this.fallback(userMessage) + this.downNote(e.message);
    }
  },

  async callClaude(key, model, system, messages) {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
      body: JSON.stringify({ model, max_tokens: 1600, system, messages: messages.map(m => ({ role: m.role === "ai" ? "assistant" : "user", content: m.content })) }),
    });
    if (!r.ok) throw new Error(`HTTP ${r.status} — ${(await r.text()).slice(0, 160)}`);
    const j = await r.json();
    return (j.content || []).filter(b => b.type === "text").map(b => b.text).join("") || "(réponse vide)";
  },
  async callOAI(key, model, system, messages, url) {
    const r = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", "authorization": "Bearer " + key },
      body: JSON.stringify({ model, max_tokens: 1600, messages: [{ role: "system", content: system }, ...messages.map(m => ({ role: m.role === "ai" ? "assistant" : "user", content: m.content }))] }),
    });
    if (!r.ok) throw new Error(`HTTP ${r.status} — ${(await r.text()).slice(0, 160)}`);
    const j = await r.json();
    return j.choices?.[0]?.message?.content || "(réponse vide)";
  },
  async callGemini(key, model, system, messages) {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ system_instruction: { parts: [{ text: system }] }, contents: messages.map(m => ({ role: m.role === "ai" ? "model" : "user", parts: [{ text: m.content }] })), generationConfig: { maxOutputTokens: 1600 } }),
    });
    if (!r.ok) throw new Error(`HTTP ${r.status} — ${(await r.text()).slice(0, 160)}`);
    const j = await r.json();
    return j.candidates?.[0]?.content?.parts?.map(p => p.text).join("") || "(réponse vide)";
  },

  /* ---------- Exécution des directives ---------- */
  // Retourne { clean, effects[] } : texte nettoyé + liste d'effets appliqués.
  applyDirectives(text) {
    const c = State.current();
    const effects = [];
    if (!c) return { clean: text, effects };

    // [CSS] ... [/CSS]
    text = text.replace(/\[CSS\]([\s\S]*?)\[\/CSS\]/gi, (_, css) => {
      css = css.trim();
      c.customCss = (/^reset$/i.test(css) || css === "") ? "" : css.slice(0, 4000);
      effects.push("🎨 interface");
      return "";
    });

    const kv = (s) => {
      const o = {};
      s.split(";").forEach(pair => {
        const i = pair.indexOf("=");
        if (i < 0) return;
        const k = pair.slice(0, i).trim().toLowerCase();
        o[k] = pair.slice(i + 1).trim();
      });
      return o;
    };

    const rules = [
      [/\[SCENE:\s*([^\]]+)\]/gi, (a) => {
        const o = kv(a);
        c.scene = { title: o.titre || o.title || c.scene.title, mood: o.ambiance || o.mood || "" };
        State.log({ kind: "scene", text: c.scene.title + (c.scene.mood ? " — " + c.scene.mood : "") });
        effects.push("📍 scène");
      }],
      [/\[PNJ:\s*([^\]]+)\]/gi, (a) => {
        const o = kv(a); const name = o.nom || o.name; if (!name) return;
        let n = c.npcs.find(x => x.name.toLowerCase() === name.toLowerCase());
        if (!n) { n = { id: "n_" + Math.random().toString(36).slice(2, 7), name }; c.npcs.push(n); }
        if (o.role) n.role = o.role;
        if (o.trait) n.trait = o.trait;
        if (o.lieu || o.place) n.place = o.lieu || o.place;
        if (o.attitude) n.attitude = o.attitude;
        effects.push("💬 PNJ " + name);
      }],
      [/\[PNJVOIX:\s*([^\]]+)\]/gi, (a) => {
        const o = kv(a); const name = o.nom || o.name || "PNJ";
        State.log({ kind: "pnj", who: name, text: o.texte || o.text || "" });
        effects.push("🗣️ " + name);
      }],
      [/\[PV:\s*([^\]]+)\]/gi, (a) => {
        const o = kv(a); const h = State.heroByName(o.cible || o.name); if (!h) return;
        const d = parseInt(o.delta || "0", 10) || 0;
        h.hp = Math.max(0, Math.min(h.maxHp, h.hp + d));
        State.log({ kind: "event", text: `${h.name} : ${d >= 0 ? "+" : ""}${d} PV (→ ${h.hp}/${h.maxHp})` });
        effects.push((d < 0 ? "💥 " : "❤️ ") + h.name);
      }],
      [/\[PJ:\s*([^\]]+)\]/gi, (a) => {
        const o = kv(a); const h = State.heroByName(o.cible || o.name); if (!h) return;
        Object.entries(o).forEach(([k, v]) => {
          if (k === "cible" || k === "name") return;
          if (k === "armor" || k === "hp" || k === "maxhp" || k === "xp") h[k === "maxhp" ? "maxHp" : k] = parseInt(v, 10) || h[k];
          else if (k === "concept" || k === "abilities" || k === "bonds") h[k] = v;
          else if (k === "condition+") { if (!h.conditions.includes(v)) h.conditions.push(v); }
          else if (k === "condition-") { h.conditions = h.conditions.filter(x => x !== v); }
          else if (c.attrs.includes(k) || c.attrs.map(x => x.toLowerCase()).includes(k)) {
            const key = c.attrs.find(x => x.toLowerCase() === k) || k; h.stats[key] = isNaN(+v) ? v : +v;
          }
        });
        effects.push("🛡️ " + h.name);
      }],
      [/\[OBJET:\s*([^\]]+)\]/gi, (a) => {
        const o = kv(a); const h = State.heroByName(o.cible || o.name); if (!h) return;
        if (o.ajoute || o.add) { h.gear.push(o.ajoute || o.add); effects.push("🎒 +" + (o.ajoute || o.add)); }
        if (o.retire || o.remove) { const it = (o.retire || o.remove).toLowerCase(); h.gear = h.gear.filter(x => x.toLowerCase() !== it); effects.push("🎒 −"); }
      }],
      [/\[QUETE:\s*([^\]]+)\]/gi, (a) => {
        const o = kv(a); const title = o.titre || o.title; if (!title) return;
        let q = c.quests.find(x => x.title.toLowerCase() === title.toLowerCase());
        if (!q) { q = { id: "q_" + Math.random().toString(36).slice(2, 7), title, desc: "", state: "active" }; c.quests.push(q); }
        if (o.desc) q.desc = o.desc;
        if (o.etat || o.state) q.state = (o.etat || o.state);
        effects.push("🎯 " + title);
      }],
      [/\[LIEU:\s*([^\]]+)\]/gi, (a) => {
        const o = kv(a); const name = o.nom || o.name; if (!name) return;
        let p = c.places.find(x => x.name.toLowerCase() === name.toLowerCase());
        if (!p) { p = { id: "l_" + Math.random().toString(36).slice(2, 7), name, desc: "" }; c.places.push(p); }
        if (o.desc) p.desc = o.desc;
        effects.push("🗺️ " + name);
      }],
      [/\[BESTIAIRE:\s*([^\]]+)\]/gi, (a) => {
        const o = kv(a); const name = o.nom || o.name; if (!name) return;
        let b = c.bestiary.find(x => x.name.toLowerCase() === name.toLowerCase());
        if (!b) { b = { id: "b_" + Math.random().toString(36).slice(2, 7), name }; c.bestiary.push(b); }
        if (o.pv) b.hp = parseInt(o.pv, 10) || o.pv;
        if (o.menace || o.threat) b.threat = o.menace || o.threat;
        if (o.trait) b.trait = o.trait;
        effects.push("🐉 " + name);
      }],
      [/\[COMBAT:\s*([^\]]+)\]/gi, (a) => {
        const v = a.trim().toLowerCase();
        if (/start|debut|début|on|go/.test(v)) {
          c.combat = { active: true, round: 1, turn: 0, order: [] };
          c.heroes.forEach(h => c.combat.order.push({ name: h.name, id: h.id, isHero: true, init: (typeof Dice !== "undefined" ? Dice.initiative(h).total : 10), hp: h.hp }));
          c.combat.order.sort((x, y) => y.init - x.init);
          State.log({ kind: "event", text: "⚔️ Combat ! Initiative : " + c.combat.order.map(o => o.name + "(" + o.init + ")").join(" → ") });
          effects.push("⚔️ combat");
        } else if (/stop|fin|end|off/.test(v)) {
          if (c.combat) c.combat.active = false;
          State.log({ kind: "event", text: "🏁 Fin du combat." });
          effects.push("🏁 combat");
        }
      }],
      [/\[INIT:\s*([^\]]+)\]/gi, (a) => {
        const o = kv(a); const name = o.nom || o.name; if (!name) return;
        if (!c.combat || !c.combat.active) c.combat = { active: true, round: 1, turn: 0, order: c.combat ? c.combat.order : [] };
        c.combat.active = true;
        c.combat.order.push({ name, init: parseInt(o.valeur || o.init, 10) || 10, hp: o.pv ? parseInt(o.pv, 10) : null, isHero: false });
        c.combat.order.sort((x, y) => y.init - x.init);
        effects.push("🎯 init " + name);
      }],
      [/\[TOUR\]/gi, () => {
        if (!c.combat || !c.combat.active) return;
        c.combat.turn++;
        if (c.combat.turn >= c.combat.order.length) { c.combat.turn = 0; c.combat.round++; }
        effects.push("⏭️ tour");
      }],
      [/\[FAIT:\s*([^\]]+)\]/gi, (a) => { State.log({ kind: "event", text: a.trim() }); effects.push("⚡ fait"); }],
      [/\[MEMO:\s*([^\]]+)\]/gi, (a) => { State.remember(a.trim()); effects.push("🧠 canon"); }],
      [/\[AMBIANCE:\s*([^\]]+)\]/gi, (a) => {
        const o = kv(a);
        if (o.theme && DATA.THEMES[o.theme]) c.theme = o.theme;
        if (o.accent) c.accent = /^reset$/i.test(o.accent) ? "" : o.accent;
        effects.push("🌌 ambiance");
      }],
      [/\[STYLE:\s*([^\]]+)\]/gi, (a) => {
        if (/^\s*reset\s*$/i.test(a)) { c.style = {}; effects.push("🎨 style reset"); return; }
        const o = kv(a); c.style = Object.assign(c.style || {}, o); effects.push("🎨 style");
      }],
      // [JET] géré à part (asynchrone) — voir extractRolls
    ];

    rules.forEach(([re, fn]) => { text = text.replace(re, (m, a) => { try { fn(a); } catch (e) {} return ""; }); });

    // nettoyage des lignes vides résiduelles
    text = text.replace(/\n{3,}/g, "\n\n").trim();
    State.applyTheme();
    State.save();
    return { clean: text, effects };
  },

  // Extrait les demandes de jet [JET: …] pour que l'app les lance.
  extractRolls(text) {
    const rolls = [];
    text = text.replace(/\[JET:\s*([^\]]+)\]/gi, (m, a) => {
      const o = {}; a.split(";").forEach(p => { const i = p.indexOf("="); if (i > 0) o[p.slice(0, i).trim().toLowerCase()] = p.slice(i + 1).trim(); });
      rolls.push({
        who: o.cible || o.name || "",
        skill: o.comp || o.skill || "", save: (o.sauvegarde || o.save || "").toUpperCase(),
        ability: (o.carac || o.ability || "").toUpperCase(), attack: o.attaque || o.attack || "",
        bonus: parseInt(o.bonus, 10) || 0,
        adv: /^(1|oui|true|avantage)$/i.test(o.avantage || o.adv || ""),
        dis: /^(1|oui|true|desavantage)$/i.test(o.desavantage || o.dis || ""),
        dc: parseInt(o.diff || o.dc, 10), formula: o.formule || o.formula,
      });
      return "";
    });
    return { text: text.replace(/\n{3,}/g, "\n\n").trim(), rolls };
  },

  /* ---------- Diagnostic ---------- */
  cause(err) {
    const e = (err || "").toLowerCase();
    if (/429|quota|rate.?limit|crédit|credit|billing|exceeded|insufficient/.test(e)) return "plus de crédit / quota";
    if (/401|403|auth|invalid|api key|clé/.test(e)) return "clé invalide";
    if (/network|timeout|injoign|fetch|failed|réseau|econn|502|503|504/.test(e)) return "réseau indisponible";
    return "IA indisponible";
  },
  downNote(err) {
    return `\n\n———\n⚠️ _Oracle IA en pause (${this.cause(err)}) — mode hors-ligne actif : dés, fiches et générateurs marchent toujours. Configure l'IA dans l'onglet Table pour la narration complète._`;
  },

  /* ---------- Oracle hors-ligne (sans IA) ---------- */
  fallback(msg) {
    const c = State.current();
    const g = DATA.GENRES[c?.genre] || DATA.GENRES.custom;
    const pick = arr => arr[Math.floor(Math.random() * arr.length)];
    const m = (msg || "").toLowerCase();
    if (/\?$/.test(msg.trim()) || /est-ce que|y a-t-il|peut-|réussi|est-il|sont-ils/.test(m)) {
      return `🔮 **Oracle** : ${pick(DATA.ORACLE_YESNO)}\n\n_(mode hors-ligne — réponse d'oracle. Active l'IA pour une vraie narration)_`;
    }
    if (/pnj|personnage|rencontre/.test(m)) {
      const bank = g.name.toLowerCase().includes("sci") || g.name.toLowerCase().includes("cyber") ? DATA.NAME_BANK.scifi : (g.name.toLowerCase().includes("dark") ? DATA.NAME_BANK.dark : DATA.NAME_BANK.fantasy);
      return `🔮 PNJ improvisé : **${pick(bank)}**, ${pick(DATA.NPC_ROLES)} — qui ${pick(DATA.NPC_TRAITS)}.\n\n_(mode hors-ligne)_`;
    }
    if (/complication|imprévu|problème|obstacle/.test(m)) return `🔮 Complication : ${pick(DATA.COMPLICATIONS)}.\n\n_(mode hors-ligne)_`;
    if (/récompense|trésor|butin|gagne/.test(m)) return `🔮 Récompense : ${pick(DATA.REWARDS)}.\n\n_(mode hors-ligne)_`;
    return `🔮 Piste : ${pick(DATA.ORACLE_YESNO)} — et pense à ${pick(DATA.COMPLICATIONS)}.\n\n_(mode hors-ligne — active l'IA dans l'onglet Table pour la narration complète de l'Oracle)_`;
  },
};
