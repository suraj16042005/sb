// localDb.js - A minimal IndexedDB wrapper for StudyBuddy
class LocalDb {
    constructor() {
        this.db = null;
        this.dbName = 'StudyBuddyDB';
        this.dbVersion = 1;
    }

    async open() {
        return new Promise((resolve, reject) => {
            if (this.db) {
                console.log('localDb: Database already open.');
                return resolve(this.db);
            }

            console.log('localDb: Opening IndexedDB...');
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onupgradeneeded = (event) => {
                console.log('localDb: Upgrade needed. Creating object stores...');
                this.db = event.target.result;
                if (!this.db.objectStoreNames.contains('users')) {
                    this.db.createObjectStore('users', { keyPath: 'id' });
                }
                if (!this.db.objectStoreNames.contains('courses')) {
                    this.db.createObjectStore('courses', { keyPath: 'id' });
                }
                if (!this.db.objectStoreNames.contains('transactions')) {
                    this.db.createObjectStore('transactions', { keyPath: 'id', autoIncrement: true });
                }
                console.log('localDb: Object stores created/checked.');
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                console.log('localDb: Database opened successfully.');
                resolve(this.db);
            };

            request.onerror = (event) => {
                console.error('localDb: Database error:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    async get(storeName, key) {
        await this.open();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(key);

            request.onsuccess = (event) => {
                resolve(event.target.result);
            };

            request.onerror = (event) => {
                console.error(`localDb: Error getting from ${storeName}:`, event.target.error);
                reject(event.target.error);
            };
        });
    }

    async put(storeName, value) {
        await this.open();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(value);

            request.onsuccess = (event) => {
                resolve(event.target.result);
            };

            request.onerror = (event) => {
                console.error(`localDb: Error putting into ${storeName}:`, event.target.error);
                reject(event.target.error);
            };
        });
    }

    async getAll(storeName) {
        await this.open();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();

            request.onsuccess = (event) => {
                resolve(event.target.result);
            };

            request.onerror = (event) => {
                console.error(`localDb: Error getting all from ${storeName}:`, event.target.error);
                reject(event.target.error);
            };
        });
    }

    // Specific user methods for convenience
    async getUser(userId) {
        return this.get('users', userId);
    }

    async updateUser(userId, updates) {
        const user = await this.getUser(userId);
        if (user) {
            const updatedUser = { ...user, ...updates };
            return this.put('users', updatedUser);
        }
        console.warn('localDb: User not found for update:', userId);
        return null;
    }
}

export const localDb = new LocalDb();
