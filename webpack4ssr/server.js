const Vue = require('vue')
const Koa = require('koa')
const Router = require('koa-router')
// const renderer = require('vue-server-renderer').createRenderer()

const { createBundleRenderer } = require('vue-server-renderer')

//  第 1 步：创建koa、koa-router 实例
const app = new Koa()
const router = new Router()

// const renderer = require('vue-server-renderer').createRenderer({
//   // 读取传入template参数
//   template: require('fs').readFileSync('./index.template.html', 'utf-8'),
// })

const send = require('koa-send')
// 引入/static/下的文件都通过koa-send转发到dist文件目录下
router.get('/static/*', async (ctx, next) => {
  await send(ctx, ctx.path, { root: __dirname + '/dist' })
})

// 第 2 步：路由中间件
router.get('/(.*)', async (ctx, next) => {
  console.log('ctx', ctx)

  // 获取客户端、服务器端生成的json文件、html模板文件
  const serverBundle = require('./dist/vue-ssr-server-bundle.json')
  const clientManifest = require('./dist/vue-ssr-client-manifest.json')
  const template = require('fs').readFileSync('./index.template.html', 'utf-8')

  const renderer = createBundleRenderer(serverBundle, {
    runInNewContext: false, // 推荐
    template, // 页面模板
    clientManifest, // 客户端构建 manifest
  })

  // title、meta会插入模板中
  const context = {
    title: ctx.url,
  }

  // 有错误返回500,无错误返回html结构
  try {
    // 传入context渲染上下文对象
    const html = await renderer.renderToString(context)
    ctx.status = 200
    // 传入了template, html结构会插入到<!--vue-ssr-outlet-->
    ctx.body = html
  } catch (error) {
    console.log(error)
    ctx.status = 500
    ctx.body = 'Internal Server Error'
  }
})

app.use(router.routes()).use(router.allowedMethods())

// 第 3 步：启动服务，通过http://localhost:3000/访问
app.listen(3000, () => {
  console.log(`server started at localhost:3000`)
})
