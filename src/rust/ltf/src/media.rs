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
* @name: Les Trois Forts - Sound, Speech, Photos & Zoom
* @file: rust/ltf/src/media.rs
* @type: Rust (WebAssembly)
* @authors: Abraham Ukachi <abrahamukachi@gmail.com>
*
* Example usage:
*   1+|> use crate::media::*;
*    +|> beep(true);
*    -|> 
*
*/


/*
* !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
* MOTTO: We'll always do more 😜!!!
* !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
*/
//! Sound (AudioContext beeps), pronunciation (Web Speech API), photos (IndexedDB 'ltf_photos'/'p',
//! resize to 900px JPEG 0.8), the photo viewer LTFzoom and confetti.
// import the progress & UI state 💾
use crate::state::*;
// import the UI helpers (toast, photo_of...) 📱
use crate::ui::*;
// import our JS-semantics & DOM helpers 🧰
use crate::util::*;
// import the built app (items, regexes) 📚
use crate::app;
// import the JS built-ins (Array, Reflect) 🔗
use js_sys::{Array, Reflect};
// import the shared mutable cells of the callbacks 🔒
use std::cell::RefCell;
use std::rc::Rc;
// import the wasm-bindgen prelude & the JS casts 🔗
use wasm_bindgen::prelude::*;
use wasm_bindgen::JsCast;
// import the DOM types 🌐
use web_sys::{Element, HtmlElement};


// ===== SOUND 🔊 ===== //

/// `beep` - Function 🔊
///
/// Plays a short rising (right) or falling (wrong) beep, unless the sound is off (same notes as app.js).
///
/// @param { bool } ok - true for a right answer
/// @returns { void }
pub fn beep(ok: bool) {
    if !sound() {
        return;
    }
    // errors are ignored, like the try/catch of app.js
    let _ = (|| -> Result<(), JsValue> {
        // the AudioContext (created once, webkit prefix for old Safari) 🎛️
        let ac = match ui(|ui_state| ui_state.ac.clone()) {
            Some(context) => context,
            None => {
                let window = win();
                let mut ctor = get(&window, "AudioContext");
                if !ctor.is_truthy() {
                    ctor = get(&window, "webkitAudioContext");
                }
                let constructor: js_sys::Function = ctor.dyn_into()?;
                let context = Reflect::construct(&constructor, &Array::new())?;
                ui(|ui_state| ui_state.ac = Some(context.clone()));
                context
            }
        };
        // an oscillator -> gain -> speakers
        let ac: web_sys::AudioContext = ac.unchecked_into();
        let oscillator = ac.create_oscillator()?;
        let gain = ac.create_gain()?;
        oscillator.connect_with_audio_node(&gain)?;
        gain.connect_with_audio_node(&ac.destination())?;
        oscillator.set_type(web_sys::OscillatorType::Sine);
        let now = ac.current_time();
        let fr = oscillator.frequency();
        // ✅ 660 -> 990 Hz, ❌ 220 -> 160 Hz
        if ok {
            fr.set_value_at_time(660.0, now)?;
            fr.set_value_at_time(990.0, now + 0.08)?;
        } else {
            fr.set_value_at_time(220.0, now)?;
            fr.set_value_at_time(160.0, now + 0.1)?;
        }
        // fade out in 0.25 s
        gain.gain().set_value_at_time(0.15, now)?;
        gain.gain().exponential_ramp_to_value_at_time(0.001, now + 0.25)?;
        oscillator.start_with_when(now)?;
        oscillator.stop_with_when(now + 0.26)?;
        Ok(())
    })();
}


// ===== PRONUNCIATION 🗣️ ===== //

/// `synth` - Function 🗣️
///
/// @returns { JsValue } - `window.speechSynthesis` (undefined when unsupported)
fn synth() -> JsValue {
    get(&win(), "speechSynthesis")
}

/// `load_v` - Function 🗣️
///
/// @returns { void } - refreshes the device voices
pub fn load_v() {
    let ss = synth();
    if !ss.is_truthy() {
        return;
    }
    let voices_value = call0(&ss, "getVoices");
    let list: Vec<JsValue> = if Array::is_array(&voices_value) { Array::from(&voices_value).iter().collect() } else { vec![] };
    ui(|ui_state| ui_state.voices = list);
}

