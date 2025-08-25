#!/usr/bin/env node

/**
 * BitBridge STX Conversion Test Script
 * Tests the sBTC to STX conversion logic locally
 */

// Mock conversion function based on contract logic
function calculateStxAmount(sbtcAmount, price = 50000000) {
    // sBTC has 8 decimals, STX has 6 decimals
    // Price is in 6 decimal precision
    // Formula: (sbtc-amount * price) / 10^8
    return Math.floor((sbtcAmount * price) / Math.pow(10, 8));
}

// Test cases
const testCases = [
    {
        name: "1 sBTC to STX (default price)",
        sbtcAmount: 100000000, // 1 sBTC
        expectedStx: 50000000,  // 50 STX
        price: 50000000
    },
    {
        name: "0.5 sBTC to STX (default price)",
        sbtcAmount: 50000000,   // 0.5 sBTC
        expectedStx: 25000000,  // 25 STX
        price: 50000000
    },
    {
        name: "1 sBTC to STX (75 STX price)",
        sbtcAmount: 100000000,  // 1 sBTC
        expectedStx: 75000000,  // 75 STX
        price: 75000000
    },
    {
        name: "0.1 sBTC to STX (default price)",
        sbtcAmount: 10000000,   // 0.1 sBTC
        expectedStx: 5000000,   // 5 STX
        price: 50000000
    }
];

console.log("🧪 BitBridge STX Conversion Tests\n");

let passed = 0;
let failed = 0;

testCases.forEach((testCase, index) => {
    const result = calculateStxAmount(testCase.sbtcAmount, testCase.price);
    const success = result === testCase.expectedStx;
    
    console.log(`Test ${index + 1}: ${testCase.name}`);
    console.log(`  sBTC Amount: ${testCase.sbtcAmount} (${testCase.sbtcAmount / 100000000} sBTC)`);
    console.log(`  Price: ${testCase.price} (${testCase.price / 1000000} STX per sBTC)`);
    console.log(`  Expected STX: ${testCase.expectedStx} (${testCase.expectedStx / 1000000} STX)`);
    console.log(`  Actual STX: ${result} (${result / 1000000} STX)`);
    console.log(`  Status: ${success ? '✅ PASS' : '❌ FAIL'}\n`);
    
    if (success) {
        passed++;
    } else {
        failed++;
    }
});

console.log(`📊 Test Results: ${passed} passed, ${failed} failed`);

if (failed === 0) {
    console.log("🎉 All conversion tests passed!");
    process.exit(0);
} else {
    console.log("💥 Some tests failed!");
    process.exit(1);
}
