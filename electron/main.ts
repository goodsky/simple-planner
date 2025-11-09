import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import * as fs from 'fs/promises';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
process.env.APP_ROOT = path.join(__dirname, '..');

export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron');
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist');
export const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;

const indexHtml = path.join(RENDERER_DIST, 'index.html');
const preload = path.join(MAIN_DIST, 'preload.mjs');

// Settings file path
const settingsPath = path.join(app.getPath('userData'), 'settings.json');

// Helper functions for settings
async function loadSettings(): Promise<Record<string, any>> {
  try {
    const data = await fs.readFile(settingsPath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return {};
  }
}

async function saveSettings(settings: Record<string, any>): Promise<void> {
  await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
}

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    title: "Skyler's Simple Planner",
    width: 800,
    height: 600,
    webPreferences: {
      preload,
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Load from Vite dev server in development, or built files in production
  if (VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(indexHtml);
  }

  console.log('Main window created');

  // Log when page loads
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('Page loaded successfully');
  });

  // Log any errors
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.log('Failed to load:', errorCode, errorDescription);
  });
}

app.on('ready', () => {
  createWindow();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC handlers for file operations
ipcMain.handle('read-file', async (event, filePath: string) => {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return content;
  } catch (error) {
    throw new Error(`Failed to read file: ${error}`);
  }
});

ipcMain.handle('write-file', async (event, filePath: string, content: string) => {
  try {
    await fs.writeFile(filePath, content, 'utf-8');
  } catch (error) {
    throw new Error(`Failed to write file: ${error}`);
  }
});

// IPC handler for selecting a folder
ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory'],
  });

  if (!result.canceled && result.filePaths.length > 0) {
    const selectedPath = result.filePaths[0];
    const settings = await loadSettings();
    settings.workingDirectory = selectedPath;
    await saveSettings(settings);
    return selectedPath;
  }

  return null;
});

// IPC handler for getting settings
ipcMain.handle('get-setting', async (event, key: string) => {
  const settings = await loadSettings();
  return settings[key];
});

// IPC handler for saving settings
ipcMain.handle('set-setting', async (event, key: string, value: any) => {
  const settings = await loadSettings();
  settings[key] = value;
  await saveSettings(settings);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
