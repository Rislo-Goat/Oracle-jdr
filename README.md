# 🔮 Oracle — ton compagnon de jeu de rôle adaptatif

**Oracle** est une app pour mener et jouer tes parties de **jeu de rôle** à ta table (pensée pour un petit groupe : toi en **MJ**, tes 3-4 joueurs). Un **co-Maître du Jeu IA** t'assiste en **temps réel** : tu entres ce que font/choisissent les joueurs, il narre, incarne les PNJ, applique les conséquences, demande les jets, et **tient toute ta campagne à jour tout seul**. Il s'adapte à **n'importe quel univers** (fantasy, SF, cyberpunk, horreur, post-apo, pirates, ton monde sur-mesure…), à ton **ton** et à tes **envies**.

C'est le pendant « table de JDR » de **LifeQuest** : même philosophie (PWA installable, zéro compte, coach/oracle IA qui adapte le fond **et** la forme en direct), poussée pour le rôle-play.

## ✨ Ce que fait Oracle

- 🔥 **Partie en temps réel** — le hub de séance. Une **chronique vivante** (actions des joueurs, réponses de l'Oracle, répliques de PNJ, jets de dés, événements) + un **composer** où tu tapes en direct ce que fait la table. L'Oracle répond en co-MJ.
- 🔮 **Co-MJ IA « l'Oracle »** — il a **tout le contexte** : univers, ton, système, pitch, enjeu, les **4 héros** (stats/PV/objets/états), les PNJ, lieux, quêtes, bestiaire, le **canon** et la **chronique récente**. Chaque réponse est cohérente avec ta campagne.
- ⚡ **Directives temps réel** — l'Oracle **modifie l'app tout seul** pendant qu'il narre : crée un PNJ, pose une scène, retire des PV, ajoute un objet à un héros, ouvre une quête, enrichit le bestiaire, inscrit un fait au canon, **change l'ambiance visuelle** (thème/couleurs) pour coller au moment. Tu ne touches à rien : c'est lui qui met à jour les fiches et le journal.
- 🎲 **Moteur de dés universel** — formules libres (`1d20+3`, `2d6`, `4d6k3`, `1d100`…), avantage/désavantage, et **jets de compétence** adaptés au système choisi (d20, PbtA 2d6, d100, pools de d6…). L'Oracle peut demander un jet, l'app le lance.
- 🛡️ **Fiches de héros adaptatives** — PV, défense, attributs (qui changent selon l'univers), inventaire, capacités, états, liens, notes. Reliées aux vrais joueurs de la table.
- 🗺️ **Univers vivant** — quêtes, PNJ, lieux, bestiaire, et la **mémoire longue durée** (canon) que l'Oracle retient pour toujours.
- 📥 **Nourrir l'Oracle** — colle tes **notes ou anciennes conversations** sur la campagne : l'Oracle les traite comme du canon et s'en sert dans chaque réponse.
- 🔮 **Atelier hors-scène** — un onglet Oracle dédié à la **préparation & l'impro** : génère un PNJ, un lieu, un donjon, un rebondissement, des noms, une rencontre — et enregistre direct ce que tu valides.
- 🌌 **Ambiance adaptative** — 9 thèmes (royaume doré, braises, néon cyber, vert spectral, forêt, abysses, parchemin clair…), accent réglable, et l'Oracle peut composer une palette 100 % sur-mesure.
- 📚 **Multi-campagnes** — plusieurs campagnes en parallèle, chacune avec son univers et son ambiance.
- 📱 **PWA installable & hors-ligne** — s'installe comme une vraie app ; dés, fiches et générateurs marchent même sans réseau ni IA. **Aucune donnée ne quitte ton appareil.**

## 📲 Installer sur ton téléphone

**Voie recommandée — déployer ce repo sur Railway (app + Oracle autonomes) :**
Le repo embarque un petit serveur (`server.py`) qui sert la PWA **et** un proxy Oracle IA. Une seule URL, l'IA marche, aucune clé dans le téléphone.

1. Connecte ce repo à Railway (déploiement auto). Railway détecte Python (`requirements.txt` + `Procfile`) et lance `gunicorn server:app`.
2. Dans Railway → **Variables**, ajoute au moins une clé IA :
   - `ANTHROPIC_API_KEY` (Claude, le meilleur co-MJ) et/ou
   - `GEMINI_API_KEY` (Google, offre gratuite), `GROQ_API_KEY` (gratuit, rapide), `OPENAI_API_KEY` (GPT).
   - Optionnel : `ORACLE_PROVIDER=gemini` pour forcer un fournisseur ; `ORACLE_TOKEN` pour protéger l'API.
3. Ouvre l'URL Railway sur ton téléphone → **Ajouter à l'écran d'accueil**.
4. Dans l'app : **Table → Oracle IA → « 🛰️ Mon backend »** (déjà pré-rempli sur l'URL du serveur). L'Oracle marche sans clé dans le téléphone, avec bascule automatique entre fournisseurs.

> Test en local : `pip install -r requirements.txt && python server.py`, puis `http://localhost:8080`.

**Voie alternative — clé directe** : dans **Table → Oracle IA**, choisis Groq / Gemini / Claude / OpenRouter et colle ta clé. Elle **reste sur ton téléphone** (localStorage) ; les appels partent directement vers le fournisseur.

## 🤖 Activer l'Oracle IA

L'Oracle mène la narration. Sans IA, l'app reste utile (dés, fiches, oracle oui/non & générateurs hors-ligne), mais l'IA débloque la vraie co-maîtrise.

- **🛰️ Backend (le plus simple)** : aucune clé à coller, tout passe par ton serveur Railway.
- **Groq** (gratuit, rapide) : https://console.groq.com/keys
- **Google Gemini** (gratuit) : https://aistudio.google.com/apikey
- **Claude** (le meilleur co-MJ) : https://console.anthropic.com/settings/keys
- **OpenRouter** (modèles gratuits) : https://openrouter.ai/settings/keys

## 🎛️ Les directives de l'Oracle

Pendant la partie, l'IA peut émettre des commandes internes que l'app **exécute puis masque** (elles n'apparaissent jamais comme du texte) :

| Directive | Effet |
|---|---|
| `[SCENE: titre=…; ambiance=…]` | pose la scène en cours |
| `[PNJ: nom=…; role=…; trait=…]` | crée/complète un PNJ |
| `[PNJVOIX: nom=…; texte=…]` | réplique parlée d'un PNJ |
| `[PV: cible=…; delta=-6]` | dégâts / soins sur un héros |
| `[PJ: cible=…; armor=…; condition+=…]` | modifie une fiche |
| `[OBJET: cible=…; ajoute=…\|retire=…]` | inventaire |
| `[QUETE: titre=…; etat=active\|faite]` | objectif |
| `[LIEU: …]` · `[BESTIAIRE: …]` | lieux & créatures |
| `[JET: cible=…; diff=…; formule=1d20+3]` | demande un jet (l'app le lance) |
| `[FAIT: …]` · `[MEMO: …]` | chronique & canon durable |
| `[AMBIANCE: theme=…; accent=…]` · `[STYLE: …]` | ambiance visuelle en direct |

## 🔒 Vie privée

Aucun compte, aucun tracking. Toutes tes campagnes vivent dans le stockage local de ton appareil. Le serveur Railway ne sert qu'à relayer les appels IA (il ne stocke pas tes parties). Export/import JSON pour tes sauvegardes.

## 🛠️ Stack technique

HTML/CSS/JS vanilla, zéro dépendance, zéro build. PWA avec service worker. Backend Flask minimal (proxy IA).

| Fichier | Rôle |
|---|---|
| `js/data.js` | Univers, tons, systèmes de dés, thèmes, fournisseurs IA, générateurs |
| `js/state.js` | Campagnes, héros, chronique, canon, persistance localStorage |
| `js/dice.js` | Moteur de dés & jets de compétence |
| `js/oracle.js` | Co-MJ IA : prompt système, directives, adaptateurs API, secours hors-ligne |
| `js/ui.js` | Rendu des vues (Partie, Héros, Univers, Dés, Oracle, Table) |
| `js/app.js` | Onboarding & démarrage |
| `server.py` | Sert la PWA + proxy Oracle IA (cascade multi-fournisseurs) |

> ⚠️ Oracle est un outil d'aide au jeu : l'IA propose, **le MJ humain reste maître de sa table**.
