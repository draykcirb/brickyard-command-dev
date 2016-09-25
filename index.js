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
const _ = require('lodash')
const brickyardWebpack = require('brickyard-webpack')

module.exports = {
    register,
    run,
    config: {
        port: 8080,
        host: 'localhost',
        bsProxy: {
            port: 3000,
            host: 'localhost'
        },
        apiProxy: null,
        watch: false,
        livereload: false,
        https: false,
        showConfig: false,
        browse: true,
        out2disk: false,
        globals: null // object
    }
}

/**
 *
 * @param {Command} cmd
 * @param {function(Object)} runnerCallback
 */
function register(cmd, runnerCallback) {
    logger.trace('register dev command')

    return cmd
        .alias('d')
        .description('develop a program')
        .arguments('<program...>')
        .usage('<program...> [options]')
        .option('--https', 'use https protocol to serve the resources')
        .option('--port <port>', 'access port', parseInt)
        .option('--proxy-port <port>', 'access proxy port', parseInt)
        .option('--proxy-host <host>', 'access proxy host')
        .option('--livereload', 'livereload')
        .option('--dest <dir>', 'output dir')
        .option('--dest-prefix <prefix>', 'output dir prefix')
        .option('--dest-postfix <postfix>', 'output dir to host actual assets')
        .option('--watch', 'watch file for changes')
        .option('--lint', 'lint the files')
        .option('--no-browse', 'open the browser automatically')
        .option('--out2disk', 'force output the assets to disk')
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

            if (runnerCallback) {
                runnerCallback(option)
            }
        })
}

function run(runtime) {
    logger.trace('dev command running')

    // 无插件退出
    if (_.isEmpty(runtime.plugins)) {
        process.exit(1)
    }

    brickyardWebpack.registerFactory(configMaker.construct)

    const webpackConfig = brickyardWebpack.makeConfig(runtime)

    if (runtime.config.showConfig) {
        logger.info('Following is the generated webpack config object with depth 4', util.inspect(webpackConfig, { depth: 4 }))
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
