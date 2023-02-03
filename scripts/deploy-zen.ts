//DOCS : https://github.com/ProjectOpenSea/seaport/blob/main/docs/Deployment.md

import { ethers } from "hardhat";
import {deployConstants} from "../constants/constants.ts";
import {
  ConsiderationInterface,
  ImmutableCreate2FactoryInterface,
} from "../typechain-types";
import { AddressZero } from "@ethersproject/constants";

const overrides = {
  gasLimit: 12500000,
};

const main = async () => {
  const signer = (await ethers.getSigners())[0];

  //KEYLESS_CREATE2_ADDRESS: we check if the right bytecode is already deployed to the KEYLESS_CREATE2_ADDRESS. If not, we fund the KEYLESS_CREATE2_DEPLOYER_ADDRESS and make the deployment

  const create2AlreadyDeployed: boolean =
    (await ethers.provider.getCode(deployConstants.KEYLESS_CREATE2_ADDRESS)) !==
    "0x";

  if (!create2AlreadyDeployed) {
    //Funding the deployer
    const tx1 = await signer.sendTransaction({
      value: ethers.utils.parseEther("0.01"),
      to: deployConstants.KEYLESS_CREATE2_DEPLOYER_ADDRESS,
    });
    await tx1.wait();
    await new Promise((r) => setTimeout(r, 2000));

    //Deploying the bytecode
    const tx2 = await ethers.provider.sendTransaction(
      deployConstants.KEYLESS_CREATE2_DEPLOYMENT_TRANSACTION
    );
    await tx2.wait();
  } else {
    console.log("Bytecode already deployed to KEYLESS_CREATE2_ADDRESS");
  }

  //INEFFICIENT_IMMUTABLE_CREATE2_FACTORY_ADDRESS: we check if the right bytecode is already deployed to the INEFFICIENT_IMMUTABLE_CREATE2_FACTORY_ADDRESS. If not, we make the deployment
  let deployedCode = await ethers.provider.getCode(
    deployConstants.INEFFICIENT_IMMUTABLE_CREATE2_FACTORY_ADDRESS
  );
  const inefficientImmutableCreate2FactoryAlreadyDeployed =
    deployedCode !== "0x";
  if (!inefficientImmutableCreate2FactoryAlreadyDeployed) {
    //we deploy the "inefficient" factory
    const tx3 = await signer.sendTransaction({
      to: deployConstants.KEYLESS_CREATE2_ADDRESS,
      data: deployConstants.IMMUTABLE_CREATE2_FACTORY_CREATION_CODE,
      ...overrides,
    });
    await tx3.wait();
  } else {
    console.log(
      "Bytecode already deployed to INEFFICIENT_IMMUTABLE_CREATE2_FACTORY_ADDRESS"
    );
  }

  //IMMUTABLE_CREATE2_FACTORY_ADDRESS: we check if the right bytecode is already deployed to the IMMUTABLE_CREATE2_FACTORY_ADDRESS. If not, we make the deployment
  deployedCode = await ethers.provider.getCode(
    deployConstants.IMMUTABLE_CREATE2_FACTORY_ADDRESS
  );
  const immutableCreate2FactoryAlreadyDeployed = deployedCode !== "0x";
  if (!immutableCreate2FactoryAlreadyDeployed) {
    const inefficientFactory = await ethers.getContractAt(
      "ImmutableCreate2FactoryInterface",
      deployConstants.INEFFICIENT_IMMUTABLE_CREATE2_FACTORY_ADDRESS,
      signer
    );
    const tx4 = await inefficientFactory
      .connect(signer)
      .safeCreate2(
        deployConstants.IMMUTABLE_CREATE2_FACTORY_SALT,
        deployConstants.IMMUTABLE_CREATE2_FACTORY_CREATION_CODE,
        overrides
      );
    await tx4.wait();
  } else {
    console.log(
      "Bytecode already deployed to IMMUTABLE_CREATE2_FACTORY_ADDRESS"
    );
  }

  //CONDUIT_CONTROLLER: we check if the right bytecode is already deployed to the CONDUIT_CONTROLLER. If not, we make the deployment
  const conduitControllerAddress = "0x00000000F9490004C11Cef243f5400493c00Ad63"; //@todo: somehow doesn't work with create2Factory.findCreate2Address
  deployedCode = await ethers.provider.getCode(conduitControllerAddress);
  const conduitControllerAlreadyDeployed = deployedCode !== "0x";
  const create2Factory: ImmutableCreate2FactoryInterface =
    await ethers.getContractAt(
      "ImmutableCreate2FactoryInterface",
      deployConstants.IMMUTABLE_CREATE2_FACTORY_ADDRESS,
      signer
    );
    
  if (!conduitControllerAlreadyDeployed) {
    // Deploy conduit controller through efficient create2 factory
    const conduitControllerFactory = await ethers.getContractFactory(
      "ConduitController"
    );
    const tx6 = await create2Factory.safeCreate2(
      deployConstants.CONDUIT_CONTROLLER_CREATION_SALT,
      conduitControllerFactory.bytecode,
      overrides
    );
    await tx6.wait();

    await new Promise((r) => setTimeout(r, 2000));

  } else {
    console.log("Bytecode already deployed to CONDUIT_CONTROLLER");
  }

  //MARKETPLACE: we check if the right bytecode is already deployed to the MARKETPLACE. If not, we make the deployment
  const marketplaceContractAddress = deployConstants.MARKETPLACE_CONTRACT_ADDRESS; //@todo: somehow doesn't work with create2Factory.findCreate2Address
  deployedCode = await ethers.provider.getCode(marketplaceContractAddress);
  const marketplaceAlreadyDeployed = deployedCode !== "0x";
  const conduitController = (await ethers.getContractAt(
    "ConduitController",
    conduitControllerAddress,
    signer
  )) as any;

  if (!marketplaceAlreadyDeployed) {
    const conduitKeyOne = `${signer.address}000000000000000000000000`;    

    const { conduit: conduitOneAddress, exists } =
      await conduitController.getConduit(conduitKeyOne);

    if (!exists) {
      await conduitController.createConduit(conduitKeyOne, signer.address);
    }

    await create2Factory.safeCreate2(
      deployConstants.MARKETPLACE_CONTRACT_CREATION_SALT,
      deployConstants.MARKETPLACE_CREATION_CODE,
      overrides
    );
  } else {
    console.log("Bytecode already deployed to MARKETPLACE");
  }

  const marketplaceContract = (await ethers.getContractAt(
    "Seaport",
    marketplaceContractAddress,
    signer
  )) as ConsiderationInterface;

  if ((await marketplaceContract.callStatic.name()) !== "Seaport") {
    throw new Error("Name of Marketplace Contract is not Seaport");
  }

  console.log(
    `Create 2 factory deployed to: ${create2Factory.address}\nConduit controller deployed to: ${conduitController.address}\nMarketplace deployed to: ${marketplaceContract.address}`
  );

  // Deploying a Wrapped Native
  const [deployer] = await ethers.getSigners();
  const wrappedNative = await ethers
    .getContractFactory("WZEN9", deployer)
    .then((factory) => factory.deploy());
  console.log(`Wrapped Native deployed at ${wrappedNative.address}`);

  // Deploying the Reservoir Router
  const args = [
    wrappedNative.address, //Wrapped Native
    AddressZero,
    AddressZero,
    AddressZero,
    AddressZero,
    AddressZero,
    AddressZero,
    "0x00000000006c3852cbef3e08e8df289169ede581",
  ] as const;

  const router = await ethers
    .getContractFactory("ReservoirV5_0_0", deployer)
    .then((factory) => factory.deploy(...args));

  console.log(`"ReservoirV5_0_0" was deployed at address ${router.address}`);
};

main();
