import { postprocessRadspecDescription, tryEvaluatingRadspec } from '../../radspec'

export default async function (request, proxy, wrapper) {
  const transaction = request[0]
  if (!transaction.to) {
    throw new Error(`Could not describe transaction: missing 'to'`)
  }
  if (!transaction.data) {
    throw new Error(`Could not describe transaction: missing 'data'`)
  }

  const description = tryEvaluatingRadspec(transaction, wrapper)
  try {
    const processed = await postprocessRadspecDescription(description, wrapper)
    return {
      annotatedDescription: processed.annotatedDescription,
      description: processed.description
    }
  } catch (err) {
    return {
      description
    }
  }
}
