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
* @name: Les Trois Forts - Screens & UI
* @file: rust/ltf/src/ui.rs
* @type: Rust (WebAssembly)
* @authors: Abraham Ukachi <abrahamukachi@gmail.com>
*
* Example usage:
*   1+|> use crate::ui::*;
*    +|> go("chapter", Some("vins".into()));
*    -|> 
*
*/


/*
* !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
* MOTTO: We'll always do more 😜!!!
* !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
*/
//! Screens, navigation, overlays. Port of the "icons", "theme", "overlays", "navigation",
//! "screens", "Carte", "settings" and "FX" sections of app.js — same HTML output.
// import the app types & builders (Item, Q, mcq, eur...) 📚
use crate::build::*;
// import sound, speech, photos & zoom 🔊
use crate::media::*;
// import the progress & UI state 💾
use crate::state::*;
// import our JS-semantics & DOM helpers 🧰
use crate::util::*;
// import the built app 📚
use crate::app;
// import serde_json (the saved session & the progress) 🗃️
use serde_json::{json, Value};
// import the cells & Rc of the closures 🔒
use std::cell::{Cell, RefCell};
use std::rc::Rc;
// import the wasm-bindgen prelude & the JS casts 🔗
use wasm_bindgen::prelude::*;
use wasm_bindgen::JsCast;
// import the DOM types 🌐
use web_sys::{Element, HtmlElement, HtmlInputElement};


// ===== ICONS 🎨 ===== //

/// `ic` - Function 🎨
///
/// @param { &str } name - the icon name (a key of the icons table lifted from app.js)
/// @param { u32 } size - the size in px
/// @returns { String } - the `<svg>` markup (same as `ic()` in app.js)
pub fn ic(name: &str, size: u32) -> String {
    let paths = app().icons.get(name).and_then(|value| value.as_str()).unwrap_or("");
    format!("<svg class=\"i\" width=\"{size}\" height=\"{size}\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\">{paths}</svg>")
}

/// `chic` - Function 🎨
///
/// @param { &str } ch - a chapter id
/// @returns { &'static str } - its icon name
pub fn chic(ch: &str) -> &'static str {
    match ch { "jour" => "clip", "hiver" => "snow", "dej" => "sun", "diner" => "moon", "dess" => "cake", "cock" => "glass", "cafe" => "cup", "vins" => "wine", "champ" => "flute", "dig" => "tumbler", "from" => "cheese", "acc" => "grape", "plan" => "map", _ => "star" }
}


// ===== PHOTOS 📸 ===== //

/// `photo_of` - Function 🖼️
///
/// @param { usize } index - an item index
/// @returns { Option<String> } - its photo: the waiter's own, the shipped one, the placeholder, or None
pub fn photo_of(index: usize) -> Option<String> {
    let it = &app().items[index];
    let photo_key = it.ikey.as_ref()?;
    if let Some(photo) = ui(|ui_state| ui_state.ph.get(photo_key).cloned()) {
        if !photo.is_empty() {
            return Some(photo);
        }
    }
    let image = &app().img[photo_key.as_str()];
    if truthy(image) {
        return Some(js(image));
    }
    it.phdef.clone()
}

/// `is_mine` - Function 📸
///
/// @param { usize } index - an item index
/// @returns { bool } - is its photo the waiter's own?
pub fn is_mine(index: usize) -> bool {
    match &app().items[index].ikey {
        Some(photo_key) => ui(|ui_state| ui_state.ph.get(photo_key).map(|photo| !photo.is_empty()).unwrap_or(false)),
        None => false,
    }
}


// ===== PRONUNCIATION BUTTONS 🔊 ===== //

/// `say_btn` - Function 🔊
///
/// @param { &Item } it - an item
/// @returns { String } - the small speaker button (or '')
pub fn say_btn(it: &Item) -> String {
    if it.say.is_none() {
        return String::new();
    }
    format!("<button class=\"sayb\" onclick=\"event.stopPropagation();LTFsay('{}')\" aria-label=\"{}\">{}</button>", it.id, translate("Écouter", "Listen"), ic("sound", 18))
}

/// `say_row` - Function 🔊
///
/// @param { &Item } it - an item
/// @returns { String } - the "original / Français / English" buttons of the ⓘ sheet (or '')
pub fn say_row(it: &Item) -> String {
    let say = match &it.say { Some(say) => say, None => return String::new() };
    format!(
        "<div class=\"sayrow\">{}<button class=\"chip\" onclick=\"LTFsay('{id}','fr')\">{ic} Français</button><button class=\"chip\" onclick=\"LTFsay('{id}','en')\">{ic} English</button></div>",
        if say.ol.is_some() { format!("<button class=\"chip\" onclick=\"LTFsay('{}','or')\">{} {}</button>", it.id, ic("sound", 16), say.on.clone().unwrap_or_default()) } else { String::new() },
        id = it.id,
        ic = ic("sound", 16)
    )
}


// ===== PROGRESS 🎓 ===== //

/// `rank` - Function 🏅
///
/// @returns { String } - the current rank (one every 300 XP)
pub fn rank() -> String {
    let ranks: [&str; 5] = if en() { ["Commis", "Junior waiter", "Head waiter", "Maître d'hôtel", "Restaurant manager"] } else { ["Commis", "Demi-chef de rang", "Chef de rang", "Maître d'hôtel", "Directeur de salle"] };
    let rank_index = ((xp() / 300.0).floor() as i64).clamp(0, 4) as usize;
    ranks[rank_index].to_string()
}

/// `mastery` - Function 📈
///
/// @param { Option<&str> } ch - a chapter id (all items when None)
/// @returns { String } - the % of items answered right 3 times in a row
pub fn mastery(ch: Option<&str>) -> String {
    let chapter_items: Vec<&Item> = app().items.iter().filter(|item| ch.map(|chapter| item.ch == chapter).unwrap_or(true)).collect();
    let mastered_count = chapter_items.iter().filter(|item| mastered(&item.id)).count();
    jsnum(round(100.0 * mastered_count as f64 / chapter_items.len() as f64))
}


// ===== THEME 🌗 ===== //

/// `mq` - Function 🌗
///
/// @returns { JsValue } - the `(prefers-color-scheme: light)` media query (null when unsupported)
fn mq() -> JsValue {
    match win().match_media("(prefers-color-scheme: light)") {
        Ok(Some(media_query)) => media_query.into(),
        _ => JsValue::NULL,
    }
}

/// `apply_theme` - Function 🌗
///
/// Sets `<html data-theme>` (auto follows the system) and the browser bar color.
///
/// @returns { void }
pub fn apply_theme() {
    let tt = theme();
    let media_query = mq();
    let eff = if tt == "auto" { if !media_query.is_null() && get(&media_query, "matches").is_truthy() { "light".to_string() } else { "dark".to_string() } } else { tt };
    if let Some(de) = doc().document_element() {
        let _ = de.set_attribute("data-theme", &eff);
    }
    if let Some(meta) = query("meta[name=theme-color]") {
        let _ = meta.set_attribute("content", if eff == "light" { "#ffffff" } else if eff == "black" { "#000000" } else { "#0d1a2e" });
    }
}

/// `init_theme` - Function 🌗
///
/// Applies the theme and follows the system theme changes (old Safari: `addListener`).
///
/// @returns { void }
pub fn init_theme() {
    apply_theme();
    let media_query = mq();
    if !media_query.is_null() {
        let closure = Closure::wrap(Box::new(|_e: JsValue| apply_theme()) as Box<dyn FnMut(JsValue)>).into_js_value();
        let add = get(&media_query, "addEventListener");
        let ok = add.dyn_ref::<js_sys::Function>().map(|function| function.call2(&media_query, &"change".into(), &closure).is_ok()).unwrap_or(false);
        if !ok {
            if let Some(function) = get(&media_query, "addListener").dyn_ref::<js_sys::Function>() {
                let _ = function.call1(&media_query, &closure);
            }
        }
    }
}

/// `ltf_theme` - Function (window.LTFtheme) 🌗
///
/// @param { String } tt - the new theme ('auto', 'light', 'dark', 'black')
/// @returns { void }
pub fn ltf_theme(tt: String) {
    s_set("theme", Value::String(tt));
    save();
    apply_theme();
    settings();
}


// ===== OVERLAYS 🪟 ===== //

/// `close_overlays` - Function 🧹
///
/// @returns { void } - removes every sheet, dialog & viewer (`.ov`)
pub fn close_overlays() {
    for overlay in qa(".ov") {
        overlay.remove();
    }
}

/// `sheet` - Function 🪟
///
/// Opens the bottom sheet `#sheet` (a tap on the scrim closes it).
///
/// @param { &str } html - the sheet content
/// @param { Option<&str> } cls - an extra class
/// @param { &str } bar - the action bar HTML
/// @returns { HtmlElement } - the sheet overlay
pub fn sheet(html: &str, cls: Option<&str>, bar: &str) -> HtmlElement {
    if let Some(old) = query("#sheet") {
        old.remove();
    }
    let overlay = create("div");
    overlay.set_id("sheet");
    overlay.set_class_name("ov scrim");
    overlay.set_inner_html(&format!(
        "<div class=\"sheet{}\"><div class=\"grab\"></div><div class=\"sbody\">{}</div>{}</div>",
        cls.map(|class_name| format!(" {}", class_name)).unwrap_or_default(),
        html,
        if !bar.is_empty() { format!("<div class=\"abar\">{}</div>", bar) } else { String::new() }
    ));
    let dd = overlay.clone();
    on(&overlay, "onclick", move |event: JsValue| {
        if get(&event, "target") == JsValue::from(dd.clone()) {
            close_sheet();
        }
    });
    let _ = doc().body().unwrap().append_child(&overlay);
    overlay
}

/// `close_sheet` - Function (window.LTFcloseSheet) 👋
///
/// @returns { void } - slides the sheet out, then removes it
pub fn close_sheet() {
    if let Some(sheet_element) = query("#sheet") {
        let _ = sheet_element.class_list().add_1("out");
        set_timeout(move || sheet_element.remove(), 180);
    }
}

/// `dialog` - Function 💬
///
/// @param { &str } html - the dialog content
/// @param { bool } dismiss - can a tap on the scrim close it?
/// @returns { HtmlElement } - the dialog overlay `#dlg`
pub fn dialog(html: &str, dismiss: bool) -> HtmlElement {
    if let Some(old) = query("#dlg") {
        old.remove();
    }
    let overlay = create("div");
    overlay.set_id("dlg");
    overlay.set_class_name("ov scrim center");
    overlay.set_inner_html(&format!("<div class=\"dialog\">{}</div>", html));
    if dismiss {
        let dd = overlay.clone();
        on(&overlay, "onclick", move |event: JsValue| {
            if get(&event, "target") == JsValue::from(dd.clone()) {
                dd.remove();
            }
        });
    }
    let _ = doc().body().unwrap().append_child(&overlay);
    overlay
}

/// `on_sel` - Function 👂
///
/// @param { &Element } root - the root
/// @param { &str } sel - a CSS selector
/// @param { Callback } callback - the click handler of the matching element (if any)
/// @returns { void }
pub fn on_sel<Callback: FnMut(JsValue) + 'static>(root: &Element, sel: &str, callback: Callback) {
    if let Some(element) = qin(root, sel) {
        on(&element, "onclick", callback);
    }
}

/// `confirm_dlg` - Function ❓
///
/// @param { &str } title - the title
/// @param { &str } text - the question
/// @param { &str } ok_lbl - the OK label
/// @param { Rc<dyn Fn()> } on_ok - called on OK
/// @param { bool } danger - red OK button
/// @returns { void }
pub fn confirm_dlg(title: &str, text: &str, ok_lbl: &str, on_ok: Rc<dyn Fn()>, danger: bool) {
    let dialog_element = dialog(&format!("<div class=\"dt\">{}</div><p class=\"muted\">{}</p><div class=\"dbtns\"><button class=\"btn sec\" id=\"dno\">{}</button><button class=\"btn {}\" id=\"dok\">{}</button></div>", title, text, translate("Annuler", "Cancel"), if danger { "danger" } else { "" }, ok_lbl), true);
    let d1 = dialog_element.clone();
    on_sel(&dialog_element, "#dno", move |_| d1.remove());
    let d2 = dialog_element.clone();
    on_sel(&dialog_element, "#dok", move |_| {
        d2.remove();
        on_ok();
    });
}


// ===== ⓘ SHEET ℹ️ ===== //

/// `fun_tip` - Function 💡
///
/// @param { &Item } it - an item
/// @returns { String } - its "Did you know?" section (fun.js), or ''
fn fun_tip(it: &Item) -> String {
    let photo_key = match &it.ikey { Some(photo_key) => photo_key, None => return String::new() };
    match app().data["fun"][if en() { "en" } else { "fr" }][photo_key.as_str()].as_str() {
        Some(tip) => format!("<div class=\"isec\"><div class=\"ih\">💡 {}</div><div>{}</div></div>", translate("Le saviez-vous ?", "Did you know?"), tip),
        None => String::new(),
    }
}

