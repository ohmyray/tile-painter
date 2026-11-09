import fs from 'fs';

// Get a list of the directory names
const dirNames = fs
  .readdirSync('./', { withFileTypes: true })
  .filter(d => d.isDirectory())
  .map(d => d.name);

// Function to make a rolldown config object from a directory name
function makeConfig(dir) {
  return {
    input: dir + '/main.js',
    output: {
      file: dir + '/main.min.js',
      format: 'iife',
      name: 'app',
    },
  };
}

export default dirNames.map(makeConfig);
