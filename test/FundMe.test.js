const { deployments, ethers, getNamedAccounts } = require("hardhat");
const { assert, expect } = require("chai");

describe("FundMe", function () {
    let fundMe;
    let deployer;
    let mockV3Aggregator;
    const sendValue = ethers.utils.parseEther("1"); //1 eth

    beforeEach(async () => {
        //obtiene cuenta que ha desplegado el contrato
        deployer = (await getNamedAccounts()).deployer;

        //deploy fundme contract con hardhat deploy
        await deployments.fixture(["all"]);

        //obtiene último contrato desplegado del archivo FundMe (en carpeta deployments)
        fundMe = await ethers.getContract("FundMe", deployer);

        //obtiene último contrato desplegado del archivo MockV3Aggregator (en carpeta deployments)
        mockV3Aggregator = await ethers.getContract(
            "MockV3Aggregator",
            deployer
        );
    });

    describe("constructor", function () {
        it("sets the aggregator addresses correctly", async () => {
            const response = await fundMe.getPriceFeed();
            assert.equal(response, mockV3Aggregator.address);
        });
    });

    describe("fund", async () => {
        it("fails if you don't send enough eth", async () => {
            await expect(fundMe.fund()).to.be.revertedWith(
                "You need to spend more ETH!"
            );
        });

        it("updated the amount funded data structure", async () => {
            await fundMe.fund({ value: sendValue });
            const response = await fundMe.getAddressToAmountFunded(deployer);
            assert.equal(response.toString(), sendValue.toString());
        });

        it("adds funder to array of getFunders", async () => {
            await fundMe.fund({ value: sendValue });
            const funder = await fundMe.getFunders(0);
            assert.equal(funder, deployer);
        });
    });

    describe("withdraw", async () => {
        this.beforeEach(async () => {
            await fundMe.fund({ value: sendValue });
        });

        it("withdraw ETH from a single founder", async () => {
            const startingFundMeBalance = await fundMe.provider.getBalance(
                fundMe.address
            );

            const startingDeployerBalance = await fundMe.provider.getBalance(
                deployer
            );

            const transactionResponse = await fundMe.withdraw();
            const transactionReceipt = await transactionResponse.wait(1);

            //se obtienen los atributos de la tx devuelta para calcular el gas
            const { gasUsed, effectiveGasPrice } = transactionReceipt;

            //se multiplica el gas usado por el precio del gas para saber cuanto costó la tx
            const gasCost = gasUsed.mul(effectiveGasPrice);

            const endingFundMeBalance = await fundMe.provider.getBalance(
                fundMe.address
            );

            const endingDeployerBalance = await fundMe.provider.getBalance(
                deployer
            );

            assert.equal(endingFundMeBalance, 0);
            assert.equal(
                startingFundMeBalance.add(startingDeployerBalance).toString(),
                endingDeployerBalance.add(gasCost).toString()
            );
        });

        it("allows us to withdraw multiple getFunders", async () => {
            const accounts = await ethers.getSigners();

            //Se recorren cuentas y se empieza en 1 porque el 0 es el deployer
            for (let i = 1; i < 6; i++) {
                const fundMeConnectedContract = await fundMe.connect(
                    accounts[i]
                );
                await fundMeConnectedContract.fund({ value: sendValue });
            }

            const startingFundMeBalance = await fundMe.provider.getBalance(
                fundMe.address
            );

            const startingDeployerBalance = await fundMe.provider.getBalance(
                deployer
            );

            const transactionResponse = await fundMe.withdraw();
            const transactionReceipt = await transactionResponse.wait(1);

            //se obtienen los atributos de la tx devuelta para calcular el gas
            const { gasUsed, effectiveGasPrice } = transactionReceipt;

            //se multiplica el gas usado por el precio del gas para saber cuanto costó la tx
            const gasCost = gasUsed.mul(effectiveGasPrice);

            const endingFundMeBalance = await fundMe.provider.getBalance(
                fundMe.address
            );

            const endingDeployerBalance = await fundMe.provider.getBalance(
                deployer
            );

            assert.equal(endingFundMeBalance, 0);
            assert.equal(
                startingFundMeBalance.add(startingDeployerBalance).toString(),
                endingDeployerBalance.add(gasCost).toString()
            );

            await expect(fundMe.getFunders(0)).to.be.reverted;

            for (i = 1; i > 6; i++) {
                assert.equal(
                    await fundMe.getAddressToAmountFunded(accounts[1]),
                    0
                );
            }
        });

        it("only allows the getOwner to withdraw", async () => {
            const accounts = await ethers.getSigners();
            const fundMeConnectedContract = await fundMe.connect(accounts[1]);
            await expect(fundMeConnectedContract.withdraw()).to.be.reverted;
        });
    });
});
