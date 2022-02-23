module.exports = {
  mode: 'production',
  target: 'web',
  entry: {
    main: __dirname + '/src/index.mjs',
    sw: __dirname + '/src/sw.mjs'
  },
  output: {
    path: __dirname + '/dist',
    filename: '[name].js'
  },
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
  }
}
