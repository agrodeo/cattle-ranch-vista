declare module 'dexie' {
  export type IndexableType = string | number | Date | ArrayBuffer | ArrayBufferView | DataView | IDBValidKey;

  export class Table<T = any, TKey = IndexableType, TInsertType = T> {
    add(item: TInsertType, key?: TKey): Promise<TKey>;
    put(item: TInsertType, key?: TKey): Promise<TKey>;
    bulkPut(items: TInsertType[]): Promise<any>;
    bulkAdd(items: TInsertType[]): Promise<any>;
    toArray(): Promise<T[]>;
    where(index: string): any;
    filter(fn: (item: T) => boolean): any;
    get(key: TKey): Promise<T | undefined>;
    update(key: TKey, changes: Partial<T>): Promise<number>;
    delete(key: TKey): Promise<void>;
    clear(): Promise<void>;
    count(): Promise<number>;
  }

  export class Dexie {
    constructor(name: string);
    version(versionNumber: number): {
      stores(schema: Record<string, string>): {
        upgrade(fn: (trans: any) => void | Promise<void>): Dexie;
      };
      upgrade(fn: (trans: any) => void | Promise<void>): Dexie;
    };
    table<T = any, TKey = IndexableType, TInsertType = T>(tableName: string): Table<T, TKey, TInsertType>;
    transaction(mode: 'r' | 'rw', tables: any | any[], scope: (...args: any[]) => any): Promise<any>;
    open(): Promise<void>;
    close(): void;
    delete(): Promise<void>;

    static delete(databaseName: string): Promise<void>;
  }

  export default Dexie;
}
