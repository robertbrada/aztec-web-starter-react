import { AccountWallet } from '@aztec/aztec.js';
import { EmbeddedWallet } from '../embedded-wallet';
import { IconCircleFilled, IconX } from '@tabler/icons-react';

interface WalletProps {
  account: AccountWallet | null;
  wallet: EmbeddedWallet | null;
  error: string | null;
  removeError: () => void;
}

const shortenAddress = (address: string): string => {
  if (address.length <= 13) return address; // Return as-is if too short
  return `${address.slice(0, 12)}...${address.slice(-3)}`;
};

export function Wallet({ account, error, wallet, removeError }: WalletProps) {
  const walletConnected = wallet !== null;
  const accountConnected = account !== null;

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
            className={`w-3 ${accountConnected ? 'text-green' : 'text-red'}`}
          />
          <div className="text-text-primary font-bold">
            {accountConnected
              ? `Account connected: ${shortenAddress(account.getAddress().toString())}`
              : 'No account connected'}
          </div>
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
