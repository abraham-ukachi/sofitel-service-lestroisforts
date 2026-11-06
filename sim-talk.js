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
 * @name: Les Trois Forts - Simulation de service, interruptions & questions
 * @file: pwa/sim-talk.js
 * @type: JavaScript (module)
 * @authors: Abraham Ukachi <abrahamukachi@gmail.com>
 *
 * Example usage:
 *   1+|> (sim.js) import { useTalkKit, buildInterruptions, questionsFor, askQuestion } from './sim-talk.js';
 *    -|> buildInterruptions(booking, steps, guests) → 1 to 3 seeded interruptions by the other guests
 *
 */

/*
 * !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
 * MOTTO: We'll always do more 😜!!!
 * !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
 */

// 🙋 The other guests talk too:
// - 🙋 Interruptions: 1 to 3 per table (never at a table for one), seeded from the booking so every phone of an
//   online game gets the same ones. A guest who isn't the booker asks their own question, fitted to the moment
//   (the catch of the day, gluten, more bread, a children's menu, a juice…), built from the real carte where it
//   can be (dish names & descriptions, allergens, wines). The waiter answers by multiple choice, scored.
// - ❓ Questions: the waiter can ask the booker or any guest a question at any time (name, allergies, water,
//   aperitif, everything fine, more wine, dessert, coffee, the bill…). The guest answers from the booking; good
//   timing pays a little, the allergy question before the order pays a bonus, a question at the wrong moment 0.
// The helpers (both, data, dishes…) come from sim.js through `useTalkKit`.

// ===== CONSTANTS 🧰 ===== //

// the helpers lent by sim.js 🧰
let kit = null;

// the steps of each phase of the meal (by step key) 🍽️
const PHASES = {
  arrival: ['welcome', 'seating'],
  order: ['water', 'aperitif', 'menu', 'allergy', 'order'],
  meal: ['wine', 'mains', 'birthday', 'anniversary', 'business'],
  after: ['dessert', 'coffee', 'bill', 'goodbye'],
};

// the phases in service order 🔢
const PHASE_ORDER = ['arrival', 'order', 'meal', 'after'];

// the steps before which an interruption can happen: before the order, during the meal, after 🙋
const INTERRUPT_PHASES = {
  water: 'before',
  aperitif: 'before',
  menu: 'before',
  allergy: 'before',
  order: 'before',
  wine: 'during',
  mains: 'during',
  birthday: 'during',
  anniversary: 'during',
  business: 'during',
  dessert: 'after',
  coffee: 'after',
  bill: 'after',
};

// the questions the waiter can ask: id (2 letters, stored online), the steps where it is well timed, FR, EN ❓
const QUESTIONS = [
  ['nm', ['welcome', 'seating'], 'Vous avez réservé à quel nom ?', 'What name is the booking under?'],
  ['cv', ['welcome', 'seating'], 'Vous êtes combien ce soir ?', 'How many of you tonight?'],
  [
    'al',
    ['seating', 'water', 'aperitif', 'menu', 'allergy', 'order'],
    'Avez-vous des allergies ?',
    'Do you have any allergies?',
  ],
  ['wa', ['water', 'aperitif'], "Souhaitez-vous de l'eau ?", 'Would you like some water?'],
  ['ap', ['aperitif', 'menu'], 'Un apéritif ?', 'An aperitif?'],
  [
    'oc',
    ['menu', 'allergy', 'order', 'mains', 'birthday', 'anniversary', 'business'],
    'Vous fêtez quelque chose ce soir ?',
    'Are you celebrating something tonight?',
  ],
  [
    'ok',
    ['birthday', 'anniversary', 'business', 'dessert'],
    'Tout se passe bien ?',
    'Is everything all right?',
  ],
  ['wi', ['mains', 'birthday', 'anniversary', 'business'], 'Encore un peu de vin ?', 'A little more wine?'],
  [
    'br',
    ['wine', 'mains', 'birthday', 'anniversary', 'business'],
    'Un peu plus de pain ?',
    'A little more bread?',
  ],
  ['de', ['dessert'], 'Un dessert ?', 'Some dessert?'],
  ['co', ['coffee'], 'Un café ?', 'A coffee?'],
  ['bi', ['bill'], "L'addition ?", 'The bill?'],
  ['hc', ['bill'], "Êtes-vous client de l'hôtel ?", 'Are you staying at the hotel?'],
];

// ===== HELPERS 🧰 ===== //

/**
 * `useTalkKit` - Function 🧰
 *
 * @param { object } helpers - sim.js's helpers (both, choice, menuData, dishes, allergens, random…)
 * @returns { void }
 */
export function useTalkKit(helpers) {
  kit = helpers;
}

/**
 * `baseKey` - Function 🔑
 *
 * @param { string } key - a step key (e.g. 'order|Champignons des bois')
 * @returns { string } - the part before the « | »
 */
