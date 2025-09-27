use crate::pb::contract::v1 as contract;
use substreams::scalar::BigDecimal;
use substreams_ethereum::pb::eth::v2 as eth;
use std::collections::HashMap;
use num_traits::cast::ToPrimitive;
use std::str::FromStr;

/// Real-time analytics for API payment patterns
pub struct PaymentAnalytics {
    pub total_volume: BigDecimal,
    pub unique_users: u32,
    pub unique_providers: u32,
    pub avg_payment_size: BigDecimal,
    pub payment_frequency: u32,
}

/// User behavior analytics for AI insights
#[derive(Default)]
pub struct UserMetrics {
    pub user_address: String,
    pub total_deposits: BigDecimal,
    pub total_withdrawals: BigDecimal,
    pub total_payments: BigDecimal,
    pub payment_count: u32,
    pub avg_payment_size: BigDecimal,
    pub last_activity_block: u64,
    pub providers_used: Vec<String>,
    pub payment_pattern_score: f64, // AI-calculated pattern score
}

/// Provider performance analytics
#[derive(Default)]
pub struct ProviderMetrics {
    pub provider_address: String,
    pub total_earnings: BigDecimal,
    pub total_withdrawals: BigDecimal,
    pub unique_users: u32,
    pub total_api_calls: u64,
    pub avg_call_value: BigDecimal,
    pub reliability_score: f64, // Based on consistent service
    pub growth_rate: f64, // Week-over-week growth
}

/// Calculate real-time analytics from events
pub fn calculate_analytics(events: &contract::Events) -> PaymentAnalytics {
    let mut total_volume = BigDecimal::from(0);
    let mut users = std::collections::HashSet::new();
    let mut providers = std::collections::HashSet::new();
    let mut payment_count = 0u32;

    // Process batch payments
    for payment in &events.escrow_batch_payments {
        if let Ok(amount) = BigDecimal::from_str(&payment.amount) {
            total_volume += amount.clone();
            users.insert(payment.user.clone());
            providers.insert(payment.provider.clone());
            payment_count += 1;
        }
    }

    // Process user deposits
    for deposit in &events.escrow_user_deposits {
        users.insert(deposit.user.clone());
    }

    let avg_payment_size = if payment_count > 0 {
        total_volume.clone() / BigDecimal::from(payment_count)
    } else {
        BigDecimal::from(0)
    };

    PaymentAnalytics {
        total_volume,
        unique_users: users.len() as u32,
        unique_providers: providers.len() as u32,
        avg_payment_size,
        payment_frequency: payment_count,
    }
}

/// Generate user behavior insights for AI processing
pub fn analyze_user_behavior(events: &contract::Events) -> HashMap<String, UserMetrics> {
    let mut user_metrics: HashMap<String, UserMetrics> = HashMap::new();

    // Process deposits
    for deposit in &events.escrow_user_deposits {
        let metrics = user_metrics.entry(deposit.user.clone()).or_default();
        metrics.user_address = deposit.user.clone();
        if let Ok(amount) = BigDecimal::from_str(&deposit.amount) {
            metrics.total_deposits += amount;
        }
        metrics.last_activity_block = deposit.evt_block_number;
    }

    // Process withdrawals
    for withdrawal in &events.escrow_user_withdraws {
        let metrics = user_metrics.entry(withdrawal.user.clone()).or_default();
        if let Ok(amount) = BigDecimal::from_str(&withdrawal.amount) {
            metrics.total_withdrawals += amount;
        }
        metrics.last_activity_block = withdrawal.evt_block_number;
    }

    // Process batch payments
    for payment in &events.escrow_batch_payments {
        let metrics = user_metrics.entry(payment.user.clone()).or_default();
        if let Ok(amount) = BigDecimal::from_str(&payment.amount) {
            metrics.total_payments += amount.clone();
            metrics.payment_count += 1;
            metrics.avg_payment_size = metrics.total_payments.clone() / BigDecimal::from(metrics.payment_count);
        }
        
        // Track provider relationships
        if !metrics.providers_used.contains(&payment.provider) {
            metrics.providers_used.push(payment.provider.clone());
        }
        
        metrics.last_activity_block = payment.evt_block_number;
        
        // Simple AI pattern scoring (can be enhanced with ML models)
        metrics.payment_pattern_score = calculate_pattern_score(&metrics);
    }

    user_metrics
}

