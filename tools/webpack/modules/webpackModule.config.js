/*---------------------------------------------------------------------------------------------
* Copyright (c) 2019 Bentley Systems, Incorporated. All rights reserved.
* Licensed under the MIT License. See LICENSE.md in the project root for license terms.
*--------------------------------------------------------------------------------------------*/

// This script sets module.export to the proper value for webpacking one of our packages as a Universal Module Definition library.
// All of the package's open source dependencies are set to external.
// All the other @bentley dependencies are set to external.

// arguments (specified on the package.json script line)
// env.outdir= : the output directory for the webpack result, relative to the package file dir. (Optional. If not specified, use ./lib/module/{env.prod ? "prod", "dev"}/
// env.entry= : the entry point of the module in the compiled file (e.g. ./lib/imodeljs-frontend.js). Required
// env.bundlename= : the name of the bundled module (e.g. imodeljs-frontend). Required
// env.stylesheets : if specified (no value needed), sets up webpack to process .scss files into the bundle. Optional.
// env.prod : if specified, makes the production version of the module. (Optional. If not specified, builds the development version)
// env.htmltemplate: if specified, reads the html template and substitutes the versions required into the lodash tempolate '<%= htmlWebpackPlugin.options.imjsVersions %>',
//                   which should appear as the value for the data-imjsversions property of the IModelJsLoader script tag.
// env.plugin: if specified, saves the versions of the iModelJs modules required into the webpack output so that the plugin can verify their presence at runtime.

const path = require("path");
const fs = require("fs-extra");
const webpack = require("webpack");
const UglifyJSPlugin = require('uglifyjs-webpack-plugin');
const SpriteLoaderPlugin = require("svg-sprite-loader/plugin");
const autoprefixer = require("autoprefixer");

// NOTE: This was set up to return an array of configs, one for target: "web" and one for target: "node", but the node target didn't work, so I dropped it.
module.exports = (env) => { return getConfig(env); };

function getIModelJsVersionsFromPackage(iModelJsVersions, packageContents, sourceDir, externalList, depth) {
  // we need the dependents and peer dependents. We care only about those that start with @bentley and are also in externalList.
  let dependentsAndPeerDependents = [];
  if (packageContents.dependencies)
    dependentsAndPeerDependents = Object.getOwnPropertyNames(packageContents.dependencies);
  if (packageContents.peerDependencies)
    dependentsAndPeerDependents = dependentsAndPeerDependents.concat(Object.getOwnPropertyNames(packageContents.peerDependencies));
  for (dependent of dependentsAndPeerDependents) {
    if (dependent.startsWith("@bentley") && externalList[dependent]) {
      const packageName = dependent.substr(9);
      // if we don't already have it, get its info.
      if (!iModelJsVersions[packageName]) {
        const version = packageContents.dependencies[dependent] || packageContents.peerDependencies[dependent];
        iModelJsVersions[packageName] = version;
      }
    }
  }

  // we need to get the versions of the next level of @bentley dependents (but only one deep, that's enough to find them all)
  if (depth < 1) {
    for (dependent of dependentsAndPeerDependents) {
      if (dependent.startsWith("@bentley") && externalList[dependent]) {
        const subDirectory = path.join(sourceDir, "node_modules", dependent);
        const dependentPackageContents = getPackageFromJson(subDirectory);
        getIModelJsVersionsFromPackage(iModelJsVersions, dependentPackageContents, subDirectory, externalList, depth + 1);
      }
    }
  }
}

// gets a Map with the dependent iModel.js modules as the keys and the required version as the values.
function getIModelJsVersions(sourceDir, packageContents, externalList) {
  const iModelJsVersions = new Object();
  getIModelJsVersionsFromPackage(iModelJsVersions, packageContents, sourceDir, externalList, 0);
  return iModelJsVersions;
}


// gets the version from this modules package.json file, so it can be injected into the output.
function getPackageFromJson(sourceDir) {
  const packageFileName = path.resolve(sourceDir, "./package.json");
  const packageFileContents = fs.readFileSync(packageFileName, "utf8");
  const packageContents = JSON.parse(packageFileContents);
  return packageContents;
}

function dropDashes(name) {
  return name.replace("-", "_");
}