function baseKey(key) {
  return String(key || '').split('|')[0];
}

/**
 * `phaseOf` - Function 🍽️
 *
 * @param { string } key - the key of the next step ('' when the table is done)
 * @returns { string } - arrival, order, meal, after, or done
 */
export function phaseOf(key) {
  const base = baseKey(key);
  return PHASE_ORDER.find((phase) => PHASES[phase].includes(base)) || 'done';
}

/**
 * `who` - Function 👤
 *
 * @param { object } guest - a guest { kind, name }
 * @param { string } french - the French line for an adult
 * @param { string } english - the English line for an adult
 * @param { string } [childFrench] - the French line for a child
 * @param { string } [childEnglish] - the English line for a child
 * @returns { {fr: string, en: string} } - the line fitting the guest
 */
function who(guest, french, english, childFrench, childEnglish) {
  return guest.kind === 'c' && childFrench ? kit.both(childFrench, childEnglish) : kit.both(french, english);
}

// ===== INTERRUPTIONS 🙋 ===== //

/**
 * `regionOf` - Function 🗺️
 *
 * @param { object } wine - a wine of LTF.wines
 * @returns { {fr: string, en: string} } - « un blanc de Provence » / « a white from Provence »
 */
function regionOf(wine) {
  const region = kit.regionFrom(wine.r);
  const colours = {
    Blanc: ['un blanc', 'a white'],
    Rosé: ['un rosé', 'a rosé'],
    Rouge: ['un rouge', 'a red'],
  }[wine.c] || ['un vin', 'a wine'];
  return kit.both(`${colours[0]} ${region[0]}`, `${colours[1]} ${region[1]}`);
}

/**
 * `interruptionPool` - Function 🙋
 *
 * The questions a guest can interrupt with, for a moment of the meal (each one null when the data lacks).
 *
 * @param { string } moment - before, during or after
 * @param { object } guest - the guest who interrupts { kind, name }
 * @param { object } booking - the booking
 * @param { object } meta - what the table ordered (steps.meta: mainDish, wine, waterKind…)
 * @param { Function } random - the table's seeded generator
 * @returns { Array<object> } - the possible interruptions { id, line, choices }
 */
