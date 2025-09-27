mod pb;

use hex_literal::hex;
use pb::eth::escrow::v1::{Events, EscrowEvent};
use substreams::Hex;
use substreams_ethereum::pb::eth::v2 as eth;

// Your escrow contract address - update this!
const ESCROW_CONTRACT_ADDRESS: [u8; 20] = hex!("AA7D40462658331898CFe6597012C495F6a76302");

#[substreams::handlers::map]
fn map_escrow_events(blk: eth::Block) -> Result<Events, substreams::errors::Error> {
    let mut events = Vec::new();

    for trx in blk.transaction_traces {
        for log in trx.receipt.unwrap().logs {
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
            match topic0.as_slice() {
                _ if topic0.len() >= 32 => {
                    // For demo purposes, we'll just detect any event from the contract
                    // In a real implementation, you'd match the actual event signatures
                    
                    let event_type = if log.topics.len() >= 4 {
                        "EscrowCreated"
                    } else if log.topics.len() >= 2 {
                        "EscrowCompleted"
                    } else {
                        "EscrowRefunded"
                    };
                    
                    let escrow_id = if log.topics.len() > 1 {
                        Hex::encode(&log.topics[1])
                    } else {
                        "0".to_string()
                    };
                    
                    let buyer = if log.topics.len() > 2 {
                        Hex::encode(&log.topics[2])
                    } else {
                        "".to_string()
                    };
                    
                    let seller = if log.topics.len() > 3 {
                        Hex::encode(&log.topics[3])
                    } else {
                        "".to_string()
                    };

                    events.push(EscrowEvent {
                        event_type: event_type.to_string(),
                        escrow_id,
                        buyer,
                        seller,
                        amount: Hex::encode(&log.data),
                        transaction_hash: Hex::encode(&trx.hash),
                        block_number: blk.number,
                        timestamp: blk.header.as_ref().unwrap().timestamp.as_ref().unwrap().seconds as u64,
                        contract_address: Hex::encode(&log.address),
                    });
                }
                _ => continue,
            }
        }
    }

    Ok(Events { events })
}