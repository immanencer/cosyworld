import RadioResearcher from './radio-researcher.mjs';

async function main() {
  const researcher = new RadioResearcher();
  
  // Start continuous analysis
  await researcher.startAnalysis(30); // Checks every 30 minutes
  
  // Or get analysis for a specific track
  const analysis = await researcher.getAnalysis('trackId');
  console.log(analysis);
}

main().catch(console.error);