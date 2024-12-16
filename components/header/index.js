import Head from "next/head";
import styles from "./index.module.scss";
import { useEffect, useState, useContext } from "react";
import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { BlockchainContext } from "../../hook/blockchain";
import Link from "next/link";
import { useRouter } from "next/router";
import { formatNumber } from "../../utils/helpers";
import { CHAIN_ID } from '../../hook/wagmi'

export default function Header(props) {
  const { menu, type, dappMenu } = props;
  const router = useRouter();
  const account = useAccount();

  const { connectors, connect, error: connectError } = useConnect({
    onError(error) {
      console.error('Connect error:', error);
    },
    onSuccess(data) {
      setOpenConnect(false);
    }
  });

  const [walletAvailability, setWalletAvailability] = useState({});

  const checkWalletAvailability = async (connector) => {
    console.log('🚀 ~ checkWalletAvailability ~ connector:', connector);
    try {
      // Wait a small amount of time to allow wallet injection
      await new Promise(resolve => setTimeout(resolve, 100));

      // Basic check for window.ethereum
      if (!window.ethereum) return false;

      if (connector.name === 'MetaMask') {
        const hasMetaMask = window.ethereum?.isMetaMask === true;
        console.log('🚀 ~ checkWalletAvailability ~ hasMetaMask:', hasMetaMask);

        const metaMaskProvider = window.ethereum?.providers?.find(
          (p) => p.isMetaMask === true
        );
        console.log('Found MetaMask provider:', !!metaMaskProvider);
        console.log('🚀 ~ checkWalletAvailability ~ connector.ready:', connector.ready);
        return hasMetaMask;
      }

      if (connector.name === 'Coinbase Wallet') {
        const coinbaseProvider = window.ethereum?.providers?.find(
          (p) => p.isCoinbaseWallet === true
        );
        const hasCoinbase = !!coinbaseProvider;
        console.log('🚀 ~ checkWalletAvailability ~ hasCoinbase:', hasCoinbase);
        return hasCoinbase;
      }

      return false;
    } catch (error) {
      console.error(`Error checking ${connector.name} availability:`, error);
      return false;
    }
  };

  // The rest of your useEffect remains the same
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkConnectors = async () => {
      await new Promise(res => setTimeout(res, 100));
      if (!window.ethereum) return;

      const availabilityStatus = {};
      for (const connector of connectors) {
        const isAvailable = await checkWalletAvailability(connector);
        availabilityStatus[connector.uid] = isAvailable;
        console.log(`${connector.name} final availability:`, isAvailable);
      }
      setWalletAvailability(availabilityStatus);
    };

    checkConnectors();
  }, [connectors]);

  const { disconnect } = useDisconnect();
  const { chains, switchChain } = useSwitchChain();
  const [openHealth, setOpenHealth] = useState(false);

  const {
    signTrove,
    checkAuth,
    signDebtToken,
    checkAuthToken,
    tcr,
    totalPricedCollateral,
    totalSystemDebt,
  } = useContext(BlockchainContext);

  const [open, setOpen] = useState(true);
  const [openConnect, setOpenConnect] = useState(false);
  const [showSignIn, setShowSignIn] = useState(false);
  const [showSignInToken, setShowSignInToken] = useState(false);
  const [openNetworks, setOpenNetworks] = useState(false);

  const goMenu = (id) => {
    if (menu == "Home") {
      props.updateId(id);
    } else {
      router.push("/#" + id);
    }
  };

  useEffect(() => {
    if (account.status === "connected" && menu !== "Home") {
      // FOR STAGING ONLY / FOR PRODUCTION SHOULD BE OASIS SAPPHIRE MAINNET
      if (account.chainId !== 23295) {
        switchChain({ chainId: 23295 });
      }
      setShowSignIn(!checkAuth());
      setShowSignInToken(!checkAuthToken());
    }
  }, [account, menu]);

  const openH5Menu = async () => {
    setOpen(!open);
  };

  const goMenu_h5 = (id) => {
    setOpen(true);
    if (menu == "Home") {
      props.updateId(id);
    } else {
      router.push("/#" + id);
    }
  };

  const [isConnecting, setIsConnecting] = useState(false);
  const [hasAttemptedSwitch, setHasAttemptedSwitch] = useState(false);

  const handleChainAddition = async (provider) => {
    try {
      // Check if chain is already added
      try {
        const chain = await provider.request({
          method: 'eth_chainId',
          params: [],
        });

        if (chain === `0x${CHAIN_ID.SAPPHIRE_TESTNET.toString(16)}`) {
          return true;
        }
      } catch (error) {
        console.error('Error checking chain:', error);
      }

      // Add the network
      await provider.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: `0x${CHAIN_ID.SAPPHIRE_TESTNET.toString(16)}`,
          chainName: 'Oasis Sapphire Testnet',
          nativeCurrency: {
            name: 'TEST',
            symbol: 'TEST',
            decimals: 18
          },
          rpcUrls: ['https://testnet.sapphire.oasis.dev'],
          blockExplorerUrls: ['https://testnet.explorer.sapphire.oasis.dev']
        }]
      });

      return true;
    } catch (error) {
      console.error('Error adding chain:', error);
      if (error.code === 4001) {
        throw new Error('User rejected adding the network');
      }
      throw error;
    }
  };

  const [isSigningTrove, setIsSigningTrove] = useState(false);
  const [isSigningToken, setIsSigningToken] = useState(false);

  const handleConnect = async (connector) => {
    if (isConnecting) return;

    try {
      setIsConnecting(true);
      localStorage.removeItem(`signInAuth-${account.chainId}`);
      localStorage.removeItem(`signInToken-${account.chainId}`);

      if (connector.name === "Coinbase Wallet") {
        try {
          const provider = await connector.getProvider();
          if (!provider) throw new Error('Unable to get Coinbase Wallet provider');

          const accounts = await provider.request({ method: 'eth_requestAccounts' });
          if (!accounts?.length) throw new Error('No accounts received');

          await connect({ connector, chainId: CHAIN_ID.SAPPHIRE_TESTNET });

          try {
            await provider.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: `0x${CHAIN_ID.SAPPHIRE_TESTNET.toString(16)}`,
                chainName: 'Oasis Sapphire Testnet',
                nativeCurrency: { name: 'TEST', symbol: 'TEST', decimals: 18 },
                rpcUrls: ['https://testnet.sapphire.oasis.dev'],
                blockExplorerUrls: ['https://testnet.explorer.sapphire.oasis.dev']
              }]
            });
          } catch (error) {
            if (!error.message.includes('already exists')) console.warn('Chain addition:', error);
          }

          try {
            await provider.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: `0x${CHAIN_ID.SAPPHIRE_TESTNET.toString(16)}` }]
            });
          } catch (error) {
            console.warn('Chain switch:', error);
          }

          setOpenConnect(false);
          setHasAttemptedSwitch(true);

          // Clear auth states before refresh
          setShowSignIn(false);
          setShowSignInToken(false);

          setTimeout(() => window.location.reload(), 1000);

        } catch (error) {
          console.error('Coinbase error:', error);
          handleConnectionError(error);
        }
      } else {
        await connect({ connector, chainId: CHAIN_ID.SAPPHIRE_TESTNET });
        setOpenConnect(false);
        setTimeout(() => window.location.reload(), 1000);
      }

    } catch (error) {
      handleConnectionError(error);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSignTrove = async () => {
    if (isSigningTrove) return;
    try {
      setIsSigningTrove(true);
      await signTrove();
      setShowSignIn(false);
    } catch (error) {
      console.error('Sign trove error:', error);
    } finally {
      setIsSigningTrove(false);
    }
  };

  const handleSignToken = async () => {
    if (isSigningToken) return;
    try {
      setIsSigningToken(true);
      await signDebtToken();
      setShowSignInToken(false);
    } catch (error) {
      console.error('Sign token error:', error);
    } finally {
      setIsSigningToken(false);
    }
  };

  const handleConnectionError = (error) => {
    console.error('Connection error:', error);
    let errorMessage = 'Failed to connect wallet. ';

    if (error.code === 4001) {
      errorMessage += 'User rejected the connection.';
    } else if (error.message?.includes('provider')) {
      errorMessage += 'Please install the Coinbase Wallet extension or open in Coinbase Wallet browser.';
    } else {
      errorMessage += error.message || 'Please try again.';
    }

    if (!error.message?.includes('chain')) {
      alert(errorMessage);
    }
  };

  useEffect(() => {
    if (account.status === "connected" && !hasAttemptedSwitch) {
      const switchChainIfNeeded = async () => {
        if (account.chainId !== CHAIN_ID.SAPPHIRE_TESTNET) {
          try {
            setHasAttemptedSwitch(true);
            await switchChain({ chainId: CHAIN_ID.SAPPHIRE_TESTNET });
          } catch (error) {
            console.error('Chain switch error:', error);
            // Don't throw, just log the error
          }
        }
      };

      switchChainIfNeeded();
    }
  }, [account.status, account.chainId, hasAttemptedSwitch]);

  // Reset switch attempt flag on disconnect
  useEffect(() => {
    if (account.status === "disconnected") {
      setHasAttemptedSwitch(false);
    }
  }, [account.status]);

  useEffect(() => {
    if (account.isConnected) {
      setOpenConnect(false);
    }
  }, [account.isConnected]);

  const handleDisconnect = async () => {
    try {
      // Clear local storage
      localStorage.removeItem(`signInAuth-${account.chainId}`);
      localStorage.removeItem(`signInToken-${account.chainId}`);

      // Reset all relevant states
      setShowSignIn(false);
      setShowSignInToken(false);
      setOpenConnect(false);
      setOpenNetworks(false);
      setHasAttemptedSwitch(false);

      // Perform the disconnect
      await disconnect();

      // Force a page reload after a short delay to ensure clean state
      setTimeout(() => {
        window.location.reload();
      }, 100);
    } catch (error) {
      console.error('Disconnect error:', error);
      alert('Error disconnecting. Please try again.');
    }
  };

  useEffect(() => {
    if (account.status === "disconnected") {
      setHasAttemptedSwitch(false);
      setShowSignIn(false);
      setShowSignInToken(false);

      // Clear auth storage
      localStorage.removeItem(`signInAuth-${account.chainId}`);
      localStorage.removeItem(`signInToken-${account.chainId}`);
    }
  }, [account.status, account.chainId]);

  return (
    <>
      <Head>
        <title>Bit Protocol | Privacy Focused Omnichain Stablecoin</title>
        <meta
          name="description"
          content="Bit Protocol | Privacy Focused Omnichain Stablecoin"
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className={styles.head}>
        <div className={styles.headMain} id="vine">
          <div className={styles.logo}>
            <Link href="/" className={styles.logo}>
              <img
                src="/bitusd-logo.svg"
                alt="logo"
                className={styles.logoImg}
              />
            </Link>
            {type == "dapp" ? (
              <div className={styles.main}>
                <div
                  className={styles.health}
                  onClick={() => setOpenHealth(true)}
                >
                  <img src="/icon/heart.svg" alt="heart"></img>
                  {account.status === "connected"
                    ? tcr >= 1.1579208923731621e61
                      ? "∞"
                      : `${formatNumber(tcr)}%`
                    : 0}
                </div>
              </div>
            ) : null}
          </div>

          {type == "dapp" ? (
            <div className={styles.dappList}>
              <Link
                className={dappMenu == "Vault" ? `${styles.active}` : null}
                href="/Vault"
                rel="nofollow noopener noreferrer"
              >
                <span>Vaults</span>
              </Link>
              <Link
                className={dappMenu == "Earn" ? `${styles.active}` : null}
                href="/Earn"
                rel="nofollow noopener noreferrer"
              >
                <span>Earn</span>
              </Link>
              <Link
                className={dappMenu == "Reward" ? `${styles.active}` : null}
                href="/Reward"
                rel="nofollow noopener noreferrer"
              >
                <span>Reward</span>
              </Link>
              <Link
                className={dappMenu == "Lock" ? `${styles.active}` : null}
                href="/Lock"
                rel="nofollow noopener noreferrer"
              >
                <span>Lock</span>
              </Link>
              <Link
                className={dappMenu == "Redeem" ? `${styles.active}` : null}
                href="/Redeem"
                rel="nofollow noopener noreferrer"
              >
                <span>Redeem</span>
              </Link>
              <Link
                className={dappMenu == "Vote" ? `${styles.active}` : null}
                href="/Vote"
                rel="nofollow noopener noreferrer"
              >
                <span>Vote</span>
              </Link>
            </div>
          ) : (
            <div className={styles.list}>
              <span onClick={() => goMenu("works")}>How it works</span>
              <Link
                target="_blank"
                href="https://vine-money.gitbook.io/vine-money/"
                rel="nofollow noopener noreferrer"
              >
                <span>Docs</span>
              </Link>
              <div className="menu-container">
                <span>Socials</span>
                <div className="dropdown-menu">
                  <Link
                    target="_blank"
                    href="https://twitter.com/Vine_Money"
                    rel="nofollow noopener noreferrer"
                  >
                    Twitter/X
                  </Link>
                  <Link
                    target="_blank"
                    href="https://t.me/vinemoneyofficial"
                    rel="nofollow noopener noreferrer"
                  >
                    Telegram Community
                  </Link>
                  <Link
                    target="_blank"
                    href="https://t.me/vinemoneyann"
                    rel="nofollow noopener noreferrer"
                  >
                    Telegram Announcements
                  </Link>
                  <Link
                    target="_blank"
                    href="https://medium.com/@vine_money"
                    rel="nofollow noopener noreferrer"
                  >
                    Medium
                  </Link>
                </div>
              </div>
              <span onClick={() => goMenu("faq")}>FAQ</span>
              <div className="menu-container">
                <span>IDO</span>
                <div className="dropdown-menu">
                  <Link
                    href="/ido-countdown"
                    rel="nofollow noopener noreferrer"
                    style={{ width: "135px" }}
                  >
                    IDO Countdown
                  </Link>
                  <Link
                    href="/ido-raffle"
                    rel="nofollow noopener noreferrer"
                    style={{ width: "135px" }}
                  >
                    Whitelist Raffle
                  </Link>
                </div>
              </div>
              <Link
                target="_blank"
                href="/Vine_Money_Disclaimer.pdf"
                rel="nofollow noopener noreferrer"
              >
                <span>Disclaimer</span>
              </Link>
            </div>
          )}

          <div className={styles.menuList}>
            {type != "dapp" ? (
              <div div className="button">
                <Link href="/Vault">
                  <span>Launch App</span>
                </Link>
              </div>
            ) : (
              <>
                {account.status === "connected" && (
                  <div
                    className={styles.network}
                    onClick={() => setOpenNetworks(true)}
                  >
                    {account.chainId === 19236265 ? (
                      <img src="/dapp/btc-logo.svg" alt="chainLogo" />
                    ) : (
                      <img src="/dapp/rose.svg" alt="chainLogo" />
                    )}
                    {account?.chain?.name}
                  </div>
                )}

                <div className="h5None">
                  {account.status === "connected" ? (
                    <div style={{ display: "flex", gap: "5px" }}>
                      <div style={{ display: "flex", gap: "5px" }}>
                        <div className="account">
                          {account.address.slice(0, 5) +
                            ".." +
                            account.address.slice(-5)}
                        </div>
                        <div
                          className="button h5None"
                          style={{ minWidth: "auto" }}
                            onClick={handleDisconnect}
                        >
                          Disconnect
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="button"
                          style={{
                            minWidth: "auto",
                            opacity: isConnecting ? 0.7 : 1
                          }}
                          onClick={() => !isConnecting && setOpenConnect(true)}
                    >
                          {isConnecting ? "Connecting..." : "Connect Wallet"}
                    </div>
                  )}
                </div>
              </>
            )}

            <div className={styles.h5Menu} onClick={openH5Menu}>
              {open ? (
                <img src="/icon/menu.svg" alt="menu" />
              ) : (
                <img src="/icon/menu_c.svg" alt="menu" />
              )}
            </div>
          </div>
        </div>
      </div>

      {openConnect ? (
        <div className="promptBox">
          <div className="boxMain">
            <div className="boxInfo">
              <h2>Connect a wallet</h2>
              <img
                className={styles.close}
                onClick={() => setOpenConnect(false)}
                src="/icon/close.svg"
                alt="close"
              />
            </div>
            {connectors.map((connector) => {
              const isAvailable = walletAvailability[connector.uid];
              const isDisabled = !isAvailable || isConnecting;

              return (
                <div
                  className="divBtn"
                  key={connector.uid}
                  onClick={() => {
                    if (!isDisabled) {
                      handleConnect(connector);
                    }
                  }}
                  id={"connect-" + connector.id}
                  style={{
                    opacity: isDisabled ? 0.5 : 1,
                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                    position: 'relative'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    width: '100%'
                  }}>
                    <div>
                      {connector.name === "Injected (Sapphire)"
                        ? "Browser wallet (Sapphire)"
                        : connector.name === "Injected"
                          ? "Browser wallet"
                          : connector.name}
                      {isConnecting && connector.name === "Coinbase Wallet" && " (Connecting...)"}
                      {!isAvailable && (
                        <span style={{
                          fontSize: '0.8em',
                          marginLeft: '8px',
                          color: '#666'
                        }}>
                          (Not installed)
                        </span>
                      )}
                    </div>
                    {connector.name === "Coinbase Wallet" ? (
                      <img
                        className={styles.close}
                        src="/icon/coinbase.svg"
                        alt="close"
                      />
                    ) : (
                      <img
                        className={styles.close}
                        src="/icon/browserWallet.svg"
                        alt="close"
                      />
                    )}
                  </div>
                </div>
              );
            })}

            {connectError && (
              <div style={{ color: 'red', marginTop: '10px', textAlign: 'center' }}>
                {connectError.message}
              </div>
            )}
          </div>
        </div>
      ) : null}

      {openNetworks ? (
        <div className="promptBox">
          <div className="boxMain">
            <div className="boxInfo">
              <h2>Switch network</h2>
              <img
                className={styles.close}
                onClick={() => setOpenNetworks(false)}
                src="/icon/close.svg"
                alt="close"
              ></img>
            </div>
            {chains.map((chain) => (
              <div
                className="divBtn"
                key={chain.id}
                onClick={() => {
                  switchChain({ chainId: chain.id });
                  setOpenNetworks(false);
                }}
                id={"switch-" + chain.id}
              >
                {chain.name}

                {chain.id === 23294 || 23295 ? (
                  <img
                    className={styles.close}
                    src="/dapp/rose.svg"
                    alt="close"
                  ></img>
                ) : (
                  <img
                    className={styles.close}
                    src="/dapp/btc-logo.svg"
                    alt="close"
                  ></img>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {openHealth ? (
        <div className="promptBox">
          <div className="boxMain">
            <div className="boxInfo">
              <h2>Protocol Statistics</h2>
              <img
                className={styles.close}
                onClick={() => setOpenHealth(false)}
                src="/icon/close.svg"
                alt="close"
              ></img>
            </div>
            <div className="infoMain">
              <div className="data" style={{ borderTop: "none" }}>
                <div className="dataItem">
                  <p>Total Collateral Value</p>
                  <span>
                    {account.status === "connected"
                      ? `$${formatNumber(totalPricedCollateral)}`
                      : 0}
                  </span>
                </div>
                <div className="dataItem">
                  <p>Total Debt Value</p>
                  <span>
                    {account.status === "connected"
                      ? `$${formatNumber(totalSystemDebt)}`
                      : 0}
                  </span>
                </div>
                <div className="dataItem">
                  <p>TCR</p>
                  <span>
                    {account.status === "connected"
                      ? tcr >= 1.1579208923731621e61
                        ? "∞"
                        : `${formatNumber(tcr)}%`
                      : 0}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {showSignIn ? (
        <div className="promptSign">
          <div className="firstBox">
            <div className="infoBox">
              Bit Protocol is the first and only encrypted DeFi protocol for
              Web3 that provides intelligent privacy features. Only your
              personal signature grants access to individual data. To streamline
              the signing process and enhance user experience, you are required
              to use EIP-712 to "sign in" once per day.
            </div>
            {showSignIn && (
              <div className="button" onClick={handleSignTrove} disabled={isSigningTrove}>
                {isSigningTrove ? "Signing..." : "Sign in"}
              </div>
            )}

            {showSignInToken && (
              <div className="button" onClick={handleSignToken} disabled={isSigningToken}>
                {isSigningToken ? "Signing..." : "Sign in"}
              </div>
            )}
          </div>
        </div>
      ) : null}

      {showSignInToken ? (
        <div className="promptSign">
          <div className="firstBox">
            <div className="infoBox">
              Please sign in your wallet's pop-up to allow Bit Protocol to
              access your bitUSD balance.
            </div>
            <div
              className="button"
              onClick={async () => {
                try {
                  await signDebtToken();
                } catch (error) {
                  console.error('Failed to sign:', error);
                }
              }}
            >
              Sign in
            </div>
          </div>
        </div>
      ) : null}

      {/* {status === "pending" ? <Wait></Wait> : null} */}
    </>
  );
}
