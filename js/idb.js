// idb.js
// - Simple IndexedDB wrapper for menyimpan data pending (pending_posts, pending_files).
// - Digunakan untuk menampung posting/komentar/profil saat offline (creator), lalu disinkron saat online.

(function (window) {
  const DB_NAME = 'irfan_site_v1';
  const DB_VERSION = 1;
  let dbPromise;

  function openDB() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('pending_posts')) {
          db.createObjectStore('pending_posts', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('pending_files')) {
          db.createObjectStore('pending_files', { keyPath: 'id' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbPromise;
  }

  async function add(store, value) {
    const db = await openDB();
    return new Promise((res, rej) => {
      const tx = db.transaction(store, 'readwrite');
      tx.objectStore(store).put(value);
      tx.oncomplete = () => res(true);
      tx.onerror = () => rej(tx.error);
    });
  }

  async function getAll(store) {
    const db = await openDB();
    return new Promise((res, rej) => {
      const tx = db.transaction(store, 'readonly');
      const req = tx.objectStore(store).getAll();
      req.onsuccess = () => res(req.result || []);
      req.onerror = () => rej(req.error);
    });
  }

  async function del(store, key) {
    const db = await openDB();
    return new Promise((res, rej) => {
      const tx = db.transaction(store, 'readwrite');
      tx.objectStore(store).delete(key);
      tx.oncomplete = () => res(true);
      tx.onerror = () => rej(tx.error);
    });
  }

  async function clear(store) {
    const db = await openDB();
    return new Promise((res, rej) => {
      const tx = db.transaction(store, 'readwrite');
      tx.objectStore(store).clear();
      tx.oncomplete = () => res(true);
      tx.onerror = () => rej(tx.error);
    });
  }

  window.IrfanIDB = { add, getAll, del, clear };
})(window);