import '../polyfills';
import { parseData } from '@parsers/index';
import { getSkillEfficiency } from '@parsers/efficiency';
import { getMaxDamage } from '@parsers/damage';
import { getAfkGain } from '@parsers/character';
import { evaluateBreakdownNode } from '@parsers/breakdown';
import { growth } from '@utility/helpers';
import { getMonumentBonus, getMonumentMultiplier } from '@parsers/world-5/caverns/bravery';
import { getFountainBonusTotal } from '@parsers/world-5/caverns/the-fountain';
import { getCosmoBonus } from '@parsers/world-5/hole';
import { getStatueBonus } from '@parsers/world-1/statues';
import { getVialMultiplier } from '@parsers/world-2/alchemy';
import { getMealBonus, getMealMaxLevel } from '@parsers/world-4/cooking';
import { makeDetails } from './details';
import { makeInputs } from './inputs';
import { getPrayerBonusAndCurse } from '@parsers/world-3/prayers';
import { getCardSets } from '@parsers/cards';
import { calcCardBonus } from '@parsers/cardMath';
import { getItemCapacity, getGoldenFoodMulti, getGoldenFoodBonus } from '@parsers/misc';
import { lavaLog } from '@utility/helpers';
import { getSuperTalentAddedLevels } from '@parsers/talents';
import { items as ITEMS } from '@website-data';

// Golden food: what this character's bonus would be with a full food-slot stack (carry cap, or what storage holds).
const GOLDEN = { mining: ['Golden_Peanut', 'PeanutG'], fishing: ['Golden_Ribs', 'FoodG7'] };
const goldenWhatIf = (c, characters, account, skill) => {
  const g = GOLDEN[skill]; if (!g) return null;
  const [name, raw] = g;
  const cap = getItemCapacity('cFood', c, account)?.value ?? null;
  const equipped = (c?.food || []).filter((f) => f?.name === name).reduce((a, f) => a + (Number(f.amount) || 0), 0);
  const storage = (account?.storage?.list || []).filter((x) => x?.rawName === raw || x?.name === name).reduce((a, x) => a + (Number(x.amount) || 0), 0);
  // Everything the account owns: storage, every character's inventory and every character's food slots.
  const holders = (characters || []).map((ch) => ({
    name: ch.name,
    inventory: (ch.inventory || []).filter((i) => i?.rawName === raw).reduce((s, i) => s + (Number(i.amount) || 0), 0),
    food: ch.name === c.name ? 0 : (ch.food || []).filter((f) => f?.name === name).reduce((s, f) => s + (Number(f.amount) || 0), 0),
  })).filter((h) => h.inventory || h.food);
  const elsewhere = holders.reduce((s, h) => s + h.inventory + h.food, 0);
  const owned = equipped + storage + elsewhere;
  const multi = getGoldenFoodMulti(c, account, characters)?.value ?? 1;
  const amount = ITEMS?.[raw]?.Amount ?? 0;
  const part = (q) => (!q ? 0 : amount * multi * 0.05 * lavaLog(1 + q) * (1 + lavaLog(1 + q) / 2.14));
  const current = getGoldenFoodBonus(name, c, account, characters) || 0;
  const stack = cap == null ? owned : Math.min(cap, owned);
  const capped = current - part(equipped) + part(stack);
  return { name, raw, cap, equipped, storage, holders, owned, stack, multi, current, capped, gain: (1 + capped / 100) / (1 + current / 100) };
};
const INPUTS = makeInputs();
const DETAILS = makeDetails({ evaluateBreakdownNode, growth, getMonumentBonus, getMonumentMultiplier, getFountainBonusTotal, getCosmoBonus, getStatueBonus, getVialMultiplier, getMealBonus, getMealMaxLevel });

