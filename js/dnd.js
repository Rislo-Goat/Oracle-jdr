/* ============================================================
   Oracle — moteur de règles D&D 5e (basé sur le SRD ouvert).
   Le LORE et l'UNIVERS restent adaptables ; ce sont les
   MÉCANIQUES (caracs, jets, DD, maîtrise…) qui suivent la 5e.
   ============================================================ */

const DND = {

  /* ---------- Les 6 caractéristiques ---------- */
  ABILITIES: {
    FOR: "Force",
    DEX: "Dextérité",
    CON: "Constitution",
    INT: "Intelligence",
    SAG: "Sagesse",
    CHA: "Charisme",
  },
  ABILITY_ORDER: ["FOR", "DEX", "CON", "INT", "SAG", "CHA"],

  /* ---------- Compétences → caractéristique associée ---------- */
  SKILLS: {
    "Acrobaties": "DEX", "Arcanes": "INT", "Athlétisme": "FOR",
    "Discrétion": "DEX", "Dressage": "SAG", "Escamotage": "DEX",
    "Histoire": "INT", "Intimidation": "CHA", "Investigation": "INT",
    "Médecine": "SAG", "Nature": "INT", "Perception": "SAG",
    "Perspicacité": "SAG", "Persuasion": "CHA", "Religion": "INT",
    "Représentation": "CHA", "Survie": "SAG", "Tromperie": "CHA",
  },

  /* ---------- Classes (dé de vie, carac principale, jets de sauvegarde) ---------- */
  CLASSES: {
    "Barbare":     { hd: 12, primary: ["FOR"],        saves: ["FOR", "CON"], caster: false },
    "Barde":       { hd: 8,  primary: ["CHA"],        saves: ["DEX", "CHA"], caster: true },
    "Clerc":       { hd: 8,  primary: ["SAG"],        saves: ["SAG", "CHA"], caster: true },
    "Druide":      { hd: 8,  primary: ["SAG"],        saves: ["INT", "SAG"], caster: true },
    "Ensorceleur": { hd: 6,  primary: ["CHA"],        saves: ["CON", "CHA"], caster: true },
    "Guerrier":    { hd: 10, primary: ["FOR", "DEX"], saves: ["FOR", "CON"], caster: false },
    "Magicien":    { hd: 6,  primary: ["INT"],        saves: ["INT", "SAG"], caster: true },
    "Moine":       { hd: 8,  primary: ["DEX", "SAG"], saves: ["FOR", "DEX"], caster: false },
    "Occultiste":  { hd: 8,  primary: ["CHA"],        saves: ["SAG", "CHA"], caster: true },
    "Paladin":     { hd: 10, primary: ["FOR", "CHA"], saves: ["SAG", "CHA"], caster: true },
    "Rôdeur":      { hd: 10, primary: ["DEX", "SAG"], saves: ["FOR", "DEX"], caster: true },
    "Roublard":    { hd: 8,  primary: ["DEX"],        saves: ["DEX", "INT"], caster: false },
  },

  /* ---------- Espèces (races) — saveur + bonus courants (indicatif) ---------- */
  RACES: {
    "Humain":     { note: "polyvalent (+1 à toutes les caracs)", speed: 9 },
    "Elfe":       { note: "+2 DEX, vision nocturne, sens aiguisés", speed: 9 },
    "Nain":       { note: "+2 CON, résistance au poison, robuste", speed: 7.5 },
    "Halfelin":   { note: "+2 DEX, chanceux, discret", speed: 7.5 },
    "Demi-elfe":  { note: "+2 CHA, +1 à deux caracs", speed: 9 },
    "Demi-orc":   { note: "+2 FOR, +1 CON, endurance sauvage", speed: 9 },
    "Drakéide":   { note: "+2 FOR, +1 CHA, souffle élémentaire", speed: 9 },
    "Gnome":      { note: "+2 INT, rusé, petite taille", speed: 7.5 },
    "Tieffelin":  { note: "+2 CHA, +1 INT, résistance au feu", speed: 9 },
    "Autre":      { note: "espèce sur-mesure (adapte au lore)", speed: 9 },
  },

  /* ---------- Conditions (états) 5e ---------- */
  CONDITIONS: ["À terre", "Agrippé", "Assourdi", "Aveuglé", "Charmé", "Effrayé",
    "Empoisonné", "Entravé", "Étourdi", "Inconscient", "Invisible", "Neutralisé",
    "Paralysé", "Pétrifié", "Épuisement"],

  /* ---------- Échelle de difficulté (DD) 5e ---------- */
  DC_SCALE: [
    { name: "Très facile", dc: 5 }, { name: "Facile", dc: 10 }, { name: "Moyen", dc: 15 },
    { name: "Difficile", dc: 20 }, { name: "Très difficile", dc: 25 }, { name: "Quasi impossible", dc: 30 },
  ],

  /* ---------- Génération de caracs ---------- */
  STANDARD_ARRAY: [15, 14, 13, 12, 10, 8],

  /* ---------- XP & niveaux (progression 5e classique) ---------- */
  XP_THRESHOLDS: [0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000],
  levelForXp(xp) { let lv = 1; for (let i = 0; i < this.XP_THRESHOLDS.length; i++) if ((xp || 0) >= this.XP_THRESHOLDS[i]) lv = i + 1; return Math.min(20, lv); },
  xpForNext(level) { return level >= 20 ? null : this.XP_THRESHOLDS[level]; },
  canLevelUp(hero) { return this.levelForXp(hero.xp || 0) > (hero.level || 1); },
  hpGainOnLevel(cls, conMod) { const hd = (this.CLASSES[cls] || { hd: 8 }).hd; return Math.max(1, Math.floor(hd / 2) + 1 + conMod); },

  /* ---------- Emplacements de sorts (progression 5e) ---------- */
  CASTER_TYPE: { Magicien: "full", Clerc: "full", Druide: "full", Barde: "full", Ensorceleur: "full", Paladin: "half", Rôdeur: "half", Occultiste: "pact" },
  // Emplacements par niveau de perso → [niv1, niv2, … niv9]
  FULL_SLOTS: [[], [2], [3], [4, 2], [4, 3], [4, 3, 2], [4, 3, 3], [4, 3, 3, 1], [4, 3, 3, 2], [4, 3, 3, 3, 1], [4, 3, 3, 3, 2], [4, 3, 3, 3, 2, 1], [4, 3, 3, 3, 2, 1], [4, 3, 3, 3, 2, 1, 1], [4, 3, 3, 3, 2, 1, 1], [4, 3, 3, 3, 2, 1, 1, 1], [4, 3, 3, 3, 2, 1, 1, 1], [4, 3, 3, 3, 2, 1, 1, 1, 1], [4, 3, 3, 3, 3, 1, 1, 1, 1], [4, 3, 3, 3, 3, 2, 1, 1, 1], [4, 3, 3, 3, 3, 2, 2, 1, 1]],
  HALF_SLOTS: [[], [], [2], [3], [3], [4, 2], [4, 2], [4, 3], [4, 3], [4, 3, 2], [4, 3, 2], [4, 3, 3], [4, 3, 3], [4, 3, 3, 1], [4, 3, 3, 1], [4, 3, 3, 2], [4, 3, 3, 2], [4, 3, 3, 3, 1], [4, 3, 3, 3, 1], [4, 3, 3, 3, 2], [4, 3, 3, 3, 2]],
  PACT_SLOTS: [null, { n: 1, lv: 1 }, { n: 2, lv: 1 }, { n: 2, lv: 2 }, { n: 2, lv: 2 }, { n: 2, lv: 3 }, { n: 2, lv: 3 }, { n: 2, lv: 4 }, { n: 2, lv: 4 }, { n: 2, lv: 5 }, { n: 2, lv: 5 }, { n: 3, lv: 5 }, { n: 3, lv: 5 }, { n: 3, lv: 5 }, { n: 3, lv: 5 }, { n: 3, lv: 5 }, { n: 3, lv: 5 }, { n: 4, lv: 5 }, { n: 4, lv: 5 }, { n: 4, lv: 5 }, { n: 4, lv: 5 }],
  // Renvoie { "1": max, "2": max, … } (+ pact:{lv} si applicable)
  slotsFor(cls, level) {
    const t = this.CASTER_TYPE[cls]; const L = Math.max(1, Math.min(20, level || 1)); const out = {};
    if (t === "full") (this.FULL_SLOTS[L] || []).forEach((n, i) => { if (n) out[i + 1] = n; });
    else if (t === "half") (this.HALF_SLOTS[L] || []).forEach((n, i) => { if (n) out[i + 1] = n; });
    else if (t === "pact") { const p = this.PACT_SLOTS[L]; if (p) { out[p.lv] = p.n; out.pact = p.lv; } }
    return out;
  },
  isCaster(cls) { return !!this.CASTER_TYPE[cls]; },

  /* ---------- Helpers ---------- */
  mod(score) { return Math.floor(((score || 10) - 10) / 2); },
  modStr(score) { const m = this.mod(score); return (m >= 0 ? "+" : "") + m; },
  profBonus(level) { return 2 + Math.floor((Math.max(1, Math.min(20, level || 1)) - 1) / 4); },

  // Modificateur total d'un test de compétence (carac + maîtrise si maîtrisé)
  skillMod(hero, skill) {
    const ab = this.SKILLS[skill]; if (!ab) return 0;
    let m = this.mod((hero.abilities || {})[ab]);
    if ((hero.skillProfs || []).includes(skill)) m += this.profBonus(hero.level || 1);
    return m;
  },
  saveMod(hero, ab) {
    let m = this.mod((hero.abilities || {})[ab]);
    if ((hero.saveProfs || []).includes(ab)) m += this.profBonus(hero.level || 1);
    return m;
  },
  abilityMod(hero, ab) { return this.mod((hero.abilities || {})[ab]); },

  // DV / PV de base indicatif à la création (max au niveau 1)
  baseHp(cls, conMod, level = 1) {
    const hd = (this.CLASSES[cls] || { hd: 8 }).hd;
    let hp = hd + conMod;
    for (let i = 2; i <= level; i++) hp += Math.ceil((hd + 1) / 2) + conMod; // moyenne par niveau
    return Math.max(1, hp);
  },

  // Résout un test 5e à partir d'un héros. kind: "skill"|"save"|"ability"|"attack"
  buildRoll(hero, kind, key, extra = 0) {
    let mod = 0, label = "";
    if (kind === "skill") { mod = this.skillMod(hero, key); label = key; }
    else if (kind === "save") { mod = this.saveMod(hero, key); label = "Sauvegarde " + (this.ABILITIES[key] || key); }
    else if (kind === "ability") { mod = this.abilityMod(hero, key); label = this.ABILITIES[key] || key; }
    else if (kind === "attack") { mod = extra; label = key || "Attaque"; extra = 0; }
    mod += extra;
    const sign = mod >= 0 ? "+" : "";
    return { formula: "1d20" + (mod !== 0 ? sign + mod : ""), mod, label };
  },
};
