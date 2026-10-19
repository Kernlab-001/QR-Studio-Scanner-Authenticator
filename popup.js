'use strict';

const STORAGE = {
  accounts: 'authenticatorAccounts',
  history: 'qrStudioHistory',
  historyEnabled: 'qrStudioHistoryEnabled'
};

const state = {
  view: 'scan',
  intent: 'general',
  source: 'camera',
  stream: null,
  scanTimer: null,
  scanSession: 0,
  scanInFlight: false,
  startingCamera: false,
  nativeDetector: undefined,
  selectedDeviceId: '',
  accounts: [],
  history: [],
  historyEnabled: false,
  currentResult: null,
  codeCache: new Map(),
  accountUpdaters: new Map(),
  expandedAccounts: new Set(),
  creatorDrafts: {},
  generatedPayload: '',
  creatorTemplate: 'text',
  toastTimer: null
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const ui = {
  camera: $('#camera'),
  scanCanvas: $('#scanCanvas'),
  processCanvas: $('#processCanvas'),
  stage: $('#scannerStage'),
  stageEmpty: $('#stageEmpty'),
  stageTitle: $('#stageTitle'),
  stageHint: $('#stageHint'),
  pastePanel: $('#pastePanel'),
  pasteInput: $('#pasteInput'),
  sourceAction: $('#sourceAction'),
  stopCamera: $('#stopCamera'),
  openFullCamera: $('#openFullCamera'),
  imageInput: $('#imageInput'),
  cameraPicker: $('#cameraPicker'),
  cameraSelect: $('#cameraSelect'),
  scannerStatus: $('#scannerStatus'),
  resultCard: $('#resultCard'),
  resultType: $('#resultType'),
  resultLabel: $('#resultLabel'),
  resultDescription: $('#resultDescription'),
  resultValue: $('#resultValue'),
  resultActions: $('#resultActions'),
  vaultCount: $('#vaultCount'),
  accounts: $('#accounts'),
  vaultSearch: $('#vaultSearch'),
  clearVaultSearch: $('#clearVaultSearch'),
  manualForm: $('#manualForm'),
  manualUri: $('#manualUri'),
  manualIssuer: $('#manualIssuer'),
  manualName: $('#manualName'),
  manualSecret: $('#manualSecret'),
  manualType: $('#manualType'),
  manualAlgorithm: $('#manualAlgorithm'),
  manualDigits: $('#manualDigits'),
  manualPeriod: $('#manualPeriod'),
  manualCounter: $('#manualCounter'),
  counterField: $('#counterField'),
  manualWarning: $('#manualWarning'),
  importInput: $('#importInput'),
  historyEnabled: $('#historyEnabled'),
  historySearch: $('#historySearch'),
  historyList: $('#historyList'),
  createTemplate: $('#createTemplate'),
  creatorFields: $('#creatorFields'),
  generatedCard: $('#generatedCard'),
  createPlaceholder: $('#createPlaceholder'),
  createPlaceholderText: $('#createPlaceholderText'),
  generatedCanvas: $('#generatedCanvas'),
  generatedPayload: $('#generatedPayload'),
  toast: $('#toast')
};

// Chrome APIs exist only after this page is loaded as an unpacked extension.
// The fallback keeps the UI usable when popup.html is opened directly for preview.
const previewMemory = {};

function hasExtensionStorage() {
  return typeof chrome !== 'undefined' && Boolean(chrome.storage?.local);
}

async function storageGet(defaultValues) {
  if (hasExtensionStorage()) return chrome.storage.local.get(defaultValues);
  const values = { ...defaultValues };
  for (const [key, fallback] of Object.entries(defaultValues)) {
    try {
      const saved = localStorage.getItem(`qr-studio-preview:${key}`);
      values[key] = saved === null ? fallback : JSON.parse(saved);
    } catch {
      values[key] = key in previewMemory ? previewMemory[key] : fallback;
    }
  }
  return values;
}

async function storageSet(values) {
  if (hasExtensionStorage()) {
    await chrome.storage.local.set(values);
    return;
  }
  for (const [key, value] of Object.entries(values)) {
    previewMemory[key] = value;
    try { localStorage.setItem(`qr-studio-preview:${key}`, JSON.stringify(value)); } catch { /* Memory fallback is sufficient for preview mode. */ }
  }
}

function isExtensionPage() {
  return typeof chrome !== 'undefined' && Boolean(chrome.runtime?.id);
}

const creatorTemplates = {
  text: [
    { name: 'content', label: 'Text or data', type: 'textarea', placeholder: 'Any words, number, URL, or payload' }
  ],
  url: [
    { name: 'url', label: 'Website address', type: 'url', placeholder: 'https://example.com' }
  ],
  wifi: [
    { name: 'ssid', label: 'Wi‑Fi network name (SSID)', type: 'text', placeholder: 'My Wi‑Fi' },
    { name: 'password', label: 'Password', type: 'text', placeholder: 'Leave blank for open networks' },
    { name: 'encryption', label: 'Security', type: 'select', options: ['WPA', 'WEP', 'nopass'] },
    { name: 'hidden', label: 'Hidden network', type: 'checkbox' }
  ],
  email: [
    { name: 'email', label: 'Email address', type: 'email', placeholder: 'hello@example.com' },
    { name: 'subject', label: 'Subject', type: 'text', placeholder: 'Hello' },
    { name: 'body', label: 'Message', type: 'textarea', placeholder: 'Write your message' }
  ],
  sms: [
    { name: 'number', label: 'Phone number', type: 'tel', placeholder: '+1234567890' },
    { name: 'message', label: 'Message', type: 'textarea', placeholder: 'Write your message' }
  ],
  phone: [
    { name: 'number', label: 'Phone number', type: 'tel', placeholder: '+1234567890' }
  ],
  location: [
    { name: 'latitude', label: 'Latitude', type: 'text', placeholder: '28.6139', group: 'location' },
    { name: 'longitude', label: 'Longitude', type: 'text', placeholder: '77.2090', group: 'location' }
  ],
  contact: [
    { name: 'name', label: 'Full name', type: 'text', placeholder: 'Ada Lovelace' },
    { name: 'organization', label: 'Organization', type: 'text', placeholder: 'Example Company' },
    { name: 'phone', label: 'Phone', type: 'tel', placeholder: '+1234567890' },
    { name: 'email', label: 'Email', type: 'email', placeholder: 'ada@example.com' }
  ]
};

function generateId() {
  return crypto.randomUUID ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function showToast(message, type = 'success') {
  clearTimeout(state.toastTimer);
  ui.toast.textContent = message;
  ui.toast.classList.toggle('error', type === 'error');
  ui.toast.hidden = false;
  state.toastTimer = setTimeout(() => { ui.toast.hidden = true; }, 3400);
}

function setScannerStatus(text, kind = 'ready') {
  ui.scannerStatus.textContent = text;
  ui.scannerStatus.classList.toggle('scanning', kind === 'scanning');
  ui.scannerStatus.classList.toggle('error', kind === 'error');
}

function setView(view) {
  if (!['scan', 'vault', 'create', 'history'].includes(view)) return;
  stopCamera();
  state.view = view;
  $$('.main-tab').forEach((button) => {
    const active = button.dataset.view === view;
    button.classList.toggle('active', active);
    button.setAttribute('aria-selected', String(active));
  });
  $$('.view-panel').forEach((panel) => {
    const active = panel.dataset.panel === view;
    panel.hidden = !active;
    panel.classList.toggle('active', active);
  });
  if (view === 'vault') renderAccounts();
  if (view === 'history') renderHistory();
  if (view === 'create') renderCreatorFields();
}

function setIntent(intent) {
  state.intent = intent === 'auth' ? 'auth' : 'general';
  $$('.intent-button').forEach((button) => button.classList.toggle('active', button.dataset.intent === state.intent));
}

function sourceLabels(source) {
  return {
    camera: { button: 'Start camera', title: 'Camera scanner ready', hint: 'Start the camera and place a QR code inside the frame.' },
    image: { button: 'Choose an image', title: 'Image scanner ready', hint: 'Choose or drag an image that contains a QR code.' },
    tab: { button: 'Scan current tab', title: 'Scan this tab', hint: 'The visible part of the current tab will be scanned locally.' },
    paste: { button: 'Decode pasted content', title: 'Paste QR content', hint: 'Paste text, a URL, or a full authenticator setup URI.' }
  }[source];
}

function setSource(source) {
  if (!['camera', 'image', 'tab', 'paste'].includes(source)) return;
  stopCamera();
  state.source = source;
  const label = sourceLabels(source);
  $$('.source-tab').forEach((button) => {
    const active = button.dataset.source === source;
    button.classList.toggle('active', active);
    button.setAttribute('aria-selected', String(active));
  });
  ui.cameraPicker.hidden = true;
  ui.pastePanel.hidden = source !== 'paste';
  ui.stageEmpty.hidden = source === 'paste';
  ui.scanCanvas.hidden = true;
  ui.camera.hidden = true;
  ui.stageTitle.textContent = label.title;
  ui.stageHint.textContent = label.hint;
  ui.sourceAction.textContent = label.button;
  ui.sourceAction.hidden = source === 'paste';
  ui.openFullCamera.hidden = source !== 'camera';
  ui.stopCamera.hidden = true;
  setScannerStatus('Ready');
  if (source === 'camera') refreshCameraDevices();
}

function showScanPreview(source) {
  const { width, height } = sourceSize(source);
  if (!width || !height) return;
  const scale = Math.min(1, 1400 / Math.max(width, height));
  ui.scanCanvas.width = Math.max(1, Math.round(width * scale));
  ui.scanCanvas.height = Math.max(1, Math.round(height * scale));
  const context = ui.scanCanvas.getContext('2d');
  context.drawImage(source, 0, 0, ui.scanCanvas.width, ui.scanCanvas.height);
  ui.scanCanvas.hidden = false;
  ui.camera.hidden = true;
  ui.stageEmpty.hidden = true;
}

function sourceSize(source) {
  if (source instanceof HTMLVideoElement) return { width: source.videoWidth, height: source.videoHeight };
  return { width: source.naturalWidth || source.width || 0, height: source.naturalHeight || source.height || 0 };
}

async function getNativeDetector() {
  if (state.nativeDetector !== undefined) return state.nativeDetector;
  if (!('BarcodeDetector' in window)) {
    state.nativeDetector = null;
    return null;
  }
  try {
    if (typeof BarcodeDetector.getSupportedFormats === 'function') {
      const formats = await BarcodeDetector.getSupportedFormats();
      if (!formats.includes('qr_code')) {
        state.nativeDetector = null;
        return null;
      }
    }
    state.nativeDetector = new BarcodeDetector({ formats: ['qr_code'] });
  } catch (error) {
    console.info('Native QR detector unavailable; using bundled local decoder.', error);
    state.nativeDetector = null;
  }
  return state.nativeDetector;
}

function drawToProcessingCanvas(source) {
  const { width, height } = sourceSize(source);
  if (!width || !height) return false;
  const maxDimension = 1400;
  const scale = Math.min(1, maxDimension / Math.max(width, height));
  const targetWidth = Math.max(1, Math.round(width * scale));
  const targetHeight = Math.max(1, Math.round(height * scale));
  ui.processCanvas.width = targetWidth;
  ui.processCanvas.height = targetHeight;
  const context = ui.processCanvas.getContext('2d', { willReadFrequently: true });
  context.clearRect(0, 0, targetWidth, targetHeight);
  context.drawImage(source, 0, 0, targetWidth, targetHeight);
  return true;
}

async function decodeSource(source) {
  const nativeDetector = await getNativeDetector();
  if (nativeDetector) {
    try {
      const codes = await nativeDetector.detect(source);
      if (codes.length) return codes.map((code) => code.rawValue).filter(Boolean);
    } catch (error) {
      console.info('Native QR detector failed; using bundled local decoder.', error);
      state.nativeDetector = null;
    }
  }
  if (typeof window.jsQR !== 'function') throw new Error('The bundled QR decoder did not load. Reload the extension from chrome://extensions.');
  if (!drawToProcessingCanvas(source)) return [];
  const context = ui.processCanvas.getContext('2d', { willReadFrequently: true });
  const image = context.getImageData(0, 0, ui.processCanvas.width, ui.processCanvas.height);
  const code = window.jsQR(image.data, image.width, image.height, { inversionAttempts: 'attemptBoth' });
  return code?.data ? [code.data] : [];
}

async function refreshCameraDevices() {
  if (!navigator.mediaDevices?.enumerateDevices) return;
  try {
    const devices = (await navigator.mediaDevices.enumerateDevices()).filter((device) => device.kind === 'videoinput');
    const priorValue = state.selectedDeviceId || ui.cameraSelect.value;
    ui.cameraSelect.replaceChildren();
    if (!devices.length) {
      const option = new Option('Default camera', '');
      ui.cameraSelect.add(option);
      ui.cameraPicker.hidden = true;
      return;
    }
    devices.forEach((device, index) => ui.cameraSelect.add(new Option(device.label || `Camera ${index + 1}`, device.deviceId)));
    const selected = devices.some((device) => device.deviceId === priorValue) ? priorValue : devices[0].deviceId;
    state.selectedDeviceId = selected;
    ui.cameraSelect.value = selected;
    ui.cameraPicker.hidden = devices.length < 2;
  } catch (error) {
    console.warn('Could not list cameras.', error);
  }
}

async function startCamera() {
  if (state.stream || state.startingCamera) return;
  if (!navigator.mediaDevices?.getUserMedia) {
    setScannerStatus('Camera unsupported', 'error');
    showResult({ type: 'CAMERA', label: 'Camera unavailable', description: 'This browser cannot provide a camera to the extension. You can still scan an image, the current tab, or pasted QR content.', value: '', actions: [] });
    return;
  }
  state.startingCamera = true;
  setScannerStatus('Starting…', 'scanning');
  ui.sourceAction.disabled = true;
  try {
    const video = state.selectedDeviceId
      ? { deviceId: { ideal: state.selectedDeviceId }, facingMode: { ideal: 'environment' } }
      : { facingMode: { ideal: 'environment' } };
    state.stream = await navigator.mediaDevices.getUserMedia({ video, audio: false });
    ui.camera.srcObject = state.stream;
    await ui.camera.play();
    ui.camera.hidden = false;
    ui.scanCanvas.hidden = true;
    ui.stageEmpty.hidden = true;
    ui.stage.classList.add('is-live');
    ui.stage.classList.remove('is-locked');
    ui.stopCamera.hidden = false;
    ui.sourceAction.textContent = 'Scanning…';
    await refreshCameraDevices();
    setScannerStatus('Scanning', 'scanning');
    const session = ++state.scanSession;
    scheduleCameraScan(session);
  } catch (error) {
    stopCamera();
    setScannerStatus('Camera unavailable', 'error');
    showResult({
      type: 'CAMERA',
      label: 'Camera unavailable',
      description: 'Allow camera access in Chrome, choose another camera, or use Image / Tab / Paste instead. The QR decoder itself works locally on this Chrome version.',
      value: error.message || 'Camera access was not granted.',
      actions: [
        { label: 'Open full camera scanner', onClick: openFullCameraPage },
        { label: 'Choose image', onClick: () => setSource('image') }
      ]
    });
  } finally {
    state.startingCamera = false;
    ui.sourceAction.disabled = false;
  }
}

function scheduleCameraScan(session) {
  clearTimeout(state.scanTimer);
  state.scanTimer = setTimeout(() => scanCameraFrame(session), 260);
}

async function scanCameraFrame(session) {
  if (session !== state.scanSession || !state.stream || state.scanInFlight) return;
  if (ui.camera.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
    scheduleCameraScan(session);
    return;
  }
  state.scanInFlight = true;
  try {
    const values = await decodeSource(ui.camera);
    if (values.length) {
      await handleScannedValue(values[0], { source: 'camera' });
      return;
    }
  } catch (error) {
    console.warn('Camera frame could not be decoded.', error);
  } finally {
    state.scanInFlight = false;
  }
  if (session === state.scanSession && state.stream) scheduleCameraScan(session);
}

function stopCamera() {
  state.scanSession += 1;
  clearTimeout(state.scanTimer);
  state.scanTimer = null;
  if (state.stream) state.stream.getTracks().forEach((track) => track.stop());
  state.stream = null;
  ui.camera.srcObject = null;
  ui.camera.hidden = true;
  ui.stopCamera.hidden = true;
  ui.sourceAction.disabled = false;
  ui.stage.classList.remove('is-live', 'is-locked');
  const label = sourceLabels(state.source);
  if (label) ui.sourceAction.textContent = label.button;
  if (state.source !== 'paste') ui.stageEmpty.hidden = false;
  if (state.view === 'scan') setScannerStatus('Ready');
}

async function scanImageFile(file) {
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    showToast('Choose an image file that contains a QR code.', 'error');
    return;
  }
  stopCamera();
  setScannerStatus('Scanning image…', 'scanning');
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    try {
      showScanPreview(bitmap);
      const values = await decodeSource(bitmap);
      if (!values.length) {
        showResult({ type: 'NO QR', label: 'No QR code found', description: 'Try a clearer image with the entire QR code visible, well-lit, and not too small.', value: '', actions: [] });
        setScannerStatus('No QR found', 'error');
      } else {
        await handleScannedValue(values[0], { source: 'image' });
      }
    } finally {
      bitmap.close?.();
    }
  } catch (error) {
    setScannerStatus('Image failed', 'error');
    showResult({ type: 'IMAGE', label: 'Could not scan that image', description: 'Try another image or a screenshot where the QR code is larger and sharper.', value: error.message || '', actions: [] });
  } finally {
    ui.imageInput.value = '';
  }
}

