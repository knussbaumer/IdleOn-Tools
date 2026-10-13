// Raw inputs behind each efficiency source, read from IdleonToolbox's parsed account and character.
// Only reads parsed data (no IdleonToolbox functions besides an optional playerInfo), so the same source
// runs in the bundle and, pasted, on idleontoolbox.com for the top samplers.
export const makeInputs = () => {
  const SK = {
    mining: { stat: 'strength', statLabel: 'Strength', statTalents: ['SKILL_STRENGTHEN'], stampStat: 'BaseMinEff', box: 'Dwarven_Supplies', slab: 'SLABI_OREFISH', endgame: 'ENDGAME_EFF_I', effTalent: 'BRUTE_EFFICIENCY', resTalent: 'COPPER_COLLECTOR', resItem: 'Copper', resLabel: 'Copper Ore owned', bubble: 'HEARTY_DIGGY', bubbleRes: 'maxHp', golden: ['Golden_Peanut', 'Golden Peanuts'], sign: 'Mining_Efficency', level: 'Mining level', power: 'Mining power' },
    chopping: { stat: 'wisdom', statLabel: 'Wisdom', statTalents: ['DEFORESTING_ALL_DOUBT', 'SKILL_WIZ'], stampStat: 'BaseChopEff', box: 'Taped_Up_Timber', slab: 'SLABE_LOGSOUL', endgame: 'ENDGAME_EFF_III', effTalent: 'SMART_EFFICIENCY', resTalent: 'LEAF_THIEF', resItem: 'Leaf1', resLabel: 'Leaves owned', bubble: 'HOCUS_CHOPPUS', bubbleRes: 'maxMp', sign: 'Chop_Efficiency', level: 'Choppin level', power: 'Choppin power' },
    catching: { stat: 'agility', statLabel: 'Agility', statTalents: ['BRIAR_PATCH_RUNNER', 'SKILL_AMBIDEXTERITY'], stampStat: 'BaseCatchEff', box: 'Bug_Hunting_Supplies', slab: 'SLABO_CRITTERBUG', endgame: 'ENDGAME_EFF_II', effTalent: 'ELUSIVE_EFFICIENCY', resTalent: "TELEKI'NET'IC_LOGS", resItem: 'OakTree', resLabel: 'Oak Logs owned', sign: 'Catch_Efficiency', level: 'Catching level', power: 'Catching power' },
    fishing: { stat: 'strength', statLabel: 'Strength', statTalents: ['SKILL_STRENGTHEN'], stampStat: 'BaseFishEff', box: 'Sealed_Fishheads', slab: 'SLABI_OREFISH', endgame: 'ENDGAME_EFF_I', effTalent: 'BRUTE_EFFICIENCY', golden: ['Golden_Ribs', 'Golden Ribs'], sign: 'Fishin_Efficency', level: 'Fishing level', power: 'Fishing power' },
  };
  const HUNTER_FAMILY = ['Hunter', 'Beast_Master', 'Wind_Walker'];
  const MAESTRO_FAMILY = ['Maestro', 'Voidwalker'];
  // Rift skill mastery bonus 2 (+5% all skill efficiency) skips these skill indexes.
  const MASTERY_SKIP = [0, 2, 3, 5, 6, 8];
  const num = (v) => (typeof v === 'number' && isFinite(v) ? v : (typeof v === 'string' && v !== '' && isFinite(Number(v)) ? Number(v) : null));
  const title = (s) => String(s).replace(/_/g, ' ').toLowerCase().replace(/(^|\s)\S/g, (m) => m.toUpperCase());
  const talentLv = (c, name) => num((c?.flatTalents || []).find((t) => t.name === name)?.level);
  const starLv = (c, name) => num((c?.flatStarTalents || []).find((t) => t.name === name)?.level);
  const bubble = (account, name) => {
    const all = account?.alchemy?.bubblesFlat || Object.values(account?.alchemy?.bubbles || {}).flat();
    const b = all.find((x) => x?.bubbleName === name);
    const pb = account?.alchemy?.prismaBubbles;
    const prisma = b ? (typeof pb === 'string' ? pb.indexOf(b.bubbleIndex + ',') !== -1 : false) : null;
    return { level: num(b?.level), prisma };
  };
  const stored = (account, rawName) => {
    const list = account?.storage?.list || [];
    return list.filter((x) => x?.rawName === rawName || x?.name === rawName).reduce((a, x) => a + (num(x.amount) || 0), 0);
  };
  const box = (c, name) => num((c?.postOffice?.boxes || []).find((b) => b.name === name)?.level);
  const stamps = (account, pred) => ['combat', 'skills', 'misc'].flatMap((k) => account?.stamps?.[k] || []).filter(pred);
  const L = (label, value, unit) => ({ label, value: value === undefined ? null : value, unit: unit || '' });
  const yn = (v) => (v ? 'yes' : 'no');

  const forSkill = (account, characters, c, skill, playerInfo) => {
    const s = SK[skill];
    const out = {};
    const famTotal = num(account?.totalSkillsLevels?.[skill]?.level);
    const famRank = num(account?.totalSkillsLevels?.[skill]?.rank);
    const rift = num(account?.rift?.currentRift);
    const skillLv = num(c?.skillsInfo?.[skill]?.level);
    out[s.level] = [L('Skill level', skillLv)];
    out[s.statLabel] = [L(s.statLabel + ' (total)', num(c?.stats?.[s.stat])), ...s.statTalents.map((t) => L(title(t) + ' talent level', talentLv(c, t)))];
    if (s.golden) {
      const [gRaw, gName] = s.golden;
      const g = (c?.food || []).find((f) => f?.name === gRaw);
      out['Golden food'] = [L(gName + ' in food slot', num(g?.amount) ?? 0), L(gName + ' in storage', stored(account, gRaw))];
    }
    if (skill === 'fishing') {
      const kit = c?.fishingKit || {};
      out['Fishing toolkit'] = [L('Bait', String(kit?.bait?.name || '').replace(/_/g, ' ') || null), L('Bait power', num(kit?.bait?.pow)), L('Line', String(kit?.line?.name || '').replace(/_/g, ' ') || null), L('Line power', num(kit?.line?.pow))];
      out["Bobbin' Bobbers talent"] = [L("Bobbin' Bobbers talent level", talentLv(c, "BOBBIN'_BOBBERS")), L('Fishing minigame highscore', num((account?.highscores?.minigameHighscores || []).find((m) => m?.name === 'fishing')?.score))];
      const kb = (account?.kangaroo?.bonuses || []).find((b) => b?.name === 'Fishing Eff');
      out['Kangaroo'] = [L('Kangaroo Fishing Eff bonus %', num(kb?.bonus))];
    }
    const slabItems = Math.floor((num(account?.looty?.rawLootedItems) || 0) / 100);
    const sb = bubble(account, s.slab);
    out[title(s.slab) + ' bubble'] = [L('Bubble level', sb.level), L('Prismatic', sb.prisma === null ? null : yn(sb.prisma)), L('Slab items ÷ 100', slabItems)];
    const eb = bubble(account, s.endgame);
    out[title(s.endgame) + ' bubble'] = [L('Bubble level', eb.level), L('Prismatic', eb.prisma === null ? null : yn(eb.prisma)), L('Class level', num(c?.level)), L('Class levels past 500 ÷ 10', Math.max(1, Math.floor(((num(c?.level) || 0) - 500) / 10)))];
    if (s.bubble) {
      const bb = bubble(account, s.bubble);
      const res = num(playerInfo?.[s.bubbleRes]);
      out[title(s.bubble) + ' bubble'] = [L('Bubble level', bb.level), L('Prismatic', bb.prisma === null ? null : yn(bb.prisma)), L(s.bubbleRes === 'maxHp' ? 'Max HP' : 'Max MP', res), L('Digits of it (log10)', res ? Math.log10(res) : null)];
    }
    if (s.resTalent) {
      const resName = skill === 'catching' ? "Teleki'net'ic Logs" : title(s.resTalent);
      const helium = num((account?.atoms?.atoms || []).find((a) => /Helium/.test(a?.name || ''))?.level);
      const owned = stored(account, s.resItem);
      out[resName + ' talent'] = [L('Talent level', talentLv(c, s.resTalent)), L(s.resLabel, owned), L('Digits of it (log10)', owned ? Math.log10(owned) : null), L('Helium atom level', helium)];
    }
    out[title(s.effTalent) + ' talent'] = [L('Talent level', talentLv(c, s.effTalent)), L('Talent max level (base)', num((c?.flatTalents || []).find((t) => t.name === s.effTalent)?.maxLevel))];
    out['Stamp'] = stamps(account, (x) => x.stat === s.stampStat).map((x) => L(String(x.displayName || x.rawName).replace(/_/g, ' ') + ' level', num(x.level)));
    out['Stamp@allbase'] = stamps(account, (x) => String(x.effect || '').includes('All_Skill_Efficiency') || String(x.effect || '').includes('Base_All_Efficiency')).map((x) => L(String(x.displayName || x.rawName).replace(/_/g, ' ') + ' level', num(x.level)));
    const shinyPets = (account?.breeding?.pets || []).flat().filter((p) => String(p?.passive || '').includes('Base_Efficiency_for_All_Skills'));
    out['Shiny@allbase'] = [...shinyPets.map((p) => L(String(p.monsterName).replace(/_/g, ' ') + ' shiny level', num(p.shinyLevel))), L('Total shiny levels (account)', num(account?.breeding?.totalShinyLevels))];
    const nob = account?.divinity?.deities?.[2];
    out['Nobisect blessing@allbase'] = [L('Nobisect blessing level', num(nob?.level)), L('Blessing max level', num(nob?.maxLevel))];
    out['Post office@allbase'] = [L('Myriad Crate box level', box(c, 'Myriad_Crate'))];
    out['Post office'] = [L(s.box.replace(/_/g, ' ') + ' box level', box(c, s.box))];
    out['Supersource talent@allbase'] = [L('Supersource star talent level', starLv(c, 'SUPERSOURCE'))];
    const jw = account?.lab?.jewels?.[12];
    out['Jewel@allbase'] = [L('Emerald Navette active', yn(jw?.active)), L('Jewel multiplier', num(jw?.multiplier))];
    const hunters = (characters || []).filter((x) => HUNTER_FAMILY.includes(x?.class)).map((x) => num(x.level) || 0);
    out['Family@alleff'] = [L('Highest Hunter-family class level', hunters.length ? Math.max(...hunters) : 0)];
    const frost = (account?.sailing?.artifacts || []).find((a) => a?.name === 'Frost_Relic');
    out['Frost Relic artifact@alleff'] = [L('Artifact tier (0 to 6)', num(frost?.acquired))];
    out['Studious Quester talent@alleff'] = [L('Studious Quester star talent level', starLv(c, 'STUDIOUS_QUESTER'))];
    out['Ancient Multitool talent@alleff'] = [L('Ancient Multitool star talent level', starLv(c, 'ANCIENT_MULTITOOL'))];
    out['Tome@alleff'] = [L('Tome points', num(account?.tome?.totalPoints))];
    out['Palette@alleff'] = [L('Pair Green palette level', num(account?.gaming?.palette?.[10]?.level))];
    // Rift skill mastery: the skill's own +10% needs rank 2 in this skill; the all-skill +5% counts every
    // eligible skill at rank 5 or higher. Both need Rift 15.
    out['Skill mastery'] = [L('Skill family rank (needs 2+)', famRank), L('Account total ' + skill + ' level', famTotal), L('Rift reached (needs 15)', rift)];
    const ranked = Object.values(account?.totalSkillsLevels || {}).filter((x) => typeof x?.index === 'number' && x.index >= 0 && !MASTERY_SKIP.includes(x.index));
    out['Skill mastery@alleff'] = [L('Eligible skills at rank 5+', ranked.filter((x) => (num(x.rank) || 0) > 4).length), L('Eligible skills', ranked.length), L('Rift reached (needs 15)', rift)];
    const h = account?.hole?.holesObject || {};
    const sch = (i) => yn((h.engineerSchematics?.[i] ?? 0) !== 0);
    const ex = h.extraCalculations || [];
    out['Schematic@alleff'] = [L('Skill efficiency schematic bought', sch(49)), L('Motherlode layers', num(ex[1])), L('Hive layers', num(ex[3])), L('Hive schematic bought', sch(50)), L('Evertree layers', num(ex[5])), L('Evertree schematic bought', sch(79)), L('Bottomless Trench depth', num(ex[7])), L('Trench schematic bought', sch(98))];
    out['Account bonus@alleff'] = [L('Hoops shop upgrade 4 level (+1% each)', num(account?.accountOptions?.[422]) ?? 0)];
    out['Island shimmer@alleff'] = [L('Shimmer island purchases', num(account?.accountOptions?.[180])), L('Shimmer bonus per purchase', num(account?.islands?.allShimmerBonus))];
    const gb = account?.guild?.guildBonuses?.[6];
    out['Guild@alleff'] = [L('Multi Tool guild bonus level', num(gb?.level)), L('Max level', num(gb?.maxLevel))];
    const pr = (c?.activePrayers || []).find((p) => p?.name === 'Skilled_Dimwit');
    out['Prayer@alleff'] = [L('Skilled Dimwit equipped', yn(pr)), L('Skilled Dimwit level', num((account?.prayers || []).find((p) => p?.name === 'Skilled_Dimwit')?.level))];
    const molti = account?.companions?.list?.at?.(5);
    out['Companion@alleff'] = [L('Molti owned', yn(molti?.acquired)), L('Molti upgraded', yn(molti?.upgraded)), L('Bonus %', num(molti?.acquired ? molti?.bonus : 0))];
    // Star signs: Infinite Stars makes the first signs always active; the Silkrode Nanochip doubles them.
    const chips = account?.lab?.playersChips?.[c?.playerId] || [];
    const silk = chips.some((x) => x?.name === 'Silkrode_Nanochip');
    const signs = (account?.starSigns || []).map((x, i) => ({ x, i })).filter(({ x }) => (x?.bonuses || []).some((b) => String(b?.effect || '').toLowerCase().includes(s.sign.toLowerCase())));
    const eq = new Set((c?.starSigns || []).map((x) => x?.starName));
    const infCount = (account?.starSigns || []).filter((x) => x?.isInfiniteStar).length;
    out['Star sign'] = [L('Silkrode Nanochip equipped', yn(silk)), L('Infinite star signs', infCount || null),
      ...signs.map(({ x }) => { const b = (x.bonuses || []).find((y) => String(y?.effect || '').toLowerCase().includes(s.sign.toLowerCase())); return L(title(x.starName) + ' (+' + b?.bonus + '%)', x.isInfiniteStar ? 'infinite' : eq.has(x.starName) ? 'equipped' : x.unlocked ? 'not equipped' : 'locked'); })];
    // Right Hand of Action: the last Maestro-family character (the Voidwalker) gives it to anyone with a
    // lower level in this skill.
    const vman = (characters || []).filter((x) => MAESTRO_FAMILY.includes(x?.class)).at(-1);
    const vLv = num(vman?.skillsInfo?.[skill]?.level);
    const isV = vman && vman.name === c?.name;
    out['Right Hand of Action'] = [L('Voidwalker', vman ? vman.name : null), L('Voidwalker ' + skill + ' level', vLv), L('This character ' + skill + ' level', skillLv), L('Right Hand of Action talent level', talentLv(vman, 'RIGHT_HAND_OF_ACTION')), L('Active', !vman ? 'no' : isV ? 'own talent' : yn((skillLv ?? 0) < (vLv ?? 0)))];
    return out;
  };
  return { forSkill };
};
