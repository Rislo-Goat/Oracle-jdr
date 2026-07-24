/* ============================================================
   Oracle — moteur de dés universel.
   Parse des formules libres : 1d20+3, 2d6, 4d6k3 (garde 3),
   1d100, 3d6 pool, avec avantage/désavantage.
   ============================================================ */

const Dice = {

  rollDie(sides) { return 1 + Math.floor(Math.random() * sides); },

  /* Parse et lance une formule. Retourne {total, dice, formula, detail}. */
  roll(formula, opt = {}) {
    formula = (formula || "1d20").trim().toLowerCase().replace(/\s+/g, "");
    const parts = formula.split(/(?=[+-])/); // segments signés
    let total = 0;
    const rolls = [];
    const detailBits = [];

    for (let seg of parts) {
      let sign = 1;
      if (seg[0] === "+") seg = seg.slice(1);
      else if (seg[0] === "-") { sign = -1; seg = seg.slice(1); }
      const m = seg.match(/^(\d*)d(\d+)(k(\d+))?$/);
      if (m) {
        const count = parseInt(m[1] || "1", 10);
        const sides = parseInt(m[2], 10);
        const keep = m[4] ? parseInt(m[4], 10) : count;
        let dset = [];
        for (let i = 0; i < count; i++) dset.push(this.rollDie(sides));
        rolls.push(...dset.map(v => ({ v, sides })));
        let kept = dset.slice().sort((a, b) => b - a).slice(0, keep);
        const sum = kept.reduce((a, b) => a + b, 0) * sign;
        total += sum;
        detailBits.push(`${sign < 0 ? "-" : ""}${count}d${sides}[${dset.join(",")}]${keep < count ? "→garde " + keep : ""}`);
      } else if (/^\d+$/.test(seg)) {
        total += sign * parseInt(seg, 10);
        detailBits.push(`${sign < 0 ? "-" : "+"}${seg}`);
      }
    }

    // avantage / désavantage : relance le premier dé et garde meilleur/pire
    let advNote = "";
    if (opt.adv || opt.dis) {
      const alt = this.roll(formula);
      if (opt.adv) { advNote = " (avantage)"; if (alt.total > total) { return Object.assign(alt, { detail: alt.detail + advNote }); } }
      if (opt.dis) { advNote = " (désavantage)"; if (alt.total < total) { return Object.assign(alt, { detail: alt.detail + advNote }); } }
    }

    return { total, rolls, formula, detail: detailBits.join(" ") + advNote };
  },

  /* Jet de compétence contre une difficulté selon le système courant. */
  check(formula, dc, system) {
    const r = this.roll(formula);
    let outcome, cls;
    const firstD20 = r.rolls.find(x => x.sides === 20);
    if (system === "d100") {
      // sous le score = réussite
      if (r.total <= dc) { outcome = "Réussite"; cls = "ok"; }
      else { outcome = "Échec"; cls = "ko"; }
      if (r.total <= Math.ceil(dc / 5)) { outcome = "Réussite critique"; cls = "crit"; }
    } else if (system === "2d6") {
      if (r.total >= 10) { outcome = "Réussite franche"; cls = "crit"; }
      else if (r.total >= 7) { outcome = "Réussite à un coût"; cls = "ok"; }
      else { outcome = "Complication"; cls = "ko"; }
    } else {
      if (firstD20 && firstD20.v === 20) { outcome = "Réussite critique !"; cls = "crit"; }
      else if (firstD20 && firstD20.v === 1) { outcome = "Échec critique !"; cls = "ko"; }
      else if (r.total >= dc) { outcome = "Réussite"; cls = "ok"; }
      else { outcome = "Échec"; cls = "ko"; }
    }
    return Object.assign(r, { dc, outcome, cls });
  },

  /* Jet D&D 5e depuis un héros : calcule le modificateur (carac + maîtrise)
     puis lance 1d20+mod contre le DD. kind: skill|save|ability|attack */
  check5e(hero, kind, key, dc, opt = {}) {
    const b = DND.buildRoll(hero, kind, key, opt.bonus || 0);
    const res = this.check(b.formula, dc, "dnd5e");
    res.label = (hero ? hero.name + " · " : "") + b.label;
    res.mod = b.mod;
    if (opt.adv || opt.dis) { // relance et garde meilleur/pire dé de base
      const alt = this.check(b.formula, dc, "dnd5e");
      const better = opt.adv ? (alt.total > res.total) : (alt.total < res.total);
      if (better) { alt.label = res.label + (opt.adv ? " (avantage)" : " (désavantage)"); return alt; }
      res.label += opt.adv ? " (avantage)" : " (désavantage)";
    }
    return res;
  },

  /* Initiative 5e : 1d20 + mod de DEX */
  initiative(hero) {
    const m = DND.abilityMod(hero, "DEX");
    return this.roll("1d20" + (m >= 0 ? "+" + m : m));
  },

  /* Anime la popup de dé. */
  show(result, label) {
    const ov = document.getElementById("diceOverlay");
    const face = document.getElementById("dicePopFace");
    const formula = document.getElementById("dicePopFormula");
    const res = document.getElementById("dicePopResult");
    ov.classList.remove("hidden");
    formula.textContent = (label ? label + " · " : "") + result.detail;
    res.textContent = "";
    res.className = "dice-pop-result";
    let n = 0;
    const target = result.total;
    const iv = setInterval(() => {
      face.textContent = Math.max(1, Math.floor(Math.random() * 20) + 1);
      if (++n > 12) {
        clearInterval(iv);
        face.textContent = target;
        res.textContent = result.outcome
          ? `${result.outcome} — total ${target}${result.dc != null ? " vs " + result.dc : ""}`
          : `Total : ${target}`;
        if (result.cls === "crit") res.classList.add("crit");
        else if (result.cls === "ok") res.classList.add("ok");
        else if (result.cls === "ko") res.classList.add("ko");
      }
    }, 45);
  },
};
