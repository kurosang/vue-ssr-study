const Vue = require('vue')
const Koa = require('koa')
const Router = require('koa-router')
// const renderer = require('vue-server-renderer').createRenderer()

//  第 1 步：创建koa、koa-router 实例
const app = new Koa()
const router = new Router()

const renderer = require('vue-server-renderer').createRenderer({
  // 读取传入template参数
  template: require('fs').readFileSync('./index.template.html', 'utf-8'),
})

// 第 2 步：路由中间件
router.get('/(.*)', async (ctx, next) => {
  console.log('ctx', ctx)

  // 创建Vue实例
  const app = new Vue({
    data: {
      url: ctx.url,
    },
    template: `<div>访问的 URL 是： {{ url }}</div>`,
  })

  // title、meta会插入模板中
  const context = {
    title: ctx.url,
    meta: `
      <meta charset="UTF-8">
      <meta name="descript" content="基于webpack、koa搭建的SSR">
    `,
  }

  // 有错误返回500,无错误返回html结构
  try {
    // 传入context渲染上下文对象
    const html = await renderer.renderToString(app, context)
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
