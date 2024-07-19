document.addEventListener('DOMContentLoaded', async () => {
    const walletSection = document.getElementById('wallet-section');
    const walletInfo = document.getElementById('wallet-info');
    const publicKeyElement = document.getElementById('public-key');
    const privateKeyElement = document.getElementById('private-key');
    const storeKeyButton = document.getElementById('store-key');
    const balanceSection = document.getElementById('balance-section');
    const balanceList = document.getElementById('balance-list');
    const transactionSection = document.getElementById('transaction-section');
    const transactionList = document.getElementById('transaction-list');
    const sendSection = document.getElementById('send-section');
    const recipientInput = document.getElementById('recipient');
    const amountInput = document.getElementById('amount');
    const sendBalanceButton = document.getElementById('send-balance');
    const chainSection = document.getElementById('chain-section');
    const chainList = document.getElementById('chain-list');
    const messageElement = document.getElementById('message');

    async function fetchChain() {
        const response = await fetch('/blockchain/chain');
        const chain = await response.json();
        return chain;
    }

    async function fetchBalance(publicKey) {
        const response = await fetch(`/blockchain/balance/${publicKey}`);
        const { balance } = await response.json();
        return balance;
    }

    async function fetchTransactions(publicKey) {
        const response = await fetch(`/blockchain/transactions/${publicKey}`);
        const transactions = await response.json();
        return transactions;
    }

    function createQRCodeElement(signature, status) {
        const qrCodeElement = document.createElement('div');
        qrCodeElement.className = `qr-code ${status}`;
        const qr = qrcode(0, 'L');
        const dataUrl = encodeURIComponent(JSON.stringify({ signature }));
        const qrData = `https://chibilok.com/blok/${signature}?data=${dataUrl}`;
        qr.addData(qrData);
        qr.make();
        qrCodeElement.innerHTML = qr.createImgTag();
        return qrCodeElement;
    }

    async function renderChain() {
        const chain = await fetchChain();
        chainList.innerHTML = '';
        chain.forEach(block => {
            const listItem = document.createElement('li');
            const status = block.valid ? 'valid' : 'invalid';
            const qrCodeElement = createQRCodeElement(block.signature, status);
            listItem.appendChild(qrCodeElement);
            listItem.appendChild(document.createTextNode(` ${block.message}`));
            chainList.appendChild(listItem);
        });
    }

    async function renderWalletInfo(wallet) {
        publicKeyElement.textContent = wallet.publicKey;
        privateKeyElement.textContent = wallet.privateKey;
        walletInfo.style.display = 'block';
    }

    async function renderBalance(publicKey) {
        const balance = await fetchBalance(publicKey);
        balanceList.innerHTML = `<li>${balance} CHIB</li>`;
        balanceSection.style.display = 'block';
    }

    async function renderTransactions(publicKey) {
        const transactions = await fetchTransactions(publicKey);
        transactionList.innerHTML = '';
        transactions.forEach(tx => {
            const listItem = document.createElement('li');
            listItem.textContent = `${tx.amount} to ${tx.recipient}`;
            transactionList.appendChild(listItem);
        });
        transactionSection.style.display = 'block';
    }

    document.getElementById('generate-wallet').addEventListener('click', async () => {
        const response = await fetch('/blockchain/generate-wallet');
        const wallet = await response.json();
        await renderWalletInfo(wallet);
        await renderBalance(wallet.publicKey);
        await renderTransactions(wallet.publicKey);
        sendSection.style.display = 'block';
    });

    storeKeyButton.addEventListener('click', async () => {
        const privateKey = privateKeyElement.textContent;
        const response = await fetch('/blockchain/store-key', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ privateKey })
        });

        const result = await response.json();
        if (result.success) {
            messageElement.textContent = 'Private key stored successfully!';
            messageElement.style.color = 'green';
        } else {
            messageElement.textContent = 'Failed to store private key.';
            messageElement.style.color = 'red';
        }
    });

    sendBalanceButton.addEventListener('click', async () => {
        const recipient = recipientInput.value;
        const amount = amountInput.value;
        const publicKey = publicKeyElement.textContent;
        const privateKey = privateKeyElement.textContent;

        if (!recipient || !amount) {
            alert('Recipient and amount are required');
            return;
        }

        const response = await fetch('/blockchain/send-balance', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ recipient, amount, publicKey, privateKey })
        });

        const result = await response.json();
        if (result.success) {
            messageElement.textContent = 'Transaction successful!';
            messageElement.style.color = 'green';
            await renderBalance(publicKey);
            await renderTransactions(publicKey);
        } else {
            messageElement.textContent = 'Transaction failed.';
            messageElement.style.color = 'red';
        }
    });

    document.getElementById('mine-block').addEventListener('click', async () => {
        const publicKey = publicKeyElement.textContent;
        const response = await fetch('/blockchain/mine', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ minerAddress: publicKey })
        });

        const result = await response.json();
        if (result.success) {
            messageElement.textContent = 'Mining complete!';
            messageElement.style.color = 'green';
            await renderBalance(publicKey);
            await renderChain();
        } else {
            messageElement.textContent = 'Mining failed.';
            messageElement.style.color = 'red';
        }
    });

    await renderChain();
});
