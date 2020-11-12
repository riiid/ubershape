const path = require('path');
const {execSync} = require('child_process');

const extensionPath = path.resolve(__dirname, '../dist/ubershape.vsix');

execSync(`code --install-extension ${extensionPath}`, {
  'stdio': 'inherit',
  'sterr': 'inherit',
});
