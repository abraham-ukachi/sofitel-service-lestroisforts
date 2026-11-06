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
 * @name: Les Trois Forts - Simulation de service, the guests' voices
 * @file: pwa/sim-voice.js
 * @type: JavaScript (module)
 * @authors: Abraham Ukachi <abrahamukachi@gmail.com>
 *
 * Example usage:
 *   1+|> (sim.js) import { speakLines, stopSpeaking, avatarSvg } from './sim-voice.js';
 *    -|> speakLines([{ text: 'Bonsoir !', kind: 'f', slot: 0, guest: 0 }], { lang: 'fr', onStart, onDone })
 *
 */

/*
 * !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
 * MOTTO: We'll always do more 😜!!!
 * !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
 */

// 📞 The guests talk like on a phone call: the Web Speech API (speechSynthesis) reads their lines aloud,
// one voice per guest (a man, a woman or a child), queued, cancelled when the waiter leaves the table.
// - 🗣️ fr-FR in French, en-GB (then en-US, then any English) in English
// - 🎭 voices picked by gender hints in their names, else pitch & rate (man 0.8, woman 1.15, child 1.6)
// - 🔇 mute remembered in localStorage; no crash when speechSynthesis is missing (old phones, jsdom)
// The waiter's own lines are never spoken (the player says them).

// ===== CONSTANTS 🧰 ===== //

// the mute switch, remembered on this phone 🔇
const MUTE_KEY = 'ltf_sim_mute_v1';

// names that sound like a woman's voice (checked before the men's: « female » contains « male ») 👩
const FEMALE_HINTS =
  /female|femme|woman|amélie|amelie|audrey|aurélie|aurelie|marie|julie|céline|celine|virginie|hortense|denise|léa|lea\b|eloise|vivienne|serena|kate|samantha|karen|moira|tessa|fiona|victoria|susan|hazel|libby|sonia|zira|jenny|aria|natasha|martha|catherine|sara|anna|alice/i;

// names that sound like a man's voice 👨
const MALE_HINTS =
  /\bmale|homme|\bman\b|thomas|daniel|paul|henri|nicolas|jacques|claude|mathieu|rémy|remy|guillaume|antoine|jean|alex|fred|george|ryan|oliver|arthur|david|mark|james|guy|gordon|rishi|aaron|reed|eddy|grandpa/i;

// the fallback pitch & rate when no gendered voice is found (and always for a child) 🎚️
const VOICE_TUNING = {
  m: { pitch: 0.8, rate: 1 },
  f: { pitch: 1.15, rate: 1 },
  c: { pitch: 1.6, rate: 1.05 },
};

// outline avatars (24 × 24, stroke = currentColor): a man (short hair, collar), a woman (long hair), a child 👪
const AVATAR_PATHS = {
  m: 'M12 12.5a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM8.2 7.2C9 5.2 10.4 4.5 12 4.5s3 .7 3.8 2.7M4.5 21c0-4 3.4-6.3 7.5-6.3s7.5 2.3 7.5 6.3M10 15l2 2.5 2-2.5',
  f: 'M12 12.5a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM8 8.5c0 3-1 5-2.5 6M16 8.5c0 3 1 5 2.5 6M4.5 21c0-4 3.4-6.3 7.5-6.3s7.5 2.3 7.5 6.3',
  c: 'M12 13a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4zM12 6.6c0-1.3.8-2.1 1.8-2.1M7 21c0-3.2 2.2-5.2 5-5.2s5 2 5 5.2M10.8 10h.01M13.2 10h.01',
};

// ===== STATE 🌱 ===== //

// the speech queue: the lines still to say, the run (stops old callbacks), the voices list once loaded 📋
const speech = { queue: [], run: 0, voices: [], speaking: false };

// ===== HELPERS 🧰 ===== //

/**
 * `synth` - Function 🔈
 *
 * @returns { SpeechSynthesis | null } - the browser's speech synthesis, or null when there is none
 */
function synth() {
  try {
    return typeof window !== 'undefined' &&
      window.speechSynthesis &&
      typeof SpeechSynthesisUtterance !== 'undefined'
      ? window.speechSynthesis
      : null;
  } catch (error) {
    return null;
  }
}

