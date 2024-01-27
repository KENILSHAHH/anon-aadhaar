import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers'
import { expect } from 'chai'
import { ethers } from 'hardhat'
import {
  InitArgs,
  init,
  generateArgs,
  prove,
  WASM_URL,
  ZKEY_URL,
  VK_URL,
  AnonAadhaarProof,
  PackedGroth16Proof,
  packGroth16Proof,
} from '../../core/src'
import { testQRData } from '../../circuits/assets/dataInput.json'
import fs from 'fs'

describe('VerifyProof', function () {
  this.timeout(0)

  let packedGroth16Proof: PackedGroth16Proof
  let anonAadhaarProof: AnonAadhaarProof
  let certificate: string
  let user1addres: string

  this.beforeAll(async () => {
    const certificateDirName = __dirname + '/../../circuits/assets'
    certificate = fs
      .readFileSync(certificateDirName + '/uidai_prod_cdup.cer')
      .toString()

    const anonAadhaarInitArgs: InitArgs = {
      wasmURL: WASM_URL,
      zkeyURL: ZKEY_URL,
      vkeyURL: VK_URL,
      isWebEnv: true,
    }

    const [user1] = await ethers.getSigners()
    user1addres = user1.address

    await init(anonAadhaarInitArgs)

    const args = await generateArgs(testQRData, certificate, user1addres)

    const anonAadhaarCore = await prove(args)

    anonAadhaarProof = anonAadhaarCore.proof

    packedGroth16Proof = packGroth16Proof(anonAadhaarProof.groth16Proof)
  })

  async function deployOneYearLockFixture() {
    const Verifier = await ethers.getContractFactory('Verifier')
    const verifier = await Verifier.deploy()

    const _verifierAddress = await verifier.getAddress()

    const pubkeyHashBigInt = BigInt(
      '14283653287016348311748048156110700109007577525298584963450140859470242476430',
    ).toString()

    const AnonAadhaarContract = await ethers.getContractFactory('AnonAadhaar')
    const anonAadhaarVerifier = await AnonAadhaarContract.deploy(
      _verifierAddress,
      pubkeyHashBigInt,
    )

    const _AnonAadhaarAddress = await anonAadhaarVerifier.getAddress()

    const AnonAadhaarVote = await ethers.getContractFactory('AnonAadhaarVote')
    const anonAadhaarVote = await AnonAadhaarVote.deploy(
      'Do you like this app?',
      ['yes', 'no', 'maybe'],
      _AnonAadhaarAddress,
    )

    return {
      anonAadhaarVerifier,
      anonAadhaarVote,
    }
  }

  describe('AnonAadhaarVote Contract', function () {
    describe('verifyAnonAadhaarProof', function () {
      it('Should return true for a valid PCD proof', async function () {
        const { anonAadhaarVerifier } = await loadFixture(
          deployOneYearLockFixture,
        )

        expect(
          await anonAadhaarVerifier.verifyAnonAadhaarProof(
            anonAadhaarProof.identityNullifier,
            anonAadhaarProof.userNullifier,
            anonAadhaarProof.timestamp,
            user1addres,
            packedGroth16Proof,
          ),
        ).to.be.equal(true)
      })

      it('Should revert for a wrong signal', async function () {
        const { anonAadhaarVerifier } = await loadFixture(
          deployOneYearLockFixture,
        )

        expect(
          await anonAadhaarVerifier.verifyAnonAadhaarProof(
            anonAadhaarProof.identityNullifier,
            anonAadhaarProof.userNullifier,
            anonAadhaarProof.timestamp,
            40,
            packedGroth16Proof,
          ),
        ).to.be.equal(false)
      })
    })
  })

  describe('AnonAadhaar Vote', function () {
    describe('Vote for a proposal', function () {
      it('Should revert if signal is different from senderss address', async function () {
        const { anonAadhaarVote } = await loadFixture(deployOneYearLockFixture)

        const [, , user2] = await ethers.getSigners()

        await expect(
          (
            anonAadhaarVote.connect(user2) as typeof anonAadhaarVote
          ).voteForProposal(
            0,
            anonAadhaarProof.identityNullifier,
            anonAadhaarProof.userNullifier,
            anonAadhaarProof.timestamp,
            user1addres,
            packedGroth16Proof,
          ),
        ).to.be.revertedWith('[AnonAadhaarVote]: wrong user signal sent.')
      })

      it('Should verify a proof with right address in signal', async function () {
        const { anonAadhaarVote } = await loadFixture(deployOneYearLockFixture)

        await expect(
          anonAadhaarVote.voteForProposal(
            0,
            anonAadhaarProof.identityNullifier,
            anonAadhaarProof.userNullifier,
            anonAadhaarProof.timestamp,
            user1addres,
            packedGroth16Proof,
          ),
        ).to.emit(anonAadhaarVote, 'Voted')
      })
    })
  })
})
