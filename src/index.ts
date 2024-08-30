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
  Transport,
  errorCodeToString,
  processErrorResponse,
} from '@zondax/ledger-js'

import { P2_VALUES, REDJUBJUB_SIGNATURE_LEN } from './consts'
import { processGetIdentityResponse, processGetKeysResponse } from './helper'
import {
  IronfishIns,
  IronfishKeys,
  KeyResponse,
  ResponseDkgRound1,
  ResponseDkgRound2, ResponseDkgRound3,
  ResponseIdentity,
  ResponseSign
} from './types'

export * from './types'

export default class IronfishApp extends GenericApp {
  readonly INS!: IronfishIns
  constructor(transport: Transport) {
    if (transport == null) throw new Error('Transport has not been defined')

    const params: ConstructorParams = {
      cla: 0x59,
      ins: {
        GET_VERSION: 0x00,
        GET_KEYS: 0x01,
        SIGN: 0x02,
        //DKG Instructions
        DKG_IDENTITY: 0x10,
        DKG_ROUND_1: 0x11,
        DKG_ROUND_2: 0x12,
        DKG_ROUND_3: 0x13,
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

        if (returnCode === LedgerError.NoErrors && response.length == (2 + REDJUBJUB_SIGNATURE_LEN)) {
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
    return this.signChunk(this.INS.SIGN, chunkIdx, chunkNum, chunk);
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
    let data = Buffer.alloc(1);
    data.writeUint8(index);

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

    return await this.transport
        .send(this.CLA, ins, payloadType, P2_VALUES.DEFAULT, chunk, [
          LedgerError.NoErrors,
          LedgerError.DataIsInvalid,
          LedgerError.BadKeyHandle,
          LedgerError.SignVerifyError,
        ])
  }

  async dkgRound1(path: string, index:number, identities: string[], minSigners: number): Promise<ResponseDkgRound1> {
    let blob = Buffer
        .alloc(1 + 1 + identities.length * 129 + 1);

    blob.writeUint8(index);
    blob.writeUint8(identities.length, 1);
    for (let i = 0; i < identities.length; i++) {
      blob.fill(Buffer.from(identities[i], "hex"), 1 + 1 + (i * 129))
    }
    blob.writeUint8(minSigners, 1 + 1 + identities.length * 129);

    const chunks = this.prepareChunks(path, blob)

    try{
      let response = Buffer.alloc(0)
      let returnCode = 0;
      let errorCodeData = Buffer.alloc(0);
      let errorMessage = "";
      try {
        response = await this.sendDkgChunk(this.INS.DKG_ROUND_1, 1, chunks.length, chunks[0])
        // console.log("resp 0 " + response.toString("hex"))

        errorCodeData = response.subarray(-2)
        returnCode = errorCodeData[0] * 256 + errorCodeData[1]
        errorMessage = errorCodeToString(returnCode)
      }catch(e){
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
        if (returnCode !== LedgerError.NoErrors){
          return {
            returnCode,
            errorMessage
          }
        }
      }

      let data = Buffer.alloc(0)
      while(true) {
        let newData = response.subarray(0, response.length - 2)
        data = Buffer.concat([data, newData])

        if (response.length == 255) {
          response = await this.sendDkgChunk(this.INS.DKG_ROUND_1, 0, 0, Buffer.alloc(0))
          // console.log("resp " + response.toString("hex"))

          errorCodeData = response.subarray(-2)
          returnCode = errorCodeData[0] * 256 + errorCodeData[1]
          errorMessage = errorCodeToString(returnCode)

          if (returnCode !== LedgerError.NoErrors){
            return {
              returnCode,
              errorMessage
            }
          }

        } else {
          // console.log("raw round1 " + data.toString("hex"))
          let pos = 0
          const secretPackageLen = data.readUint16BE(pos)
          pos += 2
          const secretPackage = data.subarray(pos, pos + secretPackageLen)
          pos += secretPackageLen
          const publicPackageLen = data.readUint16BE(pos)
          pos += 2
          const publicPackage = data.subarray(pos, pos + publicPackageLen)
          pos += publicPackageLen

          return {
            returnCode,
            errorMessage,
            secretPackage,
            publicPackage
          }
        }
      }

    } catch(e){
      return processErrorResponse(e)
    }
  }


  async dkgRound2(path: string, index: number, round1PublicPackages: string[], round1SecretPackage: string): Promise<ResponseDkgRound2> {
    let round1PublicPackagesLen = round1PublicPackages[0].length / 2
    let round1SecretPackageLen = round1SecretPackage.length / 2

    let blob = Buffer
        .alloc(1 + 1 + 2 + round1PublicPackages.length * round1PublicPackagesLen + 2 + round1SecretPackageLen);
    let pos = 0;

    blob.writeUint8(index, pos);
    pos += 1;
    blob.writeUint8(round1PublicPackages.length, pos);
    pos += 1;
    blob.writeUint16BE(round1PublicPackagesLen, pos);
    pos += 2;

    for (let i = 0; i < round1PublicPackages.length; i++) {
      blob.fill(Buffer.from(round1PublicPackages[i], "hex"), pos)
      pos += round1PublicPackagesLen;
    }

    blob.writeUint16BE(round1SecretPackageLen, pos);
    pos += 2;

    blob.fill(Buffer.from(round1SecretPackage, "hex"), pos)
    pos += round1SecretPackageLen;

    const chunks = this.prepareChunks(path, blob)

    try{
      let response = Buffer.alloc(0)
      let returnCode = 0;
      let errorCodeData = Buffer.alloc(0);
      let errorMessage = "";
      try {
        response = await this.sendDkgChunk(this.INS.DKG_ROUND_2, 1, chunks.length, chunks[0])
        // console.log("resp 0 " + response.toString("hex"))

        errorCodeData = response.subarray(-2)
        returnCode = errorCodeData[0] * 256 + errorCodeData[1]
        errorMessage = errorCodeToString(returnCode)
      }catch(e){
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
        if (returnCode !== LedgerError.NoErrors){
          return {
            returnCode,
            errorMessage
          }
        }
      }

      let data = Buffer.alloc(0)
      while(true) {
        let newData = response.subarray(0, response.length - 2)
        data = Buffer.concat([data, newData])

        if (response.length == 255) {
          response = await this.sendDkgChunk(this.INS.DKG_ROUND_2, 0, 0, Buffer.alloc(0))
          // console.log("resp " + response.toString("hex"))

          errorCodeData = response.subarray(-2)
          returnCode = errorCodeData[0] * 256 + errorCodeData[1]
          errorMessage = errorCodeToString(returnCode)

          if (returnCode !== LedgerError.NoErrors){
            return {
              returnCode,
              errorMessage
            }
          }

        } else {
          let pos = 0
          const secretPackageLen = data.readUint16BE(pos)
          pos += 2
          const secretPackage = data.subarray(pos, pos + secretPackageLen)
          pos += secretPackageLen
          const publicPackageLen = data.readUint16BE(pos)
          pos += 2
          const publicPackage = data.subarray(pos, pos + publicPackageLen)
          pos += publicPackageLen

          return {
            returnCode,
            errorMessage,
            secretPackage,
            publicPackage
          }
        }
      }

    } catch(e){
      return processErrorResponse(e)
    }
  }


  async dkgRound3(path: string, index: number, round1PublicPackages: string[], round2PublicPackages: string[], round2SecretPackage: string): Promise<ResponseDkgRound3> {
    let round1PublicPackagesLen = round1PublicPackages[0].length / 2
    let round2PublicPackagesLen = round2PublicPackages[0].length / 2
    let round2SecretPackageLen = round2SecretPackage.length / 2

    let blob = Buffer
        .alloc(1 + 1 + 2 + round1PublicPackages.length * round1PublicPackagesLen + 1 + 2 + round2PublicPackages.length * round2PublicPackagesLen + 2 + round2SecretPackageLen);
    let pos = 0;

    blob.writeUint8(index, pos);
    pos += 1;

    blob.writeUint8(round1PublicPackages.length, pos);
    pos += 1;
    blob.writeUint16BE(round1PublicPackagesLen, pos);
    pos += 2;

    for (let i = 0; i < round1PublicPackages.length; i++) {
      blob.fill(Buffer.from(round1PublicPackages[i], "hex"), pos)
      pos += round1PublicPackagesLen;
    }

    blob.writeUint8(round2PublicPackages.length, pos);
    pos += 1;
    blob.writeUint16BE(round2PublicPackagesLen, pos);
    pos += 2;

    for (let i = 0; i < round2PublicPackages.length; i++) {
      blob.fill(Buffer.from(round2PublicPackages[i], "hex"), pos)
      pos += round2PublicPackagesLen;
    }

    blob.writeUint16BE(round2SecretPackageLen, pos);
    pos += 2;

    blob.fill(Buffer.from(round2SecretPackage, "hex"), pos)
    pos += round2SecretPackageLen;

    const chunks = this.prepareChunks(path, blob)

    try{
      let response = Buffer.alloc(0)
      let returnCode = 0;
      let errorCodeData = Buffer.alloc(0);
      let errorMessage = "";
      try {
        response = await this.sendDkgChunk(this.INS.DKG_ROUND_3, 1, chunks.length, chunks[0])
        // console.log("resp 0 " + response.toString("hex"))

        errorCodeData = response.subarray(-2)
        returnCode = errorCodeData[0] * 256 + errorCodeData[1]
        errorMessage = errorCodeToString(returnCode)
      }catch(e){
        // console.log(e)
      }

      for (let i = 1; i < chunks.length; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        response = await this.sendDkgChunk(this.INS.DKG_ROUND_3, 1 + i, chunks.length, chunks[i])
        // console.log("resp " + i + " " + response.toString("hex"))

        errorCodeData = response.subarray(-2)
        returnCode = errorCodeData[0] * 256 + errorCodeData[1]
        errorMessage = errorCodeToString(returnCode)

        // console.log("returnCode " + returnCode)
        if (returnCode !== LedgerError.NoErrors){
          return {
            returnCode,
            errorMessage
          }
        }
      }

      let data = Buffer.alloc(0)
      while(true) {
        let newData = response.subarray(0, response.length - 2)
        data = Buffer.concat([data, newData])

        if (response.length == 255) {
          response = await this.sendDkgChunk(this.INS.DKG_ROUND_3, 0, 0, Buffer.alloc(0))
          // console.log("resp " + response.toString("hex"))

          errorCodeData = response.subarray(-2)
          returnCode = errorCodeData[0] * 256 + errorCodeData[1]
          errorMessage = errorCodeToString(returnCode)

          if (returnCode !== LedgerError.NoErrors){
            return {
              returnCode,
              errorMessage
            }
          }

        } else {
          return {
            returnCode,
            errorMessage
          }
        }
      }

    } catch(e){
      return processErrorResponse(e)
    }
  }
}
