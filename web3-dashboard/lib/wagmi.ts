import { createConfig, http } from 'wagmi'
import { sepolia, arbitrumSepolia, optimismSepolia } from 'wagmi/chains'
import { injected } from 'wagmi/connectors'

export const config = createConfig({
  // Auto-connect attempts to reconnect when a user revisits the dApp.
  chains: [sepolia, arbitrumSepolia, optimismSepolia],
  connectors: [
    injected(), // For wallets injected into the browser (like MetaMask)
  ],
  transports: {
    [sepolia.id]: http(),
    [arbitrumSepolia.id]: http(),
    [optimismSepolia.id]: http(),
  },
})