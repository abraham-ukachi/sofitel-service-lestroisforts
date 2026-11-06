/*
 * @license Proprietary - All Rights Reserved
 * ~~~~~~~~~~~~
 * sofitel-service-lestroisforts
 * ~~~~~~~~~~~~
 * Copyright (c) 2026 Abraham Ukachi. The Les Trois Forts Project. All rights reserved.
 *
 * This source code is proprietary and confidential. It is shown publicly for
 * viewing only. No permission is granted to copy, modify, merge, publish,
 * distribute, sublicense, sell, host or deploy this software, in whole or in
 * part, or to use it to build another product or service, without the prior
 * written permission of the copyright holder. See the LICENSE file for the
 * full terms.
 *
 * THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND.
 *
 * @project: sofitel-service-lestroisforts
 * @name: Les Trois Forts - Simulation de service, the waiter makes the drinks
 * @file: pwa/sim-drinks.js
 * @type: JavaScript (module)
 * @authors: Abraham Ukachi <abrahamukachi@gmail.com>
 *
 * Example usage:
 *   1+|> (sim.js) import { useDrinkKit, drinkTask, drinkHtml, scoreDrink } from './sim-drinks.js';
 *    -|> drinkTask('cocktail', { cocktail }, random) → one screen of chips: ingredients, glass, garnish
 *
 */

/*
 * !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
 * MOTTO: We'll always do more 😜!!!
 * !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
 */

// 🍸 At Les Trois Forts the waiter makes the drinks, not the bar. Every drink a guest orders is a quick
// mini-task on one screen of chips, scored 0 to 3 (3 = best, 2 = ok, else wrong), like the dialogue:
// - 🍸 cocktail: the ingredients (recipe + decoys), the glass, the garnish (same logic as the app's Bar game)
// - 🍷 wine by the glass: the wine ordered (decoys of the same colour), the glass, the serving temperature
// - 🥂 champagne: the right bottle and the flute
// - 💧 water: still or sparkling, as asked (the bottles of the carte, a carafe, one bottle that isn't sold)
// - ☕ coffee / 🥃 digestif: the right item
// The tasks are built with the table's seeded random generator, so every phone of an online game shows the
// same chips in the same order. The helpers (translate, data…) come from sim.js through `useDrinkKit`.

// ===== CONSTANTS 🧰 ===== //

// the helpers lent by sim.js (both, pick, escapeHtml, translate, menuData, shuffle, randomItem, translateWord) 🧰
let kit = null;

// the glasses for wine & champagne (FR, EN) 🍷
const WINE_GLASSES = [
  ['Verre à vin blanc', 'White wine glass'],
  ['Verre à vin rouge (ballon)', 'Red wine glass (balloon)'],
  ['Flûte', 'Flute'],
  ['Verre old fashioned', 'Old fashioned glass'],
];

// the serving temperatures offered (FR, EN) and the right one per colour 🌡️
const TEMPERATURES = ['4–6 °C', '8–10 °C', '10–12 °C', '16–18 °C', '20–22 °C'];
const RIGHT_TEMPERATURE = { Blanc: '10–12 °C', Rosé: '8–10 °C', Rouge: '16–18 °C' };

// the waters on the shelf: [FR, EN, kind] (Evian is not on the carte: a decoy) 💧
const WATER_SHELF = [
  ['Vittel', 'Vittel', 'still'],
  ['Zilia', 'Zilia', 'still'],
  ['San Pellegrino', 'San Pellegrino', 'sparkling'],
  ['Orezza', 'Orezza', 'sparkling'],
  ["Carafe d'eau", 'Carafe of water', 'carafe'],
  ['Evian', 'Evian', 'none'],
];

// the coffees of the dinner carte in English (LTF.coffee names are French) ☕
const COFFEE_EN = {
  Expresso: 'Espresso',
  'Double expresso': 'Double espresso',
  Americano: 'Americano',
  Cappuccino: 'Cappuccino',
  Latte: 'Latte',
  'Thé / infusion': 'Tea / herbal tea',
};

// ===== HELPERS 🧰 ===== //

