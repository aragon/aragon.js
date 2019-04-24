import { hash as namehash } from 'eth-ens-namehash'

export const apmAppId = appName => namehash(`${appName}.aragonpm.eth`)
