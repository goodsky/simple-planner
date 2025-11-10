import { contextBridge, ipcRenderer } from 'electron';
import type { PlannerData } from '../src/types';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  readPlannerFile: (filePath: string): Promise<PlannerData> => ipcRenderer.invoke('read-planner-file', filePath),

  writePlannerFile: (filePath: string, data: PlannerData): Promise<void> => ipcRenderer.invoke('write-planner-file', filePath, data),

  checkFileExists: (filePath: string): Promise<boolean> => ipcRenderer.invoke('check-file-exists', filePath),

  selectFolder: (): Promise<string | null> => ipcRenderer.invoke('select-folder'),

  getSetting: (key: string): Promise<any> => ipcRenderer.invoke('get-setting', key),

  setSetting: (key: string, value: any): Promise<void> => ipcRenderer.invoke('set-setting', key, value),
});