/**
 * `useDrinkKit` - Function 🧰
 *
 * @param { object } helpers - sim.js's helpers (both, pick, escapeHtml, translate, menuData, shuffle, randomItem, translateWord)
 * @returns { void }
 */
export function useDrinkKit(helpers) {
  kit = helpers;
}

/**
 * `unique` - Function 🧹
 *
 * @param { Array<string> } list - words
 * @returns { Array<string> } - the same words, each once
 */
function unique(list) {
  return list.filter((word, index) => word && list.indexOf(word) === index);
}

/**
 * `word` - Function 🇬🇧
 *
 * @param { string } french - an ingredient, a glass or a garnish of LTF.cocktails
 * @returns { {fr: string, en: string} } - its label in both languages (« — » = no garnish)
 */
function word(french) {
  if (french === '—') return kit.both('Aucune', 'None');
  return kit.both(french, kit.translateWord(french));
}

/**
 * `group` - Function 🧩
 *
 * @param { string } id - the group id (item, glass, garnish, temp, bottle)
 * @param { {fr: string, en: string} } label - its title
 * @param { Array<{fr: string, en: string, value: string}> } options - the chips (already in their shown order)
 * @param { Array<string> } answers - the right values
 * @param { object } [extra] - { multi: true for several chips, near: values that are half right }
 * @returns { object } - a group { id, label, multi, options, answer: indexes, near: indexes }
 */
function group(id, label, options, answers, extra) {
  const settings = extra || {};
  const values = options.map((option) => option.value);
  return {
    id,
    label,
    multi: !!settings.multi,
    options: options.map((option) => ({ fr: option.fr, en: option.en })),
    answer: answers.map((value) => values.indexOf(value)).filter((index) => index >= 0),
    near: (settings.near || []).map((value) => values.indexOf(value)).filter((index) => index >= 0),
  };
}

// ===== THE TASKS 🍸 ===== //

/**
 * `cocktailTask` - Function 🍸
 *
 * @param { object } cocktail - a cocktail of LTF.cocktails (recipe, glass, garnish)
 * @param { Function } random - the table's seeded generator
 * @returns { Array<object> } - the groups: ingredients (multi), glass, garnish
 */
function cocktailTask(cocktail, random) {
  const cocktails = kit.menuData().cocktails || [];
  const need = (cocktail.recipe || []).map((line) => line[0]);
  const every = unique(cocktails.flatMap((entry) => (entry.recipe || []).map((line) => line[0])));
  const decoys = kit
    .shuffle(
      every.filter((ingredient) => !need.includes(ingredient)),
      random,
    )
    .slice(0, Math.max(4, 8 - need.length));
  const shelf = kit.shuffle(unique(need.concat(decoys)), random);
  const glasses = kit.shuffle(unique(cocktails.map((entry) => entry.glass)), random);
  const garnishes = kit.shuffle(unique(cocktails.map((entry) => entry.garnish)), random).slice(0, 6);
  if (!garnishes.includes(cocktail.garnish)) garnishes[0] = cocktail.garnish;
  return [
    group(
      'item',
      kit.both('Les ingrédients', 'The ingredients'),
      shelf.map((ingredient) => Object.assign({ value: ingredient }, word(ingredient))),
      need,
      { multi: true },
    ),
    group(
      'glass',
      kit.both('Le verre', 'The glass'),
      glasses.map((glass) => Object.assign({ value: glass }, word(glass))),
      [cocktail.glass],
    ),
    group(
      'garnish',
      kit.both('La garniture', 'The garnish'),
      garnishes.map((garnish) => Object.assign({ value: garnish }, word(garnish))),
      [cocktail.garnish],
    ),
  ];
}

/**
 * `glassGroup` - Function 🍷
 *
 * @param { string } right - the French name of the right glass (one of WINE_GLASSES)
 * @param { Function } random - the table's seeded generator
 * @returns { object } - the glass group
 */
function glassGroup(right, random) {
  return group(
    'glass',
    kit.both('Le verre', 'The glass'),
    kit.shuffle(WINE_GLASSES, random).map((glass) => ({ value: glass[0], fr: glass[0], en: glass[1] })),
    [right],
  );
}

