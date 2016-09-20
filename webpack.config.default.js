/* eslint import/no-extraneous-dependencies:0 */
/**
 * Created by scott on 16-5-6.
 */

'use strict'

const path = require('path')
const _ = require('lodash')
const webpack = require('webpack')
const autoPrefixer = require('autoprefixer')
const glob = require('glob')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const ProgressBarPlugin = require('progress-bar-webpack-plugin')

const butil = require('brickyard3/lib/util')

module.exports = {
	make: function (runtime, configFactory) {
		const commonWebpackConfig = constructCommon(runtime.config)

		const targetWebpackConfig = configFactory(runtime.config, commonWebpackConfig)

		targetWebpackConfig.plugins.push(
			defineGlobalVars(runtime.config, targetWebpackConfig.debug),
			...createEntries(runtime.plugins)
		)

		targetWebpackConfig.entry.main.push(...Object.keys(runtime.plugins))

		const pluginAliases = aliasPlugins(runtime.plugins)

		const pluginsWebpackConfig = mergeWebpackConfigOfPlugins(runtime.plugins)

		return _.mergeWith(
			targetWebpackConfig,
			pluginsWebpackConfig,
			commonWebpackConfig,
			{ resolve: { alias: pluginAliases } },
			mergeOperator
		)
	}
}

/**
 * construct the most common webpack config,
 * which can be used in dev mode and release mode
 *
 * @param {Object} config
 * @returns {Object}
 */
function constructCommon(config) {
	const defaultConfig = {
		context: path.resolve(process.cwd(), config.pluginStore),
		output: {
			path: path.join(config.outputBase, 'www')
		},
		module: {
			loaders: [
				// **********************************
				// special
				// **********************************
				{
					test: /jquery$/,
					loader: 'expose?$!expose?jQuery'
				},
				{
					test: /index\.html$/,
					loader: 'html?attrs=link:href img:src use:xlink:href'
				}
			]
		},
		plugins: [
			new webpack.optimize.DedupePlugin(),
			new webpack.ProvidePlugin({
				jQuery: 'jquery',
				$: 'jquery',
				'window.jQuery': 'jquery'
			}),
			new webpack.ResolverPlugin(
				new webpack.ResolverPlugin.DirectoryDescriptionFilePlugin('.bower.json', ['main'])
			),
			new ProgressBarPlugin()
		],
		resolve: {
			extensions: ['', '.webpack.js', '.web.js', '.js'],
			root: [path.resolve(process.cwd(), 'node_modules'), path.join(config.outputBase, 'bower_components')]
		},
		postcss: function () {
			return [
				autoPrefixer({
					browsers: [
						'last 2 versions',
						'> 1%',
						'not ie <= 8'
					],
					add: true
				}),
				require('postcss-normalize-charset')
			]
		},
		eslint: {
			emitError: true,
			emitWarning: false,
			quiet: false,
			failOnWarning: false,
			failOnError: true
		}
	}

	if (config.lint) {
		defaultConfig.module.preLoaders = [
			// style lint
			{
				test: /\.(scss|css)$/,
				loader: 'stylelint'
			},
			// eslint
			{
				test: /\.js$/,
				exclude: /(node_modules|bower_components)/,
				loader: 'eslint-loader'
			}
		]
	}

	return defaultConfig
}

// ==========================================================

/**
 * retrieve webpack config of each plugins,
 * and merge them into one config object
 * @param plugins
 */
function mergeWebpackConfigOfPlugins(plugins) {
	const pattern = butil.getFileGlobPattern('', _.map(plugins, 'raw.path'), 'webpack.config.js')

	return _.mergeWith.apply(_,
		_.chain(glob.sync(pattern))
			.map(_path => require(_path))
			.value()
			.concat([mergeOperator])
	)
}

/**
 * an operator to merge array
 *
 * @param objValue
 * @param srcValue
 */
function mergeOperator(objValue, srcValue) {
	if (Array.isArray(objValue)) {
		return objValue.concat(srcValue)
	}
}

/**
 * create html entries based on each plugin's declaration
 * @param {Array} plugins
 * @returns {Array}
 */
function createEntries(plugins) {
	return _.chain(plugins)
		.map(function (plugin) {
			let entry = _.get(plugin, 'raw.plugin.entry')

			if (!Array.isArray(entry)) {
				entry = [entry]
			}

			return entry.reduce(function (result, value) {
				if (value) {
					result.push(createEntry(path.join(plugin.path, value)))
				}
				return result
			}, [])
		})
		.flatten()
		.compact()
		.value()
}

/**
 * create the html entry file with target template file, using HtmlWebpackPlugin
 * @param _path
 */
function createEntry(_path) {
	return new HtmlWebpackPlugin({
		filename: 'index.html',
		template: _path,
		chunksSortMode: 'dependency'
	})
}

/**
 * create shimming for plugins, then webpack can resolve the plugin correctly
 * @param plugins
 * @returns {*}
 */
function aliasPlugins(plugins) {
	return _.reduce(plugins, function (result, plugin) {
		result[plugin.name] = plugin.path
		return result
	}, {})
}

/**
 * define globals variables for injecting them into source scope
 * @param runtimeConfig
 * @param isDebug
 * @returns {webpack.DefinePlugin}
 */
function defineGlobalVars(runtimeConfig, isDebug) {
	const globals = Object.assign({}, runtimeConfig.globals, {
		APP_DEBUG_MODE: isDebug || !!runtimeConfig.debuggable
	})

	return new webpack.DefinePlugin(globals)
}

