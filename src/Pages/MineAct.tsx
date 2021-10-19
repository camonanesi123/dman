/* import React from 'react'; */
/* import { useSelector} from 'react-redux'; */
import { useEffect,useState } from 'react';
import Layout from '../components/Layout';
import {useHistory} from "react-router-dom";
import {useWallet} from 'use-wallet';
import {ethers} from 'ethers';
import {
	DMTokenContract,USDTContract,
    ETHContract,TRXContract,FILContract,XRPContract,DOTContract,ADAContract,HTContract,
    DMStakingContract,USDTStakingContract,ETHStakingContract,TRXStakingContract,FILStakingContract,XRPStakingContract,DOTStakingContract,ADAStakingContract,HTStakingContract
} from "../config"
import { errHandler, tips, /* toValue, */ fromValue} from '../util';

import {useAppContext} from '../context';

const N = (n) => Number(Number(n).toFixed(4));
const contracts = {
	DM:{
		stakeTokenContract: DMTokenContract,
		stakingContract:DMStakingContract,
	},
	USDT:{
		stakeTokenContract: USDTContract,
		stakingContract:USDTStakingContract,
	},
	ETH:{
		stakeTokenContract: ETHContract,
		stakingContract:ETHStakingContract,
	},
	TRX:{
		stakeTokenContract: TRXContract,
		stakingContract:TRXStakingContract,
	},
	FIL:{
		stakeTokenContract: FILContract,
		stakingContract:FILStakingContract,
	},
	XRP:{
		stakeTokenContract: XRPContract,
		stakingContract:XRPStakingContract,
	},
	DOT:{
		stakeTokenContract: DOTContract,
		stakingContract:DOTStakingContract,
	},
	ADA:{
		stakeTokenContract: ADAContract,
		stakingContract:ADAStakingContract,
	},
	HT:{
		stakeTokenContract: HTContract,
		stakingContract:HTStakingContract,
	},
}

/* const Daily = 328767; */

