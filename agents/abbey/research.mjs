import RadioResearcher from './radio-researcher.mjs';
import SongIntroGenerator from './radio-introducer.mjs';

async function main() {
  const researcher = new RadioResearcher();
  const introducer = new SongIntroGenerator();

  // Start continuous analysis
  await researcher.startAnalysis(30); // Checks every 30 minutes
  await introducer.startProcessing(60 * 24); // Checks every 30 minutes

  
}

main().catch(console.error);