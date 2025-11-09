declare global {
  interface Window {
    electronAPI: {
      readFile: (filePath: string) => Promise<string>;
      writeFile: (filePath: string, content: string) => Promise<void>;
      selectFolder: () => Promise<string | null>;
      getSetting: (key: string) => Promise<any>;
      setSetting: (key: string, value: any) => Promise<void>;
    };
  }
}

export {};