/// `init_speech` - Function 🗣️
///
/// Loads the voices and reloads them when the browser says they changed.
///
/// @returns { void }
pub fn init_speech() {
    let ss = synth();
    if ss.is_truthy() {
        load_v();
        on(&ss, "onvoiceschanged", |_| load_v());
    }
}

/// `vlang` - Function 🏷️
///
/// @param { &JsValue } voice - a voice
/// @returns { String } - its lang, normalized ("fr_FR" -> "fr-fr")
fn vlang(voice: &JsValue) -> String {
    get(voice, "lang").as_string().unwrap_or_default().replacen('_', "-", 1).to_lowercase()
}

/// `voice_for` - Function 🗣️
///
/// Picks the best voice for a language: exact locale first, then a high quality one, a local one, any.
///
/// @param { &str } lang - e.g. "fr-FR"
/// @returns { Option<JsValue> } - the voice
fn voice_for(lang: &str) -> Option<JsValue> {
    let prefix: String = lang.chars().take(2).collect();
    let voices = ui(|ui_state| ui_state.voices.clone());
    let vs: Vec<JsValue> = voices.into_iter().filter(|voice| get(voice, "lang").is_truthy() && vlang(voice).starts_with(&prefix)).collect();
    let exact: Vec<JsValue> = vs.iter().filter(|voice| vlang(voice) == lang.to_lowercase()).cloned().collect();
    let pool = if !exact.is_empty() { exact } else { vs };
    let qual = &app().qual;
    pool.iter().find(|voice| qual.test(&get(voice, "name").as_string().unwrap_or_else(|| "undefined".into()))).cloned().or_else(|| pool.iter().find(|voice| get(voice, "localService").is_truthy()).cloned()).or_else(|| pool.first().cloned())
}

/// `speak_seq` - Function 🔊
///
/// Speaks a sequence of (text, lang) parts, a bit slower than normal.
///
/// @param { Vec<(String, String)> } parts - the parts to say, in order
/// @returns { void }
fn speak_seq(parts: Vec<(String, String)>) {
    let ss = synth();
    if !ss.is_truthy() {
        toast(&translate("Audio non disponible sur cet appareil", "Audio not available on this device"));
        return;
    }
    call0(&ss, "cancel");
    load_v();
    let ctor = get(&win(), "SpeechSynthesisUtterance");
    let ctor: js_sys::Function = match ctor.dyn_into() { Ok(function) => function, Err(_) => return };
    let speak = get(&ss, "speak");
    // one utterance per part 🗣️
    for (txt, lang) in parts {
        let args = Array::of1(&JsValue::from_str(&txt));
        let utterance = match Reflect::construct(&ctor, &args) { Ok(utterance) => utterance, Err(_) => continue };
        set(&utterance, "lang", &JsValue::from_str(&lang));
        if let Some(voice) = voice_for(&lang) {
            set(&utterance, "voice", &voice);
        }
        set(&utterance, "rate", &JsValue::from_f64(0.88));
        if let Some(function) = speak.dyn_ref::<js_sys::Function>() {
            let _ = function.call1(&ss, &utterance);
        }
    }
}

/// `ltf_say` - Function (window.LTFsay) 🔊
///
/// Says an item's name: `fr`, `en` or `or` (original) only, or all of them (app language first).
///
/// @param { String } id - the item id
/// @param { Option<String> } which - one version only
/// @returns { void }
pub fn ltf_say(id: String, which: Option<String>) {
    let built_app = app();
    let say = match built_app.item(&id).and_then(|index| built_app.items[index].say.clone()) { Some(say) => say, None => return };
    let fr = (say.fr.clone(), "fr-FR".to_string());
    let enp = (say.en.clone(), "en-GB".to_string());
    let or = say.ol.clone().map(|ol| (say.fr.clone(), ol));
    match which.as_deref() {
        Some("fr") => return speak_seq(vec![fr]),
        Some("en") => return speak_seq(vec![enp]),
        Some("or") => return speak_seq(vec![or.unwrap_or(fr)]),
        _ => {}
    }
    let mut seq = if en() { vec![enp, fr] } else { vec![fr, enp] };
    if let Some(origin) = or {
        seq.insert(0, origin);
    }
    speak_seq(seq);
}


// ===== INDEXEDDB PHOTOS 🗃️ ===== //

// a callback that runs at most once (shared by the success & error handlers) 🔂
type Cb = Rc<RefCell<Option<Box<dyn FnOnce()>>>>;

