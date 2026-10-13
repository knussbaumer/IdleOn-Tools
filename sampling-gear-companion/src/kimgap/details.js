// Detail panels for the Sampling and Gear Companion. Written as a factory over IdleonToolbox functions so the same
// source runs in the bundle (local imports) and on idleontoolbox.com (live modules) for the top samplers.
export const makeDetails = (api) => {
  const MON_T = { mining: 0, chopping: 2, catching: 1 };
  const MON_NAME = ['Bravery Monument', 'Justice Monument', 'Wisdom Monument'];
  const MON_BONUS = ['+{%|Mining|Efficiency', '}x_Bucket|Fill_Rate', '}x|Cooking_Speed', '+{%_EXP|Gain_for|Villagers', '}x|Gaming_Bits|Gain', '+{%_Chance|for_Bravery|Opals', '+{%_DMG|for_all|Characters', '}x_Bell_Ring|&_Ping_Rate', '+{%|All_Monument|AFK_Gain', '}x_Bravery|Bonuses_Multi',
    '+{%_Catching|Efficiency', '}x_Harp|Note_Gain', '}x_Artifact|Find_Chance', '+{%_EXP|Gain_for|Villagers', '}x|All_Summoning|Essence_Gain', '+{%_Chance|for_Justice|Opals', '+{%_Class|EXP_Gain', '+{%_more|daily_Lamp|Wishes', '+{%|All_Monument|AFK_Gain', '}x_Justice|Bonuses_Multi',
    '+{%_Choppin|Efficiency', '}x_Jar|Rupie_Value', '}x_Jade|Coin_Gain', '+{%_EXP|Gain_for|Villagers', '}x|Farming_Crop|Evo_Chance', '+{%_Chance|for_Wisdom|Opals', '+{%_Player|Drop_Rate', '+{%_Gambit|Points', '+{%|All_Monument|AFK_Gain', '}x_Wisdom|Bonuses_Multi'];
  const cleanBonus = (s) => s.replace(/^[+}]\{?%?_?/, '').replace(/[|_]/g, ' ').replace(/\s+/g, ' ').trim();
  const STATUE_IDX = { mining: 2, chopping: 6, catching: 9, fishing: 8 };
  const VIAL_STAT = { mining: 'MinEff', chopping: 'ChopEff', catching: 'CatchEff', fishing: 'FishEff' };
  const MAX_VIAL = 13;
  const num = (v) => (typeof v === 'number' && isFinite(v) ? v : null);
  const safe = (fn, d = null) => { try { const v = fn(); return v === undefined ? d : v; } catch (e) { return d; } };

  const flatTree = (b) => {
    const out = [];
    const walk = (n, d) => {
      let v = n.value;
      if (n.children) v = safe(() => api.evaluateBreakdownNode(n), v);
      out.push({ d, name: n.name || '', value: num(v), unit: n.unit || '' });
      (n.children || []).forEach((c) => walk(c, d + 1));
    };
    (b?.tree || []).forEach((n) => walk(n, 0));
    return out;
  };

  const monument = (account, skill) => {
    const t = MON_T[skill];
    if (t === undefined) return null;
    const h = account?.hole?.holesObject || {};
    const rows = [];
    for (let i = 0; i < 10; i++) {
      rows.push({ name: cleanBonus(MON_BONUS[10 * t + i] || ''), level: num(h.braveryBonuses?.[10 * t + i]) ?? 0, value: num(safe(() => api.getMonumentBonus({ holesObject: h, t, i }))) });
    }
    return {
      name: MON_NAME[t], rows,
      multi: num(safe(() => api.getMonumentMultiplier({ holesObject: h, t }))),
      multiBonusPct: num(safe(() => api.getMonumentBonus({ holesObject: h, t, i: 9 }))),
      cosmoPct: num(safe(() => api.getCosmoBonus({ majik: h.holeMajiks, t: 0, i: 0 }))),
      fountainPct: num(safe(() => api.getFountainBonusTotal(h, t, 13))),
    };
  };

  const statueInfo = (s) => s ? ({ name: s.name, level: num(s.level), onyx: !!s.onyxStatue, zenith: !!s.zenithStatue, onyxMulti: num(s.onyxMulti), zenithMulti: num(s.zenithMulti), vault: num(s.upgradeVaultMulti) ?? 1, talentMulti: num(s.talentMulti), event: num(s.eventBonusMulti), merit: num(s.meritocracyMulti), dragonMulti: num(s.dragonMulti), basePerLevel: num(s.bonus) }) : null;
  let CHARS = [];
  const statueVoodoo = () => {
    let best = { level: 0, char: null };
    CHARS.forEach((c) => { const t = (c?.flatTalents || []).find((x) => x.name === 'VOODOO_STATUFICATION'); if (t && (num(t.level) || 0) > best.level) best = { level: num(t.level) || 0, char: c.name }; });
    return best;
  };
  const statue = (account, skill, character) => {
    const idx = STATUE_IDX[skill];
    const st = account?.statues?.[idx];
    const dragon = account?.statues?.[29];
    const zm = account?.zenith?.market?.[0];
    const vu = account?.upgradeVault?.upgrades?.[25];
    return {
      zenithMarket: { level: num(zm?.level), max: num(zm?.x3) },
      vault: { level: num(vu?.level), max: num(vu?.maxLevel), applies: [0, 1, 2, 6].includes(idx) },
      voodoo: statueVoodoo(character, account),
      rawName: st?.rawName || null,
      statue: { ...statueInfo(st), value: num(safe(() => api.getStatueBonus(account, idx, character?.flatTalents))) },
      dragon: { ...statueInfo(dragon), value: num(safe(() => api.getStatueBonus({ statues: account?.statues }, 29))) },
    };
  };

  const vials = (account, skill) => {
    const all = account?.alchemy?.vials || [];
    const stats = ['6SkillEff', VIAL_STAT[skill]];
    const list = all.filter((v) => stats.includes(v.stat)).map((v) => {
      const base = num(safe(() => api.growth(v.func, v.level, v.x1, v.x2, false))) ?? 0;
      return { name: v.name, mainItem: v.mainItem, stat: v.stat, level: num(v.level) ?? 0, base, multiplier: num(v.multiplier) ?? 1, value: base * (num(v.multiplier) ?? 1) };
    });
    const vm = safe(() => api.getVialMultiplier(account), null);
    const levels = all.map((v) => num(v.level) ?? 0);
    return {
      list,
      multiplier: num(vm?.value),
      parts: vm?.breakdown ? flatTree(vm.breakdown) : [],
      totalLevels: levels.reduce((a, b) => a + b, 0),
      maxed: levels.filter((l) => l >= MAX_VIAL).length,
      count: levels.length,
      unlocked: levels.filter((l) => l > 0).length,
      notMaxed: all.filter((v) => (num(v.level) ?? 0) < MAX_VIAL).map((v) => ({ name: v.name, level: num(v.level) ?? 0 })),
    };
  };

  const meals = (account) => {
    const list = (account?.cooking?.meals || []).filter((m) => m?.stat === 'Seff');
    const cm = account?.cooking?.cookingMastery;
    const maxLevel = num(safe(() => api.getMealMaxLevel(account)));
    return {
      maxLevel,
      mastery: cm ? { level: num(cm.level), yellowLeft: num(cm.points?.nodeLeft), yellowSpent: num(cm.points?.nodeSpent), purpleLeft: num(cm.points?.categoryLeft), purpleSpent: num(cm.points?.categorySpent) } : null,
      list: list.map((m) => {
        const r = safe(() => api.getMealBonus(account, m), null);
        const ribbonRank = num(account?.grimoire?.ribbons?.[28 + m.index]) ?? 0;
        return {
          name: m.name, rawName: m.rawName, level: num(m.level) ?? 0, perLevel: num(m.baseStat), value: num(r?.value),
          ribbonRank, nodeLevel: num(m.cookingMasteryNode?.level) ?? 0, nodeMulti: num(m.cookingMasteryNode?.multi) ?? 1,
          parts: r?.breakdown ? flatTree(r.breakdown) : [],
        };
      }),
    };
  };

  const forSkill = (account, characters, character, skill) => (CHARS = characters || [], {
    monument: safe(() => monument(account, skill)),
    statue: safe(() => statue(account, skill, character)),
    vials: safe(() => vials(account, skill)),
    meals: safe(() => meals(account)),
  });

  return { forSkill };
};
