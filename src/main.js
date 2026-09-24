import './style.css';
import './rerepeet.css';
import byte from './assets/byte-logo.png';

const app = document.querySelector('#app');
const sessionsKey = 'rerepeet-sessions-v2';

const providers = {
  gemini: {
    name: 'Google Gemini', badge: 'GEMINI', model: 'gemini-2.0-flash', endpoint: '', needsKey: true, audio: true,
    keyLabel: 'Google AI Studio API key', hint: 'Native audio analysis with your Gemini key.'
  },
  groq: {
    name: 'Groq', badge: 'GROQ', model: 'openai/gpt-oss-20b', endpoint: 'https://api.groq.com/openai/v1', needsKey: true, audio: true,
    keyLabel: 'Groq API key', hint: 'Fast answers; audio is transcribed before the model responds.'
  },
  openrouter: {
    name: 'OpenRouter Free', badge: 'OR', model: 'openrouter/free', endpoint: 'https://openrouter.ai/api/v1', needsKey: true, audio: false,
    keyLabel: 'OpenRouter API key', hint: 'Routes to its currently available free-model pool.'
  },
  ollama: {
    name: 'Ollama (local)', badge: 'LOCAL', model: 'qwen3:8b', endpoint: 'http://127.0.0.1:11434/v1', needsKey: false, audio: false,
    keyLabel: 'No key required', hint: 'Runs a model on this computer through Ollama.'
  },
  lmstudio: {
    name: 'LM Studio (local)', badge: 'LOCAL', model: 'local-model', endpoint: 'http://127.0.0.1:1234/v1', needsKey: false, audio: false,
    keyLabel: 'No key required', hint: 'Connects to a locally running LM Studio server.'
  },
  opencode: {
    name: 'OpenCode (local)', badge: 'OPENCODE', model: '', endpoint: 'http://127.0.0.1:4096', needsKey: false, audio: false,
    keyLabel: 'Optional server password', hint: 'Connects to an OpenCode server running on this computer.'
  },
  custom: {
    name: 'Custom OpenAI-compatible', badge: 'CUSTOM', model: '', endpoint: '', needsKey: true, audio: false,
    keyLabel: 'Provider API key', hint: 'For a compatible chat-completions endpoint you control.'
  }
};

const state = {
  settings: null,
  screen: 'home',
  provider: 'gemini',
  apiKey: '',
  model: providers.gemini.model,
  endpoint: providers.gemini.endpoint,
  rememberKey: false,
  capture: null,
  chunks: [],
  isRecording: false,
  sessions: JSON.parse(localStorage.getItem(sessionsKey) || '[]'),
  messages: [],
  session: null,
  stream: null
};

function activeProvider() {
  return providers[state.provider];
}

function escapeHTML(value = '') {
  return String(value).replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;'
  }[character]));
}

function formatTime(value) {
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(value));
}

function cleanTranscript(value) {
  return String(value || '').replace(/^Transcript:\s*/i, '').trim();
}

function providerOptions(selected = state.provider) {
  return Object.entries(providers).map(([id, provider]) => `<option value="${id}" ${id === selected ? 'selected' : ''}>${provider.name}</option>`).join('');
}

function render() {
  if (!state.settings) {
    app.innerHTML = `<main class="loading-screen"><img src="${byte}" alt="" /><p>Starting Rerepeet…</p></main>`;
    return;
  }
  if (state.screen === 'setup') return renderSetup();
  if (state.screen === 'session') return renderSession();
  return renderHome();
}

function renderBrand(compact = false) {
  return `<div class="brand ${compact ? 'compact' : ''}"><img src="${byte}" alt="Byte, the Rerepeet computer mascot" /><span>rerepeet</span></div>`;
}

