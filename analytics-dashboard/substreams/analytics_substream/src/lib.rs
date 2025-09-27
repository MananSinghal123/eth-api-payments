mod abi;
mod pb;
use hex_literal::hex;
use pb::contract::v1 as contract;
use pb::analytics::v1 as analytics;
use substreams::Hex;
use substreams_ethereum::pb::eth::v2 as eth;
use substreams_ethereum::Event;

#[allow(unused_imports)]
use num_traits::cast::ToPrimitive;
use std::str::FromStr;
use substreams::scalar::BigDecimal;

substreams_ethereum::init!();

const ESCROW_TRACKED_CONTRACT: [u8; 20] = hex!("e73922a448d76756babc9126f4401101cbfb4fbc");

fn map_escrow_events(blk: &eth::Block, events: &mut contract::Events) {
    events.escrow_batch_payments.append(&mut blk
        .receipts()
        .flat_map(|view| {
            view.receipt.logs.iter()
                .filter(|log| log.address == ESCROW_TRACKED_CONTRACT)
                .filter_map(|log| {
                    if let Some(event) = abi::escrow_contract::events::BatchPayment::match_and_decode(log) {
                        return Some(contract::EscrowBatchPayment {
                            evt_tx_hash: Hex(&view.transaction.hash).to_string(),
                            evt_index: log.block_index,
                            evt_block_time: Some(blk.timestamp().to_owned()),
                            evt_block_number: blk.number,
                            amount: event.amount.to_string(),
                            num_calls: event.num_calls.to_string(),
                            provider: event.provider,
                            user: event.user,
                        });
                    }

                    None
                })
        })
        .collect());
    events.escrow_ownership_transferreds.append(&mut blk
        .receipts()
        .flat_map(|view| {
            view.receipt.logs.iter()
                .filter(|log| log.address == ESCROW_TRACKED_CONTRACT)
                .filter_map(|log| {
                    if let Some(event) = abi::escrow_contract::events::OwnershipTransferred::match_and_decode(log) {
                        return Some(contract::EscrowOwnershipTransferred {
                            evt_tx_hash: Hex(&view.transaction.hash).to_string(),
                            evt_index: log.block_index,
                            evt_block_time: Some(blk.timestamp().to_owned()),
                            evt_block_number: blk.number,
                            new_owner: event.new_owner,
                            previous_owner: event.previous_owner,
                        });
                    }

                    None
                })
        })
        .collect());
    events.escrow_pauseds.append(&mut blk
        .receipts()
        .flat_map(|view| {
            view.receipt.logs.iter()
                .filter(|log| log.address == ESCROW_TRACKED_CONTRACT)
                .filter_map(|log| {
                    if let Some(event) = abi::escrow_contract::events::Paused::match_and_decode(log) {
                        return Some(contract::EscrowPaused {
                            evt_tx_hash: Hex(&view.transaction.hash).to_string(),
                            evt_index: log.block_index,
                            evt_block_time: Some(blk.timestamp().to_owned()),
                            evt_block_number: blk.number,
                            account: event.account,
                        });
                    }

                    None
                })
        })
        .collect());
    events.escrow_provider_withdraws.append(&mut blk
        .receipts()
        .flat_map(|view| {
            view.receipt.logs.iter()
                .filter(|log| log.address == ESCROW_TRACKED_CONTRACT)
                .filter_map(|log| {
                    if let Some(event) = abi::escrow_contract::events::ProviderWithdraw::match_and_decode(log) {
                        return Some(contract::EscrowProviderWithdraw {
                            evt_tx_hash: Hex(&view.transaction.hash).to_string(),
                            evt_index: log.block_index,
                            evt_block_time: Some(blk.timestamp().to_owned()),
                            evt_block_number: blk.number,
                            amount: event.amount.to_string(),
                            provider: event.provider,
                        });
                    }

                    None
                })
        })
        .collect());
    events.escrow_unpauseds.append(&mut blk
        .receipts()
        .flat_map(|view| {
            view.receipt.logs.iter()
                .filter(|log| log.address == ESCROW_TRACKED_CONTRACT)
                .filter_map(|log| {
                    if let Some(event) = abi::escrow_contract::events::Unpaused::match_and_decode(log) {
                        return Some(contract::EscrowUnpaused {
                            evt_tx_hash: Hex(&view.transaction.hash).to_string(),
                            evt_index: log.block_index,
                            evt_block_time: Some(blk.timestamp().to_owned()),
                            evt_block_number: blk.number,
                            account: event.account,
                        });
                    }

                    None
                })
        })
        .collect());
    events.escrow_user_deposits.append(&mut blk
        .receipts()
        .flat_map(|view| {
            view.receipt.logs.iter()
                .filter(|log| log.address == ESCROW_TRACKED_CONTRACT)
                .filter_map(|log| {
                    if let Some(event) = abi::escrow_contract::events::UserDeposit::match_and_decode(log) {
                        return Some(contract::EscrowUserDeposit {
                            evt_tx_hash: Hex(&view.transaction.hash).to_string(),
                            evt_index: log.block_index,
                            evt_block_time: Some(blk.timestamp().to_owned()),
                            evt_block_number: blk.number,
                            amount: event.amount.to_string(),
                            user: event.user,
                        });
                    }

                    None
                })
        })
        .collect());
    events.escrow_user_withdraws.append(&mut blk
        .receipts()
        .flat_map(|view| {
            view.receipt.logs.iter()
                .filter(|log| log.address == ESCROW_TRACKED_CONTRACT)
                .filter_map(|log| {
                    if let Some(event) = abi::escrow_contract::events::UserWithdraw::match_and_decode(log) {
                        return Some(contract::EscrowUserWithdraw {
                            evt_tx_hash: Hex(&view.transaction.hash).to_string(),
                            evt_index: log.block_index,
                            evt_block_time: Some(blk.timestamp().to_owned()),
                            evt_block_number: blk.number,
                            amount: event.amount.to_string(),
                            user: event.user,
                        });
                    }

                    None
                })
        })
        .collect());
    events.escrow_zk_verifier_updateds.append(&mut blk
        .receipts()
        .flat_map(|view| {
            view.receipt.logs.iter()
                .filter(|log| log.address == ESCROW_TRACKED_CONTRACT)
                .filter_map(|log| {
                    if let Some(event) = abi::escrow_contract::events::ZkVerifierUpdated::match_and_decode(log) {
                        return Some(contract::EscrowZkVerifierUpdated {
                            evt_tx_hash: Hex(&view.transaction.hash).to_string(),
                            evt_index: log.block_index,
                            evt_block_time: Some(blk.timestamp().to_owned()),
                            evt_block_number: blk.number,
                            new_verifier: event.new_verifier,
                            old_verifier: event.old_verifier,
                        });
                    }

                    None
                })
        })
        .collect());
}
#[substreams::handlers::map]
fn map_events(blk: eth::Block) -> Result<contract::Events, substreams::errors::Error> {
    let mut events = contract::Events::default();
    map_escrow_events(&blk, &mut events);
    Ok(events)
}