/// `ltf_info` - Function (window.LTFinfo) ℹ️
///
/// Opens an item's ⓘ sheet: photo (zoomable), name + speech, details, info sections, fun tip,
/// and the "take / pick / restore photo" bar.
///
/// @param { String } id - the item id
/// @returns { void }
pub fn ltf_info(id: String) {
    let built_app = app();
    let index = match built_app.item(&id) { Some(index) => index, None => return };
    let it = &built_app.items[index];
    if !it.has_info() {
        return;
    }
    let ph = photo_of(index);
    let mine = is_mine(index);
    let top = match (&it.ikey, &ph) {
        (Some(_), Some(ph)) => format!("<div class=\"hphoto\"><img src=\"{}\" alt=\"\" onclick=\"LTFzoom('{}',event)\"><span class=\"ptag\">{}</span><button class=\"pclose\" onclick=\"LTFcloseSheet()\">{}</button></div>", ph, it.id, if mine { translate("Votre photo", "Your photo") } else { translate("Photo d'illustration", "Sample photo") }, ic("x", 18)),
        _ => format!("<button class=\"pclose solo\" onclick=\"LTFcloseSheet()\">{}</button>", ic("x", 18)),
    };
    let html = format!("{}\n   <div class=\"stitle tl2\"><span>{}</span>{}</div>{}<div class=\"sdesc\">{}</div><div class=\"sinfo\">{}{}</div>", top, it.front, say_btn(it), say_row(it), it.back, it.info_s(), fun_tip(it));
    let bar = if it.ikey.is_some() {
        format!(
            "{}<label class=\"btn sec grow\">{} {}<input type=\"file\" accept=\"image/*\" id=\"phin2\" hidden></label><label class=\"btn grow\">{} {}<input type=\"file\" accept=\"image/*\" capture=\"environment\" id=\"phin\" hidden></label>",
            if mine { format!("<button class=\"btn sec sq\" id=\"phrst\" aria-label=\"reset\">{}</button>", ic("reset", 20)) } else { String::new() },
            ic("pic", 20),
            translate("Galerie", "Gallery"),
            ic("cam", 20),
            translate("Caméra", "Camera")
        )
    } else {
        String::new()
    };
    let sheet_element = sheet(&html, None, &bar);
    let ikey = it.ikey.clone().unwrap_or_default();
    for sel in ["#phin", "#phin2"] {
    if let Some(inp) = qin(&sheet_element, sel) {
        let inp2: HtmlInputElement = inp.clone().unchecked_into();
        let (photo_key, id2) = (ikey.clone(), id.clone());
        on(&inp, "onchange", move |_| {
            let file = match inp2.files().and_then(|files| files.get(0)) { Some(file) => file, None => return };
            let (photo_key, id3) = (photo_key.clone(), id2.clone());
            shrink(
                file,
                move |url: String| {
                    ui(|ui_state| ui_state.ph.insert(photo_key.clone(), url.clone()));
                    let id4 = id3.clone();
                    idb_put(&photo_key, Some(url), move || {
                        toast(&translate("Photo enregistrée", "Photo saved"));
                        ltf_info(id4.clone());
                        refresh();
                    });
                },
                || toast(&translate("Photo impossible à lire", "Could not read photo")),
            );
        });
    }
    }
    let (photo_key, id2) = (ikey, id);
    on_sel(&sheet_element, "#phrst", move |_| {
        let (photo_key, id3) = (photo_key.clone(), id2.clone());
        confirm_dlg(
            &translate("Photo par défaut ?", "Default photo?"),
            &translate("Votre photo sera supprimée de ce téléphone.", "Your photo will be removed from this phone."),
            &translate("Rétablir", "Restore"),
            Rc::new(move || {
                ui(|ui_state| ui_state.ph.remove(&photo_key));
                let id4 = id3.clone();
                idb_put(&photo_key, None, move || {
                    ltf_info(id4.clone());
                    refresh();
                });
            }),
            true,
        );
    });
}

/// `refresh` - Function 🔄
///
/// Re-renders the carte (keeping the search) after a photo change.
///
/// @returns { void }
pub fn refresh() {
    let view = ui(|ui_state| ui_state.last_view.0.clone());
    if view == "carte" {
        let val = srch_value();
        carte();
        set_srch(&val);
        carte_render();
    }
}


// ===== ROUTER (URL HASH + RESUMABLE SESSIONS) 🧭 ===== //

// URL: #/<view>[/<chapter>]. A study deck / quiz / exam / review in progress is kept in
// sessionStorage ('ltf_run') so a page refresh lands back on the same card or question.

// the sessionStorage key of the run in progress 🏷️
const RUN_KEY: &str = "ltf_run";
// the views that carry a chapter in the URL & every known view
const CH_VIEWS: [&str; 8] = ["chapter", "study", "quiz", "chrono", "bar", "planFind", "alg", "brief"];
const VIEWS: [&str; 15] = ["hub", "chapter", "study", "quiz", "chrono", "exam", "review", "revise", "carte", "settings", "bar", "planFind", "alg", "brief", "cert"];
// true while `boot_route()` opens the URL's screen (only then a saved run is restored) 🔁
thread_local! {
    static RESTORE: Cell<bool> = Cell::new(false);
}

/// `sess` - Function 💾
///
/// @returns { Option<web_sys::Storage> } - sessionStorage
fn sess() -> Option<web_sys::Storage> {
    win().session_storage().ok().flatten()
}

/// `run_save` - Function 💾
///
/// @param { Value } value - the run in progress (items, questions, k, score, elapsed)
/// @returns { void }
fn run_save(value: Value) {
    if let Some(st) = sess() {
        let _ = st.set_item(RUN_KEY, &value.to_string());
    }
}

/// `run_clear` - Function 🧹
///
/// @returns { void } - forgets the run in progress
fn run_clear() {
    if let Some(st) = sess() {
        let _ = st.remove_item(RUN_KEY);
    }
}

/// `run_take` - Function 🔁
///
/// The saved session for this view (and chapter), only while booting from a refresh.
///
/// @param { &str } view - the view being opened
/// @returns { Option<Value> } - the saved run
fn run_take(view: &str) -> Option<Value> {
    if !RESTORE.with(|restore| restore.replace(false)) {
        return None;
    }
    let txt = sess()?.get_item(RUN_KEY).ok().flatten()?;
    let saved: Value = serde_json::from_str(&txt).ok()?;
    if saved.get("v").and_then(|value| value.as_str()) != Some(view) {
        return None;
    }
    if CH_VIEWS.contains(&view) && saved.get("ch").and_then(|value| value.as_str()) != Some(cur_ch().as_str()) {
        return None;
    }
    Some(saved)
}

/// `route_url` - Function 🔗
///
/// @param { &str } where_ - a view
/// @returns { String } - its URL hash "#/<view>[/<chapter>]"
fn route_url(where_: &str) -> String {
    if CH_VIEWS.contains(&where_) {
        format!("#/{}/{}", where_, cur_ch())
    } else {
        format!("#/{}", where_)
    }
}

/// `q_to_json` - Function 🗃️
///
/// @param { &Q } question - a question
/// @returns { Value } - its JSON form (for the saved run)
fn q_to_json(question: &Question) -> Value {
    json!({"q": question.prompt, "o": question.options, "a": question.answer, "e": question.expl, "i": app().items[question.item].id, "p": question.plan, "s": question.svg})
}

/// `q_from_json` - Function 🗃️
///
/// @param { &Value } value - a saved question
/// @returns { Option<Q> } - the question
fn q_from_json(value: &Value) -> Option<Question> {
    let item = app().item(value.get("i")?.as_str()?)?;
    Some(Question {
        prompt: value.get("q")?.as_str()?.to_string(),
        options: value.get("o")?.as_array()?.iter().filter_map(|option| option.as_str().map(String::from)).collect(),
        answer: value.get("a")?.as_str()?.to_string(),
        expl: value.get("e").and_then(|field| field.as_str()).unwrap_or("").to_string(),
        item,
        plan: value.get("p").and_then(|field| field.as_u64()).map(|plan| plan as usize),
        svg: value.get("s").and_then(|field| field.as_str()).unwrap_or("").to_string(),
    })
}

/// `boot_route` - Function 🚀
///
/// Startup: opens the screen named in the URL (resuming a deck / quiz / exam in progress);
/// bad links fall back to the hub.
///
/// @returns { void }
pub fn boot_route() {
    // the URL hash "#/<view>[/<chapter>]"
    let hash: String = win().location().hash().unwrap_or_default();
    let parts: Vec<String> = hash.trim_start_matches('#').trim_start_matches('/').split('/').map(|part| js_sys::decode_uri_component(part).ok().map(String::from).unwrap_or_else(|| part.to_string())).collect();
    let mut view = parts.first().cloned().unwrap_or_default();
    if !VIEWS.contains(&view.as_str()) {
        view = "hub".into();
    }
    // chapter views need a known chapter
    if CH_VIEWS.contains(&view.as_str()) {
        let ch = parts.get(1).cloned().unwrap_or_default();
        if app().ch.iter().any(|chapter| chapter.id == ch) {
            ui(|ui_state| ui_state.cur_ch = Some(ch));
        } else {
            view = "hub".into();
        }
    }
    let view: &'static str = VIEWS.iter().find(|candidate| **candidate == view).copied().unwrap_or("hub");
    // history entries carry the view { v }
    if let Ok(history) = win().history() {
        let st = |view_path: &str| {
            let state = js_sys::Object::new();
            set(&state, "v", &JsValue::from_str(view_path));
            state
        };
        // fresh tab opened on a deep link: rebuild the back stack (hub > chapter > screen)
        if history.length().unwrap_or(1) <= 1 && view != "hub" {
            let _ = history.replace_state_with_url(&st("hub"), "", Some("#/hub"));
            if let Some(parent_view) = parent(view) {
                if parent_view != "hub" {
                    let _ = history.push_state_with_url(&st(parent_view), "", Some(&route_url(parent_view)));
                }
            }
            let _ = history.push_state_with_url(&st(view), "", Some(&route_url(view)));
        }
    }
    // open it (a saved run may be restored only now)
    RESTORE.with(|restore| restore.set(true));
    ui(|ui_state| ui_state.nav_pop = true);
    go(view, None);
    RESTORE.with(|restore| restore.set(false));
}


// ===== NAVIGATION 🧭 ===== //

/// `tabof` - Function 🧭
///
/// @param { &str } view - a view
/// @returns { Option<&'static str> } - the tab it belongs to (None = no tab bar)
fn tabof(view: &str) -> Option<&'static str> {
    Some(match view { "hub" | "chapter" => "hub", "carte" => "carte", "revise" | "cert" => "revise", "settings" => "settings", _ => return None })
}

/// `parent` - Function 🔙
///
/// @param { &str } view - a view
/// @returns { Option<&'static str> } - its parent view (for Back)
fn parent(view: &str) -> Option<&'static str> {
    Some(match view {
        "chapter" => "hub", "study" | "quiz" | "chrono" | "bar" | "planFind" | "alg" | "brief" => "chapter", "review" | "exam" | "cert" => "revise", "carte" | "revise" | "settings" => "hub",
        _ => return None,
    })
}

/// `tabbar` - Function 🧭
///
/// @param { &str } where_ - the current view
/// @returns { void } - renders (or hides) the bottom tab bar
fn tabbar(where_: &str) {
    let tb = match query("#tabbar") {
        Some(tb) => tb,
        None => {
            let tb = doc().create_element("nav").unwrap();
            tb.set_id("tabbar");
            let _ = doc().body().unwrap().append_child(&tb);
            tb
        }
    };
    let cur = tabof(where_);
    set_style(&tb, "display", if cur.is_some() { "" } else { "none" });
    let _ = doc().body().unwrap().class_list().toggle_with_force("notabs", cur.is_none());
    let tabs = [("hub", "home", translate("Accueil", "Home")), ("carte", "book", translate("La Carte", "Menu")), ("revise", "redo", translate("Réviser", "Review")), ("settings", "user", translate("Profil", "Profile"))];
    tb.set_inner_html(&tabs.iter().map(|(view, icon, label)| format!("<button class=\"{}\" onclick=\"LTFgo('{}')\"><span class=\"pill\">{}</span>{}</button>", if Some(*view) == cur { "on" } else { "" }, view, ic(icon, 22), label)).collect::<String>());
}

/// `appbar` - Function 🔝
///
/// @param { &str } title - the title
/// @param { Option<&str> } back - the view of the back button
/// @param { &str } right - extra HTML on the right
/// @param { bool } big - large title
/// @returns { String } - the app bar HTML
pub fn appbar(title: &str, back: Option<&str>, right: &str, big: bool) -> String {
    format!(
        "<header class=\"appbar{}\">{}<div class=\"abt\">{}</div>{}</header>",
        if big { " big" } else { "" },
        back.map(|back_view| format!("<button class=\"ibtn\" onclick=\"LTFgo('{}')\" aria-label=\"back\">{}</button>", back_view, ic("back", 22))).unwrap_or_default(),
        title,
        right
    )
}

