// sol-baseline-bot.mjs

import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { performSwap, createTokenAccountIfNotExist } from './lib.js';
import fs from 'fs';

// Constants
const TOKEN_MINT_ADDRESS = new PublicKey('HLptm5e6rTgh4EKgDpYFrnRHbjpkMyVdEeREEa2G7rf9');
const BASE_TOKEN_MINT_ADDRESS = new PublicKey('So11111111111111111111111111111111111111112');
const MAX_BUY_AMOUNT = 0.05 * 1e9; // Maximum buy amount in lamports (0.05 SOL)
const MIN_BUY_AMOUNT = 0.005 * 1e9; // Minimum buy amount in lamports (0.005 SOL)
const SELL_PERCENTAGE = 0.99; // 99% of the meme coin balance
const TIME_BETWEEN_TRADES = 20; // Time between trading cycles in seconds
const SLIPPAGE = 0.5; // Slippage for trades (0.5%)

// Load the wallet from a local file
const WALLET_PATH = 'C:\\Users\\atswo\\wallet\\new_wallet.json';  // Your provided wallet path
const walletData = JSON.parse(fs.readFileSync(WALLET_PATH, 'utf-8'));
const wallet = Keypair.fromSecretKey(Uint8Array.from(walletData));

// Create a connection to the Solana cluster
const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');

// Function to buy the meme coin using SOL
async function buyToken(amount) {
    console.log(`Buying meme coin with ${amount / 1e9} SOL...`);
    await performSwap({
        connection,
        wallet,
        sourceMint: BASE_TOKEN_MINT_ADDRESS,
        destinationMint: TOKEN_MINT_ADDRESS,
        amount: amount,
    });
}

// Function to sell the meme coin back to SOL
async function sellToken(percentage) {
    console.log(`Selling meme coin back to SOL...`);

    // Get the associated token account for the meme coin
    const memeCoinAccount = await createTokenAccountIfNotExist(connection, wallet, TOKEN_MINT_ADDRESS);

    // Get the balance of the meme coin
    const accountInfo = await connection.getTokenAccountBalance(memeCoinAccount);
    const balance = accountInfo.value.amount;

    // Calculate the amount to sell
    const amountToSell = Math.floor(balance * percentage);

    if (amountToSell === 0) {
        console.error('No tokens to sell or calculated sell amount is zero.');
        return;
    }

    // Perform the swap from meme coin to SOL
    await performSwap({
        connection,
        wallet,
        sourceMint: TOKEN_MINT_ADDRESS,
        destinationMint: BASE_TOKEN_MINT_ADDRESS,
        amount: amountToSell,
    });
}

// Function to simulate a random delay between buys
function randomDelay(min, max) {
    const delay = Math.floor(Math.random() * (max - min + 1) + min);
    return new Promise(resolve => setTimeout(resolve, delay * 1000));
}

// Trading loop
async function tradingLoop() {
    while (true) {
        console.log('Starting a new trading cycle...');

        // Perform multiple buys with random delays
        for (let i = 0; i < 4; i++) {
            const amount = Math.random() * (MAX_BUY_AMOUNT - MIN_BUY_AMOUNT) + MIN_BUY_AMOUNT;
            await buyToken(amount);
            await randomDelay(10, 20); // Random delay between 10 to 20 seconds
        }

        // Perform the sell
        await sellToken(SELL_PERCENTAGE);

        console.log(`Waiting ${TIME_BETWEEN_TRADES} seconds before the next cycle...`);
        await new Promise(resolve => setTimeout(resolve, TIME_BETWEEN_TRADES * 1000));
    }
}

// Start the trading loop
tradingLoop().catch(err => console.error(err));
