import { errorCodeToString } from '@zondax/ledger-js'

import {ED25519_SIGNATURE_LEN, KEY_LENGTH, VERSION, REDJUBJUB_SIGNATURE_LEN, IDENTITY_LEN} from './consts'
import { IronfishKeys, KeyResponse, ResponseIdentity } from './types'

export function processGetKeysResponse(response: Buffer, keyType: IronfishKeys): KeyResponse {
  const errorCodeData = response.subarray(-2)
  const returnCode = errorCodeData[0] * 256 + errorCodeData[1]

  let requestedKey: KeyResponse = {
    returnCode: returnCode,
    errorMessage: errorCodeToString(returnCode),
  }

  switch (keyType) {
    case IronfishKeys.PublicAddress: {
      const publicAddress = Buffer.from(response.subarray(0, KEY_LENGTH))
      requestedKey = {
        ...requestedKey,
        publicAddress,
      }
      break
    }

    case IronfishKeys.ViewKey: {
      const viewKey = Buffer.from(response.subarray(0, 2 * KEY_LENGTH))
      response = response.subarray(2 * KEY_LENGTH)

      const ivk = Buffer.from(response.subarray(0, KEY_LENGTH))
      response = response.subarray(KEY_LENGTH)

      const ovk = Buffer.from(response.subarray(0, KEY_LENGTH))
      response = response.subarray(KEY_LENGTH)

      requestedKey = {
        ...requestedKey,
        viewKey,
        ivk,
        ovk,
      }
      break
    }

    case IronfishKeys.ProofGenerationKey: {
      const ak = Buffer.from(response.subarray(0, KEY_LENGTH))
      response = response.subarray(KEY_LENGTH)

      const nsk = Buffer.from(response.subarray(0, KEY_LENGTH))
      response = response.subarray(KEY_LENGTH)

      requestedKey = {
        ...requestedKey,
        ak,
        nsk,
      }
      break
    }
  }

  return requestedKey
}

export function processGetIdentityResponse(response: Buffer): ResponseIdentity {
  const errorCodeData = response.subarray(-2)
  const returnCode = errorCodeData[0] * 256 + errorCodeData[1]

  let getIdentityResponse: ResponseIdentity = {
    returnCode: returnCode,
    errorMessage: errorCodeToString(returnCode),
  }

  const identity = Buffer.from(response.subarray(0, IDENTITY_LEN))

  getIdentityResponse = {
    ...getIdentityResponse,
    identity
  }

  return getIdentityResponse
}
