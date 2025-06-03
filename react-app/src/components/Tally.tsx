import { useState } from 'react';
import type { VoteResults } from '../config';
import { CANDIDATES_TO_INDEX_MAP } from '../config';
import { IconCircleCheckFilled, IconCircle } from '@tabler/icons-react';
import logo from '/page-logo.svg';
import aztecLogo from '/aztec-logo.svg';
import type { AccountWallet } from '@aztec/aztec.js';

const BUTTON_STYLES =
  'p-4 font-bold bg-gradient-to-r from-secondary to-primary text-white disabled:text-text-tertiary disabled:bg-gradient-to-r disabled:from-bg-light disabled:to-bg-light rounded-full min-w-48 hover:bg-gradient-to-r hover:from-primary hover:to-primary';

interface TallyProps {
  account: AccountWallet | null;
  isCreatingAccount: boolean;
  isVoting: boolean;
  results: VoteResults | null;
  loadingPage: boolean;
  createAccount: () => void;
  vote: (candidateId: number) => void;
}

function getCandidateName(candidateId: number): string {
  return (
    CANDIDATES_TO_INDEX_MAP[candidateId]?.name || `Candidate ${candidateId}`
  );
}

function CandidateCard({
  candidateId,
  votes,
  totalVotes,
  isSelected,
  onSelect,
}: {
  candidateId: number;
  votes: bigint;
  totalVotes: bigint;
  isSelected: boolean;
  onSelect: (id: number) => void;
}) {
  const candidate = CANDIDATES_TO_INDEX_MAP[candidateId];
  const percentage = totalVotes > 0n ? Number((votes * 100n) / totalVotes) : 0;
  const voteText = votes === 1n ? 'vote' : 'votes';

  return (
    <div
      className={`flex items-center gap-4 mb-[1px] p-3 text-left rounded-lg cursor-pointer ${
        isSelected
          ? 'border-bg-medium bg-bg-light'
          : 'border-white hover:bg-bg-light'
      }`}
      onClick={() => onSelect(candidateId)}
    >
      {/* Selection indicator */}
      {isSelected ? (
        <IconCircleCheckFilled className="text-secondary w-6" />
      ) : (
        <IconCircle className="text-gray-200 w-6" />
      )}

      {/* Candidate avatar */}
      <img
        src={candidate.pictureSrc}
        alt={candidate.name}
        className="w-14 h-14 rounded-full object-cover"
      />

      {/* Candidate info and vote progress */}
      <div className="flex flex-col gap-1 w-full">
        <div className="text-[1.1rem] flex flex-row font-medium ml-1 justify-between items-center">
          <div className="flex flex-row gap-2 items-center">
            <div className="font-bold">{candidate.name}</div>
            <div className="text-xs font-normal text-text-tertiary">
              ({percentage}%)
            </div>
          </div>
          <span className="mr-2 text-sm font-extralight text-text-tertiary">
            {votes.toString()} {voteText}
          </span>
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-2">
          <div className="relative w-full bg-bg-medium rounded-full h-2 overflow-hidden">
            <div className="absolute h-[1px] w-full bg-border/50 top-1" />
            <div
              className="absolute top-0 left-0 h-full text-white text-sm flex items-center justify-center rounded-full bg-gradient-to-r from-secondary to-primary"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function VoteResults({
  results,
  selectedCandidate,
  onCandidateSelect,
}: {
  results: VoteResults;
  selectedCandidate: number | null;
  onCandidateSelect: (candidateId: number) => void;
}) {
  const totalVotes = Object.values(results).reduce(
    (sum, votes) => sum + votes,
    0n
  );

  return (
    <div className="mb-10">
      {Object.entries(results).map(([candidateIdStr, votes]) => {
        const candidateId = parseInt(candidateIdStr);
        return (
          <CandidateCard
            key={candidateId}
            candidateId={candidateId}
            votes={votes}
            totalVotes={totalVotes}
            isSelected={selectedCandidate === candidateId}
            onSelect={onCandidateSelect}
          />
        );
      })}
    </div>
  );
}

export function Tally({
  account,
  results,
  isCreatingAccount,
  isVoting,
  loadingPage,
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

  const getButtonText = () => {
    if (account) {
      if (isCreatingAccount) return 'Creating Account...';
      if (isVoting) return 'Casting vote...';
      if (selectedCandidate === null) return 'Select a Candidate';
      return `Vote for ${getCandidateName(selectedCandidate)}`;
    }
    return isCreatingAccount ? 'Creating Account...' : 'Create Account';
  };

  const isButtonDisabled = () => {
    return account
      ? selectedCandidate === null || isCreatingAccount || isVoting
      : isCreatingAccount;
  };

  const totalVotes = results
    ? Object.values(results).reduce((sum, votes) => sum + votes, 0n)
    : 0n;

  return (
    <div className="w-full min-h-screen flex justify-center text-center relative">
      {/* Loading overlay */}
      {loadingPage && (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-20 z-50 backdrop-blur-sm text-text-secondary">
          <div className="text-lg font-medium">Loading...</div>
        </div>
      )}

      {/* Main content */}
      <div className="w-full flex flex-col h-full max-w-[32rem] p-4">
        {/* Header */}
        <div className="flex gap-2 mb-6 mt-8 justify-center items-center">
          <img className="w-6 h-6" alt="Logo" src={logo} />
          <h1 className="text-2xl font-bold">Private Voting</h1>
        </div>

        {/* Vote count display */}
        {results && (
          <div className="text-text-secondary text-sm">
            Already voted{' '}
            <b className="text-text-primary">{totalVotes.toString()}</b>{' '}
            accounts
          </div>
        )}

        {/* Voting section */}
        <div className="mt-10">
          {results ? (
            <VoteResults
              results={results}
              selectedCandidate={selectedCandidate}
              onCandidateSelect={setSelectedCandidate}
            />
          ) : (
            <div className="text-text-secondary text-sm mb-10">
              Create an account to view the results.
            </div>
          )}

          {/* Action button */}
          <button
            className={BUTTON_STYLES}
            onClick={account ? handleVote : createAccount}
            disabled={isButtonDisabled()}
          >
            {getButtonText()}
          </button>
        </div>

        <div className="flex-grow" />

        {/* Footer */}
        <div className="flex gap-2 text-xs items-center mx-auto mt-10 justify-center pb-5">
          <div className="opacity-70 text-text-secondary">Powered by</div>
          <img src={aztecLogo} alt="Aztec Logo" className="h-3" />
        </div>
      </div>
    </div>
  );
}