/// `cb_once` - Function 🔂
///
/// @param { impl FnOnce() } callback - the callback
/// @returns { Cb } - a shared, run-once callback
fn cb_once(callback: impl FnOnce() + 'static) -> Cb {
    Rc::new(RefCell::new(Some(Box::new(callback))))
}

/// `fire` - Function 🔂
///
/// @param { &Cb } callback - a run-once callback
/// @returns { void } - runs it (only the first time)
fn fire(callback: &Cb) {
    let pending = callback.borrow_mut().take();
    if let Some(function) = pending {
        function();
    }
}

/// `idb_open` - Function 🗃️
///
/// Opens the photo database `ltf_photos` (store `p`), then calls `done` (also on error).
///
/// @param { impl FnOnce() } done - called when ready
/// @returns { void }
pub fn idb_open(done: impl FnOnce() + 'static) {
    let callback = cb_once(done);
    let fac = match win().indexed_db() { Ok(Some(factory)) => factory, _ => return fire(&callback) };
    let request = match fac.open_with_u32("ltf_photos", 1) { Ok(request) => request, Err(_) => return fire(&callback) };
    let r1 = request.clone();
    // first time: create the store `p`
    on(&request, "onupgradeneeded", move |_| {
        if let Ok(db) = r1.result() {
            let db: web_sys::IdbDatabase = db.unchecked_into();
            let _ = db.create_object_store("p");
        }
    });
    let (r2, c2) = (request.clone(), callback.clone());
    // ready ✅
    on(&request, "onsuccess", move |_| {
        if let Ok(db) = r2.result() {
            ui(|ui_state| ui_state.idb = Some(db.unchecked_into()));
        }
        fire(&c2);
    });
    let c3 = callback.clone();
    on(&request, "onerror", move |_| fire(&c3));
}

/// `idb_all` - Function 🗃️
///
/// Loads every own photo into the UI state (ikey -> data URL), then calls `done`.
///
/// @param { impl FnOnce() } done - called at the end
/// @returns { void }
pub fn idb_all(done: impl FnOnce() + 'static) {
    let callback = cb_once(done);
    let db = match ui(|ui_state| ui_state.idb.clone()) { Some(database) => database, None => return fire(&callback) };
    let rq = (|| -> Result<web_sys::IdbRequest, JsValue> {
        let tx = db.transaction_with_str("p")?;
        let st = tx.object_store("p")?;
        st.open_cursor()
    })();
    let rq = match rq { Ok(request) => request, Err(_) => return fire(&callback) };
    let (rq2, c2) = (rq.clone(), callback.clone());
    // one cursor step per photo
    on(&rq, "onsuccess", move |_| {
        let cur = rq2.result().unwrap_or(JsValue::NULL);
        if !cur.is_null() && !cur.is_undefined() {
            let key = get(&cur, "key");
            let value = get(&cur, "value");
            if let (Some(key_text), Some(value_text)) = (key.as_string(), value.as_string()) {
                ui(|ui_state| ui_state.ph.insert(key_text, value_text));
            }
            call0(&cur, "continue");
        } else {
            fire(&c2);
        }
    });
    let c3 = callback.clone();
    on(&rq, "onerror", move |_| fire(&c3));
}

/// `idb_put` - Function 🗃️
///
/// Saves (or deletes, with None) an own photo, then calls `done`.
///
/// @param { &str } photo_key - the photo key (ikey)
/// @param { Option<String> } value - the data URL (None deletes it)
/// @param { impl FnOnce() } done - called at the end
/// @returns { void }
pub fn idb_put(photo_key: &str, value: Option<String>, done: impl FnOnce() + 'static) {
    let callback = cb_once(done);
    let db = match ui(|ui_state| ui_state.idb.clone()) { Some(database) => database, None => return fire(&callback) };
    let tx = match db.transaction_with_str_and_mode("p", web_sys::IdbTransactionMode::Readwrite) { Ok(transaction) => transaction, Err(_) => return fire(&callback) };
    if let Ok(st) = tx.object_store("p") {
        let key = JsValue::from_str(photo_key);
        let _ = match value { None => st.delete(&key).map(|_| ()), Some(data_url) => st.put_with_key(&JsValue::from_str(&data_url), &key).map(|_| ()) };
    }
    let c2 = callback.clone();
    on(&tx, "oncomplete", move |_| fire(&c2));
    let c3 = callback.clone();
    on(&tx, "onerror", move |_| fire(&c3));
}

