/* eslint indent: 1 */
/**
 * Created by scott on 16-4-5.
 */

'use strict'

const webpack = require('webpack')
const url = require('url')

const BrowserSyncPlugin = require('browser-sync-webpack-plugin')
const WriteFilePlugin = require('write-file-webpack-plugin')
const AnyBarWebpackPlugin = require('anybar-webpack')

module.exports = {
    construct: constructDevDefaultConfig
}

/**
 * construct the default development webpack config
 * @param rtConfig
 * @param commonWebpackConfig
 * @returns Object
 */
function constructDevDefaultConfig(rtConfig) {
    const serverUrl = url.format({
        protocol: rtConfig.https ? 'https' : 'http',
        hostname: rtConfig.host,
        port: rtConfig.port
    })

    const devConfig = {
        output: {
            publicPath: `${serverUrl}/`,
            pathinfo: true,
            filename: '[name].js',
            devtoolModuleFilenameTemplate: function (info) {
                return `file:///${info.absoluteResourcePath.replace(/\\/g, '/')}`
            }
        },
        devtool: 'source-map',
        module: {
            rules: [
                // website ico
                {
                    test: /favicon.ico$/,
                    loader: 'file-loader?name=[name].[ext]'
                },
                // pure css
                {
                    test: /\.css$/,
                    loaders: ['style-loader', 'css-loader?sourceMap', 'postcss-loader']
                },
                // scss
                {
                    test: /\.scss$/,
                    loaders: [
                        'style-loader',
                        'css-loader?sourceMap',
                        'postcss-loader',
                        'resolve-url-loader',
                        'sass-loader?sourceMap'
                    ]
                },
                // image file
                {
                    test: /\.(jpe?g|png|gif|svg)$/i,
                    loaders: [
                        'file-loader?name=img/[name].[ext]'
                    ]
                },
                // misc file
                {
                    test: /\.(json|map|wsdl|xsd)$/,
                    loaders: [
                        'file-loader?name=misc/[name].[ext]'
                    ]
                },
                // music file
                {
                    test: /\.(mp3|wav)$/,
                    loaders: [
                        'file-loader?name=media/[name].[ext]'
                    ]
                },
                // font file
                {
                    test: /\.(woff|woff2|ttf|eot)(\?.+)?$/,
                    loaders: [
                        'file-loader?name=font/[name].[ext]'
                    ]
                },
                // svg font file
                {
                    test: /\.(svg)(\?.+)$/,
                    loaders: [
                        'file-loader?name=font/[name].[ext]'
                    ]
                },
            ]
        },
        plugins: [
            new BrowserSyncPlugin({
                host: rtConfig.bsProxy.host,
                port: rtConfig.bsProxy.port,
                ghostMode: false,
                https: rtConfig.https,
                proxy: {
                    target: serverUrl,
                    ws: true
                }
            }, {
                reload: false
            }),
            new webpack.HotModuleReplacementPlugin(),
            new AnyBarWebpackPlugin({
                enableNotifications: true
            }),
            new webpack.LoaderOptionsPlugin({
                debug: true
            })
        ]
    }

    if (rtConfig.out2disk) {
        devConfig.plugins.push(new WriteFilePlugin())
    }

    return devConfig
}
