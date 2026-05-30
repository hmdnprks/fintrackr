import { idbGet, idbSet, idbDelete } from '@/lib/storage/indexedDB'

const BIOMETRIC_KEY = 'fintrackr_biometric'

type BiometricStore = {
  credentialId: number[]  // Uint8Array serialised as number array for JSON
  password: string
}

export async function isBiometricAvailable(): Promise<boolean> {
  if (typeof window === 'undefined' || !window.PublicKeyCredential) return false
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
  } catch {
    return false
  }
}

export async function isBiometricEnrolled(): Promise<boolean> {
  const data = await idbGet(BIOMETRIC_KEY)
  return !!data
}

export async function enrollBiometric(password: string): Promise<void> {
  const challenge = crypto.getRandomValues(new Uint8Array(32))
  const userId    = crypto.getRandomValues(new Uint8Array(16))

  const credential = await navigator.credentials.create({
    publicKey: {
      challenge,
      rp:   { name: 'Fintrackr', id: window.location.hostname },
      user: { id: userId, name: 'vault@fintrackr', displayName: 'Fintrackr Vault' },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7   },  // ES256
        { type: 'public-key', alg: -257 },  // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        residentKey: 'preferred',
      },
      timeout: 60_000,
    },
  }) as PublicKeyCredential | null

  if (!credential) throw new Error('Biometric enrolment was cancelled.')

  const store: BiometricStore = {
    credentialId: Array.from(new Uint8Array(credential.rawId)),
    password,
  }
  await idbSet(BIOMETRIC_KEY, JSON.stringify(store))
}

export async function authenticateWithBiometric(): Promise<string> {
  const raw = await idbGet(BIOMETRIC_KEY)
  if (!raw) throw new Error('No biometric credential found. Please enrol in Settings first.')

  const store: BiometricStore = JSON.parse(raw)
  const challenge = crypto.getRandomValues(new Uint8Array(32))

  const assertion = await navigator.credentials.get({
    publicKey: {
      challenge,
      rpId: window.location.hostname,
      allowCredentials: [{
        type: 'public-key',
        id:   new Uint8Array(store.credentialId),
        // 'internal' = platform authenticator (Face ID / Touch ID / fingerprint)
        transports: ['internal' as AuthenticatorTransport],
      }],
      userVerification: 'required',
      timeout: 60_000,
    },
  }) as PublicKeyCredential | null

  if (!assertion) throw new Error('Biometric authentication was cancelled.')

  return store.password
}

export async function revokeBiometric(): Promise<void> {
  await idbDelete(BIOMETRIC_KEY)
}
