'use script';
const path = require('path');
const webpack = require('webpack');
var webpackMerge = require('webpack-merge');

var baseConfig = {
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, '')
  },
  module: {
  	rules: [
  		{
  			test: /\.(js|jsx|ts|tsx)$/,
  			exclude: /node_modules/,
  			loader: "babel-loader",
  			options: {
  			  presets: ['es2015']
  			},
			include: [path.resolve(__dirname, 'src')]
  		}
  	]
  },
  plugins: [
  ]
};
let renderer = webpackMerge(baseConfig, {
	    target: 'electron-renderer',
		entry: {
		  renderer: './src/renderer.js'
		}
	  });
let bdrenderer = webpackMerge(baseConfig, {
	    target: 'electron-renderer',
		entry: {
		  bdrenderer: './src/bdrenderer.js'
		}
	  });
let sharerenderer = webpackMerge(baseConfig, {
	    target: 'electron-renderer',
		entry: {
		  sharerenderer: './src/sharerenderer.js'
		}
	  });
let videorenderer = webpackMerge(baseConfig, {
	    target: 'electron-renderer',
		entry: {
		  videorenderer: './src/videorenderer.js'
		}
	  });
let viewpagerenderer = webpackMerge(baseConfig, {
	    target: 'electron-renderer',
		entry: {
		  viewpagerenderer: './src/viewpagerenderer.js'
		}
	  });
let index = {
	    target: 'electron-main',
		entry: {
		  index: './src/index.js'
		},
		output: {
		  filename: '[name].js',
		  path: path.resolve(__dirname, '')
		},
		module: {
			rules: [
				{
					test: /\.(js|jsx|ts|tsx)$/,
					exclude: /node_modules/,
					loader: "babel-loader",
					options: {
					  presets: ['es2015']
					},
					include: [path.resolve(__dirname, 'src')]
				}
			]
		},
		node:{
			"aws-sdk":"empty",
			sqlite3:"empty"
		}
	  };

// module.exports = [renderer, bdrenderer, sharerenderer, videorenderer, viewpagerenderer, index];
module.exports = [index];
