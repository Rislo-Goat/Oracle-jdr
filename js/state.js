/* ============================================================
   Oracle — état & persistance.
   Tout vit dans le localStorage du téléphone (aucun compte, aucun
   serveur de données). Support multi-campagnes.
   ============================================================ */

const State = {
  KEY: "oracle.v1",
  data: null,

  /* ---------- Structure d'une campagne vierge ---------- */
  blankCampaign(over = {}) {
    const id = "camp_" + Math.random().toString(36).slice(2, 9);
    return Object.assign({
      id,
      name: "Nouvelle campagne",
      genre: "fantasy",
      tone: "aventure",
      system: "dnd5e",         // moteur D&D 5e par défaut (lore adaptable)
      theme: "royal",
      accent: "",
      pitch: "",
      stakes: "",              // l'enjeu central
      attrs: Object.values(DND.ABILITIES),  // les 6 caracs 5e (fallback d'affichage)
      session: 1,
      scene: { title: "", mood: "" },
      combat: { active: false, round: 0, turn: 0, order: [] },  // suivi d'initiative
      mjHeroId: "",            // le perso que TOI (le MJ) joues aussi (double rôle)
      origin: "scratch",       // scratch | generated | resume
      kickoff: "",             // 1ère consigne à jouer automatiquement (génération/reprise)
      skin: null,              // reskin d'univers (clé DATA.SKINS) : renomme classes/équipement
      presetId: "",            // aventure prête choisie au lancement
      heroes: [],              // les PJ (jusqu'à ~6)
      npcs: [],                // PNJ
      places: [],              // lieux
      quests: [],              // objectifs / quêtes
      bestiary: [],            // créatures / menaces
      chronicle: [],           // journal chronologique de la partie
      lore: [],                // canon / mémoire longue durée de l'Oracle
      seed: "",                // notes brutes injectées par le joueur (conversations passées)
      chat: [],                // discussion libre avec l'Oracle (onglet Oracle)
      customCss: "",           // CSS custom posé par l'Oracle
      style: {},               // tokens de style custom
      created: Date.now(),
    }, over);
  },

  blankHero(over = {}) {
    return Object.assign({
      id: "pj_" + Math.random().toString(36).slice(2, 8),
      name: "Nouveau héros",
      player: "",              // le vrai joueur à la table
      avatar: "🛡️",
      // ── D&D 5e ──
      race: "Humain",
      cls: "Guerrier",         // classe
      level: 1,
      concept: "",             // sous-classe / archétype (libre)
      abilities: { FOR: 10, DEX: 10, CON: 10, INT: 10, SAG: 10, CHA: 10 },
      skillProfs: [],          // compétences maîtrisées
      saveProfs: [],           // jets de sauvegarde maîtrisés (caracs)
      hp: 10, maxHp: 10,
      armor: 12,               // classe d'armure (CA)
      speed: 9,                // vitesse (m)
      deathSaves: { s: 0, f: 0 },
      hitDice: "1d10",
      hitDiceUsed: 0,          // dés de vie dépensés (repos)
      slotsUsed: {},           // emplacements de sorts dépensés { "1": 1, "2": 0 }
      gold: 0,                 // pièces d'or
      spells: "",              // sorts connus / notes (texte libre)
      // ── commun ──
      stats: {},               // caracs génériques (systèmes non-5e)
      feats: "",               // capacités / dons / atouts (texte libre)
      gear: [],                // inventaire
      conditions: [],          // états (5e)
      xp: 0,
      notes: "",
      bonds: "",               // liens / relations
    }, over);
  },

  // Applique les valeurs par défaut de la classe (dé de vie, sauvegardes, CA de base)
  applyClassDefaults(h) {
    const cl = DND.CLASSES[h.cls];
    if (!cl) return;
    h.hitDice = h.level + "d" + cl.hd;
    if (!h.saveProfs || !h.saveProfs.length) h.saveProfs = cl.saves.slice();
    const conMod = DND.mod(h.abilities.CON);
    const suggested = DND.baseHp(h.cls, conMod, h.level);
    if (!h._hpTouched) { h.maxHp = suggested; h.hp = suggested; }
    if (!h.armor || h.armor === 12) h.armor = 10 + DND.mod(h.abilities.DEX);
  },

  /* ---------- Chargement / sauvegarde ---------- */
  load() {
    try {
      this.data = JSON.parse(localStorage.getItem(this.KEY));
    } catch { this.data = null; }
    if (!this.data || !this.data.campaigns) {
      this.data = { campaigns: [], currentId: null, ai: { provider: "backend", key: "", model: "" },
                    backend: { url: location.origin, token: "" }, players: [], onboarded: false };
    }
    // Auto-détection du backend : par défaut la même origine que la PWA.
    if (!this.data.backend) this.data.backend = { url: location.origin, token: "" };
    if (!this.data.ai) this.data.ai = { provider: "backend", key: "", model: "" };
    if (!this.data.players) this.data.players = [];
    if (this.data.physicalDice === undefined) this.data.physicalDice = true; // vrais dés par défaut
    if (this.data.autoRead === undefined) this.data.autoRead = false; // lecture vocale auto
    if (this.data.voiceName === undefined) this.data.voiceName = ""; // voix choisie (auto par défaut)
    this.migrate();
    return this.data;
  },

  save() {
    try { localStorage.setItem(this.KEY, JSON.stringify(this.data)); }
    catch (e) { console.warn("save failed", e); }
  },

  /* ---------- Campagne courante ---------- */
  current() {
    return this.data.campaigns.find(c => c.id === this.data.currentId) || null;
  },

  createCampaign(over) {
    const c = this.blankCampaign(over);
    this.data.campaigns.push(c);
    this.data.currentId = c.id;
    this.save();
    return c;
  },

  switchCampaign(id) {
    this.data.currentId = id;
    this.save();
  },

  deleteCampaign(id) {
    this.data.campaigns = this.data.campaigns.filter(c => c.id !== id);
    if (this.data.currentId === id)
      this.data.currentId = this.data.campaigns[0]?.id || null;
    this.save();
  },

  /* ---------- Héros ---------- */
  // Applique le profil recommandé de la classe (caracs, compétences, sauvegardes,
  // équipement, sorts) + les bonus de race, puis recalcule PV/CA. Rend le perso
  // jouable en un coup, sans laisser de fiche vide.
  applyBuild(h) {
    const bd = DND.BUILDS[h.cls];
    if (bd) {
      h.abilities = Object.assign({ FOR: 10, DEX: 10, CON: 10, INT: 10, SAG: 10, CHA: 10 }, bd.abilities);
      const rb = DND.RACE_BONUS[h.race];
      if (rb) Object.entries(rb).forEach(([k, v]) => {
        if (k === "all") DND.ABILITY_ORDER.forEach(a => h.abilities[a] += v);
        else h.abilities[k] = (h.abilities[k] || 10) + v;
      });
      h.skillProfs = bd.skills.slice();
      h.gear = (bd.gear || []).slice();
      h.spells = bd.spells || "";
      h.feats = bd.feats || "";
    }
    const cl = DND.CLASSES[h.cls];
    if (cl && (!h.saveProfs || !h.saveProfs.length)) h.saveProfs = cl.saves.slice();
    h._hpTouched = false;
    this.applyClassDefaults(h);
    h.armor = DND.computeAC(h); // CA exacte selon armure / défense sans armure
    return h;
  },

  addHero(over) {
    const c = this.current(); if (!c) return null;
    const h = this.blankHero(over);
    if (c.system === "dnd5e") this.applyBuild(h);
    else (c.attrs || []).forEach(a => { if (h.stats[a] === undefined) h.stats[a] = 0; });
    c.heroes.push(h);
    this.save();
    return h;
  },

  // Migration douce : garantit les champs 5e sur d'anciennes fiches.
  migrate() {
    (this.data.campaigns || []).forEach(c => {
      if (!c.combat) c.combat = { active: false, round: 0, turn: 0, order: [] };
      if (c.mjHeroId == null) c.mjHeroId = "";
      if (!c.origin) c.origin = "scratch";
      if (c.kickoff == null) c.kickoff = "";
      if (c.skin === undefined) c.skin = null;
      if (c.presetId == null) c.presetId = "";
      (c.heroes || []).forEach(h => {
        if (!h.abilities || typeof h.abilities !== "object") h.abilities = { FOR: 10, DEX: 10, CON: 10, INT: 10, SAG: 10, CHA: 10 };
        if (!h.skillProfs) h.skillProfs = [];
        if (!h.saveProfs) h.saveProfs = [];
        if (h.level == null) h.level = 1;
        if (!h.race) h.race = "Humain";
        if (!h.cls) h.cls = "Guerrier";
        if (!h.deathSaves) h.deathSaves = { s: 0, f: 0 };
        if (h.hitDiceUsed == null) h.hitDiceUsed = 0;
        if (!h.slotsUsed || typeof h.slotsUsed !== "object") h.slotsUsed = {};
        if (h.gold == null) h.gold = 0;
        if (h.speed == null) h.speed = 9;
        // ancien champ "abilities" servait de texte capacités → migré vers feats
        if (typeof h.feats !== "string") h.feats = "";
      });
    });
  },
  removeHero(id) {
    const c = this.current(); if (!c) return;
    c.heroes = c.heroes.filter(h => h.id !== id);
    this.save();
  },
  hero(id) { return (this.current()?.heroes || []).find(h => h.id === id); },
  heroByName(name) {
    if (!name) return null;
    const c = this.current(); if (!c) return null;
    const n = name.trim().toLowerCase();
    return c.heroes.find(h => h.name.trim().toLowerCase() === n)
        || c.heroes.find(h => h.name.trim().toLowerCase().includes(n))
        || c.heroes.find(h => (h.player || "").trim().toLowerCase() === n);
  },

  /* ---------- Chronique (journal) ---------- */
  log(entry) {
    const c = this.current(); if (!c) return;
    c.chronicle.push(Object.assign({
      id: "e_" + Math.random().toString(36).slice(2, 8),
      t: Date.now(),
      session: c.session,
      kind: "note",           // note | action | oracle | dice | pnj | scene | event
      who: "",
      text: "",
    }, entry));
    // borne la taille (garde les 400 dernières entrées)
    if (c.chronicle.length > 400) c.chronicle = c.chronicle.slice(-400);
    this.save();
  },

  recentChronicle(n = 14) {
    const c = this.current(); if (!c) return [];
    return c.chronicle.slice(-n);
  },

  /* ---------- Lore / mémoire longue durée ---------- */
  remember(fact) {
    const c = this.current(); if (!c) return;
    fact = (fact || "").trim();
    if (!fact) return;
    if (c.lore.some(l => l.toLowerCase() === fact.toLowerCase())) return;
    c.lore.push(fact);
    if (c.lore.length > 200) c.lore = c.lore.slice(-200);
    this.save();
  },

  /* ---------- Application du thème / style en direct ---------- */
  applyTheme() {
    const c = this.current();
    const theme = c?.theme || "default";
    document.documentElement.setAttribute("data-theme", theme);
    // accent custom
    const accent = c?.accent;
    const root = document.documentElement;
    if (accent) root.style.setProperty("--accent", accent);
    else root.style.removeProperty("--accent");
    // tokens de style custom (posés par l'Oracle)
    const style = (c && c.style) || {};
    const TOK = ["bg","bg2","card","card2","border","text","muted","accent","accent2","gold","green","red","blue","orange"];
    TOK.forEach(t => root.style.removeProperty("--" + t));
    Object.entries(style).forEach(([k, v]) => {
      if (k === "radius") root.style.setProperty("--radius", v);
      else if (TOK.includes(k)) root.style.setProperty("--" + k, v);
    });
    if (style.radius) root.style.setProperty("--radius", style.radius);
    // CSS custom
    const el = document.getElementById("oracleCustomStyle");
    if (el) el.textContent = (c && c.customCss) || "";
    // couleur de la barre système
    const bg = getComputedStyle(root).getPropertyValue("--bg").trim();
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta && bg) meta.setAttribute("content", bg);
  },

  /* ---------- Export / import ---------- */
  exportJSON() {
    return JSON.stringify(this.data, null, 2);
  },
  // Import intelligent : fusionne les campagnes sans écraser tes réglages
  // (clé IA, backend, joueurs). Accepte une sauvegarde complète OU un simple
  // « pack de campagne » { campaigns:[…] }.
  importJSON(txt) {
    const obj = JSON.parse(txt);
    if (!obj || !Array.isArray(obj.campaigns)) throw new Error("Format invalide");
    let last = null;
    obj.campaigns.forEach(ic => {
      if (!ic || !ic.id) ic.id = "camp_" + Math.random().toString(36).slice(2, 9);
      const i = this.data.campaigns.findIndex(c => c.id === ic.id);
      if (i >= 0) this.data.campaigns[i] = ic; else this.data.campaigns.push(ic);
      last = ic.id;
    });
    if (last) this.data.currentId = last;
    // Ne récupère les réglages du fichier QUE s'ils manquent localement
    // (on ne veut jamais écraser une clé IA déjà saisie sur le téléphone).
    if (obj.ai && (!this.data.ai || !this.data.ai.key) && obj.ai.key) this.data.ai = obj.ai;
    if (obj.players && (!this.data.players || !this.data.players.length)) this.data.players = obj.players;
    this.migrate();
    this.save();
  },
};
