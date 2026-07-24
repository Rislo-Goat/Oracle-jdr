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
    return [
      // 0 — accueil
      () => `<div class="ob-hero">
        <div class="ob-crest">🔮</div>
        <h1>Oracle</h1>
        <p class="ob-tag">Ton compagnon de <b>jeu de rôle</b> — un co-Maître du Jeu IA basé sur les <b>règles D&D 5e</b>, avec un <b>univers 100 % adaptable</b>. Il mène la partie en temps réel et retient toute ta campagne.</p>
        <button class="btn btn-primary btn-block" onclick="App.obNext()">Créer ma campagne ⚔️</button>
        ${this.ob.fromApp ? `<button class="btn btn-ghost btn-block" onclick="App.obCancel()">Annuler</button>` : ""}
      </div>`,
      // 1 — univers
      () => `<div class="ob-panel">
        <h2>Quel univers ?</h2>
        <p class="ob-sub">Les mécaniques suivent la <b>D&D 5e</b> ; seul le <b>lore</b> change. L'Oracle adaptera son ton et son décor au thème choisi (modifiable ensuite dans Table).</p>
        <div class="genre-grid">
          ${Object.entries(DATA.GENRES).map(([k, g]) => `<button class="genre-opt ${this.ob.draft.genre === k ? "sel" : ""}" onclick="App.obPickGenre('${k}')">
            <span class="genre-ico">${g.ico}</span><span class="genre-name">${g.name}</span></button>`).join("")}
        </div>
        <div class="ob-nav"><button class="btn btn-ghost" onclick="App.obBack()">←</button><button class="btn btn-primary" onclick="App.obNext()">Suivant →</button></div>
      </div>`,
      // 2 — nom + ton + pitch
      () => `<div class="ob-panel">
        <h2>Ta campagne</h2>
        <label class="f">Nom de la campagne<input id="obName" value="${UI.esc(this.ob.draft.name === "Nouvelle campagne" ? "" : this.ob.draft.name)}" placeholder="ex : Les Cendres de Valmyr"></label>
        <label class="f">Ton narratif<select id="obTone">${Object.entries(DATA.TONES).map(([k, t]) => `<option value="${k}" ${k === this.ob.draft.tone ? "selected" : ""}>${t.ico} ${t.name}</option>`).join("")}</select></label>
        <label class="f">Pitch / idée de départ (optionnel)<textarea id="obPitch" rows="3" placeholder="De quoi ça parle ? Où commence l'aventure ?">${UI.esc(this.ob.draft.pitch)}</textarea></label>
        <div class="ob-nav"><button class="btn btn-ghost" onclick="App.obBack()">←</button><button class="btn btn-primary" onclick="App.obSaveMeta()">Suivant →</button></div>
      </div>`,
      // 3 — héros
      () => `<div class="ob-panel">
        <h2>Les héros</h2>
        <p class="ob-sub">Ajoute les personnages de tes joueurs (tu pourras compléter les fiches après). Tu peux aussi passer et les créer plus tard.</p>
        <div id="obHeroes" class="ob-heroes">${this.ob.heroes.map((h, i) => `<div class="ob-hero-row">
          <input placeholder="Nom du perso" value="${UI.esc(h.name)}" onchange="App.obHeroField(${i},'name',this.value)">
          <input placeholder="Joueur" value="${UI.esc(h.player)}" onchange="App.obHeroField(${i},'player',this.value)">
          <select onchange="App.obHeroField(${i},'cls',this.value)">${Object.keys(DND.CLASSES).map(cl => `<option ${cl === (h.cls || "Guerrier") ? "selected" : ""}>${cl}</option>`).join("")}</select>
          <button class="wdel" onclick="App.obHeroDel(${i})">✕</button>
        </div>`).join("")}</div>
        <button class="btn btn-ghost btn-sm" onclick="App.obHeroAdd()">＋ Ajouter un héros</button>
        <div class="ob-nav"><button class="btn btn-ghost" onclick="App.obBack()">←</button><button class="btn btn-primary" onclick="App.obFinish()">Lancer la campagne 🔮</button></div>
      </div>`,
    ];
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
    State.save();
    document.getElementById("onboarding").classList.add("hidden");
    document.getElementById("app").classList.remove("hidden");
    State.applyTheme();
    UI.go("play");
    UI.toast("Campagne créée — que l'aventure commence ! 🔮", "ok");
  },
};

window.addEventListener("DOMContentLoaded", () => App.boot());
