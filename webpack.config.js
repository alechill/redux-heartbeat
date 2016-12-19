module.exports = {
  entry: './src/index.ts',
  output: {
    path: 'dist',
    filename: 'index.js'
  },
  resolve: {
    extensions: ['.ts']
  },
  module: {
    loaders: [
      { test: /.ts$/, exclude: /npm_modules/, loader: 'ts-loader' }
    ]
  },
  tslint: {
    emitErrors: true,
    failOnHint: true,
    configuration: require('./tslint.json')
  }
}
