use reqwest;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Token API configuration
const TOKEN_API_ENDPOINT: &str = "https://api.thegraph.com/tokens";

/// Token metadata from The Graph Token API
#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct TokenMetadata {
    pub address: String,
    pub symbol: String,
    pub name: String,
    pub decimals: u32,
    pub current_price_usd: f64,
    pub market_cap: Option<f64>,
    pub holder_count: Option<u64>,
    pub volume_24h: Option<f64>,
    pub price_change_24h: Option<f64>,
    pub logo_uri: Option<String>,
}

/// Token API response structure
#[derive(Debug, Deserialize)]
struct TokenAPIResponse {
    pub data: Vec<TokenData>,
}

#[derive(Debug, Deserialize)]
struct TokenData {
    pub address: String,
    pub symbol: String,
    pub name: String,
    pub decimals: u32,
    pub price: PriceData,
    pub market_data: Option<MarketData>,
}

#[derive(Debug, Deserialize)]
struct PriceData {
    pub usd: f64,
    pub change_24h: Option<f64>,
}

#[derive(Debug, Deserialize)]
struct MarketData {
    pub market_cap: Option<f64>,
    pub holder_count: Option<u64>,
    pub volume_24h: Option<f64>,
}

/// Token API client for fetching enriched token data
pub struct TokenAPIClient {
    client: reqwest::Client,
}

impl TokenAPIClient {
    pub fn new() -> Self {
        Self {
            client: reqwest::Client::new(),
        }
    }

    /// Fetch token metadata for multiple addresses
    pub async fn get_tokens_metadata(&self, addresses: &[String]) -> Result<HashMap<String, TokenMetadata>, Box<dyn std::error::Error>> {
        let mut metadata = HashMap::new();
        
        // Batch request for multiple tokens
        let addresses_param = addresses.join(",");
        let url = format!("{}?addresses={}", TOKEN_API_ENDPOINT, addresses_param);
        
        match self.client.get(&url).send().await {
            Ok(response) => {
                if response.status().is_success() {
                    match response.json::<TokenAPIResponse>().await {
                        Ok(api_response) => {
                            for token in api_response.data {
                                metadata.insert(token.address.clone(), TokenMetadata {
                                    address: token.address,
                                    symbol: token.symbol,
                                    name: token.name,
                                    decimals: token.decimals,
                                    current_price_usd: token.price.usd,
                                    market_cap: token.market_data.as_ref().and_then(|m| m.market_cap),
                                    holder_count: token.market_data.as_ref().and_then(|m| m.holder_count),
                                    volume_24h: token.market_data.as_ref().and_then(|m| m.volume_24h),
                                    price_change_24h: token.price.change_24h,
                                    logo_uri: None, // Would be included in actual API response
                                });
                            }
                        }
                        Err(e) => eprintln!("Failed to parse Token API response: {}", e),
                    }
                } else {
                    eprintln!("Token API request failed with status: {}", response.status());
                }
            }
            Err(e) => eprintln!("Token API request error: {}", e),
        }
        
        Ok(metadata)
    }

    /// Get PYUSD token metadata (your main token)
    pub async fn get_pyusd_metadata(&self) -> Result<Option<TokenMetadata>, Box<dyn std::error::Error>> {
        // PYUSD contract address (example)
        let pyusd_address = "0x6c3ea9036406852006290770bedfcaba0e23a0e8".to_string();
        let mut metadata = self.get_tokens_metadata(&[pyusd_address.clone()]).await?;
        Ok(metadata.remove(&pyusd_address))
    }

    /// Calculate cost analysis for API payments
    pub async fn calculate_payment_costs(&self, amounts: &[(String, String)]) -> Result<Vec<PaymentCost>, Box<dyn std::error::Error>> {
        let token_addresses: Vec<String> = amounts.iter().map(|(addr, _)| addr.clone()).collect();
        let metadata = self.get_tokens_metadata(&token_addresses).await?;
        
        let mut costs = Vec::new();
        for (token_addr, amount) in amounts {
            if let Some(token_meta) = metadata.get(token_addr) {
                if let Ok(amount_f64) = amount.parse::<f64>() {
                    let adjusted_amount = amount_f64 / 10_f64.powi(token_meta.decimals as i32);
                    let usd_cost = adjusted_amount * token_meta.current_price_usd;
                    
                    costs.push(PaymentCost {
                        token_address: token_addr.clone(),
                        token_symbol: token_meta.symbol.clone(),
                        amount: adjusted_amount,
                        usd_value: usd_cost,
                        price_per_token: token_meta.current_price_usd,
                        efficiency_score: calculate_efficiency_score(&token_meta),
                    });
                }
            }
        }
        
        Ok(costs)
    }
}

