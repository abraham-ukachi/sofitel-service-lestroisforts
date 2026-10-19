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
* @name: Les Trois Forts - State
* @file: rust/ltf/src/state.rs
* @type: Rust (WebAssembly)
* @authors: Abraham Ukachi <abrahamukachi@gmail.com>
*
* Example usage:
*   1+|> use crate::state::*;
*    +|> s(|st| st["xp"] = json!(0)); save();
*    -|> 
*
*/


/*
* !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
* MOTTO: We'll always do more 😜!!!
* !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
*/
//! Global state: the persisted progress object `PROGRESS` (localStorage 'ltf_v1', same JSON shape),
//! the language flag and the runtime UI state.
// import our JS-semantics helpers (num, js, truthy, win...) 🧰
use crate::util::*;
// import serde_json (the progress `PROGRESS` keeps the exact JSON shape of app.js, keys in order) 🗃️
use serde_json::{json, Map, Value};
// import the cells of the thread-local state 🔒
use std::cell::{Cell, RefCell};
// import HashMap (user photos by ikey) 🗂️
use std::collections::HashMap;
// import the wasm-bindgen prelude 🔗
use wasm_bindgen::prelude::*;

// the localStorage key of the progress (same as app.js, also synced by cloud.js ☁️) 🏷️
pub const KEY: &str = "ltf_v1";

/// `Ui` - Struct 📱
///
/// The runtime UI state (never saved): photos, current view, navigation flags, timers,
/// carte filters, the IndexedDB handle, the speech voices & the AudioContext.
pub struct Ui {
    pub ph: HashMap<String, String>, // user photos: ikey -> dataURL
    // the current screen [view, arg] 🧭
    pub last_view: (String, Option<String>),
    // true while going back with the browser's Back (no new history entry) 🔙
    pub nav_pop: bool,
    // the current chapter 📚
    pub cur_ch: Option<String>,
    // the chrono interval id ⏱️
    pub timer: Option<i32>,
    // the carte filters (chapter & course) 🍽
    pub carte_cat: String,
    pub carte_course: String,
    // the IndexedDB database `ltf_photos` 🗃️
    pub idb: Option<web_sys::IdbDatabase>,
    // the device voices 🗣️
    pub voices: Vec<JsValue>,
    // the AudioContext (created on the first beep) 🔊
    pub ac: Option<JsValue>,
}

// 🌱 the thread-local state: the progress `PROGRESS`, its in-memory copy, the UI state & the language flag
thread_local! {
    pub static PROGRESS: RefCell<Value> = RefCell::new(Value::Null);
    static MEM: RefCell<Option<Value>> = RefCell::new(None);
    pub static UI: RefCell<Ui> = RefCell::new(Ui{ ph: HashMap::new(), last_view: ("hub".into(), None), nav_pop: false, cur_ch: None, timer: None,
        carte_cat: "all".into(), carte_course: "all".into(), idb: None, voices: vec![], ac: None });
    static EN: Cell<bool> = Cell::new(false);
}

/// `en` - Function 🌍
///
/// @returns { bool } - true when the app is in English
pub fn en() -> bool {
    EN.with(|cell| cell.get())
}

/// `set_en` - Function 🌍
///
/// @param { bool } english - English?
/// @returns { void }
pub fn set_en(english: bool) {
    EN.with(|cell| cell.set(english))
}

/// `translate` - Function 🏷️
///
/// Same as `translate(fr, en)` in app.js.
///
/// @param { &str } fr - the French text
/// @param { &str } en_ - the English text
/// @returns { String } - the text in the current language
pub fn translate(fr: &str, en_: &str) -> String {
    if en() { en_.to_string() } else { fr.to_string() }
}

/// `ui` - Function 📱
///
/// Runs a closure with the mutable UI state.
///
/// @param { impl FnOnce(&mut Ui) -> R } callback - the closure
/// @returns { R } - its result
pub fn ui<Output>(callback: impl FnOnce(&mut Ui) -> Output) -> Output {
    UI.with(|ui_cell| callback(&mut ui_cell.borrow_mut()))
}

/// `with_progress` - Function 💾
///
/// Runs a closure with the mutable progress `PROGRESS`.
///
/// @param { impl FnOnce(&mut Value) -> R } callback - the closure
/// @returns { R } - its result
pub fn with_progress<Output>(callback: impl FnOnce(&mut Value) -> Output) -> Output {
    PROGRESS.with(|progress| callback(&mut progress.borrow_mut()))
}

