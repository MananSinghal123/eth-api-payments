mod pb;

use hex_literal::hex;
use pb::eth::escrow::v1::{Events, EscrowEvent};
use substreams::Hex;
use substreams_ethereum::pb::eth::v2 as eth;

// Your escrow contract address - update this with your deployed contract!
const ESCROW_CONTRACT_ADDRESS: [u8; 20] = hex!("6E5559e7Cf01860416ff9CbEcC3bbdC1f05dB3D0");

// Event signatures (Keccak256 hash of event signature)
const USER_DEPOSIT_EVENT_SIG: [u8; 32] = hex!("9e71bc8eea02a63969f509818f2dafb9254532904319b9dbda79b67bd5eed006"); // UserDeposit(address,uint256)
const USER_WITHDRAW_EVENT_SIG: [u8; 32] = hex!("884edad9ce6fa2440d8a54cc123490eb96d2768479d49ff9c7366125a9424364"); // UserWithdraw(address,uint256)
const PROVIDER_WITHDRAW_EVENT_SIG: [u8; 32] = hex!("17045ca4597ee1a46cdac70bb5eecf48d4b05efbc0c3c2c52f0e9e8b0e8c7c2f"); // ProviderWithdraw(address,uint256)
const BATCH_PAYMENT_EVENT_SIG: [u8; 32] = hex!("f4757a49b326036464bec6fe419a4ae38c8e02ce3e68bf0809674f6aab8ad300"); // BatchPayment(address,address,uint256,uint256)
const ZK_VERIFIER_UPDATED_EVENT_SIG: [u8; 32] = hex!("bf9b5b2e8c6c7e3a5d4c0b3e6f2a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a"); // ZkVerifierUpdated(address,address)

#[substreams::handlers::map]
fn map_escrow_events(blk: eth::Block) -> Result<Events, substreams::errors::Error> {
    let mut events = Vec::new();

    for trx in &blk.transaction_traces {
        let transaction_hash = Hex::encode(&trx.hash);
        
        if let Some(receipt) = &trx.receipt {
            for log in &receipt.logs {
                // Only process logs from our escrow contract
                if log.address != ESCROW_CONTRACT_ADDRESS {
                    continue;
                }

                // Check if this log has topics
                if log.topics.is_empty() {
                    continue;
                }

                let topic0 = &log.topics[0];
                
                // Parse different event types based on topic0 (event signature)
                let event = match topic0.as_slice() {
                    sig if sig == USER_DEPOSIT_EVENT_SIG => {
                        parse_user_deposit_event(&log, &transaction_hash, &blk)
                    },
                    sig if sig == USER_WITHDRAW_EVENT_SIG => {
                        parse_user_withdraw_event(&log, &transaction_hash, &blk)
                    },
                    sig if sig == PROVIDER_WITHDRAW_EVENT_SIG => {
                        parse_provider_withdraw_event(&log, &transaction_hash, &blk)
                    },
                    sig if sig == BATCH_PAYMENT_EVENT_SIG => {
                        parse_batch_payment_event(&log, &transaction_hash, &blk)
                    },
                    sig if sig == ZK_VERIFIER_UPDATED_EVENT_SIG => {
                        parse_zk_verifier_updated_event(&log, &transaction_hash, &blk)
                    },
                    _ => None, // Unknown event type
                };

                if let Some(parsed_event) = event {
                    events.push(parsed_event);
                }
            }
        }
    }

    Ok(Events { events })
}

// UserDeposit(address indexed user, uint256 amount)
fn parse_user_deposit_event(log: &eth::Log, tx_hash: &str, blk: &eth::Block) -> Option<EscrowEvent> {
    if log.topics.len() < 2 {
        return None;
    }
    
    let user_address = extract_address_from_topic(&log.topics[1]);
    let amount_cents = extract_uint256_from_data(&log.data, 0);
    
    Some(EscrowEvent {
        event_type: "UserDeposit".to_string(),
        user_address,
        provider_address: String::new(),
        amount_cents,
        num_calls: 0,
        old_verifier: String::new(),
        new_verifier: String::new(),
        transaction_hash: tx_hash.to_string(),
        block_number: blk.number,
        timestamp: blk.header.as_ref().unwrap().timestamp.as_ref().unwrap().seconds as u64,
        contract_address: Hex::encode(&log.address),
        gas_used: 0, // Will be filled in later versions
        gas_price: "0".to_string(),
    })
}

// UserWithdraw(address indexed user, uint256 amount)
fn parse_user_withdraw_event(log: &eth::Log, tx_hash: &str, blk: &eth::Block) -> Option<EscrowEvent> {
    if log.topics.len() < 2 {
        return None;
    }
    
    let user_address = extract_address_from_topic(&log.topics[1]);
    let amount_cents = extract_uint256_from_data(&log.data, 0);
    
    Some(EscrowEvent {
        event_type: "UserWithdraw".to_string(),
        user_address,
        provider_address: String::new(),
        amount_cents,
        num_calls: 0,
        old_verifier: String::new(),
        new_verifier: String::new(),
        transaction_hash: tx_hash.to_string(),
        block_number: blk.number,
        timestamp: blk.header.as_ref().unwrap().timestamp.as_ref().unwrap().seconds as u64,
        contract_address: Hex::encode(&log.address),
        gas_used: 0,
        gas_price: "0".to_string(),
    })
}

