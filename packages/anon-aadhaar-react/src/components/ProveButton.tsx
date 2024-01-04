import { ArgumentTypeName } from '@pcd/pcd-types'
import styled from 'styled-components'
import { Dispatch, useContext, SetStateAction } from 'react'
import { AnonAadhaarContext } from '../hooks/useAnonAadhaar'
import { Spinner } from './LoadingSpinner'
import React from 'react'
import {
  extractWitness,
  AnonAadhaarPCDArgs,
  splitToWords,
} from 'anon-aadhaar-pcd'

interface ProveButtonProps {
  qrData: string | null
  provingEnabled: boolean
  setErrorMessage: Dispatch<SetStateAction<string | null>>
}

export const ProveButton: React.FC<ProveButtonProps> = ({
  qrData,
  provingEnabled,
  setErrorMessage,
}) => {
  const { state, startReq } = useContext(AnonAadhaarContext)

  const startProving = async () => {
    try {
      if (qrData === null) throw new Error('Missing application Id!')

      const witness = await extractWitness(qrData)

      if (witness instanceof Error) throw new Error(witness.message)

      const args: AnonAadhaarPCDArgs = {
        padded_message: {
          argumentType: ArgumentTypeName.StringArray,
          value: witness.paddedMessage,
        },
        message_len: {
          argumentType: ArgumentTypeName.Number,
          value: witness.messageLength.toString(),
        },
        signature: {
          argumentType: ArgumentTypeName.StringArray,
          value: splitToWords(witness.signatureBigint, BigInt(64), BigInt(32)),
        },
        modulus: {
          argumentType: ArgumentTypeName.StringArray,
          value: splitToWords(witness.modulusBigint, BigInt(64), BigInt(32)),
        },
      }

      console.log(args)

      startReq({ type: 'login', args })
    } catch (error) {
      console.log(error)
      if (error instanceof Error) setErrorMessage(error.message)
    }
  }

  return (() => {
    switch (state.status) {
      case 'logged-out':
        return (
          <Btn disabled={!provingEnabled} onClick={startProving}>
            {' '}
            Request Aadhaar Proof{' '}
          </Btn>
        )
      case 'logging-in':
        return (
          <Btn>
            Generating proof...
            {'\u2003'}
            <Spinner />
          </Btn>
        )
    }
  })()
}

const Btn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem 1rem;
  font-size: 1rem;
  cursor: pointer;
  color: #f8f8f8;
  font-weight: bold;
  box-shadow: 0px 0.25rem 0.75rem rgba(0, 0, 0, 0.1);
  border: none;
  min-width: 12rem;
  min-height: 3rem;
  border-radius: 0.5rem;
  background: linear-gradient(345deg, #10fe53 0%, #09d3ff 100%);
  margin: 1rem;

  &:hover {
    opacity: 70%;
    background: linear-gradient(345deg, #10fe53 0%, #09d3ff 100%);
  }

  &:active {
    background: #f8f8f8;
  }

  &:disabled {
    color: #a8aaaf;
    background: #e8e8e8;
    cursor: default;
  }
`