/**
 * `voiceAvailable` - Function 🔈
 *
 * @returns { boolean } - true when this browser can speak
 */
export function voiceAvailable() {
  return !!synth();
}

/**
 * `isMuted` - Function 🔇
 *
 * @returns { boolean } - true when the waiter muted the guests
 */
export function isMuted() {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch (error) {
    return false;
  }
}

/**
 * `setMuted` - Function 🔇
 *
 * @param { boolean } muted - true to mute (stops what is being said)
 * @returns { void }
 */
export function setMuted(muted) {
  try {
    localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
  } catch (error) {
    // 🙈 private mode: the switch only lasts for this page
  }
  if (muted) stopSpeaking();
}

/**
 * `loadVoices` - Function 🎙️
 *
 * @returns { Array<SpeechSynthesisVoice> } - the voices known now (Chrome fills them after `voiceschanged`)
 */
function loadVoices() {
  const engine = synth();
  if (!engine) return [];
  try {
    speech.voices = engine.getVoices() || [];
  } catch (error) {
    speech.voices = [];
  }
  return speech.voices;
}

/**
 * `watchVoices` - Function 👂
 *
 * @returns { void } - reloads the voices when the browser announces them (once, at import)
 */
function watchVoices() {
  const engine = synth();
  if (!engine) return;
  loadVoices();
  try {
    if (typeof engine.addEventListener === 'function') engine.addEventListener('voiceschanged', loadVoices);
    else engine.onvoiceschanged = loadVoices;
  } catch (error) {
    // 🙈 some engines have no event: the list is read again before each line
  }
}

/**
 * `languageVoices` - Function 🌍
 *
 * @param { string } lang - 'fr' or 'en'
 * @returns { Array<SpeechSynthesisVoice> } - the voices of that language, the best accent first (fr-FR; en-GB then en-US)
 */
function languageVoices(lang) {
  const voices = speech.voices.length ? speech.voices : loadVoices();
  const order = lang === 'en' ? ['en-gb', 'en-us', 'en'] : ['fr-fr', 'fr'];
  /**
   * `rank` - Function 🥇
   *
   * @param { SpeechSynthesisVoice } voice - a voice
   * @returns { number } - its place in `order` (99 when it isn't that language)
   */
  const rank = (voice) => {
    const tag = String(voice.lang || '')
      .toLowerCase()
      .replace('_', '-');
    const index = order.findIndex(
      (prefix) => tag === prefix || tag.startsWith(prefix + '-') || tag === prefix,
    );
    if (index >= 0) return index;
    return tag.startsWith(order[order.length - 1]) ? order.length : 99;
  };
  return voices
    .filter((voice) => rank(voice) < 99)
    .sort(
      (left, right) => rank(left) - rank(right) || Number(!!right.localService) - Number(!!left.localService),
    );
}

/**
 * `genderOf` - Function 🚻
 *
 * @param { SpeechSynthesisVoice } voice - a voice
 * @returns { string } - 'f', 'm' or '' (unknown) from the hints in its name
 */
function genderOf(voice) {
  const name = String(voice.name || '') + ' ' + String(voice.voiceURI || '');
  if (FEMALE_HINTS.test(name)) return 'f';
  if (MALE_HINTS.test(name)) return 'm';
  return '';
}

/**
 * `voiceFor` - Function 🎭
 *
 * A stable voice for a guest: the same kind & slot always get the same voice and tuning.
 *
 * @param { string } kind - 'm', 'f' or 'c' (a child)
 * @param { number } slot - the guest's rank among the guests of the same kind at the table (0, 1, 2…)
 * @param { string } lang - 'fr' or 'en'
 * @returns { {voice: SpeechSynthesisVoice | null, pitch: number, rate: number} } - what to speak with
 */
