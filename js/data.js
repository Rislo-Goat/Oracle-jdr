/* ============================================================
   Oracle — données statiques (univers, systèmes de dés, thèmes,
   fournisseurs IA, générateurs hors-ligne).
   Tout est en français, adaptable à N'IMPORTE QUEL univers.
   ============================================================ */

const DATA = {

  /* ---------- Genres / univers proposés (l'app s'adapte à tout) ---------- */
  GENRES: {
    fantasy:    { name: "Fantasy / Médiéval-fantastique", ico: "⚔️", theme: "default",
                  pitch: "Épées, magie, donjons et dragons. Un monde de royaumes, de guildes et de créatures anciennes.",
                  attrs: ["Force","Dextérité","Constitution","Intelligence","Sagesse","Charisme"],
                  system: "d20" },
    darkfantasy:{ name: "Dark fantasy", ico: "🗡️", theme: "ember",
                  pitch: "Un monde brutal et désespéré où la magie a un prix et la mort rôde à chaque pas.",
                  attrs: ["Force","Agilité","Endurance","Volonté","Perception","Ruse"],
                  system: "d20" },
    scifi:      { name: "Science-fiction / Spatial", ico: "🚀", theme: "neon",
                  pitch: "Vaisseaux, IA, colonies lointaines et mystères aux confins de la galaxie.",
                  attrs: ["Physique","Réflexes","Tech","Intellect","Perception","Contact"],
                  system: "2d6" },
    cyberpunk:  { name: "Cyberpunk", ico: "🌆", theme: "neon",
                  pitch: "Mégapoles néon, corporations, implants et hackers. Haute technologie, basse moralité.",
                  attrs: ["Corps","Réflexes","Cool","Intelligence","Technique","Présence"],
                  system: "d10" },
    horror:     { name: "Horreur / Enquête", ico: "🕯️", theme: "matrix",
                  pitch: "L'indicible tapi dans l'ombre. Des enquêteurs fragiles face à ce qui dépasse la raison.",
                  attrs: ["Force","Agilité","Résistance","Savoir","Perception","Sang-froid"],
                  system: "d100" },
    postapo:    { name: "Post-apocalyptique", ico: "☢️", theme: "ember",
                  pitch: "Un monde en ruines. Survie, ressources rares, factions et mutations.",
                  attrs: ["Muscle","Réflexes","Résistance","Débrouille","Instinct","Charisme"],
                  system: "2d6" },
    modern:     { name: "Contemporain / Thriller", ico: "🕶️", theme: "default",
                  pitch: "Notre monde, mais en tension : espionnage, crime, complots.",
                  attrs: ["Force","Agilité","Endurance","Intellect","Perception","Aisance"],
                  system: "d20" },
    pirates:    { name: "Pirates / Aventure", ico: "🏴‍☠️", theme: "cream",
                  pitch: "Mers inexplorées, trésors, îles maudites et abordages.",
                  attrs: ["Force","Adresse","Vigueur","Astuce","Œil de lynx","Panache"],
                  system: "2d6" },
    custom:     { name: "Univers sur-mesure", ico: "✨", theme: "default",
                  pitch: "Ton monde à toi. Décris-le et l'Oracle s'y adapte entièrement.",
                  attrs: ["Corps","Adresse","Esprit","Cœur","Instinct","Aura"],
                  system: "2d6" },
  },

  /* ---------- Tons narratifs ---------- */
  TONES: {
    heroique:   { name: "Héroïque / épique", ico: "🦸" },
    sombre:     { name: "Sombre & mature", ico: "🌑" },
    aventure:   { name: "Aventure légère", ico: "🗺️" },
    humour:     { name: "Décalé / humour", ico: "😄" },
    mystere:    { name: "Mystère & enquête", ico: "🔍" },
    survie:     { name: "Survie & tension", ico: "🩸" },
    politique:  { name: "Intrigue & politique", ico: "👑" },
  },

  /* ---------- Systèmes de dés (moteur adaptable) ---------- */
  DICE_SYSTEMS: {
    dnd5e:{ name: "D&D 5e (d20 SRD)", formula: "1d20", target: "Degré de Difficulté (DD)", defaultDC: 15,
            help: "1d20 + modificateur de caractéristique (+ bonus de maîtrise si compétent) ≥ DD. 20 naturel = réussite critique, 1 naturel = échec critique. DD : Facile 10 · Moyen 15 · Difficile 20." },
    d20:  { name: "d20 (générique)", formula: "1d20", target: "Difficulté (DD)", defaultDC: 12,
            help: "1d20 + modificateur ≥ DD. Réussite critique sur 20, échec critique sur 1." },
    "2d6":{ name: "2d6 (PbtA / narratif)", formula: "2d6", target: "Seuil", defaultDC: 7,
            help: "2d6 + mod : 10+ = réussite franche, 7-9 = réussite à un coût, 6- = complication." },
    d10:  { name: "d10 (pool / Cyberpunk)", formula: "1d10", target: "Difficulté", defaultDC: 15,
            help: "1d10 + carac + compétence ≥ Difficulté." },
    d100: { name: "d100 (pourcentage)", formula: "1d100", target: "Score %", defaultDC: 50,
            help: "1d100 ≤ ton score de compétence = réussite. Plus c'est bas, mieux c'est." },
    d6pool:{ name: "Pool de d6 (succès)", formula: "3d6", target: "Succès requis", defaultDC: 1,
            help: "Lance une poignée de d6 ; chaque 5-6 = un succès." },
  },

  /* ---------- Thèmes d'ambiance (l'Oracle les change en direct) ---------- */
  THEMES: {
    default: { name: "Grimoire (cuir & or)", ico: "📜" },
    royal:   { name: "Royaume violet", ico: "👑" },
    ember:   { name: "Braises & sang", ico: "🔥" },
    neon:    { name: "Néon cyber", ico: "💠" },
    matrix:  { name: "Vert spectral", ico: "🕯️" },
    forest:  { name: "Forêt profonde", ico: "🌲" },
    ocean:   { name: "Abysses", ico: "🌊" },
    light:   { name: "Parchemin clair", ico: "📜" },
    cream:   { name: "Vieux papier", ico: "🗞️" },
  },

  /* ---------- Fournisseurs IA (clé côté téléphone, ou backend Railway) ---------- */
  AI_PROVIDERS: {
    backend:    { name: "🛰️ Mon backend (Railway)", model: "", needsKey: false,
                  help: "Aucune clé à coller : l'Oracle passe par ton serveur qui utilise ses clés déjà configurées." },
    claude:     { name: "Claude (Anthropic)", model: "claude-haiku-4-5-20251001", needsKey: true,
                  url: "https://console.anthropic.com/settings/keys" },
    groq:       { name: "Groq (gratuit, rapide)", model: "llama-3.3-70b-versatile", needsKey: true,
                  url: "https://console.groq.com/keys" },
    gemini:     { name: "Google Gemini (gratuit)", model: "gemini-2.0-flash", needsKey: true,
                  url: "https://aistudio.google.com/apikey" },
    openrouter: { name: "OpenRouter", model: "meta-llama/llama-3.3-70b-instruct:free", needsKey: true,
                  url: "https://openrouter.ai/settings/keys" },
  },

  /* ---------- Portraits (emojis) pour héros & PNJ ---------- */
  AVATARS: ["🧙","🛡️","🗡️","🏹","🧝","🧛","🦹","🥷","👑","🧟","🐉","🦊","🐺","🦉","⚕️","🔮","⚗️","🎭","🤖","👽","🚀","🕵️","💂","🧑‍🚀","🧑‍🔬","🏴‍☠️","🧜","👻","😈","🐗"],

  /* ---------- Reskins d'univers : renomme classes / magie / équipement.
     La MÉCANIQUE D&D 5e reste identique — seuls les noms affichés changent. ---------- */
  SKINS: {
    scifi: { magic: "programmes & pouvoirs psioniques",
      classNames: { Guerrier: "Soldat", Magicien: "Technomancien", Roublard: "Infiltrateur", Clerc: "Médic de bord", Barde: "Officier", Rôdeur: "Éclaireur", Barbare: "Berserker de combat", Paladin: "Gardien", Ensorceleur: "Psionique", Occultiste: "Contacté", Druide: "Xénobiologiste", Moine: "Cyber-moine" },
      gear: { "Épée longue": "Lame vibro", "Bâton": "Interface neurale", "Grimoire": "Datapad de sorts", "Outils de voleur": "Kit de piratage", "Symbole sacré": "Émetteur de soin", "Arc court": "Fusil à impulsion", "Cotte de mailles": "Combinaison blindée", "Bouclier": "Bouclier à énergie", "Projectile magique": "Salve d'ions" } },
    cyberpunk: { magic: "implants & programmes",
      classNames: { Guerrier: "Solo", Magicien: "Netrunner", Roublard: "Hacker", Clerc: "Ripperdoc", Barde: "Fixer", Rôdeur: "Nomade", Barbare: "Cogneur", Paladin: "Justicier des rues", Ensorceleur: "Esper", Occultiste: "Accro au Net", Druide: "Écoactiviste", Moine: "Artiste martial augmenté" },
      gear: { "Épée longue": "Katana mono-lame", "Bâton": "Deck de hack", "Grimoire": "Bibliothèque de programmes", "Outils de voleur": "Kit d'intrusion", "Symbole sacré": "Trousse cyber-med", "Arc court": "Pistolet intelligent", "Cotte de mailles": "Veste pare-balles", "Projectile magique": "Attaque virale" } },
    horror: { magic: "rituels & dons maudits",
      classNames: { Guerrier: "Chasseur", Magicien: "Occultiste érudit", Roublard: "Cambrioleur", Clerc: "Prêtre", Barde: "Journaliste", Rôdeur: "Traqueur", Barbare: "Brute", Paladin: "Templier", Ensorceleur: "Maudit", Occultiste: "Élu", Druide: "Herboriste", Moine: "Ascète" },
      gear: { "Épée longue": "Hache d'incendie", "Bâton": "Grimoire interdit", "Outils de voleur": "Pied-de-biche & crochets", "Symbole sacré": "Crucifix", "Arc court": "Fusil de chasse", "Projectile magique": "Trait spectral" } },
    pirates: { magic: "sortilèges des marées",
      classNames: { Guerrier: "Bretteur", Magicien: "Navigateur mystique", Roublard: "Écumeur", Clerc: "Aumônier de bord", Barde: "Ménestrel", Rôdeur: "Harponneur", Barbare: "Forban", Paladin: "Corsaire d'honneur", Ensorceleur: "Enfant des marées", Occultiste: "Pactisé des abysses", Druide: "Chaman des îles", Moine: "Maître d'armes" },
      gear: { "Épée longue": "Sabre d'abordage", "Bâton": "Bâton de navigateur", "Arc court": "Pistolet à silex", "Outils de voleur": "Nécessaire de crochetage", "Cotte de mailles": "Cuir de marin", "Projectile magique": "Salve d'écume" } },
    victorian: { magic: "sciences interdites & spiritisme",
      classNames: { Guerrier: "Garde du corps", Magicien: "Érudit de l'arcane", Roublard: "Détective", Clerc: "Aliéniste", Barde: "Reporter", Rôdeur: "Pisteur urbain", Barbare: "Homme de main", Paladin: "Inspecteur", Ensorceleur: "Médium", Occultiste: "Initié d'une loge", Druide: "Naturaliste", Moine: "Adepte" },
      gear: { "Épée longue": "Canne-épée", "Bâton": "Carnet de recherches", "Arc court": "Revolver", "Outils de voleur": "Trousse de crochetage", "Symbole sacré": "Médaille de loge", "Projectile magique": "Décharge ectoplasmique" } },
  },

  /* ---------- Aventures prêtes à jouer (proposées au lancement) ---------- */
  PRESETS: [
    { id: "karn", name: "Les Profondeurs de Karn-Dûr", ico: "⚔️", genre: "darkfantasy", theme: "ember", tone: "survie", skin: null,
      blurb: "Dark fantasy · donjon", pitch: "Une cité naine engloutie sous la montagne, ses trésors immenses… et ce qui les garde encore. Descente périlleuse, pièges anciens et factions rivales dans les ténèbres.",
      stakes: "Ressortir vivants et riches — ou réveiller ce qui dort au fond.", scene: { title: "Le seuil de Karn-Dûr", mood: "porte de pierre gravée, air froid et odeur de poussière millénaire" } },
    { id: "bannieres", name: "Les Sept Bannières", ico: "👑", genre: "fantasy", theme: "royal", tone: "politique", skin: null,
      blurb: "Fantasy · intrigue & politique", pitch: "Le roi est mort sans héritier. Sept maisons s'entredéchirent pour le trône, l'hiver approche, et vos personnages sont des pions — ou de futurs faiseurs de rois.",
      stakes: "Survivre aux complots et décider qui régnera.", scene: { title: "La cour en deuil", mood: "salle du trône glaciale, murmures, regards en coin" } },
    { id: "cendres", name: "La Marche des Cendres", ico: "🌋", genre: "fantasy", theme: "default", tone: "heroique", skin: null,
      blurb: "Haute fantasy · épique", pitch: "Une compagnie improbable doit porter un artefact maudit à travers des terres en guerre jusqu'au seul lieu où le détruire. Le mal vous piste sans relâche.",
      stakes: "Détruire l'artefact avant qu'il ne vous corrompe — ou que l'ennemi le reprenne.", scene: { title: "Le départ au crépuscule", mood: "route de montagne, corbeaux au loin, poids du fardeau" } },
    { id: "mornevaux", name: "La Faille de Mornevaux", ico: "🕯️", genre: "horror", theme: "matrix", tone: "mystere", skin: "horror",
      blurb: "Horreur & enquête", pitch: "Dans un bourg isolé, des enfants disparaissent et une « faille » crache des choses la nuit. Vous enquêtez avant que le voile ne se déchire pour de bon.",
      stakes: "Refermer la faille et sauver les disparus — sans y laisser votre raison.", scene: { title: "La lisière, à la nuit tombée", mood: "brume, lampes vacillantes, un silence anormal" } },
    { id: "helios", name: "L'Épave d'Hélios", ico: "🚀", genre: "scifi", theme: "neon", tone: "survie", skin: "scifi",
      blurb: "Science-fiction · huis-clos spatial", pitch: "Votre vaisseau répond à un signal de détresse et reste piégé près d'une épave géante. IA défaillante, oxygène qui baisse, et quelque chose à bord qui n'est pas humain.",
      stakes: "Sortir vivants et comprendre ce qui a tué l'équipage d'Hélios.", scene: { title: "Sas d'amarrage", mood: "métal qui grince, lumières rouges, silence radio" } },
    { id: "neon", name: "Néon Sabbat", ico: "🌆", genre: "cyberpunk", theme: "neon", tone: "sombre", skin: "cyberpunk",
      blurb: "Cyberpunk · noir & action", pitch: "Mégapole pluvieuse, corpos tentaculaires. Un contrat « simple » tourne mal et vous vous retrouvez avec un secret qui vaut des millions — ou votre peau.",
      stakes: "Monnayer le secret sans finir en pièces détachées.", scene: { title: "Ruelle sous la pluie acide", mood: "néons, fumée, sirènes lointaines" } },
    { id: "noye", name: "La Carte de l'Homme Noyé", ico: "🏴‍☠️", genre: "pirates", theme: "ocean", tone: "aventure", skin: "pirates",
      blurb: "Pirates · aventure & trésor", pitch: "Une carte au trésor tatouée sur un noyé, des mers maudites, des îles impossibles et une marine à vos trousses. Larguez les amarres.",
      stakes: "Trouver le trésor avant vos rivaux — et survivre à sa malédiction.", scene: { title: "Sur le pont, au petit matin", mood: "embruns, cris de mouettes, une carte étalée" } },
    { id: "lanternes", name: "Les Lanternes de Sombreville", ico: "🔍", genre: "modern", theme: "ocean", tone: "mystere", skin: "victorian",
      blurb: "Fantasy victorienne · détective", pitch: "Enquêteurs de l'étrange dans une cité industrielle brumeuse : meurtres impossibles, cultes discrets et machines interdites. Chaque affaire creuse un mystère plus grand.",
      stakes: "Résoudre l'affaire — et remonter le fil vers la vérité qu'on veut cacher.", scene: { title: "Une scène de crime impossible", mood: "brouillard jaune, gaz de ville, porte close de l'intérieur" } },
  ],

  /* ---------- Générateurs hors-ligne (si pas d'IA) ---------- */
  NAME_BANK: {
    fantasy: ["Aldric","Maelys","Corvin","Ysolde","Bram","Séraphine","Grimwald","Elara","Thane","Orianne","Faelan","Rowena"],
    scifi:   ["Vex","Nova","Ryker","Zenith","Cael","Iris-7","Dax","Lyra","Orion","Sable","Kade","Echo"],
    modern:  ["Marc","Élise","Novak","Sasha","Reyes","Camille","Dominic","Ines","Lars","Nadia","Théo","Wren"],
    dark:    ["Malachar","Vespira","Draven","Morwenna","Kael","Nyx","Belial","Sorne","Vaelith","Grimm","Ashra","Vorn"],
  },
  NPC_ROLES: ["marchand·e ambigu·e","garde soupçonneux·se","informateur·rice nerveux·se","vieux·ille sage","chef de bande","tavernier·e bavard·e","noble hautain·e","contrebandier·e","prêtre·sse fervent·e","mercenaire taciturne","enfant des rues","érudit·e obsédé·e"],
  NPC_TRAITS: ["cache quelque chose","doit une dette","cherche à fuir","est plus dangereux qu'il n'y paraît","ment sur son identité","veut manipuler le groupe","peut devenir un allié","connaît un secret vital","est terrifié·e","joue double jeu"],
  COMPLICATIONS: ["un bruit inattendu au pire moment","un allié se révèle peu fiable","le temps presse soudain","une ressource vitale manque","un témoin gênant apparaît","le terrain se dérobe","une alarme se déclenche","un vieux rival refait surface","la météo tourne à l'orage","un piège se referme"],
  REWARDS: ["une piste vers le prochain objectif","un objet utile mais encombrant","la confiance d'un PNJ clé","une information compromettante","un raccourci risqué","une somme d'argent","un allié inattendu","un fragment du mystère central"],
  ORACLE_YESNO: ["Oui, et… (mieux que prévu)","Oui.","Oui, mais… (avec un revers)","Non, mais… (une consolation)","Non.","Non, et… (pire que prévu)"],
};