function interruptionPool(moment, guest, booking, meta, random) {
  const choice = kit.choice;
  const both = kit.both;
  const pool = [];
  const child = guest.kind === 'c';
  const dinner = kit.dinnerDishes();
  const mains = kit.mainDishes();
  if (moment === 'before' && !child) {
    // 🐟 the catch of the day: the « Retour de pêche suivant la criée » when it's on the carte
    const catchDish = mains.find((dish) => /criée|pêche/i.test(dish.n));
    const seaDish = catchDish || mains.find((dish) => dish.s === 'De la mer');
    const pastDish = kit.randomItem(kit.oldDishes(), random);
    if (seaDish)
      pool.push({
        id: 'fish',
        line: both("C'est quoi le poisson du jour ?", "What's the fish of the day?"),
        choices: [
          choice(
            'best',
            catchDish
              ? both(
                  `C'est notre « ${kit.dishName(catchDish).fr} » : le poisson selon l'arrivage de la criée. Je vérifie l'espèce de ce soir en cuisine.`,
                  `It's our « ${kit.dishName(catchDish).en} »: the fish from today's market. I'll check tonight's species with the kitchen.`,
                )
              : both(
                  `Ce soir, je vous conseille « ${kit.dishName(seaDish).fr} ».`,
                  `Tonight I'd suggest the « ${kit.dishName(seaDish).en} ».`,
                ),
            both('Un plat précis de la carte du soir.', "A precise dish from tonight's carte."),
          ),
          choice(
            'ok',
            both(
              'Je me renseigne en cuisine et je reviens vers vous.',
              "I'll ask the kitchen and come back to you.",
            ),
            both('Correct, mais connaissez votre carte du soir.', "Fine, but know tonight's carte."),
          ),
          pastDish
            ? choice(
                'wrong',
                both(`Le « ${kit.dishName(pastDish).fr} ».`, `The « ${kit.dishName(pastDish).en} ».`),
                both("Ce plat n'est plus à la carte.", 'That dish is off the menu now.'),
              )
            : choice(
                'wrong',
                both('Du saumon fumé, comme tous les soirs.', 'Smoked salmon, like every night.'),
                both(
                  "Ce n'est pas à la carte : on n'invente pas.",
                  "It isn't on the carte: don't make things up.",
                ),
              ),
          choice(
            'wrong',
            both("Il n'y a pas de poisson ce soir.", "There's no fish tonight."),
            both(
              'Faux : la carte du soir a plusieurs plats de la mer.',
              'Wrong: tonight’s carte has several seafood dishes.',
            ),
          ),
        ],
      });
    // 🌾 something without gluten (from the allergen chart, always confirmed with the kitchen)
    const noGluten = dinner.filter(
      (dish) =>
        dish.s !== 'Desserts' &&
        dish.s !== 'Fromages' &&
        dish.alg !== undefined &&
        !kit.allergenCodes(dish).includes('gluten'),
    );
    const withGluten = dinner.filter(
      (dish) => kit.allergenCodes(dish).includes('gluten') && dish.s !== 'Desserts',
    );
    const safe = kit.randomItem(noGluten, random);
    const risky = kit.randomItem(withGluten, random);
    if (safe && risky)
      pool.push({
        id: 'gluten',
        line: both('Il y a quelque chose sans gluten ?', 'Is there anything gluten-free?'),
        choices: [
          choice(
            'best',
            both(
              `D'après notre fiche, « ${kit.dishName(safe).fr} » n'en contient pas. Je le confirme avec la cuisine.`,
              `According to our chart, the « ${kit.dishName(safe).en} » has none. I'll confirm with the kitchen.`,
            ),
            both(
              'Un plat de la fiche allergènes, et on confirme en cuisine.',
              'A dish from the allergen chart, confirmed with the kitchen.',
            ),
          ),
          choice(
            'ok',
            both('Je demande au chef et je reviens vers vous.', "I'll ask the chef and come back to you."),
            both(
              'Prudent, mais la fiche allergènes donne déjà des pistes.',
              'Careful, but the allergen chart already gives options.',
            ),
          ),
          choice(
            'danger',
            both(
              `« ${kit.dishName(risky).fr} », sans problème.`,
              `The « ${kit.dishName(risky).en} », no problem.`,
            ),
            both(
              `Danger : il contient ${kit.labelsOf(['gluten']).fr}.`,
              `Danger: it contains ${kit.labelsOf(['gluten']).en}.`,
            ),
          ),
          choice(
            'wrong',
            both('Le gluten, ça ne fait de mal à personne.', 'Gluten never hurt anyone.'),
            both('On ne juge jamais une demande de santé.', 'Never judge a health request.'),
          ),
        ],
      });
    // 🍹 something without alcohol (the mocktail & the French Bloom)
    const mocktail = (kit.menuData().cocktails || []).find((cocktail) => /mocktail/i.test(cocktail.n));
    const bloom = (kit.menuData().softs || []).find((soft) => /French Bloom/i.test(soft.n));
    if (mocktail || bloom) {
      const mocktailName = mocktail ? mocktail.n.replace(/\s*\(mocktail\)/i, '') : '';
      pool.push({
        id: 'soft',
        line: both('Vous avez quelque chose sans alcool ?', 'Do you have anything alcohol-free?'),
        choices: [
          choice(
            'best',
            both(
              [
                mocktailName && `Notre ${mocktailName}, un cocktail sans alcool`,
                bloom && 'une coupe de French Bloom, un pétillant sans alcool',
              ]
                .filter(Boolean)
                .join(', ou ') + '.',
              [
                mocktailName && `Our ${mocktailName}, an alcohol-free cocktail`,
                bloom && 'a glass of French Bloom, an alcohol-free sparkling',
              ]
                .filter(Boolean)
                .join(', or ') + '.',
            ),
            both('Des boissons précises de la carte.', 'Precise drinks from the menu.'),
          ),
          choice(
            'ok',
            both('Des jus et des sodas.', 'Juices and sodas.'),
            both('Vrai, mais vendez le mocktail maison.', 'True, but sell the house mocktail.'),
          ),
          choice(
            'wrong',
            both("Seulement de l'eau, désolé.", 'Only water, sorry.'),
            both(
              'Faux : il y a un mocktail, des jus et des softs artisanaux.',
              'Wrong: there is a mocktail, juices and craft sodas.',
            ),
          ),
        ],
      });
    }
    // 🥦 a vegetarian dish
    const vegDish = mains.find((dish) => dish.s === 'Végétarien');
    const meatDish = kit.randomItem(
      mains.filter((dish) => dish.s === 'De la terre'),
      random,
    );
    if (vegDish && meatDish)
      pool.push({
        id: 'veg',
        line: both('Il y a un plat végétarien ?', 'Is there a vegetarian main?'),
        choices: [
          choice(
            'best',
            both(`Oui : « ${kit.dishName(vegDish).fr} ».`, `Yes: the « ${kit.dishName(vegDish).en} ».`),
            both('Le plat végétarien de la carte.', "The carte's vegetarian main."),
          ),
          choice(
            'danger',
            both(
              `« ${kit.dishName(meatDish).fr} », c'est végétarien.`,
              `The « ${kit.dishName(meatDish).en} » is vegetarian.`,
            ),
            both("Faux : ce plat n'est pas végétarien.", "Wrong: that dish isn't vegetarian."),
          ),
          choice(
            'ok',
            both('Je demande au chef.', "I'll ask the chef."),
            both(
              'La carte a un plat végétarien : connaissez-le.',
              'The carte has a vegetarian main: know it.',
            ),
          ),
        ],
      });
  }
  if (moment === 'before' && child) {
    pool.push({
      id: 'kids',
      line: both('Vous avez un menu enfant ?', 'Do you have a kids’ menu?'),
      choices: [
        choice(
          'best',
          both(
            "Pas de menu enfant à la carte, mais je demande au chef ce qu'il peut te préparer, avec l'accord de tes parents.",
            "There's no kids' menu, but I'll ask the chef what he can make for you, with your parents' OK.",
          ),
          both(
            'Honnête, et on cherche une solution avec la cuisine et les parents.',
            'Honest, and look for a solution with the kitchen and the parents.',
          ),
        ),
        choice(
          'ok',
          both('Regarde la carte avec tes parents.', 'Look at the menu with your parents.'),
          both('Correct, mais proposez une solution.', 'Fine, but offer a solution.'),
        ),
        choice(
          'wrong',
          both("Non, il n'y a rien pour les enfants.", "No, there's nothing for children."),
          both('On ne ferme jamais la porte : on demande au chef.', 'Never close the door: ask the chef.'),
        ),
      ],
    });
    const juice = (kit.menuData().softs || []).find((soft) => /^Jus/.test(soft.n));
    const flavours = juice
      ? String(juice.d || '')
          .split('—')
          .pop()
          .trim()
      : '';
    if (flavours)
      pool.push({
        id: 'juice',
        line: both('Je peux avoir un jus ?', 'Can I have a juice?'),
        choices: [
          choice(
            'best',
            both(
              `Bien sûr, si tes parents sont d'accord : ${flavours.toLowerCase()} ?`,
              `Of course, if your parents agree: ${flavours.toLowerCase()}?`,
            ),
            both(
              'Les parfums des jus Alain Milliat, et l’accord des parents.',
              'The Alain Milliat flavours, and the parents’ OK.',
            ),
          ),
          choice(
            'ok',
            both('Oui, je t’apporte un jus.', "Yes, I'll bring you a juice."),
            both('Proposez les parfums.', 'Offer the flavours.'),
          ),
          choice(
            'wrong',
            both('Un Coca ?', 'A Coke?'),
            both(
              'Pas de Coca à la carte : Le Cola Gaston, un soft artisanal.',
              'No Coke on the menu: Le Cola Gaston, a craft soda.',
            ),
          ),
        ],
      });
  }
  if (moment === 'during') {
    // 🥖 more bread (adult or child)
    pool.push({
      id: 'bread',
      line: who(
        guest,
        'Je peux avoir un peu plus de pain ?',
        'Could I have a little more bread?',
        'Encore du pain, s’il vous plaît !',
        'More bread, please!',
      ),
      choices: [
        choice(
          'best',
          child
            ? both('Bien sûr, je t’en apporte tout de suite !', "Of course, I'll bring you some right away!")
            : both(
                'Bien sûr, je vous en apporte tout de suite.',
                "Of course, I'll bring you some right away.",
              ),
          both('Une petite demande se fait tout de suite.', 'A small request is done right away.'),
        ),
        choice(
          'ok',
          both("Oui, dès que j'ai un moment.", 'Yes, as soon as I have a moment.'),
          both('Ne faites pas attendre pour du pain.', "Don't make them wait for bread."),
        ),
        choice(
          'wrong',
          both('Vous allez avoir le ventre plein !', "You'll be too full!"),
          both('On ne commente jamais ce que mange un client.', 'Never comment on what a guest eats.'),
        ),
      ],
    });
    if (child)
      pool.push({
        id: 'fork',
        line: both("J'ai fait tomber ma fourchette !", 'I dropped my fork!'),
        choices: [
          choice(
            'best',
            both(
              'Pas de souci, je t’en apporte une propre tout de suite.',
              "No problem, I'll bring you a clean one right away.",
            ),
            both('Couvert propre, tout de suite, avec le sourire.', 'A clean one, right away, with a smile.'),
          ),
          choice(
            'ok',
            both('Je reviens dans un moment.', "I'll be back in a moment."),
            both('Un couvert tombé se remplace tout de suite.', 'A dropped fork is replaced right away.'),
          ),
          choice(
            'wrong',
            both('Ramasse-la, ça ira.', "Pick it up, it'll be fine."),
            both('Jamais : un couvert tombé est remplacé.', 'Never: a dropped fork is replaced.'),
          ),
        ],
      });
    if (!child && meta.wine) {
      const other = kit.randomItem(
        (kit.menuData().wines || []).filter((wine) => wine.r !== meta.wine.r),
        random,
      );
      const region = regionOf(meta.wine);
      pool.push({
        id: 'origin',
        line: both("Il vient d'où, ce vin ?", 'Where is this wine from?'),
        choices: [
          choice(
            'best',
            both(
              `C'est ${meta.wine.w}, ${region.fr}, appellation ${meta.wine.a}, millésime ${meta.wine.v}.`,
              `It's ${meta.wine.w}, ${region.en}, ${meta.wine.a}, ${meta.wine.v} vintage.`,
            ),
            both(
              'Le domaine, la région, l’appellation, le millésime.',
              'The estate, the region, the appellation, the vintage.',
            ),
          ),
          choice(
            'ok',
            both('Un vin français, je crois.', 'A French wine, I think.'),
            both('Vous devez connaître les vins au verre.', 'You should know the wines by the glass.'),
          ),
          other
            ? choice(
                'wrong',
                both(`C'est ${regionOf(other).fr}.`, `It's ${regionOf(other).en}.`),
                both(`Non : ${region.fr}.`, `No: ${region.en}.`),
              )
            : choice(
                'wrong',
                both("Aucune idée, c'est le bar qui choisit.", 'No idea, the bar chooses.'),
                both("C'est vous qui servez le vin : connaissez-le.", 'You serve the wine: know it.'),
              ),
        ],
      });
    }
    if (!child && meta.mainDish && meta.mainDish.d) {
      const dish = meta.mainDish;
      const codes = kit.allergenCodes(dish);
      const other = kit.randomItem(
        dinner.filter((entry) => entry.n !== dish.n && entry.d),
        random,
      );
      pool.push({
        id: 'dish',
        line: both("Qu'est-ce qu'il y a dans ce plat ?", "What's in this dish?"),
        choices: [
          choice(
            'best',
            both(
              `« ${kit.dishName(dish).fr} » : ${dish.d}.` +
                (codes.length ? ` Il contient ${kit.labelsOf(codes).fr}.` : ''),
              `The « ${kit.dishName(dish).en} »: ${dish.en || dish.d}.` +
                (codes.length ? ` It contains ${kit.labelsOf(codes).en}.` : ''),
            ),
            both(
              'La description de la carte, et ses allergènes.',
              'The menu description, and its allergens.',
            ),
          ),
          choice(
            'ok',
            both('Plein de bonnes choses, goûtez !', 'Lots of good things, taste it!'),
            both('Trop vague : décrivez le plat.', 'Too vague: describe the dish.'),
          ),
          other
            ? choice(
                'wrong',
                both(`${other.d}.`, `${other.en || other.d}.`),
                both("C'est la description d'un autre plat.", "That's another dish's description."),
              )
            : choice(
                'wrong',
                both('Je ne sais pas, je ne goûte jamais.', 'No idea, I never taste.'),
                both('Connaissez la carte.', 'Know the carte.'),
              ),
        ],
      });
    }
  }
  if (moment === 'after' && !child) {
    pool.push({
      id: 'split',
      line: both('On pourra payer séparément ?', 'Can we pay separately?'),
      choices: [
        choice(
          'best',
          both(
            "Bien sûr, je prépare l'addition comme vous le souhaitez.",
            "Of course, I'll split the bill as you like.",
          ),
          both('On s’adapte au client.', 'Adapt to the guest.'),
        ),
        choice(
          'ok',
          both("Ce sera compliqué, mais j'essaie.", "It'll be tricky, but I'll try."),
          both('Pas compliqué : dites oui simplement.', 'Not tricky: just say yes.'),
        ),
        choice(
          'wrong',
          both('Non, une seule addition par table.', 'No, one bill per table.'),
          both('On peut toujours partager une addition.', 'A bill can always be split.'),
        ),
      ],
    });
    const dessert = kit.randomItem(
      kit.dessertDishes().filter((dish) => kit.allergenCodes(dish).length),
      random,
    );
    if (dessert) {
      const labels = kit.labelsOf(kit.allergenCodes(dessert));
      pool.push({
        id: 'sweet',
        line: both(
          `Dans le dessert « ${kit.dishName(dessert).fr} », il y a quels allergènes ?`,
          `What allergens are in the « ${kit.dishName(dessert).en} »?`,
        ),
        choices: [
          choice(
            'best',
            both(
              `D'après notre fiche : ${labels.fr}. Je le confirme avec la cuisine.`,
              `According to our chart: ${labels.en}. I'll confirm with the kitchen.`,
            ),
            both(
              'La fiche allergènes, confirmée en cuisine.',
              'The allergen chart, confirmed with the kitchen.',
            ),
          ),
          choice(
            'ok',
            both('Je demande en cuisine.', "I'll ask the kitchen."),
            both('Prudent, mais la fiche le dit déjà.', 'Careful, but the chart already says.'),
          ),
          choice(
            'danger',
            both("Aucun, c'est un dessert léger.", "None, it's a light dessert."),
            both(`Danger : il contient ${labels.fr}.`, `Danger: it contains ${labels.en}.`),
          ),
        ],
      });
    }
    pool.push({
      id: 'loo',
      line: both('Les toilettes, s’il vous plaît ?', 'Where are the restrooms, please?'),
      choices: [
        choice(
          'best',
          both('Je vous accompagne, c’est par ici.', "I'll show you, it's this way."),
          both('On accompagne le client.', 'Walk the guest there.'),
        ),
        choice(
          'ok',
          both('Au fond, vous trouverez.', "At the back, you'll find them."),
          both('Mieux : accompagnez le client.', 'Better: walk the guest there.'),
        ),
        choice(
          'wrong',
          both("Il n'y en a pas au restaurant.", "There aren't any in the restaurant."),
          both('Faux, et jamais de réponse sèche.', 'Wrong, and never a curt answer.'),
        ),
      ],
    });
  }
  if (moment === 'after' && child) {
    if (booking.occasion === 'birthday')
      pool.push({
        id: 'cake',
        line: both("C'est quand le gâteau avec la bougie ?", "When's the cake with the candle?"),
        choices: [
          choice(
            'best',
            both(
              'Bientôt, avec le dessert ! Chut, c’est une surprise.',
              "Soon, with dessert! Shh, it's a surprise.",
            ),
            both('On garde la surprise, avec complicité.', 'Keep the surprise, with a wink.'),
          ),
          choice(
            'ok',
            both('Demande à tes parents.', 'Ask your parents.'),
            both('Gardez la surprise vous-même.', 'Keep the surprise yourself.'),
          ),
          choice(
            'wrong',
            both("Il n'y a pas de gâteau.", "There's no cake."),
            both("Vous gâchez l'anniversaire !", "You're spoiling the birthday!"),
          ),
        ],
      });
    pool.push({
      id: 'ice',
      line: both('Je peux avoir une glace ?', 'Can I have an ice cream?'),
      choices: [
        choice(
          'best',
          both(
            'Je regarde avec le chef ce qu’on a ce soir, et je demande à tes parents.',
            "I'll check with the chef what we have tonight, and ask your parents.",
          ),
          both('La cuisine et les parents décident ensemble.', 'The kitchen and the parents decide.'),
        ),
        choice(
          'ok',
          both('Peut-être plus tard.', 'Maybe later.'),
          both('Donnez une vraie réponse.', 'Give a real answer.'),
        ),
        choice(
          'wrong',
          both('Non.', 'No.'),
          both(
            'Jamais de réponse sèche, surtout à un enfant.',
            'Never a curt answer, especially to a child.',
          ),
        ),
      ],
    });
  }
  return pool;
}

