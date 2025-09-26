fn main(
    individual_usages: [Field; 4], // Array of individual API call token costs 
    num_calls: u32,                // Actual number of calls made
    total_claimed_usage: pub Field // Claimed total token usage
) {
    let mut calculated_total: Field = 0;
    for i in 0u32..4u32 {
        // Only count calls within the valid range
        let is_valid_call = if i < num_calls { 1 } else { 0 };
        calculated_total = calculated_total + (individual_usages[i] * is_valid_call);
    }
    // The calculated total must match the claimed total
    assert(calculated_total == total_claimed_usage);
}