/// `shrink` - Function 📷
///
/// Reads a picked / captured file, scales it to max 900 px and makes a JPEG 0.8 data URL.
///
/// @param { web_sys::File } file - the photo
/// @param { impl FnOnce(String) } ok - called with the data URL
/// @param { impl FnOnce() } err - called when the file can't be read
/// @returns { void }
pub fn shrink(file: web_sys::File, ok: impl FnOnce(String) + 'static, err: impl FnOnce() + 'static) {
    let okc: Rc<RefCell<Option<Box<dyn FnOnce(String)>>>> = Rc::new(RefCell::new(Some(Box::new(ok))));
    let errc = cb_once(err);
    let fr = match web_sys::FileReader::new() { Ok(reader) => reader, Err(_) => return fire(&errc) };
    let (fr2, okc2, errc2) = (fr.clone(), okc.clone(), errc.clone());
    // 📄 the file is read: load it as an image
    on(&fr, "onload", move |_| {
        let im = match web_sys::HtmlImageElement::new() { Ok(image) => image, Err(_) => return fire(&errc2) };
        let (im2, okc3) = (im.clone(), okc2.clone());
        // 🖼️ the image is loaded: draw it scaled on a canvas
        on(&im, "onload", move |_| {
            let (width, height) = (im2.width() as f64, im2.height() as f64);
            let max_size = 900.0f64;
            let sc = (max_size / width.max(height)).min(1.0);
            let cv: web_sys::HtmlCanvasElement = doc().create_element("canvas").unwrap().unchecked_into();
            cv.set_width(round(width * sc) as u32);
            cv.set_height(round(height * sc) as u32);
            if let Ok(Some(ctx)) = cv.get_context("2d") {
                let ctx: web_sys::CanvasRenderingContext2d = ctx.unchecked_into();
                let _ = ctx.draw_image_with_html_image_element_and_dw_and_dh(&im2, 0.0, 0.0, cv.width() as f64, cv.height() as f64);
            }
            // the JPEG data URL ✅
            let url = cv.to_data_url_with_type_and_encoder_options("image/jpeg", &JsValue::from_f64(0.8)).unwrap_or_default();
            let pending = okc3.borrow_mut().take();
            if let Some(function) = pending {
                function(url);
            }
        });
        let e3 = errc2.clone();
        on(&im, "onerror", move |_| fire(&e3));
        if let Ok(result) = fr2.result() {
            im.set_src(&result.as_string().unwrap_or_default());
        }
    });
    let e4 = errc.clone();
    on(&fr, "onerror", move |_| fire(&e4));
    let _ = fr.read_as_data_url(&file);
}


// ===== PHOTO VIEWER (PINCH / DOUBLE-TAP ZOOM, PAN, WHEEL, SWIPE DOWN) 🔍 ===== //

/// `Start` - Enum 🖐️
///
/// How the current gesture started: a pinch (2 fingers) or a pan (1 finger).
#[derive(Clone, Copy)]
enum Start {
    Pinch { dist: f64, sc: f64, offset_x: f64, offset_y: f64, cx: f64, cy: f64 },
    Pan { px: f64, py: f64, offset_x: f64, offset_y: f64 },
}

/// `Zoom` - Struct 🔍
///
/// The viewer state: zoom, pan, active pointers, gesture start, last tap & the "moved" flag.
struct Zoom {
    sc: f64,
    offset_x: f64,
    offset_y: f64,
    pts: Vec<(f64, f64, f64)>, // (pointerId, x, y) in insertion order, like a JS Map
    start: Option<Start>,
    last_tap: f64,
    moved: bool,
}

/// `fnum` - Function 🔢
///
/// @param { &JsValue } event - an event
/// @param { &str } key - a number property
/// @returns { f64 } - `e[k]` (0 when missing)
fn fnum(event: &JsValue, key: &str) -> f64 {
    get(event, key).as_f64().unwrap_or(0.0)
}

