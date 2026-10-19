/*
 * @license MIT
 * ~~~~~~~~~~~~
 * sofitel-service-lestroisforts
 * ~~~~~~~~~~~~
 * Copyright (c) 2026 Abraham Ukachi. The Les Trois Forts Project.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the 'Software'), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 * @project: sofitel-service-lestroisforts
 * @name: Les Trois Forts - English Strings & Info Notes
 * @file: pwa/i18n.js
 * @type: JavaScript (data)
 * @authors: Abraham Ukachi <abrahamukachi@gmail.com>
 *
 * Example usage:
 *   1+|> (index.html) script src="i18n.js"  ->  window.LTF_EN, window.LTF_INFO
 *    -|>
 *
 */

/*
 * !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
 * MOTTO: We'll always do more 😜!!!
 * !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
 */

// Les Trois Forts — English layer + "ⓘ" guest-talk notes.
// Translations of the real menu wording + short, general background a server can say.
// Background notes are general knowledge about the dish style / appellation / house — never prices or recipes (those live in data.js).
window.LTF_EN = {
  // ---------- words & short phrases ----------
  words: {
    'Amuse-bouche': 'Amuse-bouche',
    Végétarien: 'Vegetarian',
    'Entrée dégustation': 'Tasting starter',
    Poisson: 'Fish',
    Viande: 'Meat',
    'Dessert dégustation': 'Tasting dessert',
    Entrée: 'Starter',
    Plat: 'Main course',
    Dessert: 'Dessert',
    'Pour commencer': 'To start',
    Entrées: 'Starters',
    'De la mer': 'From the sea',
    'De la terre': 'From the land',
    Fromages: 'Cheeses',
    Desserts: 'Desserts',
    Blanc: 'White',
    Rosé: 'Rosé',
    Rouge: 'Red',
    Provence: 'Provence',
    Rhône: 'Rhône',
    Bourgogne: 'Burgundy',
    Loire: 'Loire',
    Bordeaux: 'Bordeaux',
    Corse: 'Corsica',
    Grèce: 'Greece',
    Espagne: 'Spain',
    'Sicile (Italie)': 'Sicily (Italy)',
    'Verre 15 cl (dîner)': 'Glass 15 cl (dinner)',
    'Déjeuner 12 cl | 75 cl': 'Lunch: 12 cl glass | 75 cl bottle',
    'Déjeuner 50 cl': 'Lunch: 50 cl carafe-bottle',
    'Demi-bouteille 50 cl': 'Half bottle 50 cl',
    'Bouteille 75 cl': 'Bottle 75 cl',
    'Coupe 15 cl': 'Glass 15 cl',
    'Brut 75 cl': 'Brut, bottle 75 cl',
    'Blanc de Blancs 75 cl': 'Blanc de Blancs, bottle 75 cl',
    'Rosé 75 cl': 'Rosé, bottle 75 cl',
    'Cuvée Prestige 75 cl': 'Prestige cuvée, bottle 75 cl',
    'Demi-bouteille 37,5 cl': 'Half bottle 37.5 cl',
    'Plat poisson': 'Fish course',
    'Plat viande': 'Meat course',
    Flûte: 'Flute',
    'Verre à vin': 'Wine glass',
    'Verre ballon (gin tonic)': 'Balloon glass (gin & tonic)',
    'Verre old fashioned': 'Old fashioned glass',
    Highball: 'Highball',
    Orange: 'Orange',
    Citron: 'Lemon',
    'Citron, cranberry + paille': 'Lemon, cranberry + straw',
    'Citron + paille': 'Lemon + straw',
    'Paille + citron': 'Straw + lemon',
    '—': '—',
    'Purée de pêche': 'Peach purée',
    'Liqueur de lavande': 'Lavender liqueur',
    Champagne: 'Champagne',
    'Bitter des Basques': 'Bitter des Basques',
    Prosecco: 'Prosecco',
    Perrier: 'Perrier',
    'Gin Juillet': 'Gin Juillet',
    'Liqueur de thym': 'Thyme liqueur',
    Tonic: 'Tonic',
    'Rhum Ambré': 'Amber rum',
    'Crème de framboise': 'Raspberry liqueur (crème de framboise)',
    'Citron vert': 'Lime',
    Angostura: 'Angostura',
    'Jus de cranberry': 'Cranberry juice',
    "Jus d'ananas": 'Pineapple juice',
    "Jus d'orange": 'Orange juice',
    "Fleur d'oranger": 'Orange blossom water',
    'Sirop de canne': 'Cane syrup',
    Eau: 'Water',
    'Thé Notre-Dame de la Garde (Père Blaize)': 'Notre-Dame de la Garde tea (Père Blaize)',
    'Earl Grey': 'Earl Grey',
    Menthe: 'Mint',
    'Maison Ferroni · Aubagne': 'Maison Ferroni · Aubagne',
    'Domaine Lachanenche · Alpes du Sud': 'Domaine Lachanenche · Southern Alps',
    'Liquoristerie de Provence · Var': 'Liquoristerie de Provence · Var',
    'Digestifs classiques (Cognac / Armagnac)': 'Classic digestifs (Cognac / Armagnac)',
    '2 à 3 gouttes': '2 to 3 drops',
  },
  // ---------- dishes (formula dishes; the carte dishes already carry .en in data.js) ----------
  dishes: {
    'Œuf parfait de la Ferme de Trets':
      '"Perfect" slow-cooked egg from the Trets farm, butternut squash and hazelnuts',
    'Tataki de bœuf': 'Beef tataki, cumin and preserved-lemon hummus',
    "Dos de maigre en croûte d'olives":
      'Meagre fillet in an olive crust, Cévennes onions and fennel with pissalat spices',
    'Parmentier de veau': "Veal parmentier (shepherd's-pie style) with olives",
    'Sablé breton': 'Breton shortbread, vanilla cream and red berries',
    'Mousse au chocolat': 'Chocolate mousse, caramel and fleur de sel',
  },
  cocktails: {
    'Bellini Provençal': {
      desc: 'Champagne, fresh peach purée, lavender-flower liqueur',
      method: 'Stir before serving',
    },
    'Spritz de la Maison Château Saint-Martin': {
      desc: 'Prosecco and Bitter des Basques',
      method: 'Fill the glass with ice + orange',
    },
    'Romarin Tonic': {
      desc: 'Gin Juillet, tonic, rosemary liqueur',
      method: 'Fill the glass with ice + lemon',
      note: 'The recipe card says thyme liqueur, the menu says rosemary liqueur — check with the bar',
    },
    'Daïquiri Framboise': {
      desc: 'Amber rum, raspberry liqueur, lime, Angostura',
      method:
        '1. Shake the 3 ingredients with ice. 2. Strain "straight up" (only the liquid goes in the glass, not the shaker ice). 3. Fill the glass with ice + lemon. 4. Add the Angostura on top.',
    },
    "Lueur d'Azur (mocktail)": {
      desc: 'cranberry, pineapple and orange juice',
      method: 'Ice in the glass, add the pre-mix, garnish',
      batch: '1 L bottle',
    },
    'Citronnade Signature': {
      desc: 'lemon & orange blossom',
      method: 'Pre-mix in the shaker with ice, shake, pour over ice',
      batch: '75 cl bottle',
    },
    'Thé glacé maison': {
      desc: 'with Maison Père Blaize (sweet mint & lemongrass)',
      method: 'Shake with ice + peach syrup (to sweeten and add flavour), pour over ice',
      batch: '75 cl of brewed tea',
    },
  },
  softs: {
    'Coupe de French Bloom': 'alcohol-free sparkling, 15 cl',
    'Citronnade Signature': 'lemon & orange blossom',
    'Thé glacé maison': 'Maison Père Blaize, sweet mint & lemongrass',
    'Le Cola Gaston': 'local craft soda, 33 cl',
    'La Limonade Lise': 'local craft soda, 33 cl',
    'Ginger beer': '20 cl (lunch menu)',
    'Jus Alain Milliat': '33 cl — Apricot, Apple, Strawberry, Tomato, Pineapple',
    'Pastis Château des Creissauds 2022': '4 cl',
    'Pastis 51 / Ricard': '4 cl',
    'Bière La Minotte (Blonde ou IPA/Pale Ale)': '33 cl, Marseille brewery (Blonde or IPA/Pale Ale)',
    'San Pellegrino 50 cl': 'sparkling water, 50 cl',
    'San Pellegrino 1 L': 'sparkling water, 1 L',
    'Vittel 50 cl': 'still water, 50 cl',
    'Vittel 1 L': 'still water, 1 L',
    Orezza: 'Corsican sparkling water, 1 L',
    'Saint Georges': 'Corsican still water (lunch menu)',
    Zilia: 'Corsican water, 1 L (dinner menu)',
    Perrier: '33 cl',
  },
  coffee: {
    Expresso: 'Espresso',
    'Double expresso': 'Double espresso',
    Americano: 'Americano',
    Cappuccino: 'Cappuccino',
    Latte: 'Latte',
    'Thé / infusion': 'Tea / herbal tea',
  },
  coffeeNote: 'Illy coffee · Brazil Cerrado Mineiro. Teas & herbal teas by Maison Père Blaize (8 €).',
  teas: {
    'Thé blanc de Chine « Paï mu tan »': ['Chinese white tea "Pai Mu Tan"', 'White peony'],
    'Thé noir Darjeeling Supérieur': ['Darjeeling Superior black tea', 'Black tea'],
    'Tisane du Soir': ['Evening herbal tea', 'Lemongrass, lemon verbena, pale rose, orange buds'],
    'Tisane Notre-Dame de la Garde': [
      'Notre-Dame de la Garde herbal tea',
      'Sweet mint, eucalyptus, peppermint, lemon balm, lemongrass',
    ],
    'Tisane Marseillaise': [
      'Marseille herbal tea',
      'Verbena, star anise, marshmallow root, mallow, liquorice, lavender, rosemary, fennel',
    ],
    'Tisane Forts Saint-Jean': [
      'Fort Saint-Jean herbal tea',
      'Citrus rooibos, ginger, cinnamon, lemon peel, grains of paradise, mace, liquorice',
    ],
    'Tisane Maison Blaise': [
      'Maison Blaize herbal tea',
      'Red-fruit rooibos, pale rose, hibiscus, liquorice, lemon balm, chamomile',
    ],
    'Tisane Forts Saint-Nicolas': [
      'Fort Saint-Nicolas herbal tea',
      'Christmas rooibos, star anise, fennel seed, orange leaf, sweet orange, caraway, cinnamon bark',
    ],
  },
  digestifs: {
    'Eau Verte de Marseille (recette de 1830)': 'minty, lemony liqueur (1830 recipe)',
    'Câlin Polisson': 'creamy calisson liqueur',
    'Liqueur de Mélopépo': 'melon & almond liqueur',
    'Liqueur de menthe': 'mint liqueur',
    'Liqueur de framboise': 'raspberry liqueur',
    'Rhum Miel & Safran': 'honey & saffron rum',
    'Rhum Herbacé': 'herbal rum',
    'Rhum Marseillais': 'Marseille rum',
  },
  pairing: {
    'Susucaru Rosato — Sicile': {
      g: 'Nerello Mascalese, Malvasia, Moscadella, Catarratto',
      t: 'Fresh, mineral rosé; strawberry, raspberry and blood orange',
    },
    'Indigena Blanc — Espagne': {
      g: '100% Grenache Blanc',
      t: 'Citrus and white fruit, elegant and generous',
    },
    'Octave Blanc — Grèce': {
      g: '100% Muscat à Petits Grains',
      t: 'Dry Muscat, mineral and complex, citrus and white flowers, salty finish',
    },
    'Pero Longo Rouge — Corse': {
      g: 'Niellucciu, Sciaccarellu, Grenache',
      t: 'Red fruit, Corsican maquis scrubland and gentle spice',
    },
    'Indigena Rouge — Espagne': { g: '100% Grenache', t: 'Wild red fruit, subtle toasty touches' },
    'Câlin Polisson — Provence': {
      g: 'Liqueur: plant-based cream, Marc de Provence, almond, melon, candied fruit, orange blossom',
      t: 'Sweet and creamy, inspired by the calisson',
    },
  },
  facts: [
    'Weekly lunch formula: 49 € (starter / main / dessert of your choice) — changes every week.',
    'Tasting Menu "Voyage en Méditerranée": 89 €, 4 courses after the amuse-bouche (starter, fish, meat, dessert).',
    'Wine pairing for the Tasting Menu: + 55 €.',
    'The Tasting Menu is for the whole table.',
    'Tasting Menu: served every evening, and at lunch only on weekends and public holidays.',
    'Meat origin: France. Net prices in euros, service and taxes included.',
    'Allergen details available on request — always ask about allergies/intolerances.',
    'Eau de Marseille (tap water) available on request.',
    'Foyot sauce = béarnaise + meat glaze (served with the ribeye).',
  ],
};

