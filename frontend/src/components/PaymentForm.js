import React, { useState, useEffect } from 'react';
import {
  AnchorMode,
  PostConditionMode,
  uintCV,
  principalCV
} from '@stacks/transactions';

const CONTRACT_ADDRESS = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM'; // Replace with actual deployed address
const CONTRACT_NAME = 'bitbridge-payment';

function PaymentForm({ userSession, network }) {
  const [merchantAddress, setMerchantAddress] = useState('');
  const [sbtcAmount, setSbtcAmount] = useState('');
  const [estimatedStx, setEstimatedStx] = useState('0');
  const [isLoading, setIsLoading] = useState(false);
  const [txId, setTxId] = useState('');
  const [currentPrice, setCurrentPrice] = useState(50); // Default price

  // Mock contract call function for demo
  const doContractCall = async (options) => {
    console.log('Mock contract call:', options);
    // Simulate transaction
    setTimeout(() => {
      if (options.onFinish) {
        options.onFinish({ txId: 'mock_tx_' + Math.random().toString(36).substr(2, 9) });
      }
    }, 1000);
  };

  useEffect(() => {
    // Fetch current price when component mounts
    fetchCurrentPrice();
  }, []);

  useEffect(() => {
    // Calculate estimated STX when sBTC amount changes
    if (sbtcAmount && currentPrice) {
      const sbtcInSatoshis = parseFloat(sbtcAmount) * 100000000; // Convert to satoshis
      const stxAmount = (sbtcInSatoshis * currentPrice) / 100000000; // Apply conversion
      setEstimatedStx((stxAmount / 1000000).toFixed(6)); // Convert to STX display format
    } else {
      setEstimatedStx('0');
    }
  }, [sbtcAmount, currentPrice]);

  const fetchCurrentPrice = async () => {
    try {
      // In a real implementation, this would call the contract's get-sbtc-stx-price function
      // For now, we'll use the default price
      setCurrentPrice(50);
    } catch (error) {
      console.error('Error fetching price:', error);
    }
  };

  const handleCreatePayment = async (e) => {
    e.preventDefault();
    
    if (!merchantAddress || !sbtcAmount) {
      alert('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    setTxId('');

    try {
      const sbtcInSatoshis = Math.floor(parseFloat(sbtcAmount) * 100000000);

      const txOptions = {
        contractAddress: CONTRACT_ADDRESS,
        contractName: CONTRACT_NAME,
        functionName: 'create-payment',
        functionArgs: [
          principalCV(merchantAddress),
          uintCV(sbtcInSatoshis)
        ],
        senderKey: userSession.loadUserData().appPrivateKey,
        validateWithAbi: true,
        network,
        anchorMode: AnchorMode.Any,
        postConditionMode: PostConditionMode.Allow,
        onFinish: (data) => {
          setTxId(data.txId);
          setIsLoading(false);
          alert(`Payment created! Transaction ID: ${data.txId}`);
        },
        onCancel: () => {
          setIsLoading(false);
        }
      };

      await doContractCall(txOptions);
    } catch (error) {
      console.error('Error creating payment:', error);
      setIsLoading(false);
      alert('Error creating payment: ' + error.message);
    }
  };

  const handleProcessPayment = async (paymentId) => {
    if (!paymentId) {
      alert('Please enter a payment ID');
      return;
    }

    setIsLoading(true);

    try {
      const txOptions = {
        contractAddress: CONTRACT_ADDRESS,
        contractName: CONTRACT_NAME,
        functionName: 'process-payment',
        functionArgs: [uintCV(parseInt(paymentId))],
        senderKey: userSession.loadUserData().appPrivateKey,
        validateWithAbi: true,
        network,
        anchorMode: AnchorMode.Any,
        postConditionMode: PostConditionMode.Allow,
        onFinish: (data) => {
          setTxId(data.txId);
          setIsLoading(false);
          alert(`Payment processed! Transaction ID: ${data.txId}`);
        },
        onCancel: () => {
          setIsLoading(false);
        }
      };

      await doContractCall(txOptions);
    } catch (error) {
      console.error('Error processing payment:', error);
      setIsLoading(false);
      alert('Error processing payment: ' + error.message);
    }
  };

  return (
    <div className="payment-form">
      <h2>💳 Create sBTC Payment</h2>
      
      <div className="price-info">
        <p>Current Rate: <strong>{currentPrice} STX per sBTC</strong></p>
      </div>

      <form onSubmit={handleCreatePayment}>
        <div className="form-group">
          <label htmlFor="merchantAddress">Merchant Address:</label>
          <input
            type="text"
            id="merchantAddress"
            value={merchantAddress}
            onChange={(e) => setMerchantAddress(e.target.value)}
            placeholder="ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="sbtcAmount">sBTC Amount:</label>
          <input
            type="number"
            id="sbtcAmount"
            value={sbtcAmount}
            onChange={(e) => setSbtcAmount(e.target.value)}
            placeholder="0.001"
            step="0.00000001"
            min="0"
            required
          />
        </div>

        <div className="conversion-preview">
          <p>Estimated STX: <strong>{estimatedStx} STX</strong></p>
        </div>

        <button 
          type="submit" 
          disabled={isLoading}
          className="submit-btn"
        >
          {isLoading ? 'Creating...' : 'Create Payment'}
        </button>
      </form>

      <div className="process-payment-section">
        <h3>🔄 Process Existing Payment</h3>
        <div className="form-group">
          <label htmlFor="paymentId">Payment ID:</label>
          <input
            type="number"
            id="paymentId"
            placeholder="1"
            min="1"
          />
          <button 
            onClick={() => handleProcessPayment(document.getElementById('paymentId').value)}
            disabled={isLoading}
            className="process-btn"
          >
            {isLoading ? 'Processing...' : 'Process Payment'}
          </button>
        </div>
      </div>

      {txId && (
        <div className="transaction-result">
          <h3>✅ Transaction Submitted</h3>
          <p>Transaction ID: <code>{txId}</code></p>
          <p>
            <a 
              href={`https://explorer.stacks.co/txid/${txId}?chain=testnet`}
              target="_blank"
              rel="noopener noreferrer"
            >
              View on Explorer
            </a>
          </p>
        </div>
      )}
    </div>
  );
}

export default PaymentForm;
