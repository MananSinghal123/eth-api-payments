import { fetchSubstream } from "@substreams/core";

const main = async () => {
  try {
    const SPKG_PATH = "https://github.com/streamingfast/substreams-eth-block-meta/releases/download/v0.5.1/substreams-eth-block-meta-v0.5.1.spkg";
    
    console.log("🔄 Loading substream package...");
    const substream = await fetchSubstream(SPKG_PATH);
    
    console.log("📦 Package info:", {
      name: substream.package?.name,
      version: substream.package?.version,
    });
    
    console.log("🔧 Available modules:");
    substream.modules?.modules.forEach((module, index) => {
      console.log(`  ${index + 1}. ${module.name} (${module.kind})`);
    });
    
  } catch (error) {
    console.error("Error:", error.message);
  }
};

main();