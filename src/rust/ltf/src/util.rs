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
* @name: Les Trois Forts - Utilities
* @file: rust/ltf/src/util.rs
* @type: Rust (WebAssembly)
* @authors: Abraham Ukachi <abrahamukachi@gmail.com>
*
* Example usage:
*   1+|> use crate::util::*;
*    +|> let safe = esc("<b>");
*    -|> 
*
*/


/*
* !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
* MOTTO: We'll always do more 😜!!!
* !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
*/
//! Small helpers that reproduce the JavaScript semantics app.js relied on
//! (String(), truthiness, Number formatting, shuffle/pick/uniq, esc, norm, strip)
//! plus thin DOM helpers.
// import the JS built-ins we call (Function, String, Math, Reflect, RegExp) 🔗
use js_sys::{Function, JsString, Math, Reflect, RegExp};
// import serde_json's Value (the data & the progress are JSON) 🗃️
use serde_json::Value;
// import the wasm-bindgen prelude & the JS casts 🔗
use wasm_bindgen::prelude::*;
use wasm_bindgen::JsCast;
// import the DOM types 🌐
use web_sys::{Document, Element, HtmlElement, Window};


// ===== RANDOM 🎲 ===== //

/// `rnd` - Function 🎲
///
/// @returns { f64 } - `Math.random()` (seeded in the tests, so JS & Rust draw the same numbers)
pub fn rnd() -> f64 {
    Math::random()
}

/// `shuffle` - Function 🔀
///
/// Fisher-Yates shuffle of a copy, drawing exactly like app.js.
///
/// @param { &[T] } items - the slice
/// @returns { Vec<T> } - a shuffled copy
pub fn shuffle<Item: Clone>(items: &[Item]) -> Vec<Item> {
    let mut shuffled = items.to_vec();
    let length = shuffled.len();
    if length > 1 {
        for index in (1..length).rev() {
            let swap_index = (rnd() * ((index + 1) as f64)).floor() as usize;
            shuffled.swap(index, swap_index);
        }
    }
    shuffled
}

/// `pick_idx` - Function 🎲
///
/// @param { usize } length - the length
/// @returns { usize } - a random index (like `a[Math.floor(Math.random()*a.length)]`)
pub fn pick_idx(length: usize) -> usize {
    (rnd() * length as f64).floor() as usize
}

/// `uniq` - Function 🧹
///
/// @param { &[String] } items - the strings
/// @returns { Vec<String> } - without duplicates (first occurrence kept, like `[...new Set(a)]`)
pub fn uniq(items: &[String]) -> Vec<String> {
    let mut out: Vec<String> = Vec::with_capacity(items.len());
    for item in items {
        if !out.iter().any(|existing| existing == item) {
            out.push(item.clone());
        }
    }
    out
}


// ===== JS VALUE SEMANTICS 🧪 ===== //
/// `jsnum` - Function 🔢
///
/// JS Number -> String (shortest round-trip, like `Number.prototype.toString` for normal ranges).
///
/// @param { f64 } number - the number
/// @returns { String } - its JS string
pub fn jsnum(number: f64) -> String {
    if number.is_nan() {
        return "NaN".into();
    }
    if number == 0.0 {
        return "0".into();
    }
    if number.is_infinite() {
        return if number > 0.0 { "Infinity".into() } else { "-Infinity".into() };
    }
    format!("{}", number)
}

/// `js` - Function 🔤
///
/// Same as `String(v)` in JS.
///
/// @param { &Value } value - a JSON value
/// @returns { String } - its JS string
pub fn js(value: &Value) -> String {
    match value {
        Value::Null => "null".into(),
        Value::Bool(flag) => flag.to_string(),
        Value::Number(number) => {
            if let Some(integer) = number.as_i64() {
                integer.to_string()
            } else {
                jsnum(number.as_f64().unwrap_or(f64::NAN))
            }
        }
        Value::String(text) => text.clone(),
        Value::Array(array) => array.iter().map(|item| if item.is_null() { String::new() } else { js(item) }).collect::<Vec<_>>().join(","),
        Value::Object(_) => "[object Object]".into(),
    }
}

