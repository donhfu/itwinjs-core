/*---------------------------------------------------------------------------------------------
 * Copyright (c) 2019 Bentley Systems, Incorporated. All rights reserved.
 * Licensed under the MIT License. See LICENSE.md in the project root for license terms.
 *--------------------------------------------------------------------------------------------*/

const path = require("path");
const webpack = require("webpack");
const fs = require("fs");
const config = require("@bentley/config-loader/lib/IModelJsConfig").IModelJsConfig;
config.init();
const outputDir = path.resolve(__dirname, "../../../lib/test/ios/webpack");
const configFile = path.join(outputDir, "config.json");
const filteredEnv = Object.keys(process.env)
  .filter(key => key.match(/^imjs_|^hybrid_test_|^saml_delegation_test_/i))
  .reduce((obj, key) => {
    obj[key] = process.env[key];
    return obj;
  }, {});

fs.writeFileSync(configFile, JSON.stringify(filteredEnv, undefined, 2));
module.exports = {
  mode: "development",
  entry: "./lib/test/runMochaTestsDirectly.js",
  output: {
    path: outputDir,
    filename: "runMochaTestsDirectly.js",
    libraryTarget: "commonjs2",
  },
  target: "webworker",
  devtool: "source-map",
  module: {
    rules: [{
      test: /growl\.js$/,
      use: 'null-loader'
    },
    {
      test: /xunit\.js$/,
      use: 'null-loader'
    },
    {
      test: /bunyan/,
      use: 'null-loader'
    },
    {
      test: /@azure/,
      use: 'null-loader'
    },
    {
      test: /core\/clients-backend\/lib\/util\/AzCopy.js$/,
      use: 'null-loader'
    },
    {
      test: /core\/clients-backend\/lib\/test\/imodelhub\/IModelBankCloudEnv.js$/,
      use: 'null-loader'
    },
    {
      test: /core\/backend\/lib\/DevTools\.js/,
      use: 'null-loader'
    }
    ]
  },
  node: {
    process: false
  },
  externals: {
    "@bentley/imodeljs-native/package.json": "@bentley/imodeljs-native/package.json",
    "@bentley/imodeljs-native/loadNativePlatform.js": "@bentley/imodeljs-native/loadNativePlatform.js",
    "electron": "electron",
    "IModelJsFs": "IModelJsFs",
    "./IModelJsFs": "IModelJsFs",
    "../IModelJsFs": "IModelJsFs",
    "../../IModelJsFs": "IModelJsFs",
    "./lib/IModelJsFs.js": "IModelJsFs",
    "fs": "fs",
    "fs-extra": "fs",
    "express": "express",
  },
  stats: {
    warnings: false
  },
  plugins: [
    new webpack.DefinePlugin({ "global.location.search": "''" }),
    new webpack.ProvidePlugin({}),
    new webpack.EnvironmentPlugin({})
  ],
}