async function scanCurrentTab() {
  stopCamera();
  if (typeof chrome === 'undefined' || !chrome.tabs?.captureVisibleTab) {
    setScannerStatus('Extension only', 'error');
    showResult({ type: 'TAB', label: 'Current-tab scanning needs the installed extension', description: 'Image, camera, and pasted QR scanning work in this preview page. To scan the current tab, load this folder from chrome://extensions and open QR Studio from the toolbar.', value: '', actions: [] });
    return;
  }
  setScannerStatus('Scanning tab…', 'scanning');
  try {
    const dataUrl = await chrome.tabs.captureVisibleTab(undefined, { format: 'png' });
    const response = await fetch(dataUrl);
    const bitmap = await createImageBitmap(await response.blob());
    try {
      showScanPreview(bitmap);
      const values = await decodeSource(bitmap);
      if (!values.length) {
        showResult({ type: 'NO QR', label: 'No QR code found on this tab', description: 'Only the visible part of the page is scanned. Scroll the QR code fully into view and try again.', value: '', actions: [] });
        setScannerStatus('No QR found', 'error');
      } else {
        await handleScannedValue(values[0], { source: 'current tab' });
      }
    } finally {
      bitmap.close?.();
    }
  } catch (error) {
    setScannerStatus('Tab unavailable', 'error');
    showResult({ type: 'TAB', label: 'Could not scan this tab', description: 'Open the QR code in a normal web page, click the extension again, then choose Current tab.', value: error.message || '', actions: [] });
  }
}