/**
 * `buildInterruptions` - Function 🙋
 *
 * 1 to 3 interruptions per table (none for one guest), seeded from the booking: every phone builds the same.
 *
 * @param { object } booking - the booking
 * @param { Array<object> } steps - the table's steps (with `steps.meta`)
 * @param { Array<object> } guests - the party (see sim.js `partyGuests`)
 * @returns { Array<{at: number, guest: number, id: string, line: object, choices: Array<object>}> } - by step index
 */
export function buildInterruptions(booking, steps, guests) {
  if (!guests || guests.length < 2) return [];
  const random = kit.makeRandom(((booking.seed * 7 + 13) % 2147483646) + 1);
  const eligible = steps
    .map((step, index) => ({ index, moment: INTERRUPT_PHASES[baseKey(step.key)] }))
    .filter((entry) => entry.moment);
  const count = Math.min(eligible.length, kit.randomInt(1, 3, random));
  const chosen = kit
    .shuffle(eligible, random)
    .slice(0, count)
    .sort((left, right) => left.index - right.index);
  const used = [];
  const list = [];
  chosen.forEach((slot) => {
    const guest = guests[kit.randomInt(1, guests.length - 1, random)];
    const pool = interruptionPool(slot.moment, guest, booking, steps.meta || {}, random).filter(
      (entry) => !used.includes(entry.id),
    );
    const picked = kit.randomItem(pool, random);
    if (!picked) return;
    used.push(picked.id);
    list.push({
      at: slot.index,
      guest: guest.index,
      id: picked.id,
      line: picked.line,
      choices: kit.shuffle(picked.choices, random),
    });
  });
  return list;
}

