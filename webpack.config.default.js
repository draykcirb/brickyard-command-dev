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

const butil = require('brickyard/lib/util')

module.exports = {
	make: function (runtime, configFactory) {
		const runtimeConfig = runtime.config

		const defaultConfig = constructDefault(runtimeConfig)

		const targetConfig = configFactory(runtimeConfig, defaultConfig)

		targetConfig.plugins.push(defineGlobals(runtimeConfig, targetConfig.debug))

		const htmlEntries = createEntries(runtime.plugins)

		targetConfig.plugins.push.apply(targetConfig.plugins, htmlEntries)

		const pluginAliases = aliasPlugins(runtime.plugins)

		const pluginsConfig = mergePluginWebpackConfig(runtime.plugins)

		Array.prototype.push.apply(targetConfig.entry.main, Object.keys(runtime.plugins))

		return _.mergeWith(targetConfig, pluginsConfig, defaultConfig, { resolve: { alias: pluginAliases } }, mergeOperator)
	}
}

/**
 * construct the most common webpack config,
 * which can be used in dev mode and release mode
 *
 * @param config
 * @returns Object
 */
function constructDefault(config) {
	return {
		context: path.resolve(process.cwd(), config.pluginStore),
		output: {
			path: path.join(config.outputBase, 'www')
		},
		module: {
			loaders: [
				//**********************************
				// special
				//**********************************
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
			//new ProgressBarPlugin()
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
		}
	}
}

// ==========================================================

/**
 * retrieve webpack config of each plugins,
 * and merge them into one config object
 * @param plugins
 */
function mergePluginWebpackConfig(plugins) {
	const pattern = butil.getFileGlobPattern('', _.map(plugins, 'raw.path'), 'webpack.config.js')

	return _.mergeWith.apply(_,
		_.chain(glob.sync(pattern))
			.map(function (_path) {
				return require(_path)
			})
			.value()
			.concat([mergeOperator])
	)
}

/**
 * an operator to merge array
 *
 * @param objValue
 * @param srcValue
 * @returns {Array|Array.<T>|string|*|Buffer}
 */
function mergeOperator(objValue, srcValue) {
	if (Array.isArray(objValue)) {
		return objValue.concat(srcValue)
	}
}

/**
 * create html entries based on each plugin's declaration
 * @param plugins
 * @returns {*}
 */
function createEntries(plugins) {
	return _.chain(plugins)
		.map(function (plugin) {
			let entry = _.get(plugin, 'raw.plugin.entry')
			if (Array.isArray(entry)) {
				return entry.reduce(function (result, value) {
					result.push(createEntry(path.join(plugin.path, value)))
				}, [])
			} else if (entry) {
				return [createEntry(path.join(plugin.path, entry))]
			} else {
				return null
			}
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
		template: _path
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
function defineGlobals(runtimeConfig, isDebug) {
	const globals = Object.assign({
		APP_DEBUG_MODE: isDebug || runtimeConfig.debuggable
	}, runtimeConfig.globals)

	return new webpack.DefinePlugin(globals)
}