/// `flowbar` - Function 📊
///
/// @param { f64 } pct - the progress (0..100)
/// @param { &str } label - the counter ("3/10")
/// @returns { String } - the in-game bar: ✕, progress & counter
fn flowbar(pct: f64, label: &str) -> String {
    format!("<header class=\"appbar flow\"><button class=\"ibtn\" id=\"fx\" aria-label=\"close\">{}</button><div class=\"pbar\"><i style=\"width:{}%\"></i></div><div class=\"pl\">{}</div></header>", ic("x", 22), jsnum(pct), label)
}

/// `bind_x` - Function ✕
///
/// @param { &'static str } back - the view to go back to
/// @param { bool } ask - confirm first ("your progress will be lost")
/// @returns { void }
fn bind_x(back: &'static str, ask: bool) {
    if let Some(close_button) = query("#fx") {
        on(&close_button, "onclick", move |_| {
            if ask {
                confirm_dlg(&translate("Quitter ?", "Leave?"), &translate("Votre progression dans cette partie sera perdue.", "Your progress in this round will be lost."), &translate("Quitter", "Leave"), Rc::new(move || go(back, None)), true);
            } else {
                go(back, None);
            }
        });
    }
}

/// `go` - Function (window.LTFgo) 🧭
///
/// Shows a screen: stops the chrono, closes the overlays, updates the URL & the history,
/// updates the tab bar and renders the view (with the little enter animation).
///
/// @param { &str } where_ - the view
/// @param { Option<String> } arg - the view argument (e.g. the chapter id)
/// @returns { void }
pub fn go(where_: &str, arg: Option<String>) {
    // ⏱️ stop the chrono
    if let Some(tm) = ui(|ui_state| ui_state.timer) {
        win().clear_interval_with_handle(tm);
    }
    close_overlays();
    // remember the chapter
    if where_ == "chapter" {
        if let Some(id) = arg.clone().filter(|text| !text.is_empty()) {
            ui(|ui_state| ui_state.cur_ch = Some(id));
        }
    }
    // any normal navigation forgets the run in progress 🧹
    if !RESTORE.with(|restore| restore.get()) {
        run_clear();
    }
    // the current view & the "going back" flag
    let pop = ui(|ui_state| {
        ui_state.last_view = (where_.to_string(), arg.clone());
        let popping = ui_state.nav_pop;
        ui_state.nav_pop = false;
        popping
    });
    // 🔗 push (or replace, when going back) the URL
    if let Ok(history) = win().history() {
        let st = js_sys::Object::new();
        set(&st, "v", &JsValue::from_str(where_));
        let url = route_url(where_);
        let _ = if pop { history.replace_state_with_url(&st, "", Some(&url)) } else { history.push_state_with_url(&st, "", Some(&url)) };
    }
    // 🧭 tab bar & screen class
    tabbar(where_);
    let app_e = app_el();
    app_e.set_class_name(&format!("scr scr-{}", where_));
    // 📱 render the view
    match where_ {
        "chapter" => chapter(arg),
        "study" => study(),
        "quiz" => quiz(),
        "chrono" => chrono(),
        "exam" => exam(),
        "review" => review(),
        "revise" => revise(),
        "carte" => carte(),
        "settings" => settings(),
        "bar" => bar(),
        "planFind" => plan_find(),
        "alg" => alg_screen(),
        "brief" => brief_screen(),
        "cert" => cert(),
        _ => hub(),
    }
    // scroll to the top & replay the enter animation ✨
    win().scroll_to_with_x_and_y(0.0, 0.0);
    let _ = app_e.class_list().remove_1("enter");
    let _ = app_e.offset_width();
    let _ = app_e.class_list().add_1("enter");
}

/// `on_popstate` - Function 🔙
///
/// Back: closes the open overlay first, else goes to the parent view.
///
/// @returns { void }
pub fn on_popstate() {
    if query(".ov").is_some() {
        close_overlays();
        if let Ok(history) = win().history() {
            let _ = history.push_state_with_url(&js_sys::Object::new(), "", None);
        }
        return;
    }
    let lv = ui(|ui_state| ui_state.last_view.0.clone());
    if let Some(parent_view) = parent(&lv) {
        ui(|ui_state| ui_state.nav_pop = true);
        go(parent_view, None);
    }
}

/// `lang_btn` - Function 🌍
///
/// @returns { String } - the FR / EN switch of the hero
fn lang_btn() -> String {
    format!("<button class=\"hlang\" onclick=\"LTFlang('{}')\">{}</button>", if en() { "fr" } else { "en" }, if en() { "FR" } else { "EN" })
}

/// `ring` - Function 📈
///
/// @param { &str } percent - a % (0..100)
/// @param { bool } big - large ring
/// @returns { String } - the progress ring
fn ring(percent: &str, big: bool) -> String {
    format!("<div class=\"ring{}\" style=\"--p:{}\"><span>{}%</span></div>", if big { " big" } else { "" }, percent, percent)
}

/// `cur_ch` - Function 📚
///
/// @returns { String } - the current chapter id
fn cur_ch() -> String {
    ui(|ui_state| ui_state.cur_ch.clone()).unwrap_or_else(|| "undefined".into())
}

/// `set_app` - Function 📱
///
/// @param { &str } html - the new screen HTML
/// @returns { void }
fn set_app(html: &str) {
    app_el().set_inner_html(html);
}


// ===== SCREENS 📱 ===== //

/// `hub` - Function 🏠
///
/// The home screen: hero, rank card (XP, streak, mastery), quick actions & the chapters.
///
/// @returns { void }
fn hub() {
    let built_app = app();
    let current_xp = xp();
    let lvl = current_xp % 300.0;
    let html = format!(
        "<div class=\"hero\" style=\"background-image:url('hero.jpg')\">{lang}<div class=\"heroin\"><div class=\"kicker\">Sofitel Marseille Vieux-Port</div><h1>Les Trois Forts</h1><div class=\"sub\">Service Academy</div></div></div>\n  \
        <div class=\"pad\">\n  \
        <div class=\"card rankc\"><div class=\"row\"><div class=\"grow\"><div class=\"muted\">{yr}</div><div class=\"rk\">{rank}</div></div>\n   \
        <div class=\"stat st1\">{flame}<span>{streak} {day_unit}</span></div><div class=\"stat st2\">{target}<span>{mast}%</span></div></div>\n   \
        <div class=\"bar\"><i style=\"width:{level_width}%\"></i></div><div class=\"muted sm\">{xp} XP · {left} {next}</div></div>\n  \
        <div class=\"qa\"><button class=\"card\" onclick=\"LTFgo('exam')\">{cap}<span>{exam}</span></button><button class=\"card\" onclick=\"LTFgo('review')\">{redo}<span>{err} · {nrev}</span></button><button class=\"card\" onclick=\"LTFgo('carte')\">{book}<span>{carte}</span></button></div>\n  \
        <div class=\"sh\">{chs}</div>\n  \
        {list}\n  \
        </div>",
        lang = lang_btn(),
        yr = translate("Votre rang", "Your rank"),
        rank = rank(),
        flame = ic("flame", 20),
        streak = js(&s_get("streak")),
        day_unit = translate("j", "d"),
        target = ic("target", 20),
        mast = mastery(None),
        level_width = jsnum(lvl / 3.0),
        xp = js(&s_get("xp")),
        left = jsnum(300.0 - lvl),
        next = translate("XP avant le prochain rang", "XP to the next rank"),
        cap = ic("cap", 24),
        exam = translate("Examen", "Exam"),
        redo = ic("redo", 24),
        err = translate("Erreurs", "Mistakes"),
        nrev = s_get("review").as_array().map(|review| review.len()).unwrap_or(0),
        book = ic("book", 24),
        carte = translate("La Carte", "Menu"),
        chs = translate("Chapitres", "Chapters"),
        list = built_app.ch.iter().map(|chapter| format!("<button class=\"li\" onclick=\"LTFgo('chapter','{}')\"><div class=\"av\">{}</div><div class=\"tx\"><div class=\"n\">{}</div><div class=\"muted\">{}</div></div>{}</button>", chapter.id, ic(chic(chapter.id), 22), chapter.name, chapter.sub, ring(&mastery(Some(chapter.id)), false))).collect::<String>()
    );
    set_app(&html);
}

/// `chapter` - Function 📚
///
/// A chapter: its mastery ring and its game modes (study, quiz, chrono + the chapter's own games).
///
/// @param { Option<String> } id - the chapter id (the current one when None)
/// @returns { void }
fn chapter(id: Option<String>) {
    if let Some(id) = id.filter(|text| !text.is_empty()) {
        ui(|ui_state| ui_state.cur_ch = Some(id));
    }
    let built_app = app();
    let cc = cur_ch();
    let ci = match built_app.ch.iter().position(|candidate| candidate.id == cc) { Some(index) => index, None => return };
    let current_chapter = &built_app.ch[ci];
    let its: Vec<&Item> = built_app.items.iter().filter(|item| item.ch == cc).collect();
    let total = its.len();
    let mast = its.iter().filter(|item| mastered(&item.id)).count();
    let idx = ci + 1;
    let mut modes: Vec<(&str, &str, String, String, String)> = vec![("study", "cards", translate("Étudier", "Study"), translate("Cartes recto-verso avec photos", "Flashcards with photos"), format!("{} {}", total, translate("cartes", "cards")))];
    if cc == "plan" {
        modes.push(("planFind", "pin", translate("Trouve la table", "Find the table"), translate("Touchez la table annoncée", "Tap the table called out"), "10 tables".into()));
        modes.push(("quiz", "quiz", translate("Quel numéro ?", "Which number?"), translate("10 questions", "10 questions"), String::new()));
    } else {
        modes.push(("quiz", "quiz", "Quiz".into(), translate("10 questions, explications", "10 questions with explanations"), String::new()));
    }
    modes.push(("chrono", "timer", "Chrono".into(), translate("60 secondes, combos", "60 seconds, combos"), format!("{} {}", translate("Record", "Best"), jsnum(best(&cc)))));
    if cc == "cock" {
        modes.push(("bar", "glass", translate("Le Bar", "The Bar"), translate("Montez le cocktail", "Build the cocktail"), String::new()));
    }
    if cc == "jour" {
        modes.push(("brief", "clip", translate("Briefing", "Briefing"), translate("Tables, notes et retour de pêche", "Tables, notes and catch of the day"), String::new()));
    }
    if cc == "hiver" {
        modes.push(("alg", "shield", translate("Allergènes", "Allergens"), translate("Plat par plat, d'après la dégustation", "Dish by dish, from the tasting"), String::new()));
    }
    let html = appbar("", Some("hub"), "", false)
        + &format!(
            "<div class=\"pad\"><div class=\"kick2\">{} {}</div><h1 class=\"ptitle\">{}</h1><div class=\"muted\">{}</div>\n  <div class=\"card row mt\">{}<div><div class=\"b\">{} / {} {}</div><div class=\"muted sm\">{}</div></div></div>\n  <div class=\"sh\">{}</div>\n  {}\n  </div><div class=\"cta\"><button class=\"btn\" onclick=\"LTFgo('quiz')\">{} {}</button></div>",
            translate("Chapitre", "Chapter"),
            idx,
            current_chapter.name,
            current_chapter.sub,
            ring(&mastery(Some(&cc)), true),
            mast,
            total,
            translate("maîtrisés", "mastered"),
            translate("Une carte est maîtrisée après 3 bonnes réponses de suite.", "A card is mastered after 3 correct answers in a row."),
            translate("Modes de jeu", "Game modes"),
            modes.iter().map(|(view, icon, tt, subtitle, record)| format!("<button class=\"li tall\" onclick=\"LTFgo('{}')\"><div class=\"av\">{}</div><div class=\"tx\"><div class=\"n\">{}</div><div class=\"muted\">{}</div></div><div class=\"rt\">{}{}</div></button>", view, ic(icon, 22), tt, subtitle, if !record.is_empty() { format!("<span class=\"muted sm\">{}</span>", record) } else { String::new() }, ic("chev", 18))).collect::<String>(),
            ic("quiz", 20),
            translate("Lancer un quiz", "Start a quiz")
        );
    set_app(&html);
}

