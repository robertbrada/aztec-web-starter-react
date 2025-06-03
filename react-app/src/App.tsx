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
import {
  getInitialTestAccounts,
  type InitialAccountData,
} from '@aztec/accounts/testing';
import { type StoredAccount } from './indexeddb-storage';

export default function App() {
  const [voteTally, setVoteTally] = useState<VoteResults | null>(null);
  const [isVoting, setIsVoting] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isLoadingTally, setIsLoadingTally] = useState(false);
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wallet, setWallet] = useState<EmbeddedWallet | null>(null);
  const [account, setAccount] = useState<AccountWallet | null>(null);
  const [testAccounts, setTestAccounts] = useState<InitialAccountData[]>([]);
  const [storedTestAccounts, setStoredTestAccounts] = useState<StoredAccount[]>(
    []
  );
  const [storedCreatedAccounts, setStoredCreatedAccounts] = useState<
    StoredAccount[]
  >([]);

  useEffect(() => {
    const loadApp = async () => {
      try {
        setIsInitializing(true);
        setError(null);

        // Initialize the wallet
        const wallet = new EmbeddedWallet(aztecNodeUrl);
        await wallet.initialize();
        console.log('Wallet initialized:', wallet);

        const testAccounts = await getInitialTestAccounts();
        console.log('Test accounts loaded:', testAccounts);

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

        // Load stored accounts from IndexedDB
        const storedTestAccounts = await wallet.getStoredTestAccounts();
        const storedCreatedAccounts = await wallet.getStoredCreatedAccounts();

        setWallet(wallet);
        setAccount(account);
        setTestAccounts(testAccounts);
        setStoredTestAccounts(storedTestAccounts);
        setStoredCreatedAccounts(storedCreatedAccounts);
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
    if (account && !voteTally) {
      console.log('Account connected, updating vote tally');
      updateVoteTally();
    }
  }, [account]);

  const refreshStoredAccounts = async () => {
    if (!wallet) return;

    try {
      const storedTestAccounts = await wallet.getStoredTestAccounts();
      const storedCreatedAccounts = await wallet.getStoredCreatedAccounts();
      setStoredTestAccounts(storedTestAccounts);
      setStoredCreatedAccounts(storedCreatedAccounts);
    } catch (error) {
      console.error('Failed to refresh stored accounts:', error);
    }
  };

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
      await refreshStoredAccounts();
    } catch (error) {
      console.error('Failed to create account:', error);
      setError(
        error instanceof Error ? error.message : 'Failed to create account'
      );
    } finally {
      setIsCreatingAccount(false);
    }
  }

  async function connectTestAccount(index: number) {
    if (!wallet) {
      console.error('Wallet not initialized');
      return;
    }

    try {
      setError(null);
      const account = await wallet.connectTestAccount(index);
      setAccount(account);
      await refreshStoredAccounts();
    } catch (error) {
      console.error('Failed to connect test account:', error);
      setError(
        error instanceof Error
          ? error.message
          : 'Failed to connect test account'
      );
    }
  }

  async function connectStoredAccount(accountId: string) {
    if (!wallet) {
      console.error('Wallet not initialized');
      return;
    }

    try {
      setError(null);
      const account = await wallet.connectStoredAccount(accountId);
      setAccount(account);
    } catch (error) {
      console.error('Failed to connect stored account:', error);
      setError(
        error instanceof Error
          ? error.message
          : 'Failed to connect stored account'
      );
    }
  }

  async function resetWallets() {
    if (!wallet) {
      console.error('Wallet not initialized');
      return;
    }

    try {
      setError(null);
      await wallet.resetStoredData();

      // Clear all local state
      setAccount(null);
      setStoredTestAccounts([]);
      setStoredCreatedAccounts([]);

      console.log('All stored data has been reset');
    } catch (error) {
      console.error('Failed to reset stored data:', error);
      setError(
        error instanceof Error ? error.message : 'Failed to reset stored data'
      );
    }
  }

  async function vote(candidateId: number) {
    if (!wallet) {
      console.error('Wallet not initialized');
      return;
    }

    const connectedAccount = wallet.getConnectedAccount();
    if (!connectedAccount) {
      console.error('Cannot update tally. No account connected');
      return;
    }

    try {
      setIsVoting(true);
      setError(null);
      const votingContract = await EasyPrivateVotingContract.at(
        AztecAddress.fromString(contractAddress),
        connectedAccount
      );
      const interaction = votingContract.methods.cast_vote(candidateId);
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
      <Wallet
        account={account}
        adminAddress={deployerAddress}
        wallet={wallet}
        error={error}
        testAccounts={testAccounts}
        createdAccounts={storedCreatedAccounts}
        creatingAccount={isCreatingAccount}
        storedTestAccounts={storedTestAccounts}
        removeError={() => setError(null)}
        createNewAccount={createAccount}
        connectTestAccount={connectTestAccount}
        connectStoredAccount={connectStoredAccount}
        resetWallets={resetWallets}
      />
    </div>
  );
}
