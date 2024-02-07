import { describe } from 'mocha'
import {
  ArtifactsOrigin,
  InitArgs,
  artifactUrls,
  init,
  verify,
} from '@anon-aadhaar/core'
import { assert } from 'chai'
import { processAadhaarArgs, proveAndSerialize } from '../src/prove'
import { testQRData } from '../../circuits/assets/dataInput.json'

describe('PCD tests', function () {
  this.timeout(0)

  it.skip('PCD flow web prover', async function () {
    const anonAadhaarInitArgs: InitArgs = {
      wasmURL: artifactUrls.test.wasm,
      zkeyURL: artifactUrls.test.zkey,
      vkeyURL: artifactUrls.test.vk,
      artifactsOrigin: ArtifactsOrigin.server,
    }

    await init(anonAadhaarInitArgs)

    const args = await processAadhaarArgs(testQRData, true)

    const result = await proveAndSerialize(args)

    const verified = await verify(result.anonAadhaarProof)
    assert(verified == true, 'Should verifiable')
  })
})
