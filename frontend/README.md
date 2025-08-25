# BitBridge Frontend

React frontend for the BitBridge payment gateway, built with Stacks.js for blockchain integration.

## Features

- **Wallet Connection**: Connect Stacks wallet using @stacks/connect
- **Payment Creation**: Create sBTC payments with automatic STX conversion preview
- **Merchant Dashboard**: View balances, payment history, and withdraw funds
- **Price Feed Management**: View current exchange rates and admin controls
- **Responsive Design**: Mobile-friendly interface

## Components

- `App.js` - Main application component with wallet connection
- `PaymentForm.js` - Create and process sBTC payments
- `MerchantDashboard.js` - Merchant balance and payment management
- `PriceDisplay.js` - Exchange rate display and admin controls

## Setup

1. Install dependencies:
```bash
npm install
```

2. Update contract address in components:
   - Edit `CONTRACT_ADDRESS` in PaymentForm.js, MerchantDashboard.js, and PriceDisplay.js
   - Replace with your deployed contract address

3. Start development server:
```bash
npm start
```

4. Build for production:
```bash
npm run build
```

## Configuration

- **Network**: Currently configured for Stacks Testnet
- **Contract**: Update CONTRACT_ADDRESS and CONTRACT_NAME in components
- **Wallet**: Uses Stacks Web Wallet for authentication

## Usage

1. Connect your Stacks wallet
2. Use the Payment tab to create sBTC payments
3. Use the Merchant Dashboard to view balances and withdraw funds
4. Use the Price Feed tab to view current rates (admin can update)

## Dependencies

- React 18
- @stacks/connect for wallet integration
- @stacks/transactions for blockchain interactions
- @stacks/network for network configuration
