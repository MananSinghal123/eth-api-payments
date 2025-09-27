import { createPublicClient, http, formatUnits, parseUnits } from 'viem'
import { sepolia } from 'viem/chains'

const PYUSD_ADDRESS = '0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9'
const ESCROW_ADDRESS = '0x6E5559e7Cf01860416ff9CbEcC3bbdC1f05dB3D0'
const USER_ADDRESS = '0x5335C007d0F317B07D21d9837d83f863b2e14e3C'

const ERC20_ABI = [
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" }
    ],
    name: "allowance",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function"
  }
]

const ESCROW_ABI = [
  {
    inputs: [{ name: "amountUSD", type: "uint256" }],
    name: "deposit",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [],
    name: "paused",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ name: "user", type: "address" }],
    name: "balances",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "pyusdToken",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function"
  }
]

const client = createPublicClient({
  chain: sepolia,
  transport: http('https://ethereum-sepolia-rpc.publicnode.com')
})

async function debugContractInteraction() {
  console.log('🔍 === COMPREHENSIVE CONTRACT DEBUG ===')
  console.log('📍 User:', USER_ADDRESS)
  console.log('🏦 PYUSD:', PYUSD_ADDRESS)
  console.log('🔐 Escrow:', ESCROW_ADDRESS)
  console.log('')

  try {
    // 1. Check PYUSD token info
    console.log('💰 === PYUSD TOKEN INFO ===')
    const decimals = await client.readContract({
      address: PYUSD_ADDRESS,
      abi: ERC20_ABI,
      functionName: 'decimals'
    })
    console.log('Decimals:', decimals)

    const balance = await client.readContract({
      address: PYUSD_ADDRESS,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [USER_ADDRESS]
    })
    console.log('User Balance:', formatUnits(balance, decimals), 'PYUSD')
    console.log('User Balance (raw):', balance.toString())

    const allowance = await client.readContract({
      address: PYUSD_ADDRESS,
      abi: ERC20_ABI,
      functionName: 'allowance',
      args: [USER_ADDRESS, ESCROW_ADDRESS]
    })
    console.log('Allowance:', formatUnits(allowance, decimals), 'PYUSD')
    console.log('Allowance (raw):', allowance.toString())
    console.log('')

    // 2. Check Escrow contract status
    console.log('🔐 === ESCROW CONTRACT STATUS ===')
    
    try {
      const isPaused = await client.readContract({
        address: ESCROW_ADDRESS,
        abi: ESCROW_ABI,
        functionName: 'paused'
      })
      console.log('Contract Paused:', isPaused)
    } catch (pausedError) {
      console.log('⚠️  Cannot check paused status (function might not exist):', pausedError.message)
    }

    try {
      const escrowBalance = await client.readContract({
        address: ESCROW_ADDRESS,
        abi: ESCROW_ABI,
        functionName: 'balances',
        args: [USER_ADDRESS]
      })
      console.log('User Escrow Balance:', formatUnits(escrowBalance, 6), 'USD')
      console.log('User Escrow Balance (raw):', escrowBalance.toString())
    } catch (balanceError) {
      console.log('⚠️  Cannot check escrow balance:', balanceError.message)
    }

    try {
      const pyusdTokenInContract = await client.readContract({
        address: ESCROW_ADDRESS,
        abi: ESCROW_ABI,
        functionName: 'pyusdToken'
      })
      console.log('PYUSD Token in contract:', pyusdTokenInContract)
      console.log('Matches expected:', pyusdTokenInContract.toLowerCase() === PYUSD_ADDRESS.toLowerCase())
    } catch (tokenError) {
      console.log('⚠️  Cannot check PYUSD token address:', tokenError.message)
    }
    console.log('')

    // 3. Test gas estimation for deposit
    console.log('⛽ === GAS ESTIMATION TEST ===')
    const testAmounts = [1n, 5n, 10n] // $1, $5, $10
    
    for (const amountUSD of testAmounts) {
      try {
        console.log(`Testing $${amountUSD} deposit:`)
        
        const gasEstimate = await client.estimateContractGas({
          address: ESCROW_ADDRESS,
          abi: ESCROW_ABI,
          functionName: 'deposit',
          args: [amountUSD],
          account: USER_ADDRESS
        })
        
        console.log(`  ✅ Gas estimate: ${gasEstimate} gas`)
        
        // Check if user has enough PYUSD for this amount
        const requiredTokens = amountUSD * BigInt(10 ** decimals)
        console.log(`  Required PYUSD tokens: ${formatUnits(requiredTokens, decimals)}`)
        console.log(`  Has enough balance: ${balance >= requiredTokens}`)
        console.log(`  Has enough allowance: ${allowance >= requiredTokens}`)
        
      } catch (gasError) {
        console.log(`  ❌ Gas estimation failed: ${gasError.message}`)
        if (gasError.cause) {
          console.log(`  Cause: ${gasError.cause}`)
        }
      }
      console.log('')
    }

    // 4. Check contract code exists
    console.log('📜 === CONTRACT CODE CHECK ===')
    const escrowCode = await client.getBytecode({ address: ESCROW_ADDRESS })
    console.log('Escrow contract has code:', !!escrowCode && escrowCode !== '0x')
    if (escrowCode) {
      console.log('Code length:', escrowCode.length)
    }

    const pyusdCode = await client.getBytecode({ address: PYUSD_ADDRESS })
    console.log('PYUSD contract has code:', !!pyusdCode && pyusdCode !== '0x')
    if (pyusdCode) {
      console.log('Code length:', pyusdCode.length)
    }

  } catch (error) {
    console.error('❌ Debug failed:', error)
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      cause: error.cause
    })
  }
}

debugContractInteraction()