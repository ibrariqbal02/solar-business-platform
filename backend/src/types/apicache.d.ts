declare module "apicache" {
  import type { RequestHandler } from "express";

  interface ApicacheOptions {
    statusCodes?: { include?: number[]; exclude?: number[] };
    headers?: Record<string, string>;
    debug?: boolean;
    enabled?: boolean;
    defaultDuration?: string | number;
    appendKey?: (req: any, res: any) => string;
    respectCacheControl?: boolean;
    redisClient?: any;
    trackPerformance?: boolean;
  }

  interface ApicacheInstance {
    middleware(duration: string | number): RequestHandler;
    options(opts: ApicacheOptions): ApicacheInstance;
    clear(target?: string): void;
    getIndex(): Record<string, any>;
    getPerformance(): any;
    newInstance(opts?: ApicacheOptions): ApicacheInstance;
    clone(): ApicacheInstance;
  }

  const instance: ApicacheInstance;
  export = instance;
}
