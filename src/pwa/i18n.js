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
      say: "It's a farm egg from Trets, just outside Aix, cooked very slowly at low temperature, so the yolk stays nice and runny. It comes with butternut squash and toasted hazelnuts.",
      words: 'Œuf parfait = egg cooked about 1 h at ~64 °C.',
    },
    'Tataki de bœuf': {
      say: "It's beef just seared on the outside, still rare in the middle, and sliced thin the Japanese way. It comes with a cumin hummus and a little preserved lemon to freshen it up.",
      words: 'Tataki = briefly seared, sliced.',
    },
    "Dos de maigre en croûte d'olives": {
      say: 'Meagre is a Mediterranean white fish, firm and mild. We bake it under an olive crust, with sweet Cévennes onions and fennel cooked with pissalat spices.',
      words: 'Pissalat = Niçoise anchovy condiment (the base of pissaladière).',
    },
    'Parmentier de veau': {
      say: "It's our take on a real French comfort dish: veal slow-cooked under a creamy mash, with olives for a little taste of Provence.",
      words: "Parmentier = like a shepherd's pie.",
    },
    'Sablé breton': {
      say: "It's a really buttery Breton shortbread that crumbles in your mouth, topped with a vanilla cream and red berries.",
      words: '',
    },
    'Mousse au chocolat': {
      say: "It's a proper chocolate mousse, nice and airy, with caramel and a pinch of fleur de sel, so it finishes like salted caramel.",
      words: '',
    },
    'Beignets de fleurs de courgettes': {
      say: "They're courgette flowers fried in a really light batter, a summer classic in Nice and Provence. You dip them in labneh, a thick strained yogurt, with mint and cumin.",
      words: 'Labneh = strained yogurt, like a fresh cheese.',
    },
    'Aubergine rafraîchie au citron': {
      say: "It's a nice fresh starter: aubergine with lemon and basil, topped with diced flat peaches. Light, a little sweet, a little tangy.",
      words: "Pêche plate = flat 'donut' peach.",
    },
    'Jambon ibérique Cebo de Campo 36 mois': {
      say: "It's Spanish Iberian ham, aged 36 months. 'Cebo de Campo' means the pigs live outdoors, on pasture and grain. It's nutty, it melts in your mouth, and it's perfect to share over a glass.",
      words: 'Contains pork.',
    },
    'Cœur de romaine': {
      say: "It's a crisp romaine heart with pastrami made from Aubrac beef raised in the Camargue, Provence figs and a honey dressing. You can have it as a starter or a main.",
      words: 'Aubrac = French cattle breed.',
    },
    'Girolles à la grecque': {
      say: "These are chanterelles done 'à la grecque', meaning marinated in olive oil, lemon and spices, so they're light and a bit tangy. With little potatoes and green olives from Les Baux.",
      words: 'À la grecque = cooked in an aromatic lemon-olive oil marinade, served at room temperature.',
    },
    'Crudo de thon rouge': {
      say: "It's raw bluefin tuna, sliced thin like a crudo, with a fresh cucumber, lemon and ginger condiment. And puffed Camargue rice on top for crunch.",
      words: 'Crudo = raw, Italian-style. Contains fish.',
    },
    'Bolognaise de calamars': {
      say: "It's a seaside Bolognese: instead of meat, the sauce is made with chopped squid. Served on linguine with a garlic and parsley persillade.",
      words: 'Contains seafood (squid) and gluten.',
    },
    "Dos de loup rôti à l'huile de verveine": {
      say: "'Loup' is what we call sea bass here in the Mediterranean. We roast it with lemon-verbena oil, and it comes with a puffed panisse and a jus of slow-cooked vegetables.",
      words: 'Panisse = Marseille chickpea-flour fritter.',
    },
    'Ajo blanco de Saint-Pierre': {
      say: "It's John Dory, a very delicate white fish, with ajo blanco, a cold Andalusian almond and garlic sauce. There are also cherries, fennel and green beans.",
      words: 'Ajo blanco contains almonds (nuts).',
    },
    'Retour de pêche suivant la Criée': {
      say: "It's the catch of the day, straight from the Marseille fish auction. It's priced by weight, with Provençal vegetables and linguine in parsley butter. Let me ask the kitchen what came in today.",
      words: 'Priced per 100 g.',
    },
    'Brocolettis rôtis': {
      say: "It's our vegetarian main: roasted broccolini, the long tender-stem broccoli, with hemp seeds, Greek yogurt and spinach.",
      words: 'Vegetarian — confirm details with the kitchen.',
    },
    'Petits farcis': {
      say: "It's a real classic from Nice and Provence: little vegetables stuffed with lamb and Provençal pork, on a sweet pepper cream with aged olive oil.",
      words: 'Contains pork and lamb.',
    },
    'Entrecôte ribeye (250 g)': {
      say: "It's a 250 g French ribeye, with a crispy grated potato cake, a grilled Marmande tomato and Foyot sauce, which is a béarnaise with meat glaze. How would you like it cooked?",
      words: 'Foyot = béarnaise + meat glaze.',
    },
    'Poitrine de veau confite et ris de veau': {
      say: "It's veal breast slow-cooked for hours, with sweetbreads, aubergine and samphire, a little salty sea vegetable. All with a slightly tangy cream spiced with vadouvan, a French curry-style blend.",
      words: 'Ris de veau = veal sweetbreads (thymus). Vadouvan = curry-style spice mix with shallots.',
    },
    'Fromages affinés de Provence de la Maison Lemarié': {
      say: 'These are Provençal cheeses aged by Maison Lemarié, specialist cheese affineurs. They go really well with a red or a white from Provence.',
      words: 'Affiné = matured by an affineur.',
    },
    'Poireau à la tapenade originelle': {
      chef: "A disc of caper tapenade, quail eggs, leek 'tagliatelle', all ringed with a lightly toasted black-olive crumble. Tapenade was first written down in Marseille in 1880 by chef Meynier: this is the 'original' recipe. The name comes from 'tapeno', Provençal for caper. It's the vegetarian starter.",
      serv: 'Check: the quail eggs must be soft-boiled (mollet). Gluten-free dish. Vegan request: without the eggs the dish loses a lot, check with the kitchen.',
      say: "It's leek with the original old-style tapenade, olives, capers and anchovies, plus soft-boiled quail eggs. Real tapenade has anchovy, so if you're vegetarian I'll check with the kitchen.",
      words: 'Contains egg; tapenade may contain fish (anchovy).',
    },
    'Crabe bleu': {
      chef: 'Crab meat at the bottom of the bowl, topped with a smoked corn cream made in a siphon: airy and light as foam. Slightly spiced, with herbs.',
      serv: 'Cutlery: add a dessert spoon. Gluten-free, but contains lactose (corn cream). Selling point: generous, tender crab meat, close to brown crab.',
      say: "It's blue crab, an invasive species we now catch in the Mediterranean lagoons, with a smoked sweetcorn cream. Sweet and smoky.",
      words: 'Contains crustaceans (crab), dairy.',
    },
    'Huîtres de Camargue': {
      chef: '3 Camargue oysters, poached (half-cooked, half-raw), lemony fresh cheese, small pieces of crunchy celery. Barely spicy: celery for texture, chilli for a lift. On top, the oyster water made into a foam in a siphon, like sea spray.',
      serv: 'Cutlery: add a dessert spoon. Gluten-free, but contains lactose (fresh cheese).',
      say: 'These are oysters from the Camargue, with a touch of chilli, a lemon condiment and celery.',
      words: 'Contains molluscs (oysters), celery, milk (fresh cheese).',
    },
    'Rouget de roche': {
      chef: 'Tartlet: pâté en croûte at the base, fennel purée, then cuttlefish-ink rouille. On top: red mullet fillets and a crunchy fennel salad. Served cold.',
      serv: "On the staff sheet: 'Fennel tartlet and rock red mullet'. Contains gluten (pastry).",
      say: "It's rock red mullet on a fennel tartlet, with a black rouille made with cuttlefish ink. Rouille is the garlic and saffron mayo we put in bouillabaisse.",
      words: 'Contains fish, molluscs (cuttlefish ink), gluten, egg.',
    },
    'Noix de Saint-Jacques marinées à cru': {
      chef: "On the staff sheet: 'Scallop tartare with Corsican clementine'. Thin slices of scallop marinated raw in clementine, grated bottarga, a lemony tagetes (marigold) leaf. Deliberately simple, all about the product.",
      serv: 'Bottarga: a Mediterranean speciality of grey mullet roe sacs, salted, pressed and dried; firm yet melting, intense and briny.',
      say: "They're raw scallops marinated in Corsican clementine, with grated bottarga on top. Bottarga is salted, dried mullet roe, a speciality of Martigues, near here.",
      words: 'Contains molluscs (scallops), fish (bottarga).',
    },
    'Raviole au foie gras de canard et champignons': {
      serv: 'Cutlery: add a dessert spoon. Contains gluten.',
      chef: 'Served hot in a frothy soy broth. The mushrooms change with what comes in.',
      say: "It's one big raviolo filled with duck foie gras and mushrooms, in a frothy soy broth.",
      words: 'Contains gluten, egg, soy; duck foie gras.',
    },
    'Linguines aux palourdes': {
      serv: 'Service: bowl or deep plates + a wet wipe + large spoons. Contains gluten.',
      chef: 'Like linguine alle vongole.',
      say: "It's linguine with clams, like Italian vongole, with a garlic and parsley persillade.",
      words: 'Contains molluscs (clams), gluten.',
    },
    'Noix de Saint-Jacques aux agrumes': {
      chef: '4 to 5 scallops depending on size. Orange sauce: orange reduction, shallot and a little whipped cream. Camargue black rice, parsnip mousseline, Iberian chorizo.',
      serv: 'Service: large cutlery. Note: chorizo (pork), but it can be left out. Contains lactose (orange sauce: cream and shallot). The team expects a best-seller.',
      say: "It's seared scallops with citrus, Camargue black rice, a silky parsnip mousseline and Iberian chorizo.",
      words: 'Contains molluscs (scallops), pork (chorizo), dairy.',
    },
    'Dos de loup au grill': {
      chef: "'Quenelle like a bourride': a fish quenelle and preserved lemon, red Camargue mussels, crunchy celery, bourride sauce (garlic and olive oil, like aioli). No potatoes, gentler on garlic than the classic. Bourride is a traditional Provençal fish stew served with a garlic and olive-oil sauce.",
      serv: 'Service: sauce boat. The sauce comes on the side: pour it at the table. Staff-sheet allergens: gluten, lactose; also mussels and celery, and aioli contains egg.',
      say: "It's grilled sea bass served like a bourride, the Provençal fish stew thickened with aïoli, with a preserved lemon quenelle.",
      words: 'Contains fish, mussels, gluten, milk, celery, egg (aioli-style sauce).',
    },
    'Retour de pêche suivant la criée': {
      say: "It's the fish of the day, whatever came in at the auction. It's sold by weight, 14 € per 100 g: I'll show you the whole fish first, then we serve it with Provençal vegetables and linguine in persillade.",
      words: 'Contains fish, gluten.',
    },
    'Pieds paquets de calamar': {
      chef: "Lamb stuffing (tripe + trotters) inside a squid: present it like stuffed squid. A melting potato in the centre of the plate, fish-soup foam. A 'surf & turf' dish. No pork.",
      serv: "Cutlery: add a large spoon. Sell it as an exceptional surf and turf, even to guests who say they don't like pieds paquets. Never call it bouillabaisse.",
      say: "It's a wink at pieds paquets, the old Marseille dish of stuffed tripe parcels. Here the filling goes inside a squid, like a stuffed calamari, under a fish soup foam: a real surf and turf.",
      words: 'Contains molluscs (squid), fish.',
    },
    'Pot-au-feu de poulette des Alpilles': {
      chef: 'Grilled thigh in pieces with orzo (rice-shaped pasta), chicken broth. Young hen, not guinea fowl.',
      serv: 'Service: one plate, with the sauce boat of broth poured at the table, + a large spoon.',
      say: "It's pot-au-feu, the great French comfort dish, made with a young hen from the Alpilles, poached slowly in broth with its vegetables.",
      words: 'Contains celery likely (broth): check with the kitchen.',
    },
    'Faux-filet de bœuf maturé': {
      chef: 'Beef aged 1 month, 180 g, little gem braised with bone marrow. (The tasting meat was aged 2 months, judged too strong.)',
      serv: 'Side plate served separately: butternut gnocchi and pumpkin seeds. Warn the guest the beef is aged (stronger flavour).',
      say: "It's beef sirloin dry-aged for a month, so it has a deeper flavour, with little gem lettuce braised in bone marrow and butternut squash gnocchi.",
      words: 'Contains gluten, egg (gnocchi).',
    },
    'Champignons des bois': {
      chef: 'The vegetarian main.',
      serv: 'For a vegan request the kitchen can build on the mushrooms.',
      say: "It's our vegetarian main: wild mushrooms, sweet Cévennes onions slow-cooked in sherry vinegar, and a crispy potato.",
      words: 'Vegetarian.',
    },
    'Amuse-bouche du jour': {
      say: "It's a little bite from the chef to open the menu: a dill meringue with lemon cream, herring roe and mussels. Salty, fresh and light.",
      words: 'Contains egg, fish (herring roe), molluscs (mussels), dairy.',
    },
    'Saint-Pierre, clémentine': {
      say: "It's John Dory with clementine, pickled and puréed butternut, an orange gel and tapioca pearls. The sauce is pil pil, a Basque emulsion of olive oil, garlic and chilli.",
      words: 'Contains fish.',
    },
    'Paleron de bœuf Angus': {
      say: "It's Angus beef chuck, slow-cooked for hours so it's really tender. With courgette three ways, a cream, baby courgettes and little pearls, plus chanterelles.",
      words: 'Check dairy in the courgette cream with the kitchen.',
    },
    'Sablé, poire pochée': {
      say: "It's the menu's dessert: an all-butter shortbread, poached pear, a tonka bean cream and caramel.",
      words: 'Contains gluten, butter/dairy, egg.',
    },
    'Ravioles de Saint-Jacques': {
      say: "They're delicate scallop ravioli with foie gras and truffle, finished with a light soy foam.",
      words: 'Contains shellfish (scallop), gluten, soy; foie gras.',
    },
    'Poire / marrons, comme un mont blanc': {
      chef: 'Meringue, chestnut cream, chestnut crémeux, chestnut pieces, whipped vanilla ganache, pear compote, pear sorbet.',
      serv: 'Cutlery: dessert spoon + fork.',
      say: "It's our take on the Mont Blanc: soft chestnut cake, pear compote, whipped vanilla ganache, chestnut cream and crisp meringue, with a pear sorbet. And it's gluten-free.",
      words: 'Gluten-free. Contains dairy, egg, chestnut.',
    },
    'Pommes façon tatin, infusion vanille-anis étoilé': {
      chef: 'Olive-oil shortbread confirmed by the pastry chef; star anise and vanilla notes. A big hit at the tasting.',
      serv: 'Cutlery: dessert spoon + fork. At the tasting the ice cream was called vanilla-star anise, the menu says maple syrup: check before service.',
      say: "It's like a tarte tatin: caramelised apples infused with vanilla and star anise, with a maple cream, a crumble and pecans, on an olive oil shortbread. Served with maple syrup ice cream.",
      words: 'Contains nuts (pecan), gluten, dairy.',
    },
    'Chocolat / sésame noir': {
      chef: 'Cocoa shortcrust, whipped dark chocolate ganache, milk chocolate and black sesame ganache, black sesame praline, chocolate ice cream.',
      serv: 'Cutlery: dessert spoon + fork.',
      say: "This one's for chocolate lovers: cocoa shortcrust, soft chocolate sponge, milk chocolate ganache, black sesame praline and a dark chocolate bavarois, with chocolate ice cream.",
      words: 'Contains sesame, dairy, gluten, egg.',
    },
    'Pignon de pin, romarin, citron': {
      chef: 'Pine nut shortbread and sponge, pine nut praline, lemon cream, whipped rosemary ganache, lemon confit and lemon gel.',
      serv: 'Cutlery: dessert spoon + fork.',
      say: "It's a really Provençal dessert: soft pine nut sponge and praline, a light rosemary cream and lemon confit. Fresh and herby.",
      words: 'Contains nuts (pine nuts), dairy, gluten, egg.',
    },
    'Éclipse de pavlova': {
      say: "It's our pavlova: crisp meringue, whipped vanilla ganache and a red berry confit. Light and fruity.",
      words: 'Contains egg.',
    },
    'Chouquette glacée': {
      say: "It's a play on the chouquette, the little choux puff with pearl sugar, but served iced, with hazelnut and vanilla.",
      words: 'Contains nuts (hazelnut).',
    },
    Agrumes: {
      say: "It's our freshest dessert: citrus with dates, a rosewater granita and orange blossom. Light, fragrant, not too sweet.",
      words: '',
    },
    'Soufflé au chocolat Ariaga': {
      say: "It's a hot soufflé made with Ariaga chocolate, with cocoa nibs and a dulce de leche and fleur de sel ice cream. We bake it to order, so it takes a few extra minutes.",
      words: 'Confiture de lait = dulce de leche.',
    },
  },
  cocktail: {
    'Bellini Provençal':
      "It's a Provençal Bellini: Champagne with fresh peach purée and a dash of lavender liqueur. Fruity, floral, perfect for a toast.",
    'Spritz de la Maison Château Saint-Martin':
      "It's our house spritz: Prosecco and Bitter des Basques, a French bitter, topped up with Perrier and orange. Bittersweet and really refreshing.",
    'Romarin Tonic':
      "It's our herbal gin and tonic, with Gin Juillet from Maison Ferroni, made in Aubagne, right next door. We add a herb liqueur and tonic, so it's fresh and really aromatic.",
    'Daïquiri Framboise':
      "It's a raspberry daiquiri: amber rum, raspberry liqueur, lime and a few drops of Angostura. Fruity and tangy.",
    "Lueur d'Azur (mocktail)":
      "It's our alcohol-free cocktail: cranberry, pineapple and orange juice over ice. Fruity and full of colour.",
    'Citronnade Signature':
      "It's our homemade lemonade with a touch of orange blossom, very Provençal. No alcohol.",
    'Thé glacé maison':
      "It's our homemade iced tea, made with teas from Maison Père Blaize, Marseille's historic herbalist, with sweet mint and lemongrass. No alcohol.",
  },
  soft: {
    'Coupe de French Bloom':
      "It's a French alcohol-free sparkling, perfect if you're not drinking but still want to raise a glass.",
    'Le Cola Gaston': "It's a local craft cola, a nice change from the big brands.",
    'La Limonade Lise': "It's a local craft lemonade, sparkling.",
    'Jus Alain Milliat':
      'These are premium French juices from Alain Milliat, made with carefully chosen fruit. We have apricot, apple, strawberry, tomato or pineapple: which one would you like?',
    'Pastis Château des Creissauds 2022':
      "It's a craft pastis from an estate near Aubagne. It's Marseille's anise aperitif, served with cold water to mix in.",
    'Pastis 51 / Ricard':
      "It's the Marseille aperitif: an anise spirit you top up with cold water, about five parts water.",
    'Bière La Minotte (Blonde ou IPA/Pale Ale)':
      "It's a craft beer from a Marseille brewery, blonde or IPA/pale ale.",
    Orezza: "It's naturally sparkling water from Corsica, lightly fizzy and rich in iron.",
    'Saint Georges': "It's a still water from Corsica.",
    Zilia: "It's a mineral water from Corsica, from the Balagne.",
    'Ginger beer': "It's a ginger soda, alcohol-free and nicely spicy.",
    'San Pellegrino 50 cl': "It's Italian sparkling water, with fine bubbles.",
    'San Pellegrino 1 L': "It's Italian sparkling water, with fine bubbles.",
    'Vittel 50 cl': "It's a French still water from the Vosges.",
    'Vittel 1 L': "It's a French still water from the Vosges.",
    Perrier: "It's sparkling water from the south of France, near Nîmes, with big bubbles.",
  },
  tea: {
    'Thé blanc de Chine « Paï mu tan »':
      "It's a Chinese white tea made from young buds and leaves. Very soft and floral, with almost no bitterness.",
    'Thé noir Darjeeling Supérieur':
      "It's a classic black tea grown in the Himalayan foothills in India. Light and fragrant; they call it the 'champagne of teas'.",
    'Tisane du Soir':
      "It's an evening infusion, caffeine-free, lemony and floral: lemongrass, lemon verbena, rose and orange buds. Perfect after dinner.",
    'Tisane Notre-Dame de la Garde':
      "Caffeine-free, very minty and refreshing. It's named after Notre-Dame de la Garde, the basilica watching over Marseille.",
    'Tisane Marseillaise':
      'Caffeine-free and very Provençal: verbena, star anise, lavender, rosemary and fennel. Provence in a cup.',
    'Tisane Forts Saint-Jean':
      "It's a caffeine-free rooibos with citrus, ginger and warm spices, named after the fort at the mouth of the Vieux-Port.",
    'Tisane Maison Blaise':
      "It's a caffeine-free rooibos with red berries, rose and hibiscus. Fruity and gentle.",
    'Tisane Forts Saint-Nicolas':
      "It's our 'Christmas' rooibos, caffeine-free, with orange, star anise and cinnamon, named after the fort right across from Fort Saint-Jean.",
  },
  coffee:
    "It's Illy coffee, a single origin from Cerrado Mineiro in Brazil: smooth, with chocolate and nutty notes.",
  digestif: {
    'Gin Juillet de Provence':
      "It's a Provençal gin from Maison Ferroni, a small craft distillery in Aubagne, just outside Marseille.",
    'Roof Rye Whisky': "It's a rye whisky made by Maison Ferroni in Aubagne.",
    'Rhum Marseillais':
      "It's a rum from Maison Ferroni in Aubagne, a nod to Marseille's past as a port for spices and rum.",
    'Rhum Miel & Safran': "It's a Ferroni rum with honey and saffron: warm and gently sweet.",
    'Rhum Herbacé': "It's an herbal rum from Maison Ferroni in Aubagne.",
    'Eau Verte de Marseille (recette de 1830)':
      "It's an old Marseille liqueur, brought back by Maison Ferroni from an 1830 recipe. Mint and lemon, perfect after a big meal.",
    'Liqueur de menthe':
      "It's a mint liqueur from Domaine Lachanenche, a small producer in the Southern Alps working with mountain plants and fruit.",
    Limoncello:
      "It's a lemon liqueur from Domaine Lachanenche in the Southern Alps. We serve it nice and cold.",
    'Liqueur de framboise': "It's a raspberry liqueur from Domaine Lachanenche in the Southern Alps.",
    'Câlin Polisson':
      "It's a creamy liqueur that tastes like a calisson, the almond and melon sweet from Aix. It's also what we pour with the Tasting Menu dessert.",
    'Liqueur de Mélopépo': "It's a melon and almond liqueur from the Var: all the flavour of a calisson.",
    'Cognac Rémy Martin VSOP': "It's a classic Rémy Martin VSOP Cognac, a brandy aged at least four years.",
    'Armagnac Château de Laubade VSOP':
      "It's a VSOP Armagnac from Château de Laubade, the brandy of Gascony. A bit more rustic and richer than Cognac.",
  },
  champagne: {
    Pommery: 'Pommery is a historic house in Reims, and Apanage is its brut: fresh and elegant.',
    Taittinger:
      'Taittinger is a family house in Reims, known for elegant champagnes with lots of Chardonnay.',
    'Billecart-Salmon':
      'Billecart-Salmon is a family house in Mareuil-sur-Aÿ, known for fine, precise champagnes. Its rosé is especially famous.',
    'Perrier-Jouët':
      'Perrier-Jouët is an Épernay house with a floral, Chardonnay-led style. Belle Époque is its top cuvée, the bottle with the anemones.',
    Hostomme:
      'Hostomme is a family grower in the Côte des Blancs. This Grand Cru Blanc de Blancs is 100% Chardonnay.',
    Ruinart:
      'Ruinart is the oldest champagne house, going since 1729. Its Blanc de Blancs is 100% Chardonnay, fresh and citrusy.',
    Deutz: 'Deutz is a house in Aÿ, and Amour de Deutz is its prestige Blanc de Blancs.',
    'Joseph Perrier':
      'Joseph Perrier is a family house in Châlons-en-Champagne. Esprit Victoria is its vintage prestige cuvée: here an extra brut Blanc de Blancs from 2010.',
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
