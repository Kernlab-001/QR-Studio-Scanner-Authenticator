// Loads the extension's own code outside a browser, so it can be tested.
//
// The extension is a browser program: it reaches for the page and for the
// extension APIs the moment it is loaded. This gives it just enough of both
// to run, and then the real functions can be called and checked.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';

const require = createRequire(import.meta.url);
export const repoRoot = new URL('..', import.meta.url).pathname.replace(/^\//, '').replace(/\/$/, '');

export const qrcode = require(`${repoRoot}/qrcode-generator.js`);
export const jsQR = require(`${repoRoot}/jsqr.js`);

// --- a page that is just about enough ----------------------------------------

function makeClassList() {
  const names = new Set();
  return {
    add: (...values) => values.forEach((value) => names.add(value)),
    remove: (...values) => values.forEach((value) => names.delete(value)),
    contains: (value) => names.has(value),
    toggle: (value, force) => {
      const on = force === undefined ? !names.has(value) : Boolean(force);
      if (on) names.add(value); else names.delete(value);
      return on;
    },
    get value() { return [...names].join(' '); }
  };
}

function makeContext2d() {
  return {
    fillStyle: '#000',
    strokeStyle: '#000',
    lineWidth: 1,
    font: '10px sans-serif',
    globalAlpha: 1,
    fillRect() {},
    clearRect() {},
    strokeRect() {},
    fillText() {},
    drawImage() {},
    putImageData() {},
    getImageData: (x, y, width, height) => ({
      data: new Uint8ClampedArray(Math.max(1, width * height * 4)),
      width,
      height
    }),
    measureText: () => ({ width: 0 }),
    save() {},
    restore() {}
  };
}

export function makeElement(tag = 'div') {
  const target = {
    tagName: String(tag).toUpperCase(),
    textContent: '',
    innerHTML: '',
    value: '',
    hidden: false,
    disabled: false,
    checked: false,
    title: '',
    src: '',
    href: '',
    type: '',
    name: '',
    placeholder: '',
    files: [],
    width: 300,
    height: 150,
    scrollHeight: 0,
    scrollTop: 0,
    children: [],
    parentNode: null,
    dataset: {},
    classList: makeClassList(),
    style: new Proxy({}, { get: () => '', set: () => true }),
    addEventListener() {},
    removeEventListener() {},
    appendChild(child) { this.children.push(child); return child; },
    append(...children) { this.children.push(...children); },
    remove() {},
    focus() {},
    blur() {},
    click() {},
    setAttribute() {},
    removeAttribute() {},
    getAttribute() { return null; },
    hasAttribute() { return false; },
    getBoundingClientRect() { return { width: 300, height: 150, top: 0, left: 0, right: 300, bottom: 150 }; },
    getContext: () => makeContext2d(),
    toDataURL: () => 'data:image/png;base64,',
    querySelector: () => makeElement(),
    querySelectorAll: () => [],
    closest: () => null,
    insertBefore(child) { this.children.push(child); return child; },
    replaceChildren() { this.children = []; },
    cloneNode: () => makeElement(tag)
  };
  return new Proxy(target, {
    get(object, property) {
      if (property in object) return object[property];
      // Anything the code does not know about behaves like an empty element,
      // so one missing piece of the page cannot stop everything else.
      return () => makeElement();
    },
    set(object, property, value) { object[property] = value; return true; }
  });
}

// --- the extension APIs ------------------------------------------------------

export function makeChrome() {
  const data = {};
  const listeners = { changed: [] };
  const read = (key) => (typeof key === 'string'
    ? (key in data ? { [key]: data[key] } : {})
    : { ...data });

  return {
    runtime: {
      id: 'test-extension',
      getURL: (path) => `chrome-extension://test-extension/${path}`,
      onMessage: { addListener() {} },
      sendMessage: async () => undefined,
      lastError: null
    },
    storage: {
      local: {
        async get(key) { return read(key); },
        async set(values) {
          Object.assign(data, values);
          listeners.changed.forEach((listener) => listener(values, 'local'));
        },
        async remove(key) {
          const keys = Array.isArray(key) ? key : [key];
          keys.forEach((name) => { delete data[name]; });
        },
        async clear() { Object.keys(data).forEach((key) => { delete data[key]; }); }
      },
      session: {
        async get(key) { return read(key); },
        async set(values) { Object.assign(data, values); },
        async remove(key) { delete data[key]; }
      },
      onChanged: { addListener(listener) { listeners.changed.push(listener); } }
    },
    tabs: {
      async query() { return []; },
      async captureVisibleTab() { return 'data:image/png;base64,'; },
      async create() { return {}; },
      async update() { return {}; },
      onUpdated: { addListener() {} },
      onRemoved: { addListener() {} }
    },
    identity: {
      getRedirectURL: () => 'https://test-extension.chromiumapp.org/',
      launchWebAuthFlow: async () => ''
    },
    action: { onClicked: { addListener() {} } },
    windows: { create: async () => ({}), getCurrent: async () => ({ id: 1 }) }
  };
}

// A stand-in for the browser's page storage.
export function makeLocalStorage() {
  const items = new Map();
  return {
    getItem: (key) => (items.has(key) ? items.get(key) : null),
    setItem: (key, value) => { items.set(key, String(value)); },
    removeItem: (key) => { items.delete(key); },
    clear: () => items.clear(),
    key: (index) => [...items.keys()][index] ?? null,
    get length() { return items.size; },
    _items: items
  };
}

// --- loading the shipped code ------------------------------------------------

// The page and the extension APIs the code reaches for.
export function makeContext(extra = {}) {
  const document = {
    querySelector: () => makeElement(),
    querySelectorAll: () => [],
    getElementById: () => makeElement(),
    createElement: (tag) => makeElement(tag),
    createElementNS: (_ns, tag) => makeElement(tag),
    addEventListener() {},
    removeEventListener() {},
    body: makeElement('body'),
    documentElement: makeElement('html'),
    title: '',
    readyState: 'complete',
    visibilityState: 'visible',
    location: { href: 'chrome-extension://test-extension/popup.html', origin: 'chrome-extension://test-extension' }
  };

  const context = vm.createContext({
    document,
    console,
    chrome: makeChrome(),
    navigator: { mediaDevices: { getUserMedia: async () => { throw new Error('no camera'); } }, userAgent: 'test' },
    setTimeout: () => 0,
    clearTimeout() {},
    setInterval: () => 0,
    clearInterval() {},
    requestIdleCallback: () => 0,
    addEventListener() {},
    removeEventListener() {},
    matchMedia: () => ({ matches: false, addEventListener() {} }),
    getComputedStyle: () => ({ getPropertyValue: () => '' }),
    requestAnimationFrame: () => 0,
    cancelAnimationFrame() {},
    fetch: async () => { throw new Error('no network'); },
    URL,
    URLSearchParams,
    TextEncoder,
    TextDecoder,
    crypto: globalThis.crypto,
    atob: (value) => Buffer.from(value, 'base64').toString('binary'),
    btoa: (value) => Buffer.from(value, 'binary').toString('base64'),
    Blob: globalThis.Blob,
    ImageData: globalThis.ImageData,
    Uint8Array,
    Uint8ClampedArray,
    ArrayBuffer,
    File: globalThis.File,
    DataTransfer: globalThis.DataTransfer,
    localStorage: makeLocalStorage(),
    // The page loads these as scripts, so they are globals in the page.
    qrcode,
    jsQR,
    ...extra
  });

  // In a browser the window and the global object are the same thing, and
  // the scripts rely on that: one attaches itself to the window, the other
  // looks the other up on it.
  context.window = context;
  context.self = context;
  context.global = context;
  context.globalThis = context;
  context.location = document.location;
  return context;
}

export function loadIn(context, file) {
  const source = readFileSync(`${repoRoot}/${file}`, 'utf8');
  vm.runInContext(source, context, { filename: file });
  return context;
}

// Loads the page script and the Pro script together, the way the extension
// does, and hands back the context they live in.
export function loadExtension(extra = {}) {
  const context = makeContext(extra);
  loadIn(context, 'account-config.js');
  loadIn(context, 'popup.js');
  loadIn(context, 'pro.js');
  return context;
}
