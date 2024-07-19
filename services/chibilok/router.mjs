import express from 'express';
import crypto from 'crypto';
import { Blokchain } from './blokchain.mjs';
import { generateWallet } from './walletGenerator.mjs';

const router = express.Router();
const blockchain = new Blokchain();

import path from 'path';
const __dirname = import.meta.url.replace('file:///', '').replace('router.mjs', '');
router.use(express.static(path.join(__dirname, 'public')));

router.get('/', (req, res) => {
    res.sendFile(path.join('public', 'index.html'), { root: __dirname });
});

router.post('/add-message', (req, res) => {
    const { message } = req.body;
    if (!message) {
        return res.status(400).json({ error: 'Message is required' });
    }
    blockchain.addMessage(message);
    res.json({ success: true });
});

router.get('/verify-chain', (req, res) => {
    const isValid = blockchain.verifyChain();
    res.json({ valid: isValid });
});

router.get('/balance/:walletId', (req, res) => {
    const { walletId } = req.params;
    if (!blockchain.isValidBase58Key(walletId)) {
        return res.status(400).json({ error: 'Invalid wallet ID' });
    }
    const balance = blockchain.calculateBalance(walletId);
    res.json({ balance });
});

router.get('/generate-wallet', (req, res) => {
    const wallet = generateWallet();
    res.json(wallet);
});

const privateKeyStore = {};


router.post('/store-key', (req, res) => {
    const { privateKey } = req.body;
    if (!privateKey) {
        return res.status(400).json({ success: false, message: 'Private key is required.' });
    }

    // For simplicity, using a random key as identifier; consider more robust mechanisms in production
    const keyId = crypto.randomBytes(16).toString('hex');
    privateKeyStore[keyId] = privateKey;

    res.json({ success: true, keyId });
});


router.get('/chain', (req, res) => {
    res.json(blockchain.chain);
});



router.get('/balance/:walletId', (req, res) => {
    const { walletId } = req.params;
    if (!blockchain.isValidBase58Key(walletId)) {
        return res.status(400).json({ success: false, message: 'Invalid wallet ID.' });
    }
    const balance = blockchain.calculateBalance(walletId);
    res.json({ balance });
});

router.get('/transactions/:walletId', (req, res) => {
    const { walletId } = req.params;
    if (!blockchain.isValidBase58Key(walletId)) {
        return res.status(400).json({ success: false, message: 'Invalid wallet ID.' });
    }

    const transactions = blockchain.chain
        .filter(block => block.message.startsWith(`[${block.signature}] (w)`))
        .map(block => {
            const [ , recipient, amount ] = block.message.split(':');
            return { recipient, amount };
        })
        .filter(tx => tx.recipient === walletId || tx.sender === walletId);

    res.json(transactions);
});

router.post('/send-balance', (req, res) => {
    const { recipient, amount, publicKey, privateKey } = req.body;

    if (!blockchain.isValidBase58Key(publicKey) || !blockchain.isValidBase58Key(recipient)) {
        return res.status(400).json({ success: false, message: 'Invalid public key or recipient key.' });
    }

    const balance = blockchain.calculateBalance(publicKey);
    if (balance < amount) {
        return res.status(400).json({ success: false, message: 'Insufficient balance.' });
    }

    // Create and sign the transaction
    const transactionMessage = `(w)${recipient}:${amount}:${crypto.randomBytes(16).toString('hex')}`;
    const signature = crypto.createSign('SHA256').update(transactionMessage).sign(privateKey, 'hex');
    const signedMessage = `[${signature}] ${transactionMessage}`;
    blockchain.addMessage(signedMessage);

    res.json({ success: true });
});


router.post('/mine', (req, res) => {
    const { minerAddress } = req.body;

    if (!blockchain.isValidBase58Key(minerAddress)) {
        return res.status(400).json({ success: false, message: 'Invalid miner address.' });
    }

    blockchain.mineBlock(minerAddress);
    res.json({ success: true, message: 'Mining complete' });
});

export default router;
