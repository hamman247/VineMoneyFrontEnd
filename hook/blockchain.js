import {
  createContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import { ethers } from "ethers";
import {
  useSignTypedData,
  useAccount,
  usePublicClient,
  useBalance,
  useWalletClient,
  useConnectorClient,
} from "wagmi";
import { addresses } from "../utils/addresses";
import { collateralNames } from "../utils/collateralNames";
import TroveManagerGettersABI from "../abi/TroveManagerGetters";
import TroveManagerABI from "../abi/TroveManager";
import BorrowerOperationsABI from "../abi/BorrowerOperations";
import FactoryABI from "../abi/Factory";
import PriceFeedABI from "../abi/PriceFeed";
import SortedTrovesABI from "../abi/SortedTroves";
import DebtTokenABI from "../abi/DebtToken";
import StabilityPoolABI from "../abi/StabilityPool";
import BoostCalculatorABI from "../abi/BoostCalculator";
import VaultABI from "../abi/Vault";
import BitGovABI from "../abi/token";
import TokenLockerABI from "../abi/tokenLocker";
import IncentiveVotingABI from "../abi/IncentiveVoting";
import BitLpTokenABI from "../abi/BitLpTokenPool";
import { fromBigNumber } from "../utils/helpers";
import BigNumber from "bignumber.js";

export const BlockchainContext = createContext({
  // STATES
  deposits: 0.0,
  debt: 0.0,
  troveStatus: "",
  balance: 0,
  collaterals: {},
  systemTVL: 0,
  userTroves: {},
  collateralPrices: {},
  prev: "",
  next: "",
  bitUSDBalance: 0,
  signatureToken: {},
  signatureTrove: {},
  bitUSDCirculation: 0,
  stabilityPool: {},
  boost: 0,
  claimableRewards: {},
  userTotalDebt: 0,
  bitGovBalance: 0,
  userAccountWeight: 0,
  accountLockAmount: 0,
  accountUnlockAmount: 0,
  // hasLocks: false,
  lockTotalWeight: 0,
  tcr: 0,
  totalPricedCollateral: 0,
  totalSystemDebt: 0,
  currentState: false,
  currentWaitInfo: {},
  systemWeek: 0,

  // FUNCTIONS
  signTrove: () => {},
  setSignatureTrove: () => {},
  checkAuth: () => {},
  checkAuthToken: () => {},
  getData: () => {},
  getTrove: () => {},
  openTrove: () => {},
  signDebtToken: () => {},
  getRosePrice: () => {},
  getWithdrawWithPenaltyAmounts: () => {},
  setCurrentState: () => {},
  setCurrentWaitInfo: () => {},
  approve: () => {},
  addColl: () => {},
  getTokenBalance: () => {},
  withdrawColl: () => {},
  repayDebt: () => {},
  closeTrove: () => {},
  provideToSP: async () => {},
  withdrawFromSP: () => {},
  claimCollateralGains: () => {},
  adjustTrove: () => {},
  batchClaimRewards: async () => {},
  lockToken: () => {},
  freeze: () => {},
  unfreeze: () => {},
  withdrawWithPenalty: () => {},
  getAccountActiveLocks: () => {},
  getAccountBalances: () => {},
  getAccountCurrentVotes: () => {},
  getTotalWeightAt: () => {},
  weeklyEmissions: () => {},
  getReceiverWeightAt: () => {},
  registerAccountWeightAndVote: () => {},
  bitGovLpData: async () => {},
  bitUsdLpData: async () => {},
  approveBitGovLp: async () => {},
  stakeBitGovLP: async () => {},
  withdrawBitGovLP: async () => {},
  approveBitUsdLp: async () => {},
  withdrawBitUsdLP: async () => {},
  stakeBitUsdLP: async () => {},
});

export const BlockchainContextProvider = ({ children }) => {
  // WALLET HOOKS
  const { signTypedDataAsync } = useSignTypedData();
  const account = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const result = useBalance({ address: account.address });
  const stabilityPoolBalance = useBalance({
    address: addresses.stabilityPool[account.chainId],
  });

  // STATES
  const [signatureTrove, setSignatureTrove] = useState({});
  const [signatureToken, setSignatureToken] = useState({});
  const [deposits, setDeposits] = useState(0.0);
  const [debt, setDebt] = useState(0.0);
  const [troveStatus, setTroveStatus] = useState("");
  const [balance, setBalance] = useState(0);
  const [collaterals, setCollaterals] = useState({});
  const [userTroves, setUserTroves] = useState({});
  const [systemTVL, setSystemTVL] = useState(0);
  const [collateralPrices, setCollateralPrices] = useState({});
  const [prev, setPrev] = useState("");
  const [next, setNext] = useState("");
  const [bitUSDBalance, setBitUSDBalance] = useState(0);
  const [bitUSDCirculation, setBitUSDCirculation] = useState(0);
  const [stabilityPool, setStabilityPool] = useState({});
  const [boost, setBoost] = useState(0);
  const [claimableRewards, setClaimableRewards] = useState({});
  const [userTotalDebt, setUserTotalDebt] = useState(0);
  const [bitGovBalance, setBitGovBalance] = useState(0);
  const [userAccountWeight, setAccountWeight] = useState(0);
  const [accountLockAmount, setAccountLockAmount] = useState(0);
  const [accountUnlockAmount, setAccountUnlockAmount] = useState(0);
  // const [hasLocks, setHasLocks] = useState(false);
  const [lockTotalWeight, setTotalWeight] = useState(0);
  const [tcr, setTCR] = useState(0);
  const [totalPricedCollateral, setTotalPricedCollateral] = useState(0);
  const [totalSystemDebt, setTotalSystemDebt] = useState(0);
  const [currentState, setCurrentState] = useState(false);
  const [currentWaitInfo, setCurrentWaitInfo] = useState({
    type: "",
    info: "",
  });
  const [systemWeek, setWeek] = useState(0);
  // GET DATA LOCK TO AVOID TOO MANY CALLS
  const [lock, setLock] = useState(false);

  const clientToSigner = (client) => {
    const { account, chain, transport } = client;
    const network = {
      chainId: chain.id,
      name: chain.name,
    };
    const provider = new ethers.providers.Web3Provider(transport, network);
    const signer = provider.getSigner(account.address);
    return signer;
  };

  const useEthersSigner = () => {
    const { data: client } = useConnectorClient();
    return useMemo(
      () => (client ? clientToSigner(client) : undefined),
      [client]
    );
  };

  const signer = useEthersSigner();

  // USE EFFECTS

  useEffect(() => {
    if (account.address) {
      getData();
      const intervalId = setInterval(() => {
        setLock(false);
        getData();
      }, 30000);

      return () => clearInterval(intervalId);
    }
  }, [account]);

  useEffect(() => {
    const auth = JSON.parse(
      localStorage.getItem(`signInAuth-${account.chainId}`)
    );
    const tokenAuth = JSON.parse(
      localStorage.getItem(`signInToken-${account.chainId}`)
    );
    checkAuth() ? setSignatureTrove(auth) : setSignatureTrove({});
    checkAuthToken() ? setSignatureToken(tokenAuth) : setSignatureToken({});
  }, []);

  useEffect(() => {
    if (Object.keys(userTroves).length > 0) {
      setUserTotalDebt(
        Object.values(userTroves).reduce((acc, trove) => acc + trove.debt, 0)
      );
    }
  }, [Object.keys(userTroves)]);

  // WRITE FUNCTIONS
  const registerAccountWeightAndVote = async (data) => {
    const incentiveVoting = new ethers.Contract(
      addresses.incentiveVoting[account.chainId],
      IncentiveVotingABI,
      signer
    );

    const tx = await incentiveVoting.registerAccountWeightAndVote(
      account.address,
      26,
      data
    );
    return tx;
  };

  const withdrawWithPenalty = async (value) => {
    const tokenLocker = new ethers.Contract(
      addresses.tokenLocker[account.chainId],
      TokenLockerABI,
      signer
    );

    const tx = await tokenLocker.withdrawWithPenalty(value);
    return tx;
  };

  const unfreeze = async () => {
    const tokenLocker = new ethers.Contract(
      addresses.tokenLocker[account.chainId],
      TokenLockerABI,
      signer
    );

    const tx = await tokenLocker.unfreeze(true);
    return tx;
  };

  const freeze = async () => {
    const tokenLocker = new ethers.Contract(
      addresses.tokenLocker[account.chainId],
      TokenLockerABI,
      signer
    );

    const tx = await tokenLocker.freeze();
    return tx;
  };

  const lockToken = async (amount, weeks) => {
    const tokenLocker = new ethers.Contract(
      addresses.tokenLocker[account.chainId],
      TokenLockerABI,
      signer
    );

    const tx = await tokenLocker.lock(account.address, amount, weeks);
    return tx;
  };

  const batchClaimRewards = async () => {
    const vault = new ethers.Contract(
      addresses.vault[account.chainId],
      VaultABI,
      signer
    );

    const tx = await vault.batchClaimRewards(
      account.address,
      "0x0000000000000000000000000000000000000000",
      [
        addresses.troveManager[account.chainId],
        addresses.stabilityPool[account.chainId],
      ],
      10
    );

    return tx;
  };

  const withdrawBitGovLP = async (amount) => {
    try {
      const bitUsdLP = new ethers.Contract(
        addresses.bitGovDeposit[account.chainId],
        BitLpTokenABI,
        signer
      );

      const tx = await bitUsdLP.withdraw(account.address, amount);
      return tx;
    } catch (error) {
      throw error;
    }
  };

  const stakeBitGovLP = async (amount) => {
    try {
      const bitGovLP = new ethers.Contract(
        addresses.bitGovDeposit[account.chainId],
        BitLpTokenABI,
        signer
      );

      const tx = await bitGovLP.deposit(account.address, amount);
      return tx;
    } catch (error) {
      throw error;
    }
  };

  const approveBitGovLp = async (amount) => {
    try {
      const bitGovLp = new ethers.Contract(
        addresses.bitGovLp[account.chainId],
        BitGovABI, // JUST TO USE THE ERC20 INTERFACE,
        signer
      );

      const tx = await bitGovLp.approve(
        addresses.bitGovDeposit[account.chainId],
        amount
      );
      return tx;
    } catch (error) {
      throw error;
    }
  };

  const stakeBitUsdLP = async (amount) => {
    try {
      const bitUsdLP = new ethers.Contract(
        addresses.bitUsdDeposit[account.chainId],
        BitLpTokenABI,
        signer
      );

      const tx = await bitUsdLP.deposit(account.address, amount);
      return tx;
    } catch (error) {
      throw error;
    }
  };

  const withdrawBitUsdLP = async (amount) => {
    try {
      const bitUsdLP = new ethers.Contract(
        addresses.bitUsdDeposit[account.chainId],
        BitLpTokenABI,
        signer
      );

      const tx = await bitUsdLP.withdraw(account.address, amount);
      return tx;
    } catch (error) {
      throw error;
    }
  };

  const approveBitUsdLp = async (amount) => {
    try {
      const bitUsdLp = new ethers.Contract(
        addresses.bitUsdLp[account.chainId],
        BitGovABI, // JUST TO USE THE ERC20 INTERFACE,
        signer
      );

      const tx = await bitUsdLp.approve(
        addresses.bitUsdDeposit[account.chainId],
        amount
      );
      return tx;
    } catch (error) {
      throw error;
    }
  };

  const approve = async (collateralAddr, collAmount) => {
    try {
      const args = [addresses.borrowerOps[account.chainId], collAmount];
      const tx = await walletClient.writeContract({
        account: account.address,
        abi: BitGovABI, // JUST TO USE THE ERC20 INTERFACE
        functionName: "approve",
        address: collateralAddr,
        args,
        gas: await publicClient.estimateGas(args),
      });

      return tx;
    } catch (error) {
      throw error;
    }
  };

  const openTrove = async (
    address,
    collAmount,
    debtAmount,
    payable = false
  ) => {
    try {
      const borrowerOps = new ethers.Contract(
        addresses.borrowerOps[account.chainId],
        BorrowerOperationsABI,
        signer
      );

      const tx = await borrowerOps.openTrove(
        address,
        account.address,
        new BigNumber(1e16).toFixed(),
        collAmount,
        debtAmount,
        prev,
        next,
        { value: payable ? collAmount : 0 }
      );
      return tx;
    } catch (error) {
      throw error;
    }
  };

  const addColl = async (address, collAmount, payable) => {
    try {
      const borrowerOps = new ethers.Contract(
        addresses.borrowerOps[account.chainId],
        BorrowerOperationsABI,
        signer
      );

      const tx = await borrowerOps.addColl(
        address,
        account.address,
        collAmount,
        prev,
        next,
        { value: payable ? collAmount : 0 }
      );

      return tx;
    } catch (error) {
      throw error;
    }
  };

  const withdrawColl = async (address, collAmount) => {
    try {
      const borrowerOps = new ethers.Contract(
        addresses.borrowerOps[account.chainId],
        BorrowerOperationsABI,
        signer
      );

      const tx = await borrowerOps.withdrawColl(
        address,
        account.address,
        collAmount,
        prev,
        next
      );
      return tx;
    } catch (error) {
      throw error;
    }
  };

  const repayDebt = async (address, collAmount, payable) => {
    try {
      const borrowerOps = new ethers.Contract(
        addresses.borrowerOps[account.chainId],
        BorrowerOperationsABI,
        signer
      );

      const tx = await borrowerOps.repayDebt(
        address,
        account.address,
        collAmount,
        prev,
        next,
        { value: payable ? collAmount : 0 }
      );
      return tx;
    } catch (error) {
      throw error;
    }
  };

  const closeTrove = async (address) => {
    try {
      const borrowerOps = new ethers.Contract(
        addresses.borrowerOps[account.chainId],
        BorrowerOperationsABI,
        signer
      );

      const tx = await borrowerOps.closeTrove(address, account.address);
      return tx;
    } catch (error) {
      throw error;
    }
  };

  const provideToSP = async (amount) => {
    try {
      const stabilityPool = new ethers.Contract(
        addresses.stabilityPool[account.chainId],
        StabilityPoolABI,
        signer
      );

      const tx = await stabilityPool.provideToSP(amount);
      return tx;
    } catch (error) {
      throw error;
    }
  };

  const withdrawFromSP = async (amount) => {
    try {
      const stabilityPool = new ethers.Contract(
        addresses.stabilityPool[account.chainId],
        StabilityPoolABI,
        signer
      );

      const tx = await stabilityPool.withdrawFromSP(amount);
      return tx;
    } catch (error) {
      throw error;
    }
  };

  const claimCollateralGains = async () => {
    try {
      const stabilityPool = new ethers.Contract(
        addresses.stabilityPool[account.chainId],
        StabilityPoolABI,
        signer
      );

      const count = Object.keys(collaterals).length;

      const tx = await stabilityPool.claimCollateralGains(account.address, [
        ...Array(count).keys(),
      ]);
      return tx;
    } catch (error) {
      throw error;
    }
  };

  const adjustTrove = async (address, collAmount, debtAmount, payable) => {
    try {
      const borrowerOps = new ethers.Contract(
        addresses.borrowerOps[account.chainId],
        BorrowerOperationsABI,
        signer
      );

      const tx = await borrowerOps.adjustTrove(
        address,
        account.address,
        new BigNumber(1e16).toFixed(),
        collAmount,
        0,
        debtAmount,
        true,
        prev,
        next,
        { value: payable ? collAmount : 0 }
      );
      return tx;
    } catch (error) {
      throw error;
    }
  };

  // QUERY FUNCTIONS
  const getData = useCallback(async () => {
    if (
      account.address &&
      signatureTrove?.user &&
      result?.data &&
      signatureToken?.user
    ) {
      if (lock) return;
      setLock(true);
      console.log("Getting data");
      setBalance(fromBigNumber(result.data.value));
      await getSystemInfo();
      await getCollaterals();
      await getNext();
      await getPrev();
      await getBitUSDBalance();
      await getBitGovBalance();
      await getBitUSDCirculation();
      await getStabilityPoolData();
      await getBoostAmount();
      await getClaimableRewards();
      await getAccountWeight();
      await getAccountBalances();
      // await getAccountActiveLocks();
      await getTotalWeight();
    }
  }, [
    account.address,
    signatureTrove?.user,
    signatureToken?.user,
    lock,
    result?.data?.value,
  ]);

  const bitUsdLpData = async () => {
    const balanceLp = await publicClient.readContract({
      abi: BitGovABI, // JUST TO USE THE ERC20 INTERFACE
      address: addresses.bitUsdLp[account.chainId],
      functionName: "balanceOf",
      args: [account.address],
    });
    const allowanceLp = await publicClient.readContract({
      abi: BitGovABI, // JUST TO USE THE ERC20 INTERFACE
      address: addresses.bitUsdLp[account.chainId],
      functionName: "allowance",
      args: [account.address, addresses.bitUsdDeposit[account.chainId]],
    });
    const deposiitBalance = await publicClient.readContract({
      abi: BitLpTokenABI, // JUST TO USE THE ERC20 INTERFACE
      address: addresses.bitUsdDeposit[account.chainId],
      functionName: "balanceOf",
      args: [account.address],
    });
    const rewardRate = await publicClient.readContract({
      abi: BitLpTokenABI, // JUST TO USE THE ERC20 INTERFACE
      address: addresses.bitUsdDeposit[account.chainId],
      functionName: "rewardRate",
      args: [],
    });
    const totalSupply = await publicClient.readContract({
      abi: BitGovABI, // JUST TO USE THE ERC20 INTERFACE
      address: addresses.bitUsdDeposit[account.chainId],
      functionName: "totalSupply",
      args: [],
    });

    return {
      balance: fromBigNumber(balanceLp),
      allowance: fromBigNumber(allowanceLp),
      depositBalance: fromBigNumber(deposiitBalance),
      rewardRate: fromBigNumber(rewardRate),
      totalSupply: fromBigNumber(totalSupply),
    };
  };

  const bitGovLpData = async () => {
    const balanceLp = await publicClient.readContract({
      abi: BitGovABI, // JUST TO USE THE ERC20 INTERFACE
      address: addresses.bitGovLp[account.chainId],
      functionName: "balanceOf",
      args: [account.address],
    });
    const allowanceLp = await publicClient.readContract({
      abi: BitGovABI, // JUST TO USE THE ERC20 INTERFACE
      address: addresses.bitGovLp[account.chainId],
      functionName: "allowance",
      args: [account.address, addresses.bitGovDeposit[account.chainId]],
    });
    const depositBalance = await publicClient.readContract({
      abi: BitLpTokenABI, // JUST TO USE THE ERC20 INTERFACE
      address: addresses.bitGovDeposit[account.chainId],
      functionName: "balanceOf",
      args: [account.address],
    });
    const depositLpBalance = await publicClient.readContract({
      abi: BitGovABI, // JUST TO USE THE ERC20 INTERFACE
      address: addresses.bitGovLp[account.chainId],
      functionName: "balanceOf",
      args: [addresses.bitGovDeposit[account.chainId]],
    });
    const rewardRate = await publicClient.readContract({
      abi: BitLpTokenABI, // JUST TO USE THE ERC20 INTERFACE
      address: addresses.bitGovDeposit[account.chainId],
      functionName: "rewardRate",
      args: [],
    });

    return {
      balance: fromBigNumber(balanceLp),
      allowance: fromBigNumber(allowanceLp),
      depositBalance: fromBigNumber(depositBalance),
      depositLpBalance: fromBigNumber(depositLpBalance),
      rewardRate: fromBigNumber(rewardRate),
    };
  };

  const getReceiverWeightAt = async (receiver, week) => {
    const weight = await publicClient.readContract({
      abi: IncentiveVotingABI,
      address: addresses.incentiveVoting[account.chainId],
      functionName: "getReceiverWeightAt",
      args: [receiver, week],
    });

    return Number(weight) === 0 ? 1 : Number(weight);
  };

  const weeklyEmissions = async (week = systemWeek) => {
    const currentWeeklyEmissions = await publicClient.readContract({
      abi: VaultABI,
      address: addresses.vault[account.chainId],
      functionName: "weeklyEmissions",
      args: [week],
    });
    return Number(currentWeeklyEmissions);
  };

  const getTotalWeightAt = async (week = systemWeek) => {
    const weight = await publicClient.readContract({
      abi: IncentiveVotingABI,
      address: addresses.incentiveVoting[account.chainId],
      functionName: "getTotalWeightAt",
      args: [week],
    });
    return Number(weight);
  };

  const getAccountCurrentVotes = async () => {
    const votes = await publicClient.readContract({
      abi: IncentiveVotingABI,
      address: addresses.incentiveVoting[account.chainId],
      functionName: "getAccountCurrentVotes",
      args: [account.address],
    });
    return votes;
  };

  const getSystemInfo = async () => {
    const tcr = await publicClient.readContract({
      abi: BorrowerOperationsABI,
      address: addresses.borrowerOps[account.chainId],
      functionName: "getTCR",
      args: [],
    });
    const systemBalances = await publicClient.readContract({
      abi: BorrowerOperationsABI,
      address: addresses.borrowerOps[account.chainId],
      functionName: "getGlobalSystemBalances",
      args: [],
    });
    const getWeek = await publicClient.readContract({
      abi: VaultABI,
      address: addresses.vault[account.chainId],
      functionName: "getWeek",
      args: [],
    });

    setTotalSystemDebt(fromBigNumber(systemBalances[1]));
    setTotalPricedCollateral(fromBigNumber(fromBigNumber(systemBalances[0])));
    setTCR(fromBigNumber(tcr) * 100);
    setWeek(Number(getWeek));
  };

  const getClaimableRewards = async () => {
    let vaultRewards = 0;

    for (const trove of Object.keys(userTroves)) {
      const vault = await publicClient.readContract({
        abi: VaultABI,
        address: addresses.vault[account.chainId],
        functionName: "claimableRewardAfterBoost",
        args: [
          account.address,
          account.address,
          "0x0000000000000000000000000000000000000000",
          trove,
        ],
      });
      vaultRewards += fromBigNumber(vault[0]);
    }

    // Pools rewards
    const bitGovPool = await publicClient.readContract({
      abi: VaultABI,
      address: addresses.vault[account.chainId],
      functionName: "claimableRewardAfterBoost",
      args: [
        account.address,
        account.address,
        "0x0000000000000000000000000000000000000000",
        addresses.bitGovDeposit[account.chainId],
      ],
    });
    const bitUsdPool = await publicClient.readContract({
      abi: VaultABI,
      address: addresses.vault[account.chainId],
      functionName: "claimableRewardAfterBoost",
      args: [
        account.address,
        account.address,
        "0x0000000000000000000000000000000000000000",
        addresses.bitUsdDeposit[account.chainId],
      ],
    });

    setClaimableRewards({
      vaultRewards,
      bitGov: fromBigNumber(bitGovPool[0]),
      bitUsd: fromBigNumber(bitUsdPool[0]),
    });
  };

  const getStabilityPoolData = async () => {
    const deposits = await publicClient.readContract({
      abi: StabilityPoolABI,
      address: addresses.stabilityPool[account.chainId],
      functionName: "getTotalDebtTokenDeposits",
      args: [],
    });
    const rewardRate = await publicClient.readContract({
      abi: StabilityPoolABI,
      address: addresses.stabilityPool[account.chainId],
      functionName: "rewardRate",
      args: [],
    });
    const accountDeposits = await publicClient.readContract({
      abi: StabilityPoolABI,
      address: addresses.stabilityPool[account.chainId],
      functionName: "accountDeposits",
      args: [account.address],
    });
    const earned = await publicClient.readContract({
      abi: VaultABI,
      address: addresses.vault[account.chainId],
      functionName: "claimableRewardAfterBoost",
      args: [
        account.address,
        account.address,
        "0x0000000000000000000000000000000000000000",
        addresses.stabilityPool[account.chainId],
      ],
    });
    const depositorCollateralGain = await publicClient.readContract({
      abi: StabilityPoolABI,
      address: addresses.stabilityPool[account.chainId],
      functionName: "getDepositorCollateralGain",
      args: [account.address],
    });

    setStabilityPool({
      deposits: fromBigNumber(deposits),
      balance: fromBigNumber(stabilityPoolBalance?.data?.value),
      rewardRate: fromBigNumber(rewardRate),
      accountDeposits: fromBigNumber(accountDeposits[0]),
      earned: fromBigNumber(earned[0]),
      depositorCollateralGain: fromBigNumber(depositorCollateralGain[0]),
      // depositorCollateralGain: depositorCollateralGain.map((gain) => {
      //   return fromBigNumber(gain);
      // }),
    });
  };

  const getBitUSDBalance = async () => {
    const balance = await publicClient.readContract({
      abi: DebtTokenABI,
      address: addresses.debtToken[account.chainId],
      functionName: "checkBalanceOf",
      args: [signatureToken],
    });
    setBitUSDBalance(fromBigNumber(balance));
  };

  const getBitGovBalance = async () => {
    const balance = await publicClient.readContract({
      abi: BitGovABI,
      address: addresses.bitGov[account.chainId],
      functionName: "balanceOf",
      args: [account.address],
    });
    setBitGovBalance(fromBigNumber(balance));
  };

  const getTokenBalance = async (address) => {
    const balance = await publicClient.readContract({
      abi: BitGovABI, // JUST TO USE THE ERC20 INTERFACE
      address,
      functionName: "balanceOf",
      args: [account.address],
    });
    return fromBigNumber(balance);
  };

  const getAccountWeight = async () => {
    const weight = await publicClient.readContract({
      abi: TokenLockerABI,
      address: addresses.tokenLocker[account.chainId],
      functionName: "getAccountWeight",
      args: [account.address],
    });
    setAccountWeight(Number(weight));
  };

  const getAccountBalances = async () => {
    const balance = await publicClient.readContract({
      abi: TokenLockerABI,
      address: addresses.tokenLocker[account.chainId],
      functionName: "getAccountBalances",
      args: [account.address],
    });
    setAccountLockAmount(Number(balance[0]));
    setAccountUnlockAmount(Number(balance[1]));
  };

  const getAccountActiveLocks = async () => {
    const locks = await publicClient.readContract({
      abi: TokenLockerABI,
      address: addresses.tokenLocker[account.chainId],
      functionName: "getAccountActiveLocks",
      args: [account.address, 26],
    });

    return {
      lockData: {
        amount: Number(locks[0][0].amount),
        weeksToUnlock: Number(locks[0][0].weeksToUnlock),
      },
      frozenAmount: Number(locks[1]),
    };
  };

  const getTotalWeight = async () => {
    const weight = await publicClient.readContract({
      abi: TokenLockerABI,
      address: addresses.tokenLocker[account.chainId],
      functionName: "getTotalWeight",
      args: [],
    });
    setTotalWeight(Number(weight));
  };

  const getWithdrawWithPenaltyAmounts = async (value) => {
    const amounts = await publicClient.readContract({
      abi: TokenLockerABI,
      address: addresses.tokenLocker[account.chainId],
      functionName: "getWithdrawWithPenaltyAmounts",
      args: [account.address, value],
    });
    return {
      amountWithdrawn: fromBigNumber(amounts[0]),
      penaltyAmountPaid: fromBigNumber(amounts[1]),
    };
  };

  const getBitUSDCirculation = async () => {
    const circulation = await publicClient.readContract({
      abi: DebtTokenABI,
      address: addresses.debtToken[account.chainId],
      functionName: "totalSupply",
      args: [],
    });
    setBitUSDCirculation(fromBigNumber(circulation));
  };

  const getPrev = async () => {
    const prev = await publicClient.readContract({
      abi: SortedTrovesABI,
      address: addresses.sortedTroves[account.chainId],
      functionName: "getPrev",
      args: [account.address],
    });
    setPrev(prev);
  };

  const getNext = async () => {
    const next = await publicClient.readContract({
      abi: SortedTrovesABI,
      address: addresses.sortedTroves[account.chainId],
      functionName: "getNext",
      args: [account.address],
    });
    setNext(next);
  };

  const getTrove = async (troveManagerAddr) => {
    try {
      const userTrovesCache = { ...userTroves };
      console.log("cache", { troveManagerAddr, userTrovesCache });

      if (account.chainId !== 23294 && account.chainId !== 23295) {
        const trove = await publicClient.readContract({
          abi: TroveManagerABI,
          address: troveManagerAddr,
          functionName: "getTrove",
          args: [account.address],
        });

        const debt = fromBigNumber(trove[3]);

        userTrovesCache[troveManagerAddr] = {
          deposits: fromBigNumber(trove[2]),
          debt,
          status: trove[5],
        };
      } else {
        const trove = await publicClient.readContract({
          abi: TroveManagerGettersABI,
          address: addresses.troveManagerGetter[account.chainId],
          functionName: "getTrove",
          args: [signatureTrove, troveManagerAddr],
        });

        const debt = fromBigNumber(trove[0]);

        userTrovesCache[troveManagerAddr] = {
          deposits: fromBigNumber(trove[1]),
          debt,
          status: trove[3],
        };
      }
      console.log("cache 2", userTrovesCache);
      setUserTroves(userTrovesCache);
    } catch (error) {
      console.log(error);
    }
  };

  const getCollaterals = async () => {
    try {
      let totalTVL = 0;
      let collateralsCache = {};
      let collateralPricesCache = { ...collateralPrices };

      const count = await publicClient.readContract({
        abi: FactoryABI,
        address: addresses.factory[account.chainId],
        functionName: "troveManagerCount",
        args: [],
      });

      for (const index of [...Array(Number(count)).keys()]) {
        const address = await publicClient.readContract({
          abi: FactoryABI,
          address: addresses.factory[account.chainId],
          functionName: "troveManagers",
          args: [index],
        });

        const systemBalances = await publicClient.readContract({
          abi: TroveManagerABI,
          address: address,
          functionName: "getEntireSystemBalances",
          args: [],
        });
        const redemptionRate = await publicClient.readContract({
          abi: TroveManagerABI,
          address: address,
          functionName: "getRedemptionRate",
          args: [],
        });
        const borrowingRate = await publicClient.readContract({
          abi: TroveManagerABI,
          address: address,
          functionName: "getBorrowingRate",
          args: [],
        });
        const mcr = await publicClient.readContract({
          abi: TroveManagerABI,
          address: address,
          functionName: "MCR",
          args: [],
        });
        const collateral = await publicClient.readContract({
          abi: TroveManagerABI,
          address: address,
          functionName: "collateralToken",
          args: [],
        });
        const maxSystemDebt = await publicClient.readContract({
          abi: TroveManagerABI,
          address: address,
          functionName: "maxSystemDebt",
          args: [],
        });
        const rewardRate = await publicClient.readContract({
          abi: TroveManagerABI,
          address: address,
          functionName: "rewardRate",
          args: [],
        });
        const deploymentTime = await publicClient.readContract({
          abi: TroveManagerABI,
          address: address,
          functionName: "systemDeploymentTime",
          args: [],
        });
        const BOOTSTRAP_PERIOD = await publicClient.readContract({
          abi: TroveManagerABI,
          address: address,
          functionName: "BOOTSTRAP_PERIOD",
          args: [],
        });

        collateralPricesCache[address] = await getCollateralPrice(collateral);

        const tvl =
          fromBigNumber(systemBalances[0]) * fromBigNumber(systemBalances[2]);
        totalTVL += tvl;

        await getTrove(address);

        collateralsCache[address] = {
          mcr: fromBigNumber(mcr) * 100,
          borrowingRate: fromBigNumber(borrowingRate) * 100,
          redemptionRate: fromBigNumber(redemptionRate) * 100,
          mintedBitUSD: fromBigNumber(systemBalances[1]),
          tvl: tvl,
          collateral: {
            ...collateralNames[collateral],
            address: collateral,
            payable:
              collateral === "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
          },
          maxSystemDebt: fromBigNumber(maxSystemDebt),
          rewardRate: fromBigNumber(rewardRate),
          deploymentTime: Number(deploymentTime),
          bootstrapPeriod: Number(BOOTSTRAP_PERIOD),
        };
      }
      setCollaterals(collateralsCache);
      setSystemTVL(totalTVL);
      setCollateralPrices(collateralPricesCache);

      return collateralsCache;
    } catch (error) {
      console.log(error);
    }
  };

  const getCollateralPrice = async (collateral) => {
    const price = await publicClient.readContract({
      abi: PriceFeedABI,
      address: addresses.priceFeed[account.chainId],
      functionName: "loadPrice",
      args: [collateral],
    });
    return fromBigNumber(price);
  };

  const getBoostAmount = async () => {
    const boost = await publicClient.readContract({
      abi: BoostCalculatorABI,
      address: addresses.boostCalculator[account.chainId],
      functionName: "getBoostedAmount",
      args: [account.address, 10000, 0, 100000],
    });

    setBoost(new BigNumber(boost).multipliedBy(2).div(10000).toFixed());
  };

  const getRosePrice = () => {
    return Object.values(collateralPrices)[0];
  };

  const checkAuth = () => {
    if (account.chainId !== 23294 && account.chainId !== 23295) return true;
    const auth = JSON.parse(
      localStorage.getItem(`signInAuth-${account.chainId}`)
    );
    if (!auth) {
      return false;
    }
    const time = Math.floor(new Date().getTime() / 1000);
    if (account.address !== auth.user || time - auth.time >= 86400) {
      return false;
    }
    return true;
  };

  const checkAuthToken = () => {
    if (account.chainId !== 23294 && account.chainId !== 23295) return true;
    const auth = JSON.parse(
      localStorage.getItem(`signInToken-${account.chainId}`)
    );
    if (!auth) {
      return false;
    }
    const time = Math.floor(new Date().getTime() / 1000);
    if (account.address !== auth.user || time - auth.time >= 86400) {
      return false;
    }
    return true;
  };

  const signTrove = async () => {
    try {
      const user = account.address;
      const time = Math.floor(new Date().getTime() / 1000);
      const signature = await signTypedDataAsync({
        types: {
          SignIn: [
            { name: "user", type: "address" },
            { name: "time", type: "uint32" },
          ],
        },
        primaryType: "SignIn",
        message: {
          time,
          user,
        },
        domain: {
          // name: "VineSignature.SignIn",
          name: "BitSignature.SignIn",
          version: "1",
          chainId: account.chainId,
          verifyingContract: addresses.troveManagerGetter[account.chainId],
        },
      });

      const rsv = ethers.utils.splitSignature(signature);
      const auth = { user, time, rsv };
      localStorage.setItem(
        `signInAuth-${account.chainId}`,
        JSON.stringify(auth)
      );
      setSignatureTrove(auth);
    } catch (error) {
      console.log(error);
    }
  };

  const signDebtToken = async () => {
    try {
      const user = account.address;
      const time = Math.floor(new Date().getTime() / 1000);
      const signature = await signTypedDataAsync({
        types: {
          SignIn: [
            { name: "user", type: "address" },
            { name: "time", type: "uint32" },
          ],
        },
        primaryType: "SignIn",
        message: {
          time,
          user,
        },
        domain: {
          // name: "VineSignature.SignIn",
          name: "BitSignature.SignIn",
          version: "1",
          chainId: account.chainId,
          verifyingContract: addresses.debtToken[account.chainId],
        },
      });

      const rsv = ethers.utils.splitSignature(signature);
      const auth = { user, time, rsv };
      localStorage.setItem(
        `signInToken-${account.chainId}`,
        JSON.stringify(auth)
      );
      setSignatureToken(auth);
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <BlockchainContext.Provider
      value={{
        signTrove,
        setSignatureTrove,
        checkAuth,
        getData,
        deposits,
        debt,
        troveStatus,
        balance,
        collaterals,
        systemTVL,
        getTrove,
        userTroves,
        collateralPrices,
        prev,
        next,
        openTrove,
        bitUSDBalance,
        signDebtToken,
        checkAuthToken,
        signatureTrove,
        signatureToken,
        bitUSDCirculation,
        stabilityPool,
        boost,
        getRosePrice,
        claimableRewards,
        userTotalDebt,
        bitGovBalance,
        userAccountWeight,
        accountUnlockAmount,
        accountLockAmount,
        // hasLocks,
        lockTotalWeight,
        getWithdrawWithPenaltyAmounts,
        tcr,
        totalPricedCollateral,
        totalSystemDebt,
        currentState,
        currentWaitInfo,
        setCurrentState,
        setCurrentWaitInfo,
        approve,
        addColl,
        getTokenBalance,
        withdrawColl,
        repayDebt,
        closeTrove,
        provideToSP,
        withdrawFromSP,
        claimCollateralGains,
        adjustTrove,
        batchClaimRewards,
        lockToken,
        freeze,
        unfreeze,
        withdrawWithPenalty,
        getAccountActiveLocks,
        getAccountCurrentVotes,
        systemWeek,
        getTotalWeightAt,
        weeklyEmissions,
        getReceiverWeightAt,
        registerAccountWeightAndVote,
        bitGovLpData,
        bitUsdLpData,
        approveBitGovLp,
        stakeBitGovLP,
        withdrawBitGovLP,
        approveBitUsdLp,
        stakeBitUsdLP,
        withdrawBitUsdLP,
      }}
    >
      {children}
    </BlockchainContext.Provider>
  );
};