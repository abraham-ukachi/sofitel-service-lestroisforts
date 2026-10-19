let wasm_bindgen = (function(exports) {
    let script_src;
    if (typeof document !== 'undefined' && document.currentScript !== null) {
        script_src = new URL(document.currentScript.src, location.href).toString();
    }

    function start() {
        wasm.start();
    }
    exports.start = start;
    function __wbg_get_imports() {
        const import0 = {
            __proto__: null,
            __wbg___wbindgen_debug_string_4687d8d8c2017d52: function(arg0, arg1) {
                const ret = debugString(getObject(arg1));
                const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_export, wasm.__wbindgen_export2);
                const len1 = WASM_VECTOR_LEN;
                getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
                getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
            },
            __wbg___wbindgen_is_falsy_16bd49b68658263e: function(arg0) {
                const ret = !getObject(arg0);
                return ret;
            },
            __wbg___wbindgen_is_function_1f9d30630b8b1d3d: function(arg0) {
                const ret = typeof(getObject(arg0)) === 'function';
                return ret;
            },
            __wbg___wbindgen_is_null_e343b7d08827ba72: function(arg0) {
                const ret = getObject(arg0) === null;
                return ret;
            },
            __wbg___wbindgen_is_undefined_8865fb403f8fe9d8: function(arg0) {
                const ret = getObject(arg0) === undefined;
                return ret;
            },
            __wbg___wbindgen_jsval_eq_02babf21faa37971: function(arg0, arg1) {
                const ret = getObject(arg0) === getObject(arg1);
                return ret;
            },
            __wbg___wbindgen_number_get_2e0e7dee9f701a71: function(arg0, arg1) {
                const obj = getObject(arg1);
                const ret = typeof(obj) === 'number' ? obj : undefined;
                getDataViewMemory0().setFloat64(arg0 + 8 * 1, isLikeNone(ret) ? 0 : ret, true);
                getDataViewMemory0().setInt32(arg0 + 4 * 0, !isLikeNone(ret), true);
            },
            __wbg___wbindgen_string_get_0380ccaa2f57f0d9: function(arg0, arg1) {
                const obj = getObject(arg1);
                const ret = typeof(obj) === 'string' ? obj : undefined;
                var ptr1 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_export, wasm.__wbindgen_export2);
                var len1 = WASM_VECTOR_LEN;
                getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
                getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
            },
            __wbg___wbindgen_throw_41e9ee4f547fc59a: function(arg0, arg1) {
                throw new Error(getStringFromWasm0(arg0, arg1));
            },
            __wbg__wbg_cb_unref_dcc1a90847f04c41: function(arg0) {
                getObject(arg0)._wbg_cb_unref();
            },
            __wbg_addEventListener_4d0db17c671ea324: function() { return handleError(function (arg0, arg1, arg2, arg3) {
                getObject(arg0).addEventListener(getStringFromWasm0(arg1, arg2), getObject(arg3));
            }, arguments); },
            __wbg_addEventListener_8d3235978b9c69a8: function() { return handleError(function (arg0, arg1, arg2, arg3, arg4) {
                getObject(arg0).addEventListener(getStringFromWasm0(arg1, arg2), getObject(arg3), getObject(arg4));
            }, arguments); },
            __wbg_add_9ceab44da1353b80: function() { return handleError(function (arg0, arg1, arg2) {
                getObject(arg0).add(getStringFromWasm0(arg1, arg2));
            }, arguments); },
            __wbg_appendChild_fb8c52e7dd8484ea: function() { return handleError(function (arg0, arg1) {
                const ret = getObject(arg0).appendChild(getObject(arg1));
                return addHeapObject(ret);
            }, arguments); },
            __wbg_body_e549239eaff082e1: function(arg0) {
                const ret = getObject(arg0).body;
                return isLikeNone(ret) ? 0 : addHeapObject(ret);
            },
            __wbg_call_1875a20c43a36133: function() { return handleError(function (arg0, arg1, arg2, arg3) {
                const ret = getObject(arg0).call(getObject(arg1), getObject(arg2), getObject(arg3));
                return addHeapObject(ret);
            }, arguments); },
            __wbg_call_187d372bd5fdd4aa: function() { return handleError(function (arg0, arg1, arg2) {
                const ret = getObject(arg0).call(getObject(arg1), getObject(arg2));
                return addHeapObject(ret);
            }, arguments); },
            __wbg_call_6137034ef55c9d0f: function() { return handleError(function (arg0, arg1) {
                const ret = getObject(arg0).call(getObject(arg1));
                return addHeapObject(ret);
            }, arguments); },
            __wbg_checked_dfbd69c1f78ce37d: function(arg0) {
                const ret = getObject(arg0).checked;
                return ret;
            },
            __wbg_classList_8a097a4837412bf6: function(arg0) {
                const ret = getObject(arg0).classList;
                return addHeapObject(ret);
            },
            __wbg_clearInterval_f1a050672da2658c: function(arg0, arg1) {
                getObject(arg0).clearInterval(arg1);
            },
            __wbg_clearRect_a5e36505218c247a: function(arg0, arg1, arg2, arg3, arg4) {
                getObject(arg0).clearRect(arg1, arg2, arg3, arg4);
            },
            __wbg_connect_30bfff6aec59fc83: function() { return handleError(function (arg0, arg1) {
                const ret = getObject(arg0).connect(getObject(arg1));
                return addHeapObject(ret);
            }, arguments); },
            __wbg_construct_2cc135b78387ed16: function() { return handleError(function (arg0, arg1) {
                const ret = Reflect.construct(getObject(arg0), getObject(arg1));
                return addHeapObject(ret);
            }, arguments); },
            __wbg_createElement_74049073a11f9c31: function() { return handleError(function (arg0, arg1, arg2) {
                const ret = getObject(arg0).createElement(getStringFromWasm0(arg1, arg2));
                return addHeapObject(ret);
            }, arguments); },
            __wbg_createGain_b6551e1ad1609779: function() { return handleError(function (arg0) {
                const ret = getObject(arg0).createGain();
                return addHeapObject(ret);
            }, arguments); },
            __wbg_createObjectStore_84e0f5101158c82d: function() { return handleError(function (arg0, arg1, arg2) {
                const ret = getObject(arg0).createObjectStore(getStringFromWasm0(arg1, arg2));
                return addHeapObject(ret);
            }, arguments); },
            __wbg_createOscillator_7a285541e405b9ae: function() { return handleError(function (arg0) {
                const ret = getObject(arg0).createOscillator();
                return addHeapObject(ret);
            }, arguments); },
            __wbg_currentTime_eb1592316a1d4450: function(arg0) {
                const ret = getObject(arg0).currentTime;
                return ret;
            },
            __wbg_decodeURIComponent_4c02a566bbbeee61: function() { return handleError(function (arg0, arg1) {
                const ret = decodeURIComponent(getStringFromWasm0(arg0, arg1));
                return addHeapObject(ret);
            }, arguments); },
            __wbg_delete_efcc1a7f91e815b8: function() { return handleError(function (arg0, arg1) {
                const ret = getObject(arg0).delete(getObject(arg1));
                return addHeapObject(ret);
            }, arguments); },
            __wbg_destination_05471d87031cba86: function(arg0) {
                const ret = getObject(arg0).destination;
                return addHeapObject(ret);
            },
            __wbg_documentElement_3f718a9a39a893d3: function(arg0) {
                const ret = getObject(arg0).documentElement;
                return isLikeNone(ret) ? 0 : addHeapObject(ret);
            },
            __wbg_document_9854e03c05fc8834: function(arg0) {
                const ret = getObject(arg0).document;
                return isLikeNone(ret) ? 0 : addHeapObject(ret);
            },
            __wbg_drawImage_6f841fbe7ccefe78: function() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5) {
                getObject(arg0).drawImage(getObject(arg1), arg2, arg3, arg4, arg5);
            }, arguments); },
            __wbg_exponentialRampToValueAtTime_f53d677fb4544dd9: function() { return handleError(function (arg0, arg1, arg2) {
                const ret = getObject(arg0).exponentialRampToValueAtTime(arg1, arg2);
                return addHeapObject(ret);
            }, arguments); },
            __wbg_files_cb1ce1b82f16c484: function(arg0) {
                const ret = getObject(arg0).files;
                return isLikeNone(ret) ? 0 : addHeapObject(ret);
            },
            __wbg_fillRect_0ef59adb9acb7d06: function(arg0, arg1, arg2, arg3, arg4) {
                getObject(arg0).fillRect(arg1, arg2, arg3, arg4);
            },
            __wbg_frequency_0f39b5e36f7073c6: function(arg0) {
                const ret = getObject(arg0).frequency;
                return addHeapObject(ret);
            },
            __wbg_from_296ca31f8d0f1c52: function(arg0) {
                const ret = Array.from(getObject(arg0));
                return addHeapObject(ret);
            },
            __wbg_gain_29777386775059c0: function(arg0) {
                const ret = getObject(arg0).gain;
                return addHeapObject(ret);
            },
            __wbg_getAttribute_061ad00c16e2f622: function(arg0, arg1, arg2, arg3) {
                const ret = getObject(arg1).getAttribute(getStringFromWasm0(arg2, arg3));
                var ptr1 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_export, wasm.__wbindgen_export2);
                var len1 = WASM_VECTOR_LEN;
                getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
                getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
            },
            __wbg_getBoundingClientRect_57152b1a20f3de34: function(arg0) {
                const ret = getObject(arg0).getBoundingClientRect();
                return addHeapObject(ret);
            },
            __wbg_getContext_635e36719cad2623: function() { return handleError(function (arg0, arg1, arg2) {
                const ret = getObject(arg0).getContext(getStringFromWasm0(arg1, arg2));
                return isLikeNone(ret) ? 0 : addHeapObject(ret);
            }, arguments); },
            __wbg_getItem_4c80b7663197c7ff: function() { return handleError(function (arg0, arg1, arg2, arg3) {
                const ret = getObject(arg1).getItem(getStringFromWasm0(arg2, arg3));
                var ptr1 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_export, wasm.__wbindgen_export2);
                var len1 = WASM_VECTOR_LEN;
                getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
                getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
            }, arguments); },
            __wbg_get_31af05bd4842a84f: function() { return handleError(function (arg0, arg1) {
                const ret = Reflect.get(getObject(arg0), getObject(arg1));
                return addHeapObject(ret);
            }, arguments); },
            __wbg_get_5dde8a29f073d908: function(arg0, arg1) {
                const ret = getObject(arg0)[arg1 >>> 0];
                return isLikeNone(ret) ? 0 : addHeapObject(ret);
            },
            __wbg_get_unchecked_288889d017702237: function(arg0, arg1) {
                const ret = getObject(arg0)[arg1 >>> 0];
                return addHeapObject(ret);
            },
            __wbg_hash_c4083658cccb641b: function() { return handleError(function (arg0, arg1) {
                const ret = getObject(arg1).hash;
                const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_export, wasm.__wbindgen_export2);
                const len1 = WASM_VECTOR_LEN;
                getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
                getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
            }, arguments); },
            __wbg_height_50d2b2bc8c6ec859: function(arg0) {
                const ret = getObject(arg0).height;
                return ret;
            },
            __wbg_height_fb13ed9fe991b5f4: function(arg0) {
                const ret = getObject(arg0).height;
                return ret;
            },
            __wbg_height_fc97e1a0c2e7331f: function(arg0) {
                const ret = getObject(arg0).height;
                return ret;
            },
            __wbg_history_4128e7793fa4758c: function() { return handleError(function (arg0) {
                const ret = getObject(arg0).history;
                return addHeapObject(ret);
            }, arguments); },
            __wbg_indexedDB_53d75531b7daa0cd: function() { return handleError(function (arg0) {
                const ret = getObject(arg0).indexedDB;
                return isLikeNone(ret) ? 0 : addHeapObject(ret);
            }, arguments); },
            __wbg_innerHeight_7f20e0f1a7c5a573: function() { return handleError(function (arg0) {
                const ret = getObject(arg0).innerHeight;
                return addHeapObject(ret);
            }, arguments); },
            __wbg_innerWidth_1bc526614080537c: function() { return handleError(function (arg0) {
                const ret = getObject(arg0).innerWidth;
                return addHeapObject(ret);
            }, arguments); },
            __wbg_instanceof_HtmlElement_32fb153a5a0e2349: function(arg0) {
                let result;
                try {
                    result = getObject(arg0) instanceof HTMLElement;
                } catch (_) {
                    result = false;
                }
                const ret = result;
                return ret;
            },
            __wbg_instanceof_Window_82d71df4eddf88bc: function(arg0) {
                let result;
                try {
                    result = getObject(arg0) instanceof Window;
                } catch (_) {
                    result = false;
                }
                const ret = result;
                return ret;
            },
            __wbg_isArray_e15a2ff68ffdbef2: function(arg0) {
                const ret = Array.isArray(getObject(arg0));
                return ret;
            },
            __wbg_item_2fbc5d9a03fe97aa: function(arg0, arg1) {
                const ret = getObject(arg0).item(arg1 >>> 0);
                return isLikeNone(ret) ? 0 : addHeapObject(ret);
            },
            __wbg_left_e0a244490fe2f293: function(arg0) {
                const ret = getObject(arg0).left;
                return ret;
            },
            __wbg_length_3ea0d5625c2d9bda: function() { return handleError(function (arg0) {
                const ret = getObject(arg0).length;
                return ret;
            }, arguments); },
            __wbg_length_4d294cbd6accf92f: function(arg0) {
                const ret = getObject(arg0).length;
                return ret;
            },
            __wbg_length_d4bdea10311bd9cf: function(arg0) {
                const ret = getObject(arg0).length;
                return ret;
            },
            __wbg_localStorage_567c24950edbc178: function() { return handleError(function (arg0) {
                const ret = getObject(arg0).localStorage;
                return isLikeNone(ret) ? 0 : addHeapObject(ret);
            }, arguments); },
            __wbg_location_9c46e8ada95d3174: function(arg0) {
                const ret = getObject(arg0).location;
                return addHeapObject(ret);
            },
            __wbg_matchMedia_8a4857f947f11f82: function() { return handleError(function (arg0, arg1, arg2) {
                const ret = getObject(arg0).matchMedia(getStringFromWasm0(arg1, arg2));
                return isLikeNone(ret) ? 0 : addHeapObject(ret);
            }, arguments); },
            __wbg_new_0_72d020f0c63443d4: function() {
                const ret = new Date();
                return addHeapObject(ret);
            },
            __wbg_new_2f0c455872a7873c: function(arg0, arg1, arg2, arg3) {
                const ret = new RegExp(getStringFromWasm0(arg0, arg1), getStringFromWasm0(arg2, arg3));
                return addHeapObject(ret);
            },
            __wbg_new_34e56228080aa9f8: function(arg0) {
                const ret = new Date(getObject(arg0));
                return addHeapObject(ret);
            },
            __wbg_new_617a8cdb8bb1130e: function() {
                const ret = new Object();
                return addHeapObject(ret);
            },
            __wbg_new_83f09a1ace2e582d: function() { return handleError(function () {
                const ret = new Image();
                return addHeapObject(ret);
            }, arguments); },
            __wbg_new_ae4555a03ebb1118: function() { return handleError(function () {
                const ret = new FileReader();
                return addHeapObject(ret);
            }, arguments); },
            __wbg_new_ee2291f50781bf1d: function() {
                const ret = new Array();
                return addHeapObject(ret);
            },
            __wbg_normalize_5be7b1fd0a79da76: function(arg0, arg1, arg2) {
                const ret = getObject(arg0).normalize(getStringFromWasm0(arg1, arg2));
                return addHeapObject(ret);
            },
            __wbg_now_aa4ccb83129e9e55: function() {
                const ret = Date.now();
                return ret;
            },
            __wbg_objectStore_43178e7a3459e234: function() { return handleError(function (arg0, arg1, arg2) {
                const ret = getObject(arg0).objectStore(getStringFromWasm0(arg1, arg2));
                return addHeapObject(ret);
            }, arguments); },
            __wbg_of_d5dbecdc59e02e34: function(arg0) {
                const ret = Array.of(getObject(arg0));
                return addHeapObject(ret);
            },
            __wbg_offsetHeight_427aaf53442f1586: function(arg0) {
                const ret = getObject(arg0).offsetHeight;
                return ret;
            },
            __wbg_offsetWidth_1d736667aa04ab3a: function(arg0) {
                const ret = getObject(arg0).offsetWidth;
                return ret;
            },
            __wbg_openCursor_6efcf867fdf4e754: function() { return handleError(function (arg0) {
                const ret = getObject(arg0).openCursor();
                return addHeapObject(ret);
            }, arguments); },
            __wbg_open_dbf85f9611885c1b: function() { return handleError(function (arg0, arg1, arg2, arg3) {
                const ret = getObject(arg0).open(getStringFromWasm0(arg1, arg2), arg3 >>> 0);
                return addHeapObject(ret);
            }, arguments); },
            __wbg_parse_0fc53dead14b3b42: function() { return handleError(function (arg0, arg1) {
                const ret = JSON.parse(getStringFromWasm0(arg0, arg1));
                return addHeapObject(ret);
            }, arguments); },
            __wbg_pushState_f02e0eae273f45f3: function() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5) {
                getObject(arg0).pushState(getObject(arg1), getStringFromWasm0(arg2, arg3), arg4 === 0 ? undefined : getStringFromWasm0(arg4, arg5));
            }, arguments); },
            __wbg_put_378af428b16ba8f2: function() { return handleError(function (arg0, arg1, arg2) {
                const ret = getObject(arg0).put(getObject(arg1), getObject(arg2));
                return addHeapObject(ret);
            }, arguments); },
            __wbg_querySelectorAll_6aebfe3df1fb2014: function() { return handleError(function (arg0, arg1, arg2) {
                const ret = getObject(arg0).querySelectorAll(getStringFromWasm0(arg1, arg2));
                return addHeapObject(ret);
            }, arguments); },
            __wbg_querySelectorAll_8c482e0f1fcafea8: function() { return handleError(function (arg0, arg1, arg2) {
                const ret = getObject(arg0).querySelectorAll(getStringFromWasm0(arg1, arg2));
                return addHeapObject(ret);
            }, arguments); },
            __wbg_querySelector_49877e2a9e3f670b: function() { return handleError(function (arg0, arg1, arg2) {
                const ret = getObject(arg0).querySelector(getStringFromWasm0(arg1, arg2));
                return isLikeNone(ret) ? 0 : addHeapObject(ret);
            }, arguments); },
            __wbg_querySelector_ecbc2550705b235f: function() { return handleError(function (arg0, arg1, arg2) {
                const ret = getObject(arg0).querySelector(getStringFromWasm0(arg1, arg2));
                return isLikeNone(ret) ? 0 : addHeapObject(ret);
            }, arguments); },
            __wbg_random_5a4cafd2f02395ff: function() {
                const ret = Math.random();
                return ret;
            },
            __wbg_readAsDataURL_226837aa04d4a6ce: function() { return handleError(function (arg0, arg1) {
                getObject(arg0).readAsDataURL(getObject(arg1));
            }, arguments); },
            __wbg_reload_0dd932ae5e23064a: function() { return handleError(function (arg0) {
                getObject(arg0).reload();
            }, arguments); },
            __wbg_removeItem_f7b602722ed566dd: function() { return handleError(function (arg0, arg1, arg2) {
                getObject(arg0).removeItem(getStringFromWasm0(arg1, arg2));
            }, arguments); },
            __wbg_remove_1013622eead8b586: function() { return handleError(function (arg0, arg1, arg2) {
                getObject(arg0).remove(getStringFromWasm0(arg1, arg2));
            }, arguments); },
            __wbg_remove_9a5288388316028c: function(arg0) {
                getObject(arg0).remove();
            },
            __wbg_replaceState_8814bbf1e44e1990: function() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5) {
                getObject(arg0).replaceState(getObject(arg1), getStringFromWasm0(arg2, arg3), arg4 === 0 ? undefined : getStringFromWasm0(arg4, arg5));
            }, arguments); },
            __wbg_replace_89a2bb260816315a: function(arg0, arg1, arg2, arg3) {
                const ret = getObject(arg0).replace(getObject(arg1), getStringFromWasm0(arg2, arg3));
                return addHeapObject(ret);
            },
            __wbg_requestAnimationFrame_7b526ab7aa550c74: function() { return handleError(function (arg0, arg1) {
                const ret = getObject(arg0).requestAnimationFrame(getObject(arg1));
                return ret;
            }, arguments); },
            __wbg_restore_c93ba7571816b182: function(arg0) {
                getObject(arg0).restore();
            },
            __wbg_result_66ae42c57a28369f: function() { return handleError(function (arg0) {
                const ret = getObject(arg0).result;
                return addHeapObject(ret);
            }, arguments); },
            __wbg_result_ea60156c5cd4726f: function() { return handleError(function (arg0) {
                const ret = getObject(arg0).result;
                return addHeapObject(ret);
            }, arguments); },
            __wbg_rotate_5273f09fed0af920: function() { return handleError(function (arg0, arg1) {
                getObject(arg0).rotate(arg1);
            }, arguments); },
            __wbg_save_f32554f1747071d1: function(arg0) {
                getObject(arg0).save();
            },
            __wbg_scrollTo_5aa459d1fa86b073: function(arg0, arg1, arg2) {
                getObject(arg0).scrollTo(arg1, arg2);
            },
            __wbg_sessionStorage_83ad127fc90bc95e: function() { return handleError(function (arg0) {
                const ret = getObject(arg0).sessionStorage;
                return isLikeNone(ret) ? 0 : addHeapObject(ret);
            }, arguments); },
            __wbg_setAttribute_9e7d603908f63705: function() { return handleError(function (arg0, arg1, arg2, arg3, arg4) {
                getObject(arg0).setAttribute(getStringFromWasm0(arg1, arg2), getStringFromWasm0(arg3, arg4));
            }, arguments); },
            __wbg_setInterval_aa4e3d3f590ce835: function() { return handleError(function (arg0, arg1, arg2) {
                const ret = getObject(arg0).setInterval(getObject(arg1), arg2);
                return ret;
            }, arguments); },
            __wbg_setItem_c5fb0966b484ecd3: function() { return handleError(function (arg0, arg1, arg2, arg3, arg4) {
                getObject(arg0).setItem(getStringFromWasm0(arg1, arg2), getStringFromWasm0(arg3, arg4));
            }, arguments); },
            __wbg_setPointerCapture_a53e23b7bccef290: function() { return handleError(function (arg0, arg1) {
                getObject(arg0).setPointerCapture(arg1);
            }, arguments); },
            __wbg_setProperty_097bc3d55ce44513: function() { return handleError(function (arg0, arg1, arg2, arg3, arg4) {
                getObject(arg0).setProperty(getStringFromWasm0(arg1, arg2), getStringFromWasm0(arg3, arg4));
            }, arguments); },
            __wbg_setTimeout_db7bbc18a17e152a: function() { return handleError(function (arg0, arg1, arg2) {
                const ret = getObject(arg0).setTimeout(getObject(arg1), arg2);
                return ret;
            }, arguments); },
            __wbg_setValueAtTime_2edc098944a654d2: function() { return handleError(function (arg0, arg1, arg2) {
                const ret = getObject(arg0).setValueAtTime(arg1, arg2);
                return addHeapObject(ret);
            }, arguments); },
            __wbg_set_145a351398b48c65: function() { return handleError(function (arg0, arg1, arg2) {
                const ret = Reflect.set(getObject(arg0), getObject(arg1), getObject(arg2));
                return ret;
            }, arguments); },
            __wbg_set_className_541fce5cd31918aa: function(arg0, arg1, arg2) {
                getObject(arg0).className = getStringFromWasm0(arg1, arg2);
            },
            __wbg_set_fillStyle_a2961b4d44e572af: function(arg0, arg1, arg2) {
                getObject(arg0).fillStyle = getStringFromWasm0(arg1, arg2);
            },
            __wbg_set_height_c9789c1c77eaedff: function(arg0, arg1) {
                getObject(arg0).height = arg1 >>> 0;
            },
            __wbg_set_id_60955e6018d03b26: function(arg0, arg1, arg2) {
                getObject(arg0).id = getStringFromWasm0(arg1, arg2);
            },
            __wbg_set_innerHTML_7af59a832a09a074: function(arg0, arg1, arg2) {
                getObject(arg0).innerHTML = getStringFromWasm0(arg1, arg2);
            },
            __wbg_set_passive_31e9f895d2ac0046: function(arg0, arg1) {
                getObject(arg0).passive = arg1 !== 0;
            },
            __wbg_set_src_e0fe5ef5d5c648aa: function(arg0, arg1, arg2) {
                getObject(arg0).src = getStringFromWasm0(arg1, arg2);
            },
            __wbg_set_textContent_6d6fc559f198055f: function(arg0, arg1, arg2) {
                getObject(arg0).textContent = arg1 === 0 ? undefined : getStringFromWasm0(arg1, arg2);
            },
            __wbg_set_type_59c4e91d57bb96dc: function(arg0, arg1) {
                getObject(arg0).type = __wbindgen_enum_OscillatorType[arg1];
            },
            __wbg_set_value_fbd659f94bfb9181: function(arg0, arg1, arg2) {
                getObject(arg0).value = getStringFromWasm0(arg1, arg2);
            },
            __wbg_set_width_b0e1267db4b196b5: function(arg0, arg1) {
                getObject(arg0).width = arg1 >>> 0;
            },
            __wbg_start_3f09c6b8021c0242: function() { return handleError(function (arg0, arg1) {
                getObject(arg0).start(arg1);
            }, arguments); },
            __wbg_static_accessor_GLOBAL_266715b9d96ba635: function() {
                const ret = typeof global === 'undefined' ? null : global;
                return isLikeNone(ret) ? 0 : addHeapObject(ret);
            },
            __wbg_static_accessor_GLOBAL_THIS_10fb7dc1ae063179: function() {
                const ret = typeof globalThis === 'undefined' ? null : globalThis;
                return isLikeNone(ret) ? 0 : addHeapObject(ret);
            },
            __wbg_static_accessor_SELF_0b583911f537483a: function() {
                const ret = typeof self === 'undefined' ? null : self;
                return isLikeNone(ret) ? 0 : addHeapObject(ret);
            },
            __wbg_static_accessor_WINDOW_d7f903d1508cbdc4: function() {
                const ret = typeof window === 'undefined' ? null : window;
                return isLikeNone(ret) ? 0 : addHeapObject(ret);
            },
            __wbg_stop_ff597eb931e2e4f9: function() { return handleError(function (arg0, arg1) {
                getObject(arg0).stop(arg1);
            }, arguments); },
            __wbg_style_4bce24230e493a7c: function(arg0) {
                const ret = getObject(arg0).style;
                return addHeapObject(ret);
            },
            __wbg_test_1f76f7f4edee7126: function(arg0, arg1, arg2) {
                const ret = getObject(arg0).test(getStringFromWasm0(arg1, arg2));
                return ret;
            },
            __wbg_toDataURL_916fbcd9bb83fb0a: function() { return handleError(function (arg0, arg1, arg2, arg3, arg4) {
                const ret = getObject(arg1).toDataURL(getStringFromWasm0(arg2, arg3), getObject(arg4));
                const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_export, wasm.__wbindgen_export2);
                const len1 = WASM_VECTOR_LEN;
                getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
                getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
            }, arguments); },
            __wbg_toISOString_3217c36cf55f719b: function(arg0) {
                const ret = getObject(arg0).toISOString();
                return addHeapObject(ret);
            },
            __wbg_toLocaleDateString_ccc6cfa4e9883e44: function(arg0, arg1, arg2, arg3) {
                const ret = getObject(arg0).toLocaleDateString(getStringFromWasm0(arg1, arg2), getObject(arg3));
                return addHeapObject(ret);
            },
            __wbg_toggle_40db1492f54c657f: function() { return handleError(function (arg0, arg1, arg2, arg3) {
                const ret = getObject(arg0).toggle(getStringFromWasm0(arg1, arg2), arg3 !== 0);
                return ret;
            }, arguments); },
            __wbg_toggle_a36c6f89a0260a1c: function() { return handleError(function (arg0, arg1, arg2) {
                const ret = getObject(arg0).toggle(getStringFromWasm0(arg1, arg2));
                return ret;
            }, arguments); },
            __wbg_top_ff4627294d2cdeb8: function(arg0) {
                const ret = getObject(arg0).top;
                return ret;
            },
            __wbg_transaction_397c4619233ad8f5: function() { return handleError(function (arg0, arg1, arg2) {
                const ret = getObject(arg0).transaction(getStringFromWasm0(arg1, arg2));
                return addHeapObject(ret);
            }, arguments); },
            __wbg_transaction_55a3a4e0134a0fd6: function() { return handleError(function (arg0, arg1, arg2, arg3) {
                const ret = getObject(arg0).transaction(getStringFromWasm0(arg1, arg2), __wbindgen_enum_IdbTransactionMode[arg3]);
                return addHeapObject(ret);
            }, arguments); },
            __wbg_translate_b75b7d842d89a889: function() { return handleError(function (arg0, arg1, arg2) {
                getObject(arg0).translate(arg1, arg2);
            }, arguments); },
            __wbg_value_05305a761dfa3e0e: function(arg0, arg1) {
                const ret = getObject(arg1).value;
                const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_export, wasm.__wbindgen_export2);
                const len1 = WASM_VECTOR_LEN;
                getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
                getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
            },
            __wbg_warn_b083f6aa089f2e7c: function(arg0, arg1) {
                console.warn(getObject(arg0), getObject(arg1));
            },
            __wbg_width_3b5d66c5eac1eb28: function(arg0) {
                const ret = getObject(arg0).width;
                return ret;
            },
            __wbg_width_3d0dce3d9892e35e: function(arg0) {
                const ret = getObject(arg0).width;
                return ret;
            },
            __wbg_width_d5e379bde85b6eaa: function(arg0) {
                const ret = getObject(arg0).width;
                return ret;
            },
            __wbindgen_generic_0000000000000001: function(arg0, arg1) {
                // Cast intrinsic for `Closure(Closure { owned: true, function: Function { arguments: [Externref, Externref], shim_idx: 7, ret: Externref, inner_ret: Some(Externref) }, mutable: false }) -> Externref`.
                const ret = makeClosure(arg0, arg1, __wasm_bindgen_func_elem_329);
                return addHeapObject(ret);
            },
            __wbindgen_generic_0000000000000002: function(arg0, arg1) {
                // Cast intrinsic for `Closure(Closure { owned: true, function: Function { arguments: [Externref], shim_idx: 5, ret: Unit, inner_ret: Some(Unit) }, mutable: true }) -> Externref`.
                const ret = makeMutClosure(arg0, arg1, __wasm_bindgen_func_elem_333);
                return addHeapObject(ret);
            },
            __wbindgen_generic_0000000000000003: function(arg0, arg1) {
                // Cast intrinsic for `Closure(Closure { owned: true, function: Function { arguments: [], shim_idx: 11, ret: Unit, inner_ret: Some(Unit) }, mutable: true }) -> Externref`.
                const ret = makeMutClosure(arg0, arg1, __wasm_bindgen_func_elem_336);
                return addHeapObject(ret);
            },
            __wbindgen_generic_0000000000000004: function(arg0, arg1) {
                // Cast intrinsic for `Closure(Closure { owned: true, function: Function { arguments: [], shim_idx: 9, ret: Externref, inner_ret: Some(Externref) }, mutable: false }) -> Externref`.
                const ret = makeClosure(arg0, arg1, __wasm_bindgen_func_elem_332);
                return addHeapObject(ret);
            },
            __wbindgen_generic_0000000000000005: function(arg0) {
                // Cast intrinsic for `F64 -> Externref`.
                const ret = arg0;
                return addHeapObject(ret);
            },
            __wbindgen_generic_0000000000000006: function(arg0, arg1) {
                // Cast intrinsic for `Ref(String) -> Externref`.
                const ret = getStringFromWasm0(arg0, arg1);
                return addHeapObject(ret);
            },
            __wbindgen_object_clone_ref: function(arg0) {
                const ret = getObject(arg0);
                return addHeapObject(ret);
            },
            __wbindgen_object_drop_ref: function(arg0) {
                takeObject(arg0);
            },
        };
        return {
            __proto__: null,
            "./ltf_bg.js": import0,
        };
    }

    function __wasm_bindgen_func_elem_336(arg0, arg1) {
        wasm.__wasm_bindgen_func_elem_336(arg0, arg1);
    }

    function __wasm_bindgen_func_elem_332(arg0, arg1) {
        const ret = wasm.__wasm_bindgen_func_elem_332(arg0, arg1);
        return takeObject(ret);
    }

    function __wasm_bindgen_func_elem_333(arg0, arg1, arg2) {
        wasm.__wasm_bindgen_func_elem_333(arg0, arg1, addHeapObject(arg2));
    }

    function __wasm_bindgen_func_elem_329(arg0, arg1, arg2, arg3) {
        const ret = wasm.__wasm_bindgen_func_elem_329(arg0, arg1, addHeapObject(arg2), addHeapObject(arg3));
        return takeObject(ret);
    }


    const __wbindgen_enum_IdbTransactionMode = ["readonly", "readwrite", "versionchange", "readwriteflush", "cleanup"];


    const __wbindgen_enum_OscillatorType = ["sine", "square", "sawtooth", "triangle", "custom"];

    function addHeapObject(obj) {
        if (heap_next === heap.length) heap.push(heap.length + 1);
        const idx = heap_next;
        heap_next = heap[idx];

        heap[idx] = obj;
        return idx;
    }

    const CLOSURE_DTORS = (typeof FinalizationRegistry === 'undefined')
        ? { register: () => {}, unregister: () => {} }
        : new FinalizationRegistry(state => wasm.__wbindgen_export4(state.a, state.b));

    function debugString(val) {
        // primitive types
        const type = typeof val;
        if (type == 'number' || type == 'boolean' || val == null) {
            return  `${val}`;
        }
        if (type == 'string') {
            return `"${val}"`;
        }
        if (type == 'symbol') {
            const description = val.description;
            if (description == null) {
                return 'Symbol';
            } else {
                return `Symbol(${description})`;
            }
        }
        if (type == 'function') {
            const name = val.name;
            if (typeof name == 'string' && name.length > 0) {
                return `Function(${name})`;
            } else {
                return 'Function';
            }
        }
        // objects
        if (Array.isArray(val)) {
            const length = val.length;
            let debug = '[';
            if (length > 0) {
                debug += debugString(val[0]);
            }
            for(let i = 1; i < length; i++) {
                debug += ', ' + debugString(val[i]);
            }
            debug += ']';
            return debug;
        }
        // Test for built-in
        const builtInMatches = /\[object ([^\]]+)\]/.exec(toString.call(val));
        let className;
        if (builtInMatches && builtInMatches.length > 1) {
            className = builtInMatches[1];
        } else {
            // Failed to match the standard '[object ClassName]'
            return toString.call(val);
        }
        if (className == 'Object') {
            // we're a user defined class or Object
            // JSON.stringify avoids problems with cycles, and is generally much
            // easier than looping through ownProperties of `val`.
            try {
                return 'Object(' + JSON.stringify(val) + ')';
            } catch (_) {
                return 'Object';
            }
        }
        // errors
        if (val instanceof Error) {
            return `${val.name}: ${val.message}\n${val.stack}`;
        }
        // TODO we could test for more things here, like `Set`s and `Map`s.
        return className;
    }

    function dropObject(idx) {
        if (idx < 1028) return;
        heap[idx] = heap_next;
        heap_next = idx;
    }

    let cachedDataViewMemory0 = null;
    function getDataViewMemory0() {
        if (cachedDataViewMemory0 === null || cachedDataViewMemory0.buffer.detached === true || (cachedDataViewMemory0.buffer.detached === undefined && cachedDataViewMemory0.buffer !== wasm.memory.buffer)) {
            cachedDataViewMemory0 = new DataView(wasm.memory.buffer);
        }
        return cachedDataViewMemory0;
    }

    function getStringFromWasm0(ptr, len) {
        return decodeText(ptr >>> 0, len);
    }

    let cachedUint8ArrayMemory0 = null;
    function getUint8ArrayMemory0() {
        if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
            cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
        }
        return cachedUint8ArrayMemory0;
    }

    function getObject(idx) { return heap[idx]; }

    function handleError(f, args) {
        try {
            return f.apply(this, args);
        } catch (e) {
            wasm.__wbindgen_export3(addHeapObject(e));
        }
    }

    let heap = new Array(1024).fill(undefined);
    heap.push(undefined, null, true, false);

    let heap_next = heap.length;

    function isLikeNone(x) {
        return x === undefined || x === null;
    }

    function makeClosure(arg0, arg1, f) {
        const state = { a: arg0, b: arg1, cnt: 1 };
        const real = (...args) => {

            // First up with a closure we increment the internal reference
            // count. This ensures that the Rust closure environment won't
            // be deallocated while we're invoking it.
            state.cnt++;
            try {
                return f(state.a, state.b, ...args);
            } finally {
                real._wbg_cb_unref();
            }
        };
        real._wbg_cb_unref = () => {
            if (--state.cnt === 0) {
                wasm.__wbindgen_export4(state.a, state.b);
                state.a = 0;
                CLOSURE_DTORS.unregister(state);
            }
        };
        CLOSURE_DTORS.register(real, state, state);
        return real;
    }

    function makeMutClosure(arg0, arg1, f) {
        const state = { a: arg0, b: arg1, cnt: 1 };
        const real = (...args) => {

            // First up with a closure we increment the internal reference
            // count. This ensures that the Rust closure environment won't
            // be deallocated while we're invoking it.
            state.cnt++;
            const a = state.a;
            state.a = 0;
            try {
                return f(a, state.b, ...args);
            } finally {
                state.a = a;
                real._wbg_cb_unref();
            }
        };
        real._wbg_cb_unref = () => {
            if (--state.cnt === 0) {
                wasm.__wbindgen_export4(state.a, state.b);
                state.a = 0;
                CLOSURE_DTORS.unregister(state);
            }
        };
        CLOSURE_DTORS.register(real, state, state);
        return real;
    }

    function passStringToWasm0(arg, malloc, realloc) {
        if (realloc === undefined) {
            const buf = cachedTextEncoder.encode(arg);
            const ptr = malloc(buf.length, 1) >>> 0;
            getUint8ArrayMemory0().subarray(ptr, ptr + buf.length).set(buf);
            WASM_VECTOR_LEN = buf.length;
            return ptr;
        }

        let len = arg.length;
        let ptr = malloc(len, 1) >>> 0;

        const mem = getUint8ArrayMemory0();

        let offset = 0;

        for (; offset < len; offset++) {
            const code = arg.charCodeAt(offset);
            if (code > 0x7F) break;
            mem[ptr + offset] = code;
        }
        if (offset !== len) {
            if (offset !== 0) {
                arg = arg.slice(offset);
            }
            ptr = realloc(ptr, len, len = offset + arg.length * 3, 1) >>> 0;
            const view = getUint8ArrayMemory0().subarray(ptr + offset, ptr + len);
            const ret = cachedTextEncoder.encodeInto(arg, view);

            offset += ret.written;
            ptr = realloc(ptr, len, offset, 1) >>> 0;
        }

        WASM_VECTOR_LEN = offset;
        return ptr;
    }

    function takeObject(idx) {
        const ret = getObject(idx);
        dropObject(idx);
        return ret;
    }

    let cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
    cachedTextDecoder.decode();
    function decodeText(ptr, len) {
        return cachedTextDecoder.decode(getUint8ArrayMemory0().subarray(ptr, ptr + len));
    }

    const cachedTextEncoder = new TextEncoder();

    if (!('encodeInto' in cachedTextEncoder)) {
        cachedTextEncoder.encodeInto = function (arg, view) {
            const buf = cachedTextEncoder.encode(arg);
            view.set(buf);
            return {
                read: arg.length,
                written: buf.length
            };
        };
    }

    let WASM_VECTOR_LEN = 0;

    let wasmModule, wasmInstance, wasm;
    function __wbg_finalize_init(instance, module) {
        wasmInstance = instance;
        wasm = instance.exports;
        wasmModule = module;
        cachedDataViewMemory0 = null;
        cachedUint8ArrayMemory0 = null;
        wasm.__wbindgen_start();
        return wasm;
    }

    async function __wbg_load(module, imports) {
        if (typeof Response === 'function' && module instanceof Response) {
            if (!module.ok) {
                throw new Error(`failed to fetch Wasm: ${module.status} ${module.statusText} fetching '${module.url}'`);
            }

            if (typeof WebAssembly.instantiateStreaming === 'function') {
                try {
                    return await WebAssembly.instantiateStreaming(module, imports);
                } catch (e) {
                    const validResponse = expectedResponseType(module.type);

                    if (validResponse && module.headers.get('Content-Type') !== 'application/wasm') {
                        console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);

                    } else { throw e; }
                }
            }

            const bytes = await module.arrayBuffer();
            return await WebAssembly.instantiate(bytes, imports);
        } else {
            const instance = await WebAssembly.instantiate(module, imports);

            if (instance instanceof WebAssembly.Instance) {
                return { instance, module };
            } else {
                return instance;
            }
        }

        function expectedResponseType(type) {
            switch (type) {
                case 'basic': case 'cors': case 'default': return true;
            }
            return false;
        }
    }

    function initSync(module) {
        if (wasm !== undefined) return wasm;


        if (module !== undefined) {
            if (Object.getPrototypeOf(module) === Object.prototype) {
                ({module} = module)
            } else {
                console.warn('using deprecated parameters for `initSync()`; pass a single object instead')
            }
        }

        const imports = __wbg_get_imports();
        if (!(module instanceof WebAssembly.Module)) {
            module = new WebAssembly.Module(module);
        }
        const instance = new WebAssembly.Instance(module, imports);
        return __wbg_finalize_init(instance, module);
    }

    async function __wbg_init(module_or_path) {
        if (wasm !== undefined) return wasm;


        if (module_or_path !== undefined) {
            if (Object.getPrototypeOf(module_or_path) === Object.prototype) {
                ({module_or_path} = module_or_path)
            } else {
                console.warn('using deprecated parameters for the initialization function; pass a single object instead')
            }
        }

        if (module_or_path === undefined && script_src !== undefined) {
            module_or_path = script_src.replace(/\.js$/, "_bg.wasm");
        }
        const imports = __wbg_get_imports();

        if (typeof module_or_path === 'string' || (typeof Request === 'function' && module_or_path instanceof Request) || (typeof URL === 'function' && module_or_path instanceof URL)) {
            module_or_path = fetch(module_or_path);
        }

        const { instance, module } = await __wbg_load(await module_or_path, imports);

        return __wbg_finalize_init(instance, module);
    }

    return Object.assign(__wbg_init, { initSync }, exports);
})({ __proto__: null });
