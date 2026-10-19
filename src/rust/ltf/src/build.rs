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
* @name: Les Trois Forts - Chapters, Items & Questions
* @file: rust/ltf/src/build.rs
* @type: Rust (WebAssembly)
* @authors: Abraham Ukachi <abrahamukachi@gmail.com>
*
* Example usage:
*   1+|> use crate::build::*;
*    +|> build_items();
*    -|> 
*
*/


/*
* !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
* MOTTO: We'll always do more 😜!!!
* !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
*/
//! Data (embedded JSON) + item / question-generator construction. Port of the
//! "chapters", "items", "ⓘ info builders", "photos" (keys) and "build" sections of app.js.
// import the language helpers (en, t) 🌍
use crate::state::{en, translate};
// import our JS-semantics helpers 🧰
use crate::util::*;
// import the JS RegExp (same regex engine as app.js) 🔎
use js_sys::RegExp;
// import serde_json's Value (the embedded data) 🗃️
use serde_json::Value;
// import HashMap (item counters per chapter) & Rc (shared answer pools) 🧰
use std::collections::HashMap;
use std::rc::Rc;


// ===== TYPES 🧩 ===== //

/// `Ch` - Struct 📚
///
/// A chapter of the hub { id, name, sub }.
pub struct Ch {
    pub id: &'static str,
    pub name: String,
    pub sub: String,
}

/// `Say` - Struct 🗣️
///
/// The speech names of an item: French, English, original language & its label.
#[derive(Clone)]
pub struct Say {
    pub fr: String,
    pub en: String,
    pub ol: Option<String>,
    pub on: Option<String>,
}

/// `Gen` - Enum ❓
///
/// A question generator: a multiple-choice question (drawn when asked) or a floor plan question.
pub enum Gen {
    Mcq { prompt: String, correct: String, pool: Rc<Vec<String>>, expl: String },
    Plan(usize),
}

/// `Item` - Struct 🗂️
///
/// One flash card / question source (same fields as the items of app.js).
pub struct Item {
    pub id: String,
    pub ch: &'static str,
    pub front: String,
    pub back: String,
    pub gens: Vec<Gen>,
    pub fact: bool,
    pub info: Option<String>,
    pub ikey: Option<String>,
    pub phdef: Option<String>,
    pub course: Option<&'static str>,
    pub csub: String,
    pub as2: String,
    pub cocktail: Option<usize>,
    pub say: Option<Say>,
}

/// `Item` - Impl 🗂️
impl Item {
    /// `has_info` - Method ℹ️
    ///
    /// @returns { bool } - does the item have a (non-empty) ⓘ sheet?
    pub fn has_info(&self) -> bool {
        self.info.as_deref().map(|info| !info.is_empty()).unwrap_or(false)
    }

    /// `info_s` - Method ℹ️
    ///
    /// @returns { &str } - the ⓘ HTML ('' when none)
    pub fn info_s(&self) -> &str {
        self.info.as_deref().unwrap_or("")
    }
}

/// `Question` - Struct ❓
///
/// A drawn question { q, options, answer, expl, item, plan, svg }.
#[derive(Clone)]
pub struct Question {
    pub prompt: String,
    pub options: Vec<String>,
    pub answer: String,
    pub expl: String,
    pub item: usize,
    pub plan: Option<usize>,
    pub svg: String,
}


// ===== ALLERGENS ⚠️ ===== //

// the allergen codes (indicative only, `?` = likely)
pub const ALGK: [&str; 12] = ["gluten", "crust", "egg", "fish", "moll", "milk", "nuts", "pine", "celery", "soy", "sesame", "pork"];

/// `alg_lab` - Function ⚠️
///
/// @param { &str } code - an allergen code
/// @returns { String } - its label
pub fn alg_lab(code: &str) -> String {
    let (french, english) = match code { "gluten" => ("Gluten", "Gluten"), "crust" => ("Crustacés", "Crustaceans"), "egg" => ("Œuf", "Egg"), "fish" => ("Poisson", "Fish"), "moll" => ("Mollusques", "Molluscs"), "milk" => ("Lait / lactose", "Milk / lactose"), "nuts" => ("Fruits à coque", "Tree nuts"), "pine" => ("Pignon de pin", "Pine nuts"), "celery" => ("Céleri", "Celery"), "soy" => ("Soja", "Soy"), "sesame" => ("Sésame", "Sesame"), _ => ("Porc", "Pork") };
    translate(french, english)
}

/// `alg_of` - Function ⚠️
///
/// @param { &Value } dish - a dish
/// @returns { Vec<(String, bool)> } - its allergens (code, likely?)
pub fn alg_of(dish: &Value) -> Vec<(String, bool)> {
    dish["alg"].as_str().unwrap_or("").split(',').filter(|code| !code.is_empty()).map(|code| (code.replace('?', ""), code.ends_with('?'))).collect()
}

/// `alg_note` - Function ⚠️
///
/// @returns { String } - the allergen disclaimer
pub fn alg_note() -> String {
    translate("Indicatif, d'après la carte et la dégustation : toujours confirmer avec la carte allergènes et la cuisine.", "Indicative, from the menu and the tasting: always confirm with the allergen chart and the kitchen.")
}


// ===== THE APP 📚 ===== //

/// `App` - Struct 📚
///
/// Everything built at start: the data, the English layer, the photos, the icons,
/// the chapters, the items, the key facts, the cocktail ingredients & the voice quality regex.
pub struct App {
    pub data: Value,
    pub le: Value,
    pub img: Value,
    pub icons: Value,
    pub ch: Vec<Ch>,
    pub items: Vec<Item>,
    pub facts: Vec<String>,
    pub all_ingr: Vec<String>,
    pub allergy: String,
    pub qual: RegExp,
}


// ===== COURSES 🍽 ===== //

// the course order
pub const CORDER: [&str; 5] = ["app", "start", "main", "cheese", "dess"];

/// `course_of` - Function 🍽
///
/// @param { &str } section - a menu section
/// @returns { Option<&'static str> } - its course type
pub fn course_of(section: &str) -> Option<&'static str> {
    Some(match section {
        "Amuse-bouche" => "app",
        "Entrée dégustation" => "start",
        "Poisson" => "main",
        "Viande" => "main",
        "Dessert dégustation" => "dess",
        "Pour commencer" => "app",
        "Entrée" => "start",
        "Entrées" => "start",
        "Plat" => "main",
        "De la mer" => "main",
        "De la terre" => "main",
        "Fromages" => "cheese",
        "Végétarien" => "main",
        "Dessert" => "dess",
        "Desserts" => "dess",
        _ => return None,
    })
}

/// `clab` - Function 🏷️
///
/// @param { &str } course - a course type
/// @returns { (&str, &str) } - its (French, English) labels
fn clab(course: &str) -> (&'static str, &'static str) {
    match course {
        "app" => ("Pour commencer", "Appetizer"),
        "start" => ("Entrée", "Starter"),
        "main" => ("Plat principal", "Main course"),
        "cheese" => ("Fromage", "Cheese"),
        _ => ("Dessert", "Dessert"),
    }
}

/// `c_lab` - Function 🏷️
///
/// @param { &str } course - a course type
/// @returns { String } - its label in the current language
pub fn c_lab(course: &str) -> String {
    let (french, english) = clab(course);
    if en() { english.into() } else { french.into() }
}

/// `c_both` - Function 🏷️
///
/// @param { &str } course - a course type
/// @returns { String } - "Starter · Entrée" (both languages, current first)
pub fn c_both(course: &str) -> String {
    let (french, english) = clab(course);
    if en() { format!("{} · {}", english, french) } else { format!("{} · {}", french, english) }
}

/// `corder_idx` - Function 🔢
///
/// @param { Option<&str> } course - a course type
/// @returns { i32 } - its index in the course order (-1 like `indexOf`)
pub fn corder_idx(course: Option<&str>) -> i32 {
    match course {
        Some(course) => CORDER.iter().position(|candidate| *candidate == course).map(|position| position as i32).unwrap_or(-1),
        None => -1,
    }
}

/// `App` - Impl 📚
impl App {
    /// `word` - Method 🇬🇧
    ///
    /// Same as `translateWord(word)` in app.js.
    ///
    /// @param { &str } french - a French word
    /// @returns { String } - its English translation in English mode, else the word itself
    pub fn word(&self, french: &str) -> String {
        if en() {
            let english = &self.le["words"][french];
            if truthy(english) {
                return js(english);
            }
        }
        french.to_string()
    }

    /// `wv` - Method 🇬🇧
    ///
    /// @param { &Value } value - a value
    /// @returns { String } - `translateWord(String(value))`
    pub fn wv(&self, value: &Value) -> String {
        self.word(&js(value))
    }

    /// `ch_name` - Method 📚
    ///
    /// @param { &str } id - a chapter id
    /// @returns { String } - its name ('' when unknown)
    pub fn ch_name(&self, id: &str) -> String {
        self.ch.iter().find(|chapter| chapter.id == id).map(|chapter| chapter.name.clone()).unwrap_or_default()
    }

    /// `item` - Method 🗂️
    ///
    /// @param { &str } id - an item id
    /// @returns { Option<usize> } - its index
    pub fn item(&self, id: &str) -> Option<usize> {
        self.items.iter().position(|candidate| candidate.id == id)
    }
}


