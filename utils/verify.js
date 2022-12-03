const {run} = require("hardhat")

async function verify(contractAddress, args) {
    console.log("Veifying contract...")
    try{
        await run("verify", {
            address: contractAddress,
            constructorArguments: args
        })
    } catch (e) {
        if (e.message.toLowerCase().includes("already verified")){
            console.log("Already Vrified!")
        } else {
            console.log(e)
        }
    }
}

module.exports = {verify}