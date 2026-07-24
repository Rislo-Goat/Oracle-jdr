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
    const sk = (c.skin && DATA.SKINS && DATA.SKINS[c.skin]) ? DATA.SKINS[c.skin] : null;
    const cn = (cls) => (sk && sk.classNames[cls]) || cls;
    const skinNote = sk
      ? `\nRESKIN D'UNIVERS : utilise le VOCABULAIRE de l'univers, pas les termes D&D — la mécanique 5e est pourtant identique. La magie s'appelle « ${sk.magic} ». Classes : ${Object.entries(sk.classNames).map(([k, v]) => k + "→" + v).join(", ")}. Renomme aussi armes, sorts et objets dans ce style (ex. ${Object.entries(sk.gear || {}).slice(0, 4).map(([k, v]) => k + "→" + v).join(", ")}). Ne dis jamais « lance un sort de mage » si le décor est autre ; garde l'immersion.`
      : "";
    const heroes = c.heroes.length ? c.heroes.map(h => {
      if (is5e && typeof DND !== "undefined") {
        const ab = DND.ABILITY_ORDER.map(a => `${a} ${(h.abilities[a] || 10)}(${DND.modStr(h.abilities[a])})`).join(" ");
        const prof = "+" + DND.profBonus(h.level || 1);
        const profSk = (h.skillProfs || []).length ? " | maîtrises : " + h.skillProfs.join(", ") : "";
        const saves = (h.saveProfs || []).length ? " | sauv. maîtrisées : " + h.saveProfs.join(",") : "";
        let slotsTxt = "";
        if (DND.isCaster(h.cls)) {
          const mx = DND.slotsFor(h.cls, h.level);
          const parts = Object.keys(mx).filter(k => k !== "pact").map(Number).sort((a, b) => a - b)
            .map(lv => { const u = (h.slotsUsed && h.slotsUsed[lv]) || 0; return "niv" + lv + " " + (mx[lv] - u) + "/" + mx[lv]; });
          if (parts.length) slotsTxt = " | emplacements : " + parts.join(", ") + (mx.pact ? " (Pacte)" : "");
        }
        const goldTxt = h.gold ? " | " + h.gold + " po" : "";
        return `• ${h.name}${h.player ? " (joué par " + h.player + ")" : ""} — ${h.race} ${cn(h.cls)}${cn(h.cls) !== h.cls ? " [" + h.cls + " 5e]" : ""} niv.${h.level}${h.concept ? " (" + h.concept + ")" : ""} | PV ${h.hp}/${h.maxHp}, CA ${h.armor}, init +${DND.abilityMod(h, "DEX")}, maîtrise ${prof} | ${ab}${profSk}${saves}${h.gear && h.gear.length ? " | sac : " + h.gear.join(", ") : ""}${h.conditions && h.conditions.length ? " | ÉTATS : " + h.conditions.join(", ") : ""}${h.feats ? " | atouts : " + h.feats : ""}${h.spells ? " | sorts : " + h.spells : ""}${slotsTxt}${goldTxt}`;
      }
      const st = Object.entries(h.stats || {}).filter(([, v]) => v !== 0 && v !== "")
        .map(([k, v]) => `${k} ${v >= 0 ? "+" : ""}${v}`).join(", ");
      return `• ${h.name}${h.player ? " (joué par " + h.player + ")" : ""} — ${h.concept || "aventurier"} | PV ${h.hp}/${h.maxHp}, Déf ${h.armor}${st ? " | " + st : ""}${h.gear && h.gear.length ? " | sac : " + h.gear.join(", ") : ""}${h.conditions && h.conditions.length ? " | états : " + h.conditions.join(", ") : ""}${h.feats ? " | capacités : " + h.feats : ""}${h.bonds ? " | liens : " + h.bonds : ""}`;
    }).join("\n") : "• (aucun héros créé pour l'instant)";
    const combat = c.combat && c.combat.active
      ? `\n⚔️ COMBAT EN COURS — round ${c.combat.round}. Ordre d'initiative : ${c.combat.order.map((o, i) => `${i === c.combat.turn ? "▶ " : ""}${o.name} (${o.init})${o.hp != null ? " PV" + o.hp : ""}`).join(" → ")}`
      : "";

    const npcs = c.npcs.length ? c.npcs.slice(-12).map(n =>
      `• ${n.name}${n.role ? " — " + n.role : ""}${n.trait ? " (" + n.trait + ")" : ""}${n.place ? " @ " + n.place : ""}${n.attitude ? " · " + n.attitude : ""}`).join("\n") : "• (aucun)";
    const places = c.places.length ? c.places.map(p => `• ${p.name}${p.desc ? " — " + p.desc : ""}`).join("\n") : "• (aucun)";
    const quests = c.quests.length ? c.quests.map(q => `• [${q.state === "faite" ? "✔ FAITE" : "EN COURS"}] ${q.title}${q.desc ? " — " + q.desc : ""}`).join("\n") : "• (aucune)";
    const beasts = c.bestiary.length ? c.bestiary.map(b => `• ${b.name}${b.hp ? " (PV " + b.hp + ")" : ""}${b.threat ? " · " + b.threat : ""}${b.trait ? " — " + b.trait : ""}`).join("\n") : "• (aucune)";
    const lore = c.lore.length ? c.lore.map(l => "- " + l).join("\n") : "- (rien encore)";
    const chron = State.recentChronicle(10).map(e => {
      const tag = { action: "🎬 ACTION", oracle: "🔮 MJ", dice: "🎲 DÉ", pnj: "💬 PNJ", scene: "📍 SCÈNE", event: "⚡ FAIT", note: "📝" }[e.kind] || "📝";
      return `${tag}${e.who ? " " + e.who : ""} : ${e.text}`;
    }).join("\n") || "(la partie commence)";
    const seed = (c.seed || "").trim()
      ? "\n═══ NOTES & CONVERSATIONS PASSÉES (matière première fournie par le MJ — traite-la comme canon) ═══\n" + c.seed.trim().slice(0, 3500)
      : "";

    const mjHero = c.mjHeroId ? c.heroes.find(h => h.id === c.mjHeroId) : null;
    const dualRole = mjHero
      ? `\n⚠️ DOUBLE RÔLE : l'humain qui te pilote est À LA FOIS le Maître du Jeu ET un joueur — il incarne le personnage « ${mjHero.name} ». Conséquences : (1) tu es son co-MJ pour TOUTE la table ; (2) mais tu ne prends jamais les décisions de ${mjHero.name} à sa place — au contraire, offre-lui des moments forts, des dilemmes et des occasions de briller, comme aux autres ; (3) tu peux, en aparté, lui glisser des idées d'action ou des rappels de règles pour ${mjHero.name} sans casser le mystère pour les autres. Équilibre le temps de projecteur entre les ${c.heroes.length || 4} héros.`
      : "";
    const originNote = c.origin === "resume"
      ? `\n🔄 CAMPAGNE REPRISE EN COURS DE ROUTE : cette partie a DÉJÀ commencé (peut-être menée par un autre MJ, ou issue d'un module en ligne). Le MJ t'a fourni la matière existante (voir NOTES plus bas). Ta mission : respecter scrupuleusement ce canon, combler intelligemment les trous sans le contredire, et RELANCER la partie de façon fluide et captivante, comme si tu l'avais toujours menée. Si une info cruciale manque, pose AU PLUS 1-2 questions ciblées, sinon improvise avec cohérence.`
      : (c.origin === "generated" ? `\n✨ CAMPAGNE BÂTIE PAR TOI : tu as (co-)créé cette campagne. Assume-la : reste cohérent avec ce que tu as posé, fais vivre les factions et fais monter les enjeux vers le climax.` : "");

    const common = `Tu es « l'ORACLE » : un Maître du Jeu de rôle IA d'ÉLITE, spécialisé D&D 5e, du niveau des meilleurs MJ humains. Tu es à la fois game designer narratif, arbitre des règles, metteur en scène et acteur de tous les PNJ. Tu assistes ${c.name ? "la campagne « " + c.name + " »" : "cette partie"} : une table de ${c.heroes.length || 4} joueurs avec un MJ humain qui te pilote via cette app. Tu es son co-MJ — précis, cultivé en JDR, inventif et fiable.

Tu parles français, tu tutoies le MJ, tu es immersif mais efficace. Ta priorité absolue : une partie VIVANTE, cohérente et captivante, où les choix des joueurs comptent VRAIMENT.${dualRole}${originNote}

UNIVERS : ${g.name} — ${g.ico}
TON : ${tone}${skinNote}
SYSTÈME DE DÉS : ${sys.name || c.system} (${sys.help || ""})
PITCH : ${c.pitch || g.pitch}
ENJEU CENTRAL : ${c.stakes || "(à définir avec le MJ)"}
SCÈNE ACTUELLE : ${c.scene && c.scene.title ? c.scene.title + (c.scene.mood ? " — ambiance : " + c.scene.mood : "") : "(aucune scène posée)"}
Séance n°${c.session}.${combat}
${is5e ? `
═══ RÈGLES D&D 5e (tu connais la 5e ; applique-la à la lettre, LORE adapté à l'univers) ═══
• Tu ne lances JAMAIS les dés toi-même : pour toute action incertaine, émets [JET: …] (l'app calcule le modificateur exact du héros + maîtrise et lance le d20). Annonce toujours un DD juste (Facile 10 · Moyen 15 · Difficile 20).
• Combat : [COMBAT: start] pour l'initiative ; attaque = [JET: cible=…; attaque=Épée; bonus=5; diff=<CA>] ; dégâts = [DEGATS: …] (le joueur lance) ; 20 nat = critique. États via [PJ: condition+=…]. À 0 PV → jets de sauvegarde contre la mort. Repos court/long et XP selon les règles 5e.
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
• [DEGATS: cible=Goule; formule=1d8+3; source=Lame vibro; type=tranchant]  → DEMANDE un jet de DÉGÂTS : le joueur lance ses dés de dégâts (carte dédiée) et l'app applique les PV. Émets-le APRÈS une attaque réussie, au lieu d'appliquer [PV] toi-même. Utilise le bon dé de l'arme/sort (dague 1d4, épée courte/rapière 1d6, épée longue/lame 1d8, arme lourde 1d10/1d12 ; ajoute le modificateur pertinent). Si la cible est un héros (dégâts subis), mets son nom en cible : l'app réduit ses PV. Ne chiffre jamais les dégâts toi-même — laisse le joueur lancer.
• [COMBAT: start]  démarre le suivi d'initiative (l'app tire l'init des héros). [COMBAT: stop] le termine. [INIT: nom=Goule; valeur=14; pv=15]  ajoute un ennemi dans l'ordre d'initiative. [TOUR]  passe au combattant suivant.
• [XP: cible=groupe; montant=100]  → attribue de l'XP (à tout le groupe, ou cible=Kael pour un seul). L'app cumule et signale quand un héros peut monter de niveau. Récompense après un combat, une énigme résolue, une étape importante.
• [OR: cible=groupe; montant=50]  → attribue de l'or (butin monétaire) ; « groupe » partage entre tous. Annonce le trésor trouvé.
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
7. Fais monter la tension : introduis complications, dilemmes et enjeux. Récompense l'astuce.
8. IMMERSION TOTALE (RP) — RÈGLE PRIORITAIRE : narre TOUJOURS de façon diégétique (dans la fiction), à la 2ᵉ personne, en décrivant ce que les personnages PERÇOIVENT (ce qu'ils voient, entendent, sentent, ressentent). Ne parle JAMAIS comme un « maître du jeu » hors-fiction : BANNIS les tournures méta (« vous devez décider », « qu'est-ce que vous allez faire ? », « votre objectif est… », « la scène est… ») et toute mention de règles, de dés, de PV ou de mécanique dans la narration. Toute EXPOSITION (contexte, consignes, informations) passe par une SOURCE DU MONDE : un PNJ qui parle, une transmission radio, une IA de bord, un journal/log, une inscription, un souvenir — ou par ce que les héros constatent directement. Pour rendre la main aux joueurs, laisse la FICTION poser la question : un événement, un bruit, un danger, ou un PNJ qui interpelle — pas toi en tant que MJ. Chaque ligne reste dans le monde et dans le personnage.

MÉTHODE D'UN MJ EXPERT (applique-la en continu) :
• Agentivité : "Oui, et…" / "Oui, mais…". Ne bloque jamais sèchement — l'échec fait AVANCER l'histoire (fail forward), il ne stoppe pas la scène.
• Enjeux clairs : à chaque scène, quelque chose est en jeu (temps, ressource, réputation, vie). Annonce le danger AVANT qu'il ne frappe (télégraphie), jamais de "gotcha" gratuit.
• Rythme : alterne action / exploration / interaction sociale. Coupe court aux longueurs, zoome sur les moments forts. Termine souvent sur une accroche, une question ou un choix.
• Trois indices : pour toute conclusion à trouver, prévois au moins 3 pistes — jamais un seul point de passage obligé.
• PNJ vivants : donne à chaque PNJ un désir, une voix et un tic. Fais-les réagir à la réputation et aux actes passés des héros (utilise le canon).
• Factions & conséquences : le monde bouge même sans les héros ; leurs choix ont des répercussions durables (inscris-les via [MEMO:] et [FAIT:]).
• Équilibre : combats et défis calibrés au niveau et au nombre de héros ; laisse une porte de sortie ou une option maligne.
• Spotlight : veille à ce que CHAQUE joueur ait son moment (surtout si peu nombreux) ; sollicite les compétences et les liens de chacun.
• Progression (campagne classique) : récompense l'XP après les combats et les étapes clés via [XP: groupe; montant=…] (ordre de grandeur niv.1 : petit combat ~50-100 XP/héros, gros ~200+). Annonce le BUTIN : objets via [OBJET: cible=…; ajoute=…], et l'argent via [OR: groupe; montant=…]. Quand un héros passe un niveau, explique-lui les capacités que sa classe débloque à ce niveau (tu connais la 5e).
• Ressources 5e : respecte les emplacements de sorts (un sort de niveau X consomme un emplacement ; rappelle au joueur de cocher l'emplacement dans sa fiche). Propose les REPOS (court : soigne via dés de vie ; long : PV/emplacements récupérés) quand c'est logique dans la fiction. À 0 PV, le héros tombe inconscient : demande-lui un JET DE SAUVEGARDE CONTRE LA MORT à son tour (réussite 10+, il utilise le bouton dédié de sa fiche) ; 3 réussites = stabilisé, 3 échecs = mort. Un soin le remet debout.
• Reprise en cours : si la campagne est reprise/importée, commence par un bref "Précédemment…" (2-3 phrases) pour resituer, puis relance sur un choix concret.
• Prépa (mode atelier) : quand on te demande de bâtir, structure comme un module pro — accroche → factions & PNJ → 2-3 lieux clés → complications montantes → climax → récompenses, INSPIRÉ des grands canons d'aventure (sans copier de texte sous copyright), 100% réutilisable.`;

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
      .slice(-8).map(e => ({ role: e.kind === "oracle" ? "ai" : "user", content: (e.who ? e.who + " : " : "") + e.text }));
    const messages = [...history, { role: "user", content: userMessage }];
    const system = this.systemPrompt(mode);
    const ai = State.data.ai;

    // 1) Backend Railway (aucune clé dans le téléphone)
    if (ai.provider === "backend") {
      const be = State.data.backend;
      const url = (be.url || location.origin).replace(/\/+$/, "") + "/api/oracle/chat";
      let lastErr = "réseau";
      for (let i = 0; i < 4; i++) {
        try {
          const r = await fetch(url, {
            method: "POST",
            headers: Object.assign({ "content-type": "application/json" }, be.token ? { "X-Oracle-Token": be.token } : {}),
            body: JSON.stringify({ system, messages }),
          });
          const j = await r.json();
          if (j.ok) { this.lastStatus = { mode: "ai", provider: j.provider || "backend" }; return j.text; }
          lastErr = j.error || "erreur";
          if (/401|403|invalid|clé|aucune/i.test(lastErr)) break; // erreur de config : inutile de réessayer
        } catch (e) { lastErr = "réseau : " + e.message; }
        await new Promise(r => setTimeout(r, 700 * (i + 1)));
      }
      this.lastStatus = { mode: "offline", reason: this.cause(lastErr) };
      return this.fallback(userMessage) + this.downNote(lastErr);
    }

    // 2) Clé(s) directe(s) côté téléphone : fournisseur PRINCIPAL + SECOURS éventuel.
    const backup = State.data.backupAi;
    const haveBackup = backup && backup.key && backup.provider;
    if (!ai.key && !haveBackup) { this.lastStatus = { mode: "offline", reason: "aucune clé" }; return this.fallback(userMessage); }

    // Exécute UN fournisseur avec ses tentatives (retry réseau/429 + bascule modèle rapide
    // Groq). Renvoie { text } en cas de succès, sinon { err }.
    const runProvider = async (cfg) => {
      if (!cfg || !cfg.key) return { err: new Error("aucune clé") };
      let model = cfg.model || (DATA.AI_PROVIDERS[cfg.provider] || {}).model;
      const GROQ_LIGHT = "llama-3.1-8b-instant"; // modèle Groq rapide, limites bien plus hautes
      const call = (m) => {
        if (cfg.provider === "claude") return this.callClaude(cfg.key, m, system, messages);
        if (cfg.provider === "gemini") return this.callGemini(cfg.key, m, system, messages);
        if (cfg.provider === "openrouter") return this.callOAI(cfg.key, m, system, messages, "https://openrouter.ai/api/v1/chat/completions");
        return this.callOAI(cfg.key, m, system, messages, "https://api.groq.com/openai/v1/chat/completions");
      };
      let lastErr, switched = false;
      for (let i = 0; i < 6; i++) {
        try {
          const text = await call(model);
          this.lastStatus = { mode: "ai", provider: cfg.provider + (model === GROQ_LIGHT ? " (rapide)" : "") };
          return { text };
        } catch (e) {
          lastErr = e;
          const msg = e.message || "";
          const rate = /429|rate.?limit|too many|resource_exhausted/i.test(msg);
          const dailyQuota = /per day|daily|quota exceeded|out of|insufficient|billing/i.test(msg);
          const transient = rate || /500|502|503|504|network|timeout|fetch|failed|econn|réseau|load failed/i.test(msg);
          const auth = /401|403|invalid.?api.?key|api key|unauthor|permission|denied/i.test(msg);
          if (auth || !transient) return { err: e };       // erreur définitive : on passe au secours
          if (dailyQuota) return { err: e, exhausted: true }; // épuisé : direction secours
          // Filet anti-blocage : gros modèle Groq saturé (429) → bascule AUSSITÔT sur le
          // modèle Groq léger (limites bien plus hautes), même clé, sans attendre. Une fois.
          if (rate && cfg.provider === "groq" && model !== GROQ_LIGHT && !switched) {
            model = GROQ_LIGHT; switched = true;
            this.lastStatus = { mode: "wait", reason: "bascule sur modèle rapide…" };
            continue;
          }
          const suggested = this.retryDelay(msg);
          this.lastStatus = { mode: "wait", reason: rate ? "limite de débit — patiente…" : "réseau instable — nouvelle tentative…" };
          await new Promise(r => setTimeout(r, suggested || (900 * (i + 1))));
        }
      }
      return { err: lastErr };
    };

    let res = await runProvider(ai);
    if (res.text) return res.text;
    // Bascule sur le fournisseur de SECOURS (ex. Gemini) si le principal a échoué/est épuisé.
    if (haveBackup && !(ai.key && backup.provider === ai.provider && backup.key === ai.key)) {
      this.lastStatus = { mode: "wait", reason: "bascule sur le fournisseur de secours…" };
      const r2 = await runProvider(backup);
      if (r2.text) return r2.text;
      if (r2.err) res = r2; // garde la cause la plus récente pour le message
    }
    const em = (res.err && res.err.message) || "";
    this.lastStatus = { mode: "offline", reason: this.cause(em) };
    return this.fallback(userMessage) + this.downNote(em);
  },

  async callClaude(key, model, system, messages) {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
      body: JSON.stringify({ model, max_tokens: 1100, system, messages: messages.map(m => ({ role: m.role === "ai" ? "assistant" : "user", content: m.content })) }),
    });
    if (!r.ok) throw new Error(`HTTP ${r.status} — ${(await r.text()).slice(0, 160)}`);
    const j = await r.json();
    return (j.content || []).filter(b => b.type === "text").map(b => b.text).join("") || "(réponse vide)";
  },
  async callOAI(key, model, system, messages, url) {
    const r = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", "authorization": "Bearer " + key },
      body: JSON.stringify({ model, max_tokens: 1100, messages: [{ role: "system", content: system }, ...messages.map(m => ({ role: m.role === "ai" ? "assistant" : "user", content: m.content }))] }),
    });
    if (!r.ok) throw new Error(`HTTP ${r.status} — ${(await r.text()).slice(0, 160)}`);
    const j = await r.json();
    return j.choices?.[0]?.message?.content || "(réponse vide)";
  },
  async callGemini(key, model, system, messages) {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ system_instruction: { parts: [{ text: system }] }, contents: messages.map(m => ({ role: m.role === "ai" ? "model" : "user", parts: [{ text: m.content }] })), generationConfig: { maxOutputTokens: 1100 } }),
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
      [/\[XP:\s*([^\]]+)\]/gi, (a) => {
        const o = kv(a); const amt = parseInt(o.montant || o.amount || o.xp || o.valeur, 10) || 0; if (!amt) return;
        const cible = o.cible || o.target || "";
        let targets;
        if (!cible || /groupe|group|tous|all|équipe|equipe|party/i.test(cible)) targets = c.heroes;
        else { const h = State.heroByName(cible); targets = h ? [h] : []; }
        targets.forEach(h => {
          h.xp = (h.xp || 0) + amt;
          const canLv = typeof DND !== "undefined" && DND.levelForXp(h.xp) > (h.level || 1);
          State.log({ kind: "event", text: `✨ ${h.name} gagne ${amt} XP (total ${h.xp})${canLv ? ` — peut passer niveau ${DND.levelForXp(h.xp)} !` : ""}` });
        });
        effects.push("✨ +" + amt + " XP");
      }],
      [/\[OR:\s*([^\]]+)\]/gi, (a) => {
        const o = kv(a); const amt = parseInt(o.montant || o.amount || o.valeur, 10) || 0; if (!amt) return;
        const cible = o.cible || o.target || "";
        let targets;
        if (!cible || /groupe|group|tous|all|équipe|equipe|party/i.test(cible)) targets = c.heroes;
        else { const h = State.heroByName(cible); targets = h ? [h] : []; }
        if (targets.length && (!cible || /groupe|group|tous|all|équipe|equipe|party/i.test(cible))) {
          const share = Math.floor(amt / targets.length);
          targets.forEach(h => { h.gold = (h.gold || 0) + share; });
          State.log({ kind: "event", text: `💰 Le groupe trouve ${amt} po (${Math.floor(amt / targets.length)} po chacun).` });
        } else targets.forEach(h => { h.gold = (h.gold || 0) + amt; State.log({ kind: "event", text: `💰 ${h.name} reçoit ${amt} po (total ${h.gold}).` }); });
        effects.push("💰 +" + amt + " po");
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
    const rolls = [], damage = [];
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
    // Dégâts : le joueur lance ses dés de dégâts (carte dédiée)
    text = text.replace(/\[(?:D[EÉ]G[AÂ]TS|DAMAGE):\s*([^\]]+)\]/gi, (m, a) => {
      const o = {}; a.split(";").forEach(p => { const i = p.indexOf("="); if (i > 0) o[p.slice(0, i).trim().toLowerCase()] = p.slice(i + 1).trim(); });
      damage.push({
        target: o.cible || o.target || "",
        formula: (o.formule || o.formula || "1d6").toLowerCase().replace(/\s+/g, ""),
        label: o.source || o.arme || o.sort || "Dégâts",
        type: o.type || "",
      });
      return "";
    });
    return { text: text.replace(/\n{3,}/g, "\n\n").trim(), rolls, damage };
  },

  /* ---------- Diagnostic ---------- */
  cause(err) {
    const e = (err || "").toLowerCase();
    if (/per day|daily|quota exceeded|billing|insufficient|out of credit/.test(e)) return "quota du jour atteint";
    if (/429|rate.?limit|too many/.test(e)) return "limite de débit (trop de requêtes/minute)";
    if (/401|403|invalid.?api.?key|api key|unauthor|clé/.test(e)) return "clé invalide";
    if (/network|timeout|injoign|fetch|failed|réseau|econn|502|503|504/.test(e)) return "réseau indisponible";
    return "IA indisponible";
  },
  // Extrait le délai conseillé d'un message d'erreur 429 (« try again in 6.5s / 500ms »).
  retryDelay(msg) {
    const m = /try again in\s*([\d.]+)\s*(ms|s)/i.exec(msg || "");
    if (!m) return 0;
    const v = parseFloat(m[1]) * (m[2].toLowerCase() === "ms" ? 1 : 1000);
    return Math.min(12000, Math.max(600, Math.round(v) + 300)); // marge + plafond 12 s
  },
  // Message d'avertissement selon la cause. Pour une simple limite de débit,
  // on rassure (ce n'est pas une panne : il suffit de patienter/réessayer).
  downNote(err) {
    const c = this.cause(err);
    if (/limite de débit/.test(c))
      return `\n\n———\n⚠️ _Oracle un peu saturé (${c}). Le tier gratuit limite le nombre de requêtes par minute — patiente ~30 s puis réessaie (ou appuie de nouveau sur ▶). Rien n'est cassé, ta partie est intacte._`;
    if (/quota du jour/.test(c))
      return `\n\n———\n⚠️ _Quota gratuit du jour atteint chez le fournisseur. Il se réinitialise sous 24 h. Astuce : ajoute une 2ᵉ clé (Gemini gratuit) dans l'onglet Table pour ne jamais être bloqué._`;
    return `\n\n———\n⚠️ _Oracle IA en pause (${c}) — mode hors-ligne actif : dés, fiches et générateurs marchent toujours. Configure l'IA dans l'onglet Table pour la narration complète._`;
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
