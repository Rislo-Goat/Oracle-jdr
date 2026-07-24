/* ============================================================
   Oracle — données statiques (univers, systèmes de dés, thèmes,
   fournisseurs IA, générateurs hors-ligne).
   Tout est en français, adaptable à N'IMPORTE QUEL univers.
   ============================================================ */

const DATA = {

  /* ---------- Genres / univers proposés (l'app s'adapte à tout) ---------- */
  GENRES: {
    fantasy:    { name: "Fantasy / Médiéval-fantastique", ico: "⚔️", theme: "royal",
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
    d20:  { name: "d20 (D&D-like)", formula: "1d20", target: "Difficulté (DD)", defaultDC: 12,
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
    default: { name: "Nuit violette", ico: "🌌" },
    royal:   { name: "Royaume doré", ico: "👑" },
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