function renderHome() {
  const configured = Boolean(state.apiKey || !activeProvider().needsKey);
  const rows = state.sessions.slice(0, 6).map((session) => `<button class="session-card" data-open-session="${session.id}"><span class="session-kind">${escapeHTML(session.kind || 'conversation')}</span><strong>${escapeHTML(session.title)}</strong><small>${formatTime(session.createdAt)} · ${escapeHTML(session.provider || 'Gemini')}</small></button>`).join('');
  app.innerHTML = `
    <div class="app-shell">
      <aside class="rail">
        ${renderBrand(true)}
        <button class="rail-button active" aria-label="Sessions">◫</button>
        <button class="rail-button" id="openSetupRail" aria-label="Settings">⚙</button>
        <div class="rail-bottom"><button class="rail-button" id="openSetupBottom" aria-label="Settings">⚙</button></div>
      </aside>
      <main class="home-main">
        <header class="app-header"><div><h1>Sessions</h1><p>Consent-first, local desktop AI assistance.</p></div><div class="header-actions"><span class="provider-status ${configured ? 'ready' : ''}">${configured ? '● Ready' : '● Setup required'}</span><button class="primary" id="createSession">Create session <span>+</span></button></div></header>
        <section class="hero-card">
          <div class="hero-copy"><p class="eyebrow">YOUR DESKTOP COPILOT</p><h2>Clear notes and useful answers, on your terms.</h2><p>Rerepeet connects only to the AI provider you choose. Get explicit consent before recording, then keep your session history on this computer.</p><div class="hero-actions"><button class="dark-button" id="startFromHero">Start a session</button><button class="secondary" id="openSetupHero">Configure providers</button></div></div>
          <div class="byte-stage"><div class="signal-bars" aria-hidden="true">||||||||||||||||||||</div><img src="${byte}" alt="Byte computer mascot" /><p>Byte is ready</p></div>
        </section>
        <section class="provider-summary"><div><span class="eyebrow">CONNECTED PROVIDER</span><h3>${escapeHTML(activeProvider().name)}</h3><p>${escapeHTML(activeProvider().hint)}</p></div><button class="secondary" id="changeProvider">Change setup</button></section>
        <section class="sessions-section"><div class="section-heading"><h2>Recent sessions</h2><button class="text-button" id="clearHistory">Clear local history</button></div>${rows ? `<div class="session-grid">${rows}</div>` : `<div class="empty-state"><img src="${byte}" alt="" /><div><strong>No sessions yet</strong><p>Create a session to start a consent-first conversation.</p></div></div>`}</section>
      </main>
    </div>`;
  bindHome();
}

function renderSetup() {
  const provider = activeProvider();
  const keySection = provider.needsKey || state.provider === 'opencode' ? `<label class="field"><span>${provider.keyLabel}</span><input id="apiKey" type="password" autocomplete="off" placeholder="${provider.needsKey ? 'Paste your key' : 'Only if your OpenCode server requires one'}" value="${escapeHTML(state.apiKey)}" /><small>${provider.needsKey ? 'Sent directly from this desktop app to the provider. Never added to session history.' : 'Leave blank for a local server without authentication.'}</small></label>` : `<div class="local-note"><strong>No API key needed.</strong><span>Rerepeet will connect only to <code>${escapeHTML(state.endpoint)}</code> on this computer.</span></div>`;
  app.innerHTML = `
    <main class="setup-page">
      <header class="setup-topbar">${renderBrand()}<button class="secondary" id="backHome">Back to sessions</button></header>
      <div class="setup-layout">
        <aside class="setup-intro"><img src="${byte}" alt="Byte computer mascot" /><p class="eyebrow">SETUP</p><h1>Make Rerepeet yours.</h1><p>Choose a provider, test your audio hardware, and decide whether this device may remember your key.</p><div class="privacy-card"><strong>Built for consent.</strong><span>Rerepeet makes recording status visible and requires your confirmation before capture begins.</span></div></aside>
        <section class="setup-panel">
          <div class="panel-heading"><div><p class="eyebrow">CONNECTION</p><h2>AI provider</h2></div><span class="provider-pill">${escapeHTML(provider.badge)}</span></div>
          <div class="setup-form">
            <label class="field"><span>Provider</span><select id="providerSelect">${providerOptions()}</select><small>Use a cloud key, a free-tier route, or a model running locally.</small></label>
            <div class="provider-info"><strong>${escapeHTML(provider.name)}</strong><p>${escapeHTML(provider.hint)}</p><a href="#provider-notes">Read provider setup notes ↓</a></div>
            <label class="field"><span>${state.provider === 'opencode' ? 'OpenCode server URL' : state.provider === 'gemini' ? 'Model' : 'Model'}</span><input id="model" type="text" value="${escapeHTML(state.model)}" placeholder="${escapeHTML(provider.model || 'Configured by local server')}" /></label>
            ${state.provider === 'gemini' ? '' : `<label class="field"><span>Endpoint</span><input id="endpoint" type="url" value="${escapeHTML(state.endpoint)}" placeholder="${escapeHTML(provider.endpoint || 'https://your-provider.example/v1')}" /></label>`}
            ${keySection}
            <label class="checkbox-field"><input id="rememberKey" type="checkbox" ${state.rememberKey ? 'checked' : ''} ${!provider.needsKey ? 'disabled' : ''} /><span><strong>Remember key on this device</strong><small>Uses this operating system’s secure credential storage when available.</small></span></label>
          </div>
          <div class="audio-check"><div><p class="eyebrow">AUDIO SETUP</p><h3>Microphone check</h3><p id="meterLabel">Press test microphone to grant access and see the input level.</p></div><div class="meter"><i id="meterFill"></i></div><button class="secondary" id="testMic">Test microphone</button></div>
          <div class="setup-actions"><button class="secondary" id="resetSetup">Reset</button><button class="primary" id="saveSetup">Save & continue</button></div>
          <section id="provider-notes" class="provider-notes"><h3>Provider notes</h3><ul><li><strong>Gemini, Groq, and OpenRouter:</strong> create your own key with the provider; free tiers have quotas and availability limits.</li><li><strong>Ollama and LM Studio:</strong> local inference, no cloud key. Start their local server first.</li><li><strong>OpenCode:</strong> start <code>opencode serve</code>, then Rerepeet talks to its local server.</li><li><strong>Audio:</strong> Gemini supports native audio; Groq uses transcription first. Other connections accept typed prompts today.</li></ul></section>
        </section>
      </div>
    </main>`;
  bindSetup();
}