/// Generate provider performance analytics
pub fn analyze_provider_performance(events: &contract::Events) -> HashMap<String, ProviderMetrics> {
    let mut provider_metrics: HashMap<String, ProviderMetrics> = HashMap::new();

    // Process batch payments (earnings)
    for payment in &events.escrow_batch_payments {
        let metrics = provider_metrics.entry(payment.provider.clone()).or_default();
        metrics.provider_address = payment.provider.clone();
        
        if let Ok(amount) = BigDecimal::from_str(&payment.amount) {
            metrics.total_earnings += amount.clone();
            if let Ok(calls) = payment.num_calls.parse::<u64>() {
                metrics.total_api_calls += calls;
                metrics.avg_call_value = amount / BigDecimal::from(calls);
            }
        }
    }

    // Process provider withdrawals
    for withdrawal in &events.escrow_provider_withdraws {
        let metrics = provider_metrics.entry(withdrawal.provider.clone()).or_default();
        if let Ok(amount) = BigDecimal::from_str(&withdrawal.amount) {
            metrics.total_withdrawals += amount;
        }
    }

    // Calculate performance scores
    for (_, metrics) in provider_metrics.iter_mut() {
        // Simple reliability score based on earnings vs withdrawals ratio
        if metrics.total_withdrawals > BigDecimal::from(0) {
            let ratio = metrics.total_earnings.clone() / metrics.total_withdrawals.clone();
            metrics.reliability_score = ratio.to_f64().unwrap_or(0.0).min(1.0);
        }
    }

    provider_metrics
}

/// Calculate AI-based pattern score for user behavior
fn calculate_pattern_score(metrics: &UserMetrics) -> f64 {
    // Simple scoring algorithm (can be replaced with ML model)
    let mut score = 0.0;
    
    // Regular usage pattern (higher payment count = better)
    score += (metrics.payment_count as f64).ln() * 0.3;
    
    // Provider diversity (using multiple providers = better)
    score += (metrics.providers_used.len() as f64).ln() * 0.2;
    
    // Balance management (deposits vs payments ratio)
    if metrics.total_deposits > BigDecimal::from(0) {
        let ratio = metrics.total_payments.clone() / metrics.total_deposits.clone();
        let ratio_f64 = ratio.to_f64().unwrap_or(0.0);
        // Optimal ratio is around 0.8 (using most of deposited funds)
        score += (1.0 - (ratio_f64 - 0.8).abs()) * 0.5;
    }
    
    // Normalize score to 0-1 range
    score.max(0.0).min(1.0)
}

/// Detect anomalies in payment patterns for fraud detection
pub fn detect_anomalies(events: &contract::Events) -> Vec<String> {
    let mut anomalies = Vec::new();
    
    // Detect unusually large payments
    let mut amounts: Vec<f64> = Vec::new();
    for payment in &events.escrow_batch_payments {
        if let Ok(amount) = BigDecimal::from_str(&payment.amount) {
            if let Some(amount_f64) = amount.to_f64() {
                amounts.push(amount_f64);
            }
        }
    }
    
    if !amounts.is_empty() {
        let mean = amounts.iter().sum::<f64>() / amounts.len() as f64;
        let variance = amounts.iter().map(|x| (x - mean).powi(2)).sum::<f64>() / amounts.len() as f64;
        let std_dev = variance.sqrt();
        let threshold = mean + 3.0 * std_dev; // 3-sigma rule
        
        for payment in &events.escrow_batch_payments {
            if let Ok(amount) = BigDecimal::from_str(&payment.amount) {
                if let Some(amount_f64) = amount.to_f64() {
                    if amount_f64 > threshold {
                        anomalies.push(format!(
                            "Unusually large payment: {} from user {} to provider {} (tx: {})",
                            payment.amount, payment.user, payment.provider, payment.evt_tx_hash
                        ));
                    }
                }
            }
        }
    }
    
    anomalies
}