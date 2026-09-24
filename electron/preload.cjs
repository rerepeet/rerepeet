const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('signalRoom',{ask:(request)=>ipcRenderer.invoke('gemini:ask',request),getSettings:()=>ipcRenderer.invoke('settings:read'),saveSettings:(settings)=>ipcRenderer.invoke('settings:save',settings)});
