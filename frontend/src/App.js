import React, { useState, useEffect } from 'react';
import { StacksTestnet } from '@stacks/network';
import { AppConfig, UserSession, showConnect } from '@stacks/connect';
import PaymentForm from './components/PaymentForm';
import MerchantDashboard from './components/MerchantDashboard';
import PriceDisplay from './components/PriceDisplay';
import './App.css';

const appConfig = new AppConfig(['store_write', 'publish_data']);
const userSession = new UserSession({ appConfig });

function App() {
  const [userData, setUserData] = useState(null);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [activeTab, setActiveTab] = useState('payment');
  const [network] = useState(new StacksTestnet());

  useEffect(() => {
    if (userSession.isSignInPending()) {
      userSession.handlePendingSignIn().then((userData) => {
        setUserData(userData);
        setIsSignedIn(true);
      });
    } else if (userSession.isUserSignedIn()) {
      setUserData(userSession.loadUserData());
      setIsSignedIn(true);
    }
  }, []);

  const connectWallet = () => {
    showConnect({
      appDetails: {
        name: 'BitBridge Payment Gateway',
        icon: window.location.origin + '/logo.png',
      },
      redirectTo: '/',
      onFinish: () => {
        window.location.reload();
      },
      userSession,
    });
  };

  const disconnectWallet = () => {
    userSession.signUserOut('/');
    setIsSignedIn(false);
    setUserData(null);
  };

  return (
    <div className="App">
      <header className="App-header">
        <div className="header-content">
          <h1>🌉 BitBridge</h1>
          <p>Decentralized Bitcoin Payment Gateway</p>
          
          {!isSignedIn ? (
            <button onClick={connectWallet} className="connect-btn">
              Connect Stacks Wallet
            </button>
          ) : (
            <div className="wallet-info">
              <span>Connected: {userData?.profile?.stxAddress?.testnet}</span>
              <button onClick={disconnectWallet} className="disconnect-btn">
                Disconnect
              </button>
            </div>
          )}
        </div>
      </header>

      {isSignedIn && (
        <main className="main-content">
          <nav className="tab-nav">
            <button 
              className={activeTab === 'payment' ? 'active' : ''}
              onClick={() => setActiveTab('payment')}
            >
              💳 Make Payment
            </button>
            <button 
              className={activeTab === 'merchant' ? 'active' : ''}
              onClick={() => setActiveTab('merchant')}
            >
              🏪 Merchant Dashboard
            </button>
            <button 
              className={activeTab === 'price' ? 'active' : ''}
              onClick={() => setActiveTab('price')}
            >
              📊 Price Feed
            </button>
          </nav>

          <div className="tab-content">
            {activeTab === 'payment' && (
              <PaymentForm 
                userSession={userSession}
                network={network}
              />
            )}
            {activeTab === 'merchant' && (
              <MerchantDashboard 
                userSession={userSession}
                network={network}
              />
            )}
            {activeTab === 'price' && (
              <PriceDisplay 
                userSession={userSession}
                network={network}
              />
            )}
          </div>
        </main>
      )}

      {!isSignedIn && (
        <div className="welcome-section">
          <h2>Welcome to BitBridge</h2>
          <p>Connect your Stacks wallet to start accepting sBTC payments with automatic STX conversion.</p>
          <div className="features">
            <div className="feature">
              <h3>🔄 Auto-Conversion</h3>
              <p>Automatic sBTC to STX conversion using real-time price feeds</p>
            </div>
            <div className="feature">
              <h3>⚡ Fast Processing</h3>
              <p>Quick payment processing with batch transaction support</p>
            </div>
            <div className="feature">
              <h3>🔒 Secure</h3>
              <p>Built on Stacks blockchain with Clarity smart contracts</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
