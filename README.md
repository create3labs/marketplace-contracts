# Marketplace Contracts based on Seaport and Reservoir 

- Seaport 1.1 Release: https://github.com/ProjectOpenSea/seaport/tree/1.1
- WZEN: taken from WETH contract on ethereum https://etherscan.io/token/0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2#code
- Reservoir Router: from https://github.com/reservoirprotocol/core/tree/main/packages/contracts. 
- Deployment of Seaport: https://github.com/ProjectOpenSea/seaport/blob/main/docs/Deployment.md


## Comments on the Reservoir Router 
- We take the V5 Router 
- We removed the support for non-seaport exchanges from the constructor for simplification. The current chain we want to serve with this repo has no non-seaport exchanges. 
- We remove the "immutable" flag for some public variables in relation with non-seaport changes to prevent compiler errors