export const SKILLS = ['mining', 'chopping', 'catching', 'fishing'];
export const STATUE_IDX = { mining: 2, chopping: 6, catching: 9, fishing: 8 };
export const MONUMENT_T = { mining: 0, chopping: 2, catching: 1 };
// Classes that sample each item; the super talent plan is worked out for these (and the best sampler).
const WARRIORS = ['Warrior', 'Barbarian', 'Squire', 'Blood_Berserker', 'Death_Bringer', 'Divine_Knight', 'Royal_Guardian'];
const FAMILY = { mining: WARRIORS, chopping: ['Mage', 'Wizard', 'Shaman', 'Elemental_Sorcerer', 'Bubonic_Conjuror', 'Arcane_Cultist'], catching: ['Archer', 'Bowman', 'Hunter', 'Siege_Breaker', 'Beast_Master', 'Wind_Walker'], fishing: WARRIORS };
export const SAMPLE_ITEMS = { mining: 'Copper', chopping: 'OakTree', catching: 'Bug1', fishing: 'Fish1' };

// Plain JSON copy of a breakdown tree that evaluateBreakdownNode can re-evaluate.
const KEEP = ['name', 'value', 'unit', 'formatted', 'note', 'combine', 'power', 'min', 'max', 'round', 'step'];
export const cleanNode = (n) => {
  if (!n || typeof n !== 'object') return n;
  const out = {};
  for (const k of KEEP) if (n[k] !== undefined && typeof n[k] !== 'function') out[k] = n[k];
  if (Array.isArray(n.children)) out.children = n.children.map(cleanNode);
  return out;
};
export const cleanBreakdown = (b) => b && ({ statName: b.statName, combine: b.combine, min: b.min, max: b.max, round: b.round, step: b.step, tree: (b.tree || []).map(cleanNode) });

// Presets: each character has 2 talent presets and up to 7 card presets. A variant swaps them into the
// character so the efficiency formulas see that loadout. Stats (STR/WIS/AGI) stay as saved: the save only
// has the totals for what is equipped right now.
const flattenTalents = (tabs) => Object.values(tabs || {}).flatMap((x) => x?.orderedTalents || []);
const withLoadout = (c, talentIdx, cardIdx) => {
  let v = c;
  if (talentIdx !== c.selectedTalentPreset && c.talentPreset) {
    v = { ...v, talents: c.talentPreset.talents, flatTalents: flattenTalents(c.talentPreset.flatTalents), flatStarTalents: c.talentPreset.flatStarTalents || c.flatStarTalents };
  }
  if (cardIdx !== c.selectedCardPreset && Array.isArray(c.cardPresets?.[cardIdx])) {
    const cur = c.cards?.equippedCards || [];
    const cards = c.cardPresets[cardIdx].map((card, i) => (card?.cardIndex ? { ...card, chipBoost: cur[i]?.chipBoost, legendBonus: cur[i]?.legendBonus } : card));
    v = { ...v, cards: { ...c.cards, equippedCards: cards } };
  }
  return v;
};
const effOf = (skill, ch, characters, account, pi, orig) => { try { return getSkillEfficiency(skill, ch, ch === orig ? characters : characters.map((x) => (x === orig ? ch : x)), account, pi)?.value; } catch (e) { return null; } };
export const presetCheck = (c, characters, account, skill, pi) => {
  const talentOpts = [c.selectedTalentPreset ?? 0].concat(c.talentPreset ? [(c.selectedTalentPreset ?? 0) === 0 ? 1 : 0] : []);
  const cardOpts = (c.cardPresets || []).map((p, i) => ((p || []).some((x) => x?.cardIndex) ? i : null)).filter((i) => i !== null);
  const curT = c.selectedTalentPreset ?? 0, curC = c.selectedCardPreset ?? 0;
  const base = effOf(skill, c, characters, account, pi, c); if (!base) return null;
  const combos = [];
  for (const ti of talentOpts) for (const ci of (cardOpts.length ? cardOpts : [curC])) {
    const v = effOf(skill, withLoadout(c, ti, ci), characters, account, pi, c);
    if (v) combos.push({ talent: ti, card: ci, ratio: v / base, cards: (ci === curC ? c.cards?.equippedCards : c.cardPresets?.[ci] || []).map((x) => x?.cardIndex || null) });
  }
  combos.sort((a, b) => b.ratio - a.ratio);
  return { current: { talent: curT, card: curC }, best: combos[0], combos };
};

