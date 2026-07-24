/* ============================================================
   Oracle — onboarding & démarrage.
   ============================================================ */

const App = {
  ob: { step: 0, draft: null },

  boot() {
    State.load();
    State.applyTheme();
    // navigation
    document.querySelectorAll(".tab").forEach(t => t.addEventListener("click", () => UI.go(t.dataset.view)));
    document.getElementById("hudAiBadge").addEventListener("click", () => UI.go("table"));

    if (!State.data.campaigns.length || !State.current()) {
      this.startOnboarding(false);
    } else {
      document.getElementById("app").classList.remove("hidden");
      UI.go("play");
      const c = State.current();
      if (c && c.kickoff) UI.runKickoff();
    }
  },

  /* ---------- Onboarding (création d'une campagne) ---------- */
  startOnboarding(fromApp) {
    this.ob = { step: 0, draft: State.blankCampaign(), fromApp: !!fromApp, heroes: [] };
    document.getElementById("app").classList.add("hidden");
    const ob = document.getElementById("onboarding");
    ob.classList.remove("hidden");
    this.renderOb();
  },

  steps() {
    const d = this.ob.draft;
    const welcome = () => `<div class="ob-hero">
        <div class="ob-crest">🔮</div>
        <h1>Oracle</h1>
        <p class="ob-tag">Ton compagnon de <b>jeu de rôle</b> — un co-Maître du Jeu IA basé sur les <b>règles D&D 5e</b>, avec un <b>univers 100 % adaptable</b>. Il mène la partie en temps réel et retient toute ta campagne.</p>
        <button class="btn btn-primary btn-block" onclick="App.obNext()">Créer ma campagne ⚔️</button>
        ${this.ob.fromApp ? `<button class="btn btn-ghost btn-block" onclick="App.obCancel()">Annuler</button>` : ""}
      </div>`;
    const chooseAdv = () => `<div class="ob-panel">
        <h2>Choisis ton aventure</h2>
        <p class="ob-sub">Fais voter tes joueurs ! Toutes tournent sur la même base <b>D&D 5e</b> — seuls l'univers, l'ambiance et les noms (classes, équipement, magie) changent.</p>
        <div class="preset-grid">
          ${DATA.PRESETS.map(p => `<button class="preset-opt ${d.presetId === p.id ? "sel" : ""}" onclick="App.obPickPreset('${p.id}')">
            <div class="preset-head"><span class="preset-ico">${p.ico}</span><span class="preset-name">${p.name}</span></div>
            <div class="preset-tag">${p.blurb}</div>
            <div class="preset-pitch">${UI.esc(p.pitch)}</div></button>`).join("")}
          <button class="preset-opt custom ${d.mode === "custom" ? "sel" : ""}" onclick="App.obPickCustom()">
            <div class="preset-head"><span class="preset-ico">🎨</span><span class="preset-name">Univers sur-mesure</span></div>
            <div class="preset-tag">Le tien, de zéro</div>
            <div class="preset-pitch">Choisis l'univers, le ton et l'idée toi-même — ou laisse l'Oracle tout bâtir.</div></button>
        </div>
        <div class="ob-nav"><button class="btn btn-ghost" onclick="App.obBack()">←</button></div>
      </div>`;
    const genre = () => `<div class="ob-panel">
        <h2>Quel univers ?</h2>
        <p class="ob-sub">Les mécaniques suivent la <b>D&D 5e</b> ; seul le <b>lore</b> change. L'Oracle adaptera son ton et son décor au thème choisi (modifiable ensuite dans Table).</p>
        <div class="genre-grid">
          ${Object.entries(DATA.GENRES).map(([k, g]) => `<button class="genre-opt ${d.genre === k ? "sel" : ""}" onclick="App.obPickGenre('${k}')">
            <span class="genre-ico">${g.ico}</span><span class="genre-name">${g.name}</span></button>`).join("")}
        </div>
        <div class="ob-nav"><button class="btn btn-ghost" onclick="App.obBack()">←</button><button class="btn btn-primary" onclick="App.obNext()">Suivant →</button></div>
      </div>`;
    const meta = () => `<div class="ob-panel">
        <h2>Ta campagne</h2>
        <label class="f">Nom de la campagne<input id="obName" value="${UI.esc(d.name === "Nouvelle campagne" ? "" : d.name)}" placeholder="ex : Les Cendres de Valmyr"></label>
        <label class="f">Ton narratif<select id="obTone">${Object.entries(DATA.TONES).map(([k, t]) => `<option value="${k}" ${k === d.tone ? "selected" : ""}>${t.ico} ${t.name}</option>`).join("")}</select></label>
        <label class="f">Pitch / idée de départ (optionnel)<textarea id="obPitch" rows="3" placeholder="De quoi ça parle ? Où commence l'aventure ?">${UI.esc(d.pitch)}</textarea></label>
        <div class="ob-nav"><button class="btn btn-ghost" onclick="App.obBack()">←</button><button class="btn btn-primary" onclick="App.obSaveMeta()">Suivant →</button></div>
      </div>`;
    const metaPreset = () => { const p = DATA.PRESETS.find(x => x.id === d.presetId) || {}; const sk = d.skin ? DATA.SKINS[d.skin] : null; return `<div class="ob-panel">
        <h2>${p.ico} ${UI.esc(p.name)}</h2>
        <p class="ob-sub">${UI.esc(p.pitch)}</p>
        <div class="preset-recap"><b>Enjeu :</b> ${UI.esc(p.stakes)}<br><b>Ambiance :</b> ${UI.esc((DATA.THEMES[p.theme] || {}).name || p.theme)} · ${UI.esc((DATA.TONES[p.tone] || {}).name || p.tone)}${sk ? `<br><b>Classes reskinées</b> (magie = ${UI.esc(sk.magic)}) — la mécanique 5e ne change pas.` : ""}</div>
        <label class="f">Nom de ta campagne<input id="obName" value="${UI.esc(d.name)}"></label>
        <div class="ob-nav"><button class="btn btn-ghost" onclick="App.obBack()">←</button><button class="btn btn-primary" onclick="App.obSavePreset()">Les héros →</button></div>
      </div>`; };
    const start = () => `<div class="ob-panel">
        <h2>Comment démarrer ?</h2>
        <p class="ob-sub">L'Oracle s'adapte : pars de rien, laisse-le tout inventer, ou reprends une partie déjà commencée.</p>
        <div class="start-grid">
          <button class="start-opt ${this.ob.draft.origin === "scratch" ? "sel" : ""}" onclick="App.obStart('scratch')">
            <span class="start-ico">🛠️</span><span class="start-t">Je gère, de zéro</span><span class="start-d">Tu poses ton histoire, l'Oracle t'assiste en temps réel.</span></button>
          <button class="start-opt ${this.ob.draft.origin === "generated" ? "sel" : ""}" onclick="App.obStart('generated')">
            <span class="start-ico">✨</span><span class="start-t">L'Oracle bâtit la campagne</span><span class="start-d">Il invente accroche, enjeu, quêtes, PNJ et 1ʳᵉ scène — inspiré des grands modules.</span></button>
          <button class="start-opt ${this.ob.draft.origin === "resume" ? "sel" : ""}" onclick="App.obStart('resume')">
            <span class="start-ico">🔄</span><span class="start-t">Reprendre une partie en cours</span><span class="start-d">Colle ce que tu as (histoire, module en ligne, notes d'un autre MJ) — il reprend le fil.</span></button>
        </div>
        <div class="ob-nav"><button class="btn btn-ghost" onclick="App.obBack()">←</button><button class="btn btn-primary" onclick="App.obNext()">Suivant →</button></div>
      </div>`;
    const resume = () => `<div class="ob-panel">
        <h2>Reprendre le fil 🔄</h2>
        <p class="ob-sub">Colle TOUT ce que tu as sur la campagne en cours : le résumé de l'histoire jusqu'ici, les personnages, où vous en êtes, un module trouvé en ligne, les notes d'un autre MJ… Plus tu en donnes, plus l'Oracle reprend avec pertinence. C'est du canon pour lui.</p>
        <textarea id="obResume" rows="10" placeholder="Ex : « On joue une campagne d'heroic fantasy. Le groupe (Kael le roublard, Mira la clerc…) a libéré un village d'un culte, puis suivi une piste vers la cité de Valmyr. Ils viennent de découvrir que le maire est possédé… »">${UI.esc(d.seed)}</textarea>
        <div class="ob-nav"><button class="btn btn-ghost" onclick="App.obBack()">←</button><button class="btn btn-primary" onclick="App.obSaveResume()">Suivant →</button></div>
      </div>`;
    const heroes = () => { const sk = d.skin ? DATA.SKINS[d.skin] : null; return `<div class="ob-panel">
        <h2>Les héros</h2>
        <p class="ob-sub">${d.origin === "resume" ? "Ajoute les personnages déjà en jeu (l'Oracle complétera le reste depuis ce que tu as collé)." : "Ajoute les personnages de tes joueurs (tu compléteras les fiches après)."}${sk ? " Les classes sont affichées avec les noms de l'univers — la mécanique reste 5e." : ""} Tu peux aussi passer et les créer plus tard.</p>
        <div id="obHeroes" class="ob-heroes">${this.ob.heroes.map((h, i) => `<div class="ob-hero-row">
          <input placeholder="Nom du perso" value="${UI.esc(h.name)}" onchange="App.obHeroField(${i},'name',this.value)">
          <input placeholder="Joueur" value="${UI.esc(h.player)}" onchange="App.obHeroField(${i},'player',this.value)">
          <select onchange="App.obHeroField(${i},'cls',this.value)">${Object.keys(DND.CLASSES).map(cl => { const lbl = sk && sk.classNames[cl] ? sk.classNames[cl] + " (" + cl + ")" : cl; return `<option value="${cl}" ${cl === (h.cls || "Guerrier") ? "selected" : ""}>${lbl}</option>`; }).join("")}</select>
          <button class="wdel" onclick="App.obHeroDel(${i})">✕</button>
        </div>`).join("")}</div>
        <button class="btn btn-ghost btn-sm" onclick="App.obHeroAdd()">＋ Ajouter un héros</button>
        <div class="ob-nav"><button class="btn btn-ghost" onclick="App.obBack()">←</button><button class="btn btn-primary" onclick="App.obFinish()">${d.presetId || d.origin === "scratch" ? "Lancer la campagne 🔮" : "Laisser l'Oracle lancer 🔮"}</button></div>
      </div>`; };

    const arr = [welcome, chooseAdv];
    if (d.presetId) arr.push(metaPreset);
    else if (d.mode === "custom") { arr.push(genre, meta, start); if (d.origin === "resume") arr.push(resume); }
    arr.push(heroes);
    return arr;
  },

  renderOb() {
    const steps = this.steps();
    document.getElementById("obBar").style.width = ((this.ob.step) / (steps.length - 1) * 100) + "%";
    document.getElementById("obSteps").innerHTML = steps[this.ob.step]();
  },
  obNext() { this.ob.step++; this.renderOb(); },
  obBack() { if (this.ob.step > 0) { this.ob.step--; this.renderOb(); } },
  obCancel() { document.getElementById("onboarding").classList.add("hidden"); document.getElementById("app").classList.remove("hidden"); UI.go("table"); },
  obPickGenre(k) {
    this.ob.draft.genre = k;
    const g = DATA.GENRES[k];
    this.ob.draft.theme = g.theme;  // le lore change, la mécanique reste D&D 5e
    if (!this.ob.draft.pitch) this.ob.draft.pitch = g.pitch;
    this.renderOb();
  },
  obSaveMeta() {
    this.ob.draft.name = document.getElementById("obName").value.trim() || "Ma campagne";
    this.ob.draft.tone = document.getElementById("obTone").value;
    this.ob.draft.pitch = document.getElementById("obPitch").value.trim();
    this.obNext();
  },
  obPickPreset(id) {
    const p = DATA.PRESETS.find(x => x.id === id); if (!p) return;
    const d = this.ob.draft;
    d.mode = "preset"; d.presetId = id;
    d.genre = p.genre; d.theme = p.theme; d.tone = p.tone; d.skin = p.skin || null;
    d.pitch = p.pitch; d.stakes = p.stakes; d.scene = { title: p.scene.title, mood: p.scene.mood };
    d.name = p.name; d.origin = "scratch";
    this.obNext();
  },
  obPickCustom() { const d = this.ob.draft; d.mode = "custom"; d.presetId = ""; d.skin = null; this.obNext(); },
  obSavePreset() {
    const p = DATA.PRESETS.find(x => x.id === this.ob.draft.presetId) || {};
    this.ob.draft.name = document.getElementById("obName").value.trim() || p.name || "Ma campagne";
    this.obNext();
  },
  obStart(mode) { this.ob.draft.origin = mode; this.renderOb(); },
  obSaveResume() { this.ob.draft.seed = document.getElementById("obResume").value.trim(); this.obNext(); },
  obHeroAdd() { this.ob.heroes.push({ name: "", player: "", cls: "Guerrier" }); this.renderOb(); },
  obHeroDel(i) { this.ob.heroes.splice(i, 1); this.renderOb(); },
  obHeroField(i, f, v) { this.ob.heroes[i][f] = v; },
  obFinish() {
    // sauvegarde les inputs héros visibles
    const c = State.createCampaign(this.ob.draft);
    this.ob.heroes.filter(h => h.name.trim()).forEach(h => {
      State.addHero({ name: h.name.trim(), player: h.player.trim(), cls: h.cls || "Guerrier",
        avatar: DATA.AVATARS[Math.floor(Math.random() * DATA.AVATARS.length)] });
    });
    // enregistre aussi la liste des joueurs
    const players = [...new Set(this.ob.heroes.map(h => h.player.trim()).filter(Boolean))];
    if (players.length) State.data.players = players;
    // consigne de lancement automatique selon le mode de démarrage
    if (c.presetId) {
      c.kickoff = `Ouvre l'aventure « ${c.name} ». Plante la scène d'ouverture « ${c.scene.title} » (${c.scene.mood}) de façon immersive et fidèle au pitch, présente brièvement la situation aux ${c.heroes.length || 4} héros, puis propose 2-3 amorces d'action concrètes. Enregistre au besoin PNJ/lieux/quêtes via tes directives. Reste dans l'ambiance ${(DATA.TONES[c.tone] || {}).name || c.tone}.`;
    } else if (c.origin === "generated") {
      c.kickoff = "Bâtis cette campagne de A à Z, inspirée des grands modules d'aventure (sans copier de texte sous copyright). Pose : l'accroche d'ouverture, l'enjeu central, 2 à 3 quêtes, 2 à 3 PNJ clés, le lieu de départ et la toute première scène. Enregistre tout via tes directives ([QUETE:], [PNJ:], [LIEU:], [SCENE:], [MEMO:], [AMBIANCE:]), puis lance la partie sur un choix concret proposé aux joueurs.";
    } else if (c.origin === "resume") {
      c.kickoff = "Je reprends une campagne DÉJÀ en cours (tout est dans les NOTES/canon que je t'ai fournis). Analyse-la et structure-la dans l'app : enregistre les PNJ, lieux, quêtes en cours et faits importants via tes directives, pose la scène actuelle ([SCENE:]) et l'ambiance ([AMBIANCE:]). Fais ensuite un court « Précédemment… » (2-3 phrases) pour resituer la table, puis relance immédiatement la partie de façon captivante sur un choix concret. Si une info vraiment cruciale manque, pose au plus 1-2 questions.";
    }
    State.save();
    document.getElementById("onboarding").classList.add("hidden");
    document.getElementById("app").classList.remove("hidden");
    State.applyTheme();
    UI.go("play");
    if (c.kickoff) UI.runKickoff();
    else UI.toast("Campagne créée — que l'aventure commence ! 🔮", "ok");
  },
};

window.addEventListener("DOMContentLoaded", () => App.boot());
