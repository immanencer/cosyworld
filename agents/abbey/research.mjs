import RadioResearcher from './radio-researcher.mjs';

async function main() {
  const researcher = new RadioResearcher();
  // Start continuous analysis
  await researcher.startAnalysis(30); // Checks every 30 minutes

  
}

main().catch(console.error);