// Super talents: for every talent of this loadout, how much this skill's efficiency changes with the super
// talent levels on it (added if it is not supered, removed to measure it if it is). Talents that raise the
// skill's main stat are estimated: a "+% stat" talent is treated as its own multiplier on the saved total,
// so its number is an upper bound; flat "+base stat" and gear/obol stat talents cannot be worked out from a
// save and are listed without a number.
const MAIN_STAT = { mining: 'strength', fishing: 'strength', chopping: 'wisdom', catching: 'agility' };
const STAT_PCT = { strength: ['OVERBLOWN_TESTOSTERONE'], agility: ['ADAPTATION_REVELATION'], wisdom: ['UTMOST_INTELLECT'] };
const STAT_FLAT = {
  strength: ['FIST_OF_RAGE', 'ABSOLUTE_UNIT', 'BUILT_DIFFERENT', "'STR'ESS_TESTED_GARB", 'FISTFUL_OF_OBOL'],
  agility: ['QUICKNESS_BOOTS', 'SANIC_SPEED', 'UNREAL_AGILITY', "GARB_OF_UN'AGI'NG_QUALITY", 'SHOEFUL_OF_OBOL'],
  wisdom: ['BOOK_OF_THE_WISE', 'INDIVIDUAL_INSIGHT', 'INDIVIDUALITY', "UNT'WIS'TED_ROBES", 'OCCULT_OBOLS'],
};
const withTalentLevels = (c, skillIndex, delta, statFactor, stat) => {
  const bump = (t) => (t?.skillIndex === skillIndex ? { ...t, level: (t.level || 0) + delta } : t);
  const talents = c.talents ? Object.fromEntries(Object.entries(c.talents).map(([k, v]) => [k, v?.orderedTalents ? { ...v, orderedTalents: v.orderedTalents.map(bump) } : v])) : c.talents;
  const out = { ...c, flatTalents: (c.flatTalents || []).map(bump), talents };
  if (statFactor && stat) out.stats = { ...c.stats, [stat]: (c.stats?.[stat] || 0) * statFactor };
  return out;
};
const g = (t, lv) => { try { return growth(t.funcX, lv, t.x1, t.x2, false); } catch (e) { return null; } };
export const superTalentPlan = (c, characters, account, skill, pi, loadout) => {
  const v = loadout || c;
  const base = effOf(skill, v, characters, account, pi, c); if (!base) return null;
  const bonus = c?.superTalentsInfo?.bonus || getSuperTalentAddedLevels(account) || 0;
  const stat = MAIN_STAT[skill];
  const out = [], extra = [];
  const seen = new Set();
  for (const t of v.flatTalents || []) {
    if (!t || seen.has(t.skillIndex) || !(t.level >= 1) || !t.name || /^_|FILLER/.test(t.name)) continue;
    seen.add(t.skillIndex);
    const isSuper = !!t.isSuperTalent;
    const delta = isSuper ? -bonus : bonus;
    let statFactor = null, statNote = null;
    if (STAT_PCT[stat].includes(t.name)) {
      const b0 = g(t, t.level) || 0, b1 = g(t, t.level + delta) || 0;
      statFactor = (1 + b1 / 100) / (1 + b0 / 100);
      statNote = `+${Math.abs(b1 - b0).toFixed(1)}% ${stat} from the super levels (estimated as its own multiplier, so this is an upper bound)`;
    }
    const item = { skillIndex: t.skillIndex, name: t.name, level: t.level, baseLevel: t.baseLevel, supered: isSuper, description: t.description, value: g(t, t.level), statNote };
    if (STAT_FLAT[stat].includes(t.name)) {
      const d = Math.abs((g(t, t.level + bonus) || 0) - (g(t, t.level) || 0));
      extra.push({ ...item, gain: null, statNote: `Raises ${stat}${d ? ' (+' + Math.round(d).toLocaleString('en-US') + ' from the super levels)' : ''}. More ${stat} means bigger samples, but how much depends on your other ${stat} sources, which the save does not break down.` });
      continue;
    }
    const c2 = withTalentLevels(v, t.skillIndex, delta, statFactor, stat);
    const val = effOf(skill, c2, characters, account, pi, c);
    if (!val) continue;
    const gain = isSuper ? base / val : val / base;
    if (gain > 1.0005) out.push({ ...item, gain, estimate: !!statFactor });
  }
  out.sort((a, b) => b.gain - a.gain);
  return { bonus, slotsUsed: (v.flatTalents || []).filter((t) => t?.isSuperTalent).length, list: out.concat(extra) };
};

