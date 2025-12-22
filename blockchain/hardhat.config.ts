import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from 'dotenv';

dotenv.config();

const config: HardhatUserConfig = {
    solidity: "0.8.24",
    networks: {
        localhost: {
            url: "http://127.0.0.1:8545",
            chainId: 31337,
        },
        ronin: {
            url: "https://api.roninchain.com/rpc",
            chainId: 2020,
            accounts: process.env.RONIN_PRIVATE_KEY ? [process.env.RONIN_PRIVATE_KEY] : [],
        },
        "ronin-testnet": {
            url: "https://saigon-api.roninchain.com/rpc",
            chainId: 2021,
            accounts: process.env.RONIN_TESTNET_PRIVATE_KEY ? [process.env.RONIN_TESTNET_PRIVATE_KEY] : [],
        },
    },
};

export default config;
