import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { transformWithOxc } from 'vite';

test('hiding the page does not issue an app pause; provider pauses and explicit controls are respected', async () => {
  const effects = [];
  const refs = [];
  const cleanups = [];
  const changes = [];
  const listeners = new Map();
  let refIndex = 0;
  let options;
  let playCalls = 0;
  let pauseCalls = 0;
  let endedCalls = 0;
  let destroyed = false;
  let embeddedFrame;
  let lastVolume;
  let lastSeek;
  const errors = [];
  const player = {
    playVideo: () => playCalls++,
    pauseVideo: () => pauseCalls++,
    setVolume(value) { lastVolume = value; },
    seekTo(value) { lastSeek = value; },
    getCurrentTime: () => 12, getDuration: () => 180,
    destroy: () => { destroyed = true; },
  };
  const react = {
    createElement: (type, props) => ({ type, props }),
    useRef: (initial) => {
      const index = refIndex++;
      refs[index] ??= { current: initial === null && index === 0
        ? { replaceChildren(frame) { embeddedFrame = frame; } } : initial };
      return refs[index];
    },
    useState: (initial) => [initial, () => {}],
    useEffect: (effect) => effects.push(effect),
  };
  const document = {
    hidden: false,
    createElement: () => ({ style: {}, setAttribute() {}, remove() {} }),
    addEventListener: (name, handler) => listeners.set(name, handler),
    removeEventListener: (name) => listeners.delete(name),
  };
  const window = {
    YT: {
      Player: function (mount, config) {
        assert.equal(mount, embeddedFrame);
        options = config;
        return player;
      },
      PlayerState: { ENDED: 0, PLAYING: 1, PAUSED: 2 },
    },
    location: { origin: 'https://music.example' },
    setInterval: () => 1, clearInterval() {},
  };
  const source = readFileSync(new URL('../src/components/YouTubeAudioPlayer.tsx', import.meta.url), 'utf8');
  const transformed = await transformWithOxc(source, 'YouTubeAudioPlayer.tsx', { jsx: { runtime: 'classic' } });
  const code = transformed.code
    .replace(/^import .* from ["']react["'];?$/m, 'const { useEffect, useRef, useState } = React;')
    .replace(/^import .* from ["']lucide-react["'];?$/m, 'const X = null, ExternalLink = null, Youtube = null;')
    .replace('export const YouTubeAudioPlayer', 'const YouTubeAudioPlayer')
    + '\nmodule.exports.YouTubeAudioPlayer = YouTubeAudioPlayer;';
  const module = { exports: {} };
  runInNewContext(code, {
    module, exports: module.exports, window, document, console, URLSearchParams,
    React: react,
  });
  const props = {
    song: { youtubeId: 'test-video' }, isActive: true, isPlaying: true,
    currentTime: 0, seekVersion: 0, volume: 0.85,
    onTimeUpdate() {}, onPlaybackChange: (playing) => changes.push(playing),
    onEnded: () => endedCalls++,
    onError: message => errors.push(message),
  };
  const host = module.exports.YouTubeAudioPlayer(props);
  assert.equal(host.type, 'div');
  assert.equal(host.props['aria-hidden'], 'true');
  assert.equal(host.props.inert, true);
  assert.equal(host.props.style.opacity, 0);
  assert.ok(parseInt(host.props.style.left, 10) + host.props.style.width < 0);
  cleanups.push(effects[0]());
  // The iframe must exist before the asynchronous API resolves.
  assert.match(embeddedFrame.src, /youtube\.com\/embed\/test-video/);
  assert.match(embeddedFrame.allow, /autoplay/);
  assert.equal(embeddedFrame.referrerPolicy, 'strict-origin-when-cross-origin');
  assert.equal(embeddedFrame.tabIndex, -1);
  assert.equal(new URL(embeddedFrame.src).searchParams.get('controls'), '0');
  await Promise.resolve();
  assert.equal(options.playerVars.autoplay, 0);

  // Hide the page while the iframe is loading, then complete initialization.
  document.hidden = true;
  options.events.onReady({ target: player });
  for (const effect of effects.slice(1)) cleanups.push(effect());
  listeners.get('visibilitychange')?.();
  options.events.onStateChange({ data: 1 });
  assert.ok(playCalls > 0);
  assert.equal(pauseCalls, 0);
  assert.deepEqual(changes, [true]);

  // A mobile browser/provider can suspend the embed. Report this without
  // retrying playback in the background or pretending the song still plays.
  const playCallsBeforeProviderPause = playCalls;
  options.events.onStateChange({ data: 2 });
  assert.equal(changes.at(-1), false);
  assert.match(errors.at(-1), /YouTube paused this song in the background/);
  assert.equal(playCalls, playCallsBeforeProviderPause);

  // Explicit pause must still work while hidden.
  effects.length = 0;
  refIndex = 0;
  module.exports.YouTubeAudioPlayer({ ...props, isPlaying: false });
  effects[1]();
  assert.equal(pauseCalls, 1);
  const changesBeforeLateEvent = changes.length;
  options.events.onStateChange({ data: 1 });
  assert.equal(pauseCalls, 2);
  assert.equal(changes.length, changesBeforeLateEvent);
  const errorsBeforeExplicitPause = errors.length;
  options.events.onStateChange({ data: 2 });
  assert.equal(errors.length, errorsBeforeExplicitPause);
  options.events.onStateChange({ data: 0 });
  assert.equal(endedCalls, 1);
  assert.equal(changes.at(-1), false);

  // All transport controls remain available through the app, without video UI.
  effects.length = 0;
  refIndex = 0;
  module.exports.YouTubeAudioPlayer({ ...props, volume: 0.4, currentTime: 25, seekVersion: 1 });
  effects[2]();
  effects[3]();
  assert.equal(lastVolume, 40);
  assert.equal(lastSeek, 25);
  options.events.onAutoplayBlocked();
  assert.match(errors.at(-1), /music bar/);
  assert.equal(changes.at(-1), false);
  for (const cleanup of cleanups) cleanup?.();
  assert.equal(destroyed, true);
});

test('an API network failure stops invisible playback and reports a retryable error', async () => {
  const effects = [];
  const changes = [];
  const errors = [];
  let frame;
  let script;
  let removed = false;
  const host = { replaceChildren(value) { frame = value; } };
  let refIndex = 0;
  const react = {
    createElement: () => null,
    useRef: value => ({ current: refIndex++ === 0 ? host : value }),
    useState: value => [value, () => {}],
    useEffect: effect => effects.push(effect),
  };
  const document = {
    createElement: tag => tag === 'iframe'
      ? { style: {}, setAttribute() {}, remove() { removed = true; } }
      : { remove() {} },
    querySelector: () => script,
    head: { appendChild(value) { script = value; } },
  };
  const window = {
    location: { origin: 'http://localhost:3000' },
    setTimeout: () => 1, clearTimeout() {}, clearInterval() {},
  };
  const source = readFileSync(new URL('../src/components/YouTubeAudioPlayer.tsx', import.meta.url), 'utf8');
  const transformed = await transformWithOxc(source, 'YouTubeAudioPlayer.tsx', { jsx: { runtime: 'classic' } });
  const code = transformed.code
    .replace(/^import .* from ["']react["'];?$/m, 'const { useEffect, useRef, useState } = React;')
    .replace(/^import .* from ["']lucide-react["'];?$/m, 'const X = null, ExternalLink = null, Youtube = null;')
    .replace('export const YouTubeAudioPlayer', 'const YouTubeAudioPlayer')
    + '\nmodule.exports.YouTubeAudioPlayer = YouTubeAudioPlayer;';
  const module = { exports: {} };
  runInNewContext(code, { module, React: react, document, window, URLSearchParams, console: { error() {} } });
  module.exports.YouTubeAudioPlayer({
    song: { youtubeId: 'test-video', title: 'Test' }, isActive: true, isPlaying: true,
    volume: 0.85, currentTime: 0, seekVersion: 0,
    onPlaybackChange: value => changes.push(value),
    onError: message => errors.push(message),
  });
  const cleanup = effects[0]();
  assert.ok(frame.src);
  script.onerror();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(removed, true);
  assert.deepEqual(changes, [false]);
  assert.match(errors.at(-1), /press Play/i);
  cleanup();
  assert.equal(removed, true);
});
