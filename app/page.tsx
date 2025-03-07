"use client";
import { useCallback, useState, useEffect } from "react";
import { ethers } from "ethers";
import { BigNumberish } from "ethers";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export interface EIP6963ProviderInfo {
  rdns: string;
  uuid: string;
  name: string;
  icon: string;
}

export interface EIP6963ProviderDetail {
  info: EIP6963ProviderInfo;
  provider: EIP1193Provider;
}

export type EIP6963AnnounceProviderEvent = {
  detail: {
    info: EIP6963ProviderInfo;
    provider: Readonly<EIP1193Provider>;
  };
};

export interface EIP1193Provider {
  isStatus?: boolean;
  host?: string;
  path?: string;
  sendAsync?: (
    request: { method: string; params?: Array<unknown> },
    callback: (error: Error | null, response: unknown) => void
  ) => void;
  send?: (
    request: { method: string; params?: Array<unknown> },
    callback: (error: Error | null, response: unknown) => void
  ) => void;
  request: (request: {
    method: string;
    params?: Array<unknown>;
  }) => Promise<unknown>;
}

declare global {
  interface WindowEventMap {
    "eip6963:announceProvider": CustomEvent;
  }
}

const contractABI = [
  { inputs: [], stateMutability: "nonpayable", type: "constructor" },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "sender",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "Deposit",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint256",
        name: "newValue",
        type: "uint256",
      },
    ],
    name: "ValueSet",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "recipient",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "Withdrawal",
    type: "event",
  },
  { stateMutability: "payable", type: "fallback" },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "balances",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "deposit",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "account", type: "address" }],
    name: "getBalance",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getContractBalance",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "owner",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "paused",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "bool", name: "_paused", type: "bool" }],
    name: "setPaused",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "newValue", type: "uint256" }],
    name: "setValue",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "value",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "amount", type: "uint256" }],
    name: "withdraw",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  { stateMutability: "payable", type: "receive" },
];

const privateKey =
  "19aa39c5a2138f46426599fefc29fb19fab34f303f12b41a9f3e85ee0962dc37";

