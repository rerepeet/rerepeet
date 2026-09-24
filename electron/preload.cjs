const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('rerepeet',{
  ask:(request)=>ipcRenderer.invoke('ai:ask',request),
  getSettings:()=>ipcRenderer.invoke('settings:read'),
  saveSettings:(settings)=>ipcRenderer.invoke('settings:save',settings),
});