// AFK gains for each skill, as if the character were AFK on that skill (the sample is 90% of AFK yield).
const AFK_TYPE = { mining: 'MINING', chopping: 'CHOPPIN', catching: 'CATCHING', fishing: 'FISHING' };
export const afkTrees = (c, characters, account) => {
  const trees = {}; const values = {};
  for (const s of SKILLS) {
    try { const r = getAfkGain({ ...c, afkType: AFK_TYPE[s] }, characters, account); trees[s] = cleanBreakdown(r?.breakdown); values[s] = r?.afkGains == null ? null : 100 * r.afkGains; }
    catch (e) { trees[s] = null; values[s] = null; }
  }
  return { trees, values };
};

export const characterTrees = (c, characters, account) => {
  let pi; try { pi = getMaxDamage(c, characters, account); } catch (e) { pi = undefined; }
  const trees = {}; const values = {};
  for (const s of SKILLS) {
    try { const r = getSkillEfficiency(s, c, characters, account, pi); trees[s] = cleanBreakdown(r?.breakdown); values[s] = r?.value; }
    catch (e) { trees[s] = null; values[s] = null; }
  }
  return { trees, values };
};

export const bestSamples = (account, characters) => {
  const out = {};
  (account?.printer || []).forEach((slots, ci) => (slots || []).forEach((x) => {
    for (const [skill, item] of Object.entries(SAMPLE_ITEMS)) {
      if (x?.item === item && (!out[skill] || Number(x.value) > out[skill].value)) out[skill] = { value: Number(x.value), char: characters[ci]?.name };
    }
  }));
  return out;
};

