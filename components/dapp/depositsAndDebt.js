import styles from '../../styles/dapp.module.scss'
import { UserContext } from "../../hook/user";
import { useContext, } from 'react';

export default function DepositsAndDebt(props) {
    const { debt, deposits } = useContext(UserContext);
    const { type } = props;
    return (
        <>
            <div className={styles.dataInfo} style={type == "Earn" ? { "width": "480px" } : null}>
                <div className={styles.value}>
                    <span>Your Deposits</span>
                    <div>
                        <p>{Number(deposits.toFixed(4)).toLocaleString()}</p>
                        <p>
                            <img src='/dapp/rose.svg' alt='rose' />
                            ROSE
                        </p>
                    </div>
                </div>

                <div className={styles.value}>
                    <span>Your Debt</span>
                    <div>
                        <p>{Number(debt.toFixed(4)).toLocaleString()}</p>
                        <p>
                            <img src='/dapp/vUSD.svg' alt='vUSD' />
                            vUSD
                        </p>
                    </div>
                </div>
            </div>
        </>
    )
}
