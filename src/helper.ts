import { ResponsePayload } from '@zondax/ledger-js/dist/payload'

import { ED25519_SIGNATURE_LEN, IDENTITY_LEN, KEY_LENGTH, REDJUBJUB_SIGNATURE_LEN, VERSION } from './consts'
import { IronfishKeys, KeyResponse, ResponseIdentity } from './types'

export function processGetKeysResponse(response: ResponsePayload, keyType: IronfishKeys): KeyResponse {
  switch (keyType) {
    case IronfishKeys.PublicAddress: {
      const publicAddress = response.readBytes(KEY_LENGTH)
      return {
        publicAddress,
      }
    }

    case IronfishKeys.ViewKey: {
      const viewKey = response.readBytes(2 * KEY_LENGTH)
      const ivk = response.readBytes(KEY_LENGTH)
      const ovk = response.readBytes(KEY_LENGTH)

      return {
        viewKey,
        ivk,
        ovk,
      }
    }

    case IronfishKeys.ProofGenerationKey: {
      const ak = response.readBytes(KEY_LENGTH)
      const nsk = response.readBytes(KEY_LENGTH)

      return {
        ak,
        nsk,
      }
    }
  }
}

export function processGetIdentityResponse(response: ResponsePayload): ResponseIdentity {
  const identity = response.readBytes(IDENTITY_LEN)

  return { identity }
}