export const analyzeSave = (raw) => {
  const save = typeof raw === 'string' ? JSON.parse(raw) : raw;
  const data = save.data ?? save;
  const parsed = parseData(data, save.charNames ?? [], save.companion ?? null, save.guildData ?? null, save.serverVars, save.accountCreateTime ? 1e3 * save.accountCreateTime : undefined, save.tournament, {});
  const account = parsed.account ?? parsed.accountData; const characters = parsed.characters ?? parsed.charactersData;
  const samples = bestSamples(account, characters);
  const chars = characters.map((c) => {
    const { trees, values } = characterTrees(c, characters, account);
    let piForInputs; try { piForInputs = getMaxDamage(c, characters, account); } catch (e) { piForInputs = undefined; }
    const inputs = Object.fromEntries(SKILLS.map((s) => { try { return [s, INPUTS.forSkill(account, characters, c, s, piForInputs)]; } catch (e) { return [s, { __error: [{ label: String(e && e.stack || e).slice(0, 300), value: null }] }]; } }));
    const statueVal = Object.fromEntries(SKILLS.map((s) => [s, DETAILS.forSkill(account, characters, c, s)?.statue?.statue?.value ?? null]));
    const golden = Object.fromEntries(SKILLS.map((s) => { try { return [s, goldenWhatIf(c, characters, account, s)]; } catch (e) { return [s, null]; } }));
    const planSkills = SKILLS.filter((s) => FAMILY[s].includes(c.class) || samples[s]?.char === c.name);
    const presets = Object.fromEntries(planSkills.map((s) => { try { return [s, presetCheck(c, characters, account, s, piForInputs)]; } catch (e) { return [s, null]; } }));
    // Super talent plan for the talent preset that is best for this skill.
    const supers = Object.fromEntries(planSkills.map((s) => {
      try {
        const bt = presets[s]?.best?.talent ?? c.selectedTalentPreset ?? 0;
        const plan = superTalentPlan(c, characters, account, s, piForInputs, withLoadout(c, bt, c.selectedCardPreset ?? 0));
        return [s, plan && { ...plan, talentPreset: bt }];
      } catch (e) { return [s, null]; }
    }));
    const loadout = {
      equip: (c.equipment || []).map((x) => x?.rawName).filter((x) => x && x !== 'Blank'),
      tools: (c.tools || []).map((x) => x?.rawName).filter((x) => x && x !== 'Blank'),
      food: (c.food || []).map((x) => x?.rawName).filter((x) => x && x !== 'Blank'),
      chips: (account?.lab?.playersChips?.[c.playerId] || []).map((x) => x?.rawName || ('ConsoleChip' + x?.index)).filter(Boolean),
      cards: (c.cards?.equippedCards || []).map((x) => x?.cardIndex).filter(Boolean),
      cardSet: c.cards?.cardSet?.rawName || null,
      prayers: (c.activePrayers || []).map((x) => 'Prayer' + x?.prayerIndex),
      obols: (c.obols?.list || []).map((x) => x?.rawName).filter((x) => x && !/Locked|Blank/.test(x)),
    };
    loadout.talentPreset = c.selectedTalentPreset ?? 0; loadout.cardPreset = c.selectedCardPreset ?? 0;
    const afk = afkTrees(c, characters, account);
    return { afk, loadout, presets, supers, golden, name: c.name, cls: c.class, level: c.level, skillLv: Object.fromEntries(SKILLS.map((s) => [s, c.skillsInfo?.[s]?.level ?? 0])), trees, values, statueVal, inputs };
  });
  const h = account?.hole?.holesObject || {};
  const extras = {};
  for (const [skill, idx] of Object.entries(STATUE_IDX)) {
    const st = account?.statues?.[idx] || {};
    extras[skill] = {
      statue: { name: st.name, level: st.level, onyx: !!st.onyxStatue, zenith: !!st.zenithStatue, onyxMulti: st.onyxMulti, zenithMulti: st.zenithMulti, dragonMulti: st.dragonMulti, vault: st.upgradeVaultMulti, talentMulti: st.talentMulti, event: st.eventBonusMulti, merit: st.meritocracyMulti },
      monument: MONUMENT_T[skill] === undefined ? null : { level: h.braveryBonuses?.[10 * MONUMENT_T[skill]], multiLevel: h.braveryBonuses?.[10 * MONUMENT_T[skill] + 9] }
    };
  }
  const details = Object.fromEntries(SKILLS.map((s) => [s, DETAILS.forSkill(account, characters, characters.find((c) => c.name === samples[s]?.char) || characters[0], s)]));
  const bisSave = { cards: {}, cardSets: {}, prayers: {} };
  try {
    Object.values(account?.cards || {}).forEach((c) => { if (c?.cardIndex) bisSave.cards[c.cardIndex] = { stars: c.stars ?? -1, amount: c.amount ?? 0, bonus: c.amount > 0 ? calcCardBonus({ bonus: c.bonus, stars: c.stars }) : 0 }; });
  } catch (e) {}
  try {
    Object.values(getCardSets(account) || {}).forEach((set) => { if (set?.rawName) bisSave.cardSets[set.rawName] = { stars: set.stars, bonus: (set.bonus || 0) * Math.max(0, (set.stars ?? -1) + 1) }; });
  } catch (e) {}
  for (const name of ['Skilled_Dimwit', 'Zerg_Rushogen']) {
    try {
      const pr = (account?.prayers || []).find((x) => x?.name === name);
      const r = getPrayerBonusAndCurse([{ name: '__none__' }], name, account, true);
      bisSave.prayers[name] = { level: pr?.level ?? 0, maxLevel: pr?.maxLevel ?? null, bonus: r?.bonus ?? 0, curse: r?.curse ?? 0 };
    } catch (e) {}
  }
  const trophies = (account?.gallery?.trophiesUsed || []).map((x) => x?.rawName).filter(Boolean);
  return { trophies, chars, samples, extras, details, bisSave, lastUpdated: save.lastUpdated ?? null };
};

export const evaluate = (node) => evaluateBreakdownNode(node);
export const evaluateTree = (b) => {
  const vals = (b?.tree || []).map((n) => evaluateBreakdownNode(n));
  if ((b?.combine ?? 'product') === 'sum') return vals.reduce((a, v) => a + v, 0);
  return vals.reduce((a, v) => a * v, 1);
};

