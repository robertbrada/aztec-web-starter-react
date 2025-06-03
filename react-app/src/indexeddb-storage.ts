type AccountType = 'test' | 'created';

export interface StoredAccount {
  id: string;
  address: string;
  signingKey: string;
  secretKey: string;
  salt: string;
  type: AccountType;
  index?: number; // For test accounts
  createdAt: number;
}

class IndexedDBStorage {
  private dbName = 'AztecWalletDB';
  private version = 1;
  private db: IDBDatabase | null = null;

  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create accounts store
        if (!db.objectStoreNames.contains('accounts')) {
          const accountStore = db.createObjectStore('accounts', {
            keyPath: 'id',
          });
          accountStore.createIndex('type', 'type', { unique: false });
          accountStore.createIndex('address', 'address', { unique: true });
        }

        // Create settings store for current account
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      };
    });
  }

  async storeAccount(account: StoredAccount): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['accounts'], 'readwrite');
      const store = transaction.objectStore('accounts');
      const request = store.put(account);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getAccount(id: string): Promise<StoredAccount | null> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['accounts'], 'readonly');
      const store = transaction.objectStore('accounts');
      const request = store.get(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || null);
    });
  }

  async getAllAccounts(): Promise<StoredAccount[]> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['accounts'], 'readonly');
      const store = transaction.objectStore('accounts');
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || []);
    });
  }

  async getAccountsByType(type: AccountType): Promise<StoredAccount[]> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['accounts'], 'readonly');
      const store = transaction.objectStore('accounts');
      const index = store.index('type');
      const request = index.getAll(type);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || []);
    });
  }

  async deleteAccount(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['accounts'], 'readwrite');
      const store = transaction.objectStore('accounts');
      const request = store.delete(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async setCurrentAccount(accountId: string | null): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['settings'], 'readwrite');
      const store = transaction.objectStore('settings');
      const request = store.put({ key: 'currentAccount', value: accountId });

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getCurrentAccount(): Promise<string | null> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['settings'], 'readonly');
      const store = transaction.objectStore('settings');
      const request = store.get('currentAccount');

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result?.value || null);
    });
  }

  async clearAllAccounts(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['accounts'], 'readwrite');
      const store = transaction.objectStore('accounts');
      const request = store.clear();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async resetDatabase(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(
        ['accounts', 'settings'],
        'readwrite'
      );

      // Clear both stores
      const accountsStore = transaction.objectStore('accounts');
      const settingsStore = transaction.objectStore('settings');

      accountsStore.clear();
      settingsStore.clear();

      transaction.onerror = () => reject(transaction.error);
      transaction.oncomplete = () => {
        console.log('IndexedDB reset completed');
        resolve();
      };
    });
  }
}

export const indexedDBStorage = new IndexedDBStorage();
