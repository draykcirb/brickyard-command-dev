/* eslint indent: 1 */
/**
 * Created by scott on 16-4-5.
 */
'use strict'

const webpack = require('webpack')
const url = require('url')

const BrowserSyncPlugin = require('browser-sync-webpack-plugin')
const AnyBarWebpackPlugin = require('anybar-webpack')
const configDefaulter = require('./webpack.config.default')

module.exports = {
	make: function (runtime) {
		return configDefaulter.make(runtime, constructDevDefaultConfig)
	}
}

/**
 * construct the default development webpack config
 * @param config
 * @param defaultConfig
 * @returns Object
 */
function constructDevDefaultConfig(config, defaultConfig) {
	const serverUrl = url.format({
		protocol: config.protocol,
		hostname: config.host,
		port: config.port
	})
	return {
		entry: {
			main: [
				'babel-polyfill',
				`webpack-dev-server/client?${serverUrl}/`,
				'webpack/hot/dev-server'
			]
		},
		output: {
			publicPath: `${serverUrl}/`,
			pathinfo: true,
			filename: '[name].js',
			devtoolModuleFilenameTemplate: function (info) {
				return `file:///${info.absoluteResourcePath.replace(/\\/g, '/')}`
			}
		},
		debug: true,
		devtool: 'source-map',
		module: {
			loaders: [
				// website ico
				{
					test: /favicon.ico$/,
					loader: 'file?name=[name].[ext]'
				},
				// js file
				{
					test: /\.js$/,
					exclude: /(node_modules|bower_components)/,
					loaders: ['ng-annotate-loader', 'babel-loader?cacheDirectory']
				},
				// pure css
				{
					test: /\.css$/,
					loaders: ['style', 'css?sourceMap', 'postcss']
				},
				// scss
				{
					test: /\.scss$/,
					loaders: ['style', 'css?sourceMap&autoprefixer&normalizeCharset', 'postcss', 'resolve-url', 'sass?sourceMap']
				},
				// html
				{
					test: /\.html$/,
					exclude: /index\.html$/,
					loaders: [`ngtemplate?relativeTo=${defaultConfig.context}`, 'html?attrs=link:href img:src source:src']
				},
				// image file
				{
					test: /\.(jpe?g|png|gif|svg)$/i,
					loaders: [
						'file?name=img/[name].[ext]'
					]
				},
				// misc file
				{
					test: /\.(json|map|wsdl|xsd)$/,
					loaders: [
						'file?name=misc/[name].[ext]'
					]
				},
				// music file
				{
					test: /\.(mp3|wav)$/,
					loaders: [
						'file?name=media/[name].[ext]'
					]
				},
				// font file
				{
					test: /\.(woff|woff2|ttf|eot)(\?.+)?$/,
					loaders: [
						'file?name=font/[name].[ext]'
					]
				},
				// svg font file
				{
					test: /\.(svg)(\?.+)$/,
					loaders: [
						'file?name=font/[name].[ext]'
					]
				},

			]
		},
		plugins: [
			new BrowserSyncPlugin({
					host: config.bsProxy.host,
					port: config.bsProxy.port,
					ghostMode: false,
					https: config.https,
					proxy: {
						target: serverUrl,
						ws: true
					}
				},
				{
					reload: false
				}),
			new webpack.HotModuleReplacementPlugin(),
			new AnyBarWebpackPlugin({
				enableNotifications: true
			}),
		]
	}
}
