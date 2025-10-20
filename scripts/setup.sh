#!/bin/bash

# AtomX Swap Router Setup Script
echo "🚀 Setting up AtomX Swap Router..."

# Check if anchor is installed
if ! command -v anchor &> /dev/null; then
    echo "❌ Anchor CLI not found. Please install it first:"
    echo "   npm install -g @coral-xyz/anchor-cli"
    exit 1
fi

# Check if solana is installed
if ! command -v solana &> /dev/null; then
    echo "❌ Solana CLI not found. Please install it first:"
    echo "   sh -c \"$(curl -sSfL https://release.solana.com/v1.18.26/install)\""
    exit 1
fi

echo "✅ Dependencies check passed"

# Set up Solana config
echo "📡 Setting up Solana configuration..."
solana config set --url devnet
solana config set --keypair ~/.config/solana/id.json

# Check balance
echo "💰 Checking SOL balance..."
BALANCE=$(solana balance --lamports)
MIN_BALANCE=1000000000  # 1 SOL in lamports

if [ "$BALANCE" -lt "$MIN_BALANCE" ]; then
    echo "⚠️  Low SOL balance. Requesting airdrop..."
    solana airdrop 2
    sleep 5
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build the programs
echo "🔨 Building Anchor programs..."
anchor build

# Generate program keypairs if they don't exist
echo "🔑 Generating program keypairs..."
if [ ! -f "target/deploy/swap_router-keypair.json" ]; then
    solana-keygen new --no-bip39-passphrase -o target/deploy/swap_router-keypair.json
fi

if [ ! -f "target/deploy/vault-keypair.json" ]; then
    solana-keygen new --no-bip39-passphrase -o target/deploy/vault-keypair.json
fi

# Update Anchor.toml with generated program IDs
echo "⚙️  Updating program IDs..."
SWAP_ROUTER_ID=$(solana-keygen pubkey target/deploy/swap_router-keypair.json)
VAULT_ID=$(solana-keygen pubkey target/deploy/vault-keypair.json)

echo "📝 Program IDs generated:"
echo "   Swap Router: $SWAP_ROUTER_ID"
echo "   Vault: $VAULT_ID"

# Update the program IDs in the source code
sed -i '' "s/SwapRouter1111111111111111111111111111111/$SWAP_ROUTER_ID/g" programs/swap-router/src/router.rs
sed -i '' "s/Vault11111111111111111111111111111111111/$VAULT_ID/g" programs/vault/src/vault.rs

# Deploy programs
echo "🚀 Deploying programs to devnet..."
anchor deploy

# Initialize the router
echo "🎯 Initializing swap router..."
node scripts/deploy-router.js

echo "✅ Setup completed successfully!"
echo ""
echo "🎉 Your AtomX Swap Router is ready!"
echo ""
echo "📊 Summary:"
echo "   Network: Devnet"
echo "   Swap Router Program: $SWAP_ROUTER_ID"
echo "   Vault Program: $VAULT_ID"
echo ""
echo "🔧 Next steps:"
echo "   1. Run tests: anchor test"
echo "   2. Start building your frontend integration"
echo "   3. Check the router state in Solana Explorer"
echo ""