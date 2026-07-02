const { execSync } = require('child_process');
try {
  console.log('Restoring files from stash...');
  execSync('git checkout stash@{0} -- .', { stdio: 'inherit' });
  console.log('Done.');
} catch (e) {
  console.error(e);
}
