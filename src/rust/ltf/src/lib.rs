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
* @name: Les Trois Forts - Entry Point
* @file: rust/ltf/src/lib.rs
* @type: Rust (WebAssembly)
* @authors: Abraham Ukachi <abrahamukachi@gmail.com>
*
* Example usage:
*   1+|> wasm_bindgen({ module_or_path: 'ltf_bg.wasm' });
*    -|> 
*
*/


/*
* !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
* MOTTO: We'll always do more 😜!!!
* !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
*/


//! Les Trois Forts — Service Academy, Rust/WebAssembly port of pwa/app.js 🦀.
//! Entry point: `start()` runs when the wasm module is initialised. It loads the saved
//! progress, builds the items, attaches the `window.LTF*` functions used by the inline
//! onclick handlers / tests, and renders the hub.

// the modules of the crate 🧩
mod build; // 📚 chapters, items & question generators
mod media; // 🔊 sound, speech, IndexedDB photos, photo viewer & confetti
mod state; // 💾 the saved progress `PROGRESS` & the runtime UI state
mod ui; // 📱 every screen, the router & the overlays
mod util; // 🧰 JS-semantics helpers & DOM helpers

// import the built app (chapters + items) 📚
use build::App;
// import `Cell` (the app is built once, then shared as a `&'static`) 🔒
use std::cell::Cell;
// import our DOM / JS helpers (win, doc, get, set, listen...) 🧰
use util::*;
// import the wasm-bindgen prelude (JsValue, Closure, #[wasm_bindgen]) 🔗
use wasm_bindgen::prelude::*;


// ===== THE APP 📚 ===== //

thread_local! {
    // the app, built once in `start()` and leaked (it lives as long as the page) 🌱
    static APP: Cell<Option<&'static App>> = Cell::new(None);
}

/// `app` - Function 📚
///
/// Returns the app built by `start()` (chapters, items, data).
///
/// @returns { &'static App } - the app (panics if called before `start()`)
pub(crate) fn app() -> &'static App {
    APP.with(|app_cell| app_cell.get()).expect("app not built")
}


// ===== WINDOW API HELPERS 🌍 ===== //

/// `optional_string` - Function 🏷️
///
/// Converts a JS argument the way `String(x)` would, keeping `undefined` / `null` as `None`.
///
/// @param { &JsValue } value - the JS argument
/// @returns { Option<String> } - the string, or None for undefined / null
fn optional_string(value: &JsValue) -> Option<String> {
    // no argument? 🚫
    if value.is_undefined() || value.is_null() {
        None
    } else {
        // a string as is, anything else through `String(x)` ✅
        Some(value.as_string().unwrap_or_else(|| js_sys::JsString::from(value.clone()).into()))
    }
}

/// `expose0` - Function 🌍
///
/// Attaches a function without arguments to `window` (e.g. `window.LTFitems`).
///
/// @param { &str } name - the global name
/// @param { impl Fn() -> JsValue } callback - the Rust closure
/// @returns { void }
fn expose0(name: &str, callback: impl Fn() -> JsValue + 'static) {
    // wrap the closure for JS 🔗
    let closure = Closure::wrap(Box::new(callback) as Box<dyn Fn() -> JsValue>);
    // window[name] = closure (it lives forever)
    set(&win(), name, &closure.into_js_value());
}

/// `expose2` - Function 🌍
///
/// Attaches a function with (up to) two arguments to `window` (e.g. `window.LTFgo(where, arg)`).
///
/// @param { &str } name - the global name
/// @param { impl Fn(JsValue, JsValue) -> JsValue } callback - the Rust closure
/// @returns { void }
fn expose2(name: &str, callback: impl Fn(JsValue, JsValue) -> JsValue + 'static) {
    // wrap the closure for JS 🔗
    let closure = Closure::wrap(Box::new(callback) as Box<dyn Fn(JsValue, JsValue) -> JsValue>);
    // window[name] = closure (it lives forever)
    set(&win(), name, &closure.into_js_value());
}


// ===== START 🚀 ===== //

