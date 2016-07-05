/**
 * Created by scott on 16-3-31.
 */
'use strict'

const logger = require('log4js').getLogger('dev-command')
const configMaker = require('./webpack.config')
const webpack = require('webpack')
const WebpackDevServer = require('webpack-dev-server')
const util = require('util')
const proxy = require('http-proxy-middleware')
const morgan = require('morgan')
const _ = require("lodash")

module.exports = {
	register,
	run
}

/**
 *
 * @param {Command} cmd
 * @param {function(Object)} runnerCallback
 */
function register(cmd, runnerCallback) {
	logger.trace('register dev command')

	cmd
		.description('develop a program')
		.arguments('<program...>')
		.usage('<program...> [options]')
		.option('--https', 'use https protocol to serve the resources')
		.option('--port <port>', 'access port', parseInt)
		.option('--proxy-port <port>', 'access proxy port', parseInt)
		.option('--livereload', 'livereload')
		.option('--dest <dir>', 'output dir')
		.option('--watch', 'watch file for changes')
		.option('--lint', 'lint the files')
		.option('--no-browse', 'open the browser automatically')
		.option('--no-daemon', 'no background serve')
		.option('--show-config', 'output the webpack config')
		.action(function (program) {
			logger.trace('dev command invoke')

			const option = Object.assign({ program: program }, this.opts())

			option.bsProxy = {
				port: option.proxyPort,
				host: option.proxyHost
			}

			delete option.proxyPort
			delete option.proxyHost

			runnerCallback && runnerCallback(option)
		})

	return cmd
}

function run(runtime) {
	logger.trace('dev command running')

	// 无插件退出
	if (_.isEmpty(runtime.plugins)) {
		process.exit(1)
	}

	const webpackConfig = configMaker.make(runtime)
	if (runtime.config.showConfig) {
		console.log(util.inspect(webpackConfig, { depth: 4 }))
	} else {
		const compiler = webpack(webpackConfig)

		const server = new WebpackDevServer(compiler, {
			// Tell the webpack dev server from where to find the files to serve.
			contentBase: webpackConfig.output.path,
			colors: true,
			publicPath: webpackConfig.output.publicPath,
			host: runtime.config.host,
			port: runtime.config.port,
			hot: true,
			https: runtime.config.https,
			stats: {
				assets: true,
				colors: true,
				version: true,
				hash: true,
				timings: true,
				chunks: false
			}
		})

		server.use(morgan('dev'))


		// use the express server from webpack-dev-server
		// todo: when upgrade webpack and webpack-dev-server, this may needs to be reviewed
		if (runtime.config.apiProxy) {
			server.use(proxy(runtime.config.apiProxy.address, {
				target: runtime.config.apiProxy.host,
				ws: true,
				changeOrigin: true,
				secure: false
			}))
		}


		server.listen(runtime.config.port, runtime.config.host, function () {
			logger.info('webpack-dev-server running...')
		})
	}
}
