const webpack = require('webpack')
const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin');
const path = require('path');

module.exports = {
  mode: 'production',
  target: 'web',
  entry: {
    main: __dirname + '/src/index.mjs',
    sw: __dirname + '/src/sw.mjs'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js'
  },
  //devtool: 'source-map',
  module: {
    rules: [
      {
        test: /\.css/,
        use: [
          "style-loader",
          {
            loader: "css-loader",
          }
        ]
      }
    ]
  },
  plugins: [
    new webpack.DefinePlugin({
       __BUILD_TIMESTAMP__: JSON.stringify(new Date().toISOString())
    }),
    new MonacoWebpackPlugin({
      languages: ['typescript', 'javascript', 'html', 'css']
    })
  ]
}