/// Payment cost analysis
#[derive(Debug, Serialize, Clone)]
pub struct PaymentCost {
    pub token_address: String,
    pub token_symbol: String,
    pub amount: f64,
    pub usd_value: f64,
    pub price_per_token: f64,
    pub efficiency_score: f64, // 0-1 score for cost efficiency
}

/// Calculate efficiency score based on token characteristics
fn calculate_efficiency_score(token: &TokenMetadata) -> f64 {
    let mut score = 0.5; // Base score
    
    // Low volatility is better for payments
    if let Some(change_24h) = token.price_change_24h {
        let volatility_penalty = change_24h.abs() / 100.0;
        score -= volatility_penalty.min(0.3);
    }
    
    // Higher volume indicates better liquidity
    if let Some(volume_24h) = token.volume_24h {
        if volume_24h > 1_000_000.0 {
            score += 0.2;
        }
    }
    
    // More holders indicates better adoption
    if let Some(holder_count) = token.holder_count {
        if holder_count > 10_000 {
            score += 0.1;
        }
    }
    
    score.max(0.0).min(1.0)
}

/// AI-powered cost optimization recommendations
pub struct CostOptimizer {
    token_client: TokenAPIClient,
}

impl CostOptimizer {
    pub fn new() -> Self {
        Self {
            token_client: TokenAPIClient::new(),
        }
    }

    /// Generate cost optimization suggestions
    pub async fn optimize_payments(&self, payment_history: &[(String, String, u64)]) -> Result<Vec<OptimizationSuggestion>, Box<dyn std::error::Error>> {
        let mut suggestions = Vec::new();
        
        // Analyze payment patterns
        let mut token_usage: HashMap<String, (f64, u32)> = HashMap::new();
        for (token_addr, amount, _timestamp) in payment_history {
            if let Ok(amount_f64) = amount.parse::<f64>() {
                let entry = token_usage.entry(token_addr.clone()).or_insert((0.0, 0));
                entry.0 += amount_f64;
                entry.1 += 1;
            }
        }

        // Get current token prices
        let token_addresses: Vec<String> = token_usage.keys().cloned().collect();
        let metadata = self.token_client.get_tokens_metadata(&token_addresses).await?;

        // Generate suggestions based on usage patterns and market data
        for (token_addr, (total_amount, payment_count)) in token_usage {
            if let Some(token_meta) = metadata.get(&token_addr) {
                let avg_payment = total_amount / payment_count as f64;
                
                // Suggest batching for frequent small payments
                if payment_count > 10 && avg_payment < 100.0 {
                    suggestions.push(OptimizationSuggestion {
                        suggestion_type: "batch_payments".to_string(),
                        description: format!("Consider batching your {} payments to save on gas costs", token_meta.symbol),
                        potential_savings_usd: avg_payment * 0.1 * payment_count as f64,
                        confidence: 0.8,
                        token_address: Some(token_addr.clone()),
                    });
                }

                // Suggest alternative tokens with better efficiency
                if token_meta.current_price_usd > 1.0 && token_meta.volume_24h.unwrap_or(0.0) < 100_000.0 {
                    suggestions.push(OptimizationSuggestion {
                        suggestion_type: "alternative_token".to_string(),
                        description: format!("Consider using PYUSD instead of {} for better liquidity", token_meta.symbol),
                        potential_savings_usd: total_amount * 0.05,
                        confidence: 0.6,
                        token_address: Some(token_addr.clone()),
                    });
                }

                // Timing suggestions based on price volatility
                if let Some(change_24h) = token_meta.price_change_24h {
                    if change_24h < -5.0 {
                        suggestions.push(OptimizationSuggestion {
                            suggestion_type: "timing_optimization".to_string(),
                            description: format!("{} is down {}% - good time to deposit", token_meta.symbol, change_24h.abs()),
                            potential_savings_usd: total_amount * (change_24h.abs() / 100.0),
                            confidence: 0.7,
                            token_address: Some(token_addr),
                        });
                    }
                }
            }
        }

        Ok(suggestions)
    }
}

/// Optimization suggestion from AI analysis
#[derive(Debug, Serialize, Clone)]
pub struct OptimizationSuggestion {
    pub suggestion_type: String, // "batch_payments", "alternative_token", "timing_optimization"
    pub description: String,
    pub potential_savings_usd: f64,
    pub confidence: f64, // 0-1 confidence score
    pub token_address: Option<String>,
}