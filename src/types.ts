import { INSGeneric } from '@zondax/ledger-js'

export interface IronfishIns extends INSGeneric {
  GET_VERSION: 0x00
  GET_KEYS: 0x01
  SIGN: 0x02
  DKG_IDENTITY: 0x10
  DKG_ROUND_1: 0x11
  DKG_ROUND_2: 0x12
  DKG_ROUND_3_MIN: 0x13
  DKG_GET_COMMITMENTS: 0x14
  DKG_SIGN: 0x15
  DKG_GET_KEYS: 0x16
  DKG_GET_PUBLIC_PACKAGE: 0x18
  DKG_BACKUP_KEYS: 0x19
  DKG_RESTORE_KEYS: 0x1a
  GET_RESULT: 0x1b
  REVIEW_TX: 0x1c
}

export type KeyResponse = ResponseAddress | ResponseViewKey | ResponseProofGenKey

export interface ResponseAddress {
  publicAddress: Buffer
}

export interface ResponseViewKey {
  viewKey: Buffer
  ivk: Buffer
  ovk: Buffer
}

export interface ResponseProofGenKey {
  ak: Buffer
  nsk: Buffer
}

export interface ResponseSign {
  signature: Buffer
}

export enum IronfishKeys {
  PublicAddress = 0x00,
  ViewKey = 0x01,
  ProofGenerationKey = 0x02,
}

export interface ResponseIdentity {
  identity: Buffer
}

export interface ResponseDkgRound1 {
  publicPackage: Buffer
  secretPackage: Buffer
}

export interface ResponseDkgRound2 {
  publicPackage: Buffer
  secretPackage: Buffer
}

export interface ResponseDkgGetCommitments {
  commitments: Buffer
}
export interface ResponseDkgSign {
  signature: Buffer
}
export interface ResponseDkgGetPublicPackage {
  publicPackage: Buffer
}
export interface ResponseDkgBackupKeys {
  encryptedKeys: Buffer
}
export interface ResponseReviewTransaction {
  hash: Buffer
}
