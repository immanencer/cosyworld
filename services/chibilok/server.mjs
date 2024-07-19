import express from 'express';
import bodyParser from 'body-parser';
import blockchainRouter from './blockchainRouter.mjs';

const app = express();
const PORT = 3000;

app.use(bodyParser.json());
app.use('/blockchain', blockchainRouter);

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