/// `gs` - Function 🔤
///
/// Same as `String(o[k])`, where a missing key is `undefined`.
///
/// @param { &Value } object - an object
/// @param { &str } key - the key
/// @returns { String } - the JS string
pub fn gs(object: &Value, key: &str) -> String {
    match object.get(key) {
        None => "undefined".into(),
        Some(value) => js(value),
    }
}

/// `truthy` - Function ✅
///
/// @param { &Value } value - a JSON value
/// @returns { bool } - its JS truthiness
pub fn truthy(value: &Value) -> bool {
    match value {
        Value::Null => false,
        Value::Bool(flag) => *flag,
        Value::Number(number) => {
            let float = number.as_f64().unwrap_or(0.0);
            float != 0.0 && !float.is_nan()
        }
        Value::String(text) => !text.is_empty(),
        _ => true,
    }
}

/// `tk` - Function ✅
///
/// @param { &Value } object - an object
/// @param { &str } key - the key
/// @returns { bool } - is `o[k]` truthy?
pub fn tk(object: &Value, key: &str) -> bool {
    object.get(key).map(truthy).unwrap_or(false)
}

/// `or_str` - Function 🔗
///
/// Same as `a || b || ... || ""` over string-ish values.
///
/// @param { &[&Value] } vals - the values, in order
/// @returns { String } - the first truthy one as a string ('' when none)
pub fn or_str(vals: &[&Value]) -> String {
    for value in vals {
        if truthy(value) {
            return js(value);
        }
    }
    String::new()
}

/// `num` - Function 🔢
///
/// @param { &Value } value - a JSON value
/// @returns { f64 } - its number (0 when not a number)
pub fn num(value: &Value) -> f64 {
    value.as_f64().unwrap_or(0.0)
}

/// `num_val` - Function 🔢
///
/// @param { f64 } number - a number
/// @returns { Value } - an integer JSON number when it has no fraction (so the JSON matches JS)
pub fn num_val(number: f64) -> Value {
    if number.fract() == 0.0 && number.abs() < 9.0e15 {
        Value::from(number as i64)
    } else {
        Value::from(number)
    }
}

/// `round` - Function 🔢
///
/// `Math.round` for the non-negative values the app uses.
///
/// @param { f64 } number - the number
/// @returns { f64 } - rounded
pub fn round(number: f64) -> f64 {
    (number + 0.5).floor()
}


// ===== STRINGS 🔤 ===== //

/// `esc` - Function 🛡️
///
/// @param { &str } text - the text
/// @returns { String } - with `&`, `<`, `>` and `"` escaped (same as app.js)
pub fn esc(text: &str) -> String {
    let mut out = String::with_capacity(text.len());
    for character in text.chars() {
        match character {
            '&' => out.push_str("&amp;"),
            '<' => out.push_str("&lt;"),
            '>' => out.push_str("&gt;"),
            '"' => out.push_str("&quot;"),
            _ => out.push(character),
        }
    }
    out
}

/// `is_js_ws` - Function ␣
///
/// @param { char } character - a character
/// @returns { bool } - is it whitespace for JS (`\s`, `trim()`)?
fn is_js_ws(character: char) -> bool {
    matches!(character, '\t' | '\n' | '\u{b}' | '\u{c}' | '\r' | ' ' | '\u{a0}' | '\u{1680}' | '\u{2000}'..='\u{200a}' | '\u{2028}' | '\u{2029}' | '\u{202f}' | '\u{205f}' | '\u{3000}' | '\u{feff}')
}

/// `jtrim` - Function ✂️
///
/// Same as `text.trim()` with the JS whitespace set.
///
/// @param { &str } text - the text
/// @returns { &str } - trimmed
pub fn jtrim(text: &str) -> &str {
    text.trim_matches(is_js_ws)
}

/// `untag` - Function 🧹
///
/// Same as `text.replace(/<[^>]+>/g, ' ')`.
///
/// @param { &str } text - some HTML
/// @returns { String } - every tag replaced by a space
pub fn untag(text: &str) -> String {
    let chars: Vec<char> = text.chars().collect();
    let mut out = String::with_capacity(text.len());
    let mut index = 0;
    while index < chars.len() {
        if chars[index] == '<' {
            if let Some(off) = chars[index + 1..].iter().position(|&character| character == '>') {
                if off >= 1 {
                    out.push(' ');
                    index = index + 1 + off + 1;
                    continue;
                }
            }
        }
        out.push(chars[index]);
        index += 1;
    }
    out
}

