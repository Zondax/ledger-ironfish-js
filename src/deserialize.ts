import { IDENTITY_LEN, TX_HASH_LEN } from './consts'

export const deserializeDkgRound1 = (data?: Buffer) => {
  if (!data) throw new Error('unexpected empty data')

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
    secretPackage,
    publicPackage,
  }
}

export const deserializeDkgRound2 = (data?: Buffer) => {
  if (!data) throw new Error('unexpected empty data')

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
    secretPackage,
    publicPackage,
  }
}

export const deserializeGetIdentities = (data?: Buffer) => {
  if (!data) throw new Error('unexpected empty data')

  const identities: Buffer[] = []
  const elements = data.length / IDENTITY_LEN
  for (let i = 0; i < elements; i++) {
    identities.push(data.subarray(i * IDENTITY_LEN, IDENTITY_LEN + i * IDENTITY_LEN))
  }

  return {
    identities,
  }
}

export const deserializeReviewTx = (data?: Buffer) => {
  if (!data) throw new Error('unexpected empty data')

  // We expect a hash of 32 bytes
  const hash = data.subarray(0, TX_HASH_LEN)

  return {
    hash,
  }
}
