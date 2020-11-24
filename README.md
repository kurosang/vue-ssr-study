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

## Project setup

```
yarn install
```

### Compiles and hot-reloads for development

```
yarn serve
```

### Compiles and minifies for production

```
yarn build
```

### Lints and fixes files

```
yarn lint
```

### Customize configuration

See [Configuration Reference](https://cli.vuejs.org/config/).
