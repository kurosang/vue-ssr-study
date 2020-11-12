const Vue = require('vue')

const Koa = require('koa')
const app = new Koa()

const template = require('fs').readFileSync('./index.template.html', 'utf-8')

const renderer = require('vue-server-renderer').createRenderer({
  template,
})

const context = {
  title: 'vue ssr',
  metas: `
        <meta name="keyword" content="vue,ssr">
        <meta name="description" content="vue srr demo">
    `,
}

app.use(async (ctx) => {
  const app = new Vue({
    data: {
      url: ctx.url,
    },
    template: `<div>访问的 URL 是： {{ url }}</div>`,
  })

  renderer.renderToString(app, context, (err, html) => {
    if (err) {
      ctx.status = 500
      ctx.body = 'Internal Server Error'
      return
    }
    ctx.body = html
  })
})

app.listen(3000, () => {
  console.log('[demo] server is starting at port 3000')
})
