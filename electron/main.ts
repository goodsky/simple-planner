import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import * as fs from 'fs/promises';
import type { PlannerData, PlannerEvent, PlannerTask } from '../src/types';

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

  // Remove the menu bar completely
  mainWindow.setMenu(null);

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
ipcMain.handle('read-planner-file', async (event, filePath: string) => {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const plannerData = parsePlannerFile(content);
    return plannerData;
  } catch (error) {
    throw new Error(`Failed to read planner file: ${error}`);
  }
});

ipcMain.handle('write-planner-file', async (event, filePath: string, data: PlannerData) => {
  try {
    const content = serializePlannerFile(data);
    await fs.writeFile(filePath, content, 'utf-8');
  } catch (error) {
    throw new Error(`Failed to write planner file: ${error}`);
  }
});

ipcMain.handle('check-file-exists', async (event, filePath: string) => {
  try {
    await fs.access(filePath);
    return true;
  } catch (error) {
    return false;
  }
});

// Helper functions for parsing planner files
function parsePlannerFile(content: string): PlannerData {
  const lines = content.split('\n').map((line) => line.trim());

  const data: PlannerData = {
    date: '',
    events: [],
    tasks: [],
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip empty lines
    if (!line) continue;

    // Parse date (first non-empty line, format: M/D/YYYY)
    if (!data.date && /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(line)) {
      data.date = line;
      continue;
    }

    // Parse events (format: HH:MMam/pm Description)
    const eventMatch = line.match(/^(\d{1,2}:\d{2}(?:am|pm))\s+(.+)$/i);
    if (eventMatch) {
      data.events.push({
        time: eventMatch[1],
        description: eventMatch[2],
      });
      continue;
    }

    // Parse tasks (format: - [ ] or - [x] Task text)
    const taskMatch = line.match(/^-\s+\[([ xX])\]\s+(.+)$/);
    if (taskMatch) {
      data.tasks.push({
        completed: taskMatch[1].toLowerCase() === 'x',
        text: taskMatch[2],
      });
      continue;
    }
  }

  return data;
}

function serializePlannerFile(data: PlannerData): string {
  const lines: string[] = [];

  // Add date
  if (data.date) {
    lines.push(data.date);
  }

  // Add events
  for (const event of data.events) {
    lines.push(`   ${event.time} ${event.description}`);
  }

  // Add tasks
  for (const task of data.tasks) {
    const checkbox = task.completed ? '[x]' : '[ ]';
    lines.push(`   - ${checkbox} ${task.text}`);
  }

  return lines.join('\n');
}

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