async function decodePastedContent() {
  const raw = ui.pasteInput.value.trim();
  if (!raw) {
    showToast('Paste QR content first.', 'error');
    return;
  }
  await handleScannedValue(raw, { source: 'pasted text' });
}

function runSourceAction() {
  if (state.source === 'camera') return startCamera();
  if (state.source === 'image') return ui.imageInput.click();
  if (state.source === 'tab') return scanCurrentTab();
  return decodePastedContent();
}

function openFullCameraPage() {
  const url = isExtensionPage()
    ? chrome.runtime.getURL('popup.html?camera=1')
    : new URL('popup.html?camera=1', window.location.href).href;
  try {
    if (typeof chrome !== 'undefined' && chrome.tabs?.create) {
      chrome.tabs.create({ url });
      return;
    }
  } catch (error) {
    console.warn('Could not open the extension camera tab.', error);
  }
  window.open(url, '_blank', 'noopener');
}

function safeDecodeURIComponent(value) {
  try { return decodeURIComponent(value); } catch { return value; }
}

function strictNumber(value, name, { fallback, min, max } = {}) {
  if (value === null || value === undefined || value === '') return fallback;
  const raw = String(value).trim();
  if (!/^\d+$/.test(raw)) throw new Error(`${name} must be a whole number.`);
  const number = Number(raw);
  if (!Number.isSafeInteger(number) || number < min || number > max) throw new Error(`${name} must be between ${min} and ${max}.`);
  return number;
}

function normaliseSecret(value) {
  const secret = String(value || '').replace(/[=\s-]/g, '').toUpperCase();
  if (!secret || /[^A-Z2-7]/.test(secret)) throw new Error('The authenticator secret must be valid Base32 data.');
  const bytes = base32ToBytes(secret);
  if (!bytes.length) throw new Error('The authenticator secret is empty.');
  return secret;
}

