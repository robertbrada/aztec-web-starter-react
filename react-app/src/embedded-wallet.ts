import {
  Fr,
  createLogger,
  createAztecNodeClient,
  AztecAddress,
  getContractInstanceFromDeployParams,
  ContractFunctionInteraction,
  SponsoredFeePaymentMethod,
  type PXE,
  AccountWallet,
  Fq,
} from '@aztec/aztec.js';
import { SponsoredFPCContractArtifact } from '@aztec/noir-contracts.js/SponsoredFPC';
import { SPONSORED_FPC_SALT } from '@aztec/constants';
import { randomBytes } from '@aztec/foundation/crypto';
import { getEcdsaRAccount } from '@aztec/accounts/ecdsa/lazy';
import { getSchnorrAccount } from '@aztec/accounts/schnorr/lazy';
import { getPXEServiceConfig } from '@aztec/pxe/config';
import { createPXEService } from '@aztec/pxe/client/lazy';
import {
  type ContractArtifact,
  getDefaultInitializer,
} from '@aztec/stdlib/abi';
import { getInitialTestAccounts } from '@aztec/accounts/testing';
import { indexedDBStorage, type StoredAccount } from './indexeddb-storage';

const PROVER_ENABLED = true;

const logger = createLogger('wallet');

// This is a minimal implementation of an Aztec wallet, that saves the private keys in IndexedDB.
// This does not implement `@aztec.js/Wallet` interface though
// This is not meant for production use
export class EmbeddedWallet {
  private pxe!: PXE;
  d;
  connectedAccount: AccountWallet | null = null;

  private nodeUrl: string;

  constructor(nodeUrl: string) {
    this.nodeUrl = nodeUrl;
  }

  async initialize() {
    await indexedDBStorage.initialize();

    // Create Aztec Node Client
    const aztecNode = await createAztecNodeClient(this.nodeUrl);

    // Create PXE Service
    const config = getPXEServiceConfig();
    config.l1Contracts = await aztecNode.getL1ContractAddresses();
    config.proverEnabled = PROVER_ENABLED;
    this.pxe = await createPXEService(aztecNode, config);

    // Register Sponsored FPC Contract with PXE
    await this.pxe.registerContract({
      instance: await this.#getSponsoredPFCContract(),
      artifact: SponsoredFPCContractArtifact,
    });

    // Log the Node Info
    const nodeInfo = await this.pxe.getNodeInfo();
    logger.info('PXE Connected to node', nodeInfo);
  }

  // Internal method to use the Sponsored FPC Contract for fee payment
  async #getSponsoredPFCContract() {
    const instance = await getContractInstanceFromDeployParams(
      SponsoredFPCContractArtifact,
      {
        salt: new Fr(SPONSORED_FPC_SALT),
      }
    );

