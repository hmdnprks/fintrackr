// Simple Promise-based IndexedDB wrapper for key-value storage

function getDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    // If not in a browser environment, reject early
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB is not supported or not in browser'))
    }

    const request = indexedDB.open('FintrackrDB', 1)

    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains('vault')) {
        request.result.createObjectStore('vault')
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function idbGet(key: string): Promise<string | null> {
  if (typeof window === 'undefined') return null
  const db = await getDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('vault', 'readonly')
    const store = tx.objectStore('vault')
    const request = store.get(key)
    request.onsuccess = () => resolve(request.result || null)
    request.onerror = () => reject(request.error)
  })
}

export async function idbSet(key: string, value: string): Promise<void> {
  if (typeof window === 'undefined') return
  const db = await getDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('vault', 'readwrite')
    const store = tx.objectStore('vault')
    const request = store.put(value, key)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

export async function idbDelete(key: string): Promise<void> {
  if (typeof window === 'undefined') return
  const db = await getDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('vault', 'readwrite')
    const store = tx.objectStore('vault')
    const request = store.delete(key)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}
