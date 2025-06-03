import { AccountWallet } from '@aztec/aztec.js';
import { EmbeddedWallet } from '../embedded-wallet';
import { IconCircleFilled, IconX } from '@tabler/icons-react';
import type { InitialAccountData } from '@aztec/accounts/testing';

interface WalletProps {
  account: AccountWallet | null;
  wallet: EmbeddedWallet | null;
  error: string | null;
  testAccounts: InitialAccountData[];
  createdAccounts: AccountWallet[];
  adminAddress: string;
  removeError: () => void;
  connectTestAccount: (index: number) => void;
  createNewAccount: () => void;
}

const shortenAddress = (address: string): string => {
  return `${address.slice(0, 10)}...${address.slice(-3)}`;
};

export function Wallet({
  account,
  error,
  testAccounts,
  createdAccounts,
  wallet,
  adminAddress,
  removeError,
  connectTestAccount,
  createNewAccount,
}: WalletProps) {
  const walletConnected = wallet !== null;
  const connectedAccount = account;
  // console.log('Connected account:', connectedAccount);

  return (
    <aside className="sticky top-0 p-4 shrink-0 flex-col lg:flex w-full lg:w-96 bg-white">
      <div className="border-[1px] p-4 h-full flex flex-col rounded-lg gap-2">
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
              ? `Account connected: ${shortenAddress(connectedAccount.getAddress().toString())}`
              : 'No account connected'}
          </div>
        </div>
        <div className="text-sm text-text-primary flex items-center gap-2 font-bold">
          <IconCircleFilled className={`w-3 text-black`} />
          <div>Admin: {shortenAddress(adminAddress)}</div>
        </div>

        <div className="my-4 text-sm text-left border-t-[1px] pt-6">
          <div className="mb-4 font-bold">Test Accounts</div>
          <div className="flex flex-col gap-4">
            {testAccounts.map((testAccount, index) => {
              const accountIsConnected =
                connectedAccount &&
                connectedAccount.getAddress().equals(testAccount.address);

              return (
                <div
                  key={index}
                  className="text-sm text-left justify-between flex items-center"
                >
                  <div className="text-text-secondary">Test #{index + 1}:</div>
                  <div className="text-text-secondary">
                    {shortenAddress(testAccount.address.toString())}
                  </div>
                  {accountIsConnected ? (
                    <div className="text-green font-bold">Connected</div>
                  ) : (
                    <button
                      className=" text-text-secondary hover:text-text-primary bg-bg-light hover:bg-bg-medium px-2 py-0.5 rounded-md"
                      onClick={() => connectTestAccount(index)}
                    >
                      Connect
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="my-4 text-sm text-left border-t-[1px] pt-6">
          <div className="mb-4 font-bold">Created Accounts</div>
          <div className="flex flex-col gap-4">
            {createdAccounts.map((account, index) => {
              const accountAddress = account.getAddress();
              const accountIsConnected =
                connectedAccount &&
                connectedAccount.getAddress().equals(accountAddress);

              return (
                <div
                  key={index}
                  className="text-sm text-left justify-between flex items-center"
                >
                  <div className="text-text-secondary">
                    Account #{index + 1}:
                  </div>
                  <div className="text-text-secondary">
                    {shortenAddress(accountAddress.toString())}
                  </div>
                  {accountIsConnected ? (
                    <div className="text-green font-bold">Connected</div>
                  ) : (
                    <button
                      className=" text-text-secondary hover:text-text-primary hover:bg-bg-medium px-2 py-0.5 rounded-md"
                      onClick={() => connectTestAccount(index)}
                    >
                      Connect
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          <button
            className=" text-text-secondary w-full hover:text-text-primary bg-bg-light hover:bg-bg-medium px-2 py-0.5 rounded-md"
            onClick={() => createNewAccount()}
          >
            Create new account
          </button>
        </div>

        {/* Spacer to push error to bottom */}
        <div className="flex-grow"></div>

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
