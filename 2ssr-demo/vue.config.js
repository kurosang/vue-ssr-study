const VueSSRServerPlugin = require('vue-server-renderer/server-plugin')
const VueSSRClientPlugin = require('vue-server-renderer/client-plugin')
const nodeExternals = require('webpack-node-externals')
const merge = require('lodash.merge')

const TARGET_NODE = process.env.TARGET_NODE === 'node'
const DEV_MODE = process.env.NODE_ENV === 'development'

const config = {
  publicPath:
    process.env.NODE_ENV === 'production'
      ? // 在这里定义产品环境和其它环境的 publicPath
        // 关于 publicPath 请参考:
        // https://webpack.docschina.org/configuration/output/#output-publicpath
        '/'
      : '/',
  chainWebpack: (config) => {
    if (DEV_MODE) {
      config.devServer.headers({ 'Access-Control-Allow-Origin': '*' })
    }

    config
      .entry('app')
      .clear()
      .add('./src/entry-client.js')
      .end()
      // 为了让服务器端和客户端能够共享同一份入口模板文件
      // 需要让入口模板文件支持动态模板语法（这里选了 ejs）
      .plugin('html')
      .tap((args) => {
        return [
          {
            template: './public/index.ejs',
            minify: {
              collapseWhitespace: true,
            },
            templateParameters: {
              title: 'spa',
              mode: 'client',
            },
          },
        ]
      })
      .end()
      // webpack 的 copy 插件默认会将 public 文件夹中所有的文件拷贝到输出目录 dist 中
      // 这里我们需要将 index.ejs 文件排除
      .when(config.plugins.has('copy'), (config) => {
        config.plugin('copy').tap(([[config]]) => [
          [
            {
              ...config,
              ignore: [...config.ignore, 'index.ejs'],
            },
          ],
        ])
      })
      .end()

    // 默认值: 当 webpack 配置中包含 target: 'node' 且 vue-template-compiler 版本号大于等于 2.4.0 时为 true。
    // 开启 Vue 2.4 服务端渲染的编译优化之后，渲染函数将会把返回的 vdom 树的一部分编译为字符串，以提升服务端渲染的性能。
    // 在一些情况下，你可能想要明确的将其关掉，因为该渲染函数只能用于服务端渲染，而不能用于客户端渲染或测试环境。
    config.module
      .rule('vue')
      .use('vue-loader')
      .tap((options) => {
        merge(options, {
          optimizeSSR: false,
        })
      })

    config.plugins
      // Delete plugins that are unnecessary/broken in SSR & add Vue SSR plugin
      .delete('pwa')
      .end()
      .plugin('vue-ssr')
      .use(
        TARGET_NODE
          ? // 这是将服务器的整个输出构建为单个 JSON 文件的插件。
            // 默认文件名为 `vue-ssr-server-bundle.json`
            VueSSRServerPlugin
          : // 此插件在输出目录中生成 `vue-ssr-client-manifest.json`
            VueSSRClientPlugin
      )
      .end()

    if (!TARGET_NODE) return

    config
      .entry('app')
      .clear()
      .add('./src/entry-server.js')
      .end()
      .target('node')
      .devtool('source-map')
      .externals(nodeExternals({ whitelist: /\.css$/ }))
      .output.filename('server-bundle.js')
      .libraryTarget('commonjs2')
      .end()
      .optimization.splitChunks({})
      .end()
      .plugins.delete('named-chunks')
      .delete('hmr')
      .delete('workbox')
  },
}

module.exports = config
