import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { transformWithOxc } from 'vite';

const source = readFileSync(new URL('../src/utils/audioEngine.ts', import.meta.url), 'utf8');
const transformed = await transformWithOxc(source, 'audioEngine.ts');
const code = transformed.code.replace('export const audioEngine', 'const audioEngine')
  + '\nmodule.exports.audioEngine = audioEngine;';
const song = (id = 'one') => ({
  id, title: `Song ${id}`, artist: 'Artist', album: 'Album', coverUrl: 'https://music.example/cover.jpg',
  duration: 180, audioSrc: `blob:https://music.example/${id}`,
});

function createBrowser({ userAgent = 'Mozilla/5.0 Android', platform = 'Linux armv8l', maxTouchPoints = 5,
  unsupportedAction, metadataFails = false, audioSession = true } = {}) {
  const audioElements = [];
  const contexts = [];
  const changes = [];
  const errors = [];
  const positions = [];
  const documentListeners = new Map();
  const windowListeners = new Map();
  const handlers = new Map();
  class Audio {
    constructor() {
      this.paused = true;
      this.ended = false;
      this.duration = 180;
      this.currentTime = 0;
      this.readyState = 0;
      this.volume = 1;
      this.playbackRate = 1;
      this.playCalls = 0;
      this.pauseCalls = 0;
      audioElements.push(this);
    }
    set src(value) { this._src = value; this.currentTime = 0; this.paused = true; this.ended = false; }
    get src() { return this._src; }
    play() {
      this.playCalls++;
      if (this.playImplementation) return this.playImplementation();
      this.readyState = 1;
      this.onloadedmetadata?.();
      this.paused = false;
      this.onplay?.();
      this.onplaying?.();
      return Promise.resolve();
    }
    pause() {
      this.pauseCalls++;
      const wasPlaying = !this.paused;
      this.paused = true;
      if (wasPlaying) this.onpause?.();
    }
    removeAttribute(name) { if (name === 'src') this._src = ''; }
    load() { this.readyState = 0; }
  }
  const param = () => ({ setValueAtTime() {}, setTargetAtTime() {} });
  const node = () => ({
    connect(target) { return target; }, disconnect() {},
    gain: param(), frequency: param(), Q: param(), ratio: param(), pan: param(),
    threshold: param(), knee: param(), attack: param(), release: param(),
    getByteFrequencyData() {}, getByteTimeDomainData() {},
  });
  class AudioContext {
    constructor() {
      this.state = 'suspended';
      this.sampleRate = 32;
      this.currentTime = 0;
      this.destination = node();
      this.resumeCalls = 0;
      this.mediaSourceCalls = 0;
      contexts.push(this);
    }
    createAnalyser() { return node(); }
    createGain() { return node(); }
    createBiquadFilter() { return node(); }
    createDynamicsCompressor() { return node(); }
    createChannelSplitter() { return node(); }
    createChannelMerger() { return node(); }
    createStereoPanner() { return node(); }
    createConvolver() { return node(); }
    createBuffer(channels, length) { return { getChannelData: () => new Float32Array(length) }; }
    createMediaElementSource(element) {
      assert.equal(element.boundToGraph, undefined, 'A media element cannot be bound twice');
      element.boundToGraph = true;
      this.mediaSourceCalls++;
      return node();
    }
    resume() { this.resumeCalls++; this.state = 'running'; this.onstatechange?.(); return Promise.resolve(); }
    suspend() { this.state = 'suspended'; this.onstatechange?.(); return Promise.resolve(); }
  }
  const document = {
    hidden: false,
    addEventListener: (name, callback) => documentListeners.set(name, callback),
  };
  const window = {
    AudioContext,
    addEventListener: (name, callback) => windowListeners.set(name, callback),
  };
  const navigator = {
    userAgent, platform, maxTouchPoints,
    mediaSession: {
      playbackState: 'none',
      setActionHandler(action, callback) {
        if (action === unsupportedAction) throw new Error('Unsupported action');
        handlers.set(action, callback);
      },
      setPositionState(position) { positions.push(position); },
    },
    ...(audioSession ? { audioSession: { type: 'auto' } } : {}),
  };
  const module = { exports: {} };
  runInNewContext(code, {
    module, window, document, navigator, Audio,
    MediaMetadata: class {
      constructor(metadata) { if (metadataFails) throw new Error('Unsupported metadata'); Object.assign(this, metadata); }
    },
    console: { warn() {} },
  });
  const engine = module.exports.audioEngine;
  engine.setPlaybackCallbacks({ onPlaybackChange: value => changes.push(value), onError: value => errors.push(value) });
  return {
    engine, audioElements, contexts, changes, errors, positions, document, navigator, handlers,
    visibility(hidden) { document.hidden = hidden; documentListeners.get('visibilitychange')?.(); },
    pageshow() { windowListeners.get('pageshow')?.(); },
    play(track = song(), position = 0, onEnded = () => {}) { engine.playSong(track, () => {}, onEnded, position); },
  };
}