function renderSession() {
  const session = state.session || { id: crypto.randomUUID(), title: 'New session', createdAt: Date.now(), kind: 'conversation', provider: activeProvider().name };
  state.session = session;
  const messages = state.messages.map((message) => `<article class="message ${message.role}"><span>${message.role === 'assistant' ? 'BYTE' : 'YOU'}</span><p>${escapeHTML(message.text)}</p></article>`).join('');
  const canRecord = activeProvider().audio;
  app.innerHTML = `
    <main class="session-page">
      <header class="session-header">${renderBrand()}<div class="session-header-actions"><span class="provider-pill">${escapeHTML(activeProvider().badge)}</span><button class="secondary" id="endSession">End session</button></div></header>
      <div class="session-workspace">
        <section class="capture-pane"><div class="capture-visual"><div class="signal-orb ${state.isRecording ? 'recording' : ''}"><div class="signal-bars">||||||||||||||||||||</div><img src="${byte}" alt="Byte" /></div><h1>${state.isRecording ? 'Listening with consent…' : 'Ready when you are.'}</h1><p>${canRecord ? 'Use the microphone only when everyone involved has agreed to recording.' : `${activeProvider().name} currently accepts typed prompts in Rerepeet.`}</p></div><div class="capture-controls">${canRecord ? `<button class="${state.isRecording ? 'danger' : 'dark-button'}" id="toggleRecording">${state.isRecording ? 'Stop recording' : 'Record with consent'}</button>` : ''}<button class="secondary" id="clearTranscript">Clear</button></div><div class="consent-row"><input type="checkbox" id="consent" ${state.isRecording ? 'checked disabled' : ''}/><label for="consent">Everyone involved has agreed to this recording.</label></div></section>
        <section class="answer-pane"><div class="answer-heading"><div><p class="eyebrow">BYTE’S NOTES</p><h2>${escapeHTML(session.title)}</h2></div><span>${escapeHTML(activeProvider().name)}</span></div><div class="messages" id="messages">${messages || `<div class="answer-empty"><img src="${byte}" alt="" /><h3>No messages yet</h3><p>Ask Byte a question or record a consented note.</p></div>`}</div><form class="composer" id="composer"><textarea id="prompt" rows="3" placeholder="Type a message for Byte…"></textarea><button class="primary" type="submit">Ask Byte</button></form><p class="session-disclaimer">Rerepeet blocks requests for stealth, deception, unauthorized help, or recording without consent.</p></section>
      </div>
    </main>`;
  bindSession();
}

