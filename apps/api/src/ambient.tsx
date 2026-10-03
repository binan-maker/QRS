declare module "compression" {
  function compression(options?: any): any;
  export = compression;
}

declare module "bullmq" {
  export type ConnectionOptions = Record<string, any>;
  export class Queue<T = any> {
    constructor(name: string, opts?: any);
    add(name: string, data: T, opts?: any): Promise<any>;
    close(): Promise<void>;
  }
  export class Worker<T = any> {
    constructor(name: string, processor: (job: { id?: string; data: T }) => Promise<any>, opts?: any);
    on(event: string, listener: (...args: any[]) => void): this;
    close(): Promise<void>;
  }
}
