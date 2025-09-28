pub mod eth {
    pub mod escrow {
        pub mod v1 {
            include!(concat!(env!("OUT_DIR"), "/eth.escrow.v1.rs"));
        }
    }
}