import { AccountWallet } from '@aztec/aztec.js';
import { EmbeddedWallet } from '../embedded-wallet';

interface WalletProps {
  account: AccountWallet | null;
  wallet: EmbeddedWallet | null;
}

export function Wallet({ account, wallet }: WalletProps) {
  return (
    <aside className="sticky top-0 w-96 px-4 shrink-0 flex-col lg:flex">
      <div className="border-l-[1px] p-4 h-full flex flex-col">
        <div className="text-sm text-gray-600">
          Wallet status: {wallet ? 'Connected' : 'Not connected'}
        </div>
        <div className="text-sm text-gray-600">
          Account status:{' '}
          {account ? account.getAddress().toString() : 'Account not found'}
        </div>
      </div>
    </aside>
  );
}
