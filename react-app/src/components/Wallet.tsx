import { AccountWallet } from '@aztec/aztec.js';
import { EmbeddedWallet } from '../embedded-wallet';
import { IconCircleFilled, IconX, IconRefresh } from '@tabler/icons-react';
import type { InitialAccountData } from '@aztec/accounts/testing';
import type { StoredAccount } from '../indexeddb-storage';

interface WalletProps {
  account: AccountWallet | null;
  wallet: EmbeddedWallet | null;
  error: string | null;
  testAccounts: InitialAccountData[];
  storedTestAccounts: StoredAccount[];
  createdAccounts: StoredAccount[];
  adminAddress: string;
  creatingAccount: boolean;
  endingVoting: boolean;
  voteRecord: Record<string, boolean>;
  removeError: () => void;
  connectTestAccount: (index: number) => void; // currently not used as there is an issue with casting votes from test accounts
  connectStoredAccount: (accountId: string) => void;
  resetWallets: () => void;
  createNewAccount: () => void;
  endVoting: () => void;
}

function shortenAddress(address: string): string {
  return `${address.slice(0, 10)}...${address.slice(-3)}`;
}

function StatusIndicator({
  isConnected,
  label,
}: {
  isConnected: boolean;
  label: string;
}) {
  return (
    <div className="text-sm text-text-primary flex items-center gap-2">
      <IconCircleFilled
        className={`w-3 ${isConnected ? 'text-green' : 'text-red'}`}
      />
      <div className="text-text-primary font-bold">{label}</div>
    </div>
  );
}

function AdminControls({
  isAdminConnected,
  endingVoting,
  onEndVoting,
}: {
  isAdminConnected: boolean;
  endingVoting: boolean;
  onEndVoting: () => void;
}) {
  if (!isAdminConnected) return null;

  return (
    <button
      className="mt-2 text-sm text-primary w-full hover:text-white bg-primary/5 hover:bg-primary px-2 py-2 rounded-md border border-primary/30 hover:border-primary flex items-center justify-center gap-2 transition-colors"
      onClick={onEndVoting}
      disabled={endingVoting}
    >
      {endingVoting ? 'Ending voting...' : 'End Voting'}
    </button>
  );
}

function AccountItem({
  account,
  index,
  isConnected,
  hasVoted,
  onConnect,
}: {
  account: StoredAccount;
  index: number;
  isConnected: boolean;
  hasVoted: boolean;
  onConnect: () => void;
}) {
  return (
    <div className="text-sm text-left justify-between flex items-center">
      <div className="text-text-secondary flex items-center gap-2">
        <span>
          #{index + 1} - {shortenAddress(account.address)}
        </span>
        {/* This is just a UI helper ot see who has voted. This doesn't reflect actual on-chain state because the state resets when the app is reloaded */}
        {hasVoted && <span className="text-xs text-text-tertiary">(voted)</span>}
      </div>

      <div className="flex items-center gap-2 h-2 text-center">
        {isConnected ? (
          <div className="text-green font-bold w-24">Connected</div>
        ) : (
          <button
            className="text-text-secondary/90 hover:text-text-primary bg-bg-light hover:bg-bg-medium py-0.5 rounded-md w-24"
            onClick={onConnect}
          >
            Connect
          </button>
        )}
      </div>
    </div>
  );
}

function CreatedAccountsSection({
  accounts,
  connectedAddress,
  voteRecord,
  creatingAccount,
  onConnectAccount,
  onCreateAccount,
}: {
  accounts: StoredAccount[];
  connectedAddress: string | undefined;
  voteRecord: Record<string, boolean>;
  creatingAccount: boolean;
  onConnectAccount: (accountId: string) => void;
  onCreateAccount: () => void;
}) {
  const sortedAccounts = accounts.sort((a, b) => a.createdAt - b.createdAt);

  return (
    <div className="my-3 text-sm text-left border-t-[1px] pt-4">
      <div className="mb-4 font-bold">Created Accounts</div>

      <div className="flex flex-col gap-3">
        {sortedAccounts.map((account, index) => (
          <AccountItem
            key={account.id}
            account={account}
            index={index}
            isConnected={connectedAddress === account.address}
            hasVoted={voteRecord[account.address] === true}
            onConnect={() => onConnectAccount(account.id)}
          />
        ))}
      </div>

      <button
        className={`text-text-secondary w-full hover:text-text-primary bg-bg-light hover:bg-bg-medium border border-border px-2 py-2 rounded-md mt-4 transition-colors ${
          creatingAccount ? 'opacity-50' : ''
        }`}
        onClick={onCreateAccount}
        disabled={creatingAccount}
      >
        {creatingAccount ? 'Creating account...' : 'Create New Account'}
      </button>
    </div>
  );
}

