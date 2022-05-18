const path = require('path');

module.exports = {
    mode: 'development',
    watch: true,
    module: {
      rules: [{
        exclude: '/src/main.js',
      }],
    },
    output: {
      filename: '../src/main.js'
    }
  };
  