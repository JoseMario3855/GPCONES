const iliService = require('../services/iliService');
const { exec } = require('child_process');

async function main() {
  const cmd = await iliService.getILI2PGCommand();
  console.log('Class-path command generated:', cmd);

  exec(`${cmd} --help`, (err, stdout, stderr) => {
    console.log('stdout:', stdout ? stdout.substring(0, 500) : '(empty)');
    console.log('stderr:', stderr ? stderr.substring(0, 500) : '(empty)');
    if (err) {
      console.error('Error object:', err.message);
    }
    process.exit(0);
  });
}

main().catch(e => { console.error(e); process.exit(1); });