const MineAct = (props) => {
	const wallet = useWallet();
	const connected = wallet.status==="connected"
	const [status,tokenPrices,{referral,checkBalance}] = useAppContext();
	//routing
	let history = useHistory();
	const {id} = props.match.params;
	
	useEffect(()=>{
		if(contracts[id]===undefined) {
			history.push("/")
		}
		console.log(status.pools[id]);
	},[])

	const [signedTokenContracts,setSignedTokenContracts] = useState(DMTokenContract);
	const [signedStakingContracts,setSignedStakingContracts] = useState(DMStakingContract);
	const [ready, setReady] = useState(false);

	useEffect(()=>{
		if(contracts[id]!==undefined) {
			const setSignedContracts = async ()=>{
				try {
				const provider = new ethers.providers.Web3Provider(wallet.ethereum);
				const signer =await provider.getSigner();
				var signedTokenContracts = (contracts[id].stakeTokenContract).connect(signer);
				var signedStakingContracts = (contracts[id].stakingContract).connect(signer);
			
				setSignedTokenContracts(signedTokenContracts);
				setSignedStakingContracts(signedStakingContracts);
				setReady(true);
				} catch (err) {
					errHandler(err);
				}
			}
			
			if(connected){
				setSignedContracts();
			}
		}
	},[wallet.status])

	// mintStatus
	const [mintStatus,setStatus] = useState({
		rewardable:0,
		rewards:0,
		stakedAmount:0,
		stakeAmount:0,
		withdrawAmount:0,

		interest:0,
		total:0,
		apr:0,
		multiplier:0,
		
	});
	const [loading,setLoading] = useState(false);

	//setStatus

	const handleAmount = (e:any)=>{
		setStatus({...mintStatus,stakeAmount:e.target.value});
	}

	const setStakedStatus =async ()=>{
		try{
			const  res =await signedStakingContracts.getStakeInfo(wallet.account);
			const {/* _total,  */_staking, _rewards, _rewardable} = res;
			if (tokenPrices[id]) {
				setStatus({...mintStatus, stakedAmount:fromValue(_staking,id), rewards:fromValue(_rewards,"DM"), rewardable:fromValue(_rewardable,"DM")});
				
				// var reward =await signedStakingContracts.rewards(wallet.account);
				// setStatus({...mintStatus, reward:_reward});	
			}
			
		} catch (err) {
			errHandler(err)
		}
	}

	useEffect(()=>{
		if(connected&&ready){
			setStakedStatus();
		}
	},[signedStakingContracts,ready])

	const setPoolStatus = () => {
		console.log(tokenPrices[id],status.pools[id],status.pools)
		if(!status.pools[id]) return;
		let total = status.pools[id].total
		let interest = status.pools[id]?status.pools[id].apr:"0";
		let multiplier = interest/100;
		setStatus({...mintStatus, interest:interest, total:total, multiplier:multiplier});
	}

	useEffect(()=>{
		setPoolStatus();
	},[status,tokenPrices])

	const handleStaking =async ()=>{
		try {
			if (mintStatus.stakeAmount<=0) return tips("少于100以上")
			if (wallet.status!=="connected") return tips("请连接Metamask钱包")
			if (loading) return tips("已进行中")
			setLoading(true);
			let tokenDecimals = (await signedTokenContracts.decimals()).toString();
			let stakeAmount = ethers.utils.parseUnits((mintStatus.stakeAmount).toString(),tokenDecimals)
			var allowance =await signedTokenContracts.allowance(wallet.account,signedStakingContracts.address);
			if(id==="USDT"&&allowance.toString()!=="0"&&allowance<stakeAmount){
				stakeAmount = allowance;
			}
			if(allowance<stakeAmount) {
				var tx = await signedTokenContracts.approve(signedStakingContracts.address,stakeAmount.sub(allowance))
				if(tx!=null) {
					await tx.wait();
				}
			}
			await staking(stakeAmount);
		} catch (err) {
			errHandler(err)
		}
		setLoading(false);
	}

	const staking =async (stakeAmount:any)=>{
		var tx = await signedStakingContracts.stake(stakeAmount, referral ? referral : '0x0000000000000000000000000000000000000000')
		if(tx!=null){
			await tx.wait();
			setStakedStatus();
			checkBalance(wallet.account);
		}
	}

	const handleClaimReward = async ()=>{
		try {
			if (wallet.status!=="connected") return tips("请连接Metamask钱包")
			if (loading) return tips("已进行中")
			setLoading(true);
			var tx = await signedStakingContracts.claimRewards();
			if(tx!=null){
				await tx.wait();
				setStakedStatus();
				checkBalance(wallet.account);
			}
		} catch (err) {
			errHandler(err)
		}
		setLoading(false);
	}

	const handleUnstaking = async ()=>{
		try {
			if (wallet.status!=="connected") return tips("请连接Metamask钱包")
			if (loading) return tips("已进行中")
			setLoading(true);
			var tx = await signedStakingContracts.unstaking()
			if(tx!=null) {
				await tx.wait();
				setStakedStatus();
				checkBalance(wallet.account);
			}
		} catch (err) {
			errHandler(err)
		}
		setLoading(false);
	}

	return <Layout className="mine">
		<div style={{display:'flex',padding:20}}>
			<div style={{width:'50%'}}>
				<h3>已赚取</h3>
				<code className="h3">{connected ? N(mintStatus.rewards) : '-'}</code>
			</div>
			<div style={{width:'50%'}}>
				<h3>年化利率</h3>
				<code className="h3">{connected ? N(mintStatus.interest) + '%' : '-'}</code>
			</div>
		</div>
		<div className="mt-3" style={{backgroundColor:'#2e3548', borderRadius: 5, padding: '20px 50px'}}>
			<h3><span className="success">DM</span>可赚取</h3>
			<div className="mt-4" style={{display:'flex', justifyContent:'space-between'}}>
				<span className="success">{connected ? N(mintStatus.rewardable) : '-'}</span>
				<button className="h3 btn btn-success round" onClick={handleClaimReward}>收割</button>
			</div>
		</div>
		<div className="mt-3" style={{backgroundColor:'#2e3548', borderRadius: 5, padding: '20px 50px'}}>
			<h3><span className="success">开始挖矿</span></h3>
			<input onChange={handleAmount} type="number" value={mintStatus.stakeAmount} className="h3" style={{marginBottom:0}} maxLength={12} />
			<div className="mt-4">
				<button className="w-100 h3 btn btn-success round" onClick={handleStaking}>解锁钱包</button>
			</div>
		</div>
		<div className="mt-3" style={{backgroundColor:'#2e3548', borderRadius: 5, padding: '20px 50px'}}>
			<h3><span className="success">{id}</span>Unstaking</h3>
			<div className="mt-4" style={{display:'flex', justifyContent:'space-between'}}>
				<span className="success">{connected ? N(mintStatus.stakedAmount) : '-'}</span>
			</div>
			<div className="mt-4">
				<button className="w-100 h3 btn btn-warning round" onClick={handleUnstaking}>Submit</button>
			</div>
		</div>
		<div className="mt-3 h3" style={{fontWeight:400}}>
			<div className="mt-3" style={{display:'flex', justifyContent:'space-between'}}>
				<span>年化利率</span>
				<span>{connected ? N(mintStatus.interest) + '%' : '-'}</span>
			</div>
			<div className="mt-3" style={{display:'flex', justifyContent:'space-between'}}>
				<span>倍数</span>
				<span>{connected ? N(mintStatus.multiplier) + 'x' : '-'}</span>
			</div>
			<div className="mt-3" style={{display:'flex', justifyContent:'space-between'}}>
				<span>流动性</span>
				<span>{connected? N(mintStatus.total): '-'}</span>
			</div>
		</div>
	</Layout>;
};

export default MineAct;