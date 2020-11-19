# vue-ssr-study

学习 Vue.js 服务器端渲染，跟着教程自己动手走一次。

https://ssr.vuejs.org/zh/

## webpack4+koa 实现 ssr

https://www.mk2048.com/blog/blog_cj1hc00kj.html

vue-server-renderer 的作用是拿到 vue 实例并渲染成 html 结构，但它不仅仅只做着一件事，后面会介绍其他配置参数和配合 webpack 进行构建。

服务器端渲染的基本原理了，其实说白了，无服务器端渲染时，前端打包后的 html 只是包含 head 部分，body 部分都是通过动态插入到 id 为#app 的 dom 中，而服务器端渲染(SSR)就是服务器来提前编译 Vue 生成 HTML 返回给 web 浏览器，这样网络爬虫爬取的内容就是网站上所有可呈现的内容。

### 正式环境构建

> Node.js 服务器是一个长期运行的进程、当我们的代码进入该进程时，它将进行一次取值并留存在内存中。这意味着如果创建一个单例对象，它将在每个传入的请求之间共享，所以我们需要**为每个请求创建一个新的根 Vue 实例**

不仅 vue 实例，接下来要用到的 vuex、vue-router 也是如此。我们利用 webpack 需要分别对客户端代码和服务器端代码分别打包， 服务器需要「服务器 bundle」然后用于服务器端渲染(SSR)，而「客户端 bundle」会发送给浏览器，用于混合静态标记。

我们可以大致的理解为服务器端、客户端通过俩个入口`Server entry`、 `Clinet entry` 获取源代码，再通过 webpack 打包变成俩个 bundle
`vue-ssr-server-bundle.json`和`vue-ssr-client-manifest.json`，配合生成完成 HTML，而 app.js 是俩个入口通用的代码部分，其作用是暴露出 vue 实例。

`entry-server.js`，它是暴露出一个函数，接受渲染上下文 context 参数，然后根据 url 匹配组件。所以说参数需要在我们调用`renderToString`传入 context，并包括 url 属性。

生成的俩个 bundle 其实是作为参数传入到`createBundleRenderer()`函数中，然后在 renderToString 变成 html 结构，与`createRenderer`不同的是前者是通过 bundle 参数获取 vue 组件编译，后者是需要在 renderToString 时传入 vue 实例。我们先编写 webpack 成功生成 bundle 后，再去编写 server.js，这样有利于我们更好的理解和测试。

`webpack.client.conf.js`:主要是对客户端代码进行打包，它是通过 webpack-merge 实现对基础配置的合并，其中要实现对 css 样式的处理，此处我用了 stylus，同时要下载对应的 stylus-loader 来处理。在这里我们先不考虑开发环境，后面会针对开发环境对 webpack 进行修改。

我们现在可以通过 `npm run build:client` 执行打包命令，执行命令之前要把依赖的 npm 包下载好。当打包命令执行完毕后，我们会发现多了一个 dist 文件夹，其中除了静态文件以外，生成了用于服务端渲染的 JSON 文件：`vue-ssr-client-manifest.json`。

同理，我们需要编写服务端 webpack 配置`webpack.server.conf.js`，同样打包生成 vue-ssr-server-bundle.json。

### 开发环境构建

我们跑通了基本的服务端渲染流程，但还没有涉及到异步数据、缓存等问题。在此之前，我们需要先实现开发环境的搭建，因为我们不可能敲的每一行代码都需要重新打包并起服务。这是不利于调试的。

想一想 vue-cli 构建出来的项目，我们可以通过 npm run dev(vue-cli3 使用了 npm run serve)起一个服务，然后更改文件的时候，页面也会自动的热加载，不需要手动刷新。

我们也要实现一个类似的开发环境，所以我们需要利用 node 来构建 webpack 配置，并且实时监控文件的改变，当改变时应该重新进行打包，重新生成俩个 JSON 文件，并重新进行`BundleRenderer.renderToString()`

