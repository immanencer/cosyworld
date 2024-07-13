const UI = {
    blockchain: null,

    init(blockchain) {
        this.blockchain = blockchain;
        this.openTab('createTab');
        this.updateStats();
        this.updateBlockchainDisplay();
        this.setupEventListeners();
    },

    setupEventListeners() {
        document.getElementById("imageUpload").addEventListener("change", (e) => this.handleFileUpload(e, this.decodeAndValidateMessage));
        document.getElementById("otherChainUpload").addEventListener("change", (e) => this.handleFileUpload(e, this.decodeAndSyncBlock));
        document.getElementById("privatekeyUpload").addEventListener("change", (e) => this.handleFileUpload(e, this.importPrivateKey));
    },

    openTab(tabName) {
        const tabs = document.getElementsByClassName("tab");
        for (let tab of tabs) {
            tab.style.display = "none";
        }
        document.getElementById(tabName).style.display = "block";
    },

    handleFileUpload(event, callback) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const encodedMessage = e.target.result.split(',')[1]; // Get the base64 part
                callback.call(this, encodedMessage);
            };
            reader.readAsDataURL(file);
        }
    },

    async decodeAndValidateMessage(encodedMessage) {
        try {
            const decodedData = await Encoder.decodeMessage(encodedMessage);
            if (decodedData) {
                const decodedString = new TextDecoder().decode(decodedData);
                document.getElementById("decodedMessage").innerText = "Decoded: " + decodedString;
                const isNew = this.blockchain.validateBlock(decodedData);
                const resultText = isNew ? "New Block Added!" : "Block Validated!";
                document.getElementById("validationResult").innerText = `Result: ${resultText}`;
                this.updateStats();
                this.updateBlockchainDisplay();
            } else {
                document.getElementById("validationResult").innerText = "Failed to decode the message";
            }
        } catch (error) {
            console.error("Error decoding message:", error);
            document.getElementById("validationResult").innerText = "Error decoding the message";
        }
    },

    async decodeAndSyncBlock(encodedMessage) {
        try {
            const decodedData = await Encoder.decodeMessage(encodedMessage);
            if (decodedData) {
                this.blockchain.importChain(decodedData);
                this.updateStats();
                this.updateBlockchainDisplay();
                document.getElementById("syncResult").innerText = "Chain synced successfully!";
            } else {
                document.getElementById("syncResult").innerText = "Failed to decode the block";
            }
        } catch (error) {
            console.error("Error decoding block:", error);
            document.getElementById("syncResult").innerText = "Error decoding the block";
        }
    },

    async importPrivateKey(encodedMessage) {
        try {
            const decodedKey = await Encoder.decodeMessage(encodedMessage);
            if (decodedKey) {
                this.blockchain.validatorKey = new TextDecoder().decode(decodedKey);
                this.updateStats();
                alert('Private key imported successfully!');
            } else {
                alert('Error importing private key. Please check the format.');
            }
        } catch (error) {
            console.error("Error importing private key:", error);
            alert('Error importing private key. Please check the format.');
        }
    },

    updateStats() {
        const stats = this.blockchain.getStats();
        document.getElementById("stats").innerHTML = `
            <p>Total Blocks: ${stats.blockCount}</p>
            <p>Unique Messages: ${stats.uniqueMessagesCount}</p>
            <p>Unique Keys: ${stats.uniqueKeysCount}</p>
            <p>Your Validations: ${stats.validations}</p>
        `;
        document.getElementById("keyScore").innerText = `Key Score: ${stats.validations}`;
    },

    updateBlockchainDisplay() {
        const chain = this.blockchain.chain;
        if (chain.length > 0) {
            const latestBlock = chain[chain.length - 1];
            Encoder.encodeMessage(latestBlock.toUint8Array(), 'blockImageTemp');
        }
        Encoder.encodeMessage(this.blockchain.exportChain(), 'currentChain');
    },

    saveEncodedMessage(canvasId, filename) {
        const canvas = document.getElementById(canvasId);
        const link = document.createElement('a');
        link.download = filename;
        link.href = canvas.toDataURL();
        link.click();
    }
};