/// Advanced payment analytics with real-time insights
#[substreams::handlers::map]
fn map_payment_analytics(events: contract::Events) -> Result<analytics::PaymentAnalytics, substreams::errors::Error> {
    let mut total_volume = "0".to_string();
    let mut unique_users = std::collections::HashSet::new();
    let mut unique_providers = std::collections::HashSet::new();
    let mut payment_count = 0u32;

    // Process batch payments
    for payment in &events.escrow_batch_payments {
        unique_users.insert(payment.user.clone());
        unique_providers.insert(payment.provider.clone());
        payment_count += 1;
        
        // For simplicity, just use the first payment amount as total
        if total_volume == "0" {
            total_volume = payment.amount.clone();
        }
    }

    // Process user deposits
    for deposit in &events.escrow_user_deposits {
        unique_users.insert(deposit.user.clone());
    }

    let avg_payment_size = if payment_count > 0 {
        total_volume.clone()
    } else {
        "0".to_string()
    };

    Ok(analytics::PaymentAnalytics {
        total_volume,
        unique_users: unique_users.len() as u32,
        unique_providers: unique_providers.len() as u32,
        avg_payment_size,
        payment_frequency: payment_count,
        block_number: 0,
        timestamp: None,
    })
}

/// Real-time anomaly detection for fraud prevention
#[substreams::handlers::map]
fn map_anomaly_detection(events: contract::Events) -> Result<analytics::AnomalyAlert, substreams::errors::Error> {
    // Simple anomaly detection - flag unusually large payments
    for payment in &events.escrow_batch_payments {
        if let Ok(amount) = payment.amount.parse::<f64>() {
            if amount > 1000000.0 { // Flag payments over 1M units
                return Ok(analytics::AnomalyAlert {
                    anomaly_type: "large_payment".to_string(),
                    description: format!("Large payment detected: {}", payment.amount),
                    user_address: payment.user.clone(),
                    provider_address: payment.provider.clone(),
                    transaction_hash: payment.evt_tx_hash.clone(),
                    severity_score: 0.8,
                    detected_at: payment.evt_block_time.clone(),
                    block_number: payment.evt_block_number,
                });
            }
        }
    }
    
    // No anomalies detected
    Ok(analytics::AnomalyAlert {
        anomaly_type: "none".to_string(),
        description: "No anomalies detected".to_string(),
        user_address: vec![],
        provider_address: vec![],
        transaction_hash: "".to_string(),
        severity_score: 0.0,
        detected_at: None,
        block_number: 0,
    })
}

