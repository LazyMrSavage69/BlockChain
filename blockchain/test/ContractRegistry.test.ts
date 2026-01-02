import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract } from "ethers";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("ContractRegistry", function () {
    let contractRegistry: Contract;
    let owner: SignerWithAddress;
    let counterparty: SignerWithAddress;
    let otherAccount: SignerWithAddress;

    beforeEach(async function () {
        // Get signers
        [owner, counterparty, otherAccount] = await ethers.getSigners();

        // Deploy contract
        const ContractRegistry = await ethers.getContractFactory("ContractRegistry");
        contractRegistry = await ContractRegistry.deploy();
        await contractRegistry.waitForDeployment();
    });

    describe("registerContract", function () {
        it("Should register a contract successfully", async function () {
            const id = "contract-123";
            const hash = "hash-123";
            const initiatorAmount = ethers.parseEther("1");
            const counterpartyAmount = ethers.parseEther("1");

            await contractRegistry.registerContract(
                id,
                hash,
                counterparty.address,
                initiatorAmount,
                counterpartyAmount
            );

            const contractData = await contractRegistry.getContract(id);

            expect(contractData.contractHash).to.equal(hash);
            expect(contractData.initiator).to.equal(owner.address);
            expect(contractData.counterparty).to.equal(counterparty.address);
            expect(contractData.exists).to.be.true;
        });

        it("Should emit ContractRegistered event", async function () {
            const id = "contract-event";
            const hash = "hash-event";
            const initiatorAmount = ethers.parseEther("0.5");
            const counterpartyAmount = ethers.parseEther("0.5");

            await expect(contractRegistry.registerContract(
                id,
                hash,
                counterparty.address,
                initiatorAmount,
                counterpartyAmount
            ))
                .to.emit(contractRegistry, "ContractRegistered")
                .withArgs(id, owner.address, counterparty.address);
        });

        it("Should fail if contract ID already exists", async function () {
            const id = "duplicate-id";
            const hash = "hash";

            await contractRegistry.registerContract(
                id, hash, counterparty.address, 0, 0
            );

            await expect(contractRegistry.registerContract(
                id, "hash2", counterparty.address, 0, 0
            )).to.be.revertedWith("Contract ID already exists");
        });
    });

    describe("signContract", function () {
        const id = "sign-test";

        beforeEach(async function () {
            await contractRegistry.registerContract(
                id, "hash", counterparty.address, 0, 0
            );
        });

        it("Should allow initiator to sign", async function () {
            await contractRegistry.signContract(id);
            const data = await contractRegistry.getContract(id);
            expect(data.initiatorSigned).to.be.true;
        });

        it("Should allow counterparty to sign", async function () {
            await contractRegistry.connect(counterparty).signContract(id);
            const data = await contractRegistry.getContract(id);
            expect(data.counterpartySigned).to.be.true;
        });

        it("Should emit ContractSigned event", async function () {
            await expect(contractRegistry.signContract(id))
                .to.emit(contractRegistry, "ContractSigned")
                .withArgs(id, owner.address);
        });

        it("Should fail if signer is not a party", async function () {
            await expect(
                contractRegistry.connect(otherAccount).signContract(id)
            ).to.be.revertedWith("Not a party to this contract");
        });
    });

    describe("makePayment", function () {
        const id = "payment-test";
        const amount = ethers.parseEther("1");

        beforeEach(async function () {
            await contractRegistry.registerContract(
                id, "hash", counterparty.address, amount, amount
            );
        });

        it("Should allow payment with correct amount", async function () {
            await contractRegistry.makePayment(id, { value: amount });
            const data = await contractRegistry.getContract(id);
            expect(data.initiatorPaid).to.be.true;
        });

        it("Should fail with incorrect amount", async function () {
            await expect(
                contractRegistry.makePayment(id, { value: ethers.parseEther("0.5") })
            ).to.be.revertedWith("Incorrect payment amount");
        });

        it("Should emit ContractCompleted when both pay", async function () {
            await contractRegistry.makePayment(id, { value: amount });

            await expect(
                contractRegistry.connect(counterparty).makePayment(id, { value: amount })
            ).to.emit(contractRegistry, "ContractCompleted")
                .withArgs(id);

            const isPaid = await contractRegistry.isFullyPaid(id);
            expect(isPaid).to.be.true;
        });
    });
});
