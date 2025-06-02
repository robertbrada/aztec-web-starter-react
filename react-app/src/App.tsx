const aztecNodeUrl = import.meta.env.AZTEC_NODE_URL;
const contractAddress = import.meta.env.CONTRACT_ADDRESS;
const deployerAddress = import.meta.env.DEPLOYER_ADDRESS;
const deploymentSalt = import.meta.env.DEPLOYMENT_SALT;

export default function App() {
  return (
    <div>
      <div>{aztecNodeUrl}</div>
      <div>{contractAddress}</div>
      <div>{deployerAddress}</div>
      <div>{deploymentSalt}</div>
    </div>
  );
}
