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

interface AppState {
  voteTally: VoteResults | null;
  isVoting: boolean;
  isInitializing: boolean;
  isLoadingTally: boolean;
  isCreatingAccount: boolean;
  isEndingVoting: boolean;
  error: string | null;
  wallet: EmbeddedWallet | null;
  account: AccountWallet | null;
  testAccounts: InitialAccountData[];
  voteRecord: Record<string, boolean>;
  storedTestAccounts: StoredAccount[];
  storedCreatedAccounts: StoredAccount[];
}

const INITIAL_STATE: AppState = {
  voteTally: null,
  isVoting: false,
  isInitializing: false,
  isLoadingTally: false,
  isCreatingAccount: false,
  isEndingVoting: false,
  error: null,
  wallet: null,
  account: null,
  testAccounts: [],
  voteRecord: {},
  storedTestAccounts: [],
  storedCreatedAccounts: [],
};

export default function App() {
  const [state, setState] = useState<AppState>(INITIAL_STATE);

  function updateState(updates: Partial<AppState>) {
    setState((prev) => ({ ...prev, ...updates }));
  }

  function setError(error: string | null) {
    updateState({ error });
  }

  async function refreshStoredAccounts() {
    if (!state.wallet) return;

    try {
      const [storedTestAccounts, storedCreatedAccounts] = await Promise.all([
        state.wallet.getStoredTestAccounts(),
        state.wallet.getStoredCreatedAccounts(),
      ]);

      // Create new arrays to ensure React detects the change
      updateState({
        storedTestAccounts: [...storedTestAccounts],
        storedCreatedAccounts: [...storedCreatedAccounts],
      });
    } catch (error) {
      console.error('Failed to refresh stored accounts:', error);
    }
  }

  async function updateVoteTally() {
    console.log('Updating vote tally...');

    if (!state.wallet) {
      console.error('Cannot update tally. Wallet not initialized');
      return;
    }

    const connectedAccount = state.wallet.getConnectedAccount();
    if (!connectedAccount) {
      console.error('Cannot update tally. No account connected');
      return;
    }

    try {
      updateState({ isLoadingTally: true });

      const votingContract = await EasyPrivateVotingContract.at(
        AztecAddress.fromString(contractAddress),
        connectedAccount
      );

      const results: VoteResults = {};
      await Promise.all(
        Array.from({ length: 5 }, async (_, i) => {
          const candidateId = i + 1;
          const interaction = votingContract.methods.get_vote(candidateId);
          const value = await state.wallet!.simulateTransaction(interaction);
          results[candidateId] = value;
        })
      );

      console.log('Vote tally results:', results);
      updateState({ voteTally: results });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to update vote tally';
      setError(errorMessage);
    } finally {
      updateState({ isLoadingTally: false });
    }
  }

  // Initialize app
  useEffect(() => {
    async function initializeApp() {
      try {
        updateState({ isInitializing: true, error: null });

        // Initialize wallet
        const wallet = new EmbeddedWallet(aztecNodeUrl);
        await wallet.initialize();
        console.log('Wallet initialized:', wallet);

        // Load test accounts
        const testAccounts = await getInitialTestAccounts();
        console.log('Test accounts loaded:', testAccounts);

        // Register voting contract
        await wallet.registerContract(
          EasyPrivateVotingContract.artifact,
          AztecAddress.fromString(deployerAddress),
          Fr.fromString(deploymentSalt),
          [AztecAddress.fromString(deployerAddress)]
        );
        console.log('Voting contract registered');

        // Connect existing account if available
        const account = await wallet.connectExistingAccount();

        const [storedTestAccounts, storedCreatedAccounts] = await Promise.all([
          wallet.getStoredTestAccounts(),
          wallet.getStoredCreatedAccounts(),
        ]);

        updateState({
          wallet,
          account,
          testAccounts: [...testAccounts], // Ensure new array reference
          storedTestAccounts: [...storedTestAccounts],
          storedCreatedAccounts: [...storedCreatedAccounts],
        });

        console.log('App initialized successfully');
      } catch (err) {
        console.error('Failed to initialize app:', err);
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to initialize app';
        setError(errorMessage);
      } finally {
        updateState({ isInitializing: false });
      }
    }

    initializeApp();
  }, []);

  // Update tally when account connects
  useEffect(() => {
    if (state.account && !state.voteTally) {
      console.log('Account connected, updating vote tally');
      updateVoteTally();
    }
  }, [state.account, state.voteTally]);

  async function createAccount() {
    console.log('Creating account...');

    if (!state.wallet) {
      console.error('Wallet not initialized');
      return;
    }

    try {
      updateState({ isCreatingAccount: true, error: null });
      const account = await state.wallet.createAccountAndConnect();
      updateState({ account });
      await refreshStoredAccounts();
    } catch (error) {
      console.error('Failed to create account:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to create account';
      setError(errorMessage);
    } finally {
      updateState({ isCreatingAccount: false });
    }
  }

  async function connectTestAccount(index: number) {
    if (!state.wallet) {
      console.error('Wallet not initialized');
      return;
    }

    try {
      setError(null);
      const account = await state.wallet.connectTestAccount(index);
      updateState({ account });
      await refreshStoredAccounts();
    } catch (error) {
      console.error('Failed to connect test account:', error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Failed to connect test account';
      setError(errorMessage);
    }
  }

  async function connectStoredAccount(accountId: string) {
    if (!state.wallet) {
      console.error('Wallet not initialized');
      return;
    }

    try {
      setError(null);
      const account = await state.wallet.connectStoredAccount(accountId);
      updateState({ account });
    } catch (error) {
      console.error('Failed to connect stored account:', error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Failed to connect stored account';
      setError(errorMessage);
    }
  }

  async function resetWallets() {
    if (!state.wallet) {
      console.error('Wallet not initialized');
      return;
    }

    try {
      setError(null);
      await state.wallet.resetStoredData();

      updateState({
        account: null,
        storedTestAccounts: [],
        storedCreatedAccounts: [],
      });

      console.log('All stored data has been reset');
    } catch (error) {
      console.error('Failed to reset stored data:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to reset stored data';
      setError(errorMessage);
    }
  }

  async function vote(candidateId: number) {
    if (!state.wallet) {
      console.error('Wallet not initialized');
      return;
    }

    const connectedAccount = state.wallet.getConnectedAccount();
    if (!connectedAccount) {
      console.error('Cannot vote. No account connected');
      return;
    }

    try {
      updateState({ isVoting: true, error: null });

      const votingContract = await EasyPrivateVotingContract.at(
        AztecAddress.fromString(contractAddress),
        connectedAccount
      );

      const interaction = votingContract.methods.cast_vote(candidateId);
      await state.wallet.sendTransaction(interaction);

      await updateVoteTally();

      // Mark account as voted - create new object to ensure React updates
      const newVoteRecord = {
        ...state.voteRecord,
        [connectedAccount.getAddress().toString()]: true,
      };

      updateState({
        voteRecord: newVoteRecord,
      });
    } catch (error) {
      console.error('Vote failed:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to cast vote';
      setError(errorMessage);
    } finally {
      updateState({ isVoting: false });
    }
  }

  async function endVoting() {
    if (!state.wallet) {
      console.error('Wallet not initialized');
      return;
    }

    const connectedAccount = state.wallet.getConnectedAccount();
    if (!connectedAccount) {
      console.error('Cannot end vote. No account connected');
      return;
    }

    try {
      updateState({ isEndingVoting: true, error: null });

      const votingContract = await EasyPrivateVotingContract.at(
        AztecAddress.fromString(contractAddress),
        connectedAccount
      );

      const interaction = votingContract.methods.end_vote();
      await state.wallet.sendTransaction(interaction);

      await updateVoteTally();
    } catch (error) {
      console.error('Failed to end voting:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to end voting';
      setError(errorMessage);
    } finally {
      updateState({ isEndingVoting: false });
    }
  }

  function removeError() {
    setError(null);
  }

  return (
    <div className="flex flex-col-reverse lg:flex-row">
      <Tally
        account={state.account}
        isCreatingAccount={state.isCreatingAccount}
        isVoting={state.isVoting}
        results={state.voteTally}
        loadingPage={state.isInitializing || state.isLoadingTally}
        createAccount={createAccount}
        vote={vote}
      />
      <Wallet
        account={state.account}
        adminAddress={deployerAddress}
        wallet={state.wallet}
        error={state.error}
        testAccounts={state.testAccounts}
        createdAccounts={state.storedCreatedAccounts}
        creatingAccount={state.isCreatingAccount}
        storedTestAccounts={state.storedTestAccounts}
        endingVoting={state.isEndingVoting}
        voteRecord={state.voteRecord}
        removeError={removeError}
        createNewAccount={createAccount}
        connectTestAccount={connectTestAccount}
        connectStoredAccount={connectStoredAccount}
        resetWallets={resetWallets}
        endVoting={endVoting}
      />
    </div>
  );
}
