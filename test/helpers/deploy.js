import Web3 from 'web3'

export default (artifacts, gas = 50000000) => async (t) => {
  // Set up Web3
  const web3 = new Web3(t.context.provider)

  // Deploy contracts
  const from = await web3.eth.getCoinbase()
  const addresses = await Promise.all(
    artifacts.map(({ id, bytecode }) =>
      web3.eth.sendTransaction({
        from,
        gas,
        data: bytecode
      }).then(({ contractAddress }) => ({
        id,
        address: contractAddress
      }))
    )
  ).then((deployments) =>
    deployments.reduce((addresses, deployment) =>
      addresses.set(deployment.id, deployment.address),
      new Map()
    )
  )

  // Set context
  t.context.addresses = addresses
}
