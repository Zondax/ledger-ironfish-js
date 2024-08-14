export const APP_KEY = 'Ironfish'

export const P2_VALUES = {
  DEFAULT: 0x00,
}

export const KEY_TYPES = {
  PUBLIC_ADRESS: 0x00,
  VIEW_KEY: 0x01,
  PROOF_GEN_KEY: 0x02,
}

export const VERSION = 1
export const KEY_LENGTH = 32
export const REDJUBJUB_SIGNATURE_LEN = 64
export const ED25519_SIGNATURE_LEN = 64
export const IDENTITY_LEN = VERSION + KEY_LENGTH + KEY_LENGTH + ED25519_SIGNATURE_LEN
