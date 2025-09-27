import {
  UserDeposit as UserDepositEvent,
  UserWithdraw as UserWithdrawEvent,
  ProviderWithdraw as ProviderWithdrawEvent,
  BatchPayment as BatchPaymentEvent,
  ZkVerifierUpdated as ZkVerifierUpdatedEvent,
  Paused as PausedEvent,
  Unpaused as UnpausedEvent
} from "../generated/Escrow/Escrow"

import {
  User,
  Provider,
  UserDeposit,
  UserWithdraw,
  ProviderWithdraw,
  BatchPayment,
  PaymentFlow,
  DailyMetrics,
  GlobalMetrics,
  ZkVerifierUpdate
} from "../generated/schema"

import { BigInt, BigDecimal, Bytes, Address } from "@graphprotocol/graph-ts"

// Helper function to create unique ID for entities
function createId(hash: Bytes, logIndex: BigInt): Bytes {
  return hash.concatI32(logIndex.toI32())
}

// Helper function to get or create a user
function getOrCreateUser(address: Address): User {
  let user = User.load(address)
  if (user == null) {
    user = new User(address)
    user.totalDeposited = BigInt.fromI32(0)
    user.totalWithdrawn = BigInt.fromI32(0)
    user.currentBalance = BigInt.fromI32(0)
    user.totalSpent = BigInt.fromI32(0)
    user.depositCount = 0
    user.withdrawalCount = 0
    user.paymentCount = 0
    user.firstDepositTimestamp = BigInt.fromI32(0)
    user.lastActivityTimestamp = BigInt.fromI32(0)
  }
  return user
}

// Helper function to get or create a provider
function getOrCreateProvider(address: Address): Provider {
  let provider = Provider.load(address)
  if (provider == null) {
    provider = new Provider(address)
    provider.totalEarned = BigInt.fromI32(0)
    provider.totalWithdrawn = BigInt.fromI32(0)
    provider.currentBalance = BigInt.fromI32(0)
    provider.paymentCount = 0
    provider.uniqueUsers = 0
    provider.firstPaymentTimestamp = BigInt.fromI32(0)
    provider.lastActivityTimestamp = BigInt.fromI32(0)
  }
  return provider
}

// Helper function to get or create global metrics
function getOrCreateGlobalMetrics(): GlobalMetrics {
  let globalId = Bytes.fromHexString("0x676c6f62616c") // "global" in hex
  let globalMetrics = GlobalMetrics.load(globalId)
  if (globalMetrics == null) {
    globalMetrics = new GlobalMetrics(globalId)
    globalMetrics.totalUsers = 0
    globalMetrics.totalProviders = 0
    globalMetrics.totalDeposits = BigInt.fromI32(0)
    globalMetrics.totalWithdrawals = BigInt.fromI32(0)
    globalMetrics.totalPayments = BigInt.fromI32(0)
    globalMetrics.totalApiCalls = BigInt.fromI32(0)
    globalMetrics.totalValueLocked = BigInt.fromI32(0)
    globalMetrics.averagePaymentSize = BigDecimal.fromString("0")
    globalMetrics.lastUpdatedTimestamp = BigInt.fromI32(0)
  }
  return globalMetrics
}

// Helper function to get daily metrics
function getOrCreateDailyMetrics(timestamp: BigInt): DailyMetrics {
  let dayStart = timestamp.div(BigInt.fromI32(86400)).times(BigInt.fromI32(86400))
  let dayId = Bytes.fromUTF8(dayStart.toString())
  let dailyMetrics = DailyMetrics.load(dayId)
  
  if (dailyMetrics == null) {
    dailyMetrics = new DailyMetrics(dayId)
    dailyMetrics.date = new Date(dayStart.toI32() * 1000).toISOString().split('T')[0]
    dailyMetrics.totalDeposits = BigInt.fromI32(0)
    dailyMetrics.totalWithdrawals = BigInt.fromI32(0)
    dailyMetrics.totalPayments = BigInt.fromI32(0)
    dailyMetrics.uniqueUsers = 0
    dailyMetrics.uniqueProviders = 0
    dailyMetrics.newUsers = 0
    dailyMetrics.newProviders = 0
    dailyMetrics.totalApiCalls = BigInt.fromI32(0)
    dailyMetrics.averagePaymentAmount = BigDecimal.fromString("0")
    dailyMetrics.timestamp = dayStart
  }
  return dailyMetrics
}