我们除了重新生成 JSON 文件以外，其他逻辑和之前实现的逻辑大体相同。所以我们可以在 server.js 基础上进行修改，在原基础上进行环境的判断，做不同的 render。我们需要一个环境变量来决定执行哪个逻辑。

这里我们使用 cross-env 来设置 process.env.NODE_ENV 变量，我们把 build、start 命令都设置了 process.env.NODE_ENV 为 production 生产环境，这样我们在文件中可以获取到该值，如果没有我们就默认是 development 开发环境。

1. 首先是生成 `BundleRenderer` 实例，之前我们是通过固定路径（打包后的 dist 文件夹下）获取 JSON 文件

```
// 之前代码逻辑
const serverBundle = require('./dist/vue-ssr-server-bundle.json')
const clientManifest = require('./dist/vue-ssr-client-manifest.json')
const template = require('fs').readFileSync('./index.template.html', 'utf-8')

//...忽略无关代码

const renderer = createBundleRenderer(serverBundle, {
  runInNewContext: false,
  template, // 页面模板
  clientManifest // 客户端构建 manifest
})
```

我们需要按照环境变量更改逻辑，如果是生产环境上述代码不变，如果是开发环境，我们需要有一个函数来动态的获取打包的 JSON 文件并且重新生成 `BundleRenderer` 实例。

我们先定义好这个函数为 `setupDevServer`，顾名思义这个函数是构建开发环境的，它的作用是 nodeAPI 构建 webpack 配置，并且做到监听文件。我们 server.js 中可以通过传递个回调函数来做重新生成 `BundleRenderer` 实例的操作。而接受的参数就是俩个新生成的 JSON 文件。

```
// 假设已经实现
const setupDevServer = require('./build/setup-dev-server')
// 生成实例公共函数，开发、生产环境只是传入参数不同
const createBundle = (bundle, clientManifest) => {
  return createBundleRenderer(bundle, {
    runInNewContext: false,
    template,
    clientManifest
  })
}
let renderer // 将实例变量提到全局变量，根据环境变量赋值
const template = require('fs').readFileSync('./index.template.html', 'utf-8') // 模板

// 第 2步：根据环境变量生成不同BundleRenderer实例
if (process.env.NODE_ENV === 'production') {
  // 获取客户端、服务器端打包生成的json文件
  const serverBundle = require('./dist/vue-ssr-server-bundle.json')
  const clientManifest = require('./dist/vue-ssr-client-manifest.json')
  // 赋值
  renderer = createBundle(serverBundle, clientManifest)
  // 静态资源，开发环境不需要指定
  router.get('/static/*', async (ctx, next) => {
    console.log('进来')
    await send(ctx, ctx.path, { root: __dirname + '/dist' });
  })
} else {
  // 假设setupDevServer已经实现，并传入的回调函数会接受生成的json文件
  setupDevServer(app, (bundle, clientManifest) => {
    // 赋值
    renderer = createBundle(bundle, clientManifest)
  })
}
```

在之前，我们实现的 webpack 配置并没有对生产环境与开发环境做区别，但其实，我们应该像 vue-cli 一样针对环境来做不同的优化，比如开发环境 devtool 我们可以使用`cheap-module-eval-source-map`,
编译会更快，css 样式没有必要打包单独文件，使用 vue-style-loader 做处理就好，并且因为开发环境需要模块热重载，所以不提取文件是必要的。开发环境可以做更友好的错误提示。还有就是生产环境需要做更多的打包优化，比如压缩，缓存之类。

修改`webpack.base.conf.js`：

```
// ...
// 定义是否是生产环境的标志位，用于配置中
const isProd = process.env.NODE_ENV === 'production'

module.exports = {
  // 这里使用对象的格式，因为在setDevServer.js中需要添加一个热重载的入口
  entry: {
    app: resolve('src/entry-client.js')
  },
  // 开发环境启动sourcemap可以更好地定位错误位置
  devtool: isProd
    ? false
    : 'cheap-module-eval-source-map',
  // ...... 省略
}
```

