export type ToolModuleHandler = (request: any) => Promise<any>;

export type ToolModuleMethod = 'tools/list' | 'tools/call';

export interface ToolModuleServer {
  setRequestHandler(method: ToolModuleMethod, handler: ToolModuleHandler): void;
}
