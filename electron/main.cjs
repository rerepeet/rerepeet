const { app, BrowserWindow, ipcMain, shell, safeStorage } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const isDev = !app.isPackaged;
function createWindow() {
  const win = new BrowserWindow({ width:1420, height:900, minWidth:1040, minHeight:680, backgroundColor:'#f8faf6', titleBarStyle:'hiddenInset', webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true} });
  if (isDev) win.loadURL('http://127.0.0.1:5175'); else win.loadFile(path.join(__dirname,'..','dist','index.html'));
  win.webContents.setWindowOpenHandler(({url}) => { if(url.startsWith('https:')) shell.openExternal(url); return {action:'deny'}; });
}
app.whenReady().then(()=>{createWindow();app.on('activate',()=>{if(BrowserWindow.getAllWindows().length===0)createWindow();});});
app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit();});
const settingsFile = () => path.join(app.getPath('userData'), 'signal-room-settings.json');
function readSettings() {
  try {
    const raw = JSON.parse(fs.readFileSync(settingsFile(), 'utf8'));
    return { ...raw, apiKey: raw.apiKey && safeStorage.isEncryptionAvailable() ? safeStorage.decryptString(Buffer.from(raw.apiKey, 'base64')) : '' };
  } catch { return { apiKey:'', model:'gemini-2.0-flash', deviceId:'default', rememberKey:true }; }
}
function saveSettings(data) {
  const allowed = { model: String(data.model || 'gemini-2.0-flash'), deviceId: String(data.deviceId || 'default'), rememberKey: Boolean(data.rememberKey) };
  if (allowed.rememberKey && data.apiKey && safeStorage.isEncryptionAvailable()) allowed.apiKey = safeStorage.encryptString(String(data.apiKey)).toString('base64');
  fs.writeFileSync(settingsFile(), JSON.stringify(allowed), { mode: 0o600 });
  return { ...allowed, apiKey: data.apiKey || '' };
}
ipcMain.handle('settings:read', () => readSettings());
ipcMain.handle('settings:save', (_event, data) => saveSettings(data || {}));
ipcMain.handle('gemini:ask',async(_event,request)=>{
  const {apiKey,model,context,kind,text,transcript,audio}=request||{};
  if(!apiKey||typeof apiKey!=='string')throw new Error('A Gemini API key is required.');
  const safeModel=/^[a-zA-Z0-9._-]+$/.test(model||'')?model:'gemini-2.0-flash';
  const instruction='You are Signal Room, a concise copilot for explicitly permitted meetings, study sessions, and mock practice. Do not assist cheating, hidden surveillance, evading detection, or deceptive interview behavior. Give factual, useful notes. If input is audio, transcribe it faithfully, then provide a compact answer with a suggested next question when useful.';
  const contextText=`\nSession context:\n${context||'(none)'}\nRecent transcript:\n${(transcript||[]).join('\n')||'(none)'}`;
  const parts=kind==='audio'?[{text:`${instruction}${contextText}`},{inline_data:{mime_type:audio.mimeType||'audio/webm',data:audio.data}}]:[{text:`${instruction}${contextText}\n\nUser question/excerpt:\n${text||''}`}];
  const response=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${safeModel}:generateContent`,{method:'POST',headers:{'content-type':'application/json','x-goog-api-key':apiKey},body:JSON.stringify({contents:[{role:'user',parts}],generationConfig:{temperature:0.3,maxOutputTokens:500}})});
  const payload=await response.json(); if(!response.ok)throw new Error(payload?.error?.message||`Gemini returned ${response.status}.`);
  const answer=payload?.candidates?.[0]?.content?.parts?.map(p=>p.text||'').join('').trim();if(!answer)throw new Error('Gemini returned no text response.');
  if(kind==='audio'){const[first,...rest]=answer.split(/\n+/);return{transcript:first.replace(/^transcript\s*:?/i,'').trim(),answer:rest.join('\n').replace(/^answer\s*:?/i,'').trim()||answer};}return{answer};
});