/// `collapse_ws` - Function ␣
///
/// Same as `text.replace(/\s+/g, ' ')`.
///
/// @param { &str } text - the text
/// @returns { String } - every whitespace run replaced by one space
pub fn collapse_ws(text: &str) -> String {
    let mut out = String::with_capacity(text.len());
    let mut in_ws = false;
    for ch in text.chars() {
        if is_js_ws(ch) {
            if !in_ws {
                out.push(' ');
            }
            in_ws = true;
        } else {
            out.push(ch);
            in_ws = false;
        }
    }
    out
}

/// `strip` - Function 🧹
///
/// Same as `strip()` in app.js: tags -> ' ', collapse whitespace, trim.
///
/// @param { &str } text - some HTML
/// @returns { String } - its plain text
pub fn strip(text: &str) -> String {
    jtrim(&collapse_ws(&untag(text))).to_string()
}

/// `norm` - Function 🔡
///
/// Same as `norm()` in app.js: NFD, drop U+0300–U+036F, toLowerCase.
///
/// @param { &str } text - the text
/// @returns { String } - normalized (for the search)
pub fn norm(text: &str) -> String {
    let decomposed: String = JsString::from(text).normalize("NFD").into();
    let stripped: String = decomposed.chars().filter(|character| !('\u{300}'..='\u{36f}').contains(character)).collect();
    stripped.to_lowercase()
}

/// `re` - Function 🔎
///
/// @param { &str } pattern - the pattern
/// @param { &str } flags - the flags
/// @returns { RegExp } - a JS RegExp (same engine as app.js)
pub fn re(pattern: &str, flags: &str) -> RegExp {
    RegExp::new(pattern, flags)
}

/// `re_replace` - Function 🔁
///
/// @param { &str } text - the text
/// @param { &RegExp } regex - the JS RegExp
/// @param { &str } with - the replacement
/// @returns { String } - `text.replace(regex, with)`
pub fn re_replace(text: &str, regex: &RegExp, with: &str) -> String {
    JsString::from(text).replace_by_pattern(regex, with).into()
}


// ===== DOM 🌐 ===== //

/// `win` - Function 🪟
///
/// @returns { Window } - `window`
pub fn win() -> Window {
    web_sys::window().unwrap()
}

/// `doc` - Function 📄
///
/// @returns { Document } - `document`
pub fn doc() -> Document {
    win().document().unwrap()
}

/// `query` - Function 🔎
///
/// @param { &str } sel - a CSS selector
/// @returns { Option<Element> } - `document.querySelector(sel)`
pub fn query(sel: &str) -> Option<Element> {
    doc().query_selector(sel).ok().flatten()
}

/// `qin` - Function 🔎
///
/// @param { &Element } root - the root
/// @param { &str } sel - a CSS selector
/// @returns { Option<Element> } - `root.querySelector(sel)`
pub fn qin(root: &Element, sel: &str) -> Option<Element> {
    root.query_selector(sel).ok().flatten()
}

/// `qa_in` - Function 🔎
///
/// @param { &Element } root - the root
/// @param { &str } sel - a CSS selector
/// @returns { Vec<Element> } - `root.querySelectorAll(sel)`
pub fn qa_in(root: &Element, sel: &str) -> Vec<Element> {
    let mut elements = vec![];
    if let Ok(node_list) = root.query_selector_all(sel) {
        for index in 0..node_list.length() {
            if let Some(node) = node_list.item(index) {
                elements.push(node.unchecked_into::<Element>());
            }
        }
    }
    elements
}

/// `qa` - Function 🔎
///
/// @param { &str } sel - a CSS selector
/// @returns { Vec<Element> } - `document.querySelectorAll(sel)`
pub fn qa(sel: &str) -> Vec<Element> {
    let mut elements = vec![];
    if let Ok(node_list) = doc().query_selector_all(sel) {
        for index in 0..node_list.length() {
            if let Some(node) = node_list.item(index) {
                elements.push(node.unchecked_into::<Element>());
            }
        }
    }
    elements
}

/// `app_el` - Function 📱
///
/// @returns { HtmlElement } - the app root `#app`
pub fn app_el() -> HtmlElement {
    query("#app").unwrap().unchecked_into()
}

