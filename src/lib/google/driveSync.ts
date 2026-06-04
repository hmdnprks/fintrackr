const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!
const SCOPE = 'https://www.googleapis.com/auth/drive.appdata'
const BACKUP_FILENAME = 'fintrackr-backup.json'
const TOKEN_KEY = 'fintrackr_gdrive_token'
const EXPIRY_KEY = 'fintrackr_gdrive_expiry'

declare global {
  interface Window {
    google: {
      accounts: {
        oauth2: {
          initTokenClient(config: {
            client_id: string
            scope: string
            callback: (resp: { access_token: string; expires_in: number }) => void
            error_callback?: (err: { type: string; message?: string }) => void
          }): { requestAccessToken(): void }
        }
      }
    }
  }
}

export interface DriveFileInfo {
  id: string
  name: string
  modifiedTime: string
  size: string
}

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null
  const token = sessionStorage.getItem(TOKEN_KEY)
  const expiry = sessionStorage.getItem(EXPIRY_KEY)
  if (!token || !expiry) return null
  if (Date.now() > Number(expiry)) {
    clearToken()
    return null
  }
  return token
}

export function clearToken() {
  sessionStorage.removeItem(TOKEN_KEY)
  sessionStorage.removeItem(EXPIRY_KEY)
}

function storeToken(token: string, expiresIn: number) {
  sessionStorage.setItem(TOKEN_KEY, token)
  sessionStorage.setItem(EXPIRY_KEY, String(Date.now() + expiresIn * 1000 - 60_000))
}

export function requestGoogleToken(): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!window.google?.accounts?.oauth2) {
      reject(new Error('Google Identity Services not loaded'))
      return
    }
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPE,
      callback: (resp) => {
        if (!resp.access_token) {
          reject(new Error('No access token returned'))
          return
        }
        storeToken(resp.access_token, resp.expires_in)
        resolve(resp.access_token)
      },
      error_callback: (err) => {
        reject(new Error(err.message ?? err.type ?? 'Auth failed'))
      },
    })
    client.requestAccessToken()
  })
}

async function driveRequest(
  url: string,
  options: RequestInit,
  token: string
): Promise<Response> {
  const res = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers ?? {}),
      Authorization: `Bearer ${token}`,
    },
  })
  if (res.status === 401) {
    clearToken()
    throw new Error('auth_expired')
  }
  return res
}

export async function findBackupFile(token: string): Promise<DriveFileInfo | null> {
  const params = new URLSearchParams({
    spaces: 'appDataFolder',
    fields: 'files(id,name,modifiedTime,size)',
    q: `name = '${BACKUP_FILENAME}'`,
    pageSize: '1',
  })
  const res = await driveRequest(
    `https://www.googleapis.com/drive/v3/files?${params}`,
    { method: 'GET' },
    token
  )
  if (!res.ok) throw new Error(`Drive list failed: ${res.status}`)
  const data = await res.json()
  return data.files?.[0] ?? null
}

export async function uploadToDrive(token: string, content: string): Promise<DriveFileInfo> {
  const existing = await findBackupFile(token)

  // PATCH on the /upload/ endpoint is blocked by CORS preflight in browsers.
  // Instead: delete the old file (DELETE on /drive/v3/ is CORS-safe), then
  // always POST a new one — the replace window is milliseconds.
  if (existing) {
    const del = await driveRequest(
      `https://www.googleapis.com/drive/v3/files/${existing.id}`,
      { method: 'DELETE' },
      token
    )
    // 204 = deleted, 404 = already gone — both are fine
    if (!del.ok && del.status !== 404) {
      throw new Error(`Drive delete failed: ${del.status}`)
    }
  }

  const metadata = JSON.stringify({ name: BACKUP_FILENAME, parents: ['appDataFolder'] })

  // Manual multipart body — avoids FormData CORS preflight issues
  const boundary = 'fintrackr_backup_boundary_' + Date.now()
  const body = [
    `--${boundary}\r\n`,
    `Content-Type: application/json; charset=UTF-8\r\n\r\n`,
    metadata,
    `\r\n--${boundary}\r\n`,
    `Content-Type: application/json\r\n\r\n`,
    content,
    `\r\n--${boundary}--`,
  ].join('')

  const res = await driveRequest(
    `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,modifiedTime,size`,
    { method: 'POST', body, headers: { 'Content-Type': `multipart/related; boundary=${boundary}` } },
    token
  )
  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`Drive upload failed: ${res.status}${errText ? ` — ${errText.slice(0, 200)}` : ''}`)
  }
  return res.json()
}

export async function downloadFromDrive(token: string, fileId: string): Promise<string> {
  const res = await driveRequest(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    { method: 'GET' },
    token
  )
  if (!res.ok) throw new Error(`Drive download failed: ${res.status}`)
  return res.text()
}
