function idbOpen ({ name = '', version = undefined, onupgradeneeded = null }) {
  return new Promise((resolve, reject) => {
    const req = self.indexedDB.open(name, version)
    req.onupgradeneeded = event => {
      try {
        if (onupgradeneeded) {
          onupgradeneeded(req.result, req.transaction, event.oldVersion)
        }
      } catch (err) {
        reject(err)
      }
    }
    req.onsuccess = event => {
      resolve(req.result)
    }
    req.onerror = event => {
      reject(event.target.error)
    }
  })
}

export function deleteDatabase (name) {
  return new Promise((resolve, reject) => {
    const req = self.indexedDB.deleteDatabase(name)
    req.onerror = event => {
      reject(event.target.error)
    }
    req.onsuccess = event => {
      resolve(req.result)
    }
  })
}

export async function getVersion (name) {
  const db = await idbOpen({ name })
  const version = db.version
  db.close()
  return version
}

export async function objectStoreNames (conf) {
  const db = await idbOpen(conf)
  const objectStoreNames = db.objectStoreNames
  db.close()
  return objectStoreNames
}

export async function tx (conf, osns, mode, fn) {
  const db = await idbOpen(conf)
  return await new Promise((resolve, reject) => {
    let val
    const tx = db.transaction(osns, mode)
    tx.oncomplete = event => {
      db.close()
      resolve(val)
    }
    tx.onerror = event => {
      db.close()
      reject(event.target.error)
    }
    try {
      val = fn(tx)
    } catch (err) {
      tx.abort()
      db.close()
      reject(err)
    }
  })
}

export function add (os, item) {
  return new Promise((resolve, reject) => {
    const req = os.add(item)
    req.onsuccess = event => {
      resolve(req.result)
    }
    req.onerror = event => {
      reject(event.target.error)
    }
  })
}

export function put (os, item) {
  return new Promise((resolve, reject) => {
    const req = os.put(item)
    req.onsuccess = event => {
      resolve(req.result)
    }
    req.onerror = event => {
      reject(event.target.error)
    }
  })
}

export function get (os, key) {
  return new Promise((resolve, reject) => {
    const req = os.get(key)
    req.onsuccess = event => {
      resolve(req.result)
    }
    req.onerror = event => {
      reject(event.target.error)
    }
  })
}

export function del (os, item) {
  return new Promise((resolve, reject) => {
    const req = os.delete(item)
    req.onsuccess = event => {
      resolve(req.result)
    }
    req.onerror = event => {
      reject(event.target.error)
    }
  })
}

export function count (os, key) {
  return new Promise((resolve, reject) => {
    const req = os.count(key)
    req.onsuccess = event => {
      resolve(req.result)
    }
    req.onerror = event => {
      reject(event.target.error)
    }
  })
}

export function cursor ({ index, range = null, direction = 'next', forEach }) {
  return new Promise((resolve, reject) => {
    let result
    const req = index.openCursor(range, direction)
    req.onsuccess = event => {
      const cursor = req.result
      if (cursor) {
        try {
          result = forEach(cursor.value, cursor)
        } catch (error) {
          reject(error)
        }
        cursor.advance(result === undefined ? 1 : 0xFFFFFFFF)
      } else {
        resolve(result)
      }
    }
    req.onerror = event => {
      reject(event.target.error)
    }
  })
}