/// `brief_screen` - Function 📋
///
/// The daily briefing: headline, reserved tables & notes (no guest names: privacy 🛡️).
///
/// @returns { void }
fn brief_screen() {
    let built_app = app();
    let jour = &built_app.data["jour"];
    let lang_key = if en() { "en" } else { "fr" };
    let empty = vec![];
    let text_of = |value: &Value| -> String { match value { Value::String(text) => text.clone(), Value::Number(number) => number.to_string(), _ => String::new() } };
    let peche: String = jour["peche"].as_array().unwrap_or(&empty).iter().map(|catch_of_day| format!("<div class=\"card sm row\"><div class=\"tx\">{}</div><div class=\"rt\"><b>{}</b></div></div>", text_of(&catch_of_day[if lang_key == "en" { 1 } else { 0 }]), text_of(&catch_of_day[2]))).collect();
    let tables: String = jour["tables"].as_array().unwrap_or(&empty).iter().map(|table| {
        let note = text_of(&table[if lang_key == "en" { 4 } else { 3 }]);
        format!("<div class=\"card sm rescard\" data-res=\"{}\"><div class=\"b\">{} · {} · {} p<span class=\"gn\" data-t=\"{}\"></span></div>{}</div>", text_of(&table[1]), text_of(&table[0]), text_of(&table[1]), text_of(&table[2]), text_of(&table[1]), if note.is_empty() { String::new() } else { format!("<div class=\"muted sm\">{}</div>", note) })
    }).collect();
    let res: Vec<String> = jour["tables"].as_array().unwrap_or(&empty).iter().map(|table| text_of(&table[1])).collect();
    let plan = format!("<div class=\"sh\">{}</div><div class=\"card bplan\" id=\"bplan\" data-l=\"{}\">{}<button class=\"chip gold bpfs\" id=\"bpFull\">⛶ {}</button></div><div class=\"muted sm bpleg\"><span class=\"bpdot\"></span> {}</div>", translate("Plan des tables", "Table plan"), lang_key, plan_svg_res(None, true, &res), translate("Plein écran", "Full screen"), translate("Réservée · touchez une table pour voir la réservation", "Reserved · tap a table to see the booking"));
    let html = appbar(&translate("Briefing", "Briefing"), Some("chapter"), "", false) + &format!(
        "<div class=\"pad\"><div class=\"card sm\"><div class=\"b\">{}</div></div>{}{}{}<div class=\"sh\">{}</div><div class=\"card sm\" id=\"gnBox\" data-l=\"{}\"></div>{}</div>",
        text_of(&jour["head"][lang_key]),
        plan,
        if peche.is_empty() { String::new() } else { format!("<div class=\"sh\">{}</div>", translate("Retour de pêche", "Catch of the day")) },
        peche,
        translate("Tables", "Tables"),
        lang_key,
        tables,
    );
    set_app(&html);
}

/// `alg_screen` - Function ⚠️
///
/// The allergen table of the winter menu, dish by dish.
///
/// @returns { void }
fn alg_screen() {
    let built_app = app();
    let empty = vec![];
    let ds: Vec<&Value> = built_app.data["dishes"].as_array().unwrap_or(&empty).iter().filter(|dish| dish["svc"].as_array().map(|services| services.iter().any(|service| service == "hiver")).unwrap_or(false)).collect();
    let rows: String = ds.iter().map(|dish| {
        let al = crate::build::alg_of(dish);
        let chips = if al.is_empty() { format!("<span class=\"muted sm\">{}</span>", translate("Aucun allergène majeur annoncé", "No major allergen stated")) } else { al.iter().map(|(code, likely)| format!("<span class=\"chip{}\">{}{}</span>", if *likely { " q" } else { "" }, crate::build::alg_lab(code), if *likely { " ?" } else { "" })).collect::<String>() };
        format!("<div class=\"card sm\"><div class=\"b\">{}</div><div class=\"algs\">{}</div></div>", dish["n"].as_str().unwrap_or(""), chips)
    }).collect();
    let html = appbar(&translate("Allergènes", "Allergens"), Some("chapter"), "", false) + &format!("<div class=\"pad\"><p class=\"muted sm\">{}</p><p class=\"muted sm\">{}</p>\n  {}</div>", crate::build::alg_note(), translate("Plein = annoncé par la carte ou le chef · « ? » = probable, à vérifier.", "Solid = stated by the menu or the chef · \"?\" = likely, to check."), rows);
    set_app(&html);
}

/// `study` - Function 🃏
///
/// Flash cards of the current chapter (or the deck saved before a refresh).
///
/// @returns { void }
fn study() {
    let built_app = app();
    let cc = cur_ch();
    let idxs: Vec<usize> = (0..built_app.items.len()).filter(|&index| built_app.items[index].ch == cc).collect();
    if let Some(saved) = run_take("study") {
        let pool: Vec<usize> = saved.get("pool").and_then(|pool_value| pool_value.as_array()).map(|pool_ids| pool_ids.iter().filter_map(|id_value| id_value.as_str().and_then(|id| built_app.item(id))).collect()).unwrap_or_default();
        let card_index = saved.get("k").and_then(|value| value.as_u64()).unwrap_or(0) as usize;
        if !pool.is_empty() && card_index < pool.len() {
            return study_show(Rc::new(pool), card_index);
        }
    }
    let pool = Rc::new(shuffle(&idxs));
    study_show(pool, 0);
}

/// `study_show` - Function 🃏
///
/// Shows card k (or ends the deck): tap to flip, "review again" / "I know it".
///
/// @param { Rc<Vec<usize>> } pool - the shuffled item indexes
/// @param { usize } card_index - the card to show
/// @returns { void }
fn study_show(pool: Rc<Vec<usize>>, card_index: usize) {
    let built_app = app();
    if card_index >= pool.len() {
        toast(&translate("Paquet terminé !", "Deck done!"));
        return go("chapter", None);
    }
    run_save(json!({"v": "study", "ch": cur_ch(), "k": card_index, "pool": pool.iter().map(|&index| built_app.items[index].id.clone()).collect::<Vec<_>>()}));
    let item_index = pool[card_index];
    let it = &built_app.items[item_index];
    let ph = photo_of(item_index);
    let front = if it.ch == "plan" { plan_svg(Some(&it.front), false) } else { format!("<div class=\"fq\">{}</div>{}", it.front, say_btn(it)) };
    let html = flowbar(100.0 * card_index as f64 / pool.len() as f64, &format!("{}/{}", card_index + 1, pool.len()))
        + &format!(
            "<div class=\"pad\">\n    <div class=\"flip\" id=\"flip\"><div class=\"face front\">{}<small class=\"hint\">{}</small></div><div class=\"face back\">{}<div class=\"btxt\">{}</div>{}</div></div></div>\n    <div class=\"abar fixed\"><button class=\"btn sec grow\" id=\"no\">{}</button><button class=\"btn grow ok\" id=\"yes\">{} {}</button></div>",
            front,
            translate("Touchez pour retourner", "Tap to flip"),
            ph.map(|photo| format!("<img class=\"bimg\" src=\"{}\" alt=\"\">", photo)).unwrap_or_default(),
            if it.ch == "plan" { format!("<b>{}</b><br>{}", it.front, it.back) } else { it.back.clone() },
            if it.has_info() { format!("<button class=\"chip gold\" onclick=\"event.stopPropagation();LTFinfo('{}')\">{} {}</button>", it.id, ic("info", 16), translate("Infos client", "Guest info")) } else { String::new() },
            translate("À revoir", "Review again"),
            ic("check", 20),
            translate("Je savais", "I knew it")
        );
    set_app(&html);
    bind_x("chapter", false);
    if let Some(flip_button) = query("#flip") {
        let f2 = flip_button.clone();
        on(&flip_button, "onclick", move |_| {
            let _ = f2.class_list().toggle("on");
        });
    }
    let (p1, p2) = (pool.clone(), pool.clone());
    let id = it.id.clone();
    let id2 = id.clone();
    if let Some(yes_button) = query("#yes") {
        on(&yes_button, "onclick", move |_| {
            record(&id, true, 2.0);
            study_show(p1.clone(), card_index + 1);
        });
    }
    if let Some(no_button) = query("#no") {
        on(&no_button, "onclick", move |_| {
            record(&id2, false, 0.0);
            study_show(p2.clone(), card_index + 1);
        });
    }
}


// ===== QUIZ ENGINE ❓ ===== //

/// `q_for` - Function ❓
///
/// @param { usize } item_index - an item index
/// @returns { Option<Q> } - a question from one of its generators (6 tries)
pub fn q_for(item_index: usize) -> Option<Question> {
    let it = &app().items[item_index];
    for _ in 0..6 {
        let generator = &it.gens[pick_idx(it.gens.len())];
        let question = match generator {
            Gen::Mcq { prompt, correct, pool, expl } => mcq(prompt, correct, pool, expl, item_index),
            Gen::Plan(table_index) => Some(Question { prompt: String::new(), options: vec![], answer: String::new(), expl: String::new(), item: item_index, plan: Some(*table_index), svg: String::new() }),
        };
        if question.is_some() {
            return question;
        }
    }
    None
}

/// `rand_q` - Function 🎲
///
/// Picks a random question, weighted by mastery: new items x2, mastered x1, failing x3.
///
/// @param { Option<&str> } ch - a chapter id (all chapters when None)
/// @returns { Option<Q> } - a question
pub fn rand_q(ch: Option<&str>) -> Option<Question> {
    let built_app = app();
    let mut weighted: Vec<usize> = vec![];
    for (index, it) in built_app.items.iter().enumerate() {
        if let Some(chapter) = ch {
            if it.ch != chapter {
                continue;
            }
        }
        let weight = match m_of(&it.id) { None => 2, Some(stats) => if num(stats.get("s").unwrap_or(&Value::Null)) >= 3.0 { 1 } else { 3 } };
        for _ in 0..weight {
            weighted.push(index);
        }
    }
    if weighted.is_empty() {
        return None;
    }
    for _ in 0..10 {
        if let Some(question) = q_for(weighted[pick_idx(weighted.len())]) {
            return Some(question);
        }
    }
    None
}

/// `plan_q` - Function 🗺️
///
/// @param { &mut Q } question - a floor plan question (turned into "which number is highlighted?")
/// @returns { void }
fn plan_q(question: &mut Question) {
    let built_app = app();
    let tables = built_app.data["tables"].as_array().cloned().unwrap_or_default();
    let tid = gs(&tables[question.plan.unwrap()], "id");
    question.prompt = translate("Quel est le numéro de la table en surbrillance ?", "What is the number of the highlighted table?");
    let others: Vec<String> = tables.iter().map(|table| gs(table, "id")).filter(|table_id| *table_id != tid).collect();
    let mut options = vec![tid.clone()];
    options.extend(shuffle(&others).into_iter().take(3));
    question.options = shuffle(&options);
    question.answer = tid.clone();
    question.expl = String::new();
    question.svg = plan_svg(Some(&tid), false);
}

/// `q_photo` - Function 🖼️
///
/// @param { &Q } question - a question
/// @returns { String } - the item photo, only when the question names the item (else '')
fn q_photo(question: &Question) -> String {
    let built_app = app();
    if !question.svg.is_empty() {
        return String::new();
    }
    let ph = match photo_of(question.item) { Some(photo) => photo, None => return String::new() };
    let nm = norm(&strip(&built_app.items[question.item].front));
    if !nm.is_empty() && norm(&question.prompt).contains(&nm) { format!("<img class=\"qimg\" src=\"{}\" alt=\"\">", ph) } else { String::new() }
}

/// `opts_html` - Function 🔘
///
/// @param { &Q } question - a question
/// @returns { String } - its option buttons (A, B, C, D)
fn opts_html(question: &Question) -> String {
    question.options.iter().enumerate().map(|(index, option)| format!("<button class=\"opt\" data-i=\"{}\"><span class=\"k\">{}</span><span>{}</span></button>", index, "ABCDEF".chars().nth(index).map(|character| character.to_string()).unwrap_or("undefined".into()), esc(option))).collect()
}

/// `data_i` - Function 🔢
///
/// @param { &Element } button - an option button
/// @returns { usize } - its `data-i`
fn data_i(button: &Element) -> usize {
    button.get_attribute("data-i").and_then(|text| text.parse().ok()).unwrap_or(usize::MAX)
}

// called at the end of a run with (score, total, seconds) 🏁
type OnEnd = Rc<dyn Fn(usize, usize, f64)>;

/// `Run` - Struct ❓
///
/// A quiz / exam / review in progress.
struct Run {
    kind: &'static str,
    title: String,
    qs: RefCell<Vec<Question>>,
    back: &'static str,
    on_end: OnEnd,
    xp: f64,
    index: Cell<usize>,
    score: Cell<usize>,
    t0: f64,
}

/// `run_quiz` - Function ❓
///
/// Starts a run (or resumes the one saved before a refresh).
///
/// @param { &'static str } kind - 'quiz', 'exam' or 'review'
/// @param { String } title - the title
/// @param { Vec<Q> } qs - the questions
/// @param { &'static str } back - the view to go back to
/// @param { OnEnd } on_end - called at the end
/// @param { f64 } xp - XP per right answer
/// @returns { void }
fn run_quiz(kind: &'static str, title: String, qs: Vec<Question>, back: &'static str, on_end: OnEnd, xp: f64) {
    let run = Rc::new(Run { kind, title, qs: RefCell::new(qs), back, on_end, xp, index: Cell::new(0), score: Cell::new(0), t0: js_sys::Date::now() });
    run_show(run);
}

