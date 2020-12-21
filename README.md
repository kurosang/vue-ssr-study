# vue-ssr-study

参照掘金 [通过 vue-cli3 构建一个 SSR 应用程序](https://juejin.cn/post/6844903678646681607) 动手改造

- 2020.11.24

需要修改的坑：

1.`webpack-node-externals 'whitelist' is not supported.`

文章 webpack-node-externals 用的 1.几的版本，2.0 版本以上不支持 whitelist 字段

2.`vue.config.js`里面的`optimization.splitChunks`改为`TARGET_NODE ? false : undefined`

3.`npm script`里面`build:win`要去掉 move 命令，改为`npm run build:server && npm run build:client -- --no-clean`

第一个`--`是一个不知道为什么的占位符。。。，只有这样写，第二个命令`npm run build:client`才能读到`--no-clean`的参数，才不会清理第一个命令生成的`vue-ssr-server-bundle`

看完第一篇文章，操作是

```
npm run build:win
node server.js
```

要手动删除 dist/index.html，不然会变成客户端渲染

- 2020.12.11

增加了命令，不需要再手动删除 dist/index.html，目前进度是学完第一篇，还有第二篇，搭配 dev 开发环境。

```
"build:client": "vue-cli-service build", // 打包客户端manifest
"build:server": "cross-env WEBPACK_TARGET=node vue-cli-service build --mode server", // 打包服务端的bundle
"build:win": "npm run build:server  && npm run build:client -- --no-clean", // 同时打包
"start": " npm run build:win && rimraf dist/index.html && node server.js" // 生产环境启动node服务器，先打包，然后清理dist/index.html，再启动node服务器
```

- 2020.12.18

根据[基于 vue-cli3 SSR 程序实现热更新功能](https://juejin.cn/post/6844903693373046792)文章来配置 dev，所引起的两个 bug

1.安装了 webpack 之后 webpack()生成 compiler 会报错，猜测是 webpack5 的原因

这里发现了一个现象，`> sass-loader@8.0.2" has unmet peer dependency "webpack@^4.36.0 || ^5.0.0".`，这个是 yarn install 的时候报的，我们手动 yarn add webpack 的时候，安装的是 5 版本的，应该是兼容性。然后我推测不安装也可以，我以为是我电脑本地有安装 webpack，其实不是，是其他依赖包安装了 webpack，不用我手动去安装，并且版本是 4.44.2，然后就跑起来了。

2.koa-router 的 path-to-regexp 好像会报错，目前解决是把 10.0.0 版本降到 7.0.0 版本。

搭建完成之后，运行`yarn dev`

通过`http://localhost:8080/`访问就是 客户端渲染 CSR
通过`http://localhost:3000/`访问就是 服务端渲染 SSR

- 2020.12.21

学习这篇[VUE-CLI3 SSR 改造之旅](http://www.ediaos.com/2019/01/27/vue-cli3-ssr-project/)，继续改造。

`npm run build`之后复制 dist 目录，然后安装依赖，运行`node server/index.js`就可以启动服务器

初步根据上面两篇文章搭建完之后，距离实际使用还有很大的差距

- 无 Proxy 处理
- 通过修改 baseUrl，修改 服务端渲染页面的前端静态资源地址，不够优雅，并且可能导致前端渲染刷新页面导致 404 无法访问
- 无 AsyncData 等处理，文章只提供了页面渲染，实际业务中有接口请求，有 loading 等功能，这些通常是工程化项目需要具备
- 增加是否前后端渲染控制
- TDK 支持
- PM2 支持
- DIST 处理

由于文章写了没多少就没下文了，我打算根据他的 github 项目一步步实现上面这些

# ENV Config 构建

背景：CLI3 默认读取 –mode NODE_ENV 作为环境变量，提供了.ENV 文件作为匹配环境。使用中发现 CLI3 内置一些处理以及写死处理 `NODE_ENV= production || development`，如果我们增加了一种环境，比如 test 环境，用于测试环境部署，有测试环境的配置等等，测试环境部署的时候却要依赖 production 来构建。 `会导致本地开发/服务端部署 与 实际的多套环境冲突`，这样的场景并不利于开发梳理逻辑。另外基于.ENV 环境获取 ENV 的时候被强制以 VUE_APP 作为开头的变量名不是很友好，使用起来稍显别扭。

解决方案：基于 `cross-env` 提供设置脚本环境变量，增加 `NODE_DEPLOY` 作为环境变量，工程根据这个环境变量提取配置的 config 文件中的 env 配置。这样好处就是把本地开发和部署 以及 与实际部署环境拆分开来不再互相干扰。实现方案如下：

`npm install cross-env -D`
修改 package.json 中的脚本，根据项目实际环境设置 NODE_DEPLOY，比如：cross-env `NODE_DEPLOY=test npm run dev`
增加 config 文件夹，并增加 index.js 以及 env 代码&目录参考如下，基于 NODE_DEPLOY 获取到环境变量，config/index.js 根据环境变量获取 env 配置文件，默认合并 env.js，这与 cli3 提供 env 基本一致，但不受限于命名。