export function voiceFor(kind, slot, lang) {
  const voices = languageVoices(lang);
  const tuning = VOICE_TUNING[kind] || VOICE_TUNING.m;
  // 👧 a child: a woman's voice (or any), always pitched up
  const wanted = kind === 'c' ? 'f' : kind;
  const gendered = voices.filter((voice) => genderOf(voice) === wanted);
  // 🎚️ two guests sharing a voice still sound different (a small pitch step per slot)
  const step = (slot % 3) * 0.08 * (slot % 2 ? -1 : 1);
  if (gendered.length && kind !== 'c')
    return {
      voice: gendered[slot % gendered.length],
      pitch: 1 + (gendered.length > slot ? 0 : step),
      rate: 1,
    };
  return {
    voice: gendered[0] || voices[slot % Math.max(1, voices.length)] || null,
    pitch: Math.max(0.1, Math.min(2, tuning.pitch + step)),
    rate: tuning.rate,
  };
}

// ===== SPEAKING 🗣️ ===== //

/**
 * `speakLines` - Function 🗣️
 *
 * Queues the guests' lines (after the ones already queued) and speaks them one by one.
 *
 * @param { Array<{text: string, kind: string, slot: number, guest: number}> } lines - what to say, by whom
 * @param { {lang: string, onStart?: Function, onDone?: Function, replace?: boolean} } options - the language, the
 *   callbacks (the speaker's ring) and `replace` to drop what was queued before
 * @returns { boolean } - true when something will be spoken
 */
export function speakLines(lines, options) {
  const engine = synth();
  if (!engine || isMuted()) return false;
  if (options.replace) stopSpeaking();
  (lines || [])
    .filter((line) => line && String(line.text || '').trim())
    .forEach((line) => speech.queue.push(Object.assign({}, line, { options })));
  if (!speech.speaking) speakNext(speech.run);
  return speech.queue.length > 0 || speech.speaking;
}

/**
 * `speakNext` - Function ⏭️
 *
 * @param { number } run - the run that queued the line (a newer stop makes it a no-op)
 * @returns { void } - says the next queued line, then the one after
 */
function speakNext(run) {
  const engine = synth();
  if (!engine || run !== speech.run) return;
  const line = speech.queue.shift();
  if (!line) {
    speech.speaking = false;
    return;
  }
  const options = line.options || {};
  const lang = options.lang === 'en' ? 'en' : 'fr';
  const chosen = voiceFor(line.kind, line.slot || 0, lang);
  let utterance = null;
  try {
    utterance = new SpeechSynthesisUtterance(String(line.text));
  } catch (error) {
    speech.speaking = false;
    return;
  }
  utterance.lang = chosen.voice ? chosen.voice.lang : lang === 'en' ? 'en-GB' : 'fr-FR';
  if (chosen.voice) utterance.voice = chosen.voice;
  utterance.pitch = chosen.pitch;
  utterance.rate = chosen.rate;
  speech.speaking = true;
  /**
   * `finish` - Function ✅
   *
   * @returns { void } - the line ended (or failed): ring off, then the next one
   */
  const finish = () => {
    if (run !== speech.run) return;
    if (typeof options.onDone === 'function') options.onDone(line);
    speech.speaking = false;
    speakNext(run);
  };
  utterance.onstart = () => {
    if (run === speech.run && typeof options.onStart === 'function') options.onStart(line);
  };
  utterance.onend = finish;
  utterance.onerror = finish;
  try {
    engine.speak(utterance);
  } catch (error) {
    finish();
  }
}

/**
 * `stopSpeaking` - Function 🤫
 *
 * @returns { void } - empties the queue and cancels the line being said (leaving the table, mute, end)
 */
export function stopSpeaking() {
  speech.run++;
  speech.queue = [];
  speech.speaking = false;
  const engine = synth();
  if (!engine) return;
  try {
    engine.cancel();
  } catch (error) {
    // 🙈 nothing to cancel
  }
}

// ===== AVATARS 👪 ===== //

/**
 * `avatarSvg` - Function 👤
 *
 * @param { string } kind - 'm', 'f' or 'c'
 * @param { number } size - the size in px
 * @returns { string } - an outline single-colour SVG of a man, a woman or a child
 */
export function avatarSvg(kind, size) {
  const path = AVATAR_PATHS[kind] || AVATAR_PATHS.m;
  return (
    `<svg class="simic" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" ` +
    `stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${path}"/></svg>`
  );
}

// 👂 the voices arrive late on Chrome & Android: listen once
watchVoices();
