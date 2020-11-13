# vue-ssr-study

学习 Vue.js 服务器端渲染，跟着教程自己动手走一次。

https://ssr.vuejs.org/zh/

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
