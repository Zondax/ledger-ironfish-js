import { TX_HASH_LEN } from './consts'

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

export const deserializeReviewTx = (data?: Buffer) => {
  if (!data) throw new Error('unexpected empty data')

  // We expect a hash of 32 bytes
  const hash = data.subarray(0, TX_HASH_LEN)

  return {
    hash,
  }
}
