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
      system: "d20",
      theme: "royal",
      accent: "",
      pitch: "",
      stakes: "",              // l'enjeu central
      attrs: DATA.GENRES.fantasy.attrs.slice(),
      session: 1,
      scene: { title: "", mood: "" },
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
      concept: "",             // classe / archétype / rôle
      hp: 20, maxHp: 20,
      armor: 12,               // défense / seuil
      stats: {},               // rempli selon attrs de la campagne
      skills: "",              // compétences / atouts (texte libre)
      gear: [],                // inventaire
      abilities: "",           // capacités spéciales
      conditions: [],          // états (blessé, empoisonné…)
      xp: 0,
      notes: "",
      bonds: "",               // liens / relations
    }, over);
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
  addHero(over) {
    const c = this.current(); if (!c) return null;
    const h = this.blankHero(over);
    // initialise les stats selon les attributs de la campagne
    (c.attrs || []).forEach(a => { if (h.stats[a] === undefined) h.stats[a] = 0; });
    c.heroes.push(h);
    this.save();
    return h;
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
  importJSON(txt) {
    const obj = JSON.parse(txt);
    if (!obj.campaigns) throw new Error("Format invalide");
    this.data = obj;
    this.save();
  },
};
