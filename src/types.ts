import { INSGeneric, ResponseBase } from '@zondax/ledger-js'

export interface IronfishIns extends INSGeneric {
  GET_VERSION: 0x00
  GET_KEYS: 0x01
  SIGN: 0x02
}

export type KeyResponse = ResponseAddress | ResponseViewKey | ResponseProofGenKey

export interface ResponseAddress extends ResponseBase {
  publicAddress?: Buffer
}

export interface ResponseViewKey extends ResponseBase {
  viewKey?: Buffer
  ivk?: Buffer
  ovk?: Buffer
}

export interface ResponseProofGenKey extends ResponseBase {
  ak?: Buffer
  nsk?: Buffer
}

export interface ResponseSign extends ResponseBase {
  signature?: Buffer
}

export enum IronfishKeys {
  PublicAddress = 0x00,
  ViewKey = 0x01,
  ProofGenerationKey = 0x02,
}
