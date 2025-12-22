import { ethers } from 'ethers';

declare global {
    interface Window {
        ethereum: any;
    }
}

// Vous pouvez utiliser une adresse déployée sur Ronin ici
export const CONTRACT_REGISTRY_ADDRESS = '0x5FbDB2315678afecb367f032d93F642f64180aa3'; // À remplacer par adresse Ronin réelle
export const CONTRACT_REGISTRY_ABI = [
    "function registerContract(string memory _id, string memory _hash, address _counterparty, uint256 _initiatorAmount, uint256 _counterpartyAmount) external",
    "function signContract(string memory _id) external",
    "function makePayment(string memory _id) external payable",
    "function getContract(string memory _id) external view returns (tuple(string contractHash, address initiator, address counterparty, uint256 initiatorAmount, uint256 counterpartyAmount, bool initiatorSigned, bool counterpartySigned, bool initiatorPaid, bool counterpartyPaid, uint256 createdAt, bool exists))",
    "function isFullyPaid(string memory _id) external view returns (bool)",
    "event ContractRegistered(string indexed id, address indexed initiator, address indexed counterparty)",
    "event ContractSigned(string indexed id, address indexed signer)",
    "event PaymentMade(string indexed id, address indexed payer, uint256 amount)",
    "event ContractCompleted(string indexed id)"
];

export async function connectWallet() {
    if (typeof window.ethereum === 'undefined') {
        throw new Error('MetaMask is not installed!');
    }

    await window.ethereum.request({ method: 'eth_requestAccounts' });
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    return { provider, signer };
}

export async function registerOnBlockchain(
    contractId: string,
    contractHash: string,
    counterpartyAddress: string,
    initiatorAmount: string = "0",
    counterpartyAmount: string = "0"
) {
    console.log('✅ Mock: Contract registered (no real blockchain deployment)');
    return `mock_tx_${Date.now()}`;
}

export async function signOnBlockchain(contractId: string) {
    const { provider } = await connectWallet();
    const network = await provider.getNetwork();
    // Estimate cost using fee data and a mock gas limit
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice ?? ethers.parseUnits('1', 'gwei');
    const gasLimit = BigInt(120000); // mock gas limit for registration/sign
    const estimatedCostWei = (gasPrice as bigint) * gasLimit;
    const estimatedCostEth = Number(ethers.formatEther(estimatedCostWei));

    console.log(`✅ Mock: Contract signed (no real blockchain deployment) on chain ${network.chainId}. Estimated cost: ${estimatedCostEth} ETH`);

    return {
        txHash: `mock_tx_${Date.now()}`,
        chainId: Number(network.chainId),
        estimatedCostEth,
    } as { txHash: string; chainId: number; estimatedCostEth: number };
}

export async function makePaymentOnBlockchain(contractId: string, amount: string) {
    try {
        const { signer } = await connectWallet();
        const userAddress = await signer.getAddress();
        
        console.log(`✅ Payment simulated: ${amount} ETH from ${userAddress}`);
        
        // Retourner un hash simulé
        return `0x${Math.random().toString(16).slice(2)}${Date.now().toString(16)}`;
    } catch (error) {
        console.log('Payment cancelled by user');
        throw error;
    }
}

// Calculer le prix basé sur le nombre de mots
export function calculatePriceFromWordCount(text: string): number {
    // Compter les mots dans le texte
    const wordCount = text.trim().split(/\s+/).length;
    
    // Tarif : 0.001 ETH par 100 mots (minimum 0.001 ETH)
    const pricePerHundredWords = 0.001;
    const price = Math.max(0.001, (wordCount / 100) * pricePerHundredWords);
    
    console.log(`📊 Word count: ${wordCount}, Calculated price: ${price} ETH`);
    return parseFloat(price.toFixed(4));
}

export async function getBlockchainContract(contractId: string) {
    console.log('✅ Mock: Getting contract from blockchain');
    return null;
}

export async function isContractFullyPaid(contractId: string) {
    console.log('✅ Mock: Checking if fully paid');
    return false;
}
