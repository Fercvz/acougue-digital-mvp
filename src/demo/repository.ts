import type { DatabaseState } from "../../shared/types";

export interface DemoData {
  state: DatabaseState;
  images: Record<string, string>;
}
export interface DemoRepository {
  read(): Promise<DemoData>;
  mutate<T>(update: (data: DemoData) => T): Promise<T>;
}

/** IndexedDB transactions serialize updates, including updates from other tabs. */
export class BrowserRepository implements DemoRepository {
  private database?: Promise<IDBDatabase>;
  constructor(
    private name: string,
    private initial: () => DemoData,
  ) {}

  private open() {
    if (!this.database) {
      this.database = new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(this.name, 1);
        request.onupgradeneeded = () =>
          request.result.createObjectStore("demo");
        request.onsuccess = () => {
          const db = request.result;
          db.onversionchange = () => {
            db.close();
            this.database = undefined;
          };
          resolve(db);
        };
        request.onerror = () => {
          this.database = undefined;
          reject(
            new Error(
              "Não foi possível abrir os dados locais. Permita o armazenamento deste site no navegador.",
            ),
          );
        };
      });
    }
    return this.database;
  }

  private async transaction<T>(
    mode: IDBTransactionMode,
    update: (data: DemoData) => T,
  ): Promise<T> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("demo", mode);
      const store = tx.objectStore("demo");
      const request = store.get("state");
      let result: T;
      let failure: unknown;
      request.onsuccess = () => {
        try {
          const data: DemoData = request.result || this.initial();
          result = update(data);
          if (mode === "readwrite") store.put(data, "state");
        } catch (error) {
          failure = error;
          tx.abort();
        }
      };
      tx.oncomplete = () => resolve(structuredClone(result));
      tx.onabort = () =>
        reject(
          failure ||
            new Error(
              "Não foi possível salvar a demonstração. Verifique o espaço disponível no navegador.",
            ),
        );
      tx.onerror = () => {
        /* The abort handler reports the failed transaction. */
      };
    });
  }
  read() {
    return this.transaction("readonly", (data) => data);
  }
  mutate<T>(update: (data: DemoData) => T) {
    return this.transaction("readwrite", update);
  }
}
