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
import GenericApp, {
  ConstructorParams,
  LedgerError,
  PAYLOAD_TYPE,
  ResponseBase,
  Transport,
  errorCodeToString,
  processErrorResponse,
} from '@zondax/ledger-js'

import { P2_VALUES, REDJUBJUB_SIGNATURE_LEN } from './consts'
import { deserializeDkgRound1, deserializeDkgRound2 } from './deserialize'
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
  ResponseDkgRound3Min,
  ResponseDkgSign,
  ResponseIdentity,
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

    return await this.transport
      .send(this.CLA, this.INS.GET_KEYS, p1, keyType, serializedPath, [LedgerError.NoErrors])
      .then(response => processGetKeysResponse(response, keyType), processErrorResponse)
  }

  async signChunk(ins: number, chunkIdx: number, chunkNum: number, chunk: Buffer): Promise<ResponseSign> {
    let payloadType = PAYLOAD_TYPE.ADD
    if (chunkIdx === 1) {
      payloadType = PAYLOAD_TYPE.INIT
    }
    if (chunkIdx === chunkNum) {
      payloadType = PAYLOAD_TYPE.LAST
    }

    return await this.transport
      .send(this.CLA, ins, payloadType, P2_VALUES.DEFAULT, chunk, [
        LedgerError.NoErrors,
        LedgerError.DataIsInvalid,
        LedgerError.BadKeyHandle,
        LedgerError.SignVerifyError,
      ])
      .then((response: Buffer) => {
        const errorCodeData = response.subarray(-2)
        const returnCode = errorCodeData[0] * 256 + errorCodeData[1]
        let errorMessage = errorCodeToString(returnCode)

        if (
          returnCode === LedgerError.BadKeyHandle ||
          returnCode === LedgerError.DataIsInvalid ||
          returnCode === LedgerError.SignVerifyError
        ) {
          errorMessage = `${errorMessage} : ${response.subarray(0, response.length - 2).toString('ascii')}`
        }

        if (returnCode === LedgerError.NoErrors && response.length == 2 + REDJUBJUB_SIGNATURE_LEN) {
          const signature = response.subarray(0, REDJUBJUB_SIGNATURE_LEN)

          return {
            signature,
            returnCode,
            errorMessage,
          }
        }

        return {
          returnCode,
          errorMessage,
        }
      }, processErrorResponse)
  }

  signSendChunk(chunkIdx: number, chunkNum: number, chunk: Buffer): Promise<ResponseSign> {
    return this.signChunk(this.INS.SIGN, chunkIdx, chunkNum, chunk)
  }

  async sign(path: string, blob: Buffer): Promise<ResponseSign> {
    const chunks = this.prepareChunks(path, blob)
    return await this.signSendChunk(1, chunks.length, chunks[0]).then(async response => {
      let result: ResponseSign = {
        returnCode: response.returnCode,
        errorMessage: response.errorMessage,
      }

      for (let i = 1; i < chunks.length; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        result = await this.signSendChunk(1 + i, chunks.length, chunks[i])
        if (result.returnCode !== LedgerError.NoErrors) {
          break
        }
      }
      return result
    }, processErrorResponse)
  }

  async dkgGetIdentity(index: number): Promise<ResponseIdentity> {
    let data = Buffer.alloc(1)
    data.writeUint8(index)

    return await this.transport
      .send(this.CLA, this.INS.DKG_IDENTITY, 0, 0, data, [LedgerError.NoErrors])
      .then(response => processGetIdentityResponse(response), processErrorResponse)
  }

  async sendDkgChunk(ins: number, chunkIdx: number, chunkNum: number, chunk: Buffer): Promise<Buffer> {
    let payloadType = PAYLOAD_TYPE.ADD
    if (chunkIdx === 1) {
      payloadType = PAYLOAD_TYPE.INIT
    }
    if (chunkIdx === chunkNum) {
      payloadType = PAYLOAD_TYPE.LAST
    }

    return await this.transport.send(this.CLA, ins, payloadType, P2_VALUES.DEFAULT, chunk, [
      LedgerError.NoErrors,
      LedgerError.DataIsInvalid,
      LedgerError.BadKeyHandle,
      LedgerError.SignVerifyError,
    ])
  }

  async dkgRound1(index: number, identities: string[], minSigners: number): Promise<ResponseDkgRound1> {
    const blob = serializeDkgRound1(index, identities, minSigners)
    const chunks = this.prepareChunks(DUMMY_PATH, blob)

    try {
      let response = Buffer.alloc(0)
      let returnCode = 0
      let errorCodeData = Buffer.alloc(0)
      let errorMessage = ''
      try {
        response = await this.sendDkgChunk(this.INS.DKG_ROUND_1, 1, chunks.length, chunks[0])
        // console.log("resp 0 " + response.toString("hex"))

        errorCodeData = response.subarray(-2)
        returnCode = errorCodeData[0] * 256 + errorCodeData[1]
        errorMessage = errorCodeToString(returnCode)
      } catch (e) {
        // console.log(e)
      }

      for (let i = 1; i < chunks.length; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        response = await this.sendDkgChunk(this.INS.DKG_ROUND_1, 1 + i, chunks.length, chunks[i])
        // console.log("resp " + i + " " + response.toString("hex"))

        errorCodeData = response.subarray(-2)
        returnCode = errorCodeData[0] * 256 + errorCodeData[1]
        errorMessage = errorCodeToString(returnCode)

        // console.log("returnCode " + returnCode)
        if (returnCode !== LedgerError.NoErrors) {
          return {
            returnCode,
            errorMessage,
          }
        }
      }

      let { isError, responseResult, rawResponse } = this.checkResponseCode(response)
      if (isError) return responseResult

      let result = await this.getResult(rawResponse)

      return {
        returnCode: result.returnCode,
        errorMessage: result.errorMessage,
        ...deserializeDkgRound1(result.data),
      }
    } catch (e) {
      return processErrorResponse(e)
    }
  }

  async dkgRound2(index: number, round1PublicPackages: string[], round1SecretPackage: string): Promise<ResponseDkgRound2> {
    const blob = serializeDkgRound2(index, round1PublicPackages, round1SecretPackage)
    const chunks = this.prepareChunks(DUMMY_PATH, blob)

    try {
      let response = Buffer.alloc(0)
      let returnCode = 0
      let errorCodeData = Buffer.alloc(0)
      let errorMessage = ''
      try {
        response = await this.sendDkgChunk(this.INS.DKG_ROUND_2, 1, chunks.length, chunks[0])
        // console.log("resp 0 " + response.toString("hex"))

        errorCodeData = response.subarray(-2)
        returnCode = errorCodeData[0] * 256 + errorCodeData[1]
        errorMessage = errorCodeToString(returnCode)
      } catch (e) {
        // console.log(e)
      }

      for (let i = 1; i < chunks.length; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        response = await this.sendDkgChunk(this.INS.DKG_ROUND_2, 1 + i, chunks.length, chunks[i])
        // console.log("resp " + i + " " + response.toString("hex"))

        errorCodeData = response.subarray(-2)
        returnCode = errorCodeData[0] * 256 + errorCodeData[1]
        errorMessage = errorCodeToString(returnCode)

        // console.log("returnCode " + returnCode)
        if (returnCode !== LedgerError.NoErrors) {
          return {
            returnCode,
            errorMessage,
          }
        }
      }

      let { isError, responseResult, rawResponse } = this.checkResponseCode(response)
      if (isError) return responseResult

      let result = await this.getResult(rawResponse)

      return {
        returnCode: result.returnCode,
        errorMessage: result.errorMessage,
        ...deserializeDkgRound2(result.data),
      }
    } catch (e) {
      return processErrorResponse(e)
    }
  }

  async dkgRound3Min(
    index: number,
    participants: string[],
    round1PublicPkgs: string[],
    round2PublicPkgs: string[],
    round2SecretPackage: string,
    gskBytes: string[]
  ): Promise<ResponseDkgRound3Min> {
    const blob = serializeDkgRound3Min(index, participants, round1PublicPkgs, round2PublicPkgs, round2SecretPackage, gskBytes)
    const chunks = this.prepareChunks(DUMMY_PATH, blob)

    try {
      let response = Buffer.alloc(0)
      let returnCode = 0
      let errorCodeData = Buffer.alloc(0)
      let errorMessage = ''
      try {
        response = await this.sendDkgChunk(this.INS.DKG_ROUND_3_MIN, 1, chunks.length, chunks[0])
        // console.log("resp 0 " + response.toString("hex"))

        errorCodeData = response.subarray(-2)
        returnCode = errorCodeData[0] * 256 + errorCodeData[1]
        errorMessage = errorCodeToString(returnCode)
      } catch (e) {
        // console.log(e)
      }

      for (let i = 1; i < chunks.length; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        response = await this.sendDkgChunk(this.INS.DKG_ROUND_3_MIN, 1 + i, chunks.length, chunks[i])
        // console.log("resp " + i + " " + response.toString("hex"))

        errorCodeData = response.subarray(-2)
        returnCode = errorCodeData[0] * 256 + errorCodeData[1]
        errorMessage = errorCodeToString(returnCode)

        // console.log("returnCode " + returnCode)
        if (returnCode !== LedgerError.NoErrors) {
          return {
            returnCode,
            errorMessage,
          }
        }
      }

      return {
        returnCode,
        errorMessage,
      }
    } catch (e) {
      return processErrorResponse(e)
    }
  }

  async dkgGetCommitments(tx_hash: string): Promise<ResponseDkgGetCommitments> {
    const blob = serializeDkgGetCommitments(tx_hash)
    const chunks = this.prepareChunks(DUMMY_PATH, blob)

    try {
      let response = Buffer.alloc(0)
      let returnCode = 0
      let errorCodeData = Buffer.alloc(0)
      let errorMessage = ''
      try {
        response = await this.sendDkgChunk(this.INS.DKG_GET_COMMITMENTS, 1, chunks.length, chunks[0])
        // console.log("resp 0 " + response.toString("hex"))

        errorCodeData = response.subarray(-2)
        returnCode = errorCodeData[0] * 256 + errorCodeData[1]
        errorMessage = errorCodeToString(returnCode)
      } catch (e) {
        // console.log(e)
      }

      for (let i = 1; i < chunks.length; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        response = await this.sendDkgChunk(this.INS.DKG_GET_COMMITMENTS, 1 + i, chunks.length, chunks[i])
        // console.log("resp " + i + " " + response.toString("hex"))

        errorCodeData = response.subarray(-2)
        returnCode = errorCodeData[0] * 256 + errorCodeData[1]
        errorMessage = errorCodeToString(returnCode)

        // console.log("returnCode " + returnCode)
        if (returnCode !== LedgerError.NoErrors) {
          return {
            returnCode,
            errorMessage,
          }
        }
      }

      let { isError, responseResult, rawResponse } = this.checkResponseCode(response)
      if (isError) return responseResult

      let result = await this.getResult(rawResponse)

      return {
        returnCode: result.returnCode,
        errorMessage: result.errorMessage,
        commitments: result.data,
      }
    } catch (e) {
      return processErrorResponse(e)
    }
  }

  async dkgSign(pkRandomness: string, frostSigningPackage: string, txHash: string): Promise<ResponseDkgSign> {
    const blob = serializeDkgSign(pkRandomness, frostSigningPackage, txHash)
    const chunks = this.prepareChunks(DUMMY_PATH, blob)

    try {
      let response = Buffer.alloc(0)
      let returnCode = 0
      let errorCodeData = Buffer.alloc(0)
      let errorMessage = ''
      try {
        response = await this.sendDkgChunk(this.INS.DKG_SIGN, 1, chunks.length, chunks[0])
        // console.log("resp 0 " + response.toString("hex"))

        errorCodeData = response.subarray(-2)
        returnCode = errorCodeData[0] * 256 + errorCodeData[1]
        errorMessage = errorCodeToString(returnCode)
      } catch (e) {
        // console.log(e)
      }

      for (let i = 1; i < chunks.length; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        response = await this.sendDkgChunk(this.INS.DKG_SIGN, 1 + i, chunks.length, chunks[i])
        // console.log("resp " + i + " " + response.toString("hex"))

        errorCodeData = response.subarray(-2)
        returnCode = errorCodeData[0] * 256 + errorCodeData[1]
        errorMessage = errorCodeToString(returnCode)

        // console.log("returnCode " + returnCode)
        if (returnCode !== LedgerError.NoErrors) {
          return {
            returnCode,
            errorMessage,
          }
        }
      }

      let { isError, responseResult, rawResponse } = this.checkResponseCode(response)
      if (isError) return responseResult

      let result = await this.getResult(rawResponse)

      return {
        returnCode: result.returnCode,
        errorMessage: result.errorMessage,
        signature: result.data,
      }
    } catch (e) {
      return processErrorResponse(e)
    }
  }

  async dkgGetPublicPackage(): Promise<ResponseDkgGetPublicPackage> {
    try {
      let response = await this.transport.send(this.CLA, this.INS.DKG_GET_PUBLIC_PACKAGE, 0, 0, Buffer.alloc(0), [LedgerError.NoErrors])
      let { isError, responseResult, rawResponse } = this.checkResponseCode(response)
      if (isError) return responseResult

      let result = await this.getResult(rawResponse)

      return {
        returnCode: result.returnCode,
        errorMessage: result.errorMessage,
        publicPackage: result.data,
      }
    } catch (e) {
      return processErrorResponse(e)
    }
  }

  async dkgBackupKeys(): Promise<ResponseDkgBackupKeys> {
    try {
      let response = await this.transport.send(this.CLA, this.INS.DKG_BACKUP_KEYS, 0, 0, Buffer.alloc(0), [LedgerError.NoErrors])
      let { isError, responseResult, rawResponse } = this.checkResponseCode(response)
      if (isError) return responseResult

      let result = await this.getResult(rawResponse)

      return {
        returnCode: result.returnCode,
        errorMessage: result.errorMessage,
        encryptedKeys: result.data,
      }
    } catch (e) {
      return processErrorResponse(e)
    }
  }
  async dkgRetrieveKeys(keyType: IronfishKeys): Promise<KeyResponse> {
    return await this.transport
      .send(this.CLA, this.INS.DKG_GET_KEYS, 0, keyType, Buffer.alloc(0), [LedgerError.NoErrors])
      .then(response => processGetKeysResponse(response, keyType), processErrorResponse)
  }

  async dkgRestoreKeys(encryptedKeys: string): Promise<ResponseBase> {
    const chunks = this.prepareChunks(DUMMY_PATH, Buffer.from(encryptedKeys, 'hex'))

    try {
      let response = Buffer.alloc(0)
      let returnCode = 0
      let errorCodeData = Buffer.alloc(0)
      let errorMessage = ''
      try {
        response = await this.sendDkgChunk(this.INS.DKG_RESTORE_KEYS, 1, chunks.length, chunks[0])
        // console.log("resp 0 " + response.toString("hex"))

        errorCodeData = response.subarray(-2)
        returnCode = errorCodeData[0] * 256 + errorCodeData[1]
        errorMessage = errorCodeToString(returnCode)
      } catch (e) {
        // console.log(e)
      }

      for (let i = 1; i < chunks.length; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        response = await this.sendDkgChunk(this.INS.DKG_RESTORE_KEYS, 1 + i, chunks.length, chunks[i])
        // console.log("resp " + i + " " + response.toString("hex"))

        errorCodeData = response.subarray(-2)
        returnCode = errorCodeData[0] * 256 + errorCodeData[1]
        errorMessage = errorCodeToString(returnCode)

        // console.log("returnCode " + returnCode)
        if (returnCode !== LedgerError.NoErrors) {
          return {
            returnCode,
            errorMessage,
          }
        }
      }

      return {
        returnCode,
        errorMessage,
      }
    } catch (e) {
      return processErrorResponse(e)
    }
  }

  async getResult(rawResponse: Buffer): Promise<{ data?: Buffer; returnCode: number; errorMessage: string }> {
    let data = Buffer.alloc(0)

    let chunks = rawResponse.readUint8(0)
    for (let i = 0; i < chunks; i++) {
      let response = await this.transport.send(this.CLA, this.INS.GET_RESULT, i, 0, Buffer.alloc(0))
      let { isError, responseResult, rawResponse } = this.checkResponseCode(response)
      if (isError) return responseResult

      data = Buffer.concat([data, rawResponse])
    }

    return { data, returnCode: LedgerError.NoErrors, errorMessage: errorCodeToString(LedgerError.NoErrors) }
  }

  checkResponseCode(response: Buffer) {
    let errorCodeData = response.subarray(-2)
    let returnCode = errorCodeData[0] * 256 + errorCodeData[1]
    let errorMessage = errorCodeToString(returnCode)

    // console.log("returnCode " + returnCode)
    if (returnCode !== LedgerError.NoErrors) {
      return {
        isError: true,
        rawResponse: response.subarray(0, response.length - 2),
        responseResult: {
          returnCode,
          errorMessage,
        },
      }
    } else {
      return {
        isError: false,
        rawResponse: response.subarray(0, response.length - 2),
        responseResult: {
          returnCode,
          errorMessage,
        },
      }
    }
  }
}
