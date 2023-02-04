import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: {
    // from https://github.com/ProjectOpenSea/seaport/blob/1.1/hardhat.config.ts
    compilers: [
      {
        version: "0.8.14",
        settings: {
          viaIR: true,
          optimizer: {
            enabled: true,
            runs: 19066,
          },
        },
      },
      {
        version: "0.4.22",
        settings: {
          optimizer: {
            enabled: true,
            runs: 1000,
          },
        },
      },
    ],
    overrides: {
      "contracts/conduit/Conduit.sol": {
        version: "0.8.14",
        settings: {
          viaIR: true,
          optimizer: {
            enabled: true,
            runs: 1000000,
          },
        },
      },
      "contracts/conduit/ConduitController.sol": {
        version: "0.8.14",
        settings: {
          viaIR: true,
          optimizer: {
            enabled: true,
            runs: 1000000,
          },
        },
      },
    },
  },
  networks: {
    zenTest: {
      chainId: 1661,
      ...(process.env.PK_ZEN_TEST_DEPLOYER && {
        accounts: [process.env.PK_ZEN_TEST_DEPLOYER ?? ""],
      }),
      url: process.env.ZEN_TEST_RPC_URL ?? "",
    },
  },
};

export default config;