修改`webpack.client.conf.js`：

```
// 定义是否是生产环境的标志位，用于配置中
const isProd = process.env.NODE_ENV === 'production'

const pordWebpackConfig = merge(baseWebpackConfig, {
  mode: process.env.NODE_ENV || 'development',
  output: {
    // chunkhash是根据内容生成的hash, 易于缓存。
    // 开发环境不需要生hash、这个我们在setDevServer函数里面改
    filename: 'static/js/[name].[chunkhash].js',
    chunkFilename: 'static/js/[id].[chunkhash].js'
  },
  module: {
    rules: [
      {
        test: /\.styl(us)?$/,
        // 开发环境不需要提取css单独文件
        use: isProd
          ? [MiniCssExtractPlugin.loader, 'css-loader', 'stylus-loader']
          : ['vue-style-loader', 'css-loader', 'stylus-loader']
      },
    ]
  },
  // ... 省略
}
```

关于服务器端 webpack 的配置可以不进行修改，因为它的功能最后只打包出一个 JSON 文件，并不需要针对环境做一些改变。

编写`set-dev-server.js`，setDevServer 函数主要是利用 webpack 手动构建应用，并实现热加载。

首先我们需要俩个中间件`koa-webpack-dev-middleware`和`koa-webpack-hot-middleware`。前者是通过传入 webpack 编译好的 compiler 实现热加载，而后者是实现模块热更替，热加载是监听文件变化，从而进行刷新网页，模块热更替则在它的基础上做到不需要刷新页面。

我们客户端 webpack 配置可以通过前面说的实现自动更新，而服务端 compiler，我们通过 watchAPI，进行监听。当俩者其中有一个变化时，我们就需要调用传入的回调，将新生成的 JSON 文件传入。整个流程大致就是这样，具体代码如下：

```
const fs = require('fs')
const path = require('path')
// memory-fs可以使webpack将文件写入到内存中，而不是写入到磁盘。
const MFS = require('memory-fs')
const webpack = require('webpack')
const clientConfig = require('./webpack.client.conf')
const serverConfig = require('./webpack.server.conf')
// webpack热加载需要
const webpackDevMiddleware = require('koa-webpack-dev-middleware')
// 配合热加载实现模块热替换
const webpackHotMiddleware = require('koa-webpack-hot-middleware')

// 读取vue-ssr-webpack-plugin生成的文件
const readFile = (fs, file) => {
  try {
    return fs.readFileSync(path.join(clientConfig.output.path, file), 'utf-8')
  } catch (e) {
    console.log('读取文件错误：', e)
  }
}

module.exports = function setupDevServer(app, cb) {
  let bundle
  let clientManifest

  // 监听改变后更新函数
  const update = () => {
    if (bundle && clientManifest) {
      cb(bundle, clientManifest)
    }
  }

  // 修改webpack配合模块热替换使用
  clientConfig.entry.app = ['webpack-hot-middleware/client', clientConfig.entry.app]
  clientConfig.output.filename = '[name].js'
  clientConfig.plugins.push(
    new webpack.HotModuleReplacementPlugin(),
    new webpack.NoEmitOnErrorsPlugin()
  )


  // 编译clinetWebpack 插入Koa中间件
  const clientshh = webpack(clientConfig)
  const devMiddleware = webpackDevMiddleware(clientCompiler, {
    publicPath: clientConfig.output.publicPath,
    noInfo: true
  })
  app.use(devMiddleware)

  clientCompiler.plugin('done', stats => {
    stats = stats.toJson()
    stats.errors.forEach(err => console.error(err))
    stats.warnings.forEach(err => console.warn(err))
    if (stats.errors.length) return
    clientManifest = JSON.parse(readFile(
      devMiddleware.fileSystem,
      'vue-ssr-client-manifest.json'
    ))
    update()
  })

  // 插入Koa中间件(模块热替换)
  app.use(webpackHotMiddleware(clientCompiler))

  const serverCompiler = webpack(serverConfig)
  const mfs = new MFS()
  serverCompiler.outputFileSystem = mfs
  serverCompiler.watch({}, (err, stats) => {
    if (err) throw err
    stats = stats.toJson()
    if (stats.errors.length) return

    //  vue-ssr-webpack-plugin 生成的bundle
    bundle = JSON.parse(readFile(mfs, 'vue-ssr-server-bundle.json'))
    update()
  })
}
```