const flush = () => new Promise(resolve => setImmediate(resolve));

test('Android and iPhone use persistent native media without a Web Audio graph and retain explicit pauses', async () => {
  for (const userAgent of ['Mozilla/5.0 Android', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)']) {
    const browser = createBrowser({ userAgent });
    browser.play();
    await flush();
    const audio = browser.audioElements[0];
    assert.equal(browser.engine.usesNativeAudio(), true);
    assert.equal(browser.contexts.length, 0);
    assert.equal(audio.boundToGraph, undefined);
    assert.equal(audio.volume, 0.85);
    assert.equal(browser.navigator.audioSession.type, 'playback');
    browser.visibility(true);
    browser.pageshow();
    assert.equal(audio.paused, false);
    assert.equal(audio.playCalls, 1, 'Hiding never retries media playback');
    browser.engine.pause();
    browser.visibility(false);
    browser.pageshow();
    assert.equal(audio.paused, true);
    assert.equal(audio.playCalls, 1, 'Returning never undoes an explicit pause');
    assert.equal(browser.changes.at(-1), false);
    assert.equal(browser.navigator.mediaSession.playbackState, 'paused');
    browser.engine.resume();
    await flush();
    assert.equal(audio.paused, false);
    browser.play(song('two'));
    await flush();
    assert.equal(browser.audioElements.length, 1, 'The native element persists between songs');
  }
});

test('iPad desktop user agent selects native playback; desktop retains DSP and unsupported APIs are optional', async () => {
  const ipad = createBrowser({ userAgent: 'Mozilla/5.0 Macintosh', platform: 'MacIntel', maxTouchPoints: 5 });
  ipad.play();
  assert.equal(ipad.engine.usesNativeAudio(), true);
  const desktop = createBrowser({ userAgent: 'Mozilla/5.0 Windows NT', platform: 'Win32', maxTouchPoints: 0, audioSession: false });
  desktop.play();
  await flush();
  assert.equal(desktop.engine.usesNativeAudio(), false);
  assert.equal(desktop.contexts.length, 1);
  assert.equal(desktop.contexts[0].mediaSourceCalls, 1);
  assert.equal(desktop.audioElements[0].volume, 1, 'DSP gain handles volume once');
});

test('switching native and DSP preserves position, playback rate, volume, and paused intent', async () => {
  const browser = createBrowser();
  browser.play();
  await flush();
  browser.audioElements[0].currentTime = 37;
  browser.engine.setVolume(0.4);
  browser.engine.setPlaybackRate(1.25);
  const stalePause = browser.audioElements[0].onpause;
  browser.engine.setDolbyConfig({ backgroundListening: false });
  await flush();
  const dsp = browser.audioElements[1];
  assert.equal(browser.engine.usesNativeAudio(), false);
  assert.equal(dsp.boundToGraph, true);
  assert.equal(dsp.currentTime, 37);
  assert.equal(dsp.playbackRate, 1.25);
  assert.equal(dsp.paused, false);
  const changes = browser.changes.length;
  stalePause();
  assert.equal(browser.changes.length, changes, 'Retired media events cannot pause the new source');
  browser.engine.setDolbyConfig({ backgroundListening: true });
  await flush();
  const native = browser.audioElements[2];
  assert.equal(browser.engine.usesNativeAudio(), true);
  assert.equal(native.boundToGraph, undefined);
  assert.equal(native.currentTime, 37);
  assert.equal(native.volume, 0.4);
  assert.equal(native.playbackRate, 1.25);
  browser.engine.pause();
  browser.engine.setDolbyConfig({ backgroundListening: false });
  assert.equal(browser.audioElements[3].paused, true);
  assert.equal(browser.audioElements[3].playCalls, 0);
  assert.equal(browser.changes.at(-1), false);
});

test('OS media pause stays paused across lifecycle events and ended/error events report actual state', async () => {
  const browser = createBrowser();
  let ended = 0;
  browser.play(song(), 0, () => ended++);
  await flush();
  const audio = browser.audioElements[0];
  audio.pause();
  browser.visibility(true);
  browser.visibility(false);
  browser.pageshow();
  assert.equal(browser.engine.getIsPlaying(), false);
  assert.equal(audio.playCalls, 1);
  browser.engine.resume();
  await flush();
  audio.ended = true;
  audio.paused = true;
  audio.onended();
  assert.equal(ended, 1);
  assert.equal(browser.navigator.mediaSession.playbackState, 'paused');
  browser.play(song('two'));
  await flush();
  audio.onerror();
  assert.equal(browser.engine.getIsPlaying(), false);
  assert.match(browser.errors.at(-1), /Could not play this audio/);
  assert.equal(browser.changes.at(-1), false);
});

