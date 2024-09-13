import { encodeRound3Inputs, minimizeRound3Inputs } from './ironfish'

export const serializeDkgRound1 = (index: number, identities: string[], minSigners: number): Buffer => {
  let blob = Buffer.alloc(1 + 1 + identities.length * 129 + 1)
  console.log(`dkgRound1 msg size: ${blob.byteLength}`)

  blob.writeUint8(index)
  blob.writeUint8(identities.length, 1)
  for (let i = 0; i < identities.length; i++) {
    blob.fill(Buffer.from(identities[i], 'hex'), 1 + 1 + i * 129)
  }
  blob.writeUint8(minSigners, 1 + 1 + identities.length * 129)

  return blob
}

export const serializeDkgRound2 = (index: number, round1PublicPackages: string[], round1SecretPackage: string): Buffer => {
  let round1PublicPackagesLen = round1PublicPackages[0].length / 2
  let round1SecretPackageLen = round1SecretPackage.length / 2

  let blob = Buffer.alloc(1 + 1 + 2 + round1PublicPackages.length * round1PublicPackagesLen + 2 + round1SecretPackageLen)
  console.log(`dkgRound2 msg size: ${blob.byteLength}`)

  let pos = 0

  blob.writeUint8(index, pos)
  pos += 1
  blob.writeUint8(round1PublicPackages.length, pos)
  pos += 1
  blob.writeUint16BE(round1PublicPackagesLen, pos)
  pos += 2

  for (let i = 0; i < round1PublicPackages.length; i++) {
    blob.fill(Buffer.from(round1PublicPackages[i], 'hex'), pos)
    pos += round1PublicPackagesLen
  }

  blob.writeUint16BE(round1SecretPackageLen, pos)
  pos += 2

  blob.fill(Buffer.from(round1SecretPackage, 'hex'), pos)
  pos += round1SecretPackageLen

  return blob
}

export const serializeDkgRound3 = (
  index: number,
  round1PublicPackages: string[],
  round2PublicPackages: string[],
  round2SecretPackage: string
): Buffer => {
  const { participants, round2PublicPkgs, round1PublicPkgs, gskBytes } = minimizeRound3Inputs(
    index,
    round1PublicPackages,
    round2PublicPackages
  )
  const blob = encodeRound3Inputs(index, participants, round1PublicPkgs, round2PublicPkgs, round2SecretPackage, gskBytes)

  return blob
}

export const serializeDkgGetCommitments = (identities: string[], tx_hash: string): Buffer => {
  let blob = Buffer.alloc(1 + identities.length * 129 + 32)
  console.log(`dkgGetCommitment msg size: ${blob.byteLength}`)

  blob.writeUint8(identities.length, 0)

  for (let i = 0; i < identities.length; i++) {
    blob.fill(Buffer.from(identities[i], 'hex'), 1 + i * 129)
  }

  blob.fill(Buffer.from(tx_hash, 'hex'), 1 + identities.length * 129)

  return blob
}

export const serializeDkgGetNonces = (identities: string[], tx_hash: string): Buffer => {
  let blob = Buffer.alloc(1 + identities.length * 129 + 32)
  console.log(`dkgGetNonces msg size: ${blob.byteLength}`)

  blob.writeUint8(identities.length, 0)

  for (let i = 0; i < identities.length; i++) {
    blob.fill(Buffer.from(identities[i], 'hex'), 1 + i * 129)
  }

  blob.fill(Buffer.from(tx_hash, 'hex'), 1 + identities.length * 129)
  return blob
}

export const serializeDkgSign = (pkRandomness: string, frostSigningPackage: string, nonces: string): Buffer => {
  let pkRandomnessLen = pkRandomness.length / 2
  let frostSigningPackageLen = frostSigningPackage.length / 2
  let noncesLen = nonces.length / 2

  let blob = Buffer.alloc(2 + pkRandomnessLen + 2 + frostSigningPackageLen + 2 + noncesLen)
  console.log(`dkgSign msg size: ${blob.byteLength}`)

  let pos = 0

  blob.writeUint16BE(pkRandomnessLen, pos)
  pos += 2
  blob.fill(Buffer.from(pkRandomness, 'hex'), pos)
  pos += pkRandomnessLen

  blob.writeUint16BE(frostSigningPackageLen, pos)
  pos += 2
  blob.fill(Buffer.from(frostSigningPackage, 'hex'), pos)
  pos += frostSigningPackageLen

  blob.writeUint16BE(noncesLen, pos)
  pos += 2
  blob.fill(Buffer.from(nonces, 'hex'), pos)

  return blob
}
