/** ******************************************************************************
 *  (c) 2019-2020 Zondax GmbH
 *  (c) 2016-2017 Ledger
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 ******************************************************************************* */
import GenericApp, { ConstructorParams, LedgerError, Transport, processErrorResponse, processResponse } from '@zondax/ledger-js'
import { ResponsePayload } from '@zondax/ledger-js/dist/payload'

import { P2_VALUES } from './consts'
import { deserializeDkgRound1, deserializeDkgRound2, deserializeReviewTx } from './deserialize'
import { processGetIdentityResponse, processGetKeysResponse } from './helper'
import { serializeDkgGetCommitments, serializeDkgRound1, serializeDkgRound2, serializeDkgRound3Min, serializeDkgSign } from './serialize'
import {
  IronfishIns,
  IronfishKeys,
  KeyResponse,
  ResponseDkgBackupKeys,
  ResponseDkgGetCommitments,
  ResponseDkgGetPublicPackage,
  ResponseDkgRound1,
  ResponseDkgRound2,
  ResponseDkgSign,
  ResponseIdentity,
  ResponseReviewTransaction,
  ResponseSign,
} from './types'

export * from './types'

const DUMMY_PATH = "m/44'/1338'/0"

export default class IronfishApp extends GenericApp {
  readonly INS!: IronfishIns
  constructor(transport: Transport, dkgMode?: boolean) {
    if (transport == null) throw new Error('Transport has not been defined')

    const params: ConstructorParams = {
      cla: dkgMode ? 0x63 : 0x59,
      ins: {
        GET_VERSION: 0x00,
        GET_KEYS: 0x01,
        SIGN: 0x02,
        //DKG Instructions
        DKG_IDENTITY: 0x10,
        DKG_ROUND_1: 0x11,
        DKG_ROUND_2: 0x12,
        DKG_ROUND_3_MIN: 0x13,
        DKG_GET_COMMITMENTS: 0x14,
        DKG_SIGN: 0x15,
        DKG_GET_KEYS: 0x16,
        DKG_GET_NONCES: 0x17,
        DKG_GET_PUBLIC_PACKAGE: 0x18,
        DKG_BACKUP_KEYS: 0x19,
        DKG_RESTORE_KEYS: 0x1a,
        GET_RESULT: 0x1b,
        REVIEW_TX: 0x1c,
      },
      p1Values: {
        ONLY_RETRIEVE: 0x00,
        SHOW_ADDRESS_IN_DEVICE: 0x01,
      },
      acceptedPathLengths: [3],
      chunkSize: 250,
    }
    super(transport, params)
  }

  async retrieveKeys(path: string, keyType: IronfishKeys, showInDevice: boolean): Promise<KeyResponse> {
    const serializedPath = this.serializePath(path)
    const p1 = showInDevice ? this.P1_VALUES.SHOW_ADDRESS_IN_DEVICE : this.P1_VALUES.ONLY_RETRIEVE

    const response = await this.transport.send(this.CLA, this.INS.GET_KEYS, p1, keyType, serializedPath, [LedgerError.NoErrors])
    const payload = processResponse(response)
    return processGetKeysResponse(payload, keyType)
  }

  async sign(path: string, blob: Buffer): Promise<ResponseSign> {
    try {
      const chunks = this.prepareChunks(path, blob)

      let result: any
      for (let i = 0; i < chunks.length; i += 1) {
        result = await this.sendGenericChunk(this.INS.SIGN, P2_VALUES.DEFAULT, 1, chunks.length, chunks[0])
      }

      return {
        signature: result.readBytes(result.length()),
      }
    } catch (e) {
      throw processErrorResponse(e)
    }
  }

  async dkgGetIdentity(index: number): Promise<ResponseIdentity> {
    let req = Buffer.alloc(1)
    req.writeUint8(index)

    const response = await this.transport.send(this.CLA, this.INS.DKG_IDENTITY, 0, 0, req, [LedgerError.NoErrors])
    const data = processResponse(response)
    return processGetIdentityResponse(data)
  }

  async dkgRound1(index: number, identities: string[], minSigners: number): Promise<ResponseDkgRound1> {
    try {
      const blob = serializeDkgRound1(index, identities, minSigners)
      const chunks = this.prepareChunks(DUMMY_PATH, blob)

      let rawResponse: any
      for (let i = 0; i < chunks.length; i += 1) {
        rawResponse = await this.sendGenericChunk(this.INS.DKG_ROUND_1, P2_VALUES.DEFAULT, 1 + i, chunks.length, chunks[i])
      }

      let result = await this.getResult(rawResponse)
      return deserializeDkgRound1(result)
    } catch (e) {
      throw processErrorResponse(e)
    }
  }

  async dkgRound2(index: number, round1PublicPackages: string[], round1SecretPackage: string): Promise<ResponseDkgRound2> {
    try {
      const blob = serializeDkgRound2(index, round1PublicPackages, round1SecretPackage)
      const chunks = this.prepareChunks(DUMMY_PATH, blob)

      let rawResponse: any
      for (let i = 0; i < chunks.length; i += 1) {
        rawResponse = await this.sendGenericChunk(this.INS.DKG_ROUND_2, P2_VALUES.DEFAULT, 1 + i, chunks.length, chunks[i])
      }

      let result = await this.getResult(rawResponse)
      return deserializeDkgRound2(result)
    } catch (e) {
      throw processErrorResponse(e)
    }
  }