/// `run_resume` - Function 🔁
///
/// Resumes a quiz / exam / review saved before a refresh.
///
/// @param { &'static str } kind - 'quiz', 'exam' or 'review'
/// @param { &'static str } back - the view to go back to
/// @param { OnEnd } on_end - called at the end
/// @param { f64 } xp - XP per right answer
/// @returns { bool } - false when there is none
fn run_resume(kind: &'static str, back: &'static str, on_end: OnEnd, xp: f64) -> bool {
    let saved = match run_take(kind) { Some(saved) => saved, None => return false };
    let qs: Vec<Question> = saved.get("qs").and_then(|value| value.as_array()).map(|array| array.iter().filter_map(q_from_json).collect()).unwrap_or_default();
    let question_index = saved.get("k").and_then(|value| value.as_u64()).unwrap_or(0) as usize;
    if qs.is_empty() || question_index >= qs.len() {
        return false;
    }
    let title = saved.get("t").and_then(|value| value.as_str()).unwrap_or("Quiz").to_string();
    let score = saved.get("sc").and_then(|value| value.as_u64()).unwrap_or(0) as usize;
    let el = saved.get("el").and_then(|value| value.as_f64()).unwrap_or(0.0);
    let run = Rc::new(Run { kind, title, qs: RefCell::new(qs), back, on_end, xp, index: Cell::new(question_index), score: Cell::new(score), t0: js_sys::Date::now() - el });
    run_show(run);
    true
}

/// `run_persist` - Function 💾
///
/// @param { &Run } run - the run
/// @param { usize } question_index - the next question
/// @returns { void } - saves it in sessionStorage
fn run_persist(run: &Run, question_index: usize) {
    if question_index >= run.qs.borrow().len() {
        return run_clear();
    }
    run_save(json!({"v": run.kind, "ch": cur_ch(), "t": run.title, "k": question_index, "sc": run.score.get(), "el": js_sys::Date::now() - run.t0, "qs": run.qs.borrow().iter().map(q_to_json).collect::<Vec<_>>()}));
}

/// `run_show` - Function ❓
///
/// Shows the current question: answers turn green / red, a feedback sheet explains, then the next one.
///
/// @param { Rc<Run> } run - the run
/// @returns { void }
fn run_show(run: Rc<Run>) {
    close_overlays();
    let built_app = app();
    let question_index = run.index.get();
    let total = run.qs.borrow().len();
    if question_index >= total {
        run_clear();
        let secs = round((js_sys::Date::now() - run.t0) / 1000.0);
        return (run.on_end)(run.score.get(), total, secs);
    }
    {
        let mut qs = run.qs.borrow_mut();
        if qs[question_index].plan.is_some() {
            plan_q(&mut qs[question_index]);
        }
    }
    run_persist(&run, question_index);
    let question = run.qs.borrow()[question_index].clone();
    let html = flowbar(100.0 * question_index as f64 / total as f64, &format!("{}/{}", question_index + 1, total))
        + &format!(
            "<div class=\"pad\">{}<div class=\"muted sm\">{} · {}</div><h2 class=\"qq\">{}</h2>\n    <div class=\"opts\">{}</div></div>",
            if !question.svg.is_empty() { format!("<div class=\"card\">{}</div>", question.svg) } else { q_photo(&question) },
            run.title,
            built_app.ch_name(built_app.items[question.item].ch),
            esc(&question.prompt),
            opts_html(&question)
        );
    set_app(&html);
    bind_x(run.back, question_index > 0);
    let app_e: Element = app_el().into();
    for button in qa_in(&app_e, ".opt") {
        let (r2, q2, b2, ae) = (run.clone(), question.clone(), button.clone(), app_e.clone());
        on(&button, "onclick", move |_| {
            let built_app = app();
            let ok = q2.options.get(data_i(&b2)) == Some(&q2.answer);
            for option_button in qa_in(&ae, ".opt") {
                let _ = option_button.set_attribute("disabled", "");
                if q2.options.get(data_i(&option_button)) == Some(&q2.answer) {
                    let _ = option_button.class_list().add_1("right");
                    if let Some(kk) = qin(&option_button, ".k") {
                        kk.set_inner_html(&ic("check", 16));
                    }
                }
            }
            if !ok {
                let _ = b2.class_list().add_1("wrong");
            }
            if ok {
                r2.score.set(r2.score.get() + 1);
            }
            beep(ok);
            let it = &built_app.items[q2.item];
            record(&it.id, ok, if r2.xp != 0.0 { r2.xp } else { 10.0 });
            run_persist(&r2, r2.index.get() + 1);
            let xpl = if r2.xp != 0.0 { r2.xp } else { 10.0 };
            let feedback = create("div");
            feedback.set_id("fb");
            feedback.set_class_name(&format!("ov fbsheet {}", if ok { "okc" } else { "koc" }));
            feedback.set_inner_html(&format!(
                "<div class=\"fbt\">{} {}</div><div class=\"fbx\">{}{}</div><div class=\"fbb\">{}<button class=\"btn grow\" id=\"nx\">{}</button></div>",
                ic(if ok { "check" } else { "x" }, 22),
                if ok { format!("{} +{} XP", translate("Bonne réponse !", "Correct!"), jsnum(xpl)) } else { translate("Pas tout à fait", "Not quite") },
                if ok { String::new() } else { format!("{} : <b>{}</b>. ", translate("Réponse", "Answer"), esc(&q2.answer)) },
                if !q2.expl.is_empty() { esc(&q2.expl) } else { String::new() },
                if it.has_info() { format!("<button class=\"btn sec sq\" onclick=\"LTFinfo('{}')\" aria-label=\"info\">{}</button>", it.id, ic("info", 20)) } else { String::new() },
                translate("Continuer", "Continue")
            ));
            let _ = doc().body().unwrap().append_child(&feedback);
            let r3 = r2.clone();
            on_sel(&feedback, "#nx", move |_| {
                r3.index.set(r3.index.get() + 1);
                run_show(r3.clone());
            });
        });
    }
}

/// `quiz` - Function ❓
///
/// 10 random questions of the current chapter.
///
/// @returns { void }
fn quiz() {
    if run_resume("quiz", "chapter", Rc::new(|score, total, tt| end_screen(score, total, "chapter", Some("quiz"), tt)), 0.0) {
        return;
    }
    let cc = cur_ch();
    let mut qs = vec![];
    for _ in 0..10 {
        if let Some(question) = rand_q(Some(&cc)) {
            qs.push(question);
        }
    }
    run_quiz("quiz", "Quiz".into(), qs, "chapter", Rc::new(|score, total, tt| end_screen(score, total, "chapter", Some("quiz"), tt)), 0.0);
}

/// `fmt_t` - Function ⏱️
///
/// @param { f64 } tt - seconds
/// @returns { String } - "m:ss" ('' for 0)
fn fmt_t(tt: f64) -> String {
    if tt == 0.0 || tt.is_nan() {
        return String::new();
    }
    let minutes = (tt / 60.0).floor();
    let seconds = tt % 60.0;
    format!("{}:{:0>2}", jsnum(minutes), jsnum(seconds))
}

/// `end_screen` - Function 🏁
///
/// The result dialog: score, mistakes, time, and play again / review mistakes / back.
///
/// @param { usize } score - the score
/// @param { usize } total - the number of questions
/// @param { &'static str } back - the view to go back to
/// @param { Option<&'static str> } again - the view of "play again"
/// @param { f64 } secs - the time spent
/// @returns { void }
fn end_screen(score: usize, total: usize, back: &'static str, again: Option<&'static str>, secs: f64) {
    let pct = round(100.0 * score as f64 / total as f64);
    if pct == 100.0 {
        confetti();
    }
    let msg = if pct >= 90.0 { translate("Digne d'un Maître d'hôtel", "Maître d'hôtel material") } else if pct >= 70.0 { translate("Très bon service", "Great service") } else if pct >= 50.0 { translate("On y est presque", "Almost there") } else { translate("À retravailler, courage", "Keep at it") };
    set_app(&flowbar(100.0, &format!("{}/{}", total, total)));
    bind_x(back, false);
    let dialog_element = dialog(
        &format!(
            "<div class=\"dic\">{}</div><div class=\"dscore\">{} / {}</div><div class=\"dt\">{}</div><div class=\"muted\">{} · {} XP</div>\n   <div class=\"dstats\"><div><b>{}%</b><span>Score</span></div><div><b>{}</b><span>{}</span></div>{}</div>\n   <button class=\"btn\" id=\"dag\">{}</button>{}<button class=\"btn txt\" id=\"dbk\">{}</button>",
            ic(if pct >= 70.0 { "award" } else { "cap" }, 40),
            score,
            total,
            msg,
            rank(),
            js(&s_get("xp")),
            jsnum(pct),
            total - score,
            translate("Erreurs", "Mistakes"),
            if secs != 0.0 && !secs.is_nan() { format!("<div><b>{}</b><span>{}</span></div>", fmt_t(secs), translate("Temps", "Time")) } else { String::new() },
            translate("Rejouer", "Play again"),
            if total > score { format!("<button class=\"btn sec\" id=\"drv\">{}</button>", translate("Revoir mes erreurs", "Review my mistakes")) } else { String::new() },
            translate("Terminer", "Done")
        ),
        false,
    );
    let ag = again.unwrap_or(back);
    on_sel(&dialog_element, "#dag", move |_| go(ag, None));
    on_sel(&dialog_element, "#drv", move |_| go("review", None));
    on_sel(&dialog_element, "#dbk", move |_| go(back, None));
}

/// `exam_end` - Function 🎓
///
/// @returns { OnEnd } - 80% or more = the certificate, else the result dialog
fn exam_end() -> OnEnd {
    Rc::new(|score, total, tt| {
        let pct = round(100.0 * score as f64 / total as f64);
        if pct >= 80.0 {
            let date: String = js_sys::Date::new_0().to_locale_date_string(if en() { "en-GB" } else { "fr-FR" }, &JsValue::UNDEFINED).into();
            s_set("exam", json!({"score": num_val(pct), "date": date}));
            save();
            go("cert", None);
        } else {
            end_screen(score, total, "revise", Some("exam"), tt);
        }
    })
}

/// `exam` - Function 🎓
///
/// The final exam: 3 questions per chapter, 15 XP each.
///
/// @returns { void }
fn exam() {
    if run_resume("exam", "revise", exam_end(), 15.0) {
        return;
    }
    let built_app = app();
    let mut qs = vec![];
    for chapter in &built_app.ch {
        for _ in 0..3 {
            if let Some(question) = rand_q(Some(chapter.id)) {
                qs.push(question);
            }
        }
    }
    run_quiz("exam", translate("Examen final", "Final exam"), shuffle(&qs), "revise", exam_end(), 15.0);
}

/// `cert` - Function 🏆
///
/// @returns { void } - the certificate (back to Réviser when the exam isn't passed)
fn cert() {
    let ex = s_get("exam");
    if !truthy(&ex) {
        return revise();
    }
    confetti();
    set_app(&(appbar(&translate("Certificat", "Certificate"), Some("revise"), "", false)
        + &format!(
            "<div class=\"pad\"><div class=\"cert\"><div class=\"kicker\">Les Trois Forts · Sofitel Marseille Vieux-Port</div><h1>{}</h1><p>{}</p><div class=\"score\">{}%</div><p>{} · {}</p></div></div>",
            translate("Certifié", "Certified"),
            translate("a réussi l'examen final de la Service Academy", "passed the Service Academy final exam"),
            gs(&ex, "score"),
            gs(&ex, "date"),
            rank()
        )));
}

/// `review_items` - Function 🔁
///
/// @returns { Vec<usize> } - the items of the review list
fn review_items() -> Vec<usize> {
    let built_app = app();
    crate::state::review().iter().filter_map(|id| built_app.item(id)).collect()
}

/// `revise` - Function 🔁
///
/// The Réviser tab: my mistakes, the final exam, the certificate & the list to review.
///
/// @returns { void }
fn revise() {
    let built_app = app();
    let its = review_items();
    let ex = s_get("exam");
    let total = its.len();
    let html = appbar(&translate("Réviser", "Review"), None, "", true)
        + &format!(
            "<div class=\"pad\">\n  <button class=\"card hero2\" onclick=\"LTFgo('review')\" {}><div class=\"av big\">{}</div><div class=\"tx\"><div class=\"n\">{}</div><div class=\"muted\">{}</div></div>{}</button>\n  <button class=\"card hero2\" onclick=\"LTFgo('exam')\"><div class=\"av big\">{}</div><div class=\"tx\"><div class=\"n\">{}</div><div class=\"muted\">{}</div></div>{}</button>\n  {}\n  {}\n  </div>",
            if total > 0 { "" } else { "disabled" },
            ic("redo", 26),
            translate("Mes erreurs", "My mistakes"),
            if total > 0 { format!("{} {}", total, translate("à revoir · quiz de 15 max", "to review · up to 15 questions")) } else { translate("Aucune erreur à revoir. Impeccable !", "No mistakes to review. Flawless!") },
            if total > 0 { ic("chev", 18) } else { String::new() },
            ic("cap", 26),
            translate("Examen final", "Final exam"),
            translate("3 questions par chapitre · 80 % pour le certificat", "3 questions per chapter · 80% for the certificate"),
            ic("chev", 18),
            if truthy(&ex) { format!("<button class=\"card hero2\" onclick=\"LTFgo('cert')\"><div class=\"av big\">{}</div><div class=\"tx\"><div class=\"n\">{}</div><div class=\"muted\">{}% · {}</div></div>{}</button>", ic("award", 26), translate("Mon certificat", "My certificate"), gs(&ex, "score"), gs(&ex, "date"), ic("chev", 18)) } else { String::new() },
            if total > 0 {
                format!("<div class=\"sh\">{}</div>", translate("À revoir", "To review"))
                    + &its.iter().take(40).map(|&index| {
                        let it = &built_app.items[index];
                        let ph = photo_of(index);
                        format!(
                            "<div class=\"li\" {}>{}<div class=\"tx\"><div class=\"n\">{}</div><div class=\"muted sm\">{}</div></div></div>",
                            if it.has_info() { format!("onclick=\"LTFinfo('{}')\"", it.id) } else { String::new() },
                            match ph { Some(photo) => format!("<img class=\"thumb\" src=\"{}\" loading=\"lazy\" alt=\"\">", photo), None => format!("<div class=\"av\">{}</div>", ic(chic(it.ch), 20)) },
                            if it.ch == "plan" { format!("{} {}", translate("Table", "Table"), it.front) } else { it.front.clone() },
                            built_app.ch_name(it.ch)
                        )
                    }).collect::<String>()
            } else {
                String::new()
            }
        );
    set_app(&html);
}