/**
 * `wineTask` - Function 🍷
 *
 * @param { object } wine - the wine ordered (LTF.wines: c colour, w name)
 * @param { Function } random - the table's seeded generator
 * @returns { Array<object> } - the groups: the wine (decoys of the same colour), the glass, the temperature
 */
function wineTask(wine, random) {
  const sameColour = (kit.menuData().wines || []).filter((entry) => entry.c === wine.c);
  const byGlass = sameColour.filter((entry) => /^Verre/.test(entry.f || ''));
  let names = unique(byGlass.map((entry) => entry.w).filter((name) => name !== wine.w));
  // 🍾 not enough glasses of that colour: the bottles of the same colour fill the shelf
  if (names.length < 3)
    names = unique(names.concat(sameColour.map((entry) => entry.w).filter((name) => name !== wine.w)));
  const shelf = kit.shuffle([wine.w].concat(kit.shuffle(names, random).slice(0, 3)), random);
  return [
    group(
      'item',
      kit.both('Le vin', 'The wine'),
      shelf.map((name) => ({ value: name, fr: name, en: name })),
      [wine.w],
    ),
    glassGroup(wine.c === 'Rouge' ? 'Verre à vin rouge (ballon)' : 'Verre à vin blanc', random),
    group(
      'temp',
      kit.both('La température de service', 'The serving temperature'),
      TEMPERATURES.map((degrees) => ({ value: degrees, fr: degrees, en: degrees })),
      [RIGHT_TEMPERATURE[wine.c] || '10–12 °C'],
    ),
  ];
}

/**
 * `champagneTask` - Function 🥂
 *
 * @param { object } champagne - the champagne ordered (LTF.champagnes: n name)
 * @param { Function } random - the table's seeded generator
 * @returns { Array<object> } - the groups: the bottle, the flute
 */
function champagneTask(champagne, random) {
  const others = unique((kit.menuData().champagnes || []).map((entry) => entry.n)).filter(
    (name) => name !== champagne.n,
  );
  const shelf = kit.shuffle([champagne.n].concat(kit.shuffle(others, random).slice(0, 3)), random);
  return [
    group(
      'bottle',
      kit.both('La bouteille', 'The bottle'),
      shelf.map((name) => ({ value: name, fr: name, en: name })),
      [champagne.n],
    ),
    glassGroup('Flûte', random),
  ];
}

/**
 * `waterTask` - Function 💧
 *
 * @param { string } kind - 'still', 'sparkling' or 'carafe' (what the guests asked for)
 * @param { Function } random - the table's seeded generator
 * @returns { Array<object> } - one group: any bottle of the right kind is best
 */
function waterTask(kind, random) {
  const shelf = kit.shuffle(WATER_SHELF, random);
  return [
    group(
      'item',
      kit.both("L'eau", 'The water'),
      shelf.map((water) => ({ value: water[0], fr: water[0], en: water[1] })),
      WATER_SHELF.filter((water) => water[2] === kind).map((water) => water[0]),
    ),
  ];
}

/**
 * `itemTask` - Function ☕
 *
 * @param { string } ordered - the French name of the item ordered
 * @param { Array<string> } names - every item of that kind (coffees or digestifs)
 * @param { Function } random - the table's seeded generator
 * @param { object } [english] - English names by French name
 * @returns { Array<object> } - one group: the right item
 */
function itemTask(ordered, names, random, english) {
  const others = unique(names).filter((name) => name !== ordered);
  const shelf = kit.shuffle([ordered].concat(kit.shuffle(others, random).slice(0, 3)), random);
  return [
    group(
      'item',
      kit.both('Le bon produit', 'The right item'),
      shelf.map((name) => ({ value: name, fr: name, en: (english && english[name]) || name })),
      [ordered],
    ),
  ];
}

/**
 * `drinkTask` - Function 🍸
 *
 * Builds one drink mini-task (call it inside buildSteps, with the table's seeded generator).
 *
 * @param { string } kind - water, cocktail, champagne, wine, coffee or digestif
 * @param { object } details - { water: 'still'|'sparkling'|'carafe', cocktail, champagne, wine, coffee, digestif, covers }
 * @param { Function } random - the table's seeded generator
 * @returns { object | null } - the task { kind, name, order: guest line, title, groups, answer: summary }
 */