function getConfig(env) {
  // sourceDir is always the current directory, which npm sets to that of the package file.
  const sourceDir = process.cwd();

  if (!env.outdir)
    env.outdir = "./lib/module" + (env.prod ? "/prod" : "/dev");

  // get the directory for the bundle.
  bundleDirectory = path.resolve(sourceDir, env.outdir);

  // the context directory (for looking up imports, etc.) is the original module source directory.
  const contextDirectory = path.resolve(sourceDir);

  // unless specified with env.prod, create a development build.
  const devMode = !(env.prod);

  // this is the "barrel" file of the module, which imports all of the sources.
  const bundleEntry = env.entry;

  // name of the output bundle.
  const bundleName = env.bundlename;

  // get the version number for the javascript currently being webpacked.
  const packageContents = getPackageFromJson(sourceDir);

  // build the object for the webpack configuration
  const webpackLib = {
    bail: true,                    // don't continue on error.
    context: contextDirectory,
    output: {
      path: bundleDirectory,
      filename: '[name].js',
      library: dropDashes(bundleName),
      libraryTarget: 'umd',
      umdNamedDefine: true,
      jsonpFunction: 'webpackJsonp',  // used only for web target
      globalObject: 'this',           // used only for web target.
      devtoolModuleFilenameTemplate: "file:///[absolute-resource-path]"
    },
    target: env.webworker ? 'webworker' : 'web',
    externals: {
      '@bentley/bentleyjs-core': 'bentleyjs_core',
      '@bentley/geometry-core': 'geometry_core',
      '@bentley/imodeljs-i18n': 'imodeljs_i18n',
      '@bentley/imodeljs-clients': 'imodeljs_clients',
      '@bentley/imodeljs-common': 'imodeljs_common',
      '@bentley/imodeljs-quantity': 'imodeljs_quantity',
      '@bentley/imodeljs-frontend': 'imodeljs_frontend',
      '@bentley/ui-core': 'ui_core',
      '@bentley/ui-components': 'ui_components',
      '@bentley/ui-framework': 'ui_framework',
      '@bentley/ui-ninezone': 'ui_ninezone',
      '@bentley/presentation-common': 'presentation_common',
      '@bentley/presentation-components': 'presentation_components',
      '@bentley/presentation-frontend': 'presentation_frontend',
      'react': { root: 'React', commonjs2: 'react', commonjs: 'react', amd: 'react' },
      'react-dnd': { root: 'ReactDnD', commonjs2: 'react-dnd', commonjs: 'react-dnd', amd: 'react-dnd' },
      'react-dnd-html5-backend': { root: 'ReactDnDHTML5Backend', commonjs2: 'react-dnd5-html-backend', commonjs: 'react-dnd5-html-backend', amd: 'react-dnd5-html-backend' },
      'react-dom': { root: 'ReactDOM', commonjs2: 'react-dom', commonjs: 'react-dom', amd: 'react-dom' },
      'react-redux': { root: 'ReactRedux', commonjs2: 'react-redux', commonjs: 'react-redux', amd: 'react-redux' },
      'redux': { root: 'Redux', commonjs2: 'redux', commonjs: 'redux', amd: 'redux' },
      'inspire-tree': { root: 'InspireTree', commonjs2: 'inspire-tree', commonjs: 'inspire-tree', amd: 'inspire-tree' },
      'lodash': { root: '_', commonjs2: 'lodash', commonjs: 'lodash', amd: 'lodash' },
      'electron': 'commonjs electron',
    },
    optimization: {
      // create only one runtime chunk.
      moduleIds: "named",
    },
    node: {
      Buffer: true,
      fs: "empty",
      process: true
    },
    plugins: []
  };

  // we want to separate out the runtimeChunk, except in the webworker case.
  if (!env.webworker) {
    webpackLib.optimization.runtimeChunk = "single";
  }

  // Set up for the DefinePlugin. We always want the BUILD_SEMVER to be available in the webpacked module, will add more definitions as needed.
  definePluginDefinitions = { "BUILD_SEMVER": JSON.stringify(packageContents.version) };

  webpackLib.entry = {}
  webpackLib.entry[bundleName] = bundleEntry;
  webpackLib.mode = devMode ? "development" : "production";
  webpackLib.devtool = devMode ? "cheap-module-source-map" : "source-map";

  // Loaders setup:
  // always use source-map-loader, use strip-assert-loader on production builds;
  const stripAssertLoader = path.resolve(__dirname, "../config/strip-assert-loader.js");
  const sourceMapLoader = require.resolve("source-map-loader");
  const jsLoaders = env.prod ? [sourceMapLoader, stripAssertLoader] : [sourceMapLoader];
  webpackLib.module = {};
  webpackLib.module.rules = [{
    test: /\.js$/,
    enforce: "pre",
    use: jsLoaders
  }];

  // set up Uglify.
  if (!devMode) {
    webpackLib.optimization.minimizer = [
      new UglifyJSPlugin({
        uglifyOptions: {
          ecma: 8,
          mangle: {
            safari10: true,
            // NEEDSWORK: Mangling classnames appears to break gateway marshalling...
            keep_classnames: true,
          },
          compress: {
            warnings: false,
            // Disabled because of an issue with Uglify breaking seemingly valid code:
            // https://github.com/facebook/create-react-app/issues/2376
            // Pending further investigation:
            // https://github.com/mishoo/UglifyJS2/issues/2011
            comparisons: false,
            // Compressing classnames also breaks reflection
            keep_classnames: true,
          },
          output: {
            comments: false,
            // Turned on because emoji and regex is not minified properly using default
            // https://github.com/facebook/create-react-app/issues/2488
            ascii_only: true,
          },
        },
        // Use multi-process parallel running to improve the build speed
        // Default number of concurrent runs: os.cpus().length - 1
        parallel: true,
        // Enable file caching
        cache: true,
        sourceMap: true,
      }),
    ];
  }

  // env.htmltemplate is passed to webpackModule.config.js only for applications that are creating an HtmlTemplate.
  // The reason for it is to set the version of the iModelJs modules that the application requires into index.html.
  // It gets that by reading the version of imodeljs-frontend listed in package.json.
  if (env.htmltemplate || env.plugin) {
    const iModelJsVersions = getIModelJsVersions(sourceDir, packageContents, webpackLib.externals);

    if (env.htmltemplate) {
      const HtmlWebpackPlugin = require("html-webpack-plugin");
      const versionString = JSON.stringify(iModelJsVersions);
      webpackLib.plugins.push(new HtmlWebpackPlugin({
        imjsVersions: versionString,
        template: env.htmltemplate,
        filename: "./index.html",
        minify: "false",
        chunks: [],     // we don't want it to add any .js to the template, those are already in there.
      }));
    }

    if (env.plugin) {

      // correct the keys with something like 0.190.0-dev.8 to something like ">0.190.0.dev-0" otherwise the semver matching is too strict.
      for (const key in iModelJsVersions) {
        if (iModelJsVersions.hasOwnProperty(key)) {
          const moduleVersion = iModelJsVersions[key];
          const dashPosition = moduleVersion.indexOf("-");
          if (-1 !== dashPosition) {
            const lastNumPosition = moduleVersion.lastIndexOf('.');
            if ((-1 !== lastNumPosition) && (lastNumPosition > dashPosition)) {
              iModelJsVersions[key] = ">" + moduleVersion.slice(0, lastNumPosition + 1) + "0";
            }
          }
        }
      }

      const versionString = JSON.stringify(iModelJsVersions);
      definePluginDefinitions.IMODELJS_VERSIONS_REQUIRED = JSON.stringify(versionString);
      definePluginDefinitions.PLUGIN_NAME = JSON.stringify(bundleName);
    }
  }

  // add the DefinePlugin.
  webpackLib.plugins.push(new webpack.DefinePlugin(definePluginDefinitions));

  // if using style sheets (import "xxx.scss" lines in .ts or .tsx files), then we need the sass-loader
  if (env.stylesheets) {
    cssRules = [{
      test: /\.scss$/,
      use: {
        loader: require.resolve("sass-loader"),
        options: {
          includePaths: [path.resolve(contextDirectory, "node_modules")],
          outputStyle: "compressed",
        },
      },
      enforce: "pre",
    },
    {
      // "oneOf" will traverse all following loaders until one will
      // match the requirements. When no loader matches it will fall
      // back to the "file" loader at the end of the loader list.
      oneOf: [
        // "url" loader works just like "file" loader but it also embeds
        // assets smaller than specified size as data URLs to avoid requests.
        // "style" loader turns CSS into JS modules that inject <style> tags.
        // In development "style" loader enables hot editing of CSS.
        {
          test: /\.s?css$/,
          use: [
            require.resolve("style-loader"),
            {
              loader: require.resolve("css-loader"),
              options: {
                importLoaders: 1,
              },
            },
            {
              loader: require.resolve("postcss-loader"),
              options: {
                // Necessary for external CSS imports to work
                // https://github.com/facebook/create-react-app/issues/2677
                ident: "postcss",
                plugins: () => [
                  require("postcss-flexbugs-fixes"),
                  autoprefixer({
                    browsers: [
                      ">1%",
                      "last 4 versions",
                      "Firefox ESR",
                      "not ie < 9", // React doesn't support IE8 anyway
                    ],
                    flexbox: "no-2009",
                  }),
                ],
              },
            },
          ]
        },
        {
          test: [/\.bmp$/, /\.gif$/, /\.jpe?g$/, /\.png$/],
          use: {
            loader: require.resolve("url-loader"),
            options: {
              limit: 10000,
              name: "static/media/[name].[hash:8].[ext]",
            },
          }
        },
        {
          test: /\.svg$/,
          issuer: { exclude: /\.css$/ },
          use: {
            loader: require.resolve("svg-sprite-loader"),
            options: {
              runtimeCompat: true,
              spriteFilename: "sprite-[hash:6].svg"
            },
          }
        },
        // "file" loader makes sure assets end up in the `lib` folder.
        // When you `import` an asset, you get its filename.
        // This loader doesn't use a "test" so it will catch all modules
        // that fall through the other loaders.
        {
          // Exclude `js` files to keep "css" loader working as it injects
          // its runtime that would otherwise be processed through "file" loader.
          // Also exclude `html` and `json` extensions so they get processed
          // by webpacks internal loaders.
          exclude: [/\.(js|jsx|mjs)$/, /\.html$/, /\.json$/],
          use: {
            loader: require.resolve("file-loader"),
            options: {
              name: "static/media/[name].[hash:8].[ext]",
            },
          }
        },
        // ** STOP ** Are you adding a new loader?
        // Make sure to add the new loader(s) before the "file" loader.
      ],
    },
    ];

    webpackLib.module.rules = webpackLib.module.rules.concat(cssRules);
    webpackLib.plugins.push(new SpriteLoaderPlugin());
  }

  webpackLib.output.library = dropDashes(webpackLib.output.library);
  // console.log ("webpackLib :",  webpackLib);

  return webpackLib;
}