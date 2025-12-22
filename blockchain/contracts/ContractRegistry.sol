// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract ContractRegistry {
    enum ContractStatus { Created, Active, Completed, Disputed }

    struct ContractData {
        string contractHash;
        address initiator;
        address counterparty;
        uint256 initiatorAmount;
        uint256 counterpartyAmount;
        bool initiatorSigned;
        bool counterpartySigned;
        bool initiatorPaid;
        bool counterpartyPaid;
        uint256 createdAt;
        bool exists;
    }

    mapping(string => ContractData) public contracts;
    mapping(address => string[]) public userContracts;

    event ContractRegistered(string indexed id, address indexed initiator, address indexed counterparty);
    event ContractSigned(string indexed id, address indexed signer);
    event PaymentMade(string indexed id, address indexed payer, uint256 amount);
    event ContractCompleted(string indexed id);

    function registerContract(
        string memory _id, 
        string memory _hash, 
        address _counterparty,
        uint256 _initiatorAmount,
        uint256 _counterpartyAmount
    ) external {
        require(!contracts[_id].exists, "Contract ID already exists");
        require(msg.sender != _counterparty, "Counterparty cannot be same as initiator");

        contracts[_id] = ContractData({
            contractHash: _hash,
            initiator: msg.sender,
            counterparty: _counterparty,
            initiatorAmount: _initiatorAmount,
            counterpartyAmount: _counterpartyAmount,
            initiatorSigned: false,
            counterpartySigned: false,
            initiatorPaid: false,
            counterpartyPaid: false,
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

    function makePayment(string memory _id) external payable {
        require(contracts[_id].exists, "Contract does not exist");
        ContractData storage c = contracts[_id];

        require(msg.sender == c.initiator || msg.sender == c.counterparty, "Not a party to this contract");

        if (msg.sender == c.initiator) {
            require(!c.initiatorPaid, "Already paid by initiator");
            require(msg.value == c.initiatorAmount, "Incorrect payment amount");
            c.initiatorPaid = true;
        } else {
            require(!c.counterpartyPaid, "Already paid by counterparty");
            require(msg.value == c.counterpartyAmount, "Incorrect payment amount");
            c.counterpartyPaid = true;
        }

        emit PaymentMade(_id, msg.sender, msg.value);

        // If both parties have paid, mark contract as completed
        if (c.initiatorPaid && c.counterpartyPaid) {
            emit ContractCompleted(_id);
        }
    }

    function getContract(string memory _id) external view returns (ContractData memory) {
        require(contracts[_id].exists, "Contract does not exist");
        return contracts[_id];
    }

    function isFullyPaid(string memory _id) external view returns (bool) {
        require(contracts[_id].exists, "Contract does not exist");
        ContractData storage c = contracts[_id];
        return c.initiatorPaid && c.counterpartyPaid;
    }
}