/// `review` - Function 🔁
///
/// A quiz of up to 15 items from the review list.
///
/// @returns { void }
fn review() {
    if run_resume("review", "revise", Rc::new(|score, total, tt| end_screen(score, total, "revise", Some("review"), tt)), 0.0) {
        return;
    }
    let its = review_items();
    if its.is_empty() {
        return go("revise", None);
    }
    let qs: Vec<Question> = shuffle(&its).into_iter().take(15).filter_map(q_for).collect();
    run_quiz("review", translate("Révision", "Review"), qs, "revise", Rc::new(|score, total, tt| end_screen(score, total, "revise", Some("review"), tt)), 0.0);
}


// ===== CHRONO ⏱️ ===== //

/// `Chrono` - Struct ⏱️
///
/// The chrono game state: time left, score, combo & record.
struct Chrono {
    seconds_left: Cell<i32>,
    score: Cell<i64>,
    combo: Cell<i64>,
    best: f64,
    ch: String,
}

/// `chrono` - Function ⏱️
///
/// 60 seconds, as many right answers as possible: 10 points x combo (up to x5).
///
/// @returns { void }
fn chrono() {
    let cc = cur_ch();
    let game = Rc::new(Chrono { seconds_left: Cell::new(60), score: Cell::new(0), combo: Cell::new(1), best: best(&cc), ch: cc });
    set_app(&(flowbar(100.0, "") + &format!("<div class=\"pad\"><div class=\"hud\"><div>{}<b id=\"ct\">60</b>s</div><div>Score <b id=\"cs\">0</b></div><div>Combo <b id=\"cc\">×1</b></div></div><div id=\"cq\"></div><div class=\"opts\" id=\"co\"></div></div>", ic("timer", 18))));
    bind_x("chapter", true);
    let pb = qin(&app_el(), ".pbar i");
    chrono_next(game.clone());
    let c2 = game.clone();
    let tm = set_interval(
        move || {
            let game = &c2;
            game.seconds_left.set(game.seconds_left.get() - 1);
            let tt = game.seconds_left.get();
            if let Some(el) = query("#ct") {
                el.set_text_content(Some(&tt.to_string()));
            }
            if let Some(pb) = &pb {
                set_style(pb, "width", &format!("{}%", jsnum(100.0 * tt as f64 / 60.0)));
            }
            if tt <= 0 {
                if let Some(tm) = ui(|ui_state| ui_state.timer) {
                    win().clear_interval_with_handle(tm);
                }
                close_overlays();
                let score = game.score.get() as f64;
                let gain = round(score / 5.0);
                add_xp(gain);
                let rec = score > game.best;
                if rec {
                    set_best(&game.ch, score);
                }
                save();
                if rec {
                    confetti();
                }
                let dialog_element = dialog(
                    &format!(
                        "<div class=\"dic\">{}</div><div class=\"dscore\">{}</div><div class=\"dt\">{}</div><div class=\"muted\">+{} XP</div><div class=\"dstats\"></div><button class=\"btn\" id=\"dag\">{}</button><button class=\"btn txt\" id=\"dbk\">{}</button>",
                        ic(if rec { "award" } else { "timer" }, 40),
                        jsnum(score),
                        if rec { translate("Nouveau record !", "New record!") } else { format!("{} : {}", translate("Record", "Best"), jsnum(game.best)) },
                        jsnum(gain),
                        translate("Rejouer", "Play again"),
                        translate("Terminer", "Done")
                    ),
                    false,
                );
                on_sel(&dialog_element, "#dag", |_| go("chrono", None));
                on_sel(&dialog_element, "#dbk", |_| go("chapter", None));
            }
        },
        1000,
    );
    ui(|ui_state| ui_state.timer = Some(tm));
}

/// `chrono_next` - Function ⏱️
///
/// @param { Rc<Chrono> } chrono - the game
/// @returns { void } - shows the next question
fn chrono_next(chrono: Rc<Chrono>) {
    let mut qq = match rand_q(Some(&chrono.ch)) { Some(question) => question, None => return };
    if qq.plan.is_some() {
        plan_q(&mut qq);
    }
    if let Some(cq) = query("#cq") {
        cq.set_inner_html(&format!("{}<h2 class=\"qq\">{}</h2>", if !qq.svg.is_empty() { format!("<div class=\"card\">{}</div>", qq.svg) } else { String::new() }, esc(&qq.prompt)));
    }
    if let Some(co) = query("#co") {
        co.set_inner_html(&opts_html(&qq));
    }
    let qr = Rc::new(qq);
    for button in qa_in(&app_el(), "#co .opt") {
        let (c2, q2, b2) = (chrono.clone(), qr.clone(), button.clone());
        on(&button, "onclick", move |_| {
            let ok = q2.options.get(data_i(&b2)) == Some(&q2.answer);
            beep(ok);
            record(&app().items[q2.item].id, ok, 0.0);
            if ok {
                c2.score.set(c2.score.get() + 10 * c2.combo.get());
                c2.combo.set((c2.combo.get() + 1).min(5));
                flash("okf");
            } else {
                c2.combo.set(1);
                flash("kof");
                toast(&format!("{} : {}", translate("Réponse", "Answer"), q2.answer));
            }
            if let Some(score_element) = query("#cs") {
                score_element.set_text_content(Some(&c2.score.get().to_string()));
            }
            if let Some(combo_element) = query("#cc") {
                combo_element.set_text_content(Some(&format!("×{}", c2.combo.get())));
            }
            chrono_next(c2.clone());
        });
    }
}


// ===== BAR 🍸 ===== //

/// `c_batch` - Function 🧪
///
/// @param { &Value } cocktail - a cocktail
/// @returns { String } - its batch in the current language
fn c_batch(cocktail: &Value) -> String {
    let english = &app().le["cocktails"][gs(cocktail, "n").as_str()];
    if en() && tk(english, "batch") { js(&english["batch"]) } else { gs(cocktail, "batch") }
}

/// `bar` - Function 🍸
///
/// A random cocktail order: pick its ingredients, its glass and its garnish, then "Serve".
///
/// @returns { void }
fn bar() {
    let built_app = app();
    let cands: Vec<usize> = (0..built_app.items.len()).filter(|&index| built_app.items[index].cocktail.is_some()).collect();
    let item_index = cands[pick_idx(cands.len())];
    let it = &built_app.items[item_index];
    let cocktails = built_app.data["cocktails"].as_array().cloned().unwrap_or_default();
    let cocktail = cocktails[it.cocktail.unwrap()].clone();
    let need: Vec<String> = cocktail["recipe"].as_array().cloned().unwrap_or_default().iter().map(|ingredient_line| built_app.wv(&ingredient_line[0])).collect();
    let rest: Vec<String> = built_app.all_ingr.iter().filter(|ingredient| !need.contains(ingredient)).cloned().collect();
    let extra_n = 4i64.max(8 - need.len() as i64).max(0) as usize;
    let mut sh = need.clone();
    sh.extend(shuffle(&rest).into_iter().take(extra_n));
    let shelf = shuffle(&uniq(&sh));
    let glasses = uniq(&cocktails.iter().map(|cocktail| built_app.wv(&cocktail["glass"])).collect::<Vec<_>>());
    let garn = uniq(&cocktails.iter().map(|cocktail| built_app.wv(&cocktail["garnish"])).collect::<Vec<_>>());
    let ph = photo_of(item_index);
    let chips = |values: &[String]| values.iter().map(|value| format!("<button class=\"chip\" data-v=\"{}\">{}</button>", esc(value), esc(value))).collect::<String>();
    set_app(&(appbar(&translate("Le Bar", "The Bar"), Some("chapter"), "", false)
        + &format!(
            "<div class=\"pad\"><div class=\"card order\">{}<div><div class=\"kick2\">{}</div><div class=\"ptitle sm\">{}</div>{}</div></div>\n  <div class=\"sh\">1. {}</div><div class=\"chips\" id=\"sh\">{}</div>\n  <div class=\"sh\">2. {}</div><div class=\"chips\" id=\"gl\">{}</div>\n  <div class=\"sh\">3. {}</div><div class=\"chips\" id=\"ga\">{}</div></div>\n  <div class=\"abar fixed\"><button class=\"btn grow\" id=\"serve\">{} {}</button></div>",
            ph.map(|photo| format!("<img class=\"thumb zoomable\" src=\"{}\" alt=\"\" onclick=\"LTFzoom('{}',event)\">", photo, it.id)).unwrap_or_default(),
            translate("Commande", "Order"),
            gs(&cocktail, "n"),
            if tk(&cocktail, "batch") { format!("<div class=\"muted sm\">{} {}</div>", translate("Préparation", "Batch"), c_batch(&cocktail)) } else { String::new() },
            translate("Les ingrédients", "Ingredients"),
            chips(&shelf),
            translate("Le verre", "Glass"),
            chips(&glasses),
            translate("La garniture", "Garnish"),
            chips(&garn),
            ic("glass", 20),
            translate("Servir", "Serve")
        )));
    let sel: Rc<RefCell<Vec<String>>> = Rc::new(RefCell::new(vec![]));
    let glass: Rc<RefCell<Option<String>>> = Rc::new(RefCell::new(None));
    let gn: Rc<RefCell<Option<String>>> = Rc::new(RefCell::new(None));
    let ae: Element = app_el().into();
    for chip in qa_in(&ae, "#sh .chip") {
        let (b2, sel2) = (chip.clone(), sel.clone());
        on(&chip, "onclick", move |_| {
            let _ = b2.class_list().toggle("on");
            let value = b2.get_attribute("data-v").unwrap_or_default();
            let mut selected = sel2.borrow_mut();
            if let Some(position) = selected.iter().position(|entry| *entry == value) {
                selected.remove(position);
            } else {
                selected.push(value);
            }
        });
    }
    let single = |id: &str, target: Rc<RefCell<Option<String>>>| {
        let sel_s = format!("{} .chip", id);
        for chip in qa_in(&ae, &sel_s) {
            let (b2, tg, ae2, ss) = (chip.clone(), target.clone(), ae.clone(), sel_s.clone());
            on(&chip, "onclick", move |_| {
                for other_chip in qa_in(&ae2, &ss) {
                    let _ = other_chip.class_list().remove_1("on");
                }
                let _ = b2.class_list().add_1("on");
                *tg.borrow_mut() = b2.get_attribute("data-v");
            });
        }
    };
    single("#gl", glass.clone());
    single("#ga", gn.clone());
    let id = it.id.clone();
    if let Some(sv) = query("#serve") {
        on(&sv, "onclick", move |_| {
            let built_app = app();
            let it = &built_app.items[built_app.item(&id).unwrap()];
            let selected = sel.borrow();
            let ok_i = need.iter().all(|ingredient| selected.contains(ingredient)) && selected.len() == need.len();
            let ok_g = glass.borrow().as_deref() == Some(built_app.wv(&cocktail["glass"]).as_str());
            let ok_n = gn.borrow().as_deref() == Some(built_app.wv(&cocktail["garnish"]).as_str());
            let pts = [ok_i, ok_g, ok_n].iter().filter(|is_right| **is_right).count();
            let ok = pts == 3;
            beep(ok);
            record(&it.id, ok, 10.0 * pts as f64);
            if ok {
                confetti();
            }
            let mk = |is_right: bool, label: String| format!("<div class=\"ckr {}\">{} {}</div>", if is_right { "y" } else { "n" }, ic(if is_right { "check" } else { "x" }, 18), label);
            sheet(
                &format!("<div class=\"stitle\">{}/3 {}</div><div class=\"ckrow\">{}{}{}</div><div class=\"sdesc\">{}</div>", pts, if ok { translate("· Parfait, envoyé !", "· Perfect, sent!") } else { String::new() }, mk(ok_i, translate("Ingrédients", "Ingredients")), mk(ok_g, translate("Verre", "Glass")), mk(ok_n, translate("Garniture", "Garnish")), it.back),
                None,
                &format!(
                    "{}<button class=\"btn sec grow\" onclick=\"LTFgo('chapter')\">{}</button><button class=\"btn grow\" onclick=\"LTFgo('bar')\">{}</button>",
                    if it.has_info() { format!("<button class=\"btn sec sq\" onclick=\"LTFinfo('{}')\">{}</button>", it.id, ic("info", 20)) } else { String::new() },
                    translate("Retour", "Back"),
                    translate("Suivant", "Next")
                ),
            );
        });
    }
}


