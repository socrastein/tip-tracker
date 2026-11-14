/**
 * A tiny in-memory stand-in for the browser's IndexedDB, covering only what
 * the celebration stores use: open with an upgrade step, one object store
 * with get, getAll, put and delete, and transactions that complete asynchronously.
 * Values are kept as given (a real database would structured-clone them,
 * which keeps Blobs intact too).
 */

type Callback = (() => void) | null;

class FakeRequest<T> {
  result!: T;
  error: DOMException | null = null;
  onsuccess: Callback = null;
  onerror: Callback = null;
  onupgradeneeded: Callback = null;
}

class FakeObjectStore {
  constructor(
    private readonly records: Map<string, unknown>,
    private readonly transaction: FakeTransaction,
  ) {}

  get(key: string): FakeRequest<unknown> {
    const request = new FakeRequest<unknown>();
    queueMicrotask(() => {
      request.result = this.records.get(key);
      request.onsuccess?.();
    });
    return request;
  }

  getAll(): FakeRequest<unknown[]> {
    const request = new FakeRequest<unknown[]>();
    queueMicrotask(() => {
      request.result = [...this.records.values()];
      request.onsuccess?.();
    });
    return request;
  }

  put(value: unknown, key: string): FakeRequest<string> {
    const request = new FakeRequest<string>();
    this.records.set(key, value);
    request.result = key;
    this.transaction.finishAfterRequests();
    return request;
  }

  delete(key: string): FakeRequest<undefined> {
    const request = new FakeRequest<undefined>();
    this.records.delete(key);
    this.transaction.finishAfterRequests();
    return request;
  }
}

class FakeTransaction {
  error: DOMException | null = null;
  oncomplete: Callback = null;
  onerror: Callback = null;
  onabort: Callback = null;

  constructor(private readonly records: Map<string, unknown>) {}

  objectStore(): FakeObjectStore {
    return new FakeObjectStore(this.records, this);
  }

  finishAfterRequests(): void {
    setTimeout(() => this.oncomplete?.(), 0);
  }
}

class FakeDatabase {
  readonly stores = new Map<string, Map<string, unknown>>();

  createObjectStore(name: string): void {
    this.stores.set(name, new Map());
  }

  transaction(storeName: string): FakeTransaction {
    const records = this.stores.get(storeName);
    if (!records) throw new Error(`No object store named ${storeName}`);
    return new FakeTransaction(records);
  }

  close(): void {}
}

/** Create a fresh fake IndexedDB factory; databases persist across open() calls on it. */
export function createFakeIndexedDB(): IDBFactory {
  const databases = new Map<string, FakeDatabase>();
  const factory = {
    open(name: string): FakeRequest<FakeDatabase> {
      const request = new FakeRequest<FakeDatabase>();
      setTimeout(() => {
        let database = databases.get(name);
        request.result = database ?? new FakeDatabase();
        if (!database) {
          database = request.result;
          databases.set(name, database);
          request.onupgradeneeded?.();
        }
        request.onsuccess?.();
      }, 0);
      return request;
    },
  };
  return factory as unknown as IDBFactory;
}
