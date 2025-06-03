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
  removeError: () => void;
  connectTestAccount: (index: number) => void;
  connectStoredAccount: (accountId: string) => void;
  resetWallets: () => void;
  createNewAccount: () => void;
}

const shortenAddress = (address: string): string => {
  return `${address.slice(0, 10)}...${address.slice(-3)}`;
};

export function Wallet({
  account,
  error,
  testAccounts,
  storedTestAccounts,
  createdAccounts,
  wallet,
  adminAddress,
  creatingAccount,
  removeError,
  connectTestAccount,
  connectStoredAccount,
  resetWallets,
  createNewAccount,
}: WalletProps) {
  const walletConnected = wallet !== null;
  const connectedAccount = account;
  const connectedAccountAddress = connectedAccount?.getAddress().toString();

  return (
    <aside className="sticky top-0 p-4 shrink-0 flex-col lg:flex w-full lg:w-96 bg-white">
      <div className="border-[1px] p-4 h-full flex flex-col rounded-lg gap-1">
        <div className="text-sm text-text-primary flex items-center gap-2">
          <IconCircleFilled
            className={`w-3 ${walletConnected ? 'text-green' : 'text-red'}`}
          />
          <div className="text-text-primary font-bold">
            Wallet {walletConnected ? 'connected' : 'not connected'}
          </div>
        </div>
        <div className="text-sm text-text-primary flex items-center gap-2">
          <IconCircleFilled
            className={`w-3 ${connectedAccount ? 'text-green' : 'text-red'}`}
          />
          <div className="text-text-primary font-bold">
            {connectedAccount
              ? `Account connected: ${shortenAddress(connectedAccountAddress!)}`
              : 'No account connected'}
          </div>
        </div>
        <div className="text-sm text-text-primary flex items-center gap-2 font-bold">
          <IconCircleFilled className={`w-3 text-black`} />
          <div>Admin: {shortenAddress(adminAddress)}</div>
        </div>

        {/*
        Available Test Accounts 
        TODO: Casting votes from test accounts is not working yet
        */}

        {/* <div className="my-3 text-sm text-left border-t-[1px] pt-4">
          <div className="mb-4 font-bold">Test Accounts</div>
          <div className="flex flex-col gap-3">
            {testAccounts.map((testAccount, index) => {
              const accountIsConnected =
                connectedAccountAddress === testAccount.address.toString();
              const alreadyStored = storedTestAccounts.some(
                (stored) => stored.index === index
              );

              return (
                <div
                  key={index}
                  className="text-sm text-left justify-between flex items-center"
                >
                  <div className="text-text-secondary">
                    #{index + 1} -{' '}
                    {shortenAddress(testAccount.address.toString())}
                  </div>

                  {accountIsConnected ? (
                    <div className="text-green font-bold">Connected</div>
                  ) : (
                    <button
                      className="text-text-secondary hover:text-text-primary bg-bg-light hover:bg-bg-medium px-2 py-0.5 rounded-md"
                      onClick={() => connectTestAccount(index)}
                    >
                      {alreadyStored ? 'Reconnect' : 'Connect'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div> */}

        {/* Created Accounts */}
        <div className="my-3 text-sm text-left border-t-[1px] pt-4">
          <div className="mb-4 font-bold">Created Accounts</div>
          <div className="flex flex-col gap-3">
            {createdAccounts
              .sort((a, b) => a.createdAt - b.createdAt) // Sort by creation time, newest first
              .map((storedAccount, index) => {
                const accountIsConnected =
                  connectedAccountAddress === storedAccount.address;

                return (
                  <div
                    key={storedAccount.id}
                    className="text-sm text-left justify-between flex items-center"
                  >
                    <div className="text-text-secondary">
                      #{index + 1} - {shortenAddress(storedAccount.address)}
                    </div>

                    <div className="flex items-center gap-2 h-2">
                      {accountIsConnected ? (
                        <div className="text-green font-bold mr-1">
                          Connected
                        </div>
                      ) : (
                        <button
                          className="text-text-secondary hover:text-text-primary bg-bg-light hover:bg-bg-medium px-4 py-0.5 rounded-md"
                          onClick={() => connectStoredAccount(storedAccount.id)}
                        >
                          Connect
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
          <button
            className={`text-text-secondary w-full hover:text-text-primary bg-bg-light hover:bg-bg-medium px-2 py-2 rounded-md mt-4 ${creatingAccount ? 'opacity-50' : ''}`}
            onClick={() => createNewAccount()}
            disabled={creatingAccount}
          >
            {creatingAccount ? 'Creating account...' : 'Create New Account'}
          </button>
        </div>

        {/* Reset Database Section */}
        {(storedTestAccounts.length > 0 || createdAccounts.length > 0) && (
          <div className="my-4 text-sm text-left border-t-[1px] pt-6">
            <button
              className="text-red w-full hover:text-white bg-red/5 hover:bg-red px-2 py-2 rounded-md border border-red/30 hover:border-red flex items-center justify-center gap-2 transition-colors"
              onClick={resetWallets}
            >
              <IconRefresh className="w-4 h-4" />
              Reset wallets
            </button>
            <div className="text-xs text-text-secondary mt-2">
              This will permanently delete all stored accounts from your
              browser.
            </div>
          </div>
        )}

        {/* Spacer to push error to bottom */}
        <div className="flex-grow" />

        {error && (
          <div className="p-4 bg-red/10 text-sm rounded-md border-[1px] border-red/30 text-red flex items-center gap-2 justify-between">
            <div>
              <b>Error: </b>
              {error}
            </div>
            <IconX
              onClick={removeError}
              className="w-4 h-4 text-red cursor-pointer"
            />
          </div>
        )}
      </div>
    </aside>
  );
}