// ===== FLOOR PLAN 🗺️ ===== //

/// `plan_svg` - Function 🗺️
///
/// @param { Option<&str> } hl - the highlighted table
/// @param { bool } labels - show the numbers?
/// @returns { String } - the floor plan `<svg>`
pub fn plan_svg(hl: Option<&str>, labels: bool) -> String { plan_svg_res(hl, labels, &[]) }

/// `plan_svg_res` - Function 🗺️
///
/// @param { Option<&str> } hl - the highlighted table
/// @param { bool } labels - show the numbers?
/// @param { &[String] } res - the reserved tables (gold)
/// @returns { String } - the floor plan `<svg>`
pub fn plan_svg_res(hl: Option<&str>, labels: bool, res: &[String]) -> String {
    let built_app = app();
    let sz = 5.2f64;
    let mut svg = format!("<svg class=\"plan\" viewBox=\"-3 -6 106 72\" xmlns=\"http://www.w3.org/2000/svg\"><rect x=\"-2\" y=\"-2\" width=\"104\" height=\"66\" rx=\"2\" class=\"room\"/><line x1=\"0\" y1=\"-1\" x2=\"100\" y2=\"-1\" class=\"win\"/><text x=\"50\" y=\"-3\" class=\"wl\">{}</text>", translate("Baies vitrées · Vieux-Port", "Bay windows · Vieux-Port"));
    for counter in built_app.data["counters"].as_array().cloned().unwrap_or_default() {
        let (x1, x2, pos_y) = (num(&counter["x1"]), num(&counter["x2"]), num(&counter["y"]));
        svg += &format!("<rect x=\"{}\" y=\"{}\" width=\"{}\" height=\"3\" class=\"ctr\"/><text x=\"{}\" y=\"{}\" class=\"cl\">{}</text>", jsnum(x1), jsnum(pos_y), jsnum(x2 - x1), jsnum((x1 + x2) / 2.0), jsnum(pos_y + 6.5), gs(&counter, "label"));
    }
    for tb in built_app.data["tables"].as_array().cloned().unwrap_or_default() {
        let id = gs(&tb, "id");
        let is_hl = hl == Some(id.as_str());
        let rs = res.iter().any(|reserved_id| reserved_id == &id);
        let cls = format!("tb{}{}", if is_hl { " hl" } else { "" }, if rs { " res" } else { "" });
        let (pos_x, pos_y) = (num(&tb["x"]), num(&tb["y"]));
        let sh = gs(&tb, "sh");
        let shape = if sh == "round" {
            format!("<circle cx=\"{}\" cy=\"{}\" r=\"{}\" class=\"{}\" data-id=\"{}\"/>", jsnum(pos_x), jsnum(pos_y), jsnum(sz * 0.65), cls, id)
        } else if sh == "long" {
            format!("<rect x=\"{}\" y=\"{}\" width=\"5\" height=\"12\" rx=\"1\" class=\"{}\" data-id=\"{}\"/>", jsnum(pos_x - 2.5), jsnum(pos_y - 8.0), cls, id)
        } else {
            format!("<rect x=\"{}\" y=\"{}\" width=\"{}\" height=\"{}\" rx=\"1\" class=\"{}\" data-id=\"{}\"/>", jsnum(pos_x - sz / 2.0), jsnum(pos_y - sz / 2.0), jsnum(sz), jsnum(sz), cls, id)
        };
        svg += &shape;
        if labels {
            svg += &format!("<text x=\"{}\" y=\"{}\" class=\"tl{}\">{}</text>", jsnum(pos_x), jsnum(pos_y + 1.2), if rs { " rl" } else { "" }, id);
        }
    }
    svg + "</svg>"
}

/// `plan_find` - Function 📍
///
/// "Tap table T21": 10 random tables.
///
/// @returns { void }
fn plan_find() {
    let built_app = app();
    let tables = built_app.data["tables"].as_array().cloned().unwrap_or_default();
    let order: Rc<Vec<Value>> = Rc::new(shuffle(&tables).into_iter().take(10).collect());
    plan_show(order, 0, 0);
}

/// `plan_show` - Function 📍
///
/// @param { Rc<Vec<Value>> } order - the tables to find
/// @param { usize } round - the current one
/// @param { usize } score - the score so far
/// @returns { void }
fn plan_show(order: Rc<Vec<Value>>, round: usize, score: usize) {
    close_overlays();
    if round >= order.len() {
        return end_screen(score, order.len(), "chapter", Some("planFind"), 0.0);
    }
    let built_app = app();
    let tid = gs(&order[round], "id");
    let item_id = built_app.items.iter().find(|item| item.ch == "plan" && item.front == tid).map(|item| item.id.clone());
    set_app(&(flowbar(100.0 * round as f64 / order.len() as f64, &format!("{}/{}", round + 1, order.len())) + &format!("<div class=\"pad\"><h2 class=\"qq\">{} <span class=\"gold\">{}</span></h2><div class=\"card\" id=\"pc\">{}</div></div>", translate("Touchez la table", "Tap table"), tid, plan_svg(None, false))));
    bind_x("chapter", round > 0);
    for el in qa_in(&app_el(), "svg [data-id]") {
        let (el2, tid2, order2, iid) = (el.clone(), tid.clone(), order.clone(), item_id.clone());
        on(&el, "onclick", move |_| {
            let ok = el2.get_attribute("data-id").as_deref() == Some(tid2.as_str());
            beep(ok);
            if let Some(iid) = &iid {
                record(iid, ok, 10.0);
            }
            let sc = if ok { score + 1 } else { score };
            if let Some(pc) = query("#pc") {
                pc.set_inner_html(&plan_svg(Some(&tid2), true));
            }
            let feedback = create("div");
            feedback.set_class_name(&format!("ov fbsheet {}", if ok { "okc" } else { "koc" }));
            feedback.set_inner_html(&format!("<div class=\"fbt\">{} {} · {}</div><div class=\"fbb\"><button class=\"btn grow\" id=\"nx\">{}</button></div>", ic(if ok { "check" } else { "x" }, 22), if ok { translate("Exact !", "Correct!") } else { translate("C'était ici", "It was here") }, tid2, translate("Continuer", "Continue")));
            let _ = doc().body().unwrap().append_child(&feedback);
            let o3 = order2.clone();
            on_sel(&feedback, "#nx", move |_| plan_show(o3.clone(), round + 1, sc));
        });
    }
}


// ===== LA CARTE 📖 ===== //

// the search text of each item (built once) & the strip regex 🔎
thread_local! {
    static HAY: RefCell<Vec<String>> = RefCell::new(vec![]);
    static CARTE_RE: RefCell<Option<js_sys::RegExp>> = RefCell::new(None);
}

/// `srch_value` - Function 🔎
///
/// @returns { String } - the search field value
fn srch_value() -> String {
    query("#srch").map(|element| element.unchecked_into::<HtmlInputElement>().value()).unwrap_or_default()
}

/// `set_srch` - Function 🔎
///
/// @param { &str } value - the new search value
/// @returns { void }
fn set_srch(value: &str) {
    if let Some(element) = query("#srch") {
        element.unchecked_into::<HtmlInputElement>().set_value(value);
    }
}

/// `ltf_course` - Function (window.LTFcourse) 🍽
///
/// @param { String } course - the course filter
/// @returns { void } - re-renders the carte, keeping the search
pub fn ltf_course(course: String) {
    ui(|ui_state| ui_state.carte_course = course);
    let search_text = srch_value();
    carte();
    set_srch(&search_text);
    carte_render();
}

/// `ltf_cat` - Function (window.LTFcat) 📚
///
/// @param { String } category - the chapter filter
/// @returns { void } - re-renders the carte, keeping the search
pub fn ltf_cat(category: String) {
    ui(|ui_state| ui_state.carte_cat = category);
    let search_text = srch_value();
    carte();
    set_srch(&search_text);
    carte_render();
}

/// `ltf_course_help` - Function (window.LTFcourseHelp) ❓
///
/// @returns { void } - the "appetizer, starter or main?" explainer sheet
pub fn ltf_course_help() {
    let ex = |course: &str, fr: &str, en_: &str| format!("<div class=\"cexp\"><span class=\"cb cb-{}\">{}</span><p>{}</p></div>", course, c_both(course), translate(fr, en_));
    let html = format!(
        "<div class=\"stitle\">{}</div>\n {}\n {}\n {}\n {}\n {}\n <p class=\"muted\">{}</p>",
        translate("Pour commencer, entrée ou plat ?", "Appetizer, starter or main?"),
        ex("app", "Petites choses à partager en début de repas, en attendant l'entrée (ex. tapenade, charcuterie, beignets). Ce n'est pas un plat complet.", "Small bites to share at the very start, while waiting for the starter (e.g. dips, cured meats, fritters). Not a full course."),
        ex("start", "Le premier vrai plat, une portion légère avant le plat principal. Attention : un client américain dit « entrée » pour le plat principal !", "The first real course, a light plate before the main. Careful: American guests say \"entrée\" for the main course!"),
        ex("main", "Le plat principal, la plus grosse portion. À la carte : « De la mer » = poisson, « De la terre » = viande. Au déjeuner, « Plat » de la formule.", "The main course, the biggest plate. On the menu: \"De la mer\" = fish, \"De la terre\" = meat. At lunch, the formula's \"Plat\"."),
        ex("cheese", "Après le plat, avant ou à la place du dessert.", "After the main, before or instead of dessert."),
        ex("dess", "La fin du repas.", "The end of the meal."),
        translate("Ordre du service : Pour commencer → Entrée → Plat → Fromage → Dessert.", "Service order: Appetizer → Starter → Main → Cheese → Dessert.")
    );
    sheet(&html, None, &format!("<button class=\"btn grow\" onclick=\"LTFcloseSheet()\">{}</button>", translate("Compris", "Got it")));
}

/// `carte` - Function 📖
///
/// The whole menu: search, course tabs, chapter chips and the list.
///
/// @returns { void }
fn carte() {
    let built_app = app();
    let (cat, course) = ui(|ui_state| (ui_state.carte_cat.clone(), ui_state.carte_course.clone()));
    let mut cats: Vec<(String, String)> = vec![("all".into(), translate("Tout", "All"))];
    cats.extend(built_app.ch.iter().filter(|chapter| chapter.id != "plan").map(|chapter| (chapter.id.to_string(), chapter.name.clone())));
    cats.push(("facts".into(), translate("À retenir", "Key facts")));
    let mut tabs: Vec<(String, String)> = vec![("all".into(), translate("Tout", "All"))];
    for course_key in CORDER {
        tabs.push((course_key.into(), match course_key { "app" => translate("Pour commencer", "Appetizers"), "start" => translate("Entrées", "Starters"), "main" => translate("Plats", "Mains"), "cheese" => translate("Fromages", "Cheese"), _ => translate("Desserts", "Desserts") }));
    }
    let all = course == "all";
    let html = appbar(&translate("La Carte", "The Menu"), None, "", true)
        + &format!(
            "<div class=\"sticky\"><label class=\"srch\">{}<input id=\"srch\" placeholder=\"{}\" autocomplete=\"off\"></label><div class=\"ctabs\">{}<button class=\"ctab q\" onclick=\"LTFcourseHelp()\" aria-label=\"?\">{}</button></div>\n  {}<div class=\"chips scroll\">{}</div>{}\n</div><div class=\"pad\" id=\"list\"></div>",
            ic("search", 18),
            translate("Plat, vin, cocktail…", "Dish, wine, cocktail…"),
            tabs.iter().map(|(value, label)| format!("<button class=\"ctab {} {}\" onclick=\"LTFcourse('{}')\">{}</button>", if value != "all" { format!("cb-{}", value) } else { String::new() }, if course == *value { "on" } else { "" }, value, label)).collect::<String>(),
            ic("info", 18),
            if all { "" } else { "<!--" },
            cats.iter().map(|(value, label)| format!("<button class=\"chip {}\" onclick=\"LTFcat('{}')\">{}</button>", if cat == *value { "on" } else { "" }, value, label)).collect::<String>(),
            if all { "" } else { "-->" }
        );
    set_app(&html);
    if let Some(search_input) = query("#srch") {
        on(&search_input, "oninput", |_| carte_render());
    }
    carte_render();
}

/// `hay` - Function 🔎
///
/// @param { usize } index - an item index
/// @returns { String } - its normalized search text
fn hay(index: usize) -> String {
    HAY.with(|cache| {
        let mut cache = cache.borrow_mut();
        if cache.is_empty() {
            *cache = app().items.iter().map(|it| norm(&format!("{} {} {}", it.front, strip(&it.back), strip(it.info_s())))).collect();
        }
        cache[index].clone()
    })
}

