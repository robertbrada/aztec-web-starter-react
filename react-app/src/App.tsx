import { useState, useEffect } from 'react';
import { EmbeddedWallet } from './embedded-wallet';
import { AccountWallet, AztecAddress, Fr } from '@aztec/aztec.js';
import { EasyPrivateVotingContract } from './artifacts/EasyPrivateVoting';
import { Tally } from './components/Tally';
import { Wallet } from './components/Wallet';
import {
  aztecNodeUrl,
  contractAddress,
  deployerAddress,
  deploymentSalt,
} from './config';
import type { VoteResults } from './config';

export default function App() {
  const [voteTally, setVoteTally] = useState<VoteResults | null>(null);
  const [isVoting, setIsVoting] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isLoadingTally, setIsLoadingTally] = useState(true);
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wallet, setWallet] = useState<EmbeddedWallet | null>(null);
  const [account, setAccount] = useState<AccountWallet | null>(null);

  useEffect(() => {
    const loadApp = async () => {
      try {
        setIsInitializing(true);
        setError(null);

        // Initialize the wallet
        const wallet = new EmbeddedWallet(aztecNodeUrl);
        await wallet.initialize();
        console.log('Wallet initialized:', wallet);

        // Register voting contract with wallet/PXE
        await wallet.registerContract(
          EasyPrivateVotingContract.artifact,
          AztecAddress.fromString(deployerAddress),
          Fr.fromString(deploymentSalt),
          [AztecAddress.fromString(deployerAddress)]
        );
        console.log('Voting contract registered');

        // Get existing account
        const account = await wallet.connectExistingAccount();

        setWallet(wallet);
        setAccount(account);
        console.log('App initialized successfully');
      } catch (err) {
        console.error('Failed to initialize app:', err);
        setError(
          err instanceof Error ? err.message : 'Failed to initialize app'
        );
      } finally {
        setIsInitializing(false);
      }
    };

    loadApp();
  }, []);

  useEffect(() => {
    if (account && wallet) {
      console.log('Account connected, updating vote tally');
      updateVoteTally();
    }
  }, [account, wallet]);

  async function createAccount() {
    console.log('Creating account()');
    if (!wallet) {
      console.error('Wallet not initialized');
      return;
    }
    try {
      setIsCreatingAccount(true);
      setError(null);
      const account = await wallet.createAccountAndConnect();
      setAccount(account);
    } catch (error) {
      console.error('Failed to create account:', error);
      setError(
        error instanceof Error ? error.message : 'Failed to create account'
      );
    } finally {
      setIsCreatingAccount(false);
    }
  }

  async function vote(candidateId: number) {
    console.log('Casting vote');
    // Validate candidate number
    if (!wallet) {
      console.error('Wallet not initialized');
      return;
    }

    const connectedAccount = wallet.getConnectedAccount();
    if (!connectedAccount) {
      console.error('Cannot update tally. No account connected');
      return;
    }

    console.log(
      `Casting vote for candidate ${candidateId} from account ${connectedAccount.getAddress()}`
    );

    try {
      setIsVoting(true);
      setError(null);
      const votingContract = await EasyPrivateVotingContract.at(
        AztecAddress.fromString(contractAddress),
        connectedAccount
      );
      console.log(
        `Voting contract address: ${votingContract.address.toString()}`
      );
      const interaction = votingContract.methods.cast_vote(candidateId);
      console.log(`Interaction: ${interaction.toString()}`);
      await wallet.sendTransaction(interaction);
      await updateVoteTally();
    } catch (error) {
      console.error(error);
      setError(error instanceof Error ? error.message : 'Failed to cast vote');
    } finally {
      setIsVoting(false);
    }
  }

  async function updateVoteTally() {
    console.log('Updating vote tally()');
    if (!wallet) {
      console.error('Cannot update tally. Wallet not initialized');
      return;
    }

    const connectedAccount = wallet.getConnectedAccount();
    if (!connectedAccount) {
      console.error('Cannot update tally. No account connected');
      return;
    }

    const results: VoteResults = {};

    try {
      setIsLoadingTally(true);

      const votingContract = await EasyPrivateVotingContract.at(
        AztecAddress.fromString(contractAddress),
        connectedAccount
      );

      await Promise.all(
        Array.from({ length: 5 }, async (_, i) => {
          const interaction = votingContract.methods.get_vote(i + 1);
          const value = await wallet.simulateTransaction(interaction);
          results[i + 1] = value;
        })
      );

      console.log('Vote tally results:', results);
      setVoteTally(results);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : 'Failed to update vote tally'
      );
    } finally {
      setIsLoadingTally(false);
    }
  }

  return (
    <div className="flex flex-col-reverse lg:flex-row">
      <Tally
        account={account}
        isCreatingAccount={isCreatingAccount}
        isVoting={isVoting}
        results={voteTally}
        createAccount={createAccount}
        vote={vote}
        loadingPage={isInitializing || isLoadingTally}
      />
      {/* <Wallet account={account} wallet={wallet} error={error} /> */}
      <Wallet
        account={account}
        wallet={wallet}
        error={error}
        removeError={() => setError(null)}
      />
    </div>
  );
}
