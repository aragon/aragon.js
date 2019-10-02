import { postprocessRadspecDescription, tryEvaluatingRadspec } from '../../radspec'

export default async function (request, proxy, wrapper) {
  const [transaction = {}] = request.params
  if (!transaction.to) {
    throw new Error(`Could not describe transaction: missing 'to'`)
  }
  if (!transaction.data) {
    throw new Error(`Could not describe transaction: missing 'data'`)
  }

  let description
  try {
    const decoratedTransaction = await tryEvaluatingRadspec(transaction, wrapper)
    description = decoratedTransaction.description
  } catch (_) {}

  if (description) {
    try {
      const processed = await postprocessRadspecDescription(description, wrapper)
      return {
        annotatedDescription: processed.annotatedDescription,
        description: processed.description
      }
    } catch (_) {}
  }

  return {
    description
  }
}
