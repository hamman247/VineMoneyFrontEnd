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
import { addresses, rpc } from "../utils/addresses";
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
import MultiCollateralHintHelpersABI from "../abi/MultiCollateralHintHelpers";
import BitLpOracleABI from "../abi/BitLpOracle";
import TWAPOracleABI from "../abi/TWAPOracle";
import { fromBigNumber } from "../utils/helpers";
import BigNumber from "bignumber.js";
import * as sapphire from "@oasisprotocol/sapphire-paratime";

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
  signTrove: async () => {},
  setSignatureTrove: async () => {},
  checkAuth: async () => {},
  checkAuthToken: async () => {},
  getData: async () => {},
  getTrove: async () => {},
  openTrove: async () => {},
  signDebtToken: async () => {},
  getRosePrice: async () => {},
  getWithdrawWithPenaltyAmounts: async () => {},
  setCurrentState: async () => {},
  setCurrentWaitInfo: async () => {},
  approve: async () => {},
  addColl: async () => {},
  getTokenBalance: async () => {},
  withdrawColl: async () => {},
  repayDebt: async () => {},
  closeTrove: async () => {},
  provideToSP: async () => {},
  withdrawFromSP: async () => {},
  claimCollateralGains: async () => {},
  adjustTrove: async () => {},
  batchClaimRewards: async () => {},
  lockToken: async () => {},
  freeze: async () => {},
  unfreeze: async () => {},
  withdrawWithPenalty: async () => {},
  getAccountActiveLocks: async () => {},
  getAccountBalances: async () => {},
  getAccountCurrentVotes: async () => {},
  getTotalWeightAt: async () => {},
  weeklyEmissions: async () => {},
  getReceiverWeightAt: async () => {},
  registerAccountWeightAndVote: async () => {},
  bitGovLpData: async () => {},
  bitUsdLpData: async () => {},
  approveBitGovLp: async () => {},
  stakeBitGovLP: async () => {},
  withdrawBitGovLP: async () => {},
  approveBitUsdLp: async () => {},
  withdrawBitUsdLP: async () => {},
  stakeBitUsdLP: async () => {},
  redeemCollateral: async () => {},
  getRedemptionHints: async () => {},
  getData: async () => {},
  setLock: () => {},
  getLpTokenPrice: async () => {},
  getBitGovPrice: async () => {},
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
  const [loading, setLoading] = useState(false);

  // HELPER FUNCTIONS
  const clientToSigner = (client, query) => {
    const { account, chain, transport } = client;
    const network = {
      chainId: chain.id,
      name: chain.name,
    };

    const provider = query
      ? new ethers.providers.JsonRpcProvider(rpc[chain.id])
      : new ethers.providers.Web3Provider(transport, network);
    const signer = !query ? provider.getSigner(account.address) : provider;
    return signer;
  };

  const useEthersSigner = (query = false) => {
    const { data: client } = useConnectorClient();
    return useMemo(
      () => (client ? clientToSigner(client, query) : undefined),
      [client]
    );
  };

  const signer = useEthersSigner();
  const signerQuery = useEthersSigner(true);

  // USE EFFECTS
  useEffect(() => {
    console.log("account has changed");
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
  const redeemCollateral = async (troveAddress, amount) => {
    try {
      const troveManager = new ethers.Contract(
        troveAddress,
        TroveManagerABI,
        sapphire.wrap(signer)
      );

      const {
        firstRedemptionHint,
        partialRedemptionHintNICR,
        truncatedDebtAmount,
      } = await getRedemptionHints(troveAddress, amount);

      const maxIterations = truncatedDebtAmount === amount ? 1 : 0;

      const prev = await getPrev(
        collaterals[troveAddress].sortedTroves,
        firstRedemptionHint
      );
      const next = await getNext(
        collaterals[troveAddress].sortedTroves,
        firstRedemptionHint
      );

      console.log({ firstRedemptionHint, next, prev });

      const tx = await troveManager.redeemCollateral(
        amount,
        firstRedemptionHint,
        prev,
        next,
        // new BigNumber(partialRedemptionHintNICR).multipliedBy(1e18).toFixed(),
        partialRedemptionHintNICR,
        maxIterations,
        new BigNumber(1e18).toFixed()
      );

      return tx;
    } catch (error) {
      throw error;
    }
  };

  const registerAccountWeightAndVote = async (data) => {
    const incentiveVoting = new ethers.Contract(
      addresses.incentiveVoting[account.chainId],
      IncentiveVotingABI,
      sapphire.wrap(signer)
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
      sapphire.wrap(signer)
    );

    const tx = await tokenLocker.withdrawWithPenalty(value);
    return tx;
  };

  const unfreeze = async () => {
    const tokenLocker = new ethers.Contract(
      addresses.tokenLocker[account.chainId],
      TokenLockerABI,
      sapphire.wrap(signer)
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
      sapphire.wrap(signer)
    );

    const tx = await tokenLocker.lock(account.address, amount, weeks);
    return tx;
  };

  const batchClaimRewards = async () => {
    const vault = new ethers.Contract(
      addresses.vault[account.chainId],
      VaultABI,
      sapphire.wrap(signer)
    );

    const tx = await vault.batchClaimRewards(
      account.address,
      "0x0000000000000000000000000000000000000000",
      [
        addresses.troveManager[account.chainId],
        addresses.stabilityPool[account.chainId],
        addresses.bitGovDeposit[account.chainId],
        addresses.bitUsdDeposit[account.chainId],
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
        sapphire.wrap(signer)
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
        sapphire.wrap(signer)
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
        sapphire.wrap(signer)
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
        sapphire.wrap(signer)
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
        sapphire.wrap(signer)
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
        sapphire.wrap(signer)
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
        sapphire.wrap(signer)
      );

      const prev = await getPrev(collaterals[address].sortedTroves);
      const next = await getNext(collaterals[address].sortedTroves);

      const maxFee = await calcMaxFeePercentage(address, debtAmount);
      const tx = await borrowerOps.openTrove(
        address,
        account.address,
        maxFee,
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
        sapphire.wrap(signer)
      );

      const prev = await getPrev(collaterals[address].sortedTroves);
      const next = await getNext(collaterals[address].sortedTroves);

      console.log("ADD COLL", {
        address,
        collAmount,
        prev,
        next,
        borrowerOps,
      });

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
        sapphire.wrap(signer)
      );

      const prev = await getPrev(collaterals[address].sortedTroves);
      const next = await getNext(collaterals[address].sortedTroves);

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
        sapphire.wrap(signer)
      );

      const prev = await getPrev(collaterals[address].sortedTroves);
      const next = await getNext(collaterals[address].sortedTroves);

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
        sapphire.wrap(signer)
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
        sapphire.wrap(signer)
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
        sapphire.wrap(signer)
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
        sapphire.wrap(signer)
      );

      const count = Object.keys(collaterals).length;

      const tx = await stabilityPool.claimCollateralGains(
        account.address,
        [...Array(count).keys()],
        {
          gasLimit: 1000000,
        }
      );
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
        sapphire.wrap(signer)
      );

      const prev = await getPrev(collaterals[address].sortedTroves);
      const next = await getNext(collaterals[address].sortedTroves);

      const maxFee = await calcMaxFeePercentage(address, debtAmount);

      const tx = await borrowerOps.adjustTrove(
        address,
        account.address,
        maxFee,
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
      try {
        console.log("Getting data");
        setBalance(fromBigNumber(result.data.value));
        await getSystemInfo();
        await getCollaterals();
        await getBitUSDBalance();
        await getBitGovBalance();
        await getBitUSDCirculation();
        await getStabilityPoolData();
        await getBoostAmount();
        // COMMENTED OUT UNTIL WE HAVE BITGOV AND REWARDS
        await getClaimableRewards();
        await getAccountWeight();
        await getAccountBalances();
        await getTotalWeight();
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLock(false);
      }
    }
  }, [
    account.address,
    signatureTrove?.user,
    signatureToken?.user,
    lock,
    result?.data?.value,
  ]);

  const getRedemptionHints = async (troveManager, amount) => {
    const price = collateralPrices[troveManager];
    try {
      const multiCollateralHintHelpers = new ethers.Contract(
        addresses.multiCollateralHintHelpers[account.chainId],
        MultiCollateralHintHelpersABI,
        sapphire.wrap(signerQuery)
      );

      const hints = await multiCollateralHintHelpers.getRedemptionHints(
        troveManager,
        amount,
        new BigNumber(price).multipliedBy(1e18).toFixed(),
        0
      );

      return {
        firstRedemptionHint: hints[0],
        partialRedemptionHintNICR: new BigNumber(hints[1]._hex).toFixed(),
        truncatedDebtAmount: new BigNumber(hints[2]._hex).toFixed(),
      };
    } catch (error) {
      console.log("error", error);
      throw error;
    }
  };

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
    const depositLpBalance = await publicClient.readContract({
      abi: BitGovABI, // JUST TO USE THE ERC20 INTERFACE
      address: addresses.bitUsdLp[account.chainId],
      functionName: "balanceOf",
      args: [addresses.bitUsdDeposit[account.chainId]],
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
      depositLpBalance: fromBigNumber(depositLpBalance),
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
    // COMMENTED OUT UNLESS WE HAVE REWARDS
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

    const collateralGainsByDepositor = await publicClient.readContract({
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
      earned: fromBigNumber(earned[0]), // COMMENTED OUT UNLESS WE HAVE REWARDS
      depositorCollateralGain: collateralGainsByDepositor,
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
        amount: Number(locks[0][0]?.amount || 0),
        weeksToUnlock: Number(locks[0][0]?.weeksToUnlock || 0),
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

  const getPrev = async (sortedTroves, id = account.address) => {
    const prev = await publicClient.readContract({
      abi: SortedTrovesABI,
      address: sortedTroves,
      functionName: "getPrev",
      args: [id],
    });
    return prev;
  };

  const getNext = async (sortedTroves, id = account.address) => {
    const next = await publicClient.readContract({
      abi: SortedTrovesABI,
      address: sortedTroves,
      functionName: "getNext",
      args: [id],
    });
    return next;
  };

  const getTrove = async (troveManagerAddr) => {
    try {
      if (account.chainId !== 23294 && account.chainId !== 23295) {
        const trove = await publicClient.readContract({
          abi: TroveManagerABI,
          address: troveManagerAddr,
          functionName: "getTrove",
          args: [account.address],
        });

        const debt = fromBigNumber(trove[3]);

        return {
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

        return {
          deposits: fromBigNumber(trove[1]),
          debt,
          status: trove[3],
        };
      }
    } catch (error) {
      console.log(error);
    }
  };

  const getCollaterals = async () => {
    try {
      let totalTVL = 0;
      let collateralsCache = {};
      let collateralPricesCache = { ...collateralPrices };
      let userTrovesCache = { ...userTroves };

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
        const redemptionFeeFloor = await publicClient.readContract({
          abi: TroveManagerABI,
          address: address,
          functionName: "redemptionFeeFloor",
          args: [],
        });
        const baseRate = await publicClient.readContract({
          abi: TroveManagerABI,
          address: address,
          functionName: "baseRate",
          args: [],
        });

        const sortedTroves = await publicClient.readContract({
          abi: TroveManagerABI,
          address: address,
          functionName: "sortedTroves",
          args: [],
        });

        collateralPricesCache[address] = await getCollateralPrice(collateral);

        const tvl =
          fromBigNumber(systemBalances[0]) * fromBigNumber(systemBalances[2]);
        totalTVL += tvl;

        userTrovesCache[address] = await getTrove(address);

        collateralsCache[address] = {
          mcr: fromBigNumber(mcr) * 100,
          borrowingRate: (fromBigNumber(borrowingRate) * 100).toFixed(2),
          redemptionRate: (fromBigNumber(redemptionRate) * 100).toFixed(2),
          mintedBitUSD: fromBigNumber(systemBalances[1]),
          tvl: tvl,
          collateral: {
            ...collateralNames[collateral],
            address: collateral,
            payable:
              collateral === "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
          },
          sortedTroves,
          maxSystemDebt: fromBigNumber(maxSystemDebt),
          rewardRate: fromBigNumber(rewardRate),
          deploymentTime: Number(deploymentTime),
          bootstrapPeriod: Number(BOOTSTRAP_PERIOD),
          redemptionFeeFloor: fromBigNumber(redemptionFeeFloor),
          baseRate: fromBigNumber(baseRate),
        };
      }
      setCollaterals(collateralsCache);
      setSystemTVL(totalTVL);
      setCollateralPrices(collateralPricesCache);
      setUserTroves(userTrovesCache);

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

  const getLpTokenPrice = async (lpName) => {
    const lpAddress =
      lpName === "bitGov"
        ? addresses.bitGovLpOracle[account.chainId]
        : addresses.bitUsdLpOracle[account.chainId];

    const price = await publicClient.readContract({
      abi: BitLpOracleABI,
      address: lpAddress,
      functionName: "getLPPrice",
      args: [],
    });

    return fromBigNumber(price);
  };

  const getBitGovPrice = async () => {
    const price = await publicClient.readContract({
      abi: TWAPOracleABI,
      address: addresses.bitGovTWAP[account.chainId],
      functionName: "consult",
      args: [addresses.bitGov[account.chainId], new BigNumber(1e18).toFixed()],
    });

    const bitGovPrice = fromBigNumber(price);
    const rosePrice = getRosePrice();

    return bitGovPrice * rosePrice;
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

      const domain = {
        name: "BitSignature.SignIn",
        version: "1",
        chainId: account.chainId,
        verifyingContract: addresses.debtToken[account.chainId],
      };

      const types = {
        SignIn: [
          { name: "user", type: "address" },
          { name: "time", type: "uint32" },
        ],
      };

      const message = {
        time,
        user,
      };

      let signature;

      try {
        // First attempt - Standard EIP-712
        signature = await signTypedDataAsync({
          domain,
          types,
          primaryType: "SignIn",
          message,
        });
      } catch (err) {
        // Second attempt - Try Coinbase Wallet specific format
        const typedData = {
          domain,
          types,
          primaryType: "SignIn",
          message,
        };

        // Try using eth_signTypedData_v4 directly if available
        if (walletClient?.request) {
          try {
            signature = await walletClient.request({
              method: "eth_signTypedData_v4",
              params: [user, JSON.stringify(typedData)],
            });
          } catch (innerErr) {
            console.error("Direct eth_signTypedData_v4 failed:", innerErr);
            throw innerErr;
          }
        } else {
          throw new Error("Wallet client request method not available");
        }
      }

      if (!signature) {
        throw new Error("No signature received from wallet");
      }

      const rsv = ethers.utils.splitSignature(signature);
      const auth = { user, time, rsv };

      localStorage.setItem(
        `signInToken-${account.chainId}`,
        JSON.stringify(auth)
      );

      setSignatureToken(auth);

      return true;
    } catch (error) {
      // Enhanced error reporting
      let errorMessage = "Failed to sign message. ";
      if (error.code === "ACTION_REJECTED") {
        errorMessage += "You rejected the signature request.";
      } else if (error.code === -32603) {
        errorMessage +=
          "There was an issue with the network connection. Please verify your network settings.";
      } else if (error.message) {
        errorMessage += error.message;
      }

      throw new Error(errorMessage);
    }
  };

  const calcMaxFeePercentage = async (troveAddr, debt) => {
    const borrowingFee = await publicClient.readContract({
      abi: TroveManagerABI,
      address: troveAddr,
      functionName: "getBorrowingFee",
      args: [debt],
    });

    const maxFee = (fromBigNumber(borrowingFee) / fromBigNumber(debt)) * 1.2;

    return new BigNumber(maxFee).multipliedBy(1e18).toFixed();
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
        redeemCollateral,
        getRedemptionHints,
        getData,
        setLock,
        getLpTokenPrice,
        getBitGovPrice,
      }}
    >
      {children}
    </BlockchainContext.Provider>
  );
};
