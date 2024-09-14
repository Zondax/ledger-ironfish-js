export const deserializeDkgRound1 = (data?: Buffer) => {
  if (!data) return {}

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
  if (!data) return {}

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
