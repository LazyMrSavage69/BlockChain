// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract ContractRegistry {
    enum ContractStatus { Created, Active, Completed, Disputed }

    struct ContractData {
        string contractHash;
        address initiator;
        address counterparty;
        bool initiatorSigned;
        bool counterpartySigned;
        uint256 createdAt;
        bool exists;
    }

    mapping(string => ContractData) public contracts;
    mapping(address => string[]) public userContracts;

    event ContractRegistered(string indexed id, address indexed initiator, address indexed counterparty);
    event ContractSigned(string indexed id, address indexed signer);

    function registerContract(string memory _id, string memory _hash, address _counterparty) external {
        require(!contracts[_id].exists, "Contract ID already exists");
        require(msg.sender != _counterparty, "Counterparty cannot be same as initiator");

        contracts[_id] = ContractData({
            contractHash: _hash,
            initiator: msg.sender,
            counterparty: _counterparty,
            initiatorSigned: false,
            counterpartySigned: false,
            createdAt: block.timestamp,
            exists: true
        });

        userContracts[msg.sender].push(_id);
        userContracts[_counterparty].push(_id);

        emit ContractRegistered(_id, msg.sender, _counterparty);
    }

    function signContract(string memory _id) external {
        require(contracts[_id].exists, "Contract does not exist");
        ContractData storage c = contracts[_id];

        require(msg.sender == c.initiator || msg.sender == c.counterparty, "Not a party to this contract");

        if (msg.sender == c.initiator) {
            require(!c.initiatorSigned, "Already signed by initiator");
            c.initiatorSigned = true;
        } else {
            require(!c.counterpartySigned, "Already signed by counterparty");
            c.counterpartySigned = true;
        }

        emit ContractSigned(_id, msg.sender);
    }

    function getContract(string memory _id) external view returns (ContractData memory) {
        require(contracts[_id].exists, "Contract does not exist");
        return contracts[_id];
    }
}
