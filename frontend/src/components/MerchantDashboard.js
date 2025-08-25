import React, { useState, useEffect } from 'react';
import {
  callReadOnlyFunction,
  uintCV,
  principalCV
} from '@stacks/transactions';

const CONTRACT_ADDRESS = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM'; // Replace with actual deployed address
const CONTRACT_NAME = 'bitbridge-payment';

function MerchantDashboard({ userSession, network }) {
  const [balance, setBalance] = useState('0');
  const [payments, setPayments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [paymentCounter, setPaymentCounter] = useState(0);

  // Mock contract call function for demo
  const doContractCall = async (options) => {
    console.log('Mock contract call:', options);
    setTimeout(() => {
      if (options.onFinish) {
        options.onFinish({ txId: 'mock_tx_' + Math.random().toString(36).substr(2, 9) });
      }
    }, 1000);
  };

  const userAddress = userSession.loadUserData()?.profile?.stxAddress?.testnet || 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';

  useEffect(() => {
    if (userAddress) {
      fetchMerchantData();
    }
  }, [userAddress]);

  const fetchMerchantData = async () => {
    try {
      // For demo purposes, set some mock data
      setBalance('12.500000');
      setPaymentCounter(5);

      // Mock payment data
      const mockPayments = [
        {
          id: 1,
          merchant: userAddress,
          customer: 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG',
          amountSbtc: 0.01,
          amountStx: 0.5,
          status: 'completed',
          createdAt: 1000,
          processedAt: 1001
        },
        {
          id: 2,
          merchant: userAddress,
          customer: 'ST2JHG361ZXG51QTQTQPTWBYFEWD0PCWT0RNPK1C',
          amountSbtc: 0.005,
          amountStx: 0.25,
          status: 'completed',
          createdAt: 1002,
          processedAt: 1003
        }
      ];
      setPayments(mockPayments);
    } catch (error) {
      console.error('Error fetching merchant data:', error);
    }
  };

  const fetchBalance = async () => {
    try {
      const result = await callReadOnlyFunction({
        contractAddress: CONTRACT_ADDRESS,
        contractName: CONTRACT_NAME,
        functionName: 'get-merchant-balance',
        functionArgs: [principalCV(userAddress)],
        network,
        senderAddress: userAddress,
      });

      if (result.type === 'tuple') {
        const balanceValue = result.data['balance-stx'];
        setBalance((parseInt(balanceValue.value) / 1000000).toFixed(6)); // Convert to STX
      }
    } catch (error) {
      console.error('Error fetching balance:', error);
    }
  };

  const fetchPaymentCounter = async () => {
    try {
      const result = await callReadOnlyFunction({
        contractAddress: CONTRACT_ADDRESS,
        contractName: CONTRACT_NAME,
        functionName: 'get-payment-counter',
        functionArgs: [],
        network,
        senderAddress: userAddress,
      });

      if (result.type === 'uint') {
        setPaymentCounter(parseInt(result.value));
      }
    } catch (error) {
      console.error('Error fetching payment counter:', error);
    }
  };

  const fetchRecentPayments = async () => {
    try {
      const recentPayments = [];
      
      // Fetch last 10 payments or all payments if less than 10
      const maxPayments = Math.min(paymentCounter, 10);
      
      for (let i = Math.max(1, paymentCounter - 9); i <= paymentCounter; i++) {
        try {
          const result = await callReadOnlyFunction({
            contractAddress: CONTRACT_ADDRESS,
            contractName: CONTRACT_NAME,
            functionName: 'get-payment',
            functionArgs: [uintCV(i)],
            network,
            senderAddress: userAddress,
          });

          if (result.type === 'some' && result.value.type === 'tuple') {
            const payment = result.value.data;
            const merchantAddress = payment.merchant.address;
            
            // Only include payments for this merchant
            if (merchantAddress === userAddress) {
              recentPayments.push({
                id: i,
                merchant: merchantAddress,
                customer: payment.customer.address,
                amountSbtc: parseInt(payment['amount-sbtc'].value) / 100000000,
                amountStx: parseInt(payment['amount-stx'].value) / 1000000,
                status: payment.status.data,
                createdAt: parseInt(payment['created-at'].value),
                processedAt: payment['processed-at'].type === 'some' 
                  ? parseInt(payment['processed-at'].value.value) 
                  : null
              });
            }
          }
        } catch (error) {
          console.error(`Error fetching payment ${i}:`, error);
        }
      }
      
      setPayments(recentPayments.reverse()); // Show newest first
    } catch (error) {
      console.error('Error fetching recent payments:', error);
    }
  };

  const handleWithdraw = async (e) => {
    e.preventDefault();
    
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      alert('Please enter a valid withdrawal amount');
      return;
    }

    const withdrawAmountMicroStx = Math.floor(parseFloat(withdrawAmount) * 1000000);
    
    if (withdrawAmountMicroStx > parseFloat(balance) * 1000000) {
      alert('Insufficient balance');
      return;
    }

    setIsLoading(true);

    try {
      const txOptions = {
        contractAddress: CONTRACT_ADDRESS,
        contractName: CONTRACT_NAME,
        functionName: 'withdraw-balance',
        functionArgs: [uintCV(withdrawAmountMicroStx)],
        senderKey: userSession.loadUserData().appPrivateKey,
        validateWithAbi: true,
        network,
        onFinish: (data) => {
          setIsLoading(false);
          setWithdrawAmount('');
          alert(`Withdrawal initiated! Transaction ID: ${data.txId}`);
          fetchBalance(); // Refresh balance
        },
        onCancel: () => {
          setIsLoading(false);
        }
      };

      await doContractCall(txOptions);
    } catch (error) {
      console.error('Error withdrawing:', error);
      setIsLoading(false);
      alert('Error withdrawing: ' + error.message);
    }
  };

  return (
    <div className="merchant-dashboard">
      <h2>🏪 Merchant Dashboard</h2>
      
      <div className="dashboard-stats">
        <div className="stat-card">
          <h3>💰 Available Balance</h3>
          <p className="balance-amount">{balance} STX</p>
        </div>
        
        <div className="stat-card">
          <h3>📊 Total Payments</h3>
          <p className="payment-count">{payments.length}</p>
        </div>
      </div>

      <div className="withdraw-section">
        <h3>💸 Withdraw Balance</h3>
        <form onSubmit={handleWithdraw}>
          <div className="form-group">
            <label htmlFor="withdrawAmount">Amount (STX):</label>
            <input
              type="number"
              id="withdrawAmount"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              placeholder="0.000000"
              step="0.000001"
              min="0"
              max={balance}
            />
          </div>
          <button 
            type="submit" 
            disabled={isLoading || parseFloat(balance) === 0}
            className="withdraw-btn"
          >
            {isLoading ? 'Processing...' : 'Withdraw'}
          </button>
        </form>
      </div>

      <div className="payments-section">
        <h3>📋 Recent Payments</h3>
        <button onClick={fetchMerchantData} className="refresh-btn">
          🔄 Refresh
        </button>
        
        {payments.length === 0 ? (
          <p>No payments found for your address.</p>
        ) : (
          <div className="payments-table">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Customer</th>
                  <th>sBTC Amount</th>
                  <th>STX Amount</th>
                  <th>Status</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id}>
                    <td>{payment.id}</td>
                    <td title={payment.customer}>
                      {payment.customer.substring(0, 8)}...
                    </td>
                    <td>{payment.amountSbtc.toFixed(8)} sBTC</td>
                    <td>{payment.amountStx.toFixed(6)} STX</td>
                    <td>
                      <span className={`status ${payment.status}`}>
                        {payment.status}
                      </span>
                    </td>
                    <td>Block {payment.createdAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default MerchantDashboard;