/// `ltf_zoom` - Function (window.LTFzoom) 🔍
///
/// Opens an item's photo full screen: pinch / wheel zoom, double-tap, pan, swipe down to close.
///
/// @param { String } id - the item id
/// @param { JsValue } ev - the click (stopped, so the card doesn't open)
/// @returns { void }
pub fn ltf_zoom(id: String, ev: JsValue) {
    if ev.is_truthy() {
        call0(&ev, "stopPropagation");
    }
    let built_app = app();
    let index = match built_app.item(&id) { Some(index) => index, None => return };
    let src = match photo_of(index) { Some(photo_src) => photo_src, None => return };
    let it = &built_app.items[index];
    // the viewer overlay (same markup as app.js)
    let viewer = create("div");
    viewer.set_class_name("ov zoomv");
    viewer.set_inner_html(&format!("<div class=\"zt\"><div class=\"zn\">{}</div><button class=\"zx\" aria-label=\"close\">{}</button></div><div class=\"zs\"><img src=\"{}\" alt=\"\" draggable=\"false\"></div><div class=\"zh\">{}</div>", it.front, ic("x", 22), src, translate("Pincez ou touchez deux fois pour zoomer", "Pinch or double-tap to zoom")));
    let _ = doc().body().unwrap().append_child(&viewer);
    // the image & the stage
    let img: HtmlElement = qin(&viewer, "img").unwrap().unchecked_into();
    let st: Element = qin(&viewer, ".zs").unwrap();
    // the zoom state 🌱
    let zoom = Rc::new(RefCell::new(Zoom { sc: 1.0, offset_x: 0.0, offset_y: 0.0, pts: vec![], start: None, last_tap: 0.0, moved: false }));
    // apply the transform (animated or not)
    let apply = {
        let img = img.clone();
        move |zoom: &Zoom, anim: bool| {
            let style = img.style();
            let _ = style.set_property("transition", if anim { "transform .2s" } else { "none" });
            let _ = style.set_property("transform", &format!("translate({}px,{}px) scale({})", jsnum(zoom.offset_x), jsnum(zoom.offset_y), jsnum(zoom.sc)));
        }
    };
    // keep the photo inside the stage
    let clamp_p = {
        let (img, st) = (img.clone(), st.clone());
        move |zoom: &mut Zoom| {
            if zoom.sc <= 1.0 {
                zoom.sc = 1.0;
                zoom.offset_x = 0.0;
                zoom.offset_y = 0.0;
                return;
            }
            let stage_rect = st.get_bounding_client_rect();
            let scaled_width = img.offset_width() as f64 * zoom.sc;
            let scaled_height = img.offset_height() as f64 * zoom.sc;
            let mx = ((scaled_width - stage_rect.width()) / 2.0).max(0.0);
            let my = ((scaled_height - stage_rect.height()) / 2.0).max(0.0);
            zoom.offset_x = mx.min((-mx).max(zoom.offset_x));
            zoom.offset_y = my.min((-my).max(zoom.offset_y));
        }
    };
    // ✕ closes the viewer
    let d1 = viewer.clone();
    if let Some(zx) = qin(&viewer, ".zx") {
        on(&zx, "onclick", move |_| d1.remove());
    }
    let stv: JsValue = st.clone().into();
    // 👇 a finger goes down: pan (1 finger) or pinch (2 fingers)
    {
        let (zoom, st2) = (zoom.clone(), st.clone());
        listen(&stv, "pointerdown", move |event| {
            let pid = fnum(&event, "pointerId");
            let _ = st2.set_pointer_capture(pid as i32);
            let mut zoom = zoom.borrow_mut();
            let (cx, cy) = (fnum(&event, "clientX"), fnum(&event, "clientY"));
            match zoom.pts.iter_mut().find(|pointer| pointer.0 == pid) { Some(pointer) => { pointer.1 = cx; pointer.2 = cy; } None => zoom.pts.push((pid, cx, cy)) }
            zoom.moved = false;
            if zoom.pts.len() == 2 {
                let (first, second) = (zoom.pts[0], zoom.pts[1]);
                zoom.start = Some(Start::Pinch { dist: (first.1 - second.1).hypot(first.2 - second.2), sc: zoom.sc, offset_x: zoom.offset_x, offset_y: zoom.offset_y, cx: (first.1 + second.1) / 2.0, cy: (first.2 + second.2) / 2.0 });
            } else {
                zoom.start = Some(Start::Pan { px: cx, py: cy, offset_x: zoom.offset_x, offset_y: zoom.offset_y });
            }
        });
    }
    // 👉 a finger moves: pinch-zoom, pan, or drag down to close
    {
        let (zoom, img2, d2, apply) = (zoom.clone(), img.clone(), viewer.clone(), apply.clone());
        listen(&stv, "pointermove", move |event| {
            let pid = fnum(&event, "pointerId");
            let mut zoom = zoom.borrow_mut();
            let (ex, ey) = (fnum(&event, "clientX"), fnum(&event, "clientY"));
            match zoom.pts.iter_mut().find(|pointer| pointer.0 == pid) { Some(pointer) => { pointer.1 = ex; pointer.2 = ey; } None => return }
            match zoom.start {
                // 🤏 pinch: zoom between 1x and 5x around the fingers' center
                Some(Start::Pinch { dist, sc, offset_x: start_x, offset_y: start_y, cx, cy }) if zoom.pts.len() == 2 && dist != 0.0 => {
                    let (first, second) = (zoom.pts[0], zoom.pts[1]);
                    zoom.sc = (sc * (first.1 - second.1).hypot(first.2 - second.2) / dist).max(1.0).min(5.0);
                    let (ncx, ncy) = ((first.1 + second.1) / 2.0, (first.2 + second.2) / 2.0);
                    zoom.offset_x = start_x + (ncx - cx);
                    zoom.offset_y = start_y + (ncy - cy);
                    zoom.moved = true;
                    apply(&zoom, false);
                }
                // ☝️ one finger: pan when zoomed, else follow the finger down (and fade the backdrop)
                Some(Start::Pan { px, py, offset_x: start_x, offset_y: start_y }) if zoom.pts.len() == 1 => {
                    let (dx, dy) = (ex - px, ey - py);
                    if dx.abs() + dy.abs() > 6.0 {
                        zoom.moved = true;
                    }
                    if zoom.sc > 1.0 {
                        zoom.offset_x = start_x + dx;
                        zoom.offset_y = start_y + dy;
                        apply(&zoom, false);
                    } else {
                        let style = img2.style();
                        let _ = style.set_property("transition", "none");
                        let _ = style.set_property("transform", &format!("translateY({}px)", jsnum(dy.max(0.0))));
                        let _ = d2.style().set_property("background", &format!("rgba(0,0,0,{})", jsnum((0.94 - dy / 500.0).max(0.4))));
                    }
                }
                _ => {}
            }
        });
    }
    // 👆 a finger goes up: close (dragged down), double-tap zoom, or settle
    let up = {
        let (zoom, st3, d3, apply, clamp_p) = (zoom.clone(), st.clone(), viewer.clone(), apply.clone(), clamp_p.clone());
        move |event: JsValue| {
            let pid = fnum(&event, "pointerId");
            let (ex, ey) = (fnum(&event, "clientX"), fnum(&event, "clientY"));
            let mut zz = zoom.borrow_mut();
            let zoom = &mut *zz;
            let was = zoom.pts.len();
            zoom.pts.retain(|pointer| pointer.0 != pid);
            // dragged down by more than 120 px at 1x? close 👋
            if let Some(Start::Pan { py, .. }) = zoom.start {
                if was == 1 && zoom.sc <= 1.0 && ey - py > 120.0 {
                    drop(zz);
                    d3.remove();
                    return;
                }
            }
            // a tap: a second tap within 300 ms toggles 1x / 2.5x (on the tapped point)
            if was == 1 && !zoom.moved {
                let now = js_sys::Date::now();
                if now - zoom.last_tap < 300.0 {
                    if zoom.sc > 1.0 {
                        zoom.sc = 1.0;
                        zoom.offset_x = 0.0;
                        zoom.offset_y = 0.0;
                    } else {
                        let stage_rect = st3.get_bounding_client_rect();
                        zoom.sc = 2.5;
                        zoom.offset_x = (stage_rect.width() / 2.0 - (ex - stage_rect.left())) * 1.5;
                        zoom.offset_y = (stage_rect.height() / 2.0 - (ey - stage_rect.top())) * 1.5;
                    }
                    clamp_p(zoom);
                    apply(zoom, true);
                    zoom.last_tap = 0.0;
                    return;
                }
                zoom.last_tap = now;
            }
            // one finger left: continue as a pan from here
            if zoom.pts.len() == 1 {
                let remaining = zoom.pts[0];
                zoom.start = Some(Start::Pan { px: remaining.1, py: remaining.2, offset_x: zoom.offset_x, offset_y: zoom.offset_y });
            } else {
                zoom.start = None;
            }
            let _ = d3.style().set_property("background", "");
            clamp_p(zoom);
            apply(zoom, true);
        }
    };
    let up2 = up.clone();
    listen(&stv, "pointerup", up);
    listen(&stv, "pointercancel", up2);
    // 🖱️ mouse wheel zoom (desktop, not passive so we can prevent the page scroll)
    {
        let (zoom, apply, clamp_p) = (zoom.clone(), apply.clone(), clamp_p.clone());
        let closure = Closure::wrap(Box::new(move |event: JsValue| {
            call0(&event, "preventDefault");
            let mut zz = zoom.borrow_mut();
            let zoom = &mut *zz;
            zoom.sc = (zoom.sc * if fnum(&event, "deltaY") < 0.0 { 1.15 } else { 0.87 }).max(1.0).min(5.0);
            clamp_p(zoom);
            apply(zoom, false);
        }) as Box<dyn FnMut(JsValue)>);
        let opts = web_sys::AddEventListenerOptions::new();
        opts.set_passive(false);
        let _ = st.add_event_listener_with_callback_and_add_event_listener_options("wheel", closure.as_ref().unchecked_ref(), &opts);
        closure.forget();
    }
}


