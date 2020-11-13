const Koa = require('koa')
const app = new Koa()
const host = '127.0.0.1'
const port = process.env.PORT
const productionEnv = ['production', 'test']
const isProd = productionEnv.includes(process.env.NODE_ENV)
const fs = require('fs')
const PWD = process.env.PWD

// 产品环境：我们在服务端进程启动时，将客户端入口文件读取到内存中，当 发生异常 或 需要返回客户端入口文件时响应给客户端。
const getClientEntryFile = (isProd) =>
  isProd ? fs.readFileSync(PWD + '/dist/index.html') : ''
const clientEntryFile = getClientEntryFile(isProd)

app.use(async (ctx, next) => {
  if (ctx.method !== 'GET') return

  try {
    await next()
  } catch (err) {
    ctx.set('content-type', 'text/html')

    if (err.code === 404) {
      ctx.body = clientEntryFile
      return
    }

    console.error(' [SERVER ERROR] ', err.toString())

    ctx.body = clientEntryFile
  }
})

// 后将中间件 dev.static.js 注册到服务端入口文件 app/server.js 中：
if (process.env.NODE_ENV === 'production') {
  app.use(require('./middlewares/prod.ssr.js'))
} else {
  app.use(require('./middlewares/dev.static.js'))
  app.use(require('./middlewares/dev.ssr.js'))
}

app.listen(port, host, () => {
  console.log(`[${process.pid}]server started at ${host}:${port}`)
})