  async dkgRound3Min(
    index: number,
    participants: string[],
    round1PublicPkgs: string[],
    round2PublicPkgs: string[],
    round2SecretPackage: string,
    gskBytes: string[]
  ): Promise<void> {
    try {
      const blob = serializeDkgRound3Min(index, participants, round1PublicPkgs, round2PublicPkgs, round2SecretPackage, gskBytes)
      const chunks = this.prepareChunks(DUMMY_PATH, blob)

      for (let i = 0; i < chunks.length; i += 1) {
        await this.sendGenericChunk(this.INS.DKG_ROUND_3_MIN, P2_VALUES.DEFAULT, 1 + i, chunks.length, chunks[i])
      }
    } catch (e) {
      throw processErrorResponse(e)
    }
  }

  async dkgGetCommitments(tx_hash: string): Promise<ResponseDkgGetCommitments> {
    try {
      const blob = serializeDkgGetCommitments(tx_hash)
      const chunks = this.prepareChunks(DUMMY_PATH, blob)

      let rawResponse: any
      for (let i = 0; i < chunks.length; i += 1) {
        rawResponse = await this.sendGenericChunk(this.INS.DKG_GET_COMMITMENTS, P2_VALUES.DEFAULT, 1 + i, chunks.length, chunks[i])
      }

      let result = await this.getResult(rawResponse)
      return {
        commitments: result,
      }
    } catch (e) {
      throw processErrorResponse(e)
    }
  }

  async dkgSign(pkRandomness: string, frostSigningPackage: string, txHash: string): Promise<ResponseDkgSign> {
    try {
      const blob = serializeDkgSign(pkRandomness, frostSigningPackage, txHash)
      const chunks = this.prepareChunks(DUMMY_PATH, blob)

      let rawResponse: any
      for (let i = 0; i < chunks.length; i += 1) {
        rawResponse = await this.sendGenericChunk(this.INS.DKG_SIGN, P2_VALUES.DEFAULT, 1 + i, chunks.length, chunks[i])
      }

      let result = await this.getResult(rawResponse)
      return {
        signature: result,
      }
    } catch (e) {
      throw processErrorResponse(e)
    }
  }

  async dkgGetPublicPackage(): Promise<ResponseDkgGetPublicPackage> {
    try {
      let response = await this.transport.send(this.CLA, this.INS.DKG_GET_PUBLIC_PACKAGE, 0, 0, Buffer.alloc(0), [LedgerError.NoErrors])
      let data = processResponse(response)

      let result = await this.getResult(data)

      return {
        publicPackage: result,
      }
    } catch (e) {
      throw processErrorResponse(e)
    }
  }

  async dkgBackupKeys(): Promise<ResponseDkgBackupKeys> {
    try {
      let response = await this.transport.send(this.CLA, this.INS.DKG_BACKUP_KEYS, 0, 0, Buffer.alloc(0), [LedgerError.NoErrors])
      let data = processResponse(response)

      let result = await this.getResult(data)

      return {
        encryptedKeys: result,
      }
    } catch (e) {
      throw processErrorResponse(e)
    }
  }
  async dkgRetrieveKeys(keyType: IronfishKeys): Promise<KeyResponse> {
    const response = await this.transport.send(this.CLA, this.INS.DKG_GET_KEYS, 0, keyType, Buffer.alloc(0), [LedgerError.NoErrors])
    const data = processResponse(response)
    return processGetKeysResponse(data, keyType)
  }

  async dkgRestoreKeys(encryptedKeys: string): Promise<void> {
    try {
      const chunks = this.prepareChunks(DUMMY_PATH, Buffer.from(encryptedKeys, 'hex'))

      for (let i = 0; i < chunks.length; i += 1) {
        await this.sendGenericChunk(this.INS.DKG_RESTORE_KEYS, P2_VALUES.DEFAULT, 1 + i, chunks.length, chunks[i])
      }
    } catch (e) {
      throw processErrorResponse(e)
    }
  }

  async reviewTransaction(tx: string): Promise<ResponseReviewTransaction> {
    try {
      const blob = Buffer.from(tx, 'hex')
      const chunks = this.prepareChunks(DUMMY_PATH, blob)

      let rawResponse: any
      for (let i = 0; i < chunks.length; i += 1) {
        rawResponse = await this.sendGenericChunk(this.INS.REVIEW_TX, P2_VALUES.DEFAULT, 1 + i, chunks.length, chunks[i])
      }

      let result = await this.getResult(rawResponse)
      return deserializeReviewTx(result)
    } catch (e) {
      throw processErrorResponse(e)
    }
  }

  async getResult(rawResponse: ResponsePayload): Promise<Buffer> {
    let data = Buffer.alloc(0)

    let chunks = rawResponse.readBytes(1).readUint8()
    for (let i = 0; i < chunks; i++) {
      let result = await this.transport.send(this.CLA, this.INS.GET_RESULT, i, 0, Buffer.alloc(0))
      let response = processResponse(result)
      data = Buffer.concat([data, response.getCompleteBuffer()])
    }

    return data
  }
}
