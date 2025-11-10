export interface PlannerEvent {
  time: string;
  description: string;
}

export interface PlannerTask {
  text: string;
  completed: boolean;
}

export interface PlannerData {
  date: string; // Format: M/D/YYYY
  events: PlannerEvent[];
  tasks: PlannerTask[];
}

declare global {
  interface Window {
    electronAPI: {
      readPlannerFile: (filePath: string) => Promise<PlannerData>;
      writePlannerFile: (filePath: string, data: PlannerData) => Promise<void>;
      checkFileExists: (filePath: string) => Promise<boolean>;
      selectFolder: () => Promise<string | null>;
      getSetting: (key: string) => Promise<any>;
      setSetting: (key: string, value: any) => Promise<void>;
    };
  }
}

export {};
