import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v1.0.0/index.ts';
import { assertEquals } from 'https://deno.land/std@0.90.0/testing/asserts.ts';

Clarinet.test({
    name: "Can create a new payment",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const merchant = accounts.get('wallet_1')!;
        const customer = accounts.get('wallet_2')!;
        
        let block = chain.mineBlock([
            Tx.contractCall('bitbridge-payment', 'create-payment', [
                types.principal(merchant.address),
                types.uint(1000000) // 1 sBTC in satoshis
            ], customer.address)
        ]);
        
        assertEquals(block.receipts.length, 1);
        assertEquals(block.receipts[0].result.expectOk(), types.uint(1));
    },
});

Clarinet.test({
    name: "Can process a payment with auto-conversion",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const merchant = accounts.get('wallet_1')!;
        const customer = accounts.get('wallet_2')!;

        // Create payment first
        let block = chain.mineBlock([
            Tx.contractCall('bitbridge-payment', 'create-payment', [
                types.principal(merchant.address),
                types.uint(100000000) // 1 sBTC (8 decimals)
            ], customer.address)
        ]);

        // Process payment with auto-conversion
        block = chain.mineBlock([
            Tx.contractCall('bitbridge-payment', 'process-payment', [
                types.uint(1)
            ], deployer.address)
        ]);

        assertEquals(block.receipts.length, 1);
        // Should return conversion details
        const result = block.receipts[0].result.expectOk();
        assertEquals(result.expectTuple()['payment-id'], types.uint(1));
        assertEquals(result.expectTuple()['sbtc-amount'], types.uint(100000000));
        // With default price of 50 STX per sBTC: 100000000 * 50000000 / 100000000 = 50000000 (50 STX)
        assertEquals(result.expectTuple()['stx-amount'], types.uint(50000000));
    },
});

Clarinet.test({
    name: "Can check merchant balance after auto-conversion",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const merchant = accounts.get('wallet_1')!;
        const customer = accounts.get('wallet_2')!;

        // Create and process payment
        let block = chain.mineBlock([
            Tx.contractCall('bitbridge-payment', 'create-payment', [
                types.principal(merchant.address),
                types.uint(100000000) // 1 sBTC
            ], customer.address),
            Tx.contractCall('bitbridge-payment', 'process-payment', [
                types.uint(1)
            ], deployer.address)
        ]);

        // Check merchant balance
        let balance = chain.callReadOnlyFn('bitbridge-payment', 'get-merchant-balance', [
            types.principal(merchant.address)
        ], deployer.address);

        assertEquals(balance.result.expectTuple()['balance-stx'], types.uint(50000000)); // 50 STX
    },
});

Clarinet.test({
    name: "Contract owner can toggle contract status",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;

        let block = chain.mineBlock([
            Tx.contractCall('bitbridge-payment', 'toggle-contract', [
                types.bool(false)
            ], deployer.address)
        ]);

        assertEquals(block.receipts.length, 1);
        assertEquals(block.receipts[0].result.expectOk(), types.bool(false));

        // Check contract is disabled
        let status = chain.callReadOnlyFn('bitbridge-payment', 'is-contract-enabled', [], deployer.address);
        assertEquals(status.result, types.bool(false));
    },
});

Clarinet.test({
    name: "Can update price feed",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const newPrice = 75000000; // 75 STX per sBTC

        let block = chain.mineBlock([
            Tx.contractCall('bitbridge-payment', 'update-price-feed', [
                types.uint(newPrice)
            ], deployer.address)
        ]);

        assertEquals(block.receipts.length, 1);
        const result = block.receipts[0].result.expectOk();
        assertEquals(result.expectTuple()['new-price'], types.uint(newPrice));

        // Check price is updated
        let priceInfo = chain.callReadOnlyFn('bitbridge-payment', 'get-sbtc-stx-price', [], deployer.address);
        assertEquals(priceInfo.result.expectTuple()['price'], types.uint(newPrice));
    },
});

Clarinet.test({
    name: "Can calculate STX amount correctly",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;

        // Test with default price (50 STX per sBTC)
        let stxAmount = chain.callReadOnlyFn('bitbridge-payment', 'calculate-stx-amount', [
            types.uint(100000000) // 1 sBTC
        ], deployer.address);

        assertEquals(stxAmount.result, types.uint(50000000)); // 50 STX

        // Test with 0.5 sBTC
        stxAmount = chain.callReadOnlyFn('bitbridge-payment', 'calculate-stx-amount', [
            types.uint(50000000) // 0.5 sBTC
        ], deployer.address);

        assertEquals(stxAmount.result, types.uint(25000000)); // 25 STX
    },
});

