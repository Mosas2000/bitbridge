import React, { useState, useEffect } from 'react';
import {
  callReadOnlyFunction,
  uintCV
} from '@stacks/transactions';

const CONTRACT_ADDRESS = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM'; // Replace with actual deployed address
const CONTRACT_NAME = 'bitbridge-payment';

function PriceDisplay({ userSession, network }) {
  const [priceInfo, setPriceInfo] = useState({ price: 0, lastUpdated: 0 });
  const [newPrice, setNewPrice] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

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
    fetchPriceInfo();
    checkAdminStatus();
  }, []);

  const fetchPriceInfo = async () => {
    try {
      const result = await callReadOnlyFunction({
        contractAddress: CONTRACT_ADDRESS,
        contractName: CONTRACT_NAME,
        functionName: 'get-sbtc-stx-price',
        functionArgs: [],
        network,
        senderAddress: userAddress,
      });

      if (result.type === 'tuple') {
        const price = parseInt(result.data.price.value) / 1000000; // Convert to STX
        const lastUpdated = parseInt(result.data['last-updated'].value);
        setPriceInfo({ price, lastUpdated });
      }
    } catch (error) {
      console.error('Error fetching price info:', error);
    }
  };

  const checkAdminStatus = () => {
    // In a real implementation, you would check if the current user is the contract owner
    // For demo purposes, we'll assume the deployer is the admin
    // This should be replaced with actual contract owner check
    setIsAdmin(true); // Set to false for non-admin users
  };

  const handleUpdatePrice = async (e) => {
    e.preventDefault();
    
    if (!newPrice || parseFloat(newPrice) <= 0) {
      alert('Please enter a valid price');
      return;
    }

    const priceInMicroStx = Math.floor(parseFloat(newPrice) * 1000000);
    setIsLoading(true);

    try {
      const txOptions = {
        contractAddress: CONTRACT_ADDRESS,
        contractName: CONTRACT_NAME,
        functionName: 'update-price-feed',
        functionArgs: [uintCV(priceInMicroStx)],
        senderKey: userSession.loadUserData().appPrivateKey,
        validateWithAbi: true,
        network,
        onFinish: (data) => {
          setIsLoading(false);
          setNewPrice('');
          alert(`Price updated! Transaction ID: ${data.txId}`);
          setTimeout(fetchPriceInfo, 2000); // Refresh price after 2 seconds
        },
        onCancel: () => {
          setIsLoading(false);
        }
      };

      await doContractCall(txOptions);
    } catch (error) {
      console.error('Error updating price:', error);
      setIsLoading(false);
      alert('Error updating price: ' + error.message);
    }
  };

  const calculateConversion = (sbtcAmount) => {
    return (sbtcAmount * priceInfo.price).toFixed(6);
  };

  return (
    <div className="price-display">
      <h2>📊 Price Feed</h2>
      
      <div className="current-price">
        <div className="price-card">
          <h3>Current Exchange Rate</h3>
          <p className="price-value">{priceInfo.price.toFixed(6)} STX per sBTC</p>
          <p className="last-updated">
            Last updated: Block {priceInfo.lastUpdated}
          </p>
        </div>
      </div>

      <div className="conversion-calculator">
        <h3>🧮 Conversion Calculator</h3>
        <div className="calculator-grid">
          <div className="conversion-row">
            <span>1 sBTC =</span>
            <span>{calculateConversion(1)} STX</span>
          </div>
          <div className="conversion-row">
            <span>0.1 sBTC =</span>
            <span>{calculateConversion(0.1)} STX</span>
          </div>
          <div className="conversion-row">
            <span>0.01 sBTC =</span>
            <span>{calculateConversion(0.01)} STX</span>
          </div>
          <div className="conversion-row">
            <span>0.001 sBTC =</span>
            <span>{calculateConversion(0.001)} STX</span>
          </div>
        </div>
      </div>

      {isAdmin && (
        <div className="admin-section">
          <h3>⚙️ Admin Controls</h3>
          <p className="admin-note">
            ⚠️ Only contract administrators can update the price feed
          </p>
          
          <form onSubmit={handleUpdatePrice}>
            <div className="form-group">
              <label htmlFor="newPrice">New Price (STX per sBTC):</label>
              <input
                type="number"
                id="newPrice"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                placeholder="50.000000"
                step="0.000001"
                min="0"
              />
            </div>
            <button 
              type="submit" 
              disabled={isLoading}
              className="update-price-btn"
            >
              {isLoading ? 'Updating...' : 'Update Price'}
            </button>
          </form>
        </div>
      )}

      <div className="price-history">
        <h3>📈 Price Information</h3>
        <div className="info-grid">
          <div className="info-item">
            <strong>Precision:</strong> 6 decimal places
          </div>
          <div className="info-item">
            <strong>Update Frequency:</strong> On-demand (admin only)
          </div>
          <div className="info-item">
            <strong>Network:</strong> Stacks Testnet
          </div>
          <div className="info-item">
            <strong>Contract:</strong> {CONTRACT_NAME}
          </div>
        </div>
      </div>

      <button onClick={fetchPriceInfo} className="refresh-btn">
        🔄 Refresh Price Data
      </button>
    </div>
  );
}

export default PriceDisplay;