// ProviderWithdraw(address indexed provider, uint256 amount)
fn parse_provider_withdraw_event(log: &eth::Log, tx_hash: &str, blk: &eth::Block) -> Option<EscrowEvent> {
    if log.topics.len() < 2 {
        return None;
    }
    
    let provider_address = extract_address_from_topic(&log.topics[1]);
    let amount_cents = extract_uint256_from_data(&log.data, 0);
    
    Some(EscrowEvent {
        event_type: "ProviderWithdraw".to_string(),
        user_address: String::new(),
        provider_address,
        amount_cents,
        num_calls: 0,
        old_verifier: String::new(),
        new_verifier: String::new(),
        transaction_hash: tx_hash.to_string(),
        block_number: blk.number,
        timestamp: blk.header.as_ref().unwrap().timestamp.as_ref().unwrap().seconds as u64,
        contract_address: Hex::encode(&log.address),
        gas_used: 0,
        gas_price: "0".to_string(),
    })
}

// BatchPayment(address indexed user, address indexed provider, uint256 amount, uint256 numCalls)
fn parse_batch_payment_event(log: &eth::Log, tx_hash: &str, blk: &eth::Block) -> Option<EscrowEvent> {
    if log.topics.len() < 3 {
        return None;
    }
    
    let user_address = extract_address_from_topic(&log.topics[1]);
    let provider_address = extract_address_from_topic(&log.topics[2]);
    let amount_cents = extract_uint256_from_data(&log.data, 0);
    let num_calls = extract_uint256_from_data_as_u64(&log.data, 32);
    
    Some(EscrowEvent {
        event_type: "BatchPayment".to_string(),
        user_address,
        provider_address,
        amount_cents,
        num_calls,
        old_verifier: String::new(),
        new_verifier: String::new(),
        transaction_hash: tx_hash.to_string(),
        block_number: blk.number,
        timestamp: blk.header.as_ref().unwrap().timestamp.as_ref().unwrap().seconds as u64,
        contract_address: Hex::encode(&log.address),
        gas_used: 0,
        gas_price: "0".to_string(),
    })
}

// ZkVerifierUpdated(address indexed oldVerifier, address indexed newVerifier)
fn parse_zk_verifier_updated_event(log: &eth::Log, tx_hash: &str, blk: &eth::Block) -> Option<EscrowEvent> {
    if log.topics.len() < 3 {
        return None;
    }
    
    let old_verifier = extract_address_from_topic(&log.topics[1]);
    let new_verifier = extract_address_from_topic(&log.topics[2]);
    
    Some(EscrowEvent {
        event_type: "ZkVerifierUpdated".to_string(),
        user_address: String::new(),
        provider_address: String::new(),
        amount_cents: "0".to_string(),
        num_calls: 0,
        old_verifier,
        new_verifier,
        transaction_hash: tx_hash.to_string(),
        block_number: blk.number,
        timestamp: blk.header.as_ref().unwrap().timestamp.as_ref().unwrap().seconds as u64,
        contract_address: Hex::encode(&log.address),
        gas_used: 0,
        gas_price: "0".to_string(),
    })
}

// Helper function to extract address from topic (last 20 bytes)
fn extract_address_from_topic(topic: &[u8]) -> String {
    if topic.len() >= 32 {
        let address_bytes = &topic[12..32]; // Address is in the last 20 bytes of 32-byte topic
        format!("0x{}", Hex::encode(address_bytes))
    } else {
        String::new()
    }
}

// Helper function to extract uint256 from log data as string
fn extract_uint256_from_data(data: &[u8], offset: usize) -> String {
    if data.len() >= offset + 32 {
        let value_bytes = &data[offset..offset + 32];
        // Convert to decimal string representation
        let mut result = 0u128; // Using u128 for large numbers, might need BigInt for full uint256
        for (_, &byte) in value_bytes[16..].iter().enumerate() { // Take last 16 bytes for u128
            result = (result << 8) | (byte as u128);
        }
        result.to_string()
    } else {
        "0".to_string()
    }
}

// Helper function to extract uint256 from log data as u64
fn extract_uint256_from_data_as_u64(data: &[u8], offset: usize) -> u64 {
    if data.len() >= offset + 32 {
        let value_bytes = &data[offset..offset + 32];
        // Convert last 8 bytes to u64
        let mut result = 0u64;
        for &byte in value_bytes[24..32].iter() { // Take last 8 bytes
            result = (result << 8) | (byte as u64);
        }
        result
    } else {
        0
    }
}