function bindHome() {
  const openSetup = () => { state.screen = 'setup'; render(); };
  ['openSetupRail', 'openSetupBottom', 'openSetupHero', 'changeProvider'].forEach((id) => document.getElementById(id)?.addEventListener('click', openSetup));
  ['createSession', 'startFromHero'].forEach((id) => document.getElementById(id)?.addEventListener('click', () => startSession()));
  document.getElementById('clearHistory')?.addEventListener('click', () => { state.sessions = []; localStorage.setItem(sessionsKey, '[]'); render(); });
  document.querySelectorAll('[data-open-session]').forEach((button) => button.addEventListener('click', () => {
    const session = state.sessions.find((item) => item.id === button.dataset.openSession);
    if (session) { state.session = session; state.messages = session.messages || []; state.screen = 'session'; render(); }
  }));
}

function bindSetup() {
  const readFields = () => {
    state.apiKey = document.getElementById('apiKey')?.value || '';
    state.model = document.getElementById('model')?.value || '';
    state.endpoint = document.getElementById('endpoint')?.value || activeProvider().endpoint;
    state.rememberKey = Boolean(document.getElementById('rememberKey')?.checked);
  };
  document.getElementById('backHome').addEventListener('click', () => { state.screen = 'home'; render(); });
  document.getElementById('providerSelect').addEventListener('change', (event) => {
    readFields(); state.provider = event.target.value; const next = activeProvider(); state.model = next.model; state.endpoint = next.endpoint; state.apiKey = ''; state.rememberKey = false; render();
  });
  document.getElementById('saveSetup').addEventListener('click', async () => {
    readFields();
    const hasRememberedKey = state.settings?.hasStoredKey && state.settings?.provider === state.provider;
    if (activeProvider().needsKey && !state.apiKey.trim() && !hasRememberedKey) return window.alert(`${activeProvider().keyLabel} is required for this connection.`);
    if (state.provider !== 'gemini' && !state.endpoint.trim()) return window.alert('Enter an endpoint for this provider.');
    try {
      const sessionKey = state.apiKey.trim();
      const saved = await window.rerepeet.saveSettings({ provider: state.provider, model: state.model.trim(), endpoint: state.endpoint.trim(), apiKey: sessionKey, rememberKey: state.rememberKey });
      state.settings = saved; state.apiKey = sessionKey; state.screen = 'home'; render();
    } catch (error) { window.alert(error.message || 'Could not save settings.'); }
  });
  document.getElementById('resetSetup').addEventListener('click', async () => {
    state.provider = 'gemini'; state.model = providers.gemini.model; state.endpoint = ''; state.apiKey = ''; state.rememberKey = false;
    state.settings = await window.rerepeet.saveSettings({ provider: 'gemini', model: providers.gemini.model, endpoint: '', apiKey: '', rememberKey: false }); render();
  });
  document.getElementById('testMic').addEventListener('click', testMicrophone);
}

function bindSession() {
  document.getElementById('endSession').addEventListener('click', () => finishSession());
  document.getElementById('clearTranscript').addEventListener('click', () => { state.messages = []; persistSession(); render(); });
  document.getElementById('toggleRecording')?.addEventListener('click', toggleRecording);
  document.getElementById('composer').addEventListener('submit', async (event) => {
    event.preventDefault(); const prompt = document.getElementById('prompt').value.trim(); if (!prompt) return; document.getElementById('prompt').value = ''; await askByte(prompt);
  });
}

function startSession() {
  const configured = state.settings?.hasStoredKey || !activeProvider().needsKey;
  if (!configured && !state.apiKey) { state.screen = 'setup'; render(); return; }
  state.session = { id: crypto.randomUUID(), title: 'New conversation', createdAt: Date.now(), kind: 'conversation', provider: activeProvider().name, messages: [] };
  state.messages = []; state.screen = 'session'; render();
}

function persistSession() {
  if (!state.session) return;
  state.session.messages = state.messages; state.session.provider = activeProvider().name;
  const oldIndex = state.sessions.findIndex((item) => item.id === state.session.id);
  if (oldIndex >= 0) state.sessions[oldIndex] = state.session; else state.sessions.unshift(state.session);
  state.sessions = state.sessions.slice(0, 40); localStorage.setItem(sessionsKey, JSON.stringify(state.sessions));
}

