document.addEventListener('DOMContentLoaded', () => {
    const blockchain = new Blockchain();
    UI.init(blockchain);

    // Override the createNewMessage function to work with the UI
    Blockchain.createNewMessage = () => {
        const message = document.getElementById("newMessage").value;
        if (!message) return;

        if (blockchain.addBlock(message)) {
            const newBlock = blockchain.chain[blockchain.chain.length - 1];
            Encoder.encodeMessage(newBlock.toUint8Array(), 'encodedMessage');
            UI.updateStats();
            UI.updateBlockchainDisplay();
            document.getElementById('saveButton').style.display = 'block';
        } else {
            alert("Message already exists in the blockchain!");
        }
    };
});