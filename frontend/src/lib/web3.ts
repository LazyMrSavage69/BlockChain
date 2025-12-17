import { ethers } from 'ethers';

declare global {
    interface Window {
        ethereum: any;
    }
}

export const CONTRACT_REGISTRY_ADDRESS = '0x5FbDB2315678afecb367f032d93F642f64180aa3'; // Localhost deployment address
export const CONTRACT_REGISTRY_ABI = [
    "function registerContract(string memory _id, string memory _hash, address _counterparty) external",
    "function signContract(string memory _id) external",
    "function getContract(string memory _id) external view returns (tuple(string contractHash, address initiator, address counterparty, bool initiatorSigned, bool counterpartySigned, uint256 createdAt, bool exists))",
    "event ContractRegistered(string indexed id, address indexed initiator, address indexed counterparty)",
    "event ContractSigned(string indexed id, address indexed signer)"
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
    counterpartyAddress: string
) {
    const { signer } = await connectWallet();
    const contract = new ethers.Contract(CONTRACT_REGISTRY_ADDRESS, CONTRACT_REGISTRY_ABI, signer);

    const tx = await contract.registerContract(contractId, contractHash, counterpartyAddress);
    console.log('Transaction sent:', tx.hash);
    await tx.wait();
    return tx.hash;
}

export async function signOnBlockchain(contractId: string) {
    const { signer } = await connectWallet();
    const contract = new ethers.Contract(CONTRACT_REGISTRY_ADDRESS, CONTRACT_REGISTRY_ABI, signer);

    const tx = await contract.signContract(contractId);
    console.log('Transaction sent:', tx.hash);
    await tx.wait();
    return tx.hash;
}

export async function getBlockchainContract(contractId: string) {
    const { provider } = await connectWallet();
    const contract = new ethers.Contract(CONTRACT_REGISTRY_ADDRESS, CONTRACT_REGISTRY_ABI, provider);
    return await contract.getContract(contractId);
}