    return instance;
  }

  getConnectedAccount() {
    if (!this.connectedAccount) {
      return null;
    }
    return this.connectedAccount;
  }

  async connectTestAccount(index: number) {
    const testAccounts = await getInitialTestAccounts();
    const account = testAccounts[index];

    // Store test account in IndexedDB if not already stored (for future reconnections)
    const accountId = `test_${index}`;
    const existingAccount = await indexedDBStorage.getAccount(accountId);

    if (!existingAccount) {
      // Convert signing key to hex string for storage
      let signingKeyHex: string;
      if (
        account.signingKey instanceof Uint8Array ||
        Buffer.isBuffer(account.signingKey)
      ) {
        signingKeyHex = Buffer.from(account.signingKey).toString('hex');
      } else if (typeof account.signingKey === 'string') {
        signingKeyHex = account.signingKey;
      } else {
        // Fallback: convert to string and then to hex
        signingKeyHex = Buffer.from(String(account.signingKey)).toString('hex');
      }

      const storedAccount: StoredAccount = {
        id: accountId,
        address: account.address.toString(),
        signingKey: signingKeyHex,
        secretKey: account.secret.toString(),
        salt: account.salt.toString(),
        type: 'test',
        index: index,
        createdAt: Date.now(),
      };
      await indexedDBStorage.storeAccount(storedAccount);
    }

    // Use the original account data for connection (this was working before)
    const schnorrAccount = await getSchnorrAccount(
      this.pxe,
      account.secret,
      account.signingKey,
      account.salt
    );

    await schnorrAccount.register();
    const wallet = await schnorrAccount.getWallet();

    this.connectedAccount = wallet;
    await indexedDBStorage.setCurrentAccount(accountId);
    return wallet;
  }

  // Create a new account
  async createAccountAndConnect() {
    if (!this.pxe) {
      throw new Error('PXE not initialized');
    }

    // Generate a random salt, secret key, and signing key
    const salt = Fr.random();
    const secretKey = Fr.random();
    const signingKey = randomBytes(32);

    // Create an ECDSA account
    const ecdsaAccount = await getEcdsaRAccount(
      this.pxe,
      secretKey,
      signingKey,
      salt
    );

    // Deploy the account
    const deployMethod = await ecdsaAccount.getDeployMethod();
    const sponsoredPFCContract = await this.#getSponsoredPFCContract();
    const deployOpts = {
      contractAddressSalt: Fr.fromString(ecdsaAccount.salt.toString()),
      fee: {
        paymentMethod: await ecdsaAccount.getSelfPaymentMethod(
          new SponsoredFeePaymentMethod(sponsoredPFCContract.address)
        ),
      },
      universalDeploy: true,
      skipClassRegistration: true,
      skipPublicDeployment: true,
    };

    const provenInteraction = await deployMethod.prove(deployOpts);
    const receipt = await provenInteraction.send().wait({ timeout: 120 });

    logger.info('Account deployed', receipt);

    // Store the account in IndexedDB
    const ecdsaWallet = await ecdsaAccount.getWallet();
    const accountId = `created_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const signingKeyHex = Buffer.from(signingKey).toString('hex');

    const storedAccount: StoredAccount = {
      id: accountId,
      address: ecdsaWallet.getAddress().toString(),
      signingKey: signingKeyHex,
      secretKey: secretKey.toString(),
      salt: salt.toString(),
      type: 'created',
      createdAt: Date.now(),
    };

    await indexedDBStorage.storeAccount(storedAccount);
    await indexedDBStorage.setCurrentAccount(accountId);

    // Register the account with PXE
    await ecdsaAccount.register();
    this.connectedAccount = ecdsaWallet;

    return ecdsaWallet;
  }

  async connectExistingAccount() {
    // Get current account from IndexedDB
    const currentAccountId = await indexedDBStorage.getCurrentAccount();
    if (!currentAccountId) {
      return null;
    }

    const storedAccount = await indexedDBStorage.getAccount(currentAccountId);
    if (!storedAccount) {
      return null;
    }

    try {
      let wallet: AccountWallet;

      if (storedAccount.type === 'test') {
        // For test accounts, use Schnorr account
        const signingKeyBuffer = Buffer.from(storedAccount.signingKey, 'hex');
        const secretKey = Fr.fromString(storedAccount.secretKey);
        const salt = Fr.fromString(storedAccount.salt);
        const signingKey = Fq.fromBuffer(signingKeyBuffer);

        const schnorrAccount = await getSchnorrAccount(
          this.pxe,
          secretKey,
          signingKey,
          salt
        );

        // Try to register, but catch if already registered
        try {
          await schnorrAccount.register();
        } catch (error) {
          console.log('Account may already be registered:', error);
        }
        wallet = await schnorrAccount.getWallet();
      } else {
        // For created accounts, use ECDSA account
        const signingKeyBuffer = Buffer.from(storedAccount.signingKey, 'hex');
        const secretKey = Fr.fromString(storedAccount.secretKey);
        const salt = Fr.fromString(storedAccount.salt);

        const ecdsaAccount = await getEcdsaRAccount(
          this.pxe,
          secretKey,
          signingKeyBuffer,
          salt
        );

        // Try to register, but catch if already registered
        try {
          await ecdsaAccount.register();
        } catch (error) {
          console.log('Account may already be registered:', error);
        }
        wallet = await ecdsaAccount.getWallet();
      }

      this.connectedAccount = wallet;
      return wallet;
    } catch (error) {
      console.error('Error connecting existing account:', error);
      // Clear the current account if there's an issue
      await indexedDBStorage.setCurrentAccount(null);
      return null;
    }
  }

  // Get all stored test accounts
  async getStoredTestAccounts(): Promise<StoredAccount[]> {
    return await indexedDBStorage.getAccountsByType('test');
  }

  // Get all stored created accounts
  async getStoredCreatedAccounts(): Promise<StoredAccount[]> {
    return await indexedDBStorage.getAccountsByType('created');
  }

  // Connect to a specific stored account
  async connectStoredAccount(accountId: string): Promise<AccountWallet> {
    const storedAccount = await indexedDBStorage.getAccount(accountId);
    if (!storedAccount) {
      throw new Error(`Account with ID ${accountId} not found`);
    }

    let wallet: AccountWallet;

    try {
      if (storedAccount.type === 'test') {
        // For test accounts, use Schnorr account
        const signingKeyBuffer = Buffer.from(storedAccount.signingKey, 'hex');
        const secretKey = Fr.fromString(storedAccount.secretKey);
        const salt = Fr.fromString(storedAccount.salt);
        const signingKey = Fq.fromBuffer(signingKeyBuffer);

        const schnorrAccount = await getSchnorrAccount(
          this.pxe,
          secretKey,
          signingKey,
          salt
        );

        // Try to register, but catch if already registered
        try {
          await schnorrAccount.register();
        } catch (error) {
          console.log('Account may already be registered:', error);
        }
        wallet = await schnorrAccount.getWallet();
      } else {
        // For created accounts, use ECDSA account
        const signingKeyBuffer = Buffer.from(storedAccount.signingKey, 'hex');
        const secretKey = Fr.fromString(storedAccount.secretKey);
        const salt = Fr.fromString(storedAccount.salt);

        const ecdsaAccount = await getEcdsaRAccount(
          this.pxe,
          secretKey,
          signingKeyBuffer,
          salt
        );

        // Try to register, but catch if already registered
        try {
          await ecdsaAccount.register();
        } catch (error) {
          console.log('Account may already be registered:', error);
        }
        wallet = await ecdsaAccount.getWallet();
      }

      this.connectedAccount = wallet;
      await indexedDBStorage.setCurrentAccount(accountId);
      return wallet;
    } catch (error) {
      console.error('Error connecting stored account:', error);
      throw error;
    }
  }

  // Delete a stored account
  async deleteStoredAccount(accountId: string): Promise<void> {
    await indexedDBStorage.deleteAccount(accountId);

    // If this was the current account, clear the current account setting
    const currentAccountId = await indexedDBStorage.getCurrentAccount();
    if (currentAccountId === accountId) {
      await indexedDBStorage.setCurrentAccount(null);
      this.connectedAccount = null;
    }
  }

  // Reset all stored data
  async resetStoredData(): Promise<void> {
    await indexedDBStorage.resetDatabase();
    this.connectedAccount = null;
  }

  // Register a contract with PXE
  async registerContract(
    artifact: ContractArtifact,
    deployer: AztecAddress,
    deploymentSalt: Fr,
    constructorArgs: unknown[]
  ) {
    const instance = await getContractInstanceFromDeployParams(artifact, {
      constructorArtifact: getDefaultInitializer(artifact),
      constructorArgs: constructorArgs,
      deployer: deployer,
      salt: deploymentSalt,
    });

    await this.pxe.registerContract({
      instance,
      artifact,
    });
  }

  // Send a transaction with the Sponsored FPC Contract for fee payment
  async sendTransaction(interaction: ContractFunctionInteraction) {
    const sponsoredPFCContract = await this.#getSponsoredPFCContract();
    const provenInteraction = await interaction.prove({
      fee: {
        paymentMethod: new SponsoredFeePaymentMethod(
          sponsoredPFCContract.address
        ),
      },
    });

    await provenInteraction.send().wait({ timeout: 120 });
  }

  // Simulate a transaction
  async simulateTransaction(interaction: ContractFunctionInteraction) {
    const res = await interaction.simulate();
    return res;
  }
}
