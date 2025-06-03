import { useState } from 'react';
import type { VoteResults } from '../config';
import { CANDIDATES_TO_INDEX_MAP } from '../config';
import { IconCircleCheckFilled, IconCircle } from '@tabler/icons-react';
import logo from '/page-logo.svg';
import aztecLogo from '/aztec-logo.svg';
import type { AccountWallet } from '@aztec/aztec.js';

interface TallyProps {
  account: AccountWallet | null;
  isCreatingAccount: boolean;
  isVoting: boolean;
  results: VoteResults;
  createAccount: () => void;
  vote: (candidateId: number) => void;
}

function getCandidateName(candidateId: number): string {
  return (
    CANDIDATES_TO_INDEX_MAP[candidateId]?.name || `Candidate ${candidateId}`
  );
}

export function Tally({
  account,
  results,
  isCreatingAccount,
  isVoting,
  createAccount,
  vote,
}: TallyProps) {
  const [selectedCandidate, setSelectedCandidate] = useState<number | null>(
    null
  );

  const handleVote = () => {
    if (selectedCandidate !== null) {
      vote(selectedCandidate);
      setSelectedCandidate(null);
    }
  };

  const totalVotes = Object.values(results).reduce(
    (sum, votes) => sum + votes,
    0n
  );

  return (
    <div className="w-full flex justify-center text-center">
      <div className="w-full max-w-xl p-4">
        <div className="flex gap-2 mb-6 mt-8 justify-center items-center">
          <img className="w-6 h-6" alt="Logo" src={logo} />
          <h1 className="text-2xl font-bold">Private Voting</h1>
        </div>
        <div className="text-text-secondary text-sm">
          Already voted{' '}
          <b className="text-text-primary">{totalVotes.toString()}</b> accounts
        </div>

        {/* Voting Section */}
        <div className="mt-10">
          <div className="mb-14">
            {Object.entries(results).map(([candidate, votes]) => {
              const candidateId = parseInt(candidate);
              const candidateName = CANDIDATES_TO_INDEX_MAP[candidateId].name;
              const candidatePicture =
                CANDIDATES_TO_INDEX_MAP[candidateId].pictureSrc;
              const percentage =
                totalVotes > 0n ? Number((votes * 100n) / totalVotes) : 0;
              const isSelected = selectedCandidate === parseInt(candidate);

              return (
                <div
                  key={candidate}
                  className={`flex items-center gap-4 mb-1 p-3 text-left rounded-lg cursor-pointer ${
                    isSelected
                      ? 'border-blue-100 bg-bg-light  border-[1px]'
                      : 'border-white hover:bg-bg-light'
                  }`}
                  onClick={() => setSelectedCandidate(parseInt(candidate))}
                >
                  {/* Radio Button */}
                  {isSelected ? (
                    <IconCircleCheckFilled className="text-secondary w-8" />
                  ) : (
                    <IconCircle className="text-gray-200 w-8" />
                  )}

                  <img
                    src={candidatePicture}
                    alt={candidateName}
                    className="w-14 h-14 rounded-full object-cover"
                  />

                  {/* Candidate Info */}
                  <div className="flex flex-col gap-1 w-full">
                    <div className="text-[1.1rem] flex flex-row font-medium ml-2 justify-between items-center">
                      <div className="flex flex-row gap-2 items-center">
                        <div className="font-bold">{candidateName}</div>
                        <div className="text-sm font-normal text-text-secondary">
                          ({percentage}%)
                        </div>
                      </div>
                      <span className="mr-2 text-sm font-extralight text-text-secondary ">
                        {votes} {votes === 1n ? 'vote' : 'votes'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div
                        className={`relative w-full bg-bg-medium rounded-full h-2 overflow-hidden`}
                      >
                        <div className="absolute h-[1px] w-full bg-border top-1" />
                        <div
                          className={`absolute top-0 left-0 h-full text-white text-sm flex items-center justify-center rounded-full bg-gradient-to-r from-secondary to-primary`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Vote or Create Account Buttons */}
          {account ? (
            <button
              className="p-3 font-bold bg-gradient-to-r from-secondary to-primary text-white disabled:opacity-50 rounded-full min-w-48"
              onClick={handleVote}
              disabled={selectedCandidate === null || isCreatingAccount}
            >
              {isVoting
                ? 'Casting vote...'
                : selectedCandidate === null
                  ? 'Select a Candidate'
                  : `Vote for ${getCandidateName(selectedCandidate)}`}
            </button>
          ) : (
            <button
              className="p-4 font-bold bg-gradient-to-r from-secondary to-primary text-white disabled:opacity-50 rounded-full min-w-48 hover:bg-gradient-to-r hover:from-secondary hover:to-secondary"
              onClick={createAccount}
              disabled={isCreatingAccount}
            >
              {isCreatingAccount ? 'Creating Account...' : 'Create Account'}
            </button>
          )}
        </div>
        <div className="flex gap-2 text-xs items-center mx-auto mt-20 justify-center">
          <div className="opacity-50">Powered by</div>
          <img src={aztecLogo} alt="Aztec Logo" className="h-3" />
        </div>
      </div>
    </div>
  );
}