/// `start` - Function (wasm start) 🚀
///
/// Runs once when the module is initialised: progress, streak, language, items, speech,
/// theme, the `window.LTF*` API, the router and the user photos.
///
/// @returns { void }
#[wasm_bindgen(start)]
pub fn start() {
    // 💾 storage + 🔥 streak
    let loaded = state::load();
    state::PROGRESS.with(|progress| *progress.borrow_mut() = loaded);
    state::streak();
    // 🌍 language (+ <html lang>)
    state::set_en(state::s_get("lang").as_str() == Some("en"));
    if let Some(de) = doc().document_element() {
        let _ = de.set_attribute("lang", if state::en() { "en" } else { "fr" });
    }
    // 📚 items (built once, then shared)
    let built_app: &'static App = Box::leak(Box::new(build::build()));
    APP.with(|app| app.set(Some(built_app)));
    // 🗣️ speech voices & 🌗 theme
    media::init_speech();
    ui::init_theme();

    // 🌍 window.LTF* API (same names/behaviour as app.js)
    // switch the language: save & reload
    expose2("LTFlang", |lang, _| {
        state::s_set("lang", serde_json::Value::String(optional_string(&lang).unwrap_or_default()));
        state::save();
        let _ = win().location().reload();
        JsValue::UNDEFINED
    });
    // 🔊 say an item's name
    expose2("LTFsay", |id, which| {
        media::ltf_say(optional_string(&id).unwrap_or_default(), optional_string(&which));
        JsValue::UNDEFINED
    });
    // 🗂️ the items (scan & tests) + the course of an item
    expose0("LTFitems", ui::ltf_items);
    // 👋 the floor plan with today's bookings (welcome screen)
    expose0("LTFbriefPlan", ui::ltf_brief_plan);
    expose2("LTFcourseOf", |it, _| get(&it, "course"));
    // 🌗 the theme
    expose2("LTFtheme", |theme, _| {
        ui::ltf_theme(optional_string(&theme).unwrap_or_default());
        JsValue::UNDEFINED
    });
    // 👋 close the bottom sheet
    expose0("LTFcloseSheet", || {
        ui::close_sheet();
        JsValue::UNDEFINED
    });
    // 🔍 the photo viewer
    expose2("LTFzoom", |id, ev| {
        media::ltf_zoom(optional_string(&id).unwrap_or_default(), ev);
        JsValue::UNDEFINED
    });
    // ℹ️ the ⓘ sheet
    expose2("LTFinfo", |id, _| {
        ui::ltf_info(optional_string(&id).unwrap_or_default());
        JsValue::UNDEFINED
    });
    // 🧭 navigation (a missing view behaves like JS `undefined` -> the hub)
    expose2("LTFgo", |where_to, arg| {
        ui::go(&optional_string(&where_to).unwrap_or_else(|| "undefined".into()), optional_string(&arg));
        JsValue::UNDEFINED
    });
    // 🍽 the carte filters & the course explainer
    expose2("LTFcourse", |course, _| {
        ui::ltf_course(optional_string(&course).unwrap_or_default());
        JsValue::UNDEFINED
    });
    expose2("LTFcat", |category, _| {
        ui::ltf_cat(optional_string(&category).unwrap_or_default());
        JsValue::UNDEFINED
    });
    expose0("LTFcourseHelp", || {
        ui::ltf_course_help();
        JsValue::UNDEFINED
    });
    // 🧪 the self-test
    expose0("LTFtest", ui::ltf_test);

    // 🔙 history back support + open the screen of the URL (#/view/chapter)
    listen(&win().into(), "popstate", |_| ui::on_popstate());
    ui::boot_route();
    // 📸 user photos (IndexedDB), then refresh the carte if it's open
    media::idb_open(|| {
        media::idb_all(|| {
            let (photo_count, lv) = state::ui(|ui_state| (ui_state.ph.len(), ui_state.last_view.0.clone()));
            if photo_count > 0 && lv == "carte" {
                ui::refresh();
            }
        })
    });
}