// ===== CONFETTI 🎉 ===== //

/// `Particle` - Struct 🎊
///
/// One confetti: position, speed, rotation & color.
struct Particle {
    pos_x: f64,
    pos_y: f64,
    speed: f64,
    rotation: f64,
    colour: &'static str,
}

/// `confetti` - Function 🎉
///
/// 120 gold & white confetti for 150 frames (same random draws as app.js).
///
/// @returns { void }
pub fn confetti() {
    let window = win();
    let cv: web_sys::HtmlCanvasElement = doc().create_element("canvas").unwrap().unchecked_into();
    cv.set_class_name("conf");
    let iw = window.inner_width().ok().and_then(|width| width.as_f64()).unwrap_or(0.0);
    let ih = window.inner_height().ok().and_then(|height| height.as_f64()).unwrap_or(0.0);
    cv.set_width(iw as u32);
    cv.set_height(ih as u32);
    let _ = doc().body().unwrap().append_child(&cv);
    let ctx: web_sys::CanvasRenderingContext2d = match cv.get_context("2d") { Ok(Some(context)) => context.unchecked_into(), _ => return };
    // the colors & the confetti
    let cols = ["#c9a24b", "#f3e9d2", "#2f5d8a", "#e8c873", "#ffffff"];
    let (cw, ch) = (cv.width() as f64, cv.height() as f64);
    let mut ps: Vec<Particle> = (0..120).map(|_| Particle { pos_x: rnd() * cw, pos_y: -20.0 - rnd() * ch * 0.5, speed: 2.0 + rnd() * 4.0, rotation: rnd() * 6.28, colour: cols[pick_idx(cols.len())] }).collect();
    let mut frame = 0;
    // the frame closure keeps a handle on itself (to request the next frame) 🔁
    let holder: Rc<RefCell<Option<Closure<dyn FnMut()>>>> = Rc::new(RefCell::new(None));
    let h2 = holder.clone();
    *holder.borrow_mut() = Some(Closure::wrap(Box::new(move || {
        ctx.clear_rect(0.0, 0.0, cw, ch);
        for particle in ps.iter_mut() {
            particle.pos_y += particle.speed;
            particle.rotation += 0.1;
            ctx.save();
            let _ = ctx.translate(particle.pos_x, particle.pos_y);
            let _ = ctx.rotate(particle.rotation);
            ctx.set_fill_style_str(particle.colour);
            ctx.fill_rect(-4.0, -2.0, 8.0, 4.0);
            ctx.restore();
        }
        // next frame, or remove the canvas & free the closure 🧹
        frame += 1;
        if frame < 150 {
            if let Some(closure) = h2.borrow().as_ref() {
                let _ = win().request_animation_frame(closure.as_ref().unchecked_ref());
            }
        } else {
            cv.remove();
            let h3 = h2.clone();
            set_timeout(move || drop(h3.borrow_mut().take()), 0);
        }
    }) as Box<dyn FnMut()>));
    // JS ran the first frame synchronously
    let first: Option<js_sys::Function> = holder.borrow().as_ref().map(|closure| closure.as_ref().unchecked_ref::<js_sys::Function>().clone());
    if let Some(function) = first {
        let _ = function.call0(&JsValue::NULL);
    }
}
