import { deserializePublicPackage, deserializeRound2CombinedPublicPackage } from '@ironfish/rust-nodejs'

export const minimizeRound3Inputs = (index: number, round1PublicPackages: string[], round2PublicPackages: string[]) => {
  let round1Pkgs = round1PublicPackages.map(p => deserializePublicPackage(p))
  let round2Pkgs = round2PublicPackages.map(p => deserializeRound2CombinedPublicPackage(p))

  let identity: string = ''

  const participants: string[] = []
  const round1PublicPkgs: string[] = []
  const round2PublicPkgs: string[] = []
  const gskBytes: string[] = []

  for (let i = 0; i < round1Pkgs.length; i++) {
    gskBytes.push(round1Pkgs[i].groupSecretKeyShardEncrypted)

    // TODO: is the index 0-indexed?
    if (i == index) {
      identity = round1Pkgs[i].identity
    } else {
      participants.push(round1Pkgs[i].identity)
      round1PublicPkgs.push(round1Pkgs[i].frostPackage)
    }
  }

  for (let i = 0; i < round2Pkgs.length; i++) {
    for (let j = 0; j < round2Pkgs[i].packages.length; j++) {
      if (round2Pkgs[i].packages[j].recipientIdentity == identity) {
        round2PublicPkgs.push(round2Pkgs[i].packages[j].frostPackage)
      }
    }
  }

  return {
    participants,
    round1PublicPkgs,
    round2PublicPkgs,
    gskBytes,
  }
}

export const encodeRound3Inputs = (
  index: number,
  participants: string[],
  round1PublicPkgs: string[],
  round2PublicPkgs: string[],
  round2SecretPackage: string,
  gskBytes: string[]
) => {
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