export function drinkTask(kind, details, random) {
  const covers = details.covers || 1;
  /**
   * `quantity` - Function 🔢
   *
   * @param { string } french - « coupe » / « verre »
   * @param { string } english - « glass »
   * @returns { {fr: string, en: string} } - « Deux coupes » / « Two glasses » (or one)
   */
  const quantity = (french, english) =>
    covers > 1
      ? kit.both(
          `${covers === 2 ? 'Deux' : covers} ${french}s`,
          `${covers === 2 ? 'Two' : covers} ${english}es`,
        )
      : kit.both(`Une ${french}`, `A ${english}`);
  if (kind === 'water') {
    const labels = {
      still: kit.both('Eau plate pour la table', 'Still water for the table'),
      sparkling: kit.both('Eau pétillante pour la table', 'Sparkling water for the table'),
      carafe: kit.both("Une carafe d'eau", 'A carafe of water'),
    };
    return {
      kind,
      name: 'water|' + details.water,
      order: null,
      title: labels[details.water] || labels.carafe,
      groups: waterTask(details.water, random),
    };
  }
  if (kind === 'cocktail' && details.cocktail && Array.isArray(details.cocktail.recipe)) {
    const name = details.cocktail.n;
    return {
      kind,
      name: 'cocktail|' + name,
      order: kit.both(`Pour moi, un ${name}, s'il vous plaît !`, `For me, a ${name}, please!`),
      title: kit.both('Cocktail : ' + name, 'Cocktail: ' + name),
      groups: cocktailTask(details.cocktail, random),
    };
  }
  if (kind === 'champagne' && details.champagne) {
    const name = details.champagne.n;
    const glasses = quantity('coupe', 'glass');
    return {
      kind,
      name: 'champagne|' + name,
      order: kit.both(`${glasses.fr} de ${name}, avec plaisir !`, `${glasses.en} of ${name}, with pleasure!`),
      title: kit.both(`${glasses.fr} de ${name}`, `${glasses.en} of ${name}`),
      groups: champagneTask(details.champagne, random),
    };
  }
  if (kind === 'wine' && details.wine) {
    const name = details.wine.w;
    const glasses = quantity('verre', 'glass');
    return {
      kind,
      name: 'wine|' + name,
      order: kit.both(
        `Va pour ${name}, ${glasses.fr.toLowerCase()} !`,
        `${name} it is, ${glasses.en.toLowerCase()}!`,
      ),
      title: kit.both(`${glasses.fr} · ${name}`, `${glasses.en} · ${name}`),
      groups: wineTask(details.wine, random),
    };
  }
  if (kind === 'coffee' && details.coffee) {
    const name = details.coffee;
    const english = COFFEE_EN[name] || name;
    const names = (kit.menuData().coffee || []).filter((entry) => entry.diner).map((entry) => entry.n);
    return {
      kind,
      name: 'coffee|' + name,
      order: kit.both(
        `Un ${name.toLowerCase()} pour moi, s'il vous plaît.`,
        `A ${english.toLowerCase()} for me, please.`,
      ),
      title: kit.both('Café : ' + name, 'Coffee: ' + english),
      groups: itemTask(name, names.length ? names : Object.keys(COFFEE_EN), random, COFFEE_EN),
    };
  }
  if (kind === 'digestif' && details.digestif) {
    const name = details.digestif.n;
    const names = (kit.menuData().digestifs || []).map((entry) => entry.n);
    return {
      kind,
      name: 'digestif|' + name,
      order: kit.both(`Va pour le ${name}, merci.`, `The ${name}, thank you.`),
      title: kit.both('Digestif : ' + name, 'Digestif: ' + name),
      groups: itemTask(name, names, random),
    };
  }
  return null;
}

// ===== PLAYING A TASK 🎯 ===== //

