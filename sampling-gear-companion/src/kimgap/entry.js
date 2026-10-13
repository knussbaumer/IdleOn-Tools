import '../polyfills';
import { parseData } from '@parsers/index';
import { getSkillEfficiency } from '@parsers/efficiency';
import { getMaxDamage } from '@parsers/damage';
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

// Super talents: for every talent of this character, how much this skill's efficiency changes with the
// super talent levels on it (added if it is not supered yet, removed to measure it if it is).
const withTalentLevels = (c, skillIndex, delta) => {
  const bump = (t) => (t?.skillIndex === skillIndex ? { ...t, level: (t.level || 0) + delta } : t);
  const talents = c.talents ? Object.fromEntries(Object.entries(c.talents).map(([k, v]) => [k, v?.orderedTalents ? { ...v, orderedTalents: v.orderedTalents.map(bump) } : v])) : c.talents;
  return { ...c, flatTalents: (c.flatTalents || []).map(bump), talents };
};
export const superTalentPlan = (c, characters, account, skill, pi) => {
  const eff = (ch, chars) => { try { return getSkillEfficiency(skill, ch, chars, account, pi)?.value; } catch (e) { return null; } };
  const base = eff(c, characters); if (!base) return null;
  const bonus = c?.superTalentsInfo?.bonus || getSuperTalentAddedLevels(account) || 0;
  const supered = new Set((c?.superTalentsInfo?.talents || []).map((x) => x.talentIndex));
  const out = [];
  const seen = new Set();
  for (const t of c.flatTalents || []) {
    if (!t || seen.has(t.skillIndex) || !(t.level >= 1) || !t.name || /^_|FILLER/.test(t.name)) continue;
    seen.add(t.skillIndex);
    const isSuper = supered.has(t.skillIndex);
    const c2 = withTalentLevels(c, t.skillIndex, isSuper ? -bonus : bonus);
    const v = eff(c2, characters.map((x) => (x === c ? c2 : x)));
    if (!v) continue;
    const gain = isSuper ? base / v : v / base;
    if (gain > 1.0005) out.push({ skillIndex: t.skillIndex, name: t.name, level: t.level, baseLevel: t.baseLevel, maxLevel: t.maxLevel, supered: isSuper, gain, description: t.description, value: (() => { try { return growth(t.funcX, t.level, t.x1, t.x2, false); } catch (e) { return null; } })() });
  }
  out.sort((a, b) => b.gain - a.gain);
  return { bonus, slotsUsed: supered.size, list: out };
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
    const supers = Object.fromEntries(SKILLS.filter((s) => FAMILY[s].includes(c.class) || samples[s]?.char === c.name).map((s) => { try { return [s, superTalentPlan(c, characters, account, s, piForInputs)]; } catch (e) { return [s, null]; } }));
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
    return { loadout, supers, golden, name: c.name, cls: c.class, level: c.level, skillLv: Object.fromEntries(SKILLS.map((s) => [s, c.skillsInfo?.[s]?.level ?? 0])), trees, values, statueVal, inputs };
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