我们用到了`memory-fs`将生成的 JSON 文件写入内存中，而不是磁盘中，是为了更快的读写。客户端不需要是因为`webpack-dev-middleware`已经帮我们完成了。这就是为什么我们在开发环境并没有 dist 文件夹生成。我们现在可以通过 npm run dev 访问 localhost:3000，更改代码，可以实现热加载。

### 数据预取

> 在服务器端渲染(SSR)期间，我们本质上是在渲染我们应用程序的"快照"，所以如果应用程序依赖于一些异步数据，**那么在开始渲染过程之前，需要先预取和解析好这些数据。**

正如官方文档解释的，SSR 本质上就是先执行应用程序并返回 HTML，所以我们需要服务端处理数据，客户端与之同步。数据预取官方文档实例代码很详细，我们照着实现一下即可。

**store/index.js**

```
// ...

export function createStore() {
  return new Vuex.Store({
    state: {
      movie: {}
    },
    actions: {
      // 通过传入id请求电影数据，这里我们模拟一下，先返回id
      fetchMovie({ commit }, id) {
        return new Promise((resolve, reject) => {
          setTimeout(() => {
            resolve({ id })
          }, 500)
        }).then(res => {
          commit('setMoive', { res })
        })
      }
    },
    mutations: {
      // 设置state
      setMoive(state, { res }) {
        state.movie = res
      }
    }
  })
}
```

**修改 A.vue**

```
<template>
  <div>
    A页 请求电影数据结果：{{  this.$store.state.movie }}
  </div>
</template>

<script>
export default {
  name: 'A',
  // 定义asyncData, entry-server.js会编译所有匹配的组件中是否包含，包含则执行
  // 将state值挂在到context上，会被序列化为window.__INITIAL_STATE__
  //
  asyncData ({ store, route }) {
    // 请求电影数据， 传入 ID ： 12345
    return store.dispatch('fetchMovie', 12345)
  },
}
</script>

<style lang="stylus" scoped>
h1
  color blue
</style>


```

服务端预取的原理就是，通过在组件内定义 `asyncData` 函数用于异步请求，在 `entry-server.js` 服务端中遍历所有匹配到的组件，如果包含 asyncData 则执行，并将 `state` 挂载到 `context` 上下文，`vue-server-renderer` 会将 state 序列化为 `window.** INITIAL_STATE **`，这样，entry-client.js 客户端就可以替换 state，实现同步。

#### 客户端数据预取

因为入口只会在第一次进入应用时执行一次，页面的跳转不会再执行服务端数据预取的逻辑，所以说我们需要客户端数据预取，官网文档实现有俩种方式，这里就只尝试一种，利用 router 的导航守卫，原理就是在每次进行跳转时，执行没有执行过的 asyncData 函数，

```
// 官方代码
router.onReady(() => {
  router.beforeResolve((to, from, next) => {
    const matched = router.getMatchedComponents(to)
    const prevMatched = router.getMatchedComponents(from)

    // 我们只关心非预渲染的组件
    // 所以我们对比它们，找出两个匹配列表的差异组件
    let diffed = false
    const activated = matched.filter((c, i) => {
      return diffed || (diffed = (prevMatched[i] !== c))
    })

    if (!activated.length) {
      return next()
    }

    // 这里如果有加载指示器(loading indicator)，就触发

    Promise.all(activated.map(c => {
      if (c.asyncData) {
        return c.asyncData({ store, route: to })
      }
    })).then(() => {

      // 停止加载指示器(loading indicator)

      next()
    }).catch(next)
  })
  app.$mount('#app')
})
```

### 设置 Head 和缓存

