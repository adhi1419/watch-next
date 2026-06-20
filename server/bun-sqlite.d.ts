// Minimal type declarations for bun:sqlite
declare module "bun:sqlite" {
  export class Database {
    constructor(path: string);
    run(sql: string, params?: any[]): void;
    query(sql: string): Statement;
    prepare(sql: string): Statement;
    transaction<T extends (...args: any[]) => any>(fn: T): T;
  }

  interface Statement {
    all(...params: any[]): any[];
    get(...params: any[]): any;
    run(...params: any[]): void;
  }
}
