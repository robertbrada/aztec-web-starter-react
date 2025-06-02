import { useState, useEffect } from 'react';
import { EmbeddedWallet } from './embedded-wallet';
import { AccountWallet, AztecAddress, Fr } from '@aztec/aztec.js';
import { EasyPrivateVotingContract } from './artifacts/EasyPrivateVoting';

const aztecNodeUrl = import.meta.env.AZTEC_NODE_URL;
const contractAddress = import.meta.env.CONTRACT_ADDRESS;
const deployerAddress = import.meta.env.DEPLOYER_ADDRESS;
const deploymentSalt = import.meta.env.DEPLOYMENT_SALT;
interface VoteResults {
  [key: number]: bigint;
}

export default function App() {
  const [voteTally, setVoteTally] = useState<VoteResults>({
    1: BigInt(0),
    2: BigInt(0),
    3: BigInt(0),
    4: BigInt(0),
    5: BigInt(0),
  });
  const [isVoting, setIsVoting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [wallet, setWallet] = useState<EmbeddedWallet | null>(null);
  const [account, setAccount] = useState<AccountWallet | null>(null);

  useEffect(() => {
    const loadApp = async () => {
      try {
        setIsLoading(true);
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
        const account = wallet.getConnectedAccount();
        if (account) {
          // TODO: update vote tally
        } else {
          console.log('No account connected');
        }

        setWallet(wallet);
        setAccount(account);
        console.log('App initialized successfully');
      } catch (err) {
        console.error('Failed to initialize app:', err);
        setError(
          err instanceof Error ? err.message : 'Failed to initialize app'
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadApp();
  }, []);

  async function createAccount() {
    console.log('Creating account()');
    if (!wallet) {
      console.error('Wallet not initialized');
      return;
    }
    try {
      const account = await wallet.createAccountAndConnect();
      setAccount(account);
    } catch (error) {
      console.error('Failed to create account:', error);
    }
  }

  async function castVote(candidateId: number) {
    console.log('Casting vote()');
    // Validate candidate number
    setIsVoting(true);
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
      const votingContract = await EasyPrivateVotingContract.at(
        AztecAddress.fromString(contractAddress),
        connectedAccount
      );
      const interaction = votingContract.methods.cast_vote(candidateId);
      await wallet.sendTransaction(interaction);
      await updateVoteTally();
    } catch (error) {
      console.error(error);
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

    setVoteTally(results);
  }

  return (
    <div className="flex flex-col w-96">
      <h1>Private Voting</h1>
      <div>Wallet status: {wallet ? 'Connected' : 'Not connected'}</div>
      <div>
        Account: {account ? account.getAddress().toString() : 'no account'}
      </div>
      <button className="my-2 p-2 bg-gray-300" onClick={createAccount}>
        Create Account
      </button>
      <button className="my-2 p-2 bg-gray-300" onClick={() => castVote(4)}>
        Vote
      </button>
      <button className="my-2 p-2 bg-gray-300" onClick={updateVoteTally}>
        Update tally
      </button>
      <div className="my-2">
        <h2>Vote Tally</h2>
        {Object.entries(voteTally).map(([candidate, votes]) => (
          <div key={candidate}>
            Candidate {candidate}: {votes.toString()} votes
          </div>
        ))}
      </div>
    </div>
  );
}
