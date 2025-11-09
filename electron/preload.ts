import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  readFile: (filePath: string): Promise<string> => ipcRenderer.invoke('read-file', filePath),

  writeFile: (filePath: string, content: string): Promise<void> => ipcRenderer.invoke('write-file', filePath, content),

  selectFolder: (): Promise<string | null> => ipcRenderer.invoke('select-folder'),

  getSetting: (key: string): Promise<any> => ipcRenderer.invoke('get-setting', key),

  setSetting: (key: string, value: any): Promise<void> => ipcRenderer.invoke('set-setting', key, value),
});
