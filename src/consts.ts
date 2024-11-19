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
export const TX_HASH_LEN = 32

export enum LedgerAppError {
  AddrDisplayFail = 0xb002,
  TxWrongLength = 0xb004,
  TxParsingFail = 0xb005,
  TxSignFail = 0xb008,
  KeyDeriveFail = 0xb009,
  VersionParsingFail = 0xb00a,
  DkgRound2Fail = 0xb00b,
  DkgRound3Fail = 0xb00c,
  InvalidKeyType = 0xb00d,
  InvalidIdentity = 0xb00e,
  InvalidPayload = 0xb00f,
  BufferOutOfBounds = 0xb010,
  InvalidSigningPackage = 0xb011,
  InvalidRandomizer = 0xb012,
  InvalidSigningNonces = 0xb013,
  InvalidIdentityIndex = 0xb014,
  InvalidKeyPackage = 0xb015,
  InvalidPublicPackage = 0xb016,
  InvalidGroupSecretKey = 0xb017,
  InvalidScalar = 0xb018,
  DecryptionFail = 0xb019,
  EncryptionFail = 0xb020,
  InvalidNVMWrite = 0xb021,
  InvalidDkgStatus = 0xb022,
  InvalidDkgKeysVersion = 0xb023,
  TooManyParticipants = 0xb024,
  InvalidTxHash = 0xb025,
  InvalidToken = 0xb026,
  ErrExpertModeMustBeEnabled = 0xb027,
}

export const ERROR_DESCRIPTION_OVERRIDE: Readonly<Record<LedgerAppError, string>> = {
  [LedgerAppError.AddrDisplayFail]: 'Invalid address',
  [LedgerAppError.TxWrongLength]: 'Tx too long',
  [LedgerAppError.TxParsingFail]: 'Tx parsing failed',
  [LedgerAppError.TxSignFail]: 'Tx signing failed',
  [LedgerAppError.KeyDeriveFail]: 'Invalid signing key',
  [LedgerAppError.VersionParsingFail]: 'Invalid tx version',
  [LedgerAppError.DkgRound2Fail]: 'Round 2 has failed',
  [LedgerAppError.DkgRound3Fail]: 'Round 3 has failed',
  [LedgerAppError.InvalidKeyType]: 'Invalid key type',
  [LedgerAppError.InvalidIdentity]: 'Invalid identity',
  [LedgerAppError.InvalidPayload]: 'Invalid payload',
  [LedgerAppError.BufferOutOfBounds]: 'Buffer out of bounds',
  [LedgerAppError.InvalidSigningPackage]: 'Invalid signing package',
  [LedgerAppError.InvalidRandomizer]: 'Invalid tx randomizer',
  [LedgerAppError.InvalidSigningNonces]: 'Invalid signing nonces',
  [LedgerAppError.InvalidIdentityIndex]: 'Invalid identity index',
  [LedgerAppError.InvalidKeyPackage]: 'Invalid key package',
  [LedgerAppError.InvalidPublicPackage]: 'Invalid public package',
  [LedgerAppError.InvalidGroupSecretKey]: 'Invalid group secret key',
  [LedgerAppError.InvalidScalar]: 'Invalid scalar',
  [LedgerAppError.DecryptionFail]: 'Keys decryption failed',
  [LedgerAppError.EncryptionFail]: 'Keys encryption failed',
  [LedgerAppError.InvalidNVMWrite]: 'Invalid flash write',
  [LedgerAppError.InvalidDkgStatus]: 'Invalid dkg process status',
  [LedgerAppError.InvalidDkgKeysVersion]: 'Invalid keys version',
  [LedgerAppError.TooManyParticipants]: 'Too many participants for DKG',
  [LedgerAppError.InvalidTxHash]: 'Invalid tx hash',
  [LedgerAppError.InvalidToken]: 'Invalid asset',
  [LedgerAppError.ErrExpertModeMustBeEnabled]: 'Expert mode is required',
}