function finishSession() {
  if (state.isRecording) stopRecording(); persistSession(); state.screen = 'home'; render();
}

async function askByte(prompt, audioBase64 = null, mimeType = null) {
  const provider = activeProvider();
  if (audioBase64 && !provider.audio) return window.alert(`${provider.name} is currently configured for typed prompts only.`);
  state.messages.push({ role: 'user', text: prompt || 'Recorded consented audio' }); persistSession(); render();
  const messageBox = document.getElementById('messages');
  if (messageBox) messageBox.insertAdjacentHTML('beforeend', `<article class="message assistant pending"><span>BYTE</span><p>Thinking…</p></article>`);
  try {
    const result = await window.rerepeet.ask({
      provider: state.provider,
      model: state.model || provider.model,
      endpoint: state.endpoint || provider.endpoint,
      apiKey: state.apiKey,
      kind: audioBase64 ? 'audio' : 'text',
      text: prompt,
      audio: audioBase64 ? { data: audioBase64, mimeType } : undefined,
      transcript: state.messages.filter((message) => message.role === 'user').slice(-6).map((message) => message.text)
    });
    if (result.transcript) state.messages[state.messages.length - 1].text = cleanTranscript(result.transcript) || 'Recorded consented audio';
    state.messages.push({ role: 'assistant', text: result.answer });
  } catch (error) {
    state.messages.push({ role: 'assistant', text: `Connection note: ${error.message || 'Unable to reach this provider.'}` });
  }
  persistSession(); render();
}

async function testMicrophone() {
  const label = document.getElementById('meterLabel'); const fill = document.getElementById('meterFill');
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const context = new AudioContext(); const analyser = context.createAnalyser(); const source = context.createMediaStreamSource(stream); const data = new Uint8Array(analyser.frequencyBinCount); source.connect(analyser); label.textContent = 'Microphone connected. Speak normally to see the level.';
    let frames = 0;
    const tick = () => { analyser.getByteTimeDomainData(data); const loudness = data.reduce((total, value) => total + Math.abs(value - 128), 0) / data.length; fill.style.width = `${Math.min(100, 8 + loudness * 5)}%`; frames += 1; if (frames < 200) requestAnimationFrame(tick); else { stream.getTracks().forEach((track) => track.stop()); context.close(); label.textContent = 'Microphone check complete.'; } };
    tick();
  } catch (error) { label.textContent = 'Microphone access was not granted. Check your operating-system privacy settings and try again.'; }
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer); let binary = '';
  for (let index = 0; index < bytes.length; index += 0x8000) binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  return btoa(binary);
}

async function toggleRecording() {
  if (state.isRecording) return stopRecording();
  if (!document.getElementById('consent')?.checked) return window.alert('Confirm that everyone involved agreed before recording.');
  try {
    state.stream = await navigator.mediaDevices.getUserMedia({ audio: true }); state.chunks = [];
    state.capture = new MediaRecorder(state.stream, { mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : undefined });
    state.capture.ondataavailable = (event) => event.data.size && state.chunks.push(event.data);
    state.capture.onstop = async () => { const blob = new Blob(state.chunks, { type: state.capture.mimeType || 'audio/webm' }); const buffer = await blob.arrayBuffer(); const audioBase64 = arrayBufferToBase64(buffer); state.stream?.getTracks().forEach((track) => track.stop()); state.isRecording = false; await askByte('', audioBase64, blob.type); };
    state.capture.start(1000); state.isRecording = true; render();
  } catch (error) { window.alert('Rerepeet could not access the microphone. Check desktop privacy settings and try again.'); }
}

function stopRecording() { if (state.capture?.state === 'recording') state.capture.stop(); }

async function boot() {
  try {
    const saved = await window.rerepeet.getSettings();
    state.settings = saved; state.provider = providers[saved.provider] ? saved.provider : 'gemini'; state.model = saved.model || providers[state.provider].model; state.endpoint = saved.endpoint || providers[state.provider].endpoint; state.rememberKey = Boolean(saved.rememberKey);
    if (!saved.hasStoredKey && activeProvider().needsKey) state.screen = 'setup';
  } catch (error) { state.settings = {}; state.screen = 'setup'; }
  render();
}

boot();