// ---------- ⓘ guest-talk notes (English) ----------
window.LTF_INFO = {
  dish: {
    'Œuf parfait de la Ferme de Trets': {
      say: 'A farm egg from Trets, near Aix, slow-cooked at low temperature so the yolk stays runny and the white just set. Served with butternut squash and toasted hazelnuts.',
      words: 'Œuf parfait = egg cooked about 1 h at ~64 °C.',
    },
    'Tataki de bœuf': {
      say: 'Beef seared very quickly on the outside and left rare inside, then sliced thin, Japanese-style. It comes with a cumin hummus brightened with preserved lemon.',
      words: 'Tataki = briefly seared, sliced.',
    },
    "Dos de maigre en croûte d'olives": {
      say: 'Meagre is a firm, mild Mediterranean white fish. The thick fillet is baked under an olive crust, with sweet Cévennes onions and fennel cooked with pissalat spices.',
      words: 'Pissalat = Niçoise anchovy condiment (the base of pissaladière).',
    },
    'Parmentier de veau': {
      say: 'Our take on a French comfort classic: slow-cooked veal under creamy mashed potato, with olives for a Provençal touch.',
      words: "Parmentier = like a shepherd's pie.",
    },
    'Sablé breton': {
      say: 'A buttery, crumbly Breton shortbread topped with vanilla cream and red berries.',
      words: '',
    },
    'Mousse au chocolat': {
      say: 'A classic airy chocolate mousse, with caramel and a pinch of fleur de sel for a salted-caramel finish.',
      words: '',
    },
    'Beignets de fleurs de courgettes': {
      say: 'Courgette flowers fried in a light batter, a summer classic of Provence and Nice. Served with labneh — thick strained yogurt — with mint and cumin.',
      words: 'Labneh = strained yogurt, like a fresh cheese.',
    },
    'Aubergine rafraîchie au citron': {
      say: 'A cool, light vegetable starter: aubergine with lemon and basil, topped with a tartare of diced flat (donut) peaches. Fresh, sweet and tangy.',
      words: "Pêche plate = flat 'donut' peach.",
    },
    'Jambon ibérique Cebo de Campo 36 mois': {
      say: "Spanish Iberian ham cured for 36 months. 'Cebo de Campo' means free-range Iberian pigs fed on pasture and grain. Nutty, melting, perfect to share with a glass.",
      words: 'Contains pork.',
    },
    'Cœur de romaine': {
      say: 'A crisp romaine heart with pastrami of Aubrac beef raised in the Camargue, Provence figs and a honey vinaigrette. Available as a starter or a main.',
      words: 'Aubrac = French cattle breed.',
    },
    'Girolles à la grecque': {
      say: "Chanterelle mushrooms cooked 'à la grecque' — in a light, tangy marinade with olive oil, lemon and spices — with small potatoes and green olives from Les Baux.",
      words: 'À la grecque = cooked in an aromatic lemon-olive oil marinade, served at room temperature.',
    },
    'Crudo de thon rouge': {
      say: 'Raw bluefin tuna, sliced like a crudo, with a fresh cucumber-lemon-ginger condiment and a crispy puffed Camargue rice cracker for crunch.',
      words: 'Crudo = raw, Italian-style. Contains fish.',
    },
    'Bolognaise de calamars': {
      say: 'A seaside twist on Bolognese: the sauce is made with chopped squid instead of meat, served on linguine with a fine garlic-parsley persillade.',
      words: 'Contains seafood (squid) and gluten.',
    },
    "Dos de loup rôti à l'huile de verveine": {
      say: "Roasted fillet of sea bass ('loup' is the Mediterranean name), with lemon-verbena oil, a puffed panisse and a jus of slow-cooked vegetables.",
      words: 'Panisse = Marseille chickpea-flour fritter.',
    },
    'Ajo blanco de Saint-Pierre': {
      say: 'John Dory, a delicate white fish, with ajo blanco — a cold Andalusian almond-and-garlic sauce — plus cherries, fennel and green beans.',
      words: 'Ajo blanco contains almonds (nuts).',
    },
    'Retour de pêche suivant la Criée': {
      say: "The catch of the day, straight from Marseille's fish auction (la Criée). Priced by weight, served with vegetables from Provençal gardens and linguine in parsley butter. Ask the kitchen what came in today.",
      words: 'Priced per 100 g.',
    },
    'Brocolettis rôtis': {
      say: 'Our vegetarian main: roasted broccolini (tender-stem broccoli) with hemp seeds, Greek yogurt and spinach.',
      words: 'Vegetarian — confirm details with the kitchen.',
    },
    'Petits farcis': {
      say: 'A Niçoise and Provençal classic: small vegetables stuffed with lamb and Provençal pork, on a sweet pepper cream with aged olive oil.',
      words: 'Contains pork and lamb.',
    },
    'Entrecôte ribeye (250 g)': {
      say: "A 250 g French ribeye, with a crispy potato 'paillasson' (grated potato cake), a grilled Marmande tomato and Foyot sauce — a béarnaise enriched with meat glaze. Ask for cooking preference.",
      words: 'Foyot = béarnaise + meat glaze.',
    },
    'Poitrine de veau confite et ris de veau': {
      say: 'Slow-confit veal breast with sweetbreads, aubergine and samphire (a salty sea vegetable), plus a tangy cream spiced with vadouvan, a French curry blend.',
      words: 'Ris de veau = veal sweetbreads (thymus). Vadouvan = curry-style spice mix with shallots.',
    },
    'Fromages affinés de Provence de la Maison Lemarié': {
      say: 'A selection of Provençal cheeses aged by Maison Lemarié, cheese affineurs. Good with a red or a white from Provence.',
      words: 'Affiné = matured by an affineur.',
    },
    'Poireau à la tapenade originelle': {
      chef: "A disc of caper tapenade, quail eggs, leek 'tagliatelle', all ringed with a lightly toasted black-olive crumble. Tapenade was first written down in Marseille in 1880 by chef Meynier: this is the 'original' recipe. The name comes from 'tapeno', Provençal for caper. It's the vegetarian starter.",
      serv: 'Check: the quail eggs must be soft-boiled (mollet). Gluten-free dish. Vegan request: without the eggs the dish loses a lot, check with the kitchen.',
      say: 'Leek served with tapenade made the original Provençal way (olives, capers, anchovies), with soft-boiled quail eggs. Vegetarian symbol on the card, but classic tapenade has anchovy: check with the kitchen.',
      words: 'Contains egg; tapenade may contain fish (anchovy).',
    },
    'Crabe bleu': {
      chef: 'Crab meat at the bottom of the bowl, topped with a smoked corn cream made in a siphon: airy and light as foam. Slightly spiced, with herbs.',
      serv: 'Cutlery: add a dessert spoon. Gluten-free, but contains lactose (corn cream). Selling point: generous, tender crab meat, close to brown crab.',
      say: 'Blue crab, an invasive species now caught in the Mediterranean lagoons, served with a smoked sweetcorn cream. Sweet and smoky.',
      words: 'Contains crustaceans (crab), dairy.',
    },
    'Huîtres de Camargue': {
      chef: '3 Camargue oysters, poached (half-cooked, half-raw), lemony fresh cheese, small pieces of crunchy celery. Barely spicy: celery for texture, chilli for a lift. On top, the oyster water made into a foam in a siphon, like sea spray.',
      serv: 'Cutlery: add a dessert spoon. Gluten-free, but contains lactose (fresh cheese).',
      say: 'Oysters from the Camargue, served with a touch of chilli, a lemon condiment and celery.',
      words: 'Contains molluscs (oysters), celery, milk (fresh cheese).',
    },
    'Rouget de roche': {
      chef: 'Tartlet: pâté en croûte at the base, fennel purée, then cuttlefish-ink rouille. On top: red mullet fillets and a crunchy fennel salad. Served cold.',
      serv: "On the staff sheet: 'Fennel tartlet and rock red mullet'. Contains gluten (pastry).",
      say: 'Red mullet from the rocks, on a fennel tartlet, with rouille (the garlicky saffron mayonnaise of bouillabaisse) coloured black with cuttlefish ink.',
      words: 'Contains fish, molluscs (cuttlefish ink), gluten, egg.',
    },
    'Noix de Saint-Jacques marinées à cru': {
      chef: "On the staff sheet: 'Scallop tartare with Corsican clementine'. Thin slices of scallop marinated raw in clementine, grated bottarga, a lemony tagetes (marigold) leaf. Deliberately simple, all about the product.",
      serv: 'Bottarga: a Mediterranean speciality of grey mullet roe sacs, salted, pressed and dried; firm yet melting, intense and briny.',
      say: 'Raw scallops marinated in Corsican clementine, with grated poutargue (bottarga: salted, dried mullet roe from Martigues).',
      words: 'Contains molluscs (scallops), fish (bottarga).',
    },
    'Raviole au foie gras de canard et champignons': {
      serv: 'Cutlery: add a dessert spoon. Contains gluten.',
      chef: 'Served hot in a frothy soy broth. The mushrooms change with what comes in.',
      say: 'A large raviolo filled with duck foie gras and mushrooms, in a frothy soy broth.',
      words: 'Contains gluten, egg, soy; duck foie gras.',
    },
    'Linguines aux palourdes': {
      serv: 'Service: bowl or deep plates + a wet wipe + large spoons. Contains gluten.',
      chef: 'Like linguine alle vongole.',
      say: 'Linguine with clams in a fine persillade (chopped parsley and garlic).',
      words: 'Contains molluscs (clams), gluten.',
    },
    'Noix de Saint-Jacques aux agrumes': {
      chef: '4 to 5 scallops depending on size. Orange sauce: orange reduction, shallot and a little whipped cream. Camargue black rice, parsnip mousseline, Iberian chorizo.',
      serv: 'Service: large cutlery. Note: chorizo (pork), but it can be left out. Contains lactose (orange sauce: cream and shallot). The team expects a best-seller.',
      say: 'Seared scallops with citrus, Camargue black rice, a silky parsnip mousseline and Iberian chorizo.',
      words: 'Contains molluscs (scallops), pork (chorizo), dairy.',
    },
    'Dos de loup au grill': {
      chef: "'Quenelle like a bourride': a fish quenelle and preserved lemon, red Camargue mussels, crunchy celery, bourride sauce (garlic and olive oil, like aioli). No potatoes, gentler on garlic than the classic. Bourride is a traditional Provençal fish stew served with a garlic and olive-oil sauce.",
      serv: 'Service: sauce boat. The sauce comes on the side: pour it at the table. Staff-sheet allergens: gluten, lactose; also mussels and celery, and aioli contains egg.',
      say: 'Grilled thick fillet of sea bass, served like a bourride: the Provençal fish stew bound with aïoli, here with a preserved lemon quenelle.',
      words: 'Contains fish, mussels, gluten, milk, celery, egg (aioli-style sauce).',
    },
    'Retour de pêche suivant la criée': {
      say: 'The catch of the day from the fish auction, sold by weight (14 € per 100 g): we show the whole fish, then serve it with Provençal vegetables and linguine in persillade.',
      words: 'Contains fish, gluten.',
    },
    'Pieds paquets de calamar': {
      chef: "Lamb stuffing (tripe + trotters) inside a squid: present it like stuffed squid. A melting potato in the centre of the plate, fish-soup foam. A 'surf & turf' dish. No pork.",
      serv: "Cutlery: add a large spoon. Sell it as an exceptional surf and turf, even to guests who say they don't like pieds paquets. Never call it bouillabaisse.",
      say: 'A seaside twist on pieds paquets, the Marseille classic of stuffed tripe parcels: here made with squid, under a fish-soup foam.',
      words: 'Contains molluscs (squid), fish.',
    },
    'Pot-au-feu de poulette des Alpilles': {
      chef: 'Grilled thigh in pieces with orzo (rice-shaped pasta), chicken broth. Young hen, not guinea fowl.',
      serv: 'Service: one plate, with the sauce boat of broth poured at the table, + a large spoon.',
      say: 'Pot-au-feu, the French comfort dish of slowly poached meat and vegetables in broth, made with a young hen from the Alpilles.',
      words: 'Contains celery likely (broth): check with the kitchen.',
    },
    'Faux-filet de bœuf maturé': {
      chef: 'Beef aged 1 month, 180 g, little gem braised with bone marrow. (The tasting meat was aged 2 months, judged too strong.)',
      serv: 'Side plate served separately: butternut gnocchi and pumpkin seeds. Warn the guest the beef is aged (stronger flavour).',
      say: 'Dry-aged beef sirloin (strip loin), little gem lettuce braised with bone marrow, and butternut squash gnocchi.',
      words: 'Contains gluten, egg (gnocchi).',
    },
    'Champignons des bois': {
      chef: 'The vegetarian main.',
      serv: 'For a vegan request the kitchen can build on the mushrooms.',
      say: 'The vegetarian main: wild mushrooms with sweet Cévennes onions slow-cooked in sherry vinegar and a crispy potato.',
      words: 'Vegetarian.',
    },
    'Amuse-bouche du jour': {
      say: 'A little bite from the chef to open the tasting menu: a dill meringue with a lemon crémeux, herring roe and mussels. Salty, fresh and airy.',
      words: 'Contains egg, fish (herring roe), molluscs (mussels), dairy.',
    },
    'Saint-Pierre, clémentine': {
      say: 'John Dory with clementine, pickled butternut squash and butternut, an orange gel, tapioca pearls and a pil pil sauce — the Basque emulsion of olive oil, garlic and chilli.',
      words: 'Contains fish.',
    },
    'Paleron de bœuf Angus': {
      say: 'Slow-cooked Angus beef chuck, meltingly tender, with a courgette cream, baby courgettes, courgette pearls and chanterelle mushrooms.',
      words: 'Check dairy in the courgette cream with the kitchen.',
    },
    'Sablé, poire pochée': {
      say: 'The tasting-menu dessert: a buttery shortbread with poached pear, a tonka bean cream and caramel.',
      words: 'Contains gluten, butter/dairy, egg.',
    },
    'Ravioles de Saint-Jacques': {
      say: 'Delicate scallop ravioli with foie gras and shaved truffle, finished with a light soy foam.',
      words: 'Contains shellfish (scallop), gluten, soy; foie gras.',
    },
    'Poire / marrons, comme un mont blanc': {
      chef: 'Meringue, chestnut cream, chestnut crémeux, chestnut pieces, whipped vanilla ganache, pear compote, pear sorbet.',
      serv: 'Cutlery: dessert spoon + fork.',
      say: 'Our take on the Mont Blanc: soft chestnut cake, pear compote, whipped vanilla ganache, chestnut cream and crisp meringue, with a pear sorbet. Gluten-free.',
      words: 'Gluten-free. Contains dairy, egg, chestnut.',
    },
    'Pommes façon tatin, infusion vanille-anis étoilé': {
      chef: 'Olive-oil shortbread confirmed by the pastry chef; star anise and vanilla notes. A big hit at the tasting.',
      serv: 'Cutlery: dessert spoon + fork. At the tasting the ice cream was called vanilla-star anise, the menu says maple syrup: check before service.',
      say: 'Like a tarte tatin: caramelised apples infused with vanilla and star anise, a maple cream, pecan crumble and candied pecans, on an olive oil shortbread, with maple syrup ice cream.',
      words: 'Contains nuts (pecan), gluten, dairy.',
    },
    'Chocolat / sésame noir': {
      chef: 'Cocoa shortcrust, whipped dark chocolate ganache, milk chocolate and black sesame ganache, black sesame praline, chocolate ice cream.',
      serv: 'Cutlery: dessert spoon + fork.',
      say: 'For chocolate lovers: cocoa shortcrust, soft chocolate sponge, milk chocolate ganache, black sesame praline and a dark chocolate bavarois, with chocolate ice cream.',
      words: 'Contains sesame, dairy, gluten, egg.',
    },
    'Pignon de pin, romarin, citron': {
      chef: 'Pine nut shortbread and sponge, pine nut praline, lemon cream, whipped rosemary ganache, lemon confit and lemon gel.',
      serv: 'Cutlery: dessert spoon + fork.',
      say: 'A Provençal dessert: soft pine nut sponge, pine nut praline, a light rosemary cream and lemon confit. Fresh and herby.',
      words: 'Contains nuts (pine nuts), dairy, gluten, egg.',
    },
    'Éclipse de pavlova': {
      say: 'Our pavlova: crisp meringue with whipped vanilla ganache and a red-berry confit. Light and fruity.',
      words: 'Contains egg.',
    },
    'Chouquette glacée': {
      say: 'A play on the chouquette, the little choux puff with pearl sugar — here served iced, with hazelnut and vanilla.',
      words: 'Contains nuts (hazelnut).',
    },
    Agrumes: {
      say: 'Our freshest dessert: citrus fruits with dates, a rosewater granita and orange blossom. Light, perfumed, not too sweet.',
      words: '',
    },
    'Soufflé au chocolat Ariaga': {
      say: 'A hot chocolate soufflé made with Ariaga chocolate, with cocoa nibs and dulce de leche ice cream with fleur de sel. Baked to order, so it takes a little time.',
      words: 'Confiture de lait = dulce de leche.',
    },
  },
  cocktail: {
    'Bellini Provençal':
      'A Provençal twist on the Venetian Bellini: Champagne with fresh peach purée and a touch of lavender-flower liqueur. Fruity, floral and festive.',
    'Spritz de la Maison Château Saint-Martin':
      'Our house spritz: Prosecco and Bitter des Basques, a French aperitif bitter, topped with Perrier and orange. Bittersweet and refreshing.',
    'Romarin Tonic':
      'Our herbal gin & tonic, made with Gin Juillet from Maison Ferroni in Aubagne, just next to Marseille, plus a herb liqueur and tonic. Fresh and aromatic.',
    'Daïquiri Framboise':
      'A raspberry daiquiri: amber rum, raspberry liqueur and lime, finished with a few drops of Angostura bitters. Fruity and tangy.',
    "Lueur d'Azur (mocktail)":
      'Alcohol-free: cranberry, pineapple and orange juice over ice. Fruity and colourful.',
    'Citronnade Signature':
      'Our homemade lemonade with lemon and a hint of orange blossom, a very Provençal touch. No alcohol.',
    'Thé glacé maison':
      "Homemade iced tea made with Maison Père Blaize teas, Marseille's historic herbalist, with sweet mint and lemongrass. No alcohol.",
  },
  soft: {
    'Coupe de French Bloom':
      "A French alcohol-free sparkling wine, a nice option for guests who don't drink but want to celebrate.",
    'Le Cola Gaston': 'A craft cola made locally, a nice alternative to the big brands.',
    'La Limonade Lise': 'A local craft lemonade (sparkling).',
    'Jus Alain Milliat':
      'Premium French juices and nectars from Alain Milliat, made from carefully selected fruit. Ask which flavour: apricot, apple, strawberry, tomato or pineapple.',
    'Pastis Château des Creissauds 2022':
      'A craft pastis from a Provence estate near Aubagne. The anise aperitif of Marseille, served with fresh water to dilute.',
    'Pastis 51 / Ricard':
      'The classic Marseille aperitif: anise spirit you dilute with cold water (about 5 parts water).',
    'Bière La Minotte (Blonde ou IPA/Pale Ale)':
      'A craft beer from a Marseille brewery, blonde or IPA/pale ale.',
    Orezza: 'Naturally sparkling mineral water from Corsica, lightly fizzy and iron-rich.',
    'Saint Georges': 'A still mineral water from Corsica.',
    Zilia: 'A mineral water from Corsica (Balagne).',
    'Ginger beer': 'A non-alcoholic, spicy ginger soda.',
    'San Pellegrino 50 cl': 'Italian sparkling mineral water, fine bubbles.',
    'San Pellegrino 1 L': 'Italian sparkling mineral water, fine bubbles.',
    'Vittel 50 cl': 'French still mineral water from the Vosges.',
    'Vittel 1 L': 'French still mineral water from the Vosges.',
    Perrier: 'French sparkling water from the south of France (near Nîmes), strong bubbles.',
  },
  tea: {
    'Thé blanc de Chine « Paï mu tan »':
      'A delicate Chinese white tea made from young buds and leaves; soft, floral and low in bitterness.',
    'Thé noir Darjeeling Supérieur':
      "A classic black tea from the Himalayan foothills of India; light, fragrant, sometimes called the 'champagne of teas'.",
    'Tisane du Soir':
      'A caffeine-free evening blend, lemony and floral (lemongrass, lemon verbena, rose, orange buds). Ideal after dinner.',
    'Tisane Notre-Dame de la Garde':
      "Caffeine-free, very minty and refreshing, named after Marseille's hilltop basilica.",
    'Tisane Marseillaise':
      'Caffeine-free and very Provençal: verbena, star anise, lavender, rosemary and fennel.',
    'Tisane Forts Saint-Jean':
      'Caffeine-free rooibos with citrus, ginger and warm spices; named after the fort at the entrance of the Vieux-Port.',
    'Tisane Maison Blaise': 'Caffeine-free red-fruit rooibos with rose and hibiscus; fruity and gentle.',
    'Tisane Forts Saint-Nicolas':
      "Caffeine-free 'Christmas' rooibos with orange, star anise and cinnamon; named after the fort facing Fort Saint-Jean.",
  },
  coffee: 'Illy coffee, a Brazil Cerrado Mineiro single origin: smooth, with chocolate and nutty notes.',
  digestif: {
    'Gin Juillet de Provence':
      'A Provençal gin from Maison Ferroni, a craft distillery in Aubagne, just outside Marseille.',
    'Roof Rye Whisky': 'A rye whisky from Maison Ferroni in Aubagne.',
    'Rhum Marseillais':
      "A rum from Maison Ferroni in Aubagne, a nod to Marseille's history as a spice and rum port.",
    'Rhum Miel & Safran': 'A Maison Ferroni rum with honey and saffron; warm and gently sweet.',
    'Rhum Herbacé': 'A herbal rum from Maison Ferroni in Aubagne.',
    'Eau Verte de Marseille (recette de 1830)':
      'A historic Marseille liqueur revived by Maison Ferroni from an 1830 recipe; minty and lemony, very digestive.',
    'Liqueur de menthe':
      'A mint liqueur from Domaine Lachanenche, a small producer in the Southern Alps working with mountain plants and fruit.',
    Limoncello: 'A lemon liqueur from Domaine Lachanenche in the Southern Alps. Served chilled.',
    'Liqueur de framboise': 'A raspberry liqueur from Domaine Lachanenche in the Southern Alps.',
    'Câlin Polisson':
      'A creamy liqueur inspired by the calisson, the almond-and-melon sweet from Aix-en-Provence. Also the dessert pairing of the Tasting Menu.',
    'Liqueur de Mélopépo': 'A melon-and-almond liqueur from the Var — the flavours of the calisson.',
    'Cognac Rémy Martin VSOP':
      'A classic VSOP Cognac (brandy aged at least 4 years) from the famous house Rémy Martin.',
    'Armagnac Château de Laubade VSOP':
      "A VSOP Armagnac, Gascony's brandy, from Château de Laubade; a bit more rustic and rich than Cognac.",
  },
  champagne: {
    Pommery: 'Pommery, a historic Reims house; Apanage is its fresh, elegant brut.',
    Taittinger: 'Taittinger, a family-run Reims house known for Chardonnay-led, elegant champagnes.',
    'Billecart-Salmon':
      'Billecart-Salmon, a family house in Mareuil-sur-Aÿ, known for fine, precise champagnes — its rosé is especially famous.',
    'Perrier-Jouët':
      'Perrier-Jouët, an Épernay house known for floral, Chardonnay-driven style; Belle Époque is its iconic prestige cuvée with the anemone bottle.',
    Hostomme:
      'Hostomme, a family grower in the Côte des Blancs; this Grand Cru Blanc de Blancs is 100% Chardonnay.',
    Ruinart:
      'Ruinart, the oldest established champagne house (1729); its Blanc de Blancs is 100% Chardonnay, fresh and citrusy.',
    Deutz: 'Deutz, a house in Aÿ; Amour de Deutz is its prestige Blanc de Blancs.',
    'Joseph Perrier':
      'Joseph Perrier, a family house in Châlons-en-Champagne; Esprit Victoria is a vintage prestige cuvée, here an extra brut Blanc de Blancs from 2010.',
  },
  champagneTerms: {
    'Blanc de Blancs': 'Blanc de Blancs = 100% white grapes (Chardonnay): fresh and elegant.',
    Rosé: 'Rosé champagne: red-fruit notes, great as an aperitif or with dessert.',
    Brut: 'Brut = dry.',
    Prestige: "Prestige cuvée = the house's top wine.",
    'Extra Brut': 'Extra Brut = very dry, almost no added sugar.',
  },
  // wine notes by appellation (general, grapes = typical for the appellation)
  wineApp: {
    "Coteaux d'Aix-en-Provence":
      'Appellation around Aix-en-Provence, 30 min from here. Sunny Mediterranean style: reds from Grenache, Syrah, Cabernet; whites often Vermentino (Rolle); pale, dry rosés.',
    'IGP des Alpilles':
      'From the Alpilles hills near Les Baux-de-Provence. The IGP label gives freedom to blend grapes; a sunny, aromatic Provençal style.',
    'AOP des Baux-de-Provence':
      'Small appellation in the Alpilles around Les Baux, known for organic and biodynamic farming.',
    Vacqueyras: 'Southern Rhône village near Gigondas. Whites are rare: round, floral, generous.',
    'Côtes de Provence':
      "Provence's biggest appellation, famous worldwide for its pale, dry, elegant rosés (Grenache, Cinsault). Reds and whites are sunny and aromatic.",
    'Côtes de Provence Cru Classé':
      "A Côtes de Provence 'Cru Classé' — one of the historic estates classified in 1955.",
    'Côtes de Provence · Île de Porquerolles':
      'From the island of Porquerolles off Hyères: vines surrounded by sea, giving fresh, saline wines.',
    Cassis:
      'Tiny appellation in the fishing village of Cassis, between Marseille and La Ciotat. Famous for whites (Marsanne, Clairette) — the classic wine with fish and bouillabaisse.',
    Bellet:
      "One of France's smallest appellations, in the hills above Nice. Rare wines: reds from Braquet and Folle Noire, whites from Rolle.",
    Palette:
      'Tiny appellation just outside Aix-en-Provence, on limestone; age-worthy wines with real character.',
    Bandol:
      "Coastal appellation 40 min east of Marseille. Reds are mostly Mourvèdre: deep, spicy, made to age. Bandol rosés and whites are among Provence's finest.",
    'Beaune 1er Cru':
      'Premier Cru vineyards around Beaune, heart of Burgundy. Pinot Noir for reds, Chardonnay for whites: elegant and refined.',
    'Île de Samos':
      'From the Greek island of Samos, historic home of Muscat. Here a dry Muscat à Petits Grains: floral, mineral, salty finish.',
    'AOP Penedès':
      'From Penedès in Catalonia, near Barcelona. The Indigena wines are 100% Grenache (Garnacha), white or red.',
    'Crozes-Hermitage':
      'Northern Rhône. Reds are Syrah: dark fruit, pepper, supple. Whites are Marsanne and Roussanne: round and floral.',
    Sancerre:
      'Loire Valley. White Sancerre is Sauvignon Blanc: crisp, citrusy, mineral. Red Sancerre is a light Pinot Noir.',
    Chablis:
      'Northern Burgundy. 100% Chardonnay, crisp and mineral, usually little or no new oak — classic with oysters and seafood.',
    'Chablis 1er Cru Montmains':
      'Chablis Premier Cru Montmains: Chardonnay with more depth and minerality than village Chablis.',
    'AOP Ajaccio':
      'Around Ajaccio in Corsica. Reds are mainly Sciaccarellu: light colour, red fruit, pepper and maquis herbs. Whites are Vermentinu.',
    Corse: "A Corsican wine from Clos d'Alzeto, one of the island's highest vineyards.",
    'AOP Sartène':
      'Southern Corsica. Reds from Sciaccarellu, Niellucciu and Grenache: red fruit, maquis and spice.',
    Sicile:
      'From Mount Etna in Sicily, by Frank Cornelissen, a well-known natural-wine producer. Volcanic soils, Nerello Mascalese for reds; low intervention, vibrant and unusual.',
    Luberon: 'From the Luberon hills in northern Provence; cooler nights give fresher whites.',
    'Pouilly-Fumé':
      'Loire Valley, across the river from Sancerre. Sauvignon Blanc with a smoky, flinty edge.',
    'Saumur-Champigny': 'Loire Valley red from Cabernet Franc: red fruit, fresh, silky.',
    'Haute Côte de Nuit':
      "Hautes-Côtes de Nuits, the hills above Burgundy's Côte de Nuits. A fresh, pure Chardonnay.",
    Meursault:
      'Famous Burgundy village. Whites are rich, buttery Chardonnay; red Meursault (Pinot Noir) is rare.',
    'Coteaux Bourguignon': 'A regional Burgundy red: light, fruity and easy to drink.',
    'Savigny-lès-Beaune': 'Burgundy village near Beaune. Pinot Noir: red fruit, supple, elegant.',
    'Nuits-Saint-Georges': 'Côte de Nuits, Burgundy. Pinot Noir with more structure and depth.',
    'Volnay « En Chevret »':
      "Volnay Premier Cru 'En Chevret', Burgundy. Pinot Noir known for finesse and silky, floral elegance.",
    'Saint-Joseph':
      'Northern Rhône, west bank. Red Syrah: dark fruit and pepper. White Marsanne/Roussanne: round and floral.',
    'Châteauneuf-du-Pape':
      "Southern Rhône's most famous appellation, near Avignon. Reds are Grenache-led blends: generous, spicy. Whites are rich and floral.",
    Condrieu: 'Northern Rhône. 100% Viognier: apricot, peach and white flowers, rich and aromatic.',
    Gigondas:
      'Southern Rhône village at the foot of the Dentelles de Montmirail. Grenache-led reds: powerful, spicy, garrigue.',
    'Saint-Émilion Grand Cru': 'Right bank of Bordeaux. Mostly Merlot: round, plummy, velvety.',
    'Saint-Estèphe':
      'Left bank of Bordeaux (Médoc). Cabernet Sauvignon-led: structured, cassis, built to age. La Dame de Montrose is the second wine of Château Montrose.',
  },
  // producer notes (only well-established facts)
  wineProd: {
    'Château La Coste':
      'Château La Coste is a wine estate near Aix that is also an open-air art and architecture park.',
    'Château Minuty':
      "Château Minuty is a family estate on the Saint-Tropez peninsula, one of Provence's best-known rosé houses.",
    Minuty:
      "Château Minuty is a family estate on the Saint-Tropez peninsula, one of Provence's best-known rosé houses.",
    'Château de Pibarnon':
      "Château de Pibarnon is one of Bandol's leading estates, with terraced vines high above the sea.",
    'Château Pibarnon':
      "Château de Pibarnon is one of Bandol's leading estates, with terraced vines high above the sea.",
    'Clos Sainte Magdeleine':
      'Clos Sainte Magdeleine has vines on the cliffs of Cap Canaille, right above the sea in Cassis.',
    Chapoutier: 'M. Chapoutier is one of the great houses of the Rhône Valley.',
    'Frank Cornelissen': 'Frank Cornelissen makes natural wines on the slopes of Mount Etna.',
    'Domaine de la Courtade': 'Domaine de la Courtade is on the island of Porquerolles.',
    'Les Terrasses de la Courtade': 'From Domaine de la Courtade, on the island of Porquerolles.',
    'Maison Bouchard Père & Fils': 'Bouchard Père & Fils is a historic Beaune house, founded in 1731.',
    'Maison Louis Latour': 'Louis Latour is a historic family house in Beaune.',
    'William Fèvre': 'William Fèvre is one of the reference producers in Chablis.',
    'Château de La Nerthe': 'Château La Nerthe is one of the oldest estates of Châteauneuf-du-Pape.',
    'Château Saint-Maur': 'Château Saint-Maur is one of the 18 Côtes de Provence Crus Classés.',
    'Domaine Estoublon': 'Estoublon, in Fontvieille near Les Baux, is also famous for its olive oil.',
    'Château Estoublon': 'Estoublon, in Fontvieille near Les Baux, is also famous for its olive oil.',
    'Château Henri Bonneaud': 'Château Henri Bonneaud is a family estate in the tiny Palette appellation.',
    'Château Crémat': 'Château de Crémat is a historic estate in Bellet, above Nice.',
    'Château de Crémat': 'Château de Crémat is a historic estate in Bellet, above Nice.',
    'Pascal Jolivet': 'Pascal Jolivet is a leading Sancerre and Pouilly-Fumé producer.',
    'Domaine de Ladoucette':
      'De Ladoucette is the reference house of Pouilly-Fumé, based at Château du Nozet.',
    'Domaine Parés Baltà': 'Parés Baltà is an organic family estate in Penedès.',
    'Sous le Végétal': 'Sous le Végétal is a natural-wine project on Samos.',
    'Domaine Pero Longo': 'Pero Longo is a biodynamic estate near Sartène in southern Corsica.',
    "Clos d'Alzeto": "Clos d'Alzeto has some of Corsica's highest vineyards, above Ajaccio.",
    'La Chablisienne': "La Chablisienne is the Chablis growers' cooperative.",
    'Château Leoube': 'Château Léoube is an organic estate on the coast near Bormes-les-Mimosas.',
    'Domaine Lafran-Veyrolles': 'Lafran-Veyrolles is a family estate in Bandol.',
    'Armand Heitz': 'Armand Heitz is a young Burgundy grower working organically.',
    'Albert Bichot': 'Albert Bichot is a historic Beaune house.',
  },
  // suggested pairings with dishes on our menu (by colour/style)
  pairWith: {
    Blanc:
      'Suggested with: Huîtres de Camargue, Noix de Saint-Jacques marinées à cru, Rouget de roche, Linguines aux palourdes, the catch of the day.',
    BlancRich:
      'Suggested with: Noix de Saint-Jacques aux agrumes, Dos de loup au grill (bourride sauce), Raviole au foie gras, Pot-au-feu de poulette des Alpilles.',
    Rosé: 'Suggested with: Poireau à la tapenade originelle, Crabe bleu, Rouget de roche, Pieds paquets de calamar.',
    Rouge:
      'Suggested with: Pot-au-feu de poulette des Alpilles, Champignons des bois, cheeses from Maison Lemarié.',
    RougeBig: 'Suggested with: Faux-filet de bœuf maturé, Pieds paquets de calamar, cheeses.',
  },
};