// ===== QUESTIONS ❓ ===== //

/**
 * `questionText` - Function ❓
 *
 * @param { string } id - a question id
 * @returns { {fr: string, en: string} } - the question, as the waiter asks it
 */
export function questionText(id) {
  const entry = QUESTIONS.find((question) => question[0] === id);
  return entry ? kit.both(entry[2], entry[3]) : kit.both('…', '…');
}

/**
 * `isQuestionId` - Function 🛡️
 *
 * @param { string } id - a 2-letter id (from the network)
 * @returns { boolean } - true when it is a known question
 */
export function isQuestionId(id) {
  return QUESTIONS.some((question) => question[0] === id);
}

/**
 * `questionsFor` - Function 📋
 *
 * The questions offered now: the current phase's, then the ones of the phases just before and after
 * (so the waiter can still ask at the wrong moment, and learn from it).
 *
 * @param { string } nextKey - the key of the table's next step ('' when done)
 * @returns { Array<{id: string, text: object, now: boolean}> } - the questions, the well-timed ones first
 */
export function questionsFor(nextKey) {
  const phase = phaseOf(nextKey);
  const position = PHASE_ORDER.indexOf(phase);
  const nearby = PHASE_ORDER.filter((name, index) => Math.abs(index - position) <= 1 || position < 0);
  const keys = nearby.flatMap((name) => PHASES[name]);
  const base = baseKey(nextKey);
  return QUESTIONS.filter((question) => question[1].some((key) => keys.includes(key)))
    .map((question) => ({
      id: question[0],
      text: kit.both(question[2], question[3]),
      now: question[1].includes(base),
    }))
    .sort((left, right) => Number(right.now) - Number(left.now));
}

