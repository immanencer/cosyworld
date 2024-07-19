import pkg from 'elliptic';
const { ec: EC } = pkg;
import bs58 from 'bs58';

// Initialize elliptic curve
const ec = new EC('secp256k1');

function generateWallet() {
    // Generate key pair
    const keyPair = ec.genKeyPair();

    // Get private key and encode it in base58
    const privateKey = keyPair.getPrivate('hex');
    const privateKeyBase58 = bs58.encode(Buffer.from(privateKey, 'hex'));

    // Get public key and encode it in base58
    const publicKey = keyPair.getPublic('hex');
    const publicKeyBase58 = bs58.encode(Buffer.from(publicKey, 'hex'));

    return {
        privateKey: privateKeyBase58,
        publicKey: publicKeyBase58
    };
}

export { generateWallet };