/// `carte_strip_re` - Function 🔎
///
/// @returns { js_sys::RegExp } - the regex of the word-start ranking
fn carte_strip_re() -> js_sys::RegExp {
    CARTE_RE.with(|regex| regex.borrow_mut().get_or_insert_with(|| re("^(Pour commencer|Entrée|Plat principal|Fromage|Dessert|Appetizer|Starter|Main course|Cheese)( · (poisson|viande|fish|meat))? ", "")).clone())
}

/// `carte_render` - Function 📖
///
/// Renders the list for the current filters & search (name match > word start > anywhere),
/// grouped by course, + the key facts.
///
/// @returns { void }
pub fn carte_render() {
    let built_app = app();
    let list = match query("#list") { Some(list_element) => list_element, None => return };
    let needle = norm(&srch_value());
    let (cat, course) = ui(|ui_state| (ui_state.carte_cat.clone(), ui_state.carte_course.clone()));
    let rx = carte_strip_re();
    let mut blocks = String::new();
    for chapter in built_app.ch.iter().filter(|chapter| chapter.id != "plan" && if course != "all" { ["dej", "diner", "dess"].contains(&chapter.id) } else { cat == "all" || cat == chapter.id }) {
        let mut its: Vec<usize> = (0..built_app.items.len()).filter(|&index| built_app.items[index].ch == chapter.id && !built_app.items[index].fact && hay(index).contains(&needle)).collect();
        if course != "all" {
            its.retain(|&index| built_app.items[index].course == Some(course.as_str()));
        }
        if !needle.is_empty() {
            let wd = |text: &str| -> String { text.chars().map(|character| if character.is_ascii_lowercase() || character.is_ascii_digit() { character } else { ' ' }).collect::<String>().split_whitespace().collect::<Vec<_>>().join(" ") };
            let fw = format!(" {}", wd(&needle));
            let sc = |index: usize| -> u8 { if norm(&built_app.items[index].front).contains(&needle) { 0 } else if format!(" {}", wd(&hay(index))).contains(&fw) { 1 } else { 2 } };
            its.sort_by_key(|&index| sc(index));
        }
        if its.iter().any(|&index| built_app.items[index].course.is_some()) {
            its.sort_by_key(|&index| corder_idx(built_app.items[index].course));
        }
        if its.is_empty() {
            continue;
        }
        let mut last_c: Option<&str> = None;
        blocks += &format!("<div class=\"sh\">{}</div>", chapter.name);
        for index in its {
            let it = &built_app.items[index];
            let hd = match it.course { Some(course_key) if Some(course_key) != last_c => format!("<div class=\"csh cb-{}\"><span class=\"dot\"></span>{}</div>", course_key, c_both(course_key)), _ => String::new() };
            if it.course.is_some() {
                last_c = it.course;
            }
            let ph = photo_of(index);
            blocks += &hd;
            blocks += &format!(
                "<div class=\"li menu\" {}>{}<div class=\"tx\">{}<div class=\"n\">{}</div><div class=\"muted sm clamp\">{}</div></div>{}{}</div>",
                if it.has_info() { format!("onclick=\"LTFinfo('{}')\"", it.id) } else { String::new() },
                match ph { Some(photo) => format!("<img class=\"thumb zoomable\" src=\"{}\" loading=\"lazy\" alt=\"\" onclick=\"LTFzoom('{}',event)\">", photo, it.id), None => format!("<div class=\"av\">{}</div>", ic(chic(chapter.id), 20)) },
                match it.course { Some(course_key) => format!("<span class=\"cb cb-{}\">{}{}</span>", course_key, c_lab(course_key), if !it.csub.is_empty() { format!(" · {}", it.csub) } else { String::new() }), None => String::new() },
                it.front,
                esc(&re_replace(&strip(&it.back), &rx, "")),
                say_btn(it),
                if it.has_info() { format!("<span class=\"rt\">{}</span>", ic("chev", 18)) } else { String::new() }
            );
        }
    }
    let facts: Vec<&String> = if (cat == "all" && course == "all") || cat == "facts" { built_app.facts.iter().filter(|fact| norm(fact).contains(&needle)).collect() } else { vec![] };
    let mut out = blocks + &(if !facts.is_empty() { format!("<div class=\"sh\">{}</div><div class=\"card\">", translate("À retenir", "Key facts")) + &facts.iter().map(|fact| format!("<p class=\"fact\">{}</p>", esc(fact))).collect::<String>() + "</div>" } else { String::new() });
    if out.is_empty() {
        out = format!("<div class=\"empty muted\">{}</div>", translate("Aucun résultat", "No results"));
    }
    list.set_inner_html(&out);
}


// ===== SETTINGS 👤 ===== //

/// `settings` - Function 👤
///
/// The Profil tab: rank & XP, theme, language, sound, about & reset.
///
/// @returns { void }
pub fn settings() {
    let current_xp = xp();
    let lvl = current_xp % 300.0;
    let th = theme();
    let seg = |opts: &[(&str, String)], cur: &str, callback_name: &str| format!("<div class=\"seg\">{}</div>", opts.iter().map(|(value, label)| format!("<button class=\"{}\" onclick=\"{}('{}')\">{}</button>", if *value == cur { "on" } else { "" }, callback_name, value, label)).collect::<String>());
    let html = appbar(&translate("Profil", "Profile"), None, "", true)
        + &format!(
            "<div class=\"pad\">\n  \
            <div class=\"card row\"><div class=\"av big\">{}</div><div class=\"grow\"><div class=\"rk\">{}</div><div class=\"bar\"><i style=\"width:{}%\"></i></div><div class=\"muted sm\">{} XP · {}% {} · {} {}</div></div></div>\n  \
            <div class=\"sh\">{}</div>\n  \
            <div class=\"card\"><div class=\"lrow\">{}<span>{}</span></div>{}\n   \
            <div class=\"lrow mt\">{}<span>{}</span></div>{}</div>\n  \
            <div class=\"card\"><label class=\"lrow sw\">{}<span class=\"grow\">{}</span><input type=\"checkbox\" id=\"snd\" {}><i class=\"tg\"></i></label></div>\n  \
            <div class=\"sh\">{}</div>\n  \
            <div class=\"card sm\"><p>{}</p><p>{}</p><p class=\"warn\">{}</p></div>\n  \
            <button class=\"btn danger wide\" id=\"rst\">{} {}</button></div>",
            ic("user", 26),
            rank(),
            jsnum(lvl / 3.0),
            js(&s_get("xp")),
            mastery(None),
            translate("maîtrisé", "mastered"),
            js(&s_get("streak")),
            translate("j de suite", "day streak"),
            translate("Apparence", "Appearance"),
            ic("palette", 20),
            translate("Thème", "Theme"),
            seg(&[("auto", "Auto".into()), ("light", translate("Clair", "Light")), ("dark", translate("Sombre", "Dark")), ("black", translate("Noir", "Black"))], &th, "LTFtheme"),
            ic("globe", 20),
            translate("Langue", "Language"),
            seg(&[("fr", "Français".into()), ("en", "English".into())], if en() { "en" } else { "fr" }, "LTFlang"),
            ic("sound", 20),
            translate("Effets sonores", "Sound effects"),
            if sound() { "checked" } else { "" },
            translate("À propos", "About"),
            translate("Contenu transcrit des cartes réelles du restaurant (octobre 2026). La formule de la semaine change chaque semaine.", "Content transcribed from the restaurant's real menus (October 2026). The weekly formula changes every week."),
            translate("Photos : ouvrez une fiche puis « Caméra » ou « Galerie » pour remplacer la photo d'illustration. Vos photos restent sur ce téléphone.", "Photos: open an item, then \"Camera\" or \"Gallery\" to replace the sample picture. Your photos stay on this phone."),
            app().allergy,
            ic("trash", 20),
            translate("Réinitialiser la progression", "Reset progress")
        );
    set_app(&html);
    if let Some(snd) = query("#snd") {
        let s2: HtmlInputElement = snd.clone().unchecked_into();
        on(&snd, "onchange", move |_| {
            s_set("sound", Value::Bool(s2.checked()));
            save();
        });
    }
    on_sel(&app_el(), "#rst", |_| {
        confirm_dlg(
            &translate("Tout effacer ?", "Erase everything?"),
            &translate("XP, rang, records et erreurs seront remis à zéro. Vos photos sont conservées.", "XP, rank, records and mistakes will be reset. Your photos are kept."),
            &translate("Effacer", "Erase"),
            Rc::new(|| {
                with_progress(|progress| {
                    let field = |key: &str| progress.get(key).cloned();
                    let mut object = serde_json::Map::new();
                    object.insert("xp".into(), json!(0));
                    object.insert("m".into(), json!({}));
                    object.insert("best".into(), json!({}));
                    object.insert("review".into(), json!([]));
                    object.insert("streak".into(), json!(1));
                    if let Some(value) = field("last") { object.insert("last".into(), value); }
                    if let Some(value) = field("sound") { object.insert("sound".into(), value); }
                    object.insert("exam".into(), Value::Null);
                    if let Some(value) = field("lang") { object.insert("lang".into(), value); }
                    if let Some(value) = field("theme") { object.insert("theme".into(), value); }
                    *progress = Value::Object(object);
                });
                save();
                go("hub", None);
            }),
            true,
        );
    });
}


// ===== FX ✨ ===== //

/// `toast` - Function 🍞
///
/// @param { &str } txt - the message
/// @returns { void } - shows it for 1.8 s
pub fn toast(txt: &str) {
    let toast_element = create("div");
    toast_element.set_class_name("toast");
    toast_element.set_text_content(Some(txt));
    let _ = doc().body().unwrap().append_child(&toast_element);
    set_timeout(move || toast_element.remove(), 1800);
}

/// `flash` - Function ⚡
///
/// @param { &'static str } class_name - the body class ('okf' / 'kof')
/// @returns { void } - flashes the screen green / red
fn flash(class_name: &'static str) {
    let body = doc().body().unwrap();
    let _ = body.class_list().add_1(class_name);
    set_timeout(move || {
        let _ = body.class_list().remove_1(class_name);
    }, 180);
}


// ===== SELF-TEST 🧪 ===== //

/// `ltf_test` - Function (window.LTFtest) 🧪
///
/// Runs every question generator once and checks the answers & the ⓘ notes.
///
/// @returns { JsValue } - { items, bad, noInfo }
pub fn ltf_test() -> JsValue {
    let built_app = app();
    let mut bad = 0;
    for (index, it) in built_app.items.iter().enumerate() {
        for generator in &it.gens {
            if let Gen::Mcq { prompt, correct, pool, expl } = generator {
                if let Some(qq) = mcq(prompt, correct, pool, expl, index) {
                    let uniq_n = uniq(&qq.options).len();
                    if !qq.options.contains(&qq.answer) || uniq_n != qq.options.len() {
                        bad += 1;
                        web_sys::console::warn_2(&"bad".into(), &it.id.clone().into());
                    }
                }
            }
        }
    }
    let empty_say = re("💬[^<]*</div><div></div>", "");
    let no_info: Vec<String> = built_app.items.iter().filter(|item| !item.fact && item.ch != "plan" && (!item.has_info() || !item.info_s().contains("💬") || empty_say.test(item.info_s()))).map(|item| item.id.clone()).collect();
    let report = json!({"items": built_app.items.len(), "bad": bad, "noInfo": no_info});
    js_sys::JSON::parse(&report.to_string()).unwrap_or(JsValue::NULL)
}

/// `ltf_items` - Function (window.LTFitems) 🗂️
///
/// A plain-object snapshot of the items (without the generator functions).
///
/// @returns { JsValue } - the items array
pub fn ltf_items() -> JsValue {
    let built_app = app();
    let cocktails = built_app.data["cocktails"].as_array().cloned().unwrap_or_default();
    let arr: Vec<Value> = built_app
        .items
        .iter()
        .map(|it| {
            let mut object = serde_json::Map::new();
            object.insert("id".into(), json!(it.id));
            object.insert("ch".into(), json!(it.ch));
            object.insert("front".into(), json!(it.front));
            object.insert("back".into(), json!(it.back));
            if it.fact { object.insert("fact".into(), json!(true)); }
            if let Some(info) = &it.info { object.insert("info".into(), json!(info)); }
            if let Some(photo_key) = &it.ikey { object.insert("ikey".into(), json!(photo_key)); }
            if let Some(default_photo) = &it.phdef { object.insert("phdef".into(), json!(default_photo)); }
            if let Some(course) = it.course { object.insert("course".into(), json!(course)); object.insert("csub".into(), json!(it.csub)); object.insert("as2".into(), json!(it.as2)); }
            if let Some(cocktail_index) = it.cocktail { object.insert("cocktail".into(), cocktails[cocktail_index].clone()); }
            if let Some(say) = &it.say { object.insert("say".into(), json!({"fr": say.fr, "en": say.en, "ol": say.ol, "on": say.on})); }
            Value::Object(object)
        })
        .collect();
    js_sys::JSON::parse(&Value::Array(arr).to_string()).unwrap_or(JsValue::NULL)
}