/**
 * `roomOf` - Function 🛏️
 *
 * @param { object } booking - a hotel guest's booking
 * @returns { number } - a fictional room number, the same on every phone
 */
export function roomOf(booking) {
  return 101 + (booking.seed % 5) * 100 + (booking.seed % 29);
}

/**
 * `replyFor` - Function 💬
 *
 * @param { string } id - a question id
 * @param { object } guest - the guest asked { index, kind, name }
 * @param { object } booking - the booking
 * @param { object } meta - what the table orders (steps.meta)
 * @returns { {line: object, childWrong?: object} } - the guest's reply (and the feedback when it can't go to a child)
 */
function replyFor(id, guest, booking, meta) {
  const both = kit.both;
  const booker = guest.index === 0;
  const child = guest.kind === 'c';
  const title = kit.guestTitle(booking);
  if (id === 'nm')
    return {
      line: booker
        ? both(`Au nom de ${booking.last}.`, `Under ${booking.last}.`)
        : who(
            guest,
            `C'est au nom de ${title.fr}.`,
            `It's under ${title.en}.`,
            `C'est au nom de ${booking.last} !`,
            `It's under ${booking.last}!`,
          ),
    };
  if (id === 'cv')
    return {
      line: who(
        guest,
        booking.covers > 1 ? `Nous sommes ${booking.covers}.` : 'Je suis seul ce soir.',
        booking.covers > 1 ? `There are ${booking.covers} of us.` : 'Just me tonight.',
        `On est ${booking.covers} !`,
        `We're ${booking.covers}!`,
      ),
    };
  if (id === 'al') {
    if (booker) return { line: kit.allergyLine(booking) };
    const own = guest.index === 1 ? booking.allergies.filter((allergy) => allergy.who === 'friend') : [];
    if (own.length) {
      const entry = kit.allergyOf(own[0].id);
      return {
        line: both(
          `Oui, je suis ${entry.intolerance ? (guest.kind === 'f' ? 'intolérante' : 'intolérant') : 'allergique'} ${entry.fr}.`,
          `Yes, I'm ${entry.intolerance ? 'intolerant to' : 'allergic to'} ${entry.en}.`,
        ),
      };
    }
    return { line: who(guest, 'Non, rien pour moi, merci.', 'No, nothing for me, thanks.', 'Non !', 'No!') };
  }
  if (id === 'wa') {
    const lines = {
      still: both("De l'eau plate, s'il vous plaît.", 'Still water, please.'),
      sparkling: both('De la pétillante, merci.', 'Sparkling, thanks.'),
      carafe: both("Une carafe d'eau, ce sera parfait.", 'A carafe of water will be perfect.'),
    };
    return { line: child ? both("Oui, de l'eau !", 'Yes, water!') : lines[meta.waterKind] || lines.carafe };
  }
  if (id === 'ap') {
    if (child)
      return {
        line: both('Je suis trop petit ! Un jus plutôt.', "I'm too little! A juice instead."),
        childWrong: both(
          "Pas d'apéritif pour un enfant : proposez un jus.",
          'No aperitif for a child: offer a juice.',
        ),
      };
    if (meta.aperitif === 'cocktail' && meta.cocktail)
      return { line: both(`Volontiers, un ${meta.cocktail.n}.`, `Yes please, a ${meta.cocktail.n}.`) };
    if (meta.champagne)
      return {
        line: both(
          `Avec plaisir, une coupe de ${meta.champagne.n}.`,
          `With pleasure, a glass of ${meta.champagne.n}.`,
        ),
      };
    return { line: both('Pas ce soir, merci.', 'Not tonight, thanks.') };
  }
  if (id === 'oc') {
    if (booking.occasion === 'birthday')
      return {
        line: booker
          ? both("Oui, c'est mon anniversaire !", "Yes, it's my birthday!")
          : both(`Oui, c'est l'anniversaire de ${booking.first} !`, `Yes, it's ${booking.first}'s birthday!`),
      };
    if (booking.occasion === 'anniversary')
      return { line: both('Notre anniversaire de mariage.', 'Our wedding anniversary.') };
    if (booking.occasion === 'business') return { line: both("Un dîner d'affaires.", 'A business dinner.') };
    return { line: both("Non, juste le plaisir d'un bon dîner.", 'No, just the pleasure of a good dinner.') };
  }
  if (id === 'ok')
    return {
      line: who(
        guest,
        "Parfait, merci, c'est délicieux !",
        "Perfect, thanks, it's delicious!",
        'Trop bon !',
        'So good!',
      ),
    };
  if (id === 'wi') {
    if (child)
      return {
        line: both('Je ne bois pas de vin !', "I don't drink wine!"),
        childWrong: both('Jamais de vin pour un enfant.', 'Never wine for a child.'),
      };
    return {
      line: meta.wine
        ? both('Volontiers, un petit peu.', 'Yes please, just a little.')
        : both('Non merci, je ne prends pas de vin.', "No thanks, I'm not having wine."),
    };
  }
  if (id === 'br') return { line: who(guest, 'Oui, avec plaisir !', 'Yes, with pleasure!', 'Oui !', 'Yes!') };
  if (id === 'de')
    return {
      line: who(
        guest,
        "Volontiers, qu'est-ce que vous avez ?",
        'Yes please, what do you have?',
        'Ouiii !',
        'Yesss!',
      ),
    };
  if (id === 'co') {
    if (child)
      return {
        line: both('Non merci !', 'No thanks!'),
        childWrong: both(
          'Pas de café pour un enfant : proposez un jus.',
          'No coffee for a child: offer a juice.',
        ),
      };
    if (meta.coffeeKind === 'digestif' && meta.digestif)
      return { line: both(`Plutôt un ${meta.digestif.n}.`, `A ${meta.digestif.n} instead.`) };
    return {
      line: both(
        `Un ${String(meta.coffee || 'expresso').toLowerCase()}, s'il vous plaît.`,
        'A coffee, please.',
      ),
    };
  }
  if (id === 'bi') return { line: both('Oui, merci.', 'Yes, thank you.') };
  if (id === 'hc')
    return {
      line: booking.hotel
        ? both(`Oui, chambre ${roomOf(booking)}.`, `Yes, room ${roomOf(booking)}.`)
        : both("Non, nous ne sommes pas à l'hôtel.", "No, we're not staying at the hotel."),
    };
  return { line: both('Pardon ?', 'Sorry?') };
}

