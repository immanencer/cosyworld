const Encoder = {
    encodeMessage(data, canvasId) {
        const canvas = document.getElementById(canvasId);
        const ctx = canvas.getContext('2d');
        const imageData = ctx.createImageData(canvas.width, canvas.height);

        let base64;
        if (data instanceof Uint8Array) {
            base64 = btoa(String.fromCharCode.apply(null, data));
        } else if (typeof data === 'string') {
            base64 = btoa(data);
        } else {
            console.error('Unsupported data type for encoding');
            return;
        }

        const binaryString = atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        for (let i = 0; i < imageData.data.length; i += 4) {
            const byteIndex = i / 4;
            if (byteIndex < bytes.length) {
                imageData.data[i] = bytes[byteIndex];
                imageData.data[i + 1] = 0;
                imageData.data[i + 2] = 0;
                imageData.data[i + 3] = 255;
            } else {
                imageData.data[i] = 255;
                imageData.data[i + 1] = 255;
                imageData.data[i + 2] = 255;
                imageData.data[i + 3] = 255;
            }
        }

        ctx.putImageData(imageData, 0, 0);
    },

    decodeMessage(base64Image) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;

                let bytes = [];
                for (let i = 0; i < data.length; i += 4) {
                    if (data[i] === 255 && data[i + 1] === 255 && data[i + 2] === 255) {
                        break;
                    }
                    bytes.push(data[i]);
                }

                const decoded = new Uint8Array(bytes);
                resolve(decoded);
            };
            img.onerror = reject;
            img.src = base64Image;
        });
    }
};