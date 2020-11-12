const Vue = require('vue')
const renderer = require('vue-server-renderer').createRenderer()

const Koa = require('koa')
const app = new Koa()

app.use(async (ctx) => {
  let url = ctx.url

  //从request中获取GET请求
  let request = ctx.request
  let req_query = request.query
  let req_querystring = request.querystring

  //从上下文中直接获取
  let ctx_query = ctx.query
  let ctx_querystring = ctx.querystring

  const app = new Vue({
    data: {
      content: {
        url,
        req_query,
        req_querystring,
        ctx_query,
        ctx_querystring,
      },
    },
    template: `<div>访问的 信息 是： {{ content }}</div>`,
  })

  renderer.renderToString(app, (err, html) => {
    if (err) {
      res.status(500).end('Internal Server Error')
      return
    }
    ctx.body = `
     <!DOCTYPE html>
     <html lang="en">
       <head><title>Hello</title></head>
       <body>${html}</body>
     </html>
   `
  })
})

app.listen(3000, () => {
  console.log('[demo] server is starting at port 3000')
})
