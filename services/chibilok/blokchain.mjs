import crypto from 'crypto';
import bs58 from 'bs58';

class Blockchain {
    constructor() {
        this.chain = [];
        this.difficulty = 4; // Number of leading zeros required
        this.initializeGenesisBlock();
    }

    initializeGenesisBlock() {
        const genesisMessage = {
            message: 'Genesis Block',
            priorSignature: '0'
        };
        genesisMessage.signature = this.generateSignature(genesisMessage.message);
        this.chain.push(genesisMessage);
    }

    generateSignature(message) {
        return crypto.createHash('sha256').update(message).digest('hex');
    }

    isValidBase58Key(key) {
        try {
            bs58.decode(key);
            return true;
        } catch (e) {
            return false;
        }
    }

    addMessage(newMessage) {
        const previousBlock = this.chain[this.chain.length - 1];
        const signedMessage = `[${previousBlock.signature}] ${newMessage}`;
        const signature = this.generateSignature(signedMessage);

        const block = {
            message: signedMessage,
            signature
        };

        if (this.isValidTransaction(newMessage)) {
            this.chain.push(block);
            this.issueToken(signature, signedMessage);
        } else {
            console.warn('Invalid transaction ignored:', newMessage);
        }
    }

    verifyChain() {
        for (let i = 1; i < this.chain.length; i++) {
            const currentBlock = this.chain[i];
            const previousBlock = this.chain[i - 1];
            const expectedMessage = `[${previousBlock.signature}] ${currentBlock.message.split('] ')[1]}`;
            const expectedSignature = this.generateSignature(expectedMessage);

            if (currentBlock.signature !== expectedSignature) {
                return false;
            }
        }
        return true;
    }

    isValidTransaction(message) {
        if (message.startsWith('(w)')) {
            const parts = message.split(' ')[1].split(':');
            const walletId = parts[0];
            return this.isValidBase58Key(walletId);
        }
        return true; // All other messages are considered valid
    }

    calculateChibValue(signature) {
        const leadingZeros = signature.match(/^0*/)[0].length;
        return Math.pow(10, leadingZeros);
    }

    issueToken(signature, message) {
        if (message.startsWith('(w)')) {
            const parts = message.split(' ');
            const content = parts.slice(1).join(' ');
            const [destination, amount] = content.split(':');
            if (this.isValidBase58Key(destination)) {
                const chibValue = this.calculateChibValue(signature);
                const transactionMessage = `[${signature}](w)${destination}:${chibValue}:${crypto.randomBytes(16).toString('hex')}`;
                const transactionSignature = this.generateSignature(transactionMessage);

                const transactionBlock = {
                    message: transactionMessage,
                    signature: transactionSignature
                };

                this.chain.push(transactionBlock);
            }
        }
    }

    calculateBalance(walletId) {
        let balance = 0;
        let includedMessages = '';

        for (const block of this.chain) {
            const message = block.message;
            if (message.startsWith(`[${block.signature}] (w)`)) {
                const content = message.split(' ')[1];
                const [destination, amount] = content.split(':');
                if (destination === walletId) {
                    balance += parseInt(amount, 10);
                    includedMessages += message;
                }
            }
        }

        const balanceMessage = `(${walletId})balance:${balance}`;
        const balanceHash = this.generateSignature(includedMessages);
        const balanceTransaction = `${balanceMessage} | Hash: ${balanceHash}`;
        this.addMessage(balanceTransaction);

        return balance;
    }

    containsWallet(block, walletId) {
        return block.message.includes(walletId);
    }

    mineBlock(minerAddress) {
        const previousBlock = this.chain[this.chain.length - 1];
        let nonce = 0;
        let signature;

        console.log('Mining in progress...');

        do {
            nonce++;
            const newMessage = `Miner: ${minerAddress} Nonce: ${nonce}`;
            const signedMessage = `[${previousBlock.signature}] ${newMessage}`;
            signature = this.generateSignature(signedMessage);
        } while (!signature.startsWith('0'.repeat(this.difficulty)));

        const block = {
            message: `Miner: ${minerAddress} Nonce: ${nonce}`,
            signature
        };

        this.chain.push(block);
        console.log('Mining complete:', block);

        // Issue reward to miner
        this.issueToken(signature, `(w)${minerAddress}:${this.calculateChibValue(signature)}`);
    }
}

export { Blockchain as Blokchain };