export function handleUserDeposit(event: UserDepositEvent): void {
  let user = getOrCreateUser(event.params.user)
  let globalMetrics = getOrCreateGlobalMetrics()
  let dailyMetrics = getOrCreateDailyMetrics(event.block.timestamp)

  // Create deposit entity
  let deposit = new UserDeposit(createId(event.transaction.hash, event.logIndex))
  deposit.user = user.id
  deposit.amount = event.params.amount
  deposit.timestamp = event.block.timestamp
  deposit.blockNumber = event.block.number
  deposit.transactionHash = event.transaction.hash
  deposit.save()

  // Update user metrics
  if (user.firstDepositTimestamp.equals(BigInt.fromI32(0))) {
    user.firstDepositTimestamp = event.block.timestamp
    globalMetrics.totalUsers = globalMetrics.totalUsers + 1
    dailyMetrics.newUsers = dailyMetrics.newUsers + 1
  }
  
  user.totalDeposited = user.totalDeposited.plus(event.params.amount)
  user.currentBalance = user.currentBalance.plus(event.params.amount)
  user.depositCount = user.depositCount + 1
  user.lastActivityTimestamp = event.block.timestamp
  user.save()

  // Update global metrics
  globalMetrics.totalDeposits = globalMetrics.totalDeposits.plus(event.params.amount)
  globalMetrics.totalValueLocked = globalMetrics.totalValueLocked.plus(event.params.amount)
  globalMetrics.lastUpdatedTimestamp = event.block.timestamp
  globalMetrics.save()

  // Update daily metrics
  dailyMetrics.totalDeposits = dailyMetrics.totalDeposits.plus(event.params.amount)
  dailyMetrics.save()
}

export function handleUserWithdraw(event: UserWithdrawEvent): void {
  let user = getOrCreateUser(event.params.user)
  let globalMetrics = getOrCreateGlobalMetrics()
  let dailyMetrics = getOrCreateDailyMetrics(event.block.timestamp)

  // Create withdrawal entity
  let withdrawal = new UserWithdraw(createId(event.transaction.hash, event.logIndex))
  withdrawal.user = user.id
  withdrawal.amount = event.params.amount
  withdrawal.timestamp = event.block.timestamp
  withdrawal.blockNumber = event.block.number
  withdrawal.transactionHash = event.transaction.hash
  withdrawal.save()

  // Update user metrics
  user.totalWithdrawn = user.totalWithdrawn.plus(event.params.amount)
  user.currentBalance = user.currentBalance.minus(event.params.amount)
  user.withdrawalCount = user.withdrawalCount + 1
  user.lastActivityTimestamp = event.block.timestamp
  user.save()

  // Update global metrics
  globalMetrics.totalWithdrawals = globalMetrics.totalWithdrawals.plus(event.params.amount)
  globalMetrics.totalValueLocked = globalMetrics.totalValueLocked.minus(event.params.amount)
  globalMetrics.lastUpdatedTimestamp = event.block.timestamp
  globalMetrics.save()

  // Update daily metrics
  dailyMetrics.totalWithdrawals = dailyMetrics.totalWithdrawals.plus(event.params.amount)
  dailyMetrics.save()
}

export function handleProviderWithdraw(event: ProviderWithdrawEvent): void {
  let provider = getOrCreateProvider(event.params.provider)
  let globalMetrics = getOrCreateGlobalMetrics()
  let dailyMetrics = getOrCreateDailyMetrics(event.block.timestamp)

  // Create withdrawal entity
  let withdrawal = new ProviderWithdraw(createId(event.transaction.hash, event.logIndex))
  withdrawal.provider = provider.id
  withdrawal.amount = event.params.amount
  withdrawal.timestamp = event.block.timestamp
  withdrawal.blockNumber = event.block.number
  withdrawal.transactionHash = event.transaction.hash
  withdrawal.save()

  // Update provider metrics
  provider.totalWithdrawn = provider.totalWithdrawn.plus(event.params.amount)
  provider.currentBalance = provider.currentBalance.minus(event.params.amount)
  provider.lastActivityTimestamp = event.block.timestamp
  provider.save()

  // Update global metrics
  globalMetrics.totalValueLocked = globalMetrics.totalValueLocked.minus(event.params.amount)
  globalMetrics.lastUpdatedTimestamp = event.block.timestamp
  globalMetrics.save()

  // Update daily metrics
  dailyMetrics.totalWithdrawals = dailyMetrics.totalWithdrawals.plus(event.params.amount)
  dailyMetrics.save()
}