export default function Home() {
  const [accountData, setAccountData] = useState<string | null>(null);
  const [balance, setBalance] = useState("");
  const [contractValue, setContractValue] = useState<string | null>(null);
  const [getContractBalance, setContractBalance] = useState<string | null>(
    null
  );
  const [owneraddress, setOwnerAddress] = useState<string | null>(null);
  const [balancescontract, setBalancesContract] = useState<string>("");
  const [inputValue, setInputValue] = useState("");
  const [withdrawValue, setWithdrawValue] = useState("");
  const [networkId, setNetworkId] = useState<string>("");
  const INFURA_ID = "981e6d84563847699facc2ff1b670358";
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const NETWORKS: Record<
    string,
    { contractAddress: string; providerUrl: string }
  > = {
    "0xaa36a7": {
      contractAddress: "0x63f98d1992f78e0c2c91a0f06eac5856025f8660",
      providerUrl: `https://sepolia.infura.io/v3/${INFURA_ID}`,
    },
    "0x4268": {
      contractAddress: "0x7e6c0afc657f5abe06dfdf9653387a79fb010a92",
      providerUrl: `https://holesky.infura.io/v3/${INFURA_ID}`,
    },
  };
  const initializeContract = useCallback(async (chainId: string) => {
    const network = NETWORKS[chainId as keyof typeof NETWORKS];
    if (network) {
      const provider = new ethers.JsonRpcProvider(network.providerUrl);
      const wallet = new ethers.Wallet(privateKey, provider);
      const contractInstance = new ethers.Contract(
        network.contractAddress,
        contractABI,
        wallet
      );
      setContract(contractInstance);
      console.log("Contract initialized: ", contractInstance);
      await readContract(contractInstance);
      await writeContract(contractInstance);
    } else {
      toast.error("Unsupported network. Please switch to Sepolia or Holesky.");
    }
  }, []);

  useEffect(() => {
    const handleChainChange = async (chainId: string) => {
      setNetworkId(chainId);
      await initializeContract(chainId);
      if (accountData) updateBalance(accountData);
    };

    const checkWalletConnection = async () => {
      if (typeof window.ethereum !== "undefined") {
        const accounts = await window.ethereum.request({
          method: "eth_accounts",
        });
        if (accounts.length > 0) {
          setAccountData(accounts[0]);
          updateBalance(accounts[0]);
        }
        const chainId = await window.ethereum.request({
          method: "eth_chainId",
        });
        await handleChainChange(chainId);
      }
    };

    if (typeof window.ethereum !== "undefined") {
      window.ethereum.on("chainChanged", handleChainChange);
      window.ethereum.on("accountsChanged", (accounts: string[]) => {
        if (accounts.length === 0) {
          handleDisconnect();
        } else {
          setAccountData(accounts[0]);
          updateBalance(accounts[0]);
        }
      });
      checkWalletConnection();
    }

    return () => {
      if (typeof window.ethereum !== "undefined") {
        window.ethereum.removeListener("chainChanged", handleChainChange);
        window.ethereum.removeListener("accountsChanged", handleChainChange);
      }
    };
  }, [initializeContract]);

  const updateBalance = async (address: string) => {
    const balanceHex: BigNumberish = await window.ethereum.request({
      method: "eth_getBalance",
      params: [address, "latest"],
    });
    const balanceInEther = ethers.formatEther(balanceHex);
    setBalance(`${balanceInEther} ETH`);
  };
  const connectWithProvider = async (provider: EIP1193Provider) => {
    try {
      handleDisconnect();

      const accounts = await provider.request({
        method: "eth_requestAccounts",
      });

      setAccountData(accounts[0]);
      updateBalance(accounts[0]);
      checkNetwork(provider);
      const chainId = await provider.request({ method: "eth_chainId" });
      setNetworkId(chainId);
      await initializeContract(chainId);

      if (contract) {
        readContract(contract);
      }
    } catch (error) {
      console.error("Failed to connect to provider:", error);
    }
  };
  const readContract = async (contractInstance: ethers.Contract) => {
    if (!contractInstance) return;
    try {
      console.log("write contract", contract);
      const value = await contractInstance.value();
      setContractValue(value.toString());
      const getcontractBalance = await contractInstance.getContractBalance();
      setContractBalance(getcontractBalance.toString());
      const owner = await contractInstance.owner();
      setOwnerAddress(owner);
      if (accountData) {
        const balances = await contractInstance.balances(accountData);
        setBalancesContract(balances.toString());
      }
    } catch (error) {
      console.error("Error reading contract:", error);
    }
  };
  const writeContract = async (
    contractInstance: ethers.Contract,
    method: string,
    params: any[] = [],
    value: BigNumberish = "0"
  ) => {
    if (!contractInstance) {
      console.error("Contract is not initialized.");
      toast.error("Contract is not initialized.");
      return;
    }

    if (!Array.isArray(params)) {
      console.error("Params must be an array");
      toast.error("Params must be an array");
      return;
    }

    try {
      const gasLimit = await contractInstance.estimateGas[method](...params, {
        value,
      });
      const provider = contractInstance.provider;
      const feeData = await provider.getFeeData();

      const gasPrice = feeData.maxFeePerGas || feeData.gasPrice;

      if (!gasPrice) {
        console.error("Failed to get gas price");
        toast.error("Failed to get gas price.");
        return;
      }

      if (!gasPrice || gasPrice.toString() === "0") {
        console.error("Gas price is undefined or zero.");
        toast.error("Gas price is undefined or zero.");
        return;
      }

      const tx = await contractInstance[method](...params, {
        value,
        gasPrice,
        gasLimit,
      });

      await tx.wait();
      console.log(`${method} transaction successful`);

      await readContract(contractInstance);
    } catch (error) {
      console.error(`Error writing to contract: ${method}`, error);
      toast.error(`Error writing to contract: ${method}, ${error.message}`);
    }
  };
  const handleWithdraw = async () => {
    try {
      const amountToWithdraw = ethers.parseUnits(withdrawValue, "ether");
      if (contract) {
        console.log("Attempting to withdraw:", amountToWithdraw.toString());
        await writeContract(contract, "withdraw", [amountToWithdraw]);
      } else {
        console.error("Contract instance is not available.");
        toast.error("Contract instance is not available.");
      }
    } catch (error) {
      console.error("Error converting input to BigNumberish:", error);
      toast.error("Invalid amount entered. Please enter a valid number.");
    }
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(event.target.value);
  };

  const handleWithdrawChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setWithdrawValue(event.target.value);
  };

  const handleSetValue = () => {
    const valueInWei = ethers.parseUnits(inputValue, "wei");
    writeContract("setValue", [valueInWei]);
  };

  const handleConnectClick = useCallback(() => {
    if (typeof window.ethereum !== "undefined") {
      const provider = window.ethereum;
      connectWithProvider(provider);
    } else {
      console.error(
        "MetaMask is not installed. Please install it to use this feature."
      );
    }
  }, []);

  const checkNetwork = async (provider: any) => {
    const chainId = await provider.request({ method: "eth_chainId" });
    setNetworkId(chainId);
    if (!NETWORKS[chainId as keyof typeof NETWORKS]) {
      alert(
        "You are not connected to a supported network. Please switch to Sepolia or Holesky."
      );
    } else {
      await readContract();
    }
  };

  const handleChainSwitch = async () => {
    try {
      const currentChainId = await window.ethereum.request({
        method: "eth_chainId",
      });
      if (currentChainId === "0xaa36a7") {
        alert("Already connected to Sepolia Testnet.");
        return;
      }
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0xaa36a7" }],
      });
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: "0xaa36a7",
              chainName: "Sepolia Testnet",
              nativeCurrency: {
                name: "Sepolia ETH",
                symbol: "SepoliaETH",
                decimals: 18,
              },
              rpcUrls: [
                "https://sepolia.infura.io/v3/981e6d84563847699facc2ff1b670358",
              ],
              blockExplorerUrls: ["https://sepolia.etherscan.io"],
            },
          ],
        });
      } else {
        console.error("Failed to switch network");
      }
    }
  };

  const handleDisconnect = () => {
    setAccountData(null);
    setBalance("");
    setContractValue(null);
    setContractBalance(null);
    setOwnerAddress(null);
    setBalancesContract("");
    setNetworkId("");
    setInputValue("");
    setWithdrawValue("");
    setContract(null);
  };

  return (
    <div className="h-full flex flex-col before:from-white after:from-sky-200 py-2">
      <ToastContainer />
      <div className="flex flex-col flex-1 justify-center items-center">
        <div className="grid gap-4">
          <h1 className="text-2xl font-bold mb-4">
            Ethereum Contract Interaction
          </h1>
          <button
            onClick={handleConnectClick}
            className="bg-black btn text-white p-4 rounded-lg"
          >
            Connect to MetaMask
          </button>
          {accountData && <p>Connected Account: {accountData}</p>}
          {accountData && <p>Balance: {balance}</p>}
          {accountData && (
            <div>
              <li>Contract Value: {contractValue}</li>
              <li>GetContractBalance: {getContractBalance}</li>
              <li>OwnerAddress: {owneraddress}</li>
              <li>Balances: {balancescontract}</li>
              <li>Network Id: {networkId}</li>
              <div>
                <input
                  type="text"
                  value={inputValue}
                  onChange={handleInputChange}
                  placeholder="Enter value to set"
                  className="p-2 rounded-md border"
                />
                <button
                  className="bg-black mb-5 text-white p-4 rounded-lg"
                  onClick={handleSetValue}
                >
                  Set Value
                </button>
              </div>
              <br />
              <button
                className="bg-black mb-5 text-white p-4 rounded-lg"
                onClick={() =>
                  contract &&
                  writeContract(
                    contract,
                    "deposit",
                    [],
                    ethers.parseUnits("0.00002", "ether")
                  )
                }
              >
                Deposit 0.00002 ETH
              </button>
              <br />
              <input
                type="text"
                value={withdrawValue}
                onChange={handleWithdrawChange}
                placeholder="Enter amount to withdraw"
                className="p-2 rounded-md border"
              />
              <button
                className="bg-black mb-5 text-white p-4 rounded-lg"
                onClick={handleWithdraw}
              >
                Withdraw
              </button>
              <br />
              <button
                onClick={handleDisconnect}
                className="bg-red-500 text-white p-4 rounded-lg"
              >
                Disconnect Wallet
              </button>
            </div>
          )}
          {networkId !== "0xaa36a7" && (
            <button
              onClick={handleChainSwitch}
              className="bg-blue-500 text-white p-4 rounded-lg"
            >
              Switch to Sepolia Network
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
