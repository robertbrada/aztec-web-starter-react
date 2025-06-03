// import alice from './assets/alice.png';
// import bob from './assets/bob.png';
// import charlie from './assets/charlie.png';
// import david from './assets/david.png';
// import eve from './assets/eve.png';

export interface VoteResults {
  [key: number]: bigint;
}

interface Candidate {
  name: string;
  pictureSrc: string;
}

export const CANDIDATES_TO_INDEX_MAP: Record<number, Candidate> = {
  1: { name: 'Alice', pictureSrc: '/alice.png' },
  2: { name: 'Bob', pictureSrc: '/bob.png' },
  3: { name: 'Charlie', pictureSrc: '/charlie.png' },
  4: { name: 'David', pictureSrc: '/david.png' },
  5: { name: 'Eve', pictureSrc: '/eve.png' },
};

export const aztecNodeUrl = import.meta.env.AZTEC_NODE_URL;
export const contractAddress = import.meta.env.CONTRACT_ADDRESS;
export const deployerAddress = import.meta.env.DEPLOYER_ADDRESS;
export const deploymentSalt = import.meta.env.DEPLOYMENT_SALT;