function base32ToBytes(value) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const cleaned = String(value).replace(/[=\s-]/g, '').toUpperCase();
  let bits = 0;
  let buffer = 0;
  const bytes = [];
  for (const character of cleaned) {
    const index = alphabet.indexOf(character);
    if (index < 0) throw new Error('The saved secret is not valid Base32 data.');
    buffer = (buffer << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((buffer >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return new Uint8Array(bytes);
}

function normaliseAccount(input, { keepId = false } = {}) {
  const type = String(input.type || 'totp').toLowerCase();
  if (!['totp', 'hotp'].includes(type)) throw new Error('Authenticator type must be TOTP or HOTP.');
  const algorithm = String(input.algorithm || 'SHA1').toUpperCase();
  if (!['SHA1', 'SHA256', 'SHA512'].includes(algorithm)) throw new Error('Unsupported authenticator algorithm.');
  const issuer = String(input.issuer || 'Authenticator').trim() || 'Authenticator';
  const accountName = String(input.accountName || input.name || issuer).trim() || issuer;
  const secret = normaliseSecret(input.secret);
  const digits = strictNumber(input.digits, 'Digits', { fallback: 6, min: 4, max: 10 });
  const period = strictNumber(input.period, 'Period', { fallback: 30, min: 1, max: 86400 });
  const counter = type === 'hotp'
    ? strictNumber(input.counter, 'Counter', { fallback: 0, min: 0, max: Number.MAX_SAFE_INTEGER })
    : undefined;
  return {
    id: keepId && typeof input.id === 'string' ? input.id : generateId(),
    type,
    secret,
    issuer,
    accountName,
    digits,
    period,
    algorithm,
    counter,
    favorite: Boolean(input.favorite),
    addedAt: Number.isSafeInteger(input.addedAt) ? input.addedAt : Date.now(),
    issuerMismatch: Boolean(input.issuerMismatch)
  };
}

function parseOtpAuth(rawValue) {
  let url;
  try { url = new URL(rawValue); } catch { throw new Error('This is not a valid authenticator setup URI.'); }
  const type = url.hostname.toLowerCase();
  if (url.protocol !== 'otpauth:' || !['totp', 'hotp'].includes(type)) {
    throw new Error('This QR is not a standard TOTP or HOTP authenticator setup.');
  }
  if (type === 'hotp' && !url.searchParams.has('counter')) {
    throw new Error('This HOTP setup URI is missing its required counter.');
  }
  const pathLabel = safeDecodeURIComponent(url.pathname.replace(/^\//, ''));
  const splitAt = pathLabel.indexOf(':');
  const labelIssuer = splitAt >= 0 ? pathLabel.slice(0, splitAt).trim() : '';
  const labelAccount = splitAt >= 0 ? pathLabel.slice(splitAt + 1).trim() : pathLabel.trim();
  const issuerParameter = (url.searchParams.get('issuer') || '').trim();
  const issuer = issuerParameter || labelIssuer || 'Authenticator';
  const accountName = labelAccount || pathLabel || issuer;
  const account = normaliseAccount({
    type,
    secret: url.searchParams.get('secret'),
    issuer,
    accountName,
    digits: url.searchParams.get('digits'),
    period: url.searchParams.get('period'),
    algorithm: url.searchParams.get('algorithm'),
    counter: url.searchParams.get('counter'),
    issuerMismatch: Boolean(issuerParameter && labelIssuer && issuerParameter !== labelIssuer)
  });
  return account;
}

function redactOtpUri(rawValue) {
  return String(rawValue).replace(/([?&]secret=)[^&]*/i, '$1••••');
}

function isIpHost(hostname) {
  return /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname) || hostname.includes(':');
}

function parseWifiPayload(rawValue) {
  const values = {};
  let key = '';
  let value = '';
  let readingKey = true;
  let escaped = false;
  const payload = rawValue.slice(5);
  for (const character of payload) {
    if (escaped) {
      if (readingKey) key += character;
      else value += character;
      escaped = false;
      continue;
    }
    if (character === '\\') { escaped = true; continue; }
    if (readingKey && character === ':') { readingKey = false; continue; }
    if (!readingKey && character === ';') { if (key) values[key] = value; key = ''; value = ''; readingKey = true; continue; }
    if (readingKey) key += character;
    else value += character;
  }
  if (key) values[key] = value;
  return values;
}

function classifyPayload(rawValue) {
  const raw = String(rawValue);
  const trimmed = raw.trim();
  if (/^otpauth:\/\//i.test(trimmed)) return { kind: 'authenticator', type: 'AUTHENTICATOR', label: 'Authenticator setup', description: 'This QR contains a 2FA secret. It is not stored in scan history.', value: redactOtpUri(raw) };
  if (/^WIFI:/i.test(trimmed)) {
    const wifi = parseWifiPayload(trimmed);
    return { kind: 'wifi', type: 'WI‑FI', label: wifi.S ? `Wi‑Fi: ${wifi.S}` : 'Wi‑Fi connection', description: 'This QR contains Wi‑Fi connection data. Review it before joining any network.', value: raw };
  }
  if (/^BEGIN:VCARD/i.test(trimmed) || /^MECARD:/i.test(trimmed)) return { kind: 'contact', type: 'CONTACT', label: 'Contact card', description: 'This QR contains contact information.', value: raw };
  if (/^BEGIN:VEVENT/i.test(trimmed)) return { kind: 'calendar', type: 'CALENDAR', label: 'Calendar event', description: 'This QR contains calendar event information.', value: raw };
  if (/^(geo):/i.test(trimmed)) return { kind: 'location', type: 'LOCATION', label: 'Map location', description: 'This QR contains geographic coordinates.', value: raw };
  if (/^(tel):/i.test(trimmed)) return { kind: 'phone', type: 'PHONE', label: 'Phone number', description: 'This QR opens a phone number. Nothing will happen until you choose an action.', value: raw };
  if (/^(sms|smsto):/i.test(trimmed)) return { kind: 'sms', type: 'SMS', label: 'SMS message', description: 'This QR contains an SMS destination or draft message.', value: raw };
  if (/^(mailto):/i.test(trimmed)) return { kind: 'email', type: 'EMAIL', label: 'Email draft', description: 'This QR contains an email recipient or pre-filled message.', value: raw };
  try {
    const url = new URL(trimmed);
    if (['https:', 'http:'].includes(url.protocol)) {
      const caution = url.protocol === 'http:' || url.hostname.startsWith('xn--') || isIpHost(url.hostname);
      return {
        kind: 'url',
        type: caution ? 'LINK · CHECK' : 'WEBSITE',
        label: url.hostname || 'Website link',
        description: caution ? 'Review this link carefully before opening it: it uses HTTP, an IP address, or a non-standard internationalized domain.' : 'This QR opens a website. It will only open when you press the button.',
        value: raw,
        url: url.href
      };
    }
  } catch { /* It is text or an unsupported URI scheme; retain it exactly. */ }
  return { kind: 'text', type: 'TEXT', label: 'Text or data', description: 'The exact content below was read from the QR code.', value: raw };
}

const EMPTY_ILLUSTRATION = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="3.5"/><path d="M8 8.5h3v3H8zM13 8.5h3v3h-3zM8 13.5h3v3H8zM13 13.5h2.5M13 16.5h3"/></svg>';

function buildEmptyState(message) {
  const wrapper = document.createElement('div');
  wrapper.className = 'empty-state';
  wrapper.insertAdjacentHTML('afterbegin', EMPTY_ILLUSTRATION);
  const text = document.createElement('span');
  text.textContent = message;
  wrapper.append(text);
  return wrapper;
}

function action(label, onClick, kind = 'action') {
  return { label, onClick, kind };
}

function showResult({ type, label, description, value, actions = [] }) {
  ui.resultCard.hidden = false;
  ui.resultType.textContent = type;
  ui.resultLabel.textContent = label;
  ui.resultDescription.textContent = description;
  ui.resultValue.textContent = value;
  ui.resultActions.replaceChildren();
  actions.forEach((item) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = item.kind === 'copy' ? 'copy-button' : 'action-button';
    button.textContent = item.label;
    button.addEventListener('click', item.onClick);
    ui.resultActions.append(button);
  });
  ui.resultActions.hidden = actions.length === 0;
}

function openExternal(url) {
  try {
    chrome.tabs.create({ url }).catch(() => window.open(url, '_blank', 'noopener,noreferrer'));
  } catch {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

async function handleScannedValue(rawValue, { source = 'scanner' } = {}) {
  const raw = String(rawValue || '').trim();
  if (!raw || state.scanInFlight && state.currentResult?.raw === raw) return;
  stopCamera();
  const result = classifyPayload(raw);
  state.currentResult = { raw, ...result, source, scannedAt: Date.now() };
  ui.stage.classList.add('is-locked');

  if (result.kind === 'authenticator') {
    try {
      const account = parseOtpAuth(raw);
      const warning = account.issuerMismatch ? '\nIssuer in the label differs from issuer in the URI; review it before saving.' : '';
      showResult({
        type: 'AUTHENTICATOR',
        label: `${account.issuer} · ${account.accountName}`,
        description: `${account.type.toUpperCase()} · ${account.algorithm} · ${account.digits} digits${account.type === 'totp' ? ` · ${account.period}s` : ` · counter ${account.counter}`}${warning}`,
        value: redactOtpUri(raw),
        actions: [action('Review & import', () => reviewAccount(account))]
      });
      setScannerStatus('Setup found');
    } catch (error) {
      showResult({ type: 'AUTH QR', label: 'Authenticator data needs review', description: error.message, value: redactOtpUri(raw), actions: [action('Paste & edit manually', () => { setView('vault'); openManualForm(); ui.manualUri.value = raw; })] });
      setScannerStatus('Needs review', 'error');
    }
    return;
  }

  if (state.intent === 'auth') {
    showResult({
      type: result.type,
      label: 'This is not an authenticator setup QR',
      description: 'Authenticator QR codes start with otpauth://. This is still valid general QR content and is shown exactly below.',
      value: result.value,
      actions: [action('Use as General QR', () => { setIntent('general'); presentGeneralResult(result, raw); })]
    });
    setScannerStatus('Not a setup QR', 'error');
    return;
  }

  presentGeneralResult(result, raw);
  await saveHistoryEntry({ raw, source, result });
  setScannerStatus('Decoded');
}

function presentGeneralResult(result, raw) {
  const actions = [action('Copy content', () => copyText(raw), 'copy')];
  if (result.kind === 'url') actions.unshift(action('Open website', () => openExternal(result.url)));
  if (result.kind === 'email' || result.kind === 'phone' || result.kind === 'sms') actions.unshift(action('Open safely', () => openExternal(raw)));
  if (result.kind === 'location') {
    const coordinates = raw.replace(/^geo:/i, '').split('?')[0];
    actions.unshift(action('Open map', () => openExternal(`https://www.google.com/maps?q=${encodeURIComponent(coordinates)}`)));
  }
  showResult({ type: result.type, label: result.label, description: result.description, value: result.value, actions });
}

async function copyText(value) {
  try {
    await navigator.clipboard.writeText(value);
    showToast('Copied to clipboard.');
  } catch {
    const area = document.createElement('textarea');
    area.value = value;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.append(area);
    area.select();
    const copied = document.execCommand('copy');
    area.remove();
    if (copied) showToast('Copied to clipboard.');
    else showToast('Chrome blocked clipboard access. Try again from the result text.', 'error');
  }
}

async function saveHistoryEntry({ raw, source, result }) {
  if (!state.historyEnabled || result.kind === 'authenticator') return;
  const existingIndex = state.history.findIndex((entry) => entry.raw === raw);
  const entry = {
    id: existingIndex >= 0 ? state.history[existingIndex].id : generateId(),
    raw,
    kind: result.kind,
    type: result.type,
    title: result.label,
    source,
    savedAt: Date.now()
  };
  if (existingIndex >= 0) state.history.splice(existingIndex, 1);
  state.history.unshift(entry);
  state.history = state.history.slice(0, 100);
  await storageSet({ [STORAGE.history]: state.history });
  if (state.view === 'history') renderHistory();
}

function reviewAccount(account) {
  setView('vault');
  openManualForm();
  fillManualForm(account);
  ui.manualWarning.textContent = account.issuerMismatch ? 'Issuer names differ between the URI label and the issuer field. Confirm the correct issuer before saving.' : 'Review the fields below, then explicitly save the authenticator.';
}

function openManualForm() {
  ui.manualForm.hidden = false;
  ui.manualUri.focus();
}

function closeManualForm() {
  ui.manualForm.hidden = true;
  ui.manualWarning.textContent = '';
}

function fillManualForm(account) {
  ui.manualIssuer.value = account.issuer;
  ui.manualName.value = account.accountName;
  ui.manualSecret.value = account.secret;
  ui.manualType.value = account.type;
  ui.manualAlgorithm.value = account.algorithm;
  ui.manualDigits.value = account.digits;
  ui.manualPeriod.value = account.period;
  ui.manualCounter.value = account.counter ?? 0;
  updateCounterVisibility();
}

function updateCounterVisibility() {
  ui.counterField.hidden = ui.manualType.value !== 'hotp';
}

function parseManualUri() {
  try {
    const account = parseOtpAuth(ui.manualUri.value.trim());
    fillManualForm(account);
    ui.manualWarning.textContent = account.issuerMismatch ? 'Issuer names differ in this setup URI. Review them before saving.' : 'Setup URI parsed locally. Review and save when ready.';
  } catch (error) {
    ui.manualWarning.textContent = error.message;
  }
}

async function saveManualAccount() {
  try {
    const account = normaliseAccount({
      type: ui.manualType.value,
      secret: ui.manualSecret.value,
      issuer: ui.manualIssuer.value,
      accountName: ui.manualName.value,
      algorithm: ui.manualAlgorithm.value,
      digits: ui.manualDigits.value,
      period: ui.manualPeriod.value,
      counter: ui.manualCounter.value
    });
    const duplicate = state.accounts.find((item) => item.secret === account.secret && item.issuer === account.issuer && item.accountName === account.accountName);
    if (duplicate) {
      if (!confirm(`An authenticator for ${account.issuer} already exists. Replace it with these settings?`)) return;
      account.id = duplicate.id;
      account.addedAt = duplicate.addedAt;
      account.favorite = duplicate.favorite;
      state.accounts = state.accounts.map((item) => item.id === duplicate.id ? account : item);
    } else {
      state.accounts.push(account);
    }
    await saveAccounts();
    closeManualForm();
    ui.manualUri.value = '';
    ui.manualSecret.value = '';
    renderAccounts();
    showToast(duplicate ? 'Authenticator updated.' : 'Authenticator saved locally.');
  } catch (error) {
    ui.manualWarning.textContent = error.message;
  }
}

function otpCounter(account, now = Date.now()) {
  return account.type === 'hotp' ? account.counter : Math.floor(now / 1000 / account.period);
}

async function generateOtp(account, now = Date.now()) {
  const counter = otpCounter(account, now);
  const counterBuffer = new ArrayBuffer(8);
  const counterView = new DataView(counterBuffer);
  counterView.setUint32(0, Math.floor(counter / 0x100000000));
  counterView.setUint32(4, counter >>> 0);
  const hashName = `SHA-${account.algorithm.replace('SHA', '')}`;
  const key = await crypto.subtle.importKey('raw', base32ToBytes(account.secret), { name: 'HMAC', hash: hashName }, false, ['sign']);
  const hash = new Uint8Array(await crypto.subtle.sign('HMAC', key, counterBuffer));
  const offset = hash[hash.length - 1] & 15;
  const binary = ((hash[offset] & 0x7f) << 24) | (hash[offset + 1] << 16) | (hash[offset + 2] << 8) | hash[offset + 3];
  return String(binary % (10 ** account.digits)).padStart(account.digits, '0');
}

function remainingSeconds(account) {
  const seconds = Math.floor(Date.now() / 1000);
  return account.period - (seconds % account.period);
}

function formatOtp(code) {
  if (code.length === 6) return `${code.slice(0, 3)} ${code.slice(3)}`;
  if (code.length === 8) return `${code.slice(0, 4)} ${code.slice(4)}`;
  return code;
}

async function updateAccountCode(account, codeElement, timeElement) {
  const counter = otpCounter(account);
  try {
    let cached = state.codeCache.get(account.id);
    if (!cached || cached.counter !== counter) {
      cached = { counter, code: await generateOtp(account) };
      state.codeCache.set(account.id, cached);
    }
    codeElement.textContent = formatOtp(cached.code);
    timeElement.textContent = account.type === 'hotp' ? `Counter ${account.counter}` : `${remainingSeconds(account)}s remaining`;
  } catch (error) {
    codeElement.textContent = 'Error';
    timeElement.textContent = error.message;
  }
}

function createMiniButton(label, handler, className = '') {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `mini-button ${className}`.trim();
  button.textContent = label;
  button.addEventListener('click', handler);
  return button;
}

function renderAccounts() {
  state.accountUpdaters.clear();
  ui.accounts.replaceChildren();
  ui.vaultCount.textContent = state.accounts.length;
  const query = ui.vaultSearch.value.trim().toLowerCase();
  ui.clearVaultSearch.hidden = !query;
  const accounts = [...state.accounts]
    .filter((account) => !query || `${account.issuer} ${account.accountName}`.toLowerCase().includes(query))
    .sort((a, b) => Number(b.favorite) - Number(a.favorite) || a.issuer.localeCompare(b.issuer) || a.accountName.localeCompare(b.accountName));
  if (!accounts.length) {
    ui.accounts.append(buildEmptyState(
      state.accounts.length ? 'No authenticators match your search.' : 'No authenticators yet. Scan a setup QR or add one manually.'
    ));
    return;
  }
  accounts.forEach((account) => {
    const row = document.createElement('article');
    row.className = 'account';
    const avatar = document.createElement('div');
    avatar.className = 'account-avatar';
    avatar.textContent = (account.issuer || account.accountName).slice(0, 1).toUpperCase();
    const meta = document.createElement('div');
    meta.className = 'account-meta';
    const name = document.createElement('div');
    name.className = 'account-name';
    name.textContent = account.accountName;
    const issuer = document.createElement('div');
    issuer.className = 'account-issuer';
    issuer.textContent = `${account.issuer}${account.favorite ? ' · Favorite' : ''}`;
    meta.append(name, issuer);
    const codeBox = document.createElement('button');
    codeBox.type = 'button';
    codeBox.className = 'account-code';
    codeBox.title = 'Copy current code';
    const code = document.createElement('div');
    code.className = 'otp-code';
    const time = document.createElement('div');
    time.className = 'otp-time';
    codeBox.append(code, time);
    codeBox.addEventListener('click', () => {
      const cached = state.codeCache.get(account.id);
      if (cached?.code) copyText(cached.code);
    });
    const actions = document.createElement('div');
    actions.className = 'account-actions';
    actions.append(createMiniButton('Copy', () => {
      const cached = state.codeCache.get(account.id);
      if (cached?.code) copyText(cached.code);
    }));
    if (account.type === 'hotp') actions.append(createMiniButton('Advance counter', async () => {
      if (!confirm('Advance this HOTP counter only after the current code was accepted?')) return;
      account.counter += 1;
      state.codeCache.delete(account.id);
      await saveAccounts();
      renderAccounts();
      showToast('HOTP counter advanced.');
    }));
    actions.append(createMiniButton(state.expandedAccounts.has(account.id) ? 'Hide details' : 'Details', () => {
      if (state.expandedAccounts.has(account.id)) state.expandedAccounts.delete(account.id);
      else state.expandedAccounts.add(account.id);
      renderAccounts();
    }));
    actions.append(createMiniButton(account.favorite ? '★ Favorite' : '☆ Favorite', async () => {
      account.favorite = !account.favorite;
      await saveAccounts();
      renderAccounts();
    }, 'favorite'));
    actions.append(createMiniButton('Delete', async () => {
      if (!confirm(`Delete ${account.issuer} · ${account.accountName}? This cannot be undone unless you have a backup.`)) return;
      state.accounts = state.accounts.filter((item) => item.id !== account.id);
      state.codeCache.delete(account.id);
      await saveAccounts();
      renderAccounts();
      showToast('Authenticator deleted.');
    }, 'danger'));
    row.append(avatar, meta, codeBox, actions);
    if (state.expandedAccounts.has(account.id)) {
      const details = document.createElement('div');
      details.className = 'account-details';
      details.textContent = `${account.type.toUpperCase()} · ${account.algorithm} · ${account.digits} digits${account.type === 'totp' ? ` · refreshes every ${account.period}s` : ` · current counter ${account.counter}`}${account.issuerMismatch ? ' · issuer name mismatch in original URI' : ''}`;
      row.append(details);
    }
    ui.accounts.append(row);
    const update = () => updateAccountCode(account, code, time);
    update();
    state.accountUpdaters.set(account.id, update);
  });
}

async function saveAccounts() {
  const storedAccounts = state.accounts.map((account) => ({
    id: account.id,
    type: account.type,
    secret: account.secret,
    issuer: account.issuer,
    accountName: account.accountName,
    digits: account.digits,
    period: account.period,
    algorithm: account.algorithm,
    counter: account.counter,
    favorite: account.favorite,
    addedAt: account.addedAt,
    issuerMismatch: account.issuerMismatch
  }));
  await storageSet({ [STORAGE.accounts]: storedAccounts });
}

function renderHistory() {
  ui.historyList.replaceChildren();
  ui.historyEnabled.checked = state.historyEnabled;
  const query = ui.historySearch.value.trim().toLowerCase();
  const entries = state.history.filter((entry) => !query || `${entry.title} ${entry.raw}`.toLowerCase().includes(query));
  if (!entries.length) {
    ui.historyList.append(buildEmptyState(
      state.historyEnabled ? 'No general QR scans saved yet.' : 'History is off. Turn it on above to save future general QR scans locally.'
    ));
    return;
  }
  entries.forEach((entry) => {
    const item = document.createElement('article');
    item.className = 'history-item';
    const title = document.createElement('div');
    title.className = 'history-title';
    title.textContent = entry.title;
    const meta = document.createElement('div');
    meta.className = 'history-meta';
    meta.textContent = `${entry.type || entry.kind} · ${new Date(entry.savedAt).toLocaleString()}`;
    const raw = document.createElement('div');
    raw.className = 'history-raw';
    raw.textContent = entry.raw;
    const actions = document.createElement('div');
    actions.className = 'history-actions';
    actions.append(createMiniButton('View', () => {
      setView('scan');
      setIntent('general');
      const result = classifyPayload(entry.raw);
      state.currentResult = { raw: entry.raw, ...result, source: 'history' };
      presentGeneralResult(result, entry.raw);
      setScannerStatus('History item');
    }));
    actions.append(createMiniButton('Copy', () => copyText(entry.raw)));
    actions.append(createMiniButton('Delete', async () => {
      state.history = state.history.filter((itemEntry) => itemEntry.id !== entry.id);
      await storageSet({ [STORAGE.history]: state.history });
      renderHistory();
    }, 'danger'));
    item.append(title, meta, raw, actions);
    ui.historyList.append(item);
  });
}

function bytesToBase64(bytes) {
  let string = '';
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) string += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  return btoa(string);
}

function base64ToBytes(value) {
  const string = atob(value);
  return Uint8Array.from(string, (character) => character.charCodeAt(0));
}

async function deriveBackupKey(password, salt) {
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 210000, hash: 'SHA-256' }, material, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

async function exportVault() {
  if (!state.accounts.length) {
    showToast('There are no authenticators to back up.', 'error');
    return;
  }
  const password = prompt('Set a backup password. This password is not saved, so keep it somewhere safe.');
  if (!password) return;
  if (password.length < 8 && !confirm('This password is shorter than 8 characters. Create the encrypted backup anyway?')) return;
  try {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveBackupKey(password, salt);
    const data = new TextEncoder().encode(JSON.stringify({ accounts: state.accounts }));
    const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data));
    const backup = {
      format: 'qr-studio-encrypted-v1',
      createdAt: new Date().toISOString(),
      kdf: { name: 'PBKDF2', hash: 'SHA-256', iterations: 210000, salt: bytesToBase64(salt) },
      cipher: { name: 'AES-GCM', iv: bytesToBase64(iv), ciphertext: bytesToBase64(ciphertext) }
    };
    downloadBlob(new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }), `qr-studio-backup-${new Date().toISOString().slice(0, 10)}.json`);
    showToast('Encrypted backup downloaded. Keep its password safe.');
  } catch (error) {
    showToast(`Backup failed: ${error.message}`, 'error');
  }
}

async function importVaultFile(file) {
  if (!file) return;
  try {
    const backup = JSON.parse(await file.text());
    let data;
    if (backup.format === 'qr-studio-encrypted-v1') {
      const password = prompt('Enter the password for this encrypted QR Studio backup.');
      if (!password) return;
      const salt = base64ToBytes(backup.kdf?.salt || '');
      const iv = base64ToBytes(backup.cipher?.iv || '');
      const ciphertext = base64ToBytes(backup.cipher?.ciphertext || '');
      const key = await deriveBackupKey(password, salt);
      const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
      data = JSON.parse(new TextDecoder().decode(plaintext));
    } else if (Array.isArray(backup.accounts)) {
      if (!confirm('This backup is unencrypted. Continue importing it only if you trust its source.')) return;
      data = backup;
    } else {
      throw new Error('This is not a QR Studio authenticator backup.');
    }
    if (!Array.isArray(data.accounts)) throw new Error('The backup does not contain authenticator accounts.');
    const imported = [];
    const skipped = [];
    data.accounts.forEach((candidate) => {
      try { imported.push(normaliseAccount(candidate, { keepId: false })); } catch (error) { skipped.push(error.message); }
    });
    if (!imported.length) throw new Error(skipped[0] || 'No valid authenticators were found.');
    const fingerprints = new Set(state.accounts.map((account) => `${account.secret}|${account.issuer}|${account.accountName}`));
    const additions = imported.filter((account) => {
      const fingerprint = `${account.secret}|${account.issuer}|${account.accountName}`;
      if (fingerprints.has(fingerprint)) return false;
      fingerprints.add(fingerprint);
      return true;
    });
    if (!additions.length) throw new Error('Every authenticator from this backup is already in your vault.');
    state.accounts.push(...additions);
    await saveAccounts();
    renderAccounts();
    showToast(`Restored ${additions.length} authenticator${additions.length === 1 ? '' : 's'}${skipped.length ? `; skipped ${skipped.length} invalid item(s)` : ''}.`);
  } catch (error) {
    showToast(`Restore failed: ${error.message}`, 'error');
  } finally {
    ui.importInput.value = '';
  }
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function saveCreatorDraft(template = state.creatorTemplate) {
  state.creatorDrafts[template] = {};
  ui.creatorFields.querySelectorAll('[data-creator-field]').forEach((field) => {
    state.creatorDrafts[template][field.dataset.creatorField] = field.type === 'checkbox' ? field.checked : field.value;
  });
}

function makeCreatorField(descriptor, draft) {
  const label = document.createElement('label');
  label.textContent = descriptor.label;
  if (descriptor.type === 'checkbox') {
    label.className = 'check-label';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.dataset.creatorField = descriptor.name;
    input.checked = Boolean(draft[descriptor.name]);
    label.prepend(input);
    return label;
  }
  let field;
  if (descriptor.type === 'textarea') {
    field = document.createElement('textarea');
    field.rows = 4;
  } else if (descriptor.type === 'select') {
    field = document.createElement('select');
    descriptor.options.forEach((value) => field.add(new Option(value, value)));
  } else {
    field = document.createElement('input');
    field.type = descriptor.type || 'text';
  }
  field.dataset.creatorField = descriptor.name;
  field.placeholder = descriptor.placeholder || '';
  field.value = draft[descriptor.name] ?? '';
  label.append(field);
  return label;
}

function renderCreatorFields() {
  const template = ui.createTemplate.value;
  const descriptors = creatorTemplates[template] || creatorTemplates.text;
  const draft = state.creatorDrafts[template] || {};
  ui.creatorFields.replaceChildren();
  let locationGroup;
  descriptors.forEach((descriptor) => {
    const field = makeCreatorField(descriptor, draft);
    if (descriptor.group === 'location') {
      if (!locationGroup) {
        locationGroup = document.createElement('div');
        locationGroup.className = 'creator-inline';
        ui.creatorFields.append(locationGroup);
      }
      locationGroup.append(field);
    } else {
      ui.creatorFields.append(field);
    }
  });
}

function creatorValues() {
  const values = {};
  ui.creatorFields.querySelectorAll('[data-creator-field]').forEach((field) => {
    values[field.dataset.creatorField] = field.type === 'checkbox' ? field.checked : field.value.trim();
  });
  return values;
}

function wifiEscape(value) {
  return String(value).replace(/([\\;,:])/g, '\\$1');
}

function vcardEscape(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,');
}

function makeCreatorPayload() {
  const type = ui.createTemplate.value;
  const values = creatorValues();
  if (type === 'text') {
    if (!values.content) throw new Error('Enter text or data to encode.');
    return values.content;
  }
  if (type === 'url') {
    if (!values.url) throw new Error('Enter a website address.');
    const url = /^(https?:\/\/)/i.test(values.url) ? values.url : `https://${values.url}`;
    new URL(url);
    return url;
  }
  if (type === 'wifi') {
    if (!values.ssid) throw new Error('Enter the Wi‑Fi network name.');
    const security = values.encryption === 'nopass' ? 'nopass' : values.encryption || 'WPA';
    return `WIFI:T:${security};S:${wifiEscape(values.ssid)};P:${wifiEscape(values.password || '')};H:${values.hidden ? 'true' : 'false'};;`;
  }
  if (type === 'email') {
    if (!values.email) throw new Error('Enter an email address.');
    const parameters = new URLSearchParams();
    if (values.subject) parameters.set('subject', values.subject);
    if (values.body) parameters.set('body', values.body);
    return `mailto:${values.email}${parameters.toString() ? `?${parameters}` : ''}`;
  }
  if (type === 'sms') {
    if (!values.number) throw new Error('Enter a phone number.');
    return `SMSTO:${values.number}:${values.message || ''}`;
  }
  if (type === 'phone') {
    if (!values.number) throw new Error('Enter a phone number.');
    return `tel:${values.number}`;
  }
  if (type === 'location') {
    if (!values.latitude || !values.longitude || Number.isNaN(Number(values.latitude)) || Number.isNaN(Number(values.longitude))) throw new Error('Enter valid latitude and longitude values.');
    return `geo:${values.latitude},${values.longitude}`;
  }
  if (type === 'contact') {
    if (!values.name && !values.phone && !values.email) throw new Error('Add at least a name, phone number, or email address.');
    return ['BEGIN:VCARD', 'VERSION:3.0', values.name ? `FN:${vcardEscape(values.name)}` : '', values.organization ? `ORG:${vcardEscape(values.organization)}` : '', values.phone ? `TEL:${vcardEscape(values.phone)}` : '', values.email ? `EMAIL:${vcardEscape(values.email)}` : '', 'END:VCARD'].filter(Boolean).join('\n');
  }
  throw new Error('Unknown QR template.');
}

function generateQr({ silent = false } = {}) {
  try {
    const payload = makeCreatorPayload();
    if (typeof window.qrcode !== 'function') throw new Error('The bundled QR creator did not load. Reload the extension from chrome://extensions.');
    const qr = window.qrcode(0, 'M');
    qr.addData(payload);
    qr.make();
    const cells = qr.getModuleCount();
    const margin = 4;
    const scale = Math.max(5, Math.floor(300 / (cells + margin * 2)));
    const dimension = (cells + margin * 2) * scale;
    ui.generatedCanvas.width = dimension;
    ui.generatedCanvas.height = dimension;
    const context = ui.generatedCanvas.getContext('2d');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, dimension, dimension);
    context.fillStyle = '#090d1c';
    for (let row = 0; row < cells; row += 1) {
      for (let column = 0; column < cells; column += 1) {
        if (qr.isDark(row, column)) context.fillRect((column + margin) * scale, (row + margin) * scale, scale, scale);
      }
    }
    state.generatedPayload = payload;
    ui.generatedPayload.textContent = payload;
    ui.generatedCard.hidden = false;
    ui.createPlaceholder.hidden = true;
    ui.createPlaceholderText.textContent = 'Enter content above to preview QR';
    if (!silent) showToast('QR code generated locally.');
  } catch (error) {
    if (silent) {
      // Live preview: an incomplete draft is expected, so fall back to the
      // placeholder instead of raising an error.
      ui.generatedCard.hidden = true;
      ui.createPlaceholder.hidden = false;
      ui.createPlaceholderText.textContent = error.message;
      state.generatedPayload = '';
      return;
    }
    showToast(`Could not create QR code: ${error.message}`, 'error');
  }
}

// Live preview: regenerate as the user types, debounced so we do not redraw
// on every keystroke.
let liveQrTimer = null;
function scheduleLiveQr() {
  clearTimeout(liveQrTimer);
  liveQrTimer = setTimeout(() => generateQr({ silent: true }), 150);
}

function downloadGeneratedQr() {
  if (!state.generatedPayload) return;
  ui.generatedCanvas.toBlob((blob) => {
    if (blob) downloadBlob(blob, 'qr-studio-code.png');
  }, 'image/png');
}

async function clearHistory() {
  if (!state.history.length) return;
  if (!confirm('Delete all saved QR scan history from this device?')) return;
  state.history = [];
  await storageSet({ [STORAGE.history]: [] });
  renderHistory();
  showToast('Scan history cleared.');
}

async function loadState() {
  const stored = await storageGet({ [STORAGE.accounts]: [], [STORAGE.history]: [], [STORAGE.historyEnabled]: false });
  const migrated = [];
  for (const account of stored[STORAGE.accounts]) {
    try { migrated.push(normaliseAccount(account, { keepId: true })); } catch (error) { console.warn('Skipped invalid saved authenticator.', error); }
  }
  state.accounts = migrated;
  state.history = Array.isArray(stored[STORAGE.history]) ? stored[STORAGE.history].filter((entry) => entry && typeof entry.raw === 'string' && !/^otpauth:\/\//i.test(entry.raw)) : [];
  state.historyEnabled = Boolean(stored[STORAGE.historyEnabled]);
  if (migrated.length !== stored[STORAGE.accounts].length) await saveAccounts();
  renderAccounts();
  renderHistory();
}

function bindEvents() {
  $$('.main-tab').forEach((button) => button.addEventListener('click', () => setView(button.dataset.view)));
  // Keyboard shortcuts: 1-4 jump between the four sections.
  document.addEventListener('keydown', (event) => {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    const target = event.target;
    if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
    const views = { 1: 'scan', 2: 'vault', 3: 'create', 4: 'history' };
    const view = views[event.key];
    if (!view) return;
    event.preventDefault();
    setView(view);
  });
  $$('.intent-button').forEach((button) => button.addEventListener('click', () => setIntent(button.dataset.intent)));
  $$('.source-tab').forEach((button) => button.addEventListener('click', () => setSource(button.dataset.source)));
  ui.sourceAction.addEventListener('click', runSourceAction);
  ui.stopCamera.addEventListener('click', stopCamera);
  ui.openFullCamera.addEventListener('click', openFullCameraPage);
  ui.imageInput.addEventListener('change', (event) => scanImageFile(event.target.files[0]));
  $('#decodePaste').addEventListener('click', decodePastedContent);
  $('#refreshCameras').addEventListener('click', refreshCameraDevices);
  ui.cameraSelect.addEventListener('change', async () => {
    state.selectedDeviceId = ui.cameraSelect.value;
    if (state.stream) {
      stopCamera();
      await startCamera();
    }
  });
  ui.stage.addEventListener('dragover', (event) => { event.preventDefault(); ui.stage.classList.add('drag-over'); });
  ui.stage.addEventListener('dragleave', () => ui.stage.classList.remove('drag-over'));
  ui.stage.addEventListener('drop', (event) => {
    event.preventDefault();
    ui.stage.classList.remove('drag-over');
    const file = [...event.dataTransfer.files].find((candidate) => candidate.type.startsWith('image/'));
    if (file) scanImageFile(file);
    else showToast('Drop an image file containing a QR code.', 'error');
  });
  window.addEventListener('paste', (event) => {
    if (state.view !== 'scan') return;
    const image = [...event.clipboardData.files].find((file) => file.type.startsWith('image/'));
    if (image) {
      event.preventDefault();
      scanImageFile(image);
      return;
    }
    if (state.source === 'paste' && document.activeElement !== ui.pasteInput) {
      const text = event.clipboardData.getData('text/plain');
      if (text) ui.pasteInput.value = text;
    }
  });
  $('#scanAuthenticator').addEventListener('click', () => { setView('scan'); setIntent('auth'); setSource('camera'); });
  $('#showManualForm').addEventListener('click', openManualForm);
  $('#hideManualForm').addEventListener('click', closeManualForm);
  $('#parseManualUri').addEventListener('click', parseManualUri);
  $('#saveManualAccount').addEventListener('click', saveManualAccount);
  ui.manualType.addEventListener('change', updateCounterVisibility);
  ui.vaultSearch.addEventListener('input', renderAccounts);
  ui.clearVaultSearch.addEventListener('click', () => { ui.vaultSearch.value = ''; renderAccounts(); });
  $('#exportVault').addEventListener('click', exportVault);
  $('#importVault').addEventListener('click', () => ui.importInput.click());
  ui.importInput.addEventListener('change', (event) => importVaultFile(event.target.files[0]));
  ui.historyEnabled.addEventListener('change', async () => {
    state.historyEnabled = ui.historyEnabled.checked;
    await storageSet({ [STORAGE.historyEnabled]: state.historyEnabled });
    renderHistory();
    showToast(state.historyEnabled ? 'General QR scan history is now saved locally.' : 'New scans will no longer be saved to history.');
  });
  ui.historySearch.addEventListener('input', renderHistory);
  $('#clearHistory').addEventListener('click', clearHistory);
  ui.createTemplate.addEventListener('change', () => {
    saveCreatorDraft(state.creatorTemplate);
    state.creatorTemplate = ui.createTemplate.value;
    renderCreatorFields();
    scheduleLiveQr();
  });
  // Live preview is delegated from the document, because the creator fields
  // are rebuilt every time the Create tab is shown.
  document.addEventListener('input', (event) => {
    const target = event.target;
    if (target && typeof target.closest === 'function' && target.closest('#creatorFields')) scheduleLiveQr();
  });
  $('#generateQr').addEventListener('click', () => generateQr());
  $('#copyGenerated').addEventListener('click', () => state.generatedPayload && copyText(state.generatedPayload));
  $('#downloadGenerated').addEventListener('click', downloadGeneratedQr);
  window.addEventListener('unload', stopCamera);
}

setInterval(() => state.accountUpdaters.forEach((update) => update()), 1000);
bindEvents();
setSource('camera');
renderCreatorFields();
loadState().catch((error) => showToast(`Could not load saved data: ${error.message}`, 'error'));

if (new URLSearchParams(window.location.search).has('camera')) {
  document.body.classList.add('full-camera-page');
  setView('scan');
  setSource('camera');
}
