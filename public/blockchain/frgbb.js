class Transaction {
    constructor(prevHash, author, channel, details, color) {
        this.prevHash = prevHash;
        this.author = author;
        this.channel = channel;
        this.details = details;
        this.color = color;
        this.timestamp = Date.now();
        this.hash = this.calculateHash();
    }

    calculateHash() {
        return btoa(JSON.stringify(this)).slice(0, 10);  // Simplified hash for demo
    }

    static createGenesis(author) {
        return new Transaction(null, author, 'genesis', 'Genesis Transaction', [128, 128, 128]);
    }
}

class Node {
    constructor(publicKey, broadcastHandler = console.log) {
        this.publicKey = publicKey;
        this.color = Node.randomColor();
        this.lastHash = null;
        this.transactions = new Map();  // Changed to Map for O(1) lookup and value storage
        this.broadcast = broadcastHandler;
    }

    static randomColor() {
        return [Math.floor(Math.random()*256), Math.floor(Math.random()*256), Math.floor(Math.random()*256)];
    }

    static mixColor(color1, color2, weight = 0.1) {
        return color1.map((c, i) => Math.round(c * (1 - weight) + color2[i] * weight));
    }

    createTransaction(channel, details) {
        const tx = new Transaction(this.lastHash, this.publicKey, channel, details, this.color);
        this.processTransaction(tx, 'NEW');
        return tx;
    }

    receiveTransaction(tx) {
        if (this.transactions.has(tx.hash)) return;

        const actions = ['ABSORB', 'REFLECT', 'REFRACT'];
        const action = actions[Math.floor(Math.random() * actions.length)];

        switch(action) {
            case 'ABSORB':
                this.color = Node.mixColor(this.color, tx.color);
                break;
            case 'REFLECT':
                this.broadcast({ type: 'REFLECT', node: this.publicKey, transaction: tx });
                break;
            case 'REFRACT':
                const refractedTx = new Transaction(
                    tx.hash,
                    this.publicKey,
                    tx.channel,
                    `Refracted: ${tx.details}`,
                    Node.mixColor(tx.color, this.color, 0.3)
                );
                this.processTransaction(refractedTx, 'REFRACT');
                return;
        }

        this.processTransaction(tx, action);
    }

    processTransaction(tx, action) {
        this.transactions.set(tx.hash, { tx, action });
        this.lastHash = tx.hash;
        this.broadcast({ type: action, node: this.publicKey, transaction: tx });
    }

    getState() {
        return {
            publicKey: this.publicKey,
            color: this.color,
            lastHash: this.lastHash,
            transactionCount: this.transactions.size
        };
    }

    getTransactionHistory() {
        return Array.from(this.transactions.values());
    }
}

class Network {
    constructor(nodeCount, broadcastHandler = console.log) {
        this.nodes = Array.from({length: nodeCount}, (_, i) => new Node(`Node${i}`, broadcastHandler));
        const genesis = Transaction.createGenesis('GenesisNode');
        this.nodes.forEach(node => node.receiveTransaction(genesis));
    }

    simulateActivity(rounds) {
        for (let i = 0; i < rounds; i++) {
            const activeNode = this.nodes[Math.floor(Math.random() * this.nodes.length)];
            if (Math.random() < 0.3) {
                activeNode.createTransaction('channel' + Math.floor(Math.random() * 5), 'Transaction details');
            } else {
                const randomTx = this.getRandomTransaction();
                if (randomTx) activeNode.receiveTransaction(randomTx);
            }
        }
    }

    getRandomTransaction() {
        const allTxs = this.nodes.flatMap(node => Array.from(node.transactions.values()).map(t => t.tx));
        return allTxs[Math.floor(Math.random() * allTxs.length)];
    }

    getNetworkState() {
        return this.nodes.map(node => node.getState());
    }

    getColorDistribution() {
        return this.nodes.reduce((acc, node) => {
            acc.r += node.color[0];
            acc.g += node.color[1];
            acc.b += node.color[2];
            return acc;
        }, {r: 0, g: 0, b: 0});
    }

    getChannelActivity() {
        const channelCounts = {};
        this.nodes.forEach(node => {
            node.getTransactionHistory().forEach(({tx}) => {
                channelCounts[tx.channel] = (channelCounts[tx.channel] || 0) + 1;
            });
        });
        return channelCounts;
    }
}

// Usage
function customBroadcastHandler(message) {
    console.log(`${message.type} from ${message.node}:`, message.transaction);
}

const network = new Network(5, customBroadcastHandler);
network.simulateActivity(20);
console.log('Network State:', network.getNetworkState());
console.log('Color Distribution:', network.getColorDistribution());
console.log('Channel Activity:', network.getChannelActivity());