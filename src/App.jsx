// src/App.jsx
import { useEffect, useState, useCallback } from "react";
import { ethers } from "ethers";
import "./App.css";

const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

const CONTRACT_ABI = [
	{
		"inputs": [],
		"stateMutability": "nonpayable",
		"type": "constructor"
	},
	{
		"inputs": [],
		"name": "borrow",
		"outputs": [],
		"stateMutability": "payable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"name": "borrowerLoans",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "collateralAmount",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "loanAmount",
				"type": "uint256"
			},
			{
				"internalType": "bool",
				"name": "isRepaid",
				"type": "bool"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "deposit",
		"outputs": [],
		"stateMutability": "payable",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "getContractBalance",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "interestRate",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"name": "lenderBalances",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "owner",
		"outputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "repay",
		"outputs": [],
		"stateMutability": "payable",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "withdrawCollateral",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	}
];

function App() {
  // Blockchain connection states
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [account, setAccount] = useState(null);
  const [contract, setContract] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);

  // User input states
  const [lenderAmount, setLenderAmount] = useState("");
  const [collateralAmount, setCollateralAmount] = useState("");
  const [repayAmount, setRepayAmount] = useState("");

  // Contract data states
  const [contractBalance, setContractBalance] = useState(null);
  const [lenderBalance, setLenderBalance] = useState(null);
  const [borrowerLoan, setBorrowerLoan] = useState(null);
  const [interestRate, setInterestRate] = useState(null);

  // Transaction states
  const [isDepositing, setIsDepositing] = useState(false);
  const [isBorrowing, setIsBorrowing] = useState(false);
  const [isRepaying, setIsRepaying] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  // Alert state
  const [alert, setAlert] = useState({ show: false, message: "", type: "" });

  // Connect to blockchain
  const connectWallet = async () => {
    if (!window.ethereum) {
      showAlert("MetaMask not detected. Please install it.", "error");
      return;
    }

    setIsConnecting(true);
    try {
      const ethProvider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await ethProvider.send("eth_requestAccounts", []);
      const ethSigner = await ethProvider.getSigner();
      const network = await ethProvider.getNetwork();
      const contractInstance = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, ethSigner);

      setProvider(ethProvider);
      setSigner(ethSigner);
      setAccount(accounts[0]);
      setChainId(network.chainId);
      setContract(contractInstance);

      console.log("Connected to MetaMask with account:", accounts[0]);
      showAlert("Successfully connected to MetaMask", "success");
    } catch (err) {
      console.error("MetaMask connection failed:", err);
      showAlert("Failed to connect to MetaMask. " + err.message, "error");
    } finally {
      setIsConnecting(false);
    }
  };

  // Fetch contract data
  const fetchContractData = useCallback(async () => {
    if (!contract || !account) return;

    try {
      // Get contract balance
      const balance = await contract.getContractBalance();
      setContractBalance(ethers.formatEther(balance));

      // Get lender balance
      const lenderBal = await contract.lenderBalances(account);
      setLenderBalance(ethers.formatEther(lenderBal));

      // Get borrower loan
      const loan = await contract.borrowerLoans(account);
      setBorrowerLoan({
        collateralAmount: ethers.formatEther(loan.collateralAmount),
        loanAmount: ethers.formatEther(loan.loanAmount),
        isRepaid: loan.isRepaid
      });

      // Get interest rate
      const rate = await contract.interestRate();
      setInterestRate(Number(rate) / 100); // Assuming rate is in basis points (e.g. 500 = 5%)
    } catch (err) {
      console.error("Error fetching contract data:", err);
      showAlert("Failed to fetch contract data", "error");
    }
  }, [contract, account]);

  // Initialize app
  useEffect(() => {
    // Check if already connected to MetaMask
    if (window.ethereum) {
      connectWallet();
    }

    // Setup event listeners for MetaMask
    if (window.ethereum) {
      window.ethereum.on("accountsChanged", (accounts) => {
        setAccount(accounts[0]);
        showAlert("Account changed", "info");
      });

      window.ethereum.on("chainChanged", () => {
        window.location.reload();
      });

      window.ethereum.on("disconnect", () => {
        setAccount(null);
        setSigner(null);
        setProvider(null);
        setContract(null);
        showAlert("Disconnected from MetaMask", "info");
      });
    }

    return () => {
      // Clean up event listeners
      if (window.ethereum) {
        window.ethereum.removeAllListeners();
      }
    };
  }, []);

  // Fetch data when account or contract changes
  useEffect(() => {
    if (contract && account) {
      fetchContractData();
    }
  }, [contract, account, fetchContractData]);

  // Show alert helper
  const showAlert = (message, type = "info") => {
    setAlert({ show: true, message, type });
    setTimeout(() => setAlert({ show: false, message: "", type: "" }), 5000);
  };

  // Input validation
  const validateAmount = (amount) => {
    if (!amount || amount <= 0) {
      showAlert("Please enter a valid amount", "error");
      return false;
    }
    return true;
  };

  // Contract interaction functions
  const deposit = async () => {
    if (!contract) {
      showAlert("Contract not loaded yet", "error");
      return;
    }
    if (!validateAmount(lenderAmount)) return;

    setIsDepositing(true);
    try {
      const tx = await contract.deposit({
        value: ethers.parseEther(lenderAmount),
      });
      showAlert("Transaction submitted, waiting for confirmation...", "info");
      await tx.wait();
      showAlert("Deposit successful!", "success");
      setLenderAmount("");
      fetchContractData();
    } catch (err) {
      console.error("Deposit failed:", err);
      showAlert(err.reason || "Deposit failed. Check console for details.", "error");
    } finally {
      setIsDepositing(false);
    }
  };

  const borrow = async () => {
    if (!contract) {
      showAlert("Contract not loaded yet", "error");
      return;
    }
    if (!validateAmount(collateralAmount)) return;

    setIsBorrowing(true);
    try {
      const tx = await contract.borrow({
        value: ethers.parseEther(collateralAmount),
      });
      showAlert("Transaction submitted, waiting for confirmation...", "info");
      await tx.wait();
      showAlert("Borrow successful!", "success");
      setCollateralAmount("");
      fetchContractData();
    } catch (err) {
      console.error("Borrow failed:", err);
      showAlert(err.reason || "Borrow failed. Check console for details.", "error");
    } finally {
      setIsBorrowing(false);
    }
  };

  const repay = async () => {
    if (!contract) {
      showAlert("Contract not loaded yet", "error");
      return;
    }
    if (!validateAmount(repayAmount)) return;

    setIsRepaying(true);
    try {
      const tx = await contract.repay({
        value: ethers.parseEther(repayAmount),
      });
      showAlert("Transaction submitted, waiting for confirmation...", "info");
      await tx.wait();
      showAlert("Loan repaid successfully!", "success");
      setRepayAmount("");
      fetchContractData();
    } catch (err) {
      console.error("Repay failed:", err);
      showAlert(err.reason || "Repay failed. Check console for details.", "error");
    } finally {
      setIsRepaying(false);
    }
  };

  const withdrawCollateral = async () => {
    if (!contract) {
      showAlert("Contract not loaded yet", "error");
      return;
    }

    setIsWithdrawing(true);
    try {
      const tx = await contract.withdrawCollateral();
      showAlert("Transaction submitted, waiting for confirmation...", "info");
      await tx.wait();
      showAlert("Collateral withdrawn successfully!", "success");
      fetchContractData();
    } catch (err) {
      console.error("Withdrawal failed:", err);
      showAlert(err.reason || "Withdrawal failed. Check console for details.", "error");
    } finally {
      setIsWithdrawing(false);
    }
  };

  // Format address for display
  const formatAddress = (address) => {
    if (!address) return "";
    return address.slice(0, 6) + "..." + address.slice(-4);
  };

  return (
    <div className="app-container">
      <header>
        <h1>💸 DeFi Lending & Borrowing</h1>
        <div className="wallet-connection">
          {account ? (
            <div className="wallet-info">
              <span className="account-badge">{formatAddress(account)}</span>
              <span className="network-badge">
                {chainId ? `Chain ID: ${chainId}` : "Unknown Network"}
              </span>
            </div>
          ) : (
            <button 
              className="connect-button" 
              onClick={connectWallet}
              disabled={isConnecting}
            >
              {isConnecting ? "Connecting..." : "Connect Wallet"}
            </button>
          )}
        </div>
      </header>

      {alert.show && (
        <div className={`alert ${alert.type}`}>
          {alert.message}
        </div>
      )}

      <div className="dashboard">
        <div className="stats-panel">
          <h2>Platform Stats</h2>
          <div className="stats-container">
            <div className="stat-item">
              <div className="stat-label">Contract Balance</div>
              <div className="stat-value">{contractBalance ? `${contractBalance} ETH` : "Loading..."}</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">Your Lender Balance</div>
              <div className="stat-value">{lenderBalance ? `${lenderBalance} ETH` : "Loading..."}</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">Interest Rate</div>
              <div className="stat-value">{interestRate ? `${interestRate}%` : "Loading..."}</div>
            </div>
          </div>
        </div>

        {borrowerLoan && (
          <div className="loan-status">
            <h2>Your Loan Status</h2>
            <div className="stats-container">
              <div className="stat-item">
                <div className="stat-label">Collateral</div>
                <div className="stat-value">{borrowerLoan.collateralAmount} ETH</div>
              </div>
              <div className="stat-item">
                <div className="stat-label">Loan Amount</div>
                <div className="stat-value">{borrowerLoan.loanAmount} ETH</div>
              </div>
              <div className="stat-item">
                <div className="stat-label">Status</div>
                <div className="stat-value">
                  {Number(borrowerLoan.collateralAmount) > 0 ? 
                    (borrowerLoan.isRepaid ? "Repaid" : "Active") : 
                    "No Loan"}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="actions-panel">
          <div className="action-card">
            <h2>📥 Deposit as Lender</h2>
            <p>Provide liquidity to earn interest</p>
            <div className="input-group">
              <input
                type="number"
                placeholder="Amount in ETH"
                value={lenderAmount}
                onChange={(e) => setLenderAmount(e.target.value)}
                min="0"
                step="0.01"
              />
              <button 
                onClick={deposit} 
                disabled={isDepositing || !account}
                className={isDepositing ? "loading" : ""}
              >
                {isDepositing ? "Processing..." : "Deposit"}
              </button>
            </div>
          </div>

          <div className="action-card">
            <h2>💰 Borrow with Collateral</h2>
            <p>Provide collateral to get a loan</p>
            <div className="input-group">
              <input
                type="number"
                placeholder="Collateral in ETH"
                value={collateralAmount}
                onChange={(e) => setCollateralAmount(e.target.value)}
                min="0"
                step="0.01"
              />
              <button 
                onClick={borrow} 
                disabled={isBorrowing || !account}
                className={isBorrowing ? "loading" : ""}
              >
                {isBorrowing ? "Processing..." : "Borrow"}
              </button>
            </div>
          </div>

          <div className="action-card">
            <h2>🔄 Repay Loan</h2>
            <p>Repay your borrowed amount with interest</p>
            <div className="input-group">
              <input
                type="number"
                placeholder="Repay amount in ETH"
                value={repayAmount}
                onChange={(e) => setRepayAmount(e.target.value)}
                min="0"
                step="0.01"
              />
              <button 
                onClick={repay} 
                disabled={isRepaying || !account}
                className={isRepaying ? "loading" : ""}
              >
                {isRepaying ? "Processing..." : "Repay"}
              </button>
            </div>
          </div>

          <div className="action-card">
            <h2>📤 Withdraw Collateral</h2>
            <p>Get your collateral back after repaying</p>
            <div className="input-group">
              <button 
                onClick={withdrawCollateral} 
                disabled={isWithdrawing || !account || !borrowerLoan || !borrowerLoan.isRepaid}
                className={isWithdrawing ? "loading" : ""}
              >
                {isWithdrawing ? "Processing..." : "Withdraw Collateral"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <footer>
        <p>DeFi Lending & Borrowing Platform © 2025</p>
        <p>Contract: {CONTRACT_ADDRESS.slice(0, 6)}...{CONTRACT_ADDRESS.slice(-4)}</p>
      </footer>
    </div>
  );
}

export default App;