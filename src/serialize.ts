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

export const serializeDkgRound3Min = (
  index: number,
  participants: string[],
  round1PublicPkgs: string[],
  round2PublicPkgs: string[],
  round2SecretPackage: string,
  gskBytes: string[]
): Buffer => {
  let round1PublicPkgsLen = round1PublicPkgs[0].length / 2
  let round2PublicPkgsLen = round2PublicPkgs[0].length / 2
  let round2SecretPkgLen = round2SecretPackage.length / 2 // staying the same
  let participantsLen = participants[0].length / 2
  let gskLen = gskBytes[0].length / 2

  let blob = Buffer.alloc(
    1 +
      1 +
      2 +
      round1PublicPkgs.length * round1PublicPkgsLen +
      1 +
      2 +
      round2PublicPkgs.length * round2PublicPkgsLen +
      2 +
      round2SecretPkgLen +
      1 +
      2 +
      participants.length * participantsLen +
      1 +
      2 +
      gskBytes.length * gskLen
  )
  console.log(`dkgRound3 msg size: ${blob.byteLength}`)

  let pos = 0

  // identity index
  blob.writeUint8(index, pos)
  pos += 1

  // number of round 1 packages
  blob.writeUint8(round1PublicPkgs.length, pos)
  pos += 1

  // round 1 package length
  blob.writeUint16BE(round1PublicPkgsLen, pos)
  pos += 2

  // round 1 packages
  for (let i = 0; i < round1PublicPkgs.length; i++) {
    blob.fill(Buffer.from(round1PublicPkgs[i], 'hex'), pos)
    pos += round1PublicPkgsLen
  }

  // number of round 2 packages
  blob.writeUint8(round2PublicPkgs.length, pos)
  pos += 1
  // round 2 package length
  blob.writeUint16BE(round2PublicPkgsLen, pos)
  pos += 2

  // round 2 packages
  for (let i = 0; i < round2PublicPkgs.length; i++) {
    blob.fill(Buffer.from(round2PublicPkgs[i], 'hex'), pos)
    pos += round2PublicPkgsLen
  }

  // round 2 secret
  blob.writeUint16BE(round2SecretPkgLen, pos)
  pos += 2

  blob.fill(Buffer.from(round2SecretPackage, 'hex'), pos)
  pos += round2SecretPkgLen

  // participants
  // number of participants
  blob.writeUint8(participants.length, pos)
  pos += 1

  // participant payload length
  blob.writeUint16BE(participantsLen, pos)
  pos += 2

  for (let i = 0; i < participants.length; i++) {
    blob.fill(Buffer.from(participants[i], 'hex'), pos)
    pos += participantsLen
  }

  // gsk_bytes
  blob.writeUint8(gskBytes.length, pos)
  pos += 1

  blob.writeUint16BE(gskLen, pos)
  pos += 2

  for (let i = 0; i < gskBytes.length; i++) {
    blob.fill(Buffer.from(gskBytes[i], 'hex'), pos)
    pos += gskLen
  }

  return blob
}

export const serializeDkgGetCommitments = (tx_hash: string): Buffer => {
  let blob = Buffer.alloc(32)
  console.log(`dkgGetCommitment msg size: ${blob.byteLength}`)

  blob.fill(Buffer.from(tx_hash, 'hex'), 0)

  return blob
}

export const serializeDkgSign = (pkRandomness: string, frostSigningPackage: string, txHash: string): Buffer => {
  let pkRandomnessLen = pkRandomness.length / 2
  let frostSigningPackageLen = frostSigningPackage.length / 2
  let txHashLen = 32

  let blob = Buffer.alloc(2 + pkRandomnessLen + 2 + frostSigningPackageLen + txHashLen)
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

  blob.fill(Buffer.from(txHash, 'hex'), pos)

  return blob
}
