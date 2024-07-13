// Utility functions
const utils = {
    generateKey: () => btoa(String.fromCharCode.apply(null, crypto.getRandomValues(new Uint8Array(32)))).slice(0, 44),
    base64ToUint8Array: (base64) => Uint8Array.from(atob(base64), c => c.charCodeAt(0)),
    uint8ArrayToBase64: (uint8Array) => btoa(String.fromCharCode.apply(null, uint8Array)),
    stringToUint8Array: (str) => new TextEncoder().encode(str),
    uint8ArrayToString: (uint8Array) => new TextDecoder().decode(uint8Array),
    concatUint8Arrays: (...arrays) => {
      const totalLength = arrays.reduce((acc, arr) => acc + arr.length, 0);
      const result = new Uint8Array(totalLength);
      let offset = 0;
      for (const arr of arrays) {
        result.set(arr, offset);
        offset += arr.length;
      }
      return result;
    }
  };
  
  class Block {
    constructor(message, signature, timestamp) {
      this.message = message;
      this.signature = signature;
      this.timestamp = timestamp;
      this.validations = 1;
      this.validatedBy = new Set([signature]);
    }
  
    toUint8Array() {
      const messageArray = utils.stringToUint8Array(this.message);
      const signatureArray = utils.base64ToUint8Array(this.signature);
      const timestampArray = new Uint8Array(new BigUint64Array([BigInt(this.timestamp)]).buffer);
      const validationsArray = new Uint8Array(new Uint32Array([this.validations]).buffer);
      const validatedByArray = utils.stringToUint8Array([...this.validatedBy].join(','));
  
      return utils.concatUint8Arrays(
        new Uint8Array([messageArray.length]),
        messageArray,
        signatureArray,
        timestampArray,
        validationsArray,
        new Uint8Array([validatedByArray.length]),
        validatedByArray
      );
    }
  
    static fromUint8Array(data) {
      let offset = 0;
      const messageLength = data[offset++];
      const message = utils.uint8ArrayToString(data.slice(offset, offset + messageLength));
      offset += messageLength;
  
      const signature = utils.uint8ArrayToBase64(data.slice(offset, offset + 44));
      offset += 44;
  
      const timestamp = Number(new BigUint64Array(data.slice(offset, offset + 8).buffer)[0]);
      offset += 8;
  
      const validations = new Uint32Array(data.slice(offset, offset + 4).buffer)[0];
      offset += 4;
  
      const validatedByLength = data[offset++];
      const validatedBy = new Set(utils.uint8ArrayToString(data.slice(offset, offset + validatedByLength)).split(','));
  
      const block = new Block(message, signature, timestamp);
      block.validations = validations;
      block.validatedBy = validatedBy;
      return block;
    }
  }
  
  class Blockchain {
    constructor() {
      this.chain = [];
      this.uniqueMessages = new Set();
      this.uniqueKeys = new Set();
      this.validatorKey = utils.generateKey();
      this.keyValidations = {};
      this.keyValidations[this.validatorKey] = 0;
      this.uniqueKeys.add(this.validatorKey);
    }
  
    addBlock(message) {
      if (this.uniqueMessages.has(message)) return false;
      const newBlock = new Block(message, this.validatorKey, Date.now());
      this.chain.push(newBlock);
      this.uniqueMessages.add(message);
      this.keyValidations[this.validatorKey]++;
      return true;
    }
  
    validateBlock(blockData) {
      const block = Block.fromUint8Array(utils.base64ToUint8Array(blockData));
      const isNewMessage = !this.uniqueMessages.has(block.message);
      const isNewKey = !this.uniqueKeys.has(block.signature);
  
      if (isNewMessage) {
        this.chain.push(block);
        this.uniqueMessages.add(block.message);
        if (isNewKey) this.uniqueKeys.add(block.signature);
      } else {
        const existingBlock = this.chain.find(b => b.message === block.message);
        if (existingBlock) {
          existingBlock.validations++;
          existingBlock.validatedBy.add(this.validatorKey);
        }
      }
  
      this.keyValidations[this.validatorKey]++;
      return isNewMessage;
    }
  
    exportChain() {
      const chainData = this.chain.map(block => block.toUint8Array());
      const totalLength = chainData.reduce((acc, arr) => acc + arr.length, 0);
      const result = new Uint8Array(totalLength);
      let offset = 0;
      for (const blockData of chainData) {
        result.set(blockData, offset);
        offset += blockData.length;
      }
      return utils.uint8ArrayToBase64(result);
    }
  
    importChain(base64Data) {
      const data = utils.base64ToUint8Array(base64Data);
      this.chain = [];
      this.uniqueMessages.clear();
      this.uniqueKeys.clear();
      let offset = 0;
      while (offset < data.length) {
        const blockLength = data[offset] + 1 + 44 + 8 + 4 + 1 + data[offset + 1 + 44 + 8 + 4];
        const block = Block.fromUint8Array(data.slice(offset, offset + blockLength));
        this.chain.push(block);
        this.uniqueMessages.add(block.message);
        block.validatedBy.forEach(key => this.uniqueKeys.add(key));
        offset += blockLength;
      }
    }
  
    getStats() {
      return {
        blockCount: this.chain.length,
        uniqueMessagesCount: this.uniqueMessages.size,
        uniqueKeysCount: this.uniqueKeys.size,
        validatorKey: this.validatorKey,
        validations: this.keyValidations[this.validatorKey]
      };
    }
  }