/**
 * `askQuestion` - Function ❓
 *
 * The guest's reply and the waiter's score: 2 points when well timed, +5 for the allergy question asked before
 * the order (once), a gentle 0 when it's not the moment, already asked, or not for a child.
 *
 * @param { object } options - { booking, meta, guest, id, nextKey, orderIndex, nextIndex, asked: [{ guest, id }] }
 * @returns { {line: object, points: number, grade: string, feedback: object} } - the reply and the score
 */
export function askQuestion(options) {
  const both = kit.both;
  const entry = QUESTIONS.find((question) => question[0] === options.id);
  const reply = replyFor(options.id, options.guest, options.booking, options.meta || {});
  if (!entry)
    return {
      line: reply.line,
      points: 0,
      grade: 'none',
      feedback: both('Question inconnue.', 'Unknown question.'),
    };
  if (reply.childWrong) return { line: reply.line, points: 0, grade: 'none', feedback: reply.childWrong };
  const again = (options.asked || []).some(
    (asked) => asked.id === options.id && asked.guest === options.guest.index,
  );
  if (again)
    return {
      line: reply.line,
      points: 0,
      grade: 'none',
      feedback: both('Déjà demandé à ce client.', 'Already asked this guest.'),
    };
  if (!entry[1].includes(baseKey(options.nextKey)))
    return {
      line: reply.line,
      points: 0,
      grade: 'none',
      feedback: both(
        'Pas vraiment le moment pour cette question.',
        'Not really the moment for that question.',
      ),
    };
  // 🩺 the allergy question before the order: the bonus, once per table
  const allergyBonus =
    options.id === 'al' &&
    options.nextIndex <= options.orderIndex &&
    !(options.asked || []).some((asked) => asked.id === 'al');
  return {
    line: reply.line,
    points: allergyBonus ? 7 : 2,
    grade: 'best',
    feedback: allergyBonus
      ? both('Les allergies avant la commande : bonus !', 'Allergies before the order: bonus!')
      : both('Bon moment pour demander.', 'Good moment to ask.'),
  };
}