/**
 * `togglePick` - Function 👆
 *
 * @param { object } task - a drink task
 * @param { object } picks - { groupId: Array<number> } (changed in place)
 * @param { string } groupId - the group tapped
 * @param { number } index - the chip tapped
 * @returns { Array<number> } - the group's new selection (several chips for a multi group, else one)
 */
export function togglePick(task, picks, groupId, index) {
  const target = task.groups.find((entry) => entry.id === groupId);
  if (!target || !target.options[index]) return [];
  const current = picks[groupId] || [];
  if (target.multi)
    picks[groupId] = current.includes(index)
      ? current.filter((value) => value !== index)
      : current.concat(index);
  else picks[groupId] = [index];
  return picks[groupId];
}

/**
 * `scoreDrink` - Function 🎯
 *
 * @param { object } task - a drink task
 * @param { object } picks - { groupId: Array<number> }
 * @returns { {digit: number, grade: string, right: number, total: number} } - 0 → 3, best (3), ok (2) or wrong
 */
export function scoreDrink(task, picks) {
  let right = 0;
  task.groups.forEach((entry) => {
    const chosen = (picks[entry.id] || []).slice().sort();
    const answer = entry.answer.slice().sort();
    if (entry.multi) {
      if (chosen.length === answer.length && chosen.every((value, index) => value === answer[index])) right++;
    } else if (chosen.length === 1 && answer.includes(chosen[0])) right++;
    else if (chosen.length === 1 && entry.near.includes(chosen[0])) right += 0.5;
  });
  const digit = Math.round((3 * right) / task.groups.length);
  return { digit, grade: gradeOfDigit(digit), right, total: task.groups.length };
}

/**
 * `gradeOfDigit` - Function 🏷️
 *
 * @param { number } digit - a drink score (0 → 3)
 * @returns { string } - best (3), ok (2) or wrong (0, 1)
 */
export function gradeOfDigit(digit) {
  return digit >= 3 ? 'best' : digit === 2 ? 'ok' : 'wrong';
}

/**
 * `answerText` - Function ✅
 *
 * @param { object } task - a drink task
 * @returns { {fr: string, en: string} } - the right answer, group by group (shown after serving)
 */
export function answerText(task) {
  const french = [];
  const english = [];
  task.groups.forEach((entry) => {
    const options = entry.answer.map((index) => entry.options[index]);
    french.push(options.map((option) => option.fr).join(entry.multi ? ', ' : ' ou '));
    english.push(options.map((option) => option.en).join(entry.multi ? ', ' : ' or '));
  });
  return kit.both(french.join(' · '), english.join(' · '));
}

/**
 * `drinkHtml` - Function 🖼️
 *
 * @param { object } task - a drink task
 * @param { object } picks - { groupId: Array<number> } (the chips already tapped)
 * @param { string } glassIcon - the outline icon to show on the Serve button (from sim.js)
 * @returns { string } - one screen: the order, a row of chips per group, and « Servir »
 */
export function drinkHtml(task, picks, glassIcon) {
  return (
    `<div class="simdrink" data-drink="${kit.escapeHtml(task.kind)}">` +
    `<div class="simdrinkhead">${glassIcon}<div class="simgrow"><small>${kit.translate('Vous préparez', 'You prepare')}</small>` +
    `<b>${kit.escapeHtml(kit.pick(task.title))}</b></div></div>` +
    task.groups
      .map(
        (entry, groupIndex) =>
          `<div class="simdrinkgroup"><div class="simdrinklabel">${groupIndex + 1}. ${kit.escapeHtml(kit.pick(entry.label))}` +
          (entry.multi ? ` <span>${kit.translate('(plusieurs)', '(several)')}</span>` : '') +
          `</div><div class="simchips">` +
          entry.options
            .map(
              (option, index) =>
                `<button class="simchip${(picks[entry.id] || []).includes(index) ? ' simon' : ''}" data-dpick="${entry.id}:${index}">` +
                `${kit.escapeHtml(kit.pick(option))}</button>`,
            )
            .join('') +
          `</div></div>`,
      )
      .join('') +
    `<button class="btn simserve" data-act="serve">${glassIcon}${kit.translate('Servir', 'Serve')}</button></div>`
  );
}
