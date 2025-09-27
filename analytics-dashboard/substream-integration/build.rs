use std::path::PathBuf;

fn main() {
    let out_dir = PathBuf::from(std::env::var("OUT_DIR").unwrap());
    
    tonic_build::configure()
        .build_server(false)
        .out_dir(&out_dir)
        .compile(&["proto/escrow.proto"], &["proto"])
        .unwrap_or_else(|e| panic!("Failed to compile protos {:?}", e));
    
    println!("cargo:rerun-if-changed=proto/escrow.proto");
    println!("cargo:rerun-if-changed=proto");
}