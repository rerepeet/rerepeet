const { app, BrowserWindow, ipcMain, shell, safeStorage } = require('electron');
const path = require('node:path');
const fs = require('node:fs');

const isDev = !app.isPackaged;
const DEFAULTS = {
  provider: 'gemini',
  model: 'gemini-3.5-flash-lite',
  endpoint: '',
  deviceId: 'default',
  rememberKey: true,
};
const PROVIDERS = {
  gemini: { endpoint: 'https://generativelanguage.googleapis.com', needsKey: true },
  groq: { endpoint: 'https://api.groq.com/openai/v1', needsKey: true },
  openrouter: { endpoint: 'https://openrouter.ai/api/v1', needsKey: true },
  ollama: { endpoint: 'http://127.0.0.1:11434/v1', needsKey: false },
  lmstudio: { endpoint: 'http://127.0.0.1:1234/v1', needsKey: false },
  opencode: { endpoint: 'http://127.0.0.1:4096', needsKey: false },
  custom: { endpoint: '', needsKey: true },
};

function createWindow() {
  const win = new BrowserWindow({
    width: 1420,
    height: 900,
    minWidth: 720,
    minHeight: 180,
    backgroundColor: '#f8faf6',
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  if (isDev) win.loadURL('http://127.0.0.1:5175');
  else win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:')) shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('window:set-companion', (event, enabled) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return { enabled: false };
  if (enabled) {
    win.__rerepeetFullBounds = win.getBounds();
    win.setMinimumSize(720, 180);
    win.setSize(760, 208);
    win.setAlwaysOnTop(true, 'floating');
    return { enabled: true };
  }
  win.setAlwaysOnTop(false);
  win.setMinimumSize(1040, 680);
  if (win.__rerepeetFullBounds) win.setBounds(win.__rerepeetFullBounds);
  return { enabled: false };
});

const settingsFile = () => path.join(app.getPath('userData'), 'rerepeet-settings.json');
const asProvider = (value) => Object.hasOwn(PROVIDERS, value) ? value : DEFAULTS.provider;
const cleanModel = (value, fallback) => String(value || fallback).trim().slice(0, 160) || fallback;
const cleanEndpoint = (value) => {
  const endpoint = String(value || '').trim().replace(/\/+$/, '');
  if (!endpoint) return '';
  try {
    const parsed = new URL(endpoint);
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('invalid');
    return parsed.toString().replace(/\/+$/, '');
  } catch {
    throw new Error('Enter a complete http:// or https:// endpoint.');
  }
};

function readSettings() {
  try {
    const raw = JSON.parse(fs.readFileSync(settingsFile(), 'utf8'));
    const provider = asProvider(raw.provider);
    const encryptedKey = raw.apiKey && safeStorage.isEncryptionAvailable()
      ? safeStorage.decryptString(Buffer.from(raw.apiKey, 'base64'))
      : '';
    return {
      ...DEFAULTS,
      provider,
      model: cleanModel(raw.model, DEFAULTS.model),
      endpoint: cleanEndpoint(raw.endpoint || ''),
      deviceId: String(raw.deviceId || DEFAULTS.deviceId),
      rememberKey: Boolean(raw.rememberKey),
      apiKey: encryptedKey,
    };
  } catch {
    return { ...DEFAULTS, apiKey: '' };
  }
}

function saveSettings(data) {
  const provider = asProvider(data.provider);
  const current = readSettings();
  const allowed = {
    provider,
    model: cleanModel(data.model, DEFAULTS.model),
    endpoint: cleanEndpoint(data.endpoint || ''),
    deviceId: String(data.deviceId || DEFAULTS.deviceId),
    rememberKey: Boolean(data.rememberKey),
  };
  const keyToStore = String(data.apiKey || '') || (allowed.rememberKey && current.provider === provider ? current.apiKey : '');
  if (allowed.rememberKey && keyToStore && safeStorage.isEncryptionAvailable()) {
    allowed.apiKey = safeStorage.encryptString(keyToStore).toString('base64');
  }
  fs.writeFileSync(settingsFile(), JSON.stringify(allowed), { mode: 0o600 });
  return publicSettings({ ...allowed, apiKey: keyToStore });
}

function publicSettings(settings = readSettings()) {
  const { apiKey, ...safe } = settings;
  return { ...safe, hasStoredKey: Boolean(apiKey) };
}

function instruction() {
  return [
    'You are Rerepeet, a concise assistant for explicitly permitted meetings, study sessions, and mock practice.',
    'Do not help with cheating, hidden surveillance, evading detection, deceptive interview behavior, or other consent violations.',
    'Do not access files, invoke tools, execute commands, or modify data.',
    'Give factual, useful notes and an optional next question when useful.',
  ].join(' ');
}

function buildPrompt(request, transcriptOverride = '') {
  const recent = transcriptOverride || (request.transcript || []).join('\n') || '(none)';
  return [
    instruction(),
    request.language ? `Reply in ${String(request.language).slice(0, 40)}.` : '',
    request.autoNotes ? 'When useful, format the response as short, clearly labeled notes. Do not speak or act for the user.' : '',
    '',
    'Session context:',
    request.context || '(none)',
    '',
    'Recent transcript:',
    recent,
    '',
    'User question or excerpt:',
    request.text || '(none)',
  ].join('\n');
}

async function checkedJson(response, label) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error?.message || payload?.message || label + ' returned ' + response.status + '.');
  return payload;
}

async function askGemini(request) {
  const apiKey = String(request.apiKey || '');
  if (!apiKey) throw new Error('A Gemini API key is required.');
  const enteredModel = cleanModel(request.model, DEFAULTS.model);
  const aliases = {
    '3.5-flash-lite': 'gemini-3.5-flash-lite',
    'gemini-2.0-flash': 'gemini-3.5-flash-lite',
  };
  const model = aliases[enteredModel.toLowerCase().replace(/\s+/g, '-')] || enteredModel.replace(/[^a-zA-Z0-9._-]/g, '');
  const context = buildPrompt(request);
  const parts = request.kind === 'audio'
    ? [{ text: context }, { inline_data: { mime_type: request.audio?.mimeType || 'audio/webm', data: request.audio?.data || '' } }]
    : [{ text: context }];
  const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({ contents: [{ role: 'user', parts }], generationConfig: { temperature: 0.3, maxOutputTokens: 500 } }),
  });
  const payload = await checkedJson(response, 'Gemini');
  const answer = payload?.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('').trim();
  if (!answer) throw new Error('Gemini returned no text response.');
  return request.kind === 'audio' ? splitAudioAnswer(answer) : { answer };
}

async function transcribeGroq(apiKey, audio) {
  const form = new FormData();
  const bytes = Buffer.from(String(audio?.data || ''), 'base64');
  form.append('file', new Blob([bytes], { type: audio?.mimeType || 'audio/webm' }), 'rerepeet-audio.webm');
  form.append('model', 'whisper-large-v3-turbo');
  form.append('response_format', 'json');
  const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: { authorization: 'Bearer ' + apiKey },
    body: form,
  });
  const payload = await checkedJson(response, 'Groq transcription');
  if (!payload?.text) throw new Error('Groq returned no transcript.');
  return payload.text;
}

async function askOpenAICompatible(request, endpoint) {
  const provider = asProvider(request.provider);
  if (request.kind === 'audio') {
    if (provider !== 'groq') throw new Error('This provider is text-only in Rerepeet. Switch to Gemini or Groq for microphone capture.');
    const transcript = await transcribeGroq(String(request.apiKey || ''), request.audio);
    const withTranscript = { ...request, kind: 'text', text: transcript, transcript: [...(request.transcript || []), transcript] };
    const result = await askOpenAICompatible(withTranscript, endpoint);
    return { transcript, answer: result.answer };
  }
  const apiKey = String(request.apiKey || '');
  if (PROVIDERS[provider].needsKey && !apiKey) throw new Error('An API key is required for this provider.');
  const response = await fetch(endpoint + '/chat/completions', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(apiKey ? { authorization: 'Bearer ' + apiKey } : {}),
      ...(provider === 'openrouter' ? { 'HTTP-Referer': 'https://github.com/rerepeet/rerepeet', 'X-Title': 'Rerepeet' } : {}),
    },
    body: JSON.stringify({
      model: cleanModel(request.model, 'openrouter/free'),
      messages: [{ role: 'user', content: buildPrompt(request) }],
      temperature: 0.3,
      max_tokens: 500,
    }),
  });
  const payload = await checkedJson(response, provider);
  const content = payload?.choices?.[0]?.message?.content;
  const answer = typeof content === 'string'
    ? content.trim()
    : Array.isArray(content) ? content.map((part) => part.text || '').join('').trim() : '';
  if (!answer) throw new Error(provider + ' returned no text response.');
  return { answer };
}

async function askOpenCode(request, endpoint) {
  if (request.kind === 'audio') throw new Error('OpenCode is text-only in Rerepeet. Use Gemini or Groq for microphone capture.');
  const headers = { 'content-type': 'application/json' };
  if (request.apiKey) headers.authorization = 'Bearer ' + String(request.apiKey);
  const sessionResponse = await fetch(endpoint + '/session', {
    method: 'POST',
    headers,
    body: JSON.stringify({ title: 'Rerepeet advisory request' }),
  });
  const session = await checkedJson(sessionResponse, 'OpenCode');
  if (!session?.id) throw new Error('OpenCode did not create a local session.');
  const messageResponse = await fetch(endpoint + '/session/' + encodeURIComponent(session.id) + '/message', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      parts: [{ type: 'text', text: buildPrompt(request) }],
      system: instruction(),
      tools: {},
    }),
  });
  const payload = await checkedJson(messageResponse, 'OpenCode');
  const answer = (payload?.parts || []).filter((part) => part?.type === 'text').map((part) => part.text || '').join('\n').trim();
  if (!answer) throw new Error('OpenCode returned no text response.');
  return { answer };
}

function splitAudioAnswer(answer) {
  const lines = answer.split(/\n+/);
  const transcript = (lines.shift() || '').replace(/^transcript\s*:?/i, '').trim();
  const suggestion = lines.join('\n').replace(/^answer\s*:?/i, '').trim() || answer;
  return { transcript, answer: suggestion };
}

ipcMain.handle('settings:read', () => publicSettings());
ipcMain.handle('settings:save', (_event, data) => saveSettings(data || {}));
ipcMain.handle('ai:ask', async (_event, request = {}) => {
  const provider = asProvider(request.provider);
  const endpoint = cleanEndpoint(request.endpoint || PROVIDERS[provider].endpoint);
  const saved = readSettings();
  const apiKey = String(request.apiKey || (saved.provider === provider ? saved.apiKey : ''));
  const normalized = { ...request, provider, apiKey };
  if (provider === 'gemini') return askGemini(normalized);
  if (provider === 'opencode') return askOpenCode(normalized, endpoint);
  return askOpenAICompatible(normalized, endpoint);
});
