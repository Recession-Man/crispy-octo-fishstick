import * as web3 from '@solana/web3.js';
import { PublicKey, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import * as splToken from '@solana/spl-token';
import { TokenSwap } from '@solana/spl-token-swap';
import { Buffer } from 'buffer';
import raydiumSdk from '@raydium-io/raydium-sdk';

// Function to find the liquidity pool and relevant program details for SOL and the meme coin
export async function findPoolAddress(connection, solMint, memeCoinMint) {
    const pools = await raydiumSdk.getPools(connection);
    const pool = pools.find(p => 
        (p.baseMint.toString() === solMint.toString() && p.quoteMint.toString() === memeCoinMint.toString()) ||
        (p.baseMint.toString() === memeCoinMint.toString() && p.quoteMint.toString() === solMint.toString())
    );
    if (!pool) throw new Error('Pool not found for the given pair');
    return {
        poolAddress: pool.poolAddress,
        programId: pool.programId,  // Raydium program ID
        authority: pool.authority,  // Authority address for the pool
    };
}

// Function to create an associated token account if it doesn't exist
export async function createTokenAccountIfNotExist(connection, wallet, mint) {
    const tokenAccount = await splToken.getAssociatedTokenAddress(mint, wallet.publicKey, true, splToken.TOKEN_PROGRAM_ID, splToken.ASSOCIATED_TOKEN_PROGRAM_ID);

    const accountInfo = await connection.getAccountInfo(tokenAccount);
    if (!accountInfo) {
        const transaction = new Transaction().add(
            splToken.createAssociatedTokenAccountInstruction(wallet.publicKey, tokenAccount, wallet.publicKey, mint, splToken.TOKEN_PROGRAM_ID, splToken.ASSOCIATED_TOKEN_PROGRAM_ID)
        );
        await sendAndConfirmTransaction(connection, transaction, [wallet]);
        console.log(`Created token account for mint: ${mint.toString()}`);
    } else {
        console.log(`Token account already exists for mint: ${mint.toString()}`);
    }
    return tokenAccount;
}

// Function to perform a token swap between SOL and a meme coin
export async function performSwap({ connection, wallet, sourceMint, destinationMint, amount }) {
    const { poolAddress, programId, authority } = await findPoolAddress(connection, sourceMint, destinationMint);

    const sourceTokenAccount = await createTokenAccountIfNotExist(connection, wallet, sourceMint);
    const destinationTokenAccount = await createTokenAccountIfNotExist(connection, wallet, destinationMint);

    const transaction = new Transaction().add(
        TokenSwap.swapInstruction(
            {
                tokenSwap: poolAddress,
                authority: authority,
                userTransferAuthority: wallet.publicKey,
                source: sourceTokenAccount,
                destination: destinationTokenAccount,
                poolSource: sourceTokenAccount,
                poolDestination: destinationTokenAccount,
                poolFeeAccount: poolAddress,
                tokenProgramId: splToken.TOKEN_PROGRAM_ID,
                amountIn: amount,
                minimumAmountOut: amount * (1 - SLIPPAGE / 100),  // Adjust minimum amount out based on slippage
            },
            programId  // Dynamic program ID
        )
    );

    try {
        const signature = await sendAndConfirmTransaction(connection, transaction, [
