use poseidon::poseidon;

fn main(
    individual_usages: [Field; 4], // Array of individual API call token costs
    response_data: [Field; 4],
    status_code: Field,
    nonce: Field,
    num_calls: Field,  // Actual number of calls made
    expected_commitment: pub Field,
    expected_status: pub Field,
    total_claimed_usage:pub Field,   // Claimed total token usage
) {

    let mut calculated_total: Field = 0;
    for i in 0..4 {
        // Only count calls within the valid range
        let is_valid_call = if i < num_calls as u32 { 1 } else { 0 };
        calculated_total = calculated_total + (individual_usages[i] * is_valid_call);
    }
    
    // The calculated total must match the claimed total
    assert(calculated_total == total_claimed_usage);

    let response_hash = poseidon::bn254::hash_6([
        status_code,
        response_data[0],
        response_data[1],
        response_data[2],
        response_data[3],
        nonce
    ]);

    assert(response_hash == expected_commitment);
    assert(status_code == expected_status);
}