export type Architecture = 'x64' | 'arm64' | 'x86';
export type InstallType = 'exe' | 'msi' | 'zip' | 'portable' | 'script';
export type AppActionType = 'app' | 'command' | 'folder';

export interface AppAction {
  name: string;
  type: AppActionType;
  path?: string;
  command?: string;
  arguments?: string;
  elevated?: boolean;
  startMenu?: boolean;
  ui?: boolean;
}

export interface AppManifest {
  id: string;
  name: string;
  description?: string;
  publisher?: string;
  homepage?: string;
  category: string;
  architectures?: Architecture[];
  dependencies?: string[];
  install: {
    type: InstallType;
    url: string;
    fileName?: string;
    silentArgs?: string;
    extractTo?: string;
    postInstall?: string[];
  };
  detection: {
    type: 'file' | 'registry' | 'command';
    value: string;
  };
  actions?: AppAction[];
}

export interface SandboxProfile {
  id: string;
  name: string;
  description?: string;
  sandbox: {
    memoryMB?: number;
    networking?: boolean;
    clipboard?: boolean;
    vGpu?: boolean;
    audioInput?: boolean;
    videoInput?: boolean;
    printerRedirection?: boolean;
    protectedClient?: boolean;
  };
  features?: Record<string, boolean>;
  apps: string[];
  mappedFolders?: Array<{
    hostFolder: string;
    sandboxFolder?: string;
    readOnly: boolean;
  }>;
}