// ===== HELPERS 🧰 ===== //

/// `eur` - Function 💶
///
/// Same as `eur(p)` in app.js.
///
/// @param { &Value } price - a price
/// @returns { String } - "12,50 €" (French) / "12.50 €" (English), or "—"
pub fn eur(price: &Value) -> String {
    if price.is_null() {
        return "—".into();
    }
    format!("{} €", js(price).replacen('.', if en() { "." } else { "," }, 1))
}

/// `eur_o` - Function 💶
///
/// @param { &Value } object - an object
/// @param { &str } key - the price key
/// @returns { String } - `eur(o[k])` (a missing key behaves like `undefined`)
fn eur_o(object: &Value, key: &str) -> String {
    match object.get(key) {
        None => "—".into(),
        Some(price) => eur(price),
    }
}

/// `mcq` - Function ❓
///
/// Same as `mcq(q, correct, pool, expl)` in app.js: the right answer + up to 3 distinct wrong ones.
///
/// @param { &str } prompt - the question
/// @param { &str } correct - the right answer
/// @param { &[String] } pool - the possible wrong answers
/// @param { &str } expl - the explanation
/// @param { usize } item - the item index
/// @returns { Option<Q> } - the question, or None without a wrong answer
pub fn mcq(prompt: &str, correct: &str, pool: &[String], expl: &str, item: usize) -> Option<Question> {
    let cands: Vec<String> = uniq(pool).into_iter().filter(|candidate| candidate != correct && !candidate.is_empty()).collect();
    let opts: Vec<String> = shuffle(&cands).into_iter().take(3).collect();
    if opts.is_empty() {
        return None;
    }
    let mut all = vec![correct.to_string()];
    all.extend(opts);
    Some(Question { prompt: prompt.into(), options: shuffle(&all), answer: correct.into(), expl: expl.into(), item, plan: None, svg: String::new() })
}

/// `sec` - Function ℹ️
///
/// @param { &str } ic - the section emoji
/// @param { &str } title - the section title
/// @param { &str } txt - the section text (HTML, already escaped)
/// @returns { String } - one section of the ⓘ sheet ('' when there's no text)
fn sec(ic: &str, title: &str, txt: &str) -> String {
    if txt.is_empty() { String::new() } else { format!("<div class=\"isec\"><div class=\"ih\">{} {}</div><div>{}</div></div>", ic, title, txt) }
}
// the "what to tell the guest" emoji 💬
const SAY: &str = "💬";

/// `obj_keys` - Function 🔑
///
/// @param { &Value } value - an object
/// @returns { Vec<String> } - its keys, in order (like `Object.keys`)
fn obj_keys(value: &Value) -> Vec<String> {
    value.as_object().map(|object| object.keys().cloned().collect()).unwrap_or_default()
}


// ===== BUILD 🏗️ ===== //

/// `build` - Function 🏗️
///
/// Builds the whole app from the embedded JSON (generated from pwa/*.js by tools/gen_data.js):
/// chapters, then every item with its question generators, chapter by chapter, in the exact
/// order (and with the exact random draws) of app.js.
///
/// @returns { App } - the app
pub fn build() -> App {
    // 📦 the embedded data (data.js, i18n.js, i18n_fr.js, images.js + the tables lifted from app.js)
    let data: Value = serde_json::from_str(include_str!("../data/data.json")).unwrap();
    let le: Value = serde_json::from_str(include_str!("../data/en.json")).unwrap();
    let info_en: Value = serde_json::from_str(include_str!("../data/info_en.json")).unwrap();
    let info_fr: Value = serde_json::from_str(include_str!("../data/info_fr.json")).unwrap();
    let img: Value = serde_json::from_str(include_str!("../data/images.json")).unwrap();
    let icons: Value = serde_json::from_str(include_str!("../data/icons.json")).unwrap();
    let factqs: Value = serde_json::from_str(include_str!("../data/factqs.json")).unwrap();
    // 🌍 the language & the ⓘ notes in that language
    let en_ = en();
    let li = if !en_ { info_fr } else { info_en };
    let allergy = translate("Toujours confirmer les allergènes avec la cuisine.", "Always confirm allergens with the kitchen.");

    // 📚 the chapters, in order
    let ch = vec![
        Ch { id: "jour", name: translate("Service du jour", "Today's service"), sub: js(&data["jour"]["sub"][if en_ { "en" } else { "fr" }]) },
        Ch { id: "hiver", name: translate("Carte d'hiver 3F", "Winter menu 3F"), sub: translate("Dès le 19 octobre · 14 plats + 4 desserts", "From 19 October · 14 dishes + 4 desserts") },
        Ch { id: "dej", name: translate("Déjeuner", "Lunch"), sub: translate("Carte du midi & formule 49 €", "Lunch menu & 49 € formula") },
        Ch { id: "diner", name: translate("Dîner & Dégustation", "Dinner & Tasting Menu"), sub: translate("Carte du soir, Menu Dégustation 89 €", "Evening menu, 89 € Tasting Menu") },
        Ch { id: "dess", name: translate("Desserts & Fromages", "Desserts & Cheese"), sub: translate("Douceurs et plateau Lemarié", "Sweets and the Lemarié cheese board") },
        Ch { id: "from", name: translate("Plateau de fromages", "Cheese board"), sub: translate("8 fromages, du plus doux au plus fort", "8 cheeses, mildest to strongest") },
        Ch { id: "cock", name: translate("Cocktails & Softs", "Cocktails & Soft drinks"), sub: translate("Signatures, fiches techniques, softs, eaux", "Signatures, recipe cards, softs, waters") },
        Ch { id: "cafe", name: translate("Cafés & Thés", "Coffee & Tea"), sub: "Illy & Maison Père Blaize".into() },
        Ch { id: "vins", name: translate("Vins", "Wines"), sub: translate("Au verre, Provence, Méditerranée, France", "By the glass, Provence, Mediterranean, France") },
        Ch { id: "champ", name: "Champagnes".into(), sub: translate("Coupes, bruts, rosés, prestige", "Glasses, bruts, rosés, prestige") },
        Ch { id: "dig", name: "Digestifs".into(), sub: "Ferroni, Lachanenche, Liquoristerie".into() },
        Ch { id: "acc", name: translate("Accords mets-vins", "Wine pairing"), sub: translate("L'accord du Menu Dégustation (+55 €)", "The Tasting Menu pairing (+55 €)") },
        Ch { id: "plan", name: translate("Plan de salle", "Floor plan"), sub: translate("Numéros de tables", "Table numbers") },
    ];

    // 🇬🇧 W(s): the English word in English mode
    let w_ = |french: &str| -> String {
        if en_ {
            let english = &le["words"][french];
            if truthy(english) {
                return js(english);
            }
        }
        french.to_string()
    };
    let wv = |value: &Value| w_(&js(value));

    // 🗣️ pronunciation: original-language detection (same regexes as app.js)
    let lb = "(?<![\\wÀ-ÿ])";
    let la = "(?![\\wÀ-ÿ])";
    let mk = |words: &str| re(&format!("{}(?:{}){}", lb, words, la), "i");
    let orig = vec![
        (mk("spritz|negroni|bellini|limoncello|amaretto|campari|aperol|prosecco|pellegrino|panna|grappa|espresso|ristretto|macchiato|cappuccino|tiramis|risotto|burrata|carpaccio|stracciatella|parmigiano|disaronno|sambuca|martini|orezza|lavazza|negroni|vermouth|amaro|averna|fernet"), "it-IT", "Italiano"),
        (mk("mojito|margarita|tequila|mezcal|sangria|chorizo|jerez|rioja|patron|bacardi|havana"), "es-ES", "Español"),
        (mk("gin|fever|schweppes|coca|cola|whisky|whiskey|bourbon|scotch|ginger beer|london|hendrick|tanqueray|johnnie|jameson|glenfiddich|macallan|lagavulin|talisker|earl grey|english|breakfast|darjeeling|assam|sprite|red bull|old fashioned|mule|sour|bloody|cosmopolitan|tea"), "en-GB", "English"),
        (mk("sencha|matcha|genmaicha|yuzu|sake|hojicha|gyokuro|nikka|suntory|hibiki|yamazaki"), "ja-JP", "日本語"),
        (mk("riesling|gewurz|gewürz|weizen|kirsch|jägermeister|jagermeister|schnaps"), "de-DE", "Deutsch"),
        (mk("porto|port|vinho|madeira|caipirinha|cachaça|cachaca"), "pt-PT", "Português"),
        (mk("rooibos"), "af-ZA", "Afrikaans"),
        (mk("vodka|beluga|grey goose"), "ru-RU", "Русский"),
    ];
    // French-looking names keep the French voice only; the voice names that sound best ✨
    let frenchy = re("(?<![\\wÀ-ÿ])(de|du|des|la|le|les|au|aux|maison|château|noir|supérieur|provence|juillet)(?![\\wÀ-ÿ])|[éèêàçùôî]", "i");
    let qual = re("google|enhanced|premium|natural|neural|siri", "i");

    // 🗂️ the items & the item counter of each chapter
    let mut items: Vec<Item> = Vec::new();
    let mut counts: HashMap<&'static str, usize> = HashMap::new();

    // 🗣️ the speech names of an item (French, English & original language)
    let name_it = |it: &mut Item| {
        let parts: Vec<&str> = it.front.split("<br>").collect();
        let s_n = |html: &str| jtrim(&collapse_ws(&untag(html))).to_string();
        let fr = s_n(parts[0]);
        if fr.is_empty() {
            return;
        }
        let mut en_s = or_str(&[&le["dishes"][fr.as_str()], &le["words"][fr.as_str()]]);
        if it.ch == "vins" {
            let sub = s_n(parts.get(1).copied().unwrap_or(""));
            let col = jtrim(sub.split('·').next().unwrap_or("")).to_string();
            en_s = format!("{}{}", fr, if !col.is_empty() { format!(", {} wine", or_str(&[&le["words"][col.as_str()]]).to_string().chars().collect::<String>().pipe_or(&col)) } else { String::new() });
        }
        if en_s.is_empty() {
            en_s = fr.clone();
        }
        let origin_match = if frenchy.test(&fr) { None } else { orig.iter().find(|(pattern, _, _)| pattern.test(&fr)) };
        it.say = Some(Say { fr, en: en_s, ol: origin_match.map(|origin| origin.1.to_string()), on: origin_match.map(|origin| origin.2.to_string()) });
    };

    // ➕ add!(chapter, front, back, gens, init): adds an item (id = "<chapter>:<index>") and names it
    macro_rules! add {
        ($ch:expr, $front:expr, $back:expr, $gens:expr, $init:expr) => {{
            let ch: &'static str = $ch;
            let count = counts.entry(ch).or_insert(0);
            let id = format!("{}:{}", ch, count);
            *count += 1;
            let mut it = Item { id, ch, front: $front, back: $back, gens: $gens, fact: false, info: None, ikey: None, phdef: None, course: None, csub: String::new(), as2: String::new(), cocktail: None, say: None };
            let init: &dyn Fn(&mut Item) = &$init;
            init(&mut it);
            if !it.fact && ch != "plan" {
                name_it(&mut it);
            }
            items.push(it);
        }};
    }
    // a multiple-choice generator & a shared answer pool
    let mq = |prompt: String, correct: String, pool: Rc<Vec<String>>, explanation: String| Gen::Mcq { prompt, correct, pool, expl: explanation };
    let rcv = |values: Vec<String>| Rc::new(values);


    // ===== ⓘ INFO BUILDERS ℹ️ ===== //

    // 🍽 dish: English, what to say, chef & service notes, words, allergens
    let info_dish = |dish: &Value| -> String {
        let notes = &li["dish"][gs(dish, "n").as_str()];
        let en_d = or_str(&[&dish["en"], &le["dishes"][gs(dish, "n").as_str()]]);
        sec("🇬🇧", &translate("En anglais", "In English"), &esc(&en_d))
            + &sec(SAY, &translate("À dire au client", "What to tell the guest"), &esc(&or_str(&[&notes["say"]])))
            + &sec("👨‍🍳", &translate("Le chef (dégustation)", "From the chef (tasting)"), &esc(&or_str(&[&notes["chef"]])))
            + &sec("🍽", &translate("Au service", "During service"), &esc(&or_str(&[&notes["serv"]])))
            + &sec("📖", &translate("Mots à connaître", "Words to know"), &esc(&or_str(&[&notes["words"]])))
            + &format!("<p class=\"warn\">⚠ {}</p>", allergy)
    };
    // the "what to tell the guest" title, rich whites & big reds (for the pairing idea) 🍷
    let ttl_say = translate("À dire au client", "What to tell the guest");
    let richw = ["Meursault", "Condrieu", "Châteauneuf", "Bandol", "Beaune", "Saint-Joseph", "Pibarnon", "Cardillone", "Leoube", "Minuty, Blanc"];
    let bigr = ["Bandol", "Châteauneuf", "Gigondas", "Saint-Estèphe", "Saint-Émilion", "Crozes", "Saint-Joseph", "Nuits", "Palette", "Penedès", "Sartène"];
    // 👅 the "On the palate" section
    let taste_sec = |taste_key: &str| -> String { let taste = &data["taste"][taste_key]; if truthy(taste) { sec("👅", &translate("En bouche", "On the palate"), &esc(&js(&taste[if en_ { "en" } else { "fr" }]))) } else { String::new() } };
    // 🍷 wine: what to say, palate, appellation, producer, pairing idea
    let info_wine = |wine: &Value| -> String {
        let (wa, ww, wc, wr) = (gs(wine, "a"), gs(wine, "w"), gs(wine, "c"), gs(wine, "r"));
        let app = or_str(&[&li["wineApp"][wa.as_str()]]);
        let prod_key = obj_keys(&li["wineProd"]).into_iter().find(|producer| ww.contains(producer.as_str()));
        let prod = prod_key.map(|producer| js(&li["wineProd"][producer.as_str()])).unwrap_or_default();
        let colour = match wc.as_str() { "Blanc" => "white", "Rosé" => "rosé", "Rouge" => "red", _ => "undefined" };
        let say = if en_ { format!("A {} {} from {}, {}, by {}.", colour, wa, w_(&wr), gs(wine, "v"), ww) } else { format!("Un {} {} ({}), millésime {}, de {}.", if wc == "Blanc" { "blanc" } else if wc == "Rosé" { "rosé" } else { "rouge" }, wa, wr, gs(wine, "v"), ww) };
        let aw = format!("{} {}", wa, ww);
        let pk = if wc == "Blanc" { if richw.iter().any(|marker| aw.contains(marker)) { "BlancRich" } else { "Blanc" } } else if wc == "Rosé" { "Rosé" } else if bigr.iter().any(|marker| wa.contains(marker)) { "RougeBig" } else { "Rouge" };
        sec(SAY, &ttl_say, &esc(&say)) + &taste_sec(&format!("{}|{}@{}", ww, wc, wa)) + &sec("🍇", &translate("L'appellation", "The appellation"), &esc(&app)) + &sec("🏡", &translate("Le domaine", "The producer"), &esc(&prod)) + &sec("🍽", &translate("Accord suggéré", "Pairing idea"), &esc(&or_str(&[&li["pairWith"][pk]])))
    };
    // 🥂 champagne: what to say, palate, words, format
    let info_champ = |champagne: &Value| -> String {
        let (cn, ct) = (gs(champagne, "n"), gs(champagne, "t"));
        let hk = obj_keys(&li["champagne"]).into_iter().find(|house| cn.contains(house.as_str()));
        let both = format!("{} {}", cn, ct);
        let terms: Vec<String> = obj_keys(&li["champagneTerms"]).into_iter().filter(|term| both.contains(term.as_str())).map(|term| js(&li["champagneTerms"][term.as_str()])).collect();
        sec(SAY, &ttl_say, &esc(&hk.map(|house| js(&li["champagne"][house.as_str()])).unwrap_or_default())) + &taste_sec(&format!("c:{}", cn)) + &sec("📖", &translate("Mots à connaître", "Words to know"), &esc(&terms.join(" "))) + &sec("🇬🇧", &translate("Format", "Serving"), &esc(&{
            let english = &le["words"][ct.as_str()];
            if truthy(english) { js(english) } else { ct.clone() }
        }))
    };
    // 🍸 cocktail · 🥤 soft · 🍵 tea · ☕ coffee · 🥃 digestif · 🍇 pairing wine
    let info_cock = |cocktail: &Value| -> String {
        let cn = gs(cocktail, "n");
        let english = &le["cocktails"][cn.as_str()];
        sec("🇬🇧", &translate("En anglais", "In English"), &esc(&or_str(&[&english["desc"]]))) + &sec(SAY, &ttl_say, &esc(&or_str(&[&li["cocktail"][cn.as_str()]]))) + &(if tk(cocktail, "note") { format!("<p class=\"warn\">⚠ {}</p>", esc(&if en_ && tk(english, "note") { js(&english["note"]) } else { js(&cocktail["note"]) })) } else { String::new() })
    };
    let info_soft = |soft: &Value| -> String {
        let name = gs(soft, "n");
        sec("🇬🇧", &translate("En anglais", "In English"), &esc(&or_str(&[&le["softs"][name.as_str()]]))) + &sec(SAY, &ttl_say, &esc(&or_str(&[&li["soft"][name.as_str()], &li["cocktail"][name.as_str()]])))
    };
    let info_tea = |tv: &Value| -> String {
        let name = gs(tv, "n");
        let english = &le["teas"][name.as_str()];
        let txt = match english.as_array() { Some(pair) if !pair.is_empty() => format!("{} — {}", js(&pair[0]), pair.get(1).map(js).unwrap_or("undefined".into())), _ => String::new() };
        sec("🇬🇧", &translate("En anglais", "In English"), &esc(&txt)) + &sec(SAY, &ttl_say, &esc(&or_str(&[&li["tea"][name.as_str()]])))
    };
    let info_coffee = |coffee: &Value| -> String {
        let name = gs(coffee, "n");
        let say = if name == "Thé / infusion" { if !en_ && tk(&li, "teaCoffee") { js(&li["teaCoffee"]) } else { "Teas and herbal teas from Maison Père Blaize, Marseille's historic herbalist (founded 1815). Eight choices — see the tea list.".into() } } else { or_str(&[&li["coffee"]]) };
        sec("🇬🇧", &translate("En anglais", "In English"), &esc(&{
            let english = &le["coffee"][name.as_str()];
            if truthy(english) { js(english) } else { name.clone() }
        })) + &sec(SAY, &ttl_say, &esc(&say))
    };
    let info_dig = |digestif: &Value| -> String {
        let name = gs(digestif, "n");
        sec("🇬🇧", &translate("En anglais", "In English"), &esc(&or_str(&[&le["digestifs"][name.as_str()]]))) + &sec(SAY, &ttl_say, &esc(&or_str(&[&li["digestif"][name.as_str()]])))
    };
    let info_pair = |wine: &Value| -> String {
        let name = gs(wine, "n");
        let english = &le["pairing"][name.as_str()];
        let course = gs(wine, "course");
        let say = if en_ {
            let course_en = match course.as_str() { "Entrée" => "starter", "Plat poisson" => "fish course", "Plat viande" => "meat course", "Dessert" => "dessert", _ => "undefined" };
            format!("The {} pairing of the Tasting Menu (+55 € per person). {}.", course_en, or_str(&[&english["t"]]))
        } else {
            let course_fr = match course.as_str() { "Entrée" => "de l'entrée", "Plat poisson" => "du plat poisson", "Plat viande" => "du plat viande", "Dessert" => "du dessert", _ => "undefined" };
            format!("L'accord {} du Menu Dégustation (+55 € par personne). {}.", course_fr, gs(wine, "t"))
        };
        sec(SAY, &ttl_say, &esc(&say)) + &(if truthy(&wine["tk"]) { taste_sec(&gs(wine, "tk")) } else { String::new() }) + &sec("🍇", &translate("Cépages", "Grapes"), &esc(&if en_ { or_str(&[&english["g"], &wine["g"]]) } else { gs(wine, "g") }))
    };


    // ===== PHOTO KEYS 📸 ===== //

    // the first key that has a photo, the pairing wine keys & the placeholder per colour
    let first_key = |ks: &[String]| -> String { ks.iter().find(|key| !key.is_empty() && truthy(&img[key.as_str()])).cloned().unwrap_or_else(|| ks[0].clone()) };
    let pairkey = |name: &str| -> Option<&'static str> {
        Some(match name {
            "Susucaru Rosato — Sicile" => "w:Frank Cornelissen, Susucaru Rosato|Rosé",
            "Indigena Blanc — Espagne" => "w:Domaine Parés Baltà, Cuvée Indigena|Blanc",
            "Octave Blanc — Grèce" => "w:Sous le Végétal, Cuvée Octave|Blanc",
            "Pero Longo Rouge — Corse" => "w:Domaine Pero Longo, Cuvée Équilibre|Rouge",
            "Indigena Rouge — Espagne" => "w:Domaine Parés Baltà, Cuvée Indigena|Rouge",
            "Câlin Polisson — Provence" => "g:Câlin Polisson",
            _ => return None,
        })
    };
    let phdef = |wine_colour: &str| -> Option<String> {
        match wine_colour { "Blanc" => Some("img/_ph-blanc.jpg".into()), "Rosé" => Some("img/_ph-rose.jpg".into()), "Rouge" => Some("img/_ph-rouge.jpg".into()), _ => None }
    };


    // ===== BUILD: DISHES 🍽 ===== //

    // today (UTC) & whether the winter menu has started ❄️
    let today = crate::state::today();
    let winter = today.as_str() >= "2026-10-19";
    // the dishes still on the menu (summer items carry an `until` date)
    let empty = vec![];
    let dishes: Vec<&Value> = data["dishes"].as_array().unwrap_or(&empty).iter().filter(|dish| !(tk(dish, "until") && today >= gs(dish, "until"))).collect();
    // helpers: services, course, labels, prices, English
    let has = |dish: &Value, service: &str| dish["svc"].as_array().map(|services| services.iter().any(|entry| entry.as_str() == Some(service))).unwrap_or(false);
    let c_sub = |dish: &Value| -> String {
        match gs(dish, "s").as_str() { "Poisson" | "De la mer" => translate("poisson", "fish"), "Viande" | "De la terre" => translate("viande", "meat"), _ => String::new() }
    };
    let sections = uniq(&dishes.iter().map(|dish| gs(dish, "s")).collect::<Vec<_>>());
    let degs = ["Amuse-bouche", "Entrée dégustation", "Poisson", "Viande", "Dessert dégustation"];
    let (svc_g, svc_h, svc_f, svc_b, svc_d, svc_l) = (
        translate("Menu Dégustation du jour", "Tasting menu of the day"),
        translate("Carte d'hiver (dès le 19 octobre)", "Winter menu (from 19 October)"),
        translate("Formule de la semaine (49 €)", "Weekly formula (49 €)"),
        translate("Déjeuner et dîner", "Lunch and dinner"),
        translate("Dîner uniquement", "Dinner only"),
        translate("Déjeuner uniquement", "Lunch only"),
    );
    let svc_base = |dish: &Value| -> String {
        if has(dish, "formule") { svc_f.clone() } else if has(dish, "dej") && has(dish, "diner") { svc_b.clone() } else if has(dish, "diner") { svc_d.clone() } else { svc_l.clone() }
    };
    let h_pre = |dish: &Value| -> String { if has(dish, "hiver") && !winter { format!("{} · ", svc_h) } else { String::new() } };
    let svc_label = |dish: &Value| -> String {
        if has(dish, "deg") { svc_g.clone() } else if has(dish, "hiver") && !has(dish, "dej") && !has(dish, "diner") { svc_h.clone() } else { h_pre(dish) + &svc_base(dish) }
    };
    let unit_txt = |unit: &str| -> String { if en_ { if unit == "les 100 g" { "per 100 g".into() } else { unit.into() } } else { unit.into() } };
    let dish_price = |dish: &Value| -> Option<String> {
        if dish["p"].is_null() && dish.get("p").is_some() {
            return None;
        }
        Some(eur_o(dish, "p") + &(if tk(dish, "unit") { format!(" {}", unit_txt(&gs(dish, "unit"))) } else { String::new() }))
    };
    let d_en = |dish: &Value| -> String { or_str(&[&dish["en"], &le["dishes"][gs(dish, "n").as_str()]]) };
    let d_desc = |dish: &Value| -> String { if en_ { let english = d_en(dish); if !english.is_empty() { english } else { gs(dish, "d") } } else { gs(dish, "d") } };
    let p2lab = |dish: &Value| -> String { if en_ { "as a main".into() } else { gs(dish, "p2label") } };

    // the shared answer pools of the dish questions 🎯
    let price_pool = rcv(dishes.iter().filter(|dish| !dish["p"].is_null()).map(|dish| dish_price(dish).unwrap_or("null".into())).collect());
    let name_pool = rcv(dishes.iter().map(|dish| gs(dish, "n")).collect());
    let desc_pool = rcv(dishes.iter().filter(|dish| tk(dish, "d")).map(|dish| gs(dish, "d")).collect());
    let en_pool = rcv(dishes.iter().map(|dish| d_en(dish)).filter(|dish| !dish.is_empty()).collect());
    let corder_pool = rcv(CORDER.iter().map(|course_key| c_both(course_key)).collect());
    let sec_deg = rcv(degs.iter().map(|section| w_(section)).collect());
    let sec_form = rcv(["Entrée", "Plat", "Dessert"].iter().map(|section| w_(section)).collect());
    let sec_other = rcv(sections.iter().filter(|section| !["Entrée", "Plat", "Dessert"].contains(&section.as_str()) && !degs.contains(&section.as_str())).map(|section| w_(section)).collect());
    // allergen hints & the course explanation
    let allerg_re = re("noisette|jambon|cochon|chorizo|thon|calamar|loup|Saint-Pierre|maigre|pêche suivant|crabe|huîtres|palourdes|Saint-Jacques|rouget|poutargue", "i");
    let re_nois = re("noisette", "i");
    let re_porc = re("jambon|cochon", "i");
    let course_expl = translate("Pour commencer = petites choses à partager en attendant ; Entrée = premier plat (≠ « entrée » américaine, qui veut dire plat principal !) ; Plat = plat principal.", "Appetizer = small bites to share first; Starter (French \"entrée\") = first course (careful: in American English \"entrée\" means main course!); Main course = the \"plat\".");

    // ❄️ winter menu: lunch too? & the pictograms
    let hidej = vec![translate("Oui, midi et soir", "Yes, lunch and dinner"), translate("Non, le soir uniquement", "No, dinner only")];
    let hidej_pool = rcv(hidej.clone());
    let pict_lab = |pictogram: &str| -> String {
        let (french, english) = match pictogram {
            "veg" => ("🌿 Feuille (végétarien)", "🌿 Leaf (vegetarian)"),
            "crab" => ("🦀 Crabe (crustacé)", "🦀 Crab (crustacean)"),
            "shell" => ("🐚 Coquillage", "🐚 Shell (shellfish)"),
            "fish" => ("🐟 Poisson", "🐟 Fish"),
            "duck" => ("🦆 Canard", "🦆 Duck"),
            "poultry" => ("🐓 Volaille", "🐓 Poultry"),
            "beef" => ("🐄 Bœuf", "🐄 Beef"),
            "shell+pork" => ("🐚 + 🐖 Coquillage et porc", "🐚 + 🐖 Shellfish and pork"),
            _ => ("Aucun pictogramme", "No pictogram"),
        };
        translate(french, english)
    };
    let pict_pool = rcv(["veg", "crab", "shell", "fish", "duck", "poultry", "beef", "shell+pork", ""].iter().map(|pictogram| pict_lab(pictogram)).collect());
    let hidej_expl = translate("Sur la fiche, les plats surlignés en jaune sont aussi à la carte du midi.", "On the sheet, dishes highlighted in yellow are also on the lunch menu.");
    let pict_expl = translate("Les pictogrammes indiquent le produit principal (pas tous les allergènes) : toujours confirmer avec la cuisine.", "Pictograms show the main product (not every allergen): always confirm with the kitchen.");
    // 🍽 every dish becomes one item per chapter it belongs to
    for dish_ref in &dishes {
        let dish: &Value = dish_ref;
        let chs: Vec<&'static str> = if has(dish, "deg") { vec!["diner"] } else if gs(dish, "s") == "Desserts" || gs(dish, "s") == "Fromages" { vec!["dess"] } else if has(dish, "formule") { vec!["dej"] } else if has(dish, "dej") { vec!["dej", "diner"] } else { vec!["diner"] };
        let mut chs = chs;
        if has(dish, "hiver") { chs.push("hiver"); }
        if has(dish, "deg") { chs.push("jour"); }
        let dn = gs(dish, "n");
        let dd = gs(dish, "d");
        let ds = gs(dish, "s");
        let course = course_of(&ds);
        for chapter in chs {
            let mut gens = vec![];
            if !dish["p"].is_null() {
                let dp = dish_price(dish).unwrap_or("null".into());
                let ex = format!("{} : {}{}.", dn, dp, if tk(dish, "p2") { format!(" ({} {})", eur(&dish["p2"]), p2lab(dish)) } else { String::new() });
                gens.push(mq(translate(&format!("Combien coûte « {} » ?", dn), &format!("How much is \"{}\"?", dn)), dp, price_pool.clone(), ex));
            }
            if tk(dish, "d") {
                gens.push(mq(if en_ { format!("Which dish is this: \"{}\"?", d_desc(dish)) } else { format!("Quel plat est servi avec : « {} » ?", dd) }, dn.clone(), name_pool.clone(), format!("{} — {}.", dn, dd)));
                gens.push(mq(translate(&format!("Comment est accompagné(e) « {} » ?", dn), &format!("What comes with \"{}\"?", dn)), dd.clone(), desc_pool.clone(), d_en(dish)));
            }
            let spool = if has(dish, "deg") { sec_deg.clone() } else if has(dish, "formule") { sec_form.clone() } else { sec_other.clone() };
            gens.push(mq(translate(&format!("Dans quelle section de la carte se trouve « {} » ?", dn), &format!("Which section of the menu is \"{}\" in?", dn)), w_(&ds), spool, String::new()));
            if !d_en(dish).is_empty() {
                gens.push(mq(translate(&format!("Comment présenter « {} » à un client anglophone ?", dn), &format!("How do you describe \"{}\" to an English-speaking guest?", dn)), d_en(dish), en_pool.clone(), String::new()));
            }
            if let Some(course_key) = course {
                gens.push(mq(translate(&format!("« {} » : c'est quoi ?", dn), &format!("\"{}\": what kind of course is it?", dn)), c_both(course_key), corder_pool.clone(), course_expl.clone()));
            }
            let vpool: Vec<String> = if has(dish, "deg") { vec![svc_g.clone(), svc_f.clone(), svc_b.clone(), svc_d.clone()] } else if has(dish, "hiver") { [&svc_b, &svc_d, &svc_l, &svc_f].iter().map(|service| h_pre(dish) + service).collect() } else { vec![svc_f.clone(), svc_b.clone(), svc_d.clone(), svc_l.clone()] };
            gens.push(mq(translate(&format!("Quand « {} » est-il à la carte ?", dn), &format!("When is \"{}\" on the menu?", dn)), svc_label(dish), rcv(vpool), String::new()));
            if allerg_re.test(&format!("{} {}", dn, dd)) {
                let choices = vec![translate("Fruits à coque (noisette)", "Nuts (hazelnut)"), translate("Porc", "Pork"), translate("Poisson / produits de la mer", "Fish / seafood"), translate("Rien de tout cela", "None of these")];
                let nd = format!("{}{}", dn, dd);
                let tt = if re_nois.test(&nd) { choices[0].clone() } else if re_porc.test(&nd) { choices[1].clone() } else { choices[2].clone() };
                gens.push(mq(translate(&format!("D'après la carte, que contient « {} » ?", dn), &format!("According to the menu, what does \"{}\" contain?", dn)), tt, rcv(choices), allergy.clone()));
            }
            if chapter == "hiver" && ds != "Desserts" && ds != "Fromages" {
                gens.push(mq(translate(&format!("« {} » est-il aussi sur la carte du midi ?", dn), &format!("Is \"{}\" also on the lunch menu?", dn)), if has(dish, "dej") { hidej[0].clone() } else { hidej[1].clone() }, hidej_pool.clone(), hidej_expl.clone()));
                gens.push(mq(translate(&format!("Quel pictogramme accompagne « {} » sur la carte ?", dn), &format!("Which pictogram is next to \"{}\" on the menu?", dn)), pict_lab(&gs(dish, "pict")), pict_pool.clone(), pict_expl.clone()));
            }
            if chapter == "hiver" {
                let al = alg_of(dish);
                if let Some((k0, _)) = al.iter().find(|allergen| !allergen.1) {
                    let mut pool = vec![alg_lab(k0)];
                    pool.extend(ALGK.iter().filter(|code| !al.iter().any(|allergen| allergen.0 == **code)).map(|code| alg_lab(code)));
                    gens.push(mq(translate(&format!("Quel allergène contient « {} » ?", dn), &format!("Which allergen is in \"{}\"?", dn)), alg_lab(k0), rcv(pool), alg_note()));
                }
            }
            let desc = if en_ {
                let english = d_en(dish);
                if !english.is_empty() { format!("{}<br><small>{}</small><br>", esc(&english), esc(&dd)) } else { String::new() }
            } else {
                format!("{}{}", if tk(dish, "d") { format!("{}<br>", dd) } else { String::new() }, if tk(dish, "en") { format!("<i>{}</i><br>", esc(&gs(dish, "en"))) } else { String::new() })
            };
            let cs = c_sub(dish);
            let back = format!(
                "{}{}<b>{}</b> · {}{}{}",
                match course { Some(course_key) => format!("<span class=\"cb cb-{}\">{}{}</span> ", course_key, c_lab(course_key), if !cs.is_empty() { format!(" · {}", cs) } else { String::new() }), None => String::new() },
                desc,
                w_(&ds),
                svc_label(dish),
                if !dish["p"].is_null() { format!(" · {}", dish_price(dish).unwrap_or_default()) } else { String::new() },
                if tk(dish, "p2") { format!(" / {} {}", eur(&dish["p2"]), p2lab(dish)) } else { String::new() }
            );
            let info = info_dish(dish);
            let ikey = format!("d:{}", dn);
            let as2 = if tk(dish, "p2") { p2lab(dish) } else { String::new() };
            add!(chapter, dn.clone(), back, gens, |it: &mut Item| {
                it.info = Some(info.clone());
                it.ikey = Some(ikey.clone());
                it.course = course;
                it.csub = cs.clone();
                it.as2 = as2.clone();
            });
        }
    }


    // ===== BUILD: FIXED FACTS 📌 ===== //

    // the fixed facts of the dinner chapter (+ the daily briefing & the winter facts)
    let fq = &factqs[if en_ { "en" } else { "fr" }];
    for fact in fq.as_array().unwrap_or(&empty) {
        let (qq, answer) = (js(&fact[0]), js(&fact[1]));
        let options: Vec<String> = fact[2].as_array().unwrap_or(&empty).iter().map(js).collect();
        add!("diner", qq.clone(), answer.clone(), vec![mq(qq.clone(), answer.clone(), rcv(options), String::new())], |it: &mut Item| it.fact = true);
    }
    for fact in data["jour"][if en_ { "en" } else { "fr" }].as_array().unwrap_or(&empty) {
        let (qq, answer) = (js(&fact[0]), js(&fact[1]));
        let options: Vec<String> = fact[2].as_array().unwrap_or(&empty).iter().map(js).collect();
        let explanation = js(&fact[3]);
        add!("jour", qq.clone(), answer.clone(), vec![mq(qq.clone(), answer.clone(), rcv(options), explanation)], |it: &mut Item| it.fact = true);
    }
    for fact in data["hq"][if en_ { "en" } else { "fr" }].as_array().unwrap_or(&empty) {
        let (qq, answer) = (js(&fact[0]), js(&fact[1]));
        let options: Vec<String> = fact[2].as_array().unwrap_or(&empty).iter().map(js).collect();
        let explanation = js(&fact[3]);
        add!("hiver", qq.clone(), answer.clone(), vec![mq(qq.clone(), answer.clone(), rcv(options), explanation)], |it: &mut Item| it.fact = true);
    }
    // the "Did you know?" facts of the hub
    let facts_v = if en_ && tk(&le, "facts") { &le["facts"] } else { &data["facts"] };
    let facts: Vec<String> = facts_v.as_array().unwrap_or(&empty).iter().map(js).collect();


    // ===== BUILD: COCKTAILS & SOFTS 🍸 ===== //

    // the cocktails & their English strings
    let cocktails: Vec<Value> = data["cocktails"].as_array().cloned().unwrap_or_default();
    let ce = |cocktail: &Value| -> Value { le["cocktails"][gs(cocktail, "n").as_str()].clone() };
    let recipe = |cocktail: &Value| -> Vec<Value> { cocktail["recipe"].as_array().cloned().unwrap_or_default() };
    // every ingredient (for the bar game & the wrong answers)
    let mut all_ingr_raw = vec![];
    for cocktail in &cocktails {
        for ingredient_line in recipe(cocktail) {
            all_ingr_raw.push(wv(&ingredient_line[0]));
        }
    }
    let all_ingr = uniq(&all_ingr_raw);
    // the doses, the recipe text & the method / batch / note in the current language 🧪
    let doses = rcv([0.5, 1.0, 2.0, 3.0, 4.0, 6.0, 8.0, 9.0, 12.0, 14.0, 24.0, 25.0, 30.0, 35.0, 40.0].iter().map(|volume: &f64| format!("{} cl", jsnum(*volume).replacen('.', if en_ { "." } else { "," }, 1))).collect());
    let dose = |volume: &Value| format!("{} cl", js(volume).replacen('.', if en_ { "." } else { "," }, 1));
    let recipe_txt = |cocktail: &Value| -> String { recipe(cocktail).iter().map(|ingredient_line| format!("{}{}", if ingredient_line[1].is_number() { dose(&ingredient_line[1]) + " " } else { wv(&ingredient_line[1]) + " " }, wv(&ingredient_line[0]))).collect::<Vec<_>>().join(", ") };
    let c_method = |cocktail: &Value| -> String { let english = ce(cocktail); if en_ && tk(&english, "method") { js(&english["method"]) } else { gs(cocktail, "method") } };
    let c_batch = |cocktail: &Value| -> String { let english = ce(cocktail); if en_ && tk(&english, "batch") { js(&english["batch"]) } else { gs(cocktail, "batch") } };
    let c_note = |cocktail: &Value| -> String { if tk(cocktail, "note") { let english = ce(cocktail); if en_ && tk(&english, "note") { js(&english["note"]) } else { js(&cocktail["note"]) } } else { String::new() } };
    // the shared answer pools of the cocktail questions
    let ingr_pool = rcv(cocktails.iter().map(|cocktail| recipe(cocktail).iter().map(|ingredient_line| wv(&ingredient_line[0])).collect::<Vec<_>>().join(" + ")).collect());
    let mut glass_pool = uniq(&cocktails.iter().map(|cocktail| wv(&cocktail["glass"])).collect::<Vec<_>>());
    glass_pool.push(translate("Coupe Martini", "Martini glass"));
    glass_pool.push("Tumbler".into());
    let glass_pool = rcv(glass_pool);
    let cprice_pool = rcv(["7 €", "10 €", "13 €", "14 €", "22 €", "24 €", "26 €"].iter().map(|price| price.to_string()).collect());
    let method_pool = rcv(cocktails.iter().map(|cocktail| c_method(cocktail)).collect());
    let garn_pool = rcv(uniq(&cocktails.iter().map(|cocktail| wv(&cocktail["garnish"])).collect::<Vec<_>>()).into_iter().filter(|garnish| garnish != "—").collect());
    // 🍸 every cocktail: ingredients, glass, price, method, garnish & each dose
    for (ci, cocktail) in cocktails.iter().enumerate() {
        let cn = gs(cocktail, "n");
        let mut gens = vec![
            mq(translate(&format!("Quels ingrédients composent « {} » ?", cn), &format!("What goes into \"{}\"?", cn)), recipe(cocktail).iter().map(|ingredient_line| wv(&ingredient_line[0])).collect::<Vec<_>>().join(" + "), ingr_pool.clone(), recipe_txt(cocktail)),
            mq(translate(&format!("Dans quel verre sert-on « {} » ?", cn), &format!("Which glass is \"{}\" served in?", cn)), wv(&cocktail["glass"]), glass_pool.clone(), c_method(cocktail)),
            mq(translate(&format!("Prix de « {} » à la carte ?", cn), &format!("Menu price of \"{}\"?", cn)), eur_o(cocktail, "p"), cprice_pool.clone(), String::new()),
            mq(translate(&format!("Comment prépare-t-on « {} » ?", cn), &format!("How is \"{}\" made?", cn)), c_method(cocktail), method_pool.clone(), c_note(cocktail)),
        ];
        if tk(cocktail, "garnish") && gs(cocktail, "garnish") != "—" {
            gens.push(mq(translate(&format!("Garniture de « {} » ?", cn), &format!("Garnish for \"{}\"?", cn)), wv(&cocktail["garnish"]), garn_pool.clone(), String::new()));
        }
        for ingredient_line in recipe(cocktail).iter().filter(|ingredient_line| ingredient_line[1].is_number()) {
            let qq = if en_ {
                format!("How much {} in \"{}\"{}?", wv(&ingredient_line[0]), cn, if tk(cocktail, "batch") { format!(" (batch: {})", c_batch(cocktail)) } else { String::new() })
            } else {
                format!("Combien de {} dans « {} »{} ?", js(&ingredient_line[0]), cn, if tk(cocktail, "batch") { format!(" (préparation {})", gs(cocktail, "batch")) } else { String::new() })
            };
            gens.push(mq(qq, dose(&ingredient_line[1]), doses.clone(), recipe_txt(cocktail) + &(if tk(cocktail, "note") { format!(" — {}", c_note(cocktail)) } else { String::new() })));
        }
        let english = ce(cocktail);
        let desc = if en_ { format!("<i>{}</i><br>", esc(&or_str(&[&english["desc"], &cocktail["desc"]]))) } else { String::new() };
        let back = format!(
            "{}<b>{}</b>{}<br>{} : {} · {} : {}<br>{}<br>{} : {}{}",
            desc,
            recipe_txt(cocktail),
            if tk(cocktail, "batch") { format!("<br>{} : {}", translate("Préparation", "Batch"), c_batch(cocktail)) } else { String::new() },
            translate("Verre", "Glass"),
            wv(&cocktail["glass"]),
            translate("Garniture", "Garnish"),
            wv(&cocktail["garnish"]),
            esc(&c_method(cocktail)),
            translate("Prix", "Price"),
            eur_o(cocktail, "p"),
            if tk(cocktail, "note") { format!("<br><span class=\"warn\">⚠ {}</span>", esc(&c_note(cocktail))) } else { String::new() }
        );
        let info = info_cock(cocktail);
        add!("cock", cn.clone(), back, gens, |it: &mut Item| {
            it.cocktail = Some(ci);
            it.info = Some(info.clone());
            it.ikey = Some(format!("k:{}", cn));
            it.phdef = Some("img/_ph-soft.jpg".into());
        });
    }
    // 🥤 every soft drink: its price
    let softs: Vec<Value> = data["softs"].as_array().cloned().unwrap_or_default();
    let s_d = |soft: &Value| -> String { let english = &le["softs"][gs(soft, "n").as_str()]; if en_ && truthy(english) { js(english) } else { gs(soft, "d") } };
    let mut sp: Vec<String> = softs.iter().map(|soft| eur_o(soft, "p")).collect();
    sp.push("9 €".into());
    sp.push("12 €".into());
    let sp = rcv(sp);
    for soft in &softs {
        let name = gs(soft, "n");
        let gens = vec![mq(translate(&format!("Prix de « {} » ({}) ?", name, gs(soft, "d")), &format!("Price of \"{}\" ({})?", name, s_d(soft))), eur_o(soft, "p"), sp.clone(), String::new())];
        let info = info_soft(soft);
        let ik = first_key(&[format!("s:{}", name), format!("k:{}", name)]);
        add!("cock", name.clone(), format!("{} · {}", s_d(soft), eur_o(soft, "p")), gens, |it: &mut Item| {
            it.info = Some(info.clone());
            it.ikey = Some(ik.clone());
            it.phdef = Some("img/_ph-soft.jpg".into());
        });
    }


    // ===== BUILD: COFFEE & TEAS ☕ ===== //

    // the coffee note & the coffee names
    let coffee_note = if en_ && tk(&le, "coffeeNote") { js(&le["coffeeNote"]) } else { gs(&data, "coffeeNote") };
    let cfn = |coffee: &Value| -> String { let english = &le["coffee"][gs(coffee, "n").as_str()]; if en_ && truthy(english) { js(english) } else { gs(coffee, "n") } };
    // ☕ every coffee: its lunch & dinner prices
    let five = rcv(["5 €", "6 €", "7 €", "8 €", "9 €"].iter().map(|price| price.to_string()).collect());
    for coffee in data["coffee"].as_array().cloned().unwrap_or_default() {
        let mut gens = vec![];
        for sv in ["dej", "diner"] {
            if !coffee[sv].is_null() {
                let qq = if en_ { format!("At {}, how much is: {}?", if sv == "dej" { "LUNCH" } else { "DINNER" }, cfn(&coffee)) } else { format!("{}, combien coûte : {} ?", if sv == "dej" { "Au DÉJEUNER" } else { "Au DÎNER" }, gs(&coffee, "n")) };
                gens.push(mq(qq, eur_o(&coffee, sv), five.clone(), translate("Attention : les prix des cafés diffèrent entre la carte du déjeuner et celle du dîner.", "Careful: coffee prices differ between the lunch and dinner menus.")));
            }
        }
        let back = format!("{} : {} · {} : {}<br><small>{}</small>", translate("Déjeuner", "Lunch"), eur_o(&coffee, "dej"), translate("Dîner", "Dinner"), if coffee["diner"].is_null() { "—".to_string() } else { eur_o(&coffee, "diner") }, coffee_note);
        let info = info_coffee(&coffee);
        let ik = if gs(&coffee, "n") == "Thé / infusion" { "t:_tisane" } else { "f:_coffee" };
        add!("cafe", cfn(&coffee), back, gens, |it: &mut Item| {
            it.info = Some(info.clone());
            it.ikey = Some(ik.to_string());
        });
    }
    // 🍵 every tea: which one contains ... & what's in it
    let teas: Vec<Value> = data["teas"].as_array().cloned().unwrap_or_default();
    let t_e = |tv: &Value| -> (String, String) {
        match le["teas"][gs(tv, "n").as_str()].as_array() {
            Some(pair) => (pair.first().map(js).unwrap_or("undefined".into()), pair.get(1).map(js).unwrap_or("undefined".into())),
            None => (gs(tv, "n"), gs(tv, "i")),
        }
    };
    let t_i = |tv: &Value| -> String { if en_ { t_e(tv).1 } else { gs(tv, "i") } };
    let tname_pool = rcv(teas.iter().map(|tea| gs(tea, "n")).collect());
    let ti_pool = rcv(teas.iter().map(|tea| t_i(tea)).collect());
    for tv in &teas {
        let name = gs(tv, "n");
        let gens = vec![
            mq(translate(&format!("Quelle infusion contient : {} ?", gs(tv, "i")), &format!("Which tea contains: {}?", t_i(tv))), name.clone(), tname_pool.clone(), "Maison Père Blaize — 8 €".into()),
            mq(translate(&format!("Que contient « {} » ?", name), &format!("What is in \"{}\"?", name)), t_i(tv), ti_pool.clone(), String::new()),
        ];
        let back = format!("{}{} · 8 €", if en_ { format!("<i>{}</i><br>", esc(&t_e(tv).0)) } else { String::new() }, t_i(tv));
        let info = info_tea(tv);
        let ik = first_key(&[format!("t:{}", name), "t:_tisane".into()]);
        add!("cafe", name.clone(), back, gens, |it: &mut Item| {
            it.info = Some(info.clone());
            it.ikey = Some(ik.clone());
        });
    }


    // ===== BUILD: WINES 🍷 ===== //

    // the wine list, labels, prices & answer pools
    let wn: Vec<Value> = data["wines"].as_array().cloned().unwrap_or_default();
    let wlabel = |wine: &Value| format!("{} — {} {} ({})", gs(wine, "a"), gs(wine, "w"), gs(wine, "v"), wv(&wine["c"]).to_lowercase());
    let wprice = |wine: &Value| -> String { if tk(wine, "p2") { if en_ { format!("{} a glass / {} a bottle", eur_o(wine, "p"), eur(&wine["p2"])) } else { format!("{} le verre / {} la bouteille", eur_o(wine, "p"), eur(&wine["p2"])) } } else { eur_o(wine, "p") } };
    let regions = rcv(uniq(&wn.iter().map(|wine| wv(&wine["r"])).collect::<Vec<_>>()));
    let wp_glass = rcv(wn.iter().filter(|candidate| tk(candidate, "p2")).map(|candidate| wprice(candidate)).collect());
    let wp_bottle = rcv(wn.iter().filter(|candidate| !tk(candidate, "p2")).map(|candidate| wprice(candidate)).collect());
    let vint_pool = rcv(wn.iter().map(|candidate| gs(candidate, "v")).collect());
    let col_pool = rcv(["Blanc", "Rosé", "Rouge"].iter().map(|colour_name| w_(colour_name)).collect());
    // 🍷 every wine: region, price, vintage, colour & producer
    for wine in &wn {
        let (appellation, ww, vintage, wine_colour, format) = (gs(wine, "a"), gs(wine, "w"), gs(wine, "v"), gs(wine, "c"), gs(wine, "f"));
        let bad: Vec<String> = wn.iter().filter(|candidate| gs(candidate, "a") != appellation).map(|candidate| gs(candidate, "w")).filter(|producer| !wn.iter().any(|wine_entry| gs(wine_entry, "a") == appellation && &gs(wine_entry, "w") == producer)).collect();
        let gens = vec![
            mq(translate(&format!("De quelle région vient : {}, {} {} ?", appellation, ww, vintage), &format!("Which region is this from: {}, {} {}?", appellation, ww, vintage)), wv(&wine["r"]), regions.clone(), String::new()),
            mq(translate(&format!("Prix de {} — {} ?", wlabel(wine), format), &format!("Price of {} — {}?", wlabel(wine), w_(&format))), wprice(wine), if tk(wine, "p2") { wp_glass.clone() } else { wp_bottle.clone() }, String::new()),
            mq(translate(&format!("Quel millésime pour {}, {} ({}, {}) ?", appellation, ww, wine_colour.to_lowercase(), format), &format!("Which vintage: {}, {} ({}, {})?", appellation, ww, w_(&wine_colour).to_lowercase(), w_(&format))), vintage.clone(), vint_pool.clone(), String::new()),
            mq(translate(&format!("Couleur de {}, {} {} ?", appellation, ww, vintage), &format!("Colour of {}, {} {}?", appellation, ww, vintage)), w_(&wine_colour), col_pool.clone(), String::new()),
            mq(translate(&format!("Quel domaine/maison propose le {} {} {} ({}) ?", appellation, wine_colour.to_lowercase(), vintage, format), &format!("Which producer makes the {} {} {} ({})?", w_(&wine_colour).to_lowercase(), appellation, vintage, w_(&format))), ww.clone(), rcv(bad), String::new()),
        ];
        let info = info_wine(wine);
        let ik = first_key(&[format!("w:{}|{}@{}", ww, wine_colour, appellation), format!("w:{}|{}", ww, wine_colour)]);
        let pd = phdef(&wine_colour);
        add!("vins", format!("{}<br><small>{} · {}</small>", appellation, w_(&wine_colour), w_(&format)), format!("{} {}<br>{} · {}", ww, vintage, wv(&wine["r"]), wprice(wine)), gens, |it: &mut Item| {
            it.info = Some(info.clone());
            it.ikey = Some(ik.clone());
            it.phdef = pd.clone();
        });
    }


    // ===== BUILD: CHAMPAGNES 🥂 ===== //

    // the champagne list & answer pools
    let cc: Vec<Value> = data["champagnes"].as_array().cloned().unwrap_or_default();
    let cp_pool = rcv(cc.iter().map(|candidate| eur_o(candidate, "p")).collect());
    let ct_pool = rcv(uniq(&cc.iter().map(|candidate| wv(&candidate["t"])).collect::<Vec<_>>()));
    // 🥂 every champagne: price & category
    for champagne in &cc {
        let (name, tt) = (gs(champagne, "n"), gs(champagne, "t"));
        let gens = vec![
            mq(translate(&format!("Prix de {} — {} ?", name, tt), &format!("Price of {} — {}?", name, w_(&tt))), eur_o(champagne, "p"), cp_pool.clone(), String::new()),
            mq(translate(&format!("Dans quelle catégorie est {} à {} ?", name, eur_o(champagne, "p")), &format!("Which category is {} at {}?", name, eur_o(champagne, "p"))), w_(&tt), ct_pool.clone(), String::new()),
        ];
        let info = info_champ(champagne);
        add!("champ", format!("{}<br><small>{}</small>", name, w_(&tt)), eur_o(champagne, "p"), gens, |it: &mut Item| {
            it.info = Some(info.clone());
            it.ikey = Some(format!("c:{}", name));
        });
    }


    // ===== BUILD: DIGESTIFS 🥃 ===== //

    // the digestif list & answer pools
    let dg: Vec<Value> = data["digestifs"].as_array().cloned().unwrap_or_default();
    let dg_d = |digestif: &Value| -> String { let english = &le["digestifs"][gs(digestif, "n").as_str()]; if en_ && truthy(english) { js(english) } else { gs(digestif, "d") } };
    let h_pool = rcv(uniq(&dg.iter().map(|candidate| wv(&candidate["h"])).collect::<Vec<_>>()));
    let mut dp: Vec<String> = dg.iter().map(|candidate| eur_o(candidate, "p")).collect();
    dp.push("11 €".into());
    dp.push("20 €".into());
    let dp = rcv(dp);
    let cl_pool = rcv(["2 cl", "4 cl", "7 cl", "10 cl"].iter().map(|volume| volume.to_string()).collect());
    // 🥃 every digestif: producer, price & measure
    for digestif in &dg {
        let name = gs(digestif, "n");
        let cl = gs(digestif, "cl");
        let gens = vec![
            mq(translate(&format!("Qui produit « {} » ?", name), &format!("Who makes \"{}\"?", name)), wv(&digestif["h"]), h_pool.clone(), String::new()),
            mq(translate(&format!("Prix de « {} » ({} cl) ?", name, cl), &format!("Price of \"{}\" ({} cl)?", name, cl)), eur_o(digestif, "p"), dp.clone(), String::new()),
            mq(translate(&format!("Quelle dose sert-on pour « {} » ?", name), &format!("What measure do we pour for \"{}\"?", name)), format!("{} cl", cl), cl_pool.clone(), translate("Ferroni et digestifs classiques : 4 cl · Lachanenche et Liquoristerie de Provence : 7 cl.", "Ferroni and classic digestifs: 4 cl · Lachanenche and Liquoristerie de Provence: 7 cl.")),
        ];
        let back = format!("{} · {} cl · {}{}", wv(&digestif["h"]), cl, eur_o(digestif, "p"), if tk(digestif, "d") { format!("<br>{}", dg_d(digestif)) } else { String::new() });
        let info = info_dig(digestif);
        add!("dig", name.clone(), back, gens, |it: &mut Item| {
            it.info = Some(info.clone());
            it.ikey = Some(format!("g:{}", name));
            it.phdef = Some("img/_ph-soft.jpg".into());
        });
    }


    // ===== BUILD: CHEESE BOARD 🧀 ===== //

    // 🧀 the cheeses, mildest to strongest: milk, origin, place on the board, which one
    {
        let qf: Vec<Value> = data["fromages"].as_array().cloned().unwrap_or_default();
        let lg = if en_ { "en" } else { "fr" };
        let qv = |origin: &Value| -> String { gs(origin, lg) };
        let qord: Vec<String> = if en_ { ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th"] } else { ["1er", "2e", "3e", "4e", "5e", "6e", "7e", "8e"] }.iter().map(|place_label| place_label.to_string()).collect();
        let q_side = translate("À côté du plateau", "On the side");
        let q_order = qf.iter().map(|cheese| gs(cheese, "n")).collect::<Vec<_>>().join(" → ");
        let q_milk = rcv(vec![translate("Vache", "Cow"), translate("Brebis", "Sheep"), translate("Chèvre", "Goat")]);
        let mut op: Vec<String> = qf.iter().map(|cheese| qv(&cheese["orig"])).collect();
        op.push(translate("Savoie", "Savoie"));
        op.push(translate("Normandie", "Normandy"));
        let o_pool = rcv(op);
        let mut pp: Vec<String> = qord.iter().take(qf.len().saturating_sub(1)).cloned().collect();
        pp.push(q_side.clone());
        let p_pool = rcv(pp);
        let n_pool = rcv(qf.iter().map(|cheese| gs(cheese, "n")).collect());
        for (index, cheese) in qf.iter().enumerate() {
            let name = gs(cheese, "n");
            let place = if tk(cheese, "side") { q_side.clone() } else { qord.get(index).cloned().unwrap_or_default() };
            let mut gens = vec![];
            if !tk(cheese, "unc") {
                gens.push(mq(translate(&format!("Quel lait pour « {} » ?", name), &format!("Which milk is \"{}\" made from?", name)), qv(&cheese["lait"]), q_milk.clone(), String::new()));
            }
            gens.push(mq(translate(&format!("D'où vient « {} » ?", name), &format!("Where does \"{}\" come from?", name)), qv(&cheese["orig"]), o_pool.clone(), String::new()));
            gens.push(mq(translate(&format!("Place de « {} » sur le plateau (du plus doux au plus fort) ?", name), &format!("Where does \"{}\" go on the board (mildest to strongest)?", name)), place.clone(), p_pool.clone(), q_order.clone()));
            gens.push(mq(translate(&format!("Quel fromage : {} ?", qv(&cheese["h"])), &format!("Which cheese: {}?", qv(&cheese["h"]))), name.clone(), n_pool.clone(), qv(&cheese["d"])));
            let back = format!("{} · {} · {}<br>{}", qv(&cheese["lait"]), qv(&cheese["orig"]), qv(&cheese["pate"]), qv(&cheese["d"]));
            let info = sec(SAY, &ttl_say, &esc(&qv(&cheese["d"]))) + &sec("📍", &translate("Sur le plateau", "On the board"), &esc(&format!("{} · {}", place, q_order)));
            add!("from", name.clone(), back, gens, |it: &mut Item| {
                it.info = Some(info.clone());
                it.ikey = Some(format!("q:{}", name));
            });
        }
    }


    // ===== BUILD: WINE PAIRING 🍇 ===== //

    // the pairing wines, each with its course
    let mut pw: Vec<Value> = vec![];
    for pairing in data["pairing"].as_array().cloned().unwrap_or_default() {
        for wine in pairing["wines"].as_array().cloned().unwrap_or_default() {
            let mut object = serde_json::Map::new();
            object.insert("course".into(), pairing["course"].clone());
            if let Some(wo) = wine.as_object() {
                for (key, value) in wo {
                    object.insert(key.clone(), value.clone());
                }
            }
            pw.push(Value::Object(object));
        }
    }
    // the English strings, grapes, tasting note & answer pools
    let pe = |wine: &Value| -> Value { le["pairing"][gs(wine, "n").as_str()].clone() };
    let p_g = |wine: &Value| -> String { let english = pe(wine); if en_ && tk(&english, "g") { js(&english["g"]) } else { gs(wine, "g") } };
    let p_t = |wine: &Value| -> String { let english = pe(wine); if en_ && tk(&english, "t") { js(&english["t"]) } else { gs(wine, "t") } };
    let pc_pool = rcv(data["pairing"].as_array().cloned().unwrap_or_default().iter().map(|pairing| wv(&pairing["course"])).collect());
    let pg_pool = rcv(pw.iter().map(|wine| p_g(wine)).collect());
    let pt_pool = rcv(pw.iter().map(|wine| p_t(wine)).collect());
    // 🍇 every pairing wine: course, grapes, which wine for a course, how to describe it
    for wine in &pw {
        let name = gs(wine, "n");
        let course = gs(wine, "course");
        let others = rcv(pw.iter().filter(|candidate| gs(candidate, "course") != course).map(|candidate| gs(candidate, "n")).collect());
        let gens = vec![
            mq(translate(&format!("Dans l'accord mets-vins, « {} » accompagne…", name), &format!("In the wine pairing, \"{}\" goes with…", name)), w_(&course), pc_pool.clone(), p_t(wine)),
            mq(translate(&format!("Cépages / composition de « {} » ?", name), &format!("Grapes / make-up of \"{}\"?", name)), p_g(wine), pg_pool.clone(), p_t(wine)),
            mq(if en_ { format!("Which wine can go with the {} of the Tasting Menu?", w_(&course).to_lowercase()) } else { format!("Quel vin peut accompagner le {} du Menu Dégustation ?", course.to_lowercase()) }, name.clone(), others, p_t(wine)),
            mq(translate(&format!("Comment décrire « {} » au client ?", name), &format!("How do you describe \"{}\" to the guest?", name)), p_t(wine), pt_pool.clone(), String::new()),
        ];
        let info = info_pair(wine);
        let ik = pairkey(&name).map(|key| key.to_string()).unwrap_or_else(|| format!("p:{}", name));
        add!("acc", name.clone(), format!("<b>{}</b><br>{}<br><i>{}</i>", w_(&course), p_g(wine), p_t(wine)), gens, |it: &mut Item| {
            it.info = Some(info.clone());
            it.ikey = Some(ik.clone());
        });
    }


    // ===== BUILD: TABLES 🗺️ ===== //

    // 🗺️ every table of the floor plan (questions come from the plan game)
    for (ti, tb) in data["tables"].as_array().cloned().unwrap_or_default().iter().enumerate() {
        let sh = gs(tb, "sh");
        let kind = if sh == "round" { translate("Table ronde", "Round table") } else if sh == "long" { translate("Grande table", "Long table") } else { translate("Table carrée", "Square table") };
        add!("plan", gs(tb, "id"), format!("{}{}", kind, if tk(tb, "cap") { format!(" · {}", gs(tb, "cap")) } else { String::new() }), vec![Gen::Plan(ti)], |_it: &mut Item| {});
    }

    // ✅ the app
    App { data, le, img, icons, ch, items, facts, all_ingr, allergy, qual }
}


// ===== PIPE OR 🔗 ===== //

/// `PipeOr` - Trait 🔗
///
/// `a || b` for strings: the string itself, or `alt` when it's empty.
trait PipeOr {
    fn pipe_or(self, alt: &str) -> String;
}
impl PipeOr for String {
    fn pipe_or(self, alt: &str) -> String {
        if self.is_empty() { alt.to_string() } else { self }
    }
}