function ResetSection({
  hasStoredAccounts,
  onReset,
}: {
  hasStoredAccounts: boolean;
  onReset: () => void;
}) {
  if (!hasStoredAccounts) return null;

  return (
    <div className="my-4 text-sm text-left border-t-[1px] pt-6">
      <button
        className="text-primary w-full hover:text-white bg-primary/5 hover:bg-primary px-2 py-2 rounded-md border border-primary/30 hover:border-primary flex items-center justify-center gap-2 transition-colors"
        onClick={onReset}
      >
        <IconRefresh className="w-4 h-4" />
        Reset wallets
      </button>
      <div className="text-xs text-text-secondary mt-2">
        This will permanently delete all stored accounts from your browser.
      </div>
    </div>
  );
}

function ErrorDisplay({
  error,
  onDismiss,
}: {
  error: string;
  onDismiss: () => void;
}) {
  return (
    <div className="p-4 bg-red/10 text-sm rounded-md border-[1px] border-red/30 text-red flex items-center gap-2 justify-between">
      <div>
        <b>Error: </b>
        {error}
      </div>
      <IconX onClick={onDismiss} className="w-4 h-4 text-red cursor-pointer" />
    </div>
  );
}

export function Wallet({
  account,
  error,
  testAccounts,
  storedTestAccounts,
  createdAccounts,
  wallet,
  adminAddress,
  creatingAccount,
  endingVoting,
  voteRecord,
  removeError,
  connectTestAccount,
  connectStoredAccount,
  resetWallets,
  createNewAccount,
  endVoting,
}: WalletProps) {
  const walletConnected = wallet !== null;
  const connectedAddress = account?.getAddress().toString();
  const isAdminConnected = adminAddress === connectedAddress;
  const hasStoredAccounts =
    storedTestAccounts.length > 0 || createdAccounts.length > 0;

  return (
    <aside className="sticky top-0 p-4 shrink-0 flex-col lg:flex w-full lg:w-[26rem] bg-white">
      <div className="border-[1px] p-4 h-full flex flex-col rounded-lg gap-1">
        <StatusIndicator
          isConnected={walletConnected}
          label={`Wallet ${walletConnected ? 'connected' : 'not connected'}`}
        />

        <StatusIndicator
          isConnected={!!account}
          label={
            account
              ? `Account connected: ${shortenAddress(connectedAddress!)}`
              : 'No account connected'
          }
        />

        <div className="text-sm text-text-primary flex items-center gap-2 font-bold">
          <IconCircleFilled
            className={`w-3 ${isAdminConnected ? 'text-green' : 'text-black'}`}
          />
          <div>Admin: {shortenAddress(adminAddress)}</div>
        </div>

        <AdminControls
          isAdminConnected={isAdminConnected}
          endingVoting={endingVoting}
          onEndVoting={endVoting}
        />

        <CreatedAccountsSection
          accounts={createdAccounts}
          connectedAddress={connectedAddress}
          voteRecord={voteRecord}
          creatingAccount={creatingAccount}
          onConnectAccount={connectStoredAccount}
          onCreateAccount={createNewAccount}
        />

        <ResetSection
          hasStoredAccounts={hasStoredAccounts}
          onReset={resetWallets}
        />

        {/* Spacer to push error to bottom */}
        <div className="flex-grow" />

        {error && <ErrorDisplay error={error} onDismiss={removeError} />}
      </div>
    </aside>
  );
}
