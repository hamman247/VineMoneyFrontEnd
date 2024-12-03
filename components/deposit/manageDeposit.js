import styles from "../../styles/dapp.module.scss";
import { BlockchainContext } from "../../hook/blockchain";
import { useEffect, useState, useContext } from "react";
import BigNumber from "bignumber.js";
import Wait from "../../components/tooltip/wait";
import Loading from "../../components/tooltip/loading";
import tooltip from "../../components/tooltip";
import { useRouter } from "next/router";
import DepositsAndDebt from "../../components/dapp/depositsAndDebt";
import { useWaitForTransactionReceipt } from "wagmi";

export default function ManageDeposit({ address }) {
  const router = useRouter();

  const [buttonName, setButtonName] = useState("Deposit");
  const [operateType, setOperateType] = useState("Collateral");
  const [operateType2, setOperateType2] = useState("Deposit");
  const [collAmount, setCollAmount] = useState("");
  const [currentRatio, setCurrentRatio] = useState(0);
  const [afterDepositRatio, setDepositAfterRatio] = useState(0);
  const [afterWithdrawRatio, setWithdrawAfterRatio] = useState(0);
  const [debtAmount, setDebtAmount] = useState("");
  const [withdrawMax, setWithdrawMax] = useState(0);
  const [showClose, setShowClose] = useState(false);
  const [txHash, setTxHash] = useState("");
  const [deposits, setDeposits] = useState(0);
  const [debt, setDebt] = useState(0);
  const [status, setStatus] = useState(0);
  const [isPayable, setIsPayable] = useState(false);
  const [collateralBalance, setCollateralBalance] = useState(0);
  const [collateral, setCollateral] = useState({
    mcr: 0,
    borrowingRate: 0.0,
    redemptionRate: 0.0,
    mintedBitUSD: 0.0,
    tvl: 0.0,
    collateral: {
      logo: "rose.svg",
      name: "",
      address: "",
      payable: false,
    },
  });
  const [collateralAddr, setCollateralAddr] = useState("");
  const [approved, setApproved] = useState({
    hash: "",
    status: false,
  });

  const {
    userTroves,
    collaterals,
    balance,
    collateralPrices,
    bitUSDBalance,
    addColl,
    setCurrentState,
    setCurrentWaitInfo,
    currentState,
    approve,
    getTokenBalance,
    withdrawColl,
    repayDebt,
    closeTrove,
    getData,
    setLock,
  } = useContext(BlockchainContext);

  const { data: txReceipt, error: txError } = useWaitForTransactionReceipt({
    hash: txHash,
    confirmations: 1,
  });

  useEffect(() => {
    async function getDataWrapper() {
      if (userTroves[address] && collaterals[address]) {
        setCollateral(collaterals[address]);
        setDeposits(userTroves[address]?.deposits || 0);
        setDebt(userTroves[address]?.debt || 0);
        setStatus(userTroves[address]?.status || 0);
        setCollateralAddr(collaterals[address]?.collateral.address);
        setIsPayable(collaterals[address]?.collateral.payable);
        const tokenBalance = !collaterals[address]?.collateral.payable
          ? await getTokenBalance(collaterals[address]?.collateral.address)
          : 0;
        setCollateralBalance(tokenBalance);
      } else {
        // Handle the case when the trove is closed
        setCollateral(null);
        setDeposits(0);
        setDebt(0);
        setStatus(0);
        setCollateralAddr("");
        setIsPayable(false);
        setCollateralBalance(0);
      }
    }
    getDataWrapper();
  }, [address, collaterals, userTroves]);

  useEffect(() => {
    if (txReceipt && txHash) {
      setCurrentState(false);
      tooltip.success({ content: "Successful", duration: 5000 });
      if (approved.hash) {
        setApproved({
          hash: approved.hash,
          status: true,
        });
      }
    }
    if (txError && txHash) {
      setCurrentState(false);
      tooltip.error({
        content:
          "Transaction failed due to a network error. Please refresh the page and try again.",
        duration: 5000,
      });
      setApproved({
        hash: "",
        status: false,
      });
    }
    setTxHash("");
  }, [txReceipt, txError]);

  useEffect(() => {
    async function depositApproved() {
      if (approved.hash && approved.status) {
        await deposit();
        setApproved({
          hash: "",
          status: false,
        });
      }
    }
    depositApproved();
  }, [approved]);

  const price = collateralPrices[address];

  const onKeyDown = (e) => {
    // Prevent minus sign, plus sign, 'e' and 'E' (exponential notation)
    if (['-', '+', 'e', 'E'].includes(e.key)) {
      e.preventDefault();
    }

    // Allow: backspace, delete, tab, escape, enter, decimal point
    if ([
      'Backspace',
      'Delete',
      'Tab',
      'Escape',
      'Enter',
      '.',
      ','
    ].includes(e.key)) {
      return;
    }

    // Prevent if not a number
    if (isNaN(Number(e.key))) {
      e.preventDefault();
    }
  };

  const changeOperateType = (value) => {
    setOperateType(value);
    if (value == "Repay") {
      setButtonName("Repay");
    } else if (value == "Close") {
      setButtonName("Repay & Close");
    } else if (value === "Mint") {
      setButtonName("Mint");
    } else {
      if (operateType2 == "Deposit") {
        setButtonName("Deposit");
      } else {
        setButtonName("Withdraw");
      }
    }
  };

  const changeOperateType2 = (value) => {
    setOperateType2(value);
    setButtonName(value);
    setCollAmount("");
  };

  const changeCollAmount = async (e) => {
    const value = e.target.value;

    if (value === '') {
      setCollAmount('');
      return;
    }

    if (!/^\d*\.?\d*$/.test(value)) {
      return;
    }

    const parts = value.split('.');
    if (parts[1] && parts[1].length > 3) {
      return;
    }

    const numValue = Number(value);
    const balanceValue = isPayable ? balance : collateralBalance;
    const maxBalance = balanceValue - 1 > 0 ? balanceValue - 1 : 0;

    if (numValue >= 0 && numValue <= maxBalance) {
      setCollAmount(value);
    } else if (numValue > maxBalance) {
      setCollAmount(maxBalance.toFixed(3));
    }
  };

  const changeWithdrawAmount = async (e) => {
    const value = e.target.value;

    if (value === '') {
      setCollAmount('');
      return;
    }

    if (!/^\d*\.?\d*$/.test(value)) {
      return;
    }

    const parts = value.split('.');
    if (parts[1] && parts[1].length > 3) {
      return;
    }

    const numValue = Number(value);
    if (numValue >= 0 && numValue <= withdrawMax) {
      setCollAmount(value);
    } else if (numValue > withdrawMax) {
      setCollAmount(withdrawMax.toFixed(3));
    }
  };

  const changeCollValue = (value) => {
    if (buttonName == "Deposit") {
      const balanceValue = isPayable ? balance : collateralBalance;
      const maxBalance = (balanceValue - 1 > 0 ? balanceValue - 1 : 0);
      setCollAmount(maxBalance * value);
    } else if (buttonName == "Withdraw") {
      setCollAmount(withdrawMax * value);
    } else {
      setDebtAmount(Number(bitUSDBalance) * value);
    }
  };

  useEffect(() => {
    const ratio1 = ((deposits * price) / debt) * 100;
    setCurrentRatio(ratio1);
    if (collAmount) {
      const ratio2 = (((deposits + Number(collAmount)) * price) / debt) * 100;
      const ratio3 = (((deposits - Number(collAmount)) * price) / debt) * 100;
      setDepositAfterRatio(ratio2);
      setWithdrawAfterRatio(ratio3);
    }
  }, [collAmount, debt, deposits, price]);

  const changeDebtAmount = async (e) => {
    const value = e.target.value;

    if (value === '') {
      setDebtAmount('');
      return;
    }

    if (!/^\d*\.?\d*$/.test(value)) {
      return;
    }

    const parts = value.split('.');
    if (parts[1] && parts[1].length > 3) {
      return;
    }

    const numValue = Number(value);
    if (numValue >= 0 && numValue <= Number(bitUSDBalance)) {
      setDebtAmount(value);
    } else if (numValue > Number(bitUSDBalance)) {
      setDebtAmount(Number(bitUSDBalance).toFixed(3));
    }
  };

  useEffect(() => {
    const value = deposits - ((debt + 2) / price) * 1.5;
    setWithdrawMax(value >= 0 ? value : 0);
  }, [deposits, price, debt]);

  const approveCollateral = async () => {
    if (!collAmount) {
      return;
    }

    try {
      const collAmountBN = new BigNumber(collAmount);
      const tx = await approve(
        collateralAddr,
        collAmountBN.multipliedBy(1e18).integerValue().toFixed()
      );
      setCurrentWaitInfo({
        type: "loading",
        info: `Approving ${Number(collAmount).toLocaleString()} $${collateral?.collateral?.name}`
      });
      setApproved({
        hash: tx,
        status: false,
      });
      setCurrentState(true);
      setTxHash(tx);
    } catch (error) {
      console.log(error);
      setCurrentState(false);
      tooltip.error({
        content:
          "Transaction failed due to a network error. Please refresh the page and try again.",
        duration: 5000,
      });
    }
  };

  const deposit = async () => {
    if (!collAmount) {
      return;
    }

    if (status !== 0 && status !== 2) {
      try {
        const collAmountBN = new BigNumber(collAmount);
        const tx = await addColl(
          address,
          collAmountBN.multipliedBy(1e18).integerValue().toFixed(),
          isPayable
        );
        setCurrentWaitInfo({
          type: "loading",
          info: `Deposit ${Number(collAmount).toLocaleString()} $${collateral?.collateral?.name}`
        });
        setCurrentState(true);
        const result = await tx.wait();
        setCurrentState(false);
        if (result.status === 0) {
          tooltip.error({
            content:
              "Transaction failed due to a network error. Please refresh the page and try again.",
            duration: 5000,
          });
        } else {
          tooltip.success({ content: "Successful", duration: 5000 });
        }
        setCollAmount("");
        setLock(false);
        await getData();
      } catch (error) {
        console.log(error);
        setCurrentState(false);
        tooltip.error({
          content:
            "Transaction failed due to a network error. Please refresh the page and try again.",
          duration: 5000,
        });
      }
    }
  };

  const withdraw = async () => {
    if (!collAmount) {
      return;
    }

    try {
      const collAmountBN = new BigNumber(collAmount);
      const tx = await withdrawColl(
        address,
        collAmountBN.multipliedBy(1e18).integerValue().toFixed()
      );
      setCurrentWaitInfo({
        type: "loading",
        info: `Withdraw ${Number(collAmount).toLocaleString()} $${collateral?.collateral?.name}`
      });
      setCurrentState(true);
      const result = await tx.wait();
      setCurrentState(false);
      if (result.status === 0) {
        tooltip.error({
          content:
            "Transaction failed due to a network error. Please refresh the page and try again.",
          duration: 5000,
        });
      } else {
        tooltip.success({ content: "Successful", duration: 5000 });
      }
      setCollAmount("");
    } catch (error) {
      console.log(error);
      setCurrentState(false);
      tooltip.error({
        content:
          "Transaction failed due to a network error. Please refresh the page and try again.",
        duration: 5000,
      });
    }
  };

  const repay = async () => {
    if (!debtAmount) {
      return;
    }

    try {
      // Convert debtAmount using BigNumber properly and ensure integer value
      const debtAmountBN = new BigNumber(debtAmount);
      const tx = await repayDebt(
        address,
        debtAmountBN.multipliedBy(1e18).integerValue().toFixed()
      );
      setCurrentWaitInfo({
        type: "loading",
        info: `Repay ${Number(debtAmount).toLocaleString()} $bitUSD`
      });
      setCurrentState(true);
      const result = await tx.wait();
      setCurrentState(false);
      if (result.status === 0) {
        tooltip.error({
          content:
            "Transaction failed due to a network error. Please refresh the page and try again.",
          duration: 5000,
        });
      } else {
        tooltip.success({ content: "Successful", duration: 5000 });
      }
      setDebtAmount("");
    } catch (error) {
      console.log(error);
      setCurrentState(false);
      tooltip.error({
        content:
          "Transaction failed due to a network error. Please refresh the page and try again.",
        duration: 5000,
      });
    }
  };

  const repayClose = async () => {
    if (Number(bitUSDBalance) < Number(debt)) {
      tooltip.error({
        content:
          "You do not have enough bitUSD in your wallet to repay your debt. You require an additional " +
          Number(
            (Number(debt) - Number(bitUSDBalance)).toFixed(4)
          ).toLocaleString() +
          " $bitUSD.",
        duration: 5000,
      });
      return;
    }
    setShowClose(false);
    try {
      const tx = await closeTrove(address);
      setCurrentWaitInfo({ type: "loading", info: "" });
      setCurrentState(true);
      const result = await tx.wait();
      setCurrentState(false);
      if (result.status === 0) {
        tooltip.error({
          content:
            "Transaction failed due to a network error. Please refresh the page and try again.",
          duration: 5000,
        });
      } else {
        tooltip.success({ content: "Successful", duration: 5000 });
      }
      await getData();
      setOperateType("Collateral");
      setOperateType2("Deposit");
      setButtonName("Deposit");
      router.push("/Vault");
    } catch (error) {
      setCurrentState(false);
      tooltip.error({
        content:
          "Transaction failed due to a network error. Please refresh the page and try again.",
        duration: 5000,
      });
    }
  };

  const changeShowClose = () => {
    if (Number(bitUSDBalance) < Number(debt)) {
      return;
    } else {
      setShowClose(true);
    }
  };

  const Operate = () => {
    if (buttonName == "Deposit") {
      if (isPayable) deposit();
      else approveCollateral();
    } else if (buttonName == "Withdraw") {
      withdraw();
    } else if (buttonName == "Repay") {
      repay();
    } else {
      repayClose();
    }
  };

  return (
    <>
      <div className="dappBg">
        <div className={`${styles.Vault} ${"dappMain"}`}>
          <DepositsAndDebt address={router.query.vault}></DepositsAndDebt>

          <div className={styles.topType}>
            <h3>Manage Your Vault</h3>
          </div>
          <div className={styles.rose}>
            <div className={styles.CoinType}>
              <div className={styles.collateral}>
                <img
                  src={`/dapp/${collateral?.collateral?.logo}`}
                  alt={`${collateral?.collateral?.logo}`}
                />
                ${collateral?.collateral?.name}
              </div>
              <div>
                <div
                  className={styles.mintBtn}
                  onClick={() =>
                    router.push({
                      pathname: "/Mint/[mint]",
                      query: { mint: address },
                    })
                  }
                >
                  Mint bitUSD
                </div>
              </div>
            </div>
            <div className={styles.enterAmount}>
              <div className={styles.operateType}>
                <div
                  className={operateType == "Collateral" ? styles.active : ""}
                  onClick={() => changeOperateType("Collateral")}
                >
                  Collateral
                </div>
                <div
                  className={operateType == "Repay" ? styles.active : ""}
                  onClick={() => changeOperateType("Repay")}
                >
                  Repay bitUSD
                </div>
                <div
                  className={operateType == "Close" ? styles.active : ""}
                  onClick={() => changeOperateType("Close")}
                >
                  Close
                </div>
              </div>

              {operateType == "Collateral" ? (
                <div className={styles.operateType2}>
                  <div
                    className={operateType2 == "Deposit" ? styles.active : ""}
                    onClick={() => changeOperateType2("Deposit")}
                  >
                    Deposit ${collateral?.collateral?.name}
                  </div>
                  <div
                    className={operateType2 == "Withdraw" ? styles.active : ""}
                    onClick={() => changeOperateType2("Withdraw")}
                  >
                    Withdraw ${collateral?.collateral?.name}
                  </div>
                </div>
              ) : null}

              {buttonName == "Deposit" || buttonName === "Mint" ? (
                <>
                  <div className={styles.miniTitle}>
                    <span>Enter amount</span>
                    <span style={{ fontSize: "12px" }}>
                      Balance{" "}
                      {Number(
                        Number(isPayable ? balance : collateralBalance).toFixed(3)
                      ).toLocaleString()}{" "}
                      ${collateral?.collateral?.name}
                    </span>
                  </div>
                  <div className="inputTxt3">
                    <input
                      type="text"
                      placeholder="0"
                      onWheel={(e) => e.target.blur()}
                      id="collAmount"
                      onKeyDown={onKeyDown}
                      onChange={changeCollAmount}
                      value={collAmount === 0 ? "0" : collAmount || ""}
                    />
                    <span>${collateral?.collateral?.name}</span>
                  </div>
                </>
              ) : buttonName == "Withdraw" ? (
                <>
                  <div className={styles.miniTitle}>
                    <span>Enter amount</span>
                    <span style={{ fontSize: "12px" }}>
                      Balance{" "}
                        {Number(Number(withdrawMax).toFixed(3)).toLocaleString()}{" "}
                      ${collateral?.collateral?.name}
                    </span>
                  </div>
                  <div className="inputTxt3">
                    <input
                        type="text"
                      placeholder="0"
                      onWheel={(e) => e.target.blur()}
                        id="collAmount"
                        onKeyDown={onKeyDown}
                        onChange={changeWithdrawAmount}
                        value={collAmount === 0 ? "0" : collAmount || ""}
                      />
                    <span>${collateral?.collateral?.name}</span>
                  </div>
                </>
              ) : buttonName == "Repay" ? (
                <>
                  <div className={styles.miniTitle}>
                    <span>{operateType} bitUSD</span>
                    <span style={{ fontSize: "12px" }}>
                      Balance{" "}
                          {Number(Number(bitUSDBalance).toFixed(3)).toLocaleString()}{" "}
                      bitUSD
                    </span>
                  </div>
                  <div className="inputTxt3">
                    <input
                          type="text"
                      placeholder="0"
                      onWheel={(e) => e.target.blur()}
                          id="debtAmount"
                          onKeyDown={onKeyDown}
                          onChange={changeDebtAmount}
                          value={debtAmount === 0 ? "0" : debtAmount || ""}
                        />
                    <span>$bitUSD</span>
                  </div>
                </>
              ) : null}
              {operateType == "Close" ? null : (
                <div className="changeBalance">
                  <span onClick={() => changeCollValue(0.25)}>25%</span>
                  <span onClick={() => changeCollValue(0.5)}>50%</span>
                  <span onClick={() => changeCollValue(0.75)}>75%</span>
                  <span
                    onClick={() => changeCollValue(1)}
                    style={{ border: "none" }}
                  >
                    Max
                  </span>
                </div>
              )}

              <>
                <div
                  className={styles.miniTitle}
                  style={{ fontSize: "12px", marginTop: "10px" }}
                >
                  <span>Current Collateral Ratio </span>
                  <span>
                    {Number(Number(currentRatio).toFixed(4)).toLocaleString()}%
                  </span>
                </div>
                {collAmount ? (
                  <div
                    className={styles.miniTitle}
                    style={{
                      fontSize: "12px",
                      marginTop: "10px",
                      color: "#00D7CA",
                    }}
                  >
                    <span>Collateral Ratio after {operateType2} </span>
                    <span>
                      {operateType2 == "Deposit"
                        ? Number(
                          Number(afterDepositRatio).toFixed(4)
                        ).toLocaleString()
                        : Number(
                          Number(afterWithdrawRatio).toFixed(4)
                        ).toLocaleString()}
                      %
                    </span>
                  </div>
                ) : null}
              </>

              {operateType == "Close" ? (
                <>
                  <div className={`${styles.miniTitle} ${styles.borderGreen}`} style={{ fontSize: "12px", marginTop: "10px" }}>
                    <span>Total Collateral</span>
                    <span>
                      {Number(Number(deposits).toFixed(3)).toLocaleString()} $
                      {collateral?.collateral?.name}
                    </span>
                  </div>
                  <div className={`${styles.miniTitle} ${styles.borderGray}`} style={{ fontSize: "12px", marginTop: "10px" }}>
                    <span>Your Total Debt</span>
                    <span>
                      {Number(Number(debt).toFixed(3)).toLocaleString()} $bitUSD
                    </span>
                  </div>
                  <div className={`${styles.miniTitle}`} style={{ fontSize: "12px", marginTop: "10px" }}>
                    <span>Wallet Balance</span>
                    <div className={styles.walletBalance}>
                      <span style={Number(bitUSDBalance) < Number(debt) ? null : { color: "#fff" }}>
                        {Number(Number(bitUSDBalance).toFixed(3)).toLocaleString()}
                      </span>{" "}
                      $bitUSD
                    </div>
                  </div>
                </>
              ) : null}
            </div>
            <div style={{ padding: "8px" }}>
              {buttonName == "Deposit" || buttonName == "Withdraw" ? (
                <div
                  className={
                    !collAmount
                      ? "button rightAngle height disable"
                      : "button rightAngle height"
                  }
                  onClick={() => Operate()}
                >
                  {buttonName}
                </div>
              ) : buttonName == "Repay" ? (
                <div
                  className={
                    !debtAmount
                      ? "button rightAngle height disable"
                      : "button rightAngle height"
                  }
                  onClick={() => Operate()}
                >
                  {buttonName}
                </div>
              ) : (
                <div
                  className={
                    Number(bitUSDBalance) < Number(debt)
                      ? "button rightAngle height disable"
                      : "button rightAngle height"
                  }
                  onClick={() => changeShowClose()}
                >
                  {buttonName}
                </div>
              )}
            </div>
            {operateType == "Close" ? (
              Number(bitUSDBalance) < Number(debt) ? (
                <div className={styles.closeTip}>
                  <p>
                    You do not have enough bitUSD in your wallet to repay your
                    debt. You require an additional{" "}
                    <span>
                      {Number(
                        (Number(debt) - Number(bitUSDBalance)).toFixed(4)
                      ).toLocaleString()}
                    </span>{" "}
                    $bitUSD.
                  </p>
                </div>
              ) : null
            ) : (
              <div className={styles.data}>
                <div className={styles.dataItem}>
                  <p>Total Value Locked</p>
                    <span>${Number((deposits * price).toFixed(3)).toLocaleString()}</span>
                </div>
                <div className={styles.dataItem}>
                  <p>Minted bitUSD</p>
                    <span>${Number(debt.toFixed(3)).toLocaleString()}</span>
                </div>
                <div className={styles.dataItem}>
                  <p>Mint Fee</p>
                  <span>0.5%</span>
                </div>
                <div className={styles.dataItem}>
                  <p>Borrow Interest Rate</p>
                  <span>2.5%</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {currentState ? <Wait></Wait> : null}

      {showClose ? (
        <div className={styles.showTip}>
          <div className={`${styles.tipMain} ${styles.closeMain}`}>
            <div className={styles.close}>
              <img
                src="/icon/close.svg"
                alt="icon"
                onClick={() => setShowClose(false)}
              />
            </div>
            <div className={styles.closeTitle}>
              You are about to close your ${collateral?.collateral?.name}{" "}
              account
            </div>
            <p className={styles.closeDesc}>
              You will need to repay any outstanding bitUSD debt:
            </p>
            <div className={styles.closeCoin}>
              <p>{Number(Number(debt).toFixed(3)).toLocaleString()}</p>
              <div>
                <img style={{ width: 24, height: 24 }} src="/dapp/bitUSD.svg" alt="vUSD"></img>
                $bitUSD
              </div>
            </div>
            <div className={styles.closeCoin}>
              <p>{Number(Number(deposits).toFixed(3)).toLocaleString()}</p>
              <div>
                <img style={{ width: 24, height: 24 }} src={`/dapp/${collateral?.collateral?.logo}`} alt="rose"></img>
                ${collateral?.collateral?.name}
              </div>
            </div>
            <div className={styles.button}>
              <span
                className="button rightAngle height"
                style={{ width: "100%" }}
                onClick={() => Operate()}
              >
                Repay & Close
              </span>
            </div>
          </div>
        </div>
      ) : null}

      {collateral?.mcr === 0 ? <Loading></Loading> : null}
    </>
  );
}