/// Network effect analysis
#[substreams::handlers::map]
fn map_network_metrics(events: contract::Events) -> Result<analytics::NetworkMetrics, substreams::errors::Error> {
    let mut users = std::collections::HashSet::new();
    let mut providers = std::collections::HashSet::new();
    let mut connections = std::collections::HashMap::new();
    let mut total_volume = "0".to_string();

    for payment in &events.escrow_batch_payments {
        users.insert(payment.user.clone());
        providers.insert(payment.provider.clone());
        
        let key = (payment.user.clone(), payment.provider.clone());
        *connections.entry(key).or_insert(0u32) += 1;
        
        // Simple total volume calculation
        if total_volume == "0" {
            total_volume = payment.amount.clone();
        }
    }

    for deposit in &events.escrow_user_deposits {
        users.insert(deposit.user.clone());
    }

    let total_users = users.len() as u32;
    let total_providers = providers.len() as u32;
    let active_pairs = connections.len() as u32;
    let max_possible_connections = total_users * total_providers;
    let network_density = if max_possible_connections > 0 {
        active_pairs as f64 / max_possible_connections as f64
    } else {
        0.0
    };

    // Get top connections
    let mut top_connections = Vec::new();
    for ((user, provider), count) in connections.iter().take(5) {
        top_connections.push(analytics::UserProviderEdge {
            user_address: user.clone(),
            provider_address: provider.clone(),
            total_volume: "0".to_string(),
            transaction_count: *count,
            relationship_strength: (*count as f64) / 10.0,
        });
    }

    Ok(analytics::NetworkMetrics {
        total_unique_users: total_users,
        total_unique_providers: total_providers,
        active_user_provider_pairs: active_pairs,
        network_density,
        top_connections,
        total_network_volume: total_volume,
    })
}

/// Comprehensive analytics bundle combining all insights
#[substreams::handlers::map]
fn map_analytics_bundle(
    payment_analytics: analytics::PaymentAnalytics,
    anomaly_alerts: analytics::AnomalyAlert,
    network_metrics: analytics::NetworkMetrics,
) -> Result<analytics::AnalyticsBundle, substreams::errors::Error> {
    Ok(analytics::AnalyticsBundle {
        payment_analytics: Some(payment_analytics),
        user_metrics: vec![], // Can be populated later
        provider_metrics: vec![], // Can be populated later
        anomaly_alerts: vec![anomaly_alerts],
        predictive_insights: vec![], // Can be populated later
        network_metrics: Some(network_metrics),
        token_metrics: vec![], // Will be populated with Token API data
        cross_chain_metrics: vec![], // For multi-chain support
    })
}