/// `default_s` - Function 🌱
///
/// @returns { Value } - a fresh progress (same keys & order as app.js)
fn default_s() -> Value {
    json!({"xp":0,"m":{},"best":{},"review":[],"streak":0,"last":null,"sound":true,"exam":null,"lang":"fr"})
}

/// `storage` - Function 💾
///
/// @returns { Option<web_sys::Storage> } - localStorage (None when the browser refuses it)
fn storage() -> Option<web_sys::Storage> {
    win().local_storage().ok().flatten()
}

/// `load` - Function 💾
///
/// Reads `PROGRESS` from localStorage `ltf_v1`, else the in-memory copy, else a fresh progress.
///
/// @returns { Value } - the progress
pub fn load() -> Value {
    if let Some(st) = storage() {
        if let Ok(Some(txt)) = st.get_item(KEY) {
            if !txt.is_empty() {
                if let Ok(parsed) = serde_json::from_str::<Value>(&txt) {
                    return parsed;
                }
            }
        }
    }
    // no (valid) saved progress: the in-memory copy or a fresh one 🌱
    MEM.with(|memory| memory.borrow().clone()).unwrap_or_else(default_s)
}

/// `save` - Function 💾
///
/// Writes `PROGRESS` to localStorage `ltf_v1` (and keeps an in-memory copy).
///
/// @returns { void }
pub fn save() {
    let txt = PROGRESS.with(|progress| {
        let current = progress.borrow();
        MEM.with(|memory| *memory.borrow_mut() = Some(current.clone()));
        serde_json::to_string(&*current).unwrap_or_default()
    });
    // write it (errors ignored, like the try/catch of app.js)
    if let Some(st) = storage() {
        let _ = st.set_item(KEY, &txt);
    }
}

/// `iso_day` - Function 📅
///
/// @param { f64 } ms - a timestamp
/// @returns { String } - its UTC day "YYYY-MM-DD"
fn iso_day(ms: f64) -> String {
    let date = js_sys::Date::new(&JsValue::from_f64(ms));
    let iso: String = date.to_iso_string().into();
    iso.chars().take(10).collect()
}

/// `today` - Function 📅
///
/// @returns { String } - today (UTC) "YYYY-MM-DD"
pub fn today() -> String {
    iso_day(js_sys::Date::now())
}

/// `streak` - Function 🔥
///
/// Same rule as app.js (UTC calendar days): +1 when the last visit was yesterday, else back to 1.
///
/// @returns { void }
pub fn streak() {
    let today = today();
    let changed = with_progress(|progress| {
        let last = progress.get("last").cloned().unwrap_or(Value::Null);
        if last.as_str() != Some(today.as_str()) {
            // yesterday (UTC)
            let yesterday = iso_day(js_sys::Date::now() - 864e5);
            let st = num(progress.get("streak").unwrap_or(&Value::Null));
            let ns = if last.as_str() == Some(yesterday.as_str()) { st + 1.0 } else { 1.0 };
            if let Some(object) = progress.as_object_mut() {
                object.insert("streak".into(), num_val(ns));
                object.insert("last".into(), Value::String(today.clone()));
            }
            true
        } else {
            false
        }
    });
    // save only when it changed
    if changed {
        save();
    }
}


// ===== TYPED ACCESSORS ON S 🏷️ ===== //

/// `s_get` - Function 🔎
///
/// @param { &str } key - a key of `PROGRESS`
/// @returns { Value } - its value (Null when missing)
pub fn s_get(key: &str) -> Value {
    PROGRESS.with(|progress| progress.borrow().get(key).cloned().unwrap_or(Value::Null))
}

/// `s_set` - Function ✍️
///
/// @param { &str } key - a key of `PROGRESS`
/// @param { Value } value - the new value
/// @returns { void }
pub fn s_set(key: &str, value: Value) {
    with_progress(|progress| {
        if let Some(object) = progress.as_object_mut() {
            object.insert(key.into(), value);
        }
    })
}

/// `xp` - Function 🎓
///
/// @returns { f64 } - the XP
pub fn xp() -> f64 {
    num(&s_get("xp"))
}

/// `review` - Function 🔁
///
/// @returns { Vec<String> } - the ids of the items to review
pub fn review() -> Vec<String> {
    s_get("review").as_array().map(|review_ids| review_ids.iter().map(js).collect()).unwrap_or_default()
}

/// `m_of` - Function 📈
///
/// @param { &str } id - an item id
/// @returns { Option<Value> } - its mastery { s: streak, c: right, w: wrong }
pub fn m_of(id: &str) -> Option<Value> {
    PROGRESS.with(|progress| progress.borrow().get("m").and_then(|mastery| mastery.get(id)).cloned())
}

/// `mastered` - Function ✅
///
/// @param { &str } id - an item id
/// @returns { bool } - answered right 3 times in a row?
pub fn mastered(id: &str) -> bool {
    m_of(id).map(|mastery| num(mastery.get("s").unwrap_or(&Value::Null)) >= 3.0).unwrap_or(false)
}

/// `best` - Function 🏆
///
/// @param { &str } ch - a chapter id
/// @returns { f64 } - the chrono record of that chapter
pub fn best(ch: &str) -> f64 {
    PROGRESS.with(|progress| progress.borrow().get("best").and_then(|best_scores| best_scores.get(ch)).map(num).unwrap_or(0.0))
}

/// `set_best` - Function 🏆
///
/// @param { &str } ch - a chapter id
/// @param { f64 } score - the new record
/// @returns { void }
pub fn set_best(ch: &str, score: f64) {
    with_progress(|progress| {
        if let Some(object) = progress.as_object_mut() {
            let best = object.entry("best").or_insert_with(|| Value::Object(Map::new()));
            if let Some(best_map) = best.as_object_mut() {
                best_map.insert(ch.into(), num_val(score));
            }
        }
    })
}

/// `sound` - Function 🔊
///
/// @returns { bool } - sound effects on?
pub fn sound() -> bool {
    truthy(&s_get("sound"))
}

/// `theme` - Function 🌗
///
/// @returns { String } - the saved theme ('auto' by default)
pub fn theme() -> String {
    let saved_theme = s_get("theme");
    if truthy(&saved_theme) { js(&saved_theme) } else { "auto".into() }
}

/// `add_xp` - Function 🎓
///
/// @param { f64 } amount - the XP to add
/// @returns { void }
pub fn add_xp(amount: f64) {
    let current_xp = xp();
    s_set("xp", num_val(current_xp + amount));
}

/// `record` - Function ✅
///
/// Same as `record(it, ok, xp)` in app.js: right = streak +1 & XP (and out of the review list),
/// wrong = streak reset & added to the review list. Then saves.
///
/// @param { &str } id - the item id
/// @param { bool } ok - right answer?
/// @param { f64 } xpv - the XP to earn (0 = the default 10)
/// @returns { void }
pub fn record(id: &str, ok: bool, xpv: f64) {
    with_progress(|progress| {
        let object = match progress.as_object_mut() { Some(object) => object, None => return };
        // the mastery of the item (or a fresh one) & the review list
        let mut stats = object.get("m").and_then(|all_stats| all_stats.get(id)).cloned().unwrap_or_else(|| json!({"s":0,"c":0,"w":0}));
        let field = |stats: &Value, key: &str| num(stats.get(key).unwrap_or(&Value::Null));
        let mut review: Vec<Value> = object.get("review").and_then(|review_value| review_value.as_array()).cloned().unwrap_or_default();
        // ✅ right: +1 streak, +1 right, + XP, out of the review list
        if ok {
            let (s1, c1) = (field(&stats, "s") + 1.0, field(&stats, "c") + 1.0);
            stats["s"] = num_val(s1);
            stats["c"] = num_val(c1);
            let cur = num(object.get("xp").unwrap_or(&Value::Null));
            object.insert("xp".into(), num_val(cur + if xpv != 0.0 { xpv } else { 10.0 }));
            review.retain(|review_id| review_id.as_str() != Some(id));
        // ❌ wrong: streak back to 0, +1 wrong, into the review list
        } else {
            stats["s"] = num_val(0.0);
            let w1 = field(&stats, "w") + 1.0;
            stats["w"] = num_val(w1);
            if !review.iter().any(|review_id| review_id.as_str() == Some(id)) {
                review.push(Value::String(id.into()));
            }
        }
        // write back the review list & the mastery
        object.insert("review".into(), Value::Array(review));
        let mm = object.entry("m").or_insert_with(|| Value::Object(Map::new()));
        if let Some(mm) = mm.as_object_mut() {
            mm.insert(id.into(), stats);
        }
    });
    save();
}