/// `create` - Function 🌱
///
/// @param { &str } tag - a tag name
/// @returns { HtmlElement } - `document.createElement(tag)`
pub fn create(tag: &str) -> HtmlElement {
    doc().create_element(tag).unwrap().unchecked_into()
}

/// `on` - Function 👂
///
/// `el.<prop> = handler` (onclick, oninput, onchange…). Works on HTML and SVG elements and on plain objects.
///
/// @param { &JsValue } target - the element / object
/// @param { &str } prop - the handler property
/// @param { Callback } callback - the handler
/// @returns { void }
pub fn on<Callback: FnMut(JsValue) + 'static>(target: &JsValue, prop: &str, callback: Callback) {
    let closure = Closure::wrap(Box::new(callback) as Box<dyn FnMut(JsValue)>);
    let _ = Reflect::set(target, &JsValue::from_str(prop), &closure.into_js_value());
}

/// `listen` - Function 👂
///
/// `target.addEventListener(ev, f)` (the closure is kept forever).
///
/// @param { &JsValue } target - the event target
/// @param { &str } ev - the event name
/// @param { Callback } callback - the listener
/// @returns { void }
pub fn listen<Callback: FnMut(JsValue) + 'static>(target: &JsValue, ev: &str, callback: Callback) {
    let closure = Closure::wrap(Box::new(callback) as Box<dyn FnMut(JsValue)>);
    let event_target: &web_sys::EventTarget = target.unchecked_ref();
    let _ = event_target.add_event_listener_with_callback(ev, closure.as_ref().unchecked_ref());
    closure.forget();
}

/// `set_timeout` - Function ⏱️
///
/// @param { Callback } callback - the callback (runs once)
/// @param { i32 } ms - the delay
/// @returns { i32 } - the timer id
pub fn set_timeout<Callback: FnOnce() + 'static>(callback: Callback, ms: i32) -> i32 {
    let closure = Closure::once_into_js(callback);
    win().set_timeout_with_callback_and_timeout_and_arguments_0(closure.unchecked_ref(), ms).unwrap_or(0)
}

/// `set_interval` - Function ⏱️
///
/// @param { Callback } callback - the callback
/// @param { i32 } ms - the period
/// @returns { i32 } - the interval id
pub fn set_interval<Callback: FnMut() + 'static>(callback: Callback, ms: i32) -> i32 {
    let closure = Closure::wrap(Box::new(callback) as Box<dyn FnMut()>);
    win().set_interval_with_callback_and_timeout_and_arguments_0(closure.into_js_value().unchecked_ref(), ms).unwrap_or(0)
}

/// `get` - Function 🔑
///
/// @param { &JsValue } object - a JS object
/// @param { &str } key - the key
/// @returns { JsValue } - `o[k]` (undefined on error)
pub fn get(object: &JsValue, key: &str) -> JsValue {
    Reflect::get(object, &JsValue::from_str(key)).unwrap_or(JsValue::UNDEFINED)
}

/// `set` - Function ✍️
///
/// @param { &JsValue } object - a JS object
/// @param { &str } key - the key
/// @param { &JsValue } value - the value
/// @returns { void }
pub fn set(object: &JsValue, key: &str, value: &JsValue) {
    let _ = Reflect::set(object, &JsValue::from_str(key), value);
}

/// `call0` - Function 📞
///
/// @param { &JsValue } object - a JS object
/// @param { &str } method - a method name
/// @returns { JsValue } - `o[m]()` (undefined when it's not a function)
pub fn call0(object: &JsValue, method: &str) -> JsValue {
    let function = get(object, method);
    match function.dyn_ref::<Function>() {
        Some(function) => function.call0(object).unwrap_or(JsValue::UNDEFINED),
        None => JsValue::UNDEFINED,
    }
}

/// `set_style` - Function 🎨
///
/// @param { &Element } el - an HTML or SVG element
/// @param { &str } prop - a CSS property
/// @param { &str } val - its value
/// @returns { void }
pub fn set_style(el: &Element, prop: &str, val: &str) {
    if let Some(html_element) = el.dyn_ref::<HtmlElement>() {
        let _ = html_element.style().set_property(prop, val);
    } else {
        let st = get(el, "style");
        set(&st, prop, &JsValue::from_str(val));
    }
}