export function handleBatchPayment(event: BatchPaymentEvent): void {
  let user = getOrCreateUser(event.params.user)
  let provider = getOrCreateProvider(event.params.provider)
  let globalMetrics = getOrCreateGlobalMetrics()
  let dailyMetrics = getOrCreateDailyMetrics(event.block.timestamp)

  // Create batch payment entity
  let payment = new BatchPayment(createId(event.transaction.hash, event.logIndex))
  payment.user = user.id
  payment.provider = provider.id
  payment.amount = event.params.amount
  payment.numCalls = event.params.numCalls
  payment.timestamp = event.block.timestamp
  payment.blockNumber = event.block.number
  payment.transactionHash = event.transaction.hash
  
  // Calculate cost per call
  if (event.params.numCalls.gt(BigInt.fromI32(0))) {
    payment.costPerCall = event.params.amount.toBigDecimal().div(event.params.numCalls.toBigDecimal())
  } else {
    payment.costPerCall = BigDecimal.fromString("0")
  }
  payment.save()

  // Update user metrics
  user.totalSpent = user.totalSpent.plus(event.params.amount)
  user.currentBalance = user.currentBalance.minus(event.params.amount)
  user.paymentCount = user.paymentCount + 1
  user.lastActivityTimestamp = event.block.timestamp
  user.save()

  // Update provider metrics
  if (provider.firstPaymentTimestamp.equals(BigInt.fromI32(0))) {
    provider.firstPaymentTimestamp = event.block.timestamp
    globalMetrics.totalProviders = globalMetrics.totalProviders + 1
    dailyMetrics.newProviders = dailyMetrics.newProviders + 1
  }
  
  provider.totalEarned = provider.totalEarned.plus(event.params.amount)
  provider.currentBalance = provider.currentBalance.plus(event.params.amount)
  provider.paymentCount = provider.paymentCount + 1
  provider.lastActivityTimestamp = event.block.timestamp
  provider.save()

  // Update or create payment flow
  let flowId = event.params.user.concat(event.params.provider)
  let paymentFlow = PaymentFlow.load(flowId)
  if (paymentFlow == null) {
    paymentFlow = new PaymentFlow(flowId)
    paymentFlow.user = user.id
    paymentFlow.provider = provider.id
    paymentFlow.totalAmount = BigInt.fromI32(0)
    paymentFlow.totalCalls = BigInt.fromI32(0)
    paymentFlow.paymentCount = 0
    paymentFlow.firstPaymentTimestamp = event.block.timestamp
    paymentFlow.averageCostPerCall = BigDecimal.fromString("0")
    provider.uniqueUsers = provider.uniqueUsers + 1
  }
  
  paymentFlow.totalAmount = paymentFlow.totalAmount.plus(event.params.amount)
  paymentFlow.totalCalls = paymentFlow.totalCalls.plus(event.params.numCalls)
  paymentFlow.paymentCount = paymentFlow.paymentCount + 1
  paymentFlow.lastPaymentTimestamp = event.block.timestamp
  
  // Calculate average cost per call
  if (paymentFlow.totalCalls.gt(BigInt.fromI32(0))) {
    paymentFlow.averageCostPerCall = paymentFlow.totalAmount.toBigDecimal().div(paymentFlow.totalCalls.toBigDecimal())
  }
  paymentFlow.save()

  // Update global metrics
  globalMetrics.totalPayments = globalMetrics.totalPayments.plus(event.params.amount)
  globalMetrics.totalApiCalls = globalMetrics.totalApiCalls.plus(event.params.numCalls)
  
  // Calculate average payment size - track payment count separately
  let currentPaymentCount = globalMetrics.totalUsers + globalMetrics.totalProviders // Simple approximation
  if (currentPaymentCount > 0) {
    globalMetrics.averagePaymentSize = globalMetrics.totalPayments.toBigDecimal().div(BigDecimal.fromString(currentPaymentCount.toString()))
  }
  
  globalMetrics.lastUpdatedTimestamp = event.block.timestamp
  globalMetrics.save()

  // Update daily metrics
  dailyMetrics.totalPayments = dailyMetrics.totalPayments.plus(event.params.amount)
  dailyMetrics.totalApiCalls = dailyMetrics.totalApiCalls.plus(event.params.numCalls)
  
  // Calculate daily average payment amount
  let dailyPaymentCount = dailyMetrics.newUsers + dailyMetrics.newProviders + 1 // Simple approximation
  if (dailyPaymentCount > 0 && dailyMetrics.totalPayments.gt(BigInt.fromI32(0))) {
    dailyMetrics.averagePaymentAmount = dailyMetrics.totalPayments.toBigDecimal().div(BigDecimal.fromString(dailyPaymentCount.toString()))
  }
  dailyMetrics.save()
}

export function handleZkVerifierUpdated(event: ZkVerifierUpdatedEvent): void {
  let verifierUpdate = new ZkVerifierUpdate(createId(event.transaction.hash, event.logIndex))
  verifierUpdate.oldVerifier = event.params.oldVerifier
  verifierUpdate.newVerifier = event.params.newVerifier
  verifierUpdate.timestamp = event.block.timestamp
  verifierUpdate.blockNumber = event.block.number
  verifierUpdate.transactionHash = event.transaction.hash
  verifierUpdate.save()
}

export function handlePaused(event: PausedEvent): void {
  // You can add logic here to track contract pause events
  // For now, we'll just update global metrics
  let globalMetrics = getOrCreateGlobalMetrics()
  globalMetrics.lastUpdatedTimestamp = event.block.timestamp
  globalMetrics.save()
}

export function handleUnpaused(event: UnpausedEvent): void {
  // You can add logic here to track contract unpause events
  // For now, we'll just update global metrics  
  let globalMetrics = getOrCreateGlobalMetrics()
  globalMetrics.lastUpdatedTimestamp = event.block.timestamp
  globalMetrics.save()
}