**title 注入**

我们做服务端渲染，根据不同的页面会有不同的 meta、title。所以我们还需要注入不同的 Head。可以用到强大的 vue-meta 配合 SSR 使用。这里我们就按照官方文档来实现一个简单的 title 注入，首先你需要在你的 template 模板中定义

**页面级别缓存**

```
// server.js

// 设置缓存参数
const microCache = LRU({
  max: 100, // 最大缓存数
  maxAge: 10000 //  10s过期，意味着10s内请求统一路径，缓存中都有
})

// 判断是否可以缓存，这里先模拟，当访问B就缓存
const isCacheable = ctx => {
  return ctx.url === '/b'
}

const render = async (ctx) => {
  // ...忽略无关代码

  // 判断是否可缓存，如果可缓存则先从缓存中查找
  const cacheable = isCacheable(ctx)
  if (cacheable) {
    const hit = microCache.get(ctx.url)
    if (hit) {
      console.log('取到缓存') // 便于调试
      ctx.body = hit
      return
    }
  }

  // 存入缓存, 只有当缓存中没有 && 可以缓存
  if (cacheable) {
    console.log('设置缓存') // 便于调试
    microCache.set(ctx.url, html)
  }
}
```

## 1 基本用法

demo1.js： 渲染一个 Vue 实例

server/server2.js: 与服务器集成

## 2 vue/cli3 搭建 ssr 环境

https://juejin.im/post/6844903856258678797

### 安装 yarn add vue-server-renderer

```
vue v2.6.10
vue-router v3.0.3
vuex v3.0.1
vue-template-compiler v2.5.21
vue-server-renderer v2.6.10
```

### 改造 Vuex

### 改造 Router

### 改造应用入口

#### entry-client.js

在服务器端渲染路由组件树，所产生的 `context.state` 将作为脱水数据挂载到 `window.__INITIAL_STATE__`

在客户端，只需要将 `window.__INITIAL_STATE__` 重新注入到 store 中即可（通过 `store.replaceState` 函数）

最后，我们需要将 mount 的逻辑放到客户端入口文件内。

#### entry-server.js

上面的 context.rendered 函数会在应用完成渲染的时候调用

在服务器端，应用渲染完毕后，此时 store 可能已经从路由组件树中填充进来一些数据。

当我们将 state 挂载到 context ，并在使用 renderer 的时候传递了 template 选项，

那么 state 会自动序列化并注入到 HTML 中，作为 `window.INITIAL_STATE` 存在。

接下来，我们来给 store 添加获取数据的逻辑，并在首页调用其逻辑，方便后面观察服务器端渲染后的 `window.INITIAL_STATE`

### 改造 vue.config.js

### NodeJS 服务端搭建

yarn add koa koa-send memory-fs lodash.get axios ejs

```
koa v2.7.0
koa-send v5.0.0
memory-fs v0.4.1
lodash.get v4.4.2
axios v0.18.0
ejs v2.6.1
```

#### 生产环境

`/app/server.js`
`/app/middlewares/prod.ssr.js`

在 build 命令中，先执行客户端的构建命令，然后再执行服务端的构建命令。

服务端的构建命令与客户端的区别只有一个环境变量：TARGET_NODE，当将此变量设置值为 node，则会按照服务端配置进行构建。

另外，在服务端构建命令中有一个参数：--no-clean，这个参数代表不要清除 dist 文件夹，保留其中的文件。

之所以需要 --no-clean 这个参数，是因为服务端构建不应该影响到客户端的构建文件。

这样能保证客户端即使脱离了服务端，也能通过 nginx 提供的静态服务向用户提供完整的功能（也就是 spa 模式）。

#### 开发环境服务搭建

除了生产环境提供的服务之外，开发环境还需要提供：

- 静态资源服务
- hot reload

**搭建静态资源服务**

`/app/middlewares/dev.static.js`

生产环境中的静态资源因为都会放置到 CDN 上，因此并不需要 NodeJS 服务来实现静态资源服务器，一般都由 nginx 静态服务提供 CDN 的回源支持。

但生产环境如果依赖独立的静态服务器，可能导致环境搭建成本过高，因此我们创建一个开发环境的静态资源服务中间件来实现此功能。

我们的 spa 模式在开发环境通过命令 serve 启动后，就是一个自带 hot reload 功能的服务。

因此，服务端在开发环境中提供的静态资源服务，可以通过将静态资源请求路由到 spa 服务，来提供静态服务功能。
需要注意的是：开发环境中，服务端在启动之前，需要先启动好 spa 服务。

稍后我们会在 package.js 中创建 dev 命令来方便启动开发环境的 spa 与 ssr 服务。

**concurrently**

```
yarn add concurrently -D
```

因为我们需要在开发环境同时启动 spa 服务和 ssr 服务，因此需要一个工具辅助我们同时执行两个命令。

然后改造 package.json 中的 serve 命令：

```
...
 "scripts": {
   "serve": "vue-cli-service serve",
   "ssr:serve": "NODE_ENV=development PORT=3000 CLIENT_PORT=8080 node ./app/server.js",
   "dev": "concurrently 'npm run serve' 'npm run ssr:serve'",
...
```

- serve 开发环境启动 spa 服务
- ssr:serve 开发环境启动 ssr 服务
- dev 开发环境同时启动 spa 服务于 ssr 服务

启动 ssr 服务的命令中：

- NODE_ENV 是环境变量
- PORT 是 ssr 服务监听的端口
- CLIENT_PORT 是 spa 服务监听的端口

因为静态资源需要从 spa 服务中获取，所以 ssr 服务需要知道 spa 服务的 host 、端口 和 静态资源路径

至此，静态服务器搭建完毕，接下来我们来搭建开发环境的请求处理中间件。（此中间件包含 hot reload 功能）

**实现 hot reload**

`dev.ssr.js`

在开发环境，我们通过 `npm run dev`命令，启动一个 webpack-dev-server 和一个 ssr 服务

通过官方文档可知，我们可以通过一个文件访问解析好的 webpack 配置，这个文件路径为：

`node_modules/@vue/cli-service/webpack.config.js`

使用 webpack 编译此文件，并将其输出接入到内存文件系统（`memory-fs`）中

监听 webpack，当 webpack 重新构建时，我们在监听器内部获取最新的 server bundle 文件

并从 webpack-dev-server 获取 client bundle 文件

在每次处理 ssr 请求的中间件逻辑中，使用最新的 server bundle 文件和 client bundle 文件进行渲染

最后，将中间件 `dev.ssr.js` 注册到服务端入口文件 `app/server.js` 中

## 3 源码结构

### 编写通用代码

由于用例和平台 API 的差异，当运行在不同环境中时，我们的代码将不会完全相同。

由于没有动态更新，所有的生命周期钩子函数中，只有 beforeCreate 和 created 会在服务器端渲染 (SSR) 过程中被调用。这就是说任何其他生命周期钩子函数中的代码（例如 beforeMount 或 mounted），只会在客户端执行。

应该避免在 beforeCreate 和 created 生命周期时产生全局副作用的代码，例如在其中使用 setInterval 设置 timer。

### 避免状态单例

当编写纯客户端 (client-only) 代码时，我们习惯于每次在新的上下文中对代码进行取值。但是，Node.js 服务器是一个长期运行的进程。当我们的代码进入该进程时，它将进行一次取值并留存在内存中。这意味着如果创建一个单例对象，它将在每个传入的请求之间共享。

如基本示例所示，我们为每个请求创建一个新的根 Vue 实例。这与每个用户在自己的浏览器中使用新应用程序的实例类似。如果我们在多个请求之间使用一个共享的实例，很容易导致交叉请求状态污染 (cross-request state pollution)。

同样的规则也适用于 router、store 和 event bus 实例。你不应该直接从模块导出并将其导入到应用程序中，而是需要在 createApp 中创建一个新的实例，并从根 Vue 实例注入。