test('stale play promises and queued events cannot undo pause or change the next track state', async () => {
  const browser = createBrowser();
  browser.play();
  await flush();
  const audio = browser.audioElements[0];
  let rejectOldPlay;
  audio.playImplementation = () => new Promise((resolve, reject) => { rejectOldPlay = reject; });
  browser.engine.resume();
  const oldPause = audio.onpause;
  delete audio.playImplementation;
  browser.play(song('two'));
  await flush();
  const errors = browser.errors.length;
  const changes = browser.changes.length;
  rejectOldPlay({ name: 'NotAllowedError' });
  oldPause();
  await flush();
  assert.equal(browser.errors.length, errors);
  assert.equal(browser.changes.length, changes);
  assert.equal(browser.engine.getIsPlaying(), true);
  let resolvePausedPlay;
  audio.playImplementation = () => new Promise(resolve => { resolvePausedPlay = resolve; });
  browser.engine.resume();
  browser.engine.pause();
  const latePlay = audio.onplay;
  audio.paused = false;
  latePlay();
  resolvePausedPlay();
  await flush();
  assert.equal(audio.paused, true);
  assert.equal(browser.changes.at(-1), false);
  assert.equal(browser.engine.getIsPlaying(), false);
});

test('a rejected current play request produces a useful error while the media session remains paused', async () => {
  const browser = createBrowser();
  browser.play();
  await flush();
  browser.engine.pause();
  browser.audioElements[0].playImplementation = () => Promise.reject({ name: 'NotAllowedError' });
  browser.engine.resume();
  await flush();
  assert.match(browser.errors.at(-1), /Playback was blocked/);
  assert.equal(browser.engine.getIsPlaying(), false);
  assert.equal(browser.navigator.mediaSession.playbackState, 'paused');
});

test('only wanted, unpaused DSP restores in foreground after suspended or interrupted context', async () => {
  const browser = createBrowser();
  browser.engine.setDolbyConfig({ backgroundListening: false });
  browser.play();
  await flush();
  const context = browser.contexts[0];
  for (const state of ['suspended', 'interrupted']) {
    context.state = state;
    context.onstatechange();
    const resumes = context.resumeCalls;
    browser.visibility(true);
    browser.pageshow();
    assert.equal(context.resumeCalls, resumes, 'Hidden pages do not retry their DSP');
    assert.equal(browser.engine.getIsPlaying(), false);
    browser.visibility(false);
    assert.equal(context.resumeCalls, resumes + 1);
    assert.equal(browser.engine.getIsPlaying(), true);
  }
  browser.audioElements[0].pause();
  context.state = 'suspended';
  const resumes = context.resumeCalls;
  browser.pageshow();
  assert.equal(context.resumeCalls, resumes, 'An OS pause is not a foreground recovery request');
});

test('YouTube switch does not resume stale direct audio, context, or claim a direct audio session', async () => {
  const browser = createBrowser();
  browser.engine.setDolbyConfig({ backgroundListening: false });
  browser.play();
  await flush();
  const audio = browser.audioElements[0];
  const context = browser.contexts[0];
  browser.play({ ...song('youtube'), audioSrc: undefined, youtubeId: 'test-video' });
  const playCalls = audio.playCalls;
  const resumes = context.resumeCalls;
  context.state = 'suspended';
  browser.engine.pause();
  browser.engine.resume();
  browser.pageshow();
  assert.equal(browser.engine.usesNativeAudio(), false);
  assert.equal(audio.playCalls, playCalls);
  assert.equal(context.resumeCalls, resumes);
  assert.equal(browser.navigator.audioSession.type, 'auto');
});

test('unsupported metadata/actions do not block other media controls and direct positions remain valid', async () => {
  const browser = createBrowser({ unsupportedAction: 'previoustrack', metadataFails: true });
  let next = 0;
  browser.engine.setMediaSessionCallbacks({ onNext: () => next++, onPause: () => browser.engine.pause() });
  browser.play(song(), 25);
  await flush();
  browser.handlers.get('nexttrack')();
  assert.equal(next, 1);
  assert.equal(browser.handlers.has('seekto'), true);
  assert.equal(browser.audioElements[0].currentTime, 25);
  browser.engine.seek(999);
  assert.equal(browser.positions.at(-1).position, 180);
  browser.engine.setPlaybackRate(1.5);
  assert.equal(browser.positions.at(-1).playbackRate, 1.5);
  browser.audioElements[0].currentTime = -1;
  browser.audioElements[0].ontimeupdate();
  assert.equal(browser.positions.at(-1).position, 0);
  browser.handlers.get('pause')();
  assert.equal(browser.navigator.mediaSession.playbackState, 'paused');
});
