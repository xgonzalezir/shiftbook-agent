declare module "@sap/cds" {
  export interface Request {
    data: any;
    error: (code: number, message: string) => void;
  }

  export interface Service {
    before: (
      event: string,
      entity: string,
      handler: (req: Request) => void | Promise<void>
    ) => void;
    on: (action: string, handler: (req: Request) => any | Promise<any>) => void;
    after: (
      event: string,
      entity: string,
      handler: (results: any, req: Request) => void | Promise<void>
    ) => void;
  }

  export const ql: {
    SELECT: any;
    INSERT: any;
    UPDATE: any;
    DELETE: any;
  };

  export const service: {
    impl: (fn: () => void | Promise<void>) => any;
  };

  const cds: any;
  export = cds;
}