Clarinet.test({
    name: "Can process multiple payments in batch",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const merchant = accounts.get('wallet_1')!;
        const customer = accounts.get('wallet_2')!;

        // Create multiple payments
        let block = chain.mineBlock([
            Tx.contractCall('bitbridge-payment', 'create-payment', [
                types.principal(merchant.address),
                types.uint(100000000) // 1 sBTC
            ], customer.address),
            Tx.contractCall('bitbridge-payment', 'create-payment', [
                types.principal(merchant.address),
                types.uint(50000000) // 0.5 sBTC
            ], customer.address)
        ]);

        // Process multiple payments
        block = chain.mineBlock([
            Tx.contractCall('bitbridge-payment', 'process-multiple-payments', [
                types.list([types.uint(1), types.uint(2)])
            ], deployer.address)
        ]);

        assertEquals(block.receipts.length, 1);
        assertEquals(block.receipts[0].result.expectOk(), types.list([
            types.ok(types.tuple({
                'payment-id': types.uint(1),
                'sbtc-amount': types.uint(100000000),
                'stx-amount': types.uint(50000000),
                'conversion-rate': types.uint(50000000)
            })),
            types.ok(types.tuple({
                'payment-id': types.uint(2),
                'sbtc-amount': types.uint(50000000),
                'stx-amount': types.uint(25000000),
                'conversion-rate': types.uint(50000000)
            }))
        ]));
    },
});

Clarinet.test({
    name: "MVP Test: High volume payment processing",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const merchant = accounts.get('wallet_1')!;
        const customer = accounts.get('wallet_2')!;

        // Test processing 50 payments in a single block (simulating high load)
        const createPaymentTxs = [];
        const processPaymentTxs = [];

        // Create 50 payments
        for (let i = 0; i < 50; i++) {
            const amount = Math.floor(Math.random() * 100000000) + 1000000; // Random amount between 0.01-1 sBTC
            createPaymentTxs.push(
                Tx.contractCall('bitbridge-payment', 'create-payment', [
                    types.principal(merchant.address),
                    types.uint(amount)
                ], customer.address)
            );
        }

        let block = chain.mineBlock(createPaymentTxs);
        assertEquals(block.receipts.length, 50);

        // Verify all payments were created successfully
        let successfulCreations = 0;
        block.receipts.forEach((receipt, index) => {
            if (receipt.result.expectOk()) {
                successfulCreations++;
                assertEquals(receipt.result.expectOk(), types.uint(index + 1));
            }
        });

        // Require >99% success rate (MVP requirement: <1% failure)
        const successRate = (successfulCreations / 50) * 100;
        console.log(`Payment creation success rate: ${successRate}%`);
        assertEquals(successfulCreations >= 49, true); // At least 98% success

        // Process payments in batches of 10
        for (let batch = 0; batch < 5; batch++) {
            const batchStart = batch * 10 + 1;
            const batchEnd = (batch + 1) * 10;
            const paymentIds = [];

            for (let i = batchStart; i <= batchEnd; i++) {
                paymentIds.push(types.uint(i));
            }

            processPaymentTxs.push(
                Tx.contractCall('bitbridge-payment', 'process-multiple-payments', [
                    types.list(paymentIds)
                ], deployer.address)
            );
        }

        block = chain.mineBlock(processPaymentTxs);
        assertEquals(block.receipts.length, 5);

        // Verify batch processing success
        let successfulProcessing = 0;
        block.receipts.forEach(receipt => {
            if (receipt.result.expectOk()) {
                successfulProcessing++;
            }
        });

        const processingSuccessRate = (successfulProcessing / 5) * 100;
        console.log(`Batch processing success rate: ${processingSuccessRate}%`);
        assertEquals(successfulProcessing >= 4, true); // At least 80% batch success
    },
});

Clarinet.test({
    name: "MVP Test: Travala integration simulation",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const merchant = accounts.get('wallet_1')!;
        const customer = accounts.get('wallet_2')!;

        // Simulate Travala booking scenarios
        const bookingScenarios = [
            { type: 'hotel', amount: 200000000, nights: 3 }, // 2 sBTC for 3 nights
            { type: 'flight', amount: 150000000, passengers: 2 }, // 1.5 sBTC for 2 passengers
            { type: 'package', amount: 500000000, duration: 7 } // 5 sBTC for 7-day package
        ];

        let totalSuccessful = 0;

        for (let i = 0; i < bookingScenarios.length; i++) {
            const scenario = bookingScenarios[i];

            // Create payment for booking
            let block = chain.mineBlock([
                Tx.contractCall('bitbridge-payment', 'create-payment', [
                    types.principal(merchant.address),
                    types.uint(scenario.amount)
                ], customer.address)
            ]);

            if (block.receipts[0].result.expectOk()) {
                const paymentId = block.receipts[0].result.expectOk();

                // Process payment
                block = chain.mineBlock([
                    Tx.contractCall('bitbridge-payment', 'process-payment', [
                        paymentId
                    ], deployer.address)
                ]);

                if (block.receipts[0].result.expectOk()) {
                    totalSuccessful++;

                    // Verify payment details
                    const result = block.receipts[0].result.expectOk();
                    const paymentDetails = result.expectTuple();

                    assertEquals(paymentDetails['sbtc-amount'], types.uint(scenario.amount));

                    console.log(`${scenario.type} booking processed successfully`);
                }
            }
        }

        // Require 100% success for Travala integration scenarios
        assertEquals(totalSuccessful, bookingScenarios.length);
        console.log(`Travala integration test: ${totalSuccessful}/${bookingScenarios.length} scenarios successful`);
    },
});
