const path = require('path')
const fs = require('fs')
const ejs = require('ejs')
const get = require('lodash.get')

const resolve = (file) => path.resolve(__dirname, file)
const PWD = process.env.PWD
const enableStream = +process.env.ENABLESTREAM

const { createBundleRenderer } = require('vue-server-renderer')
const bundle = require(PWD + '/dist/vue-ssr-server-bundle.json')
const clientManifest = require(PWD + '/dist/vue-ssr-client-manifest.json')
const tempStr = fs.readFileSync(resolve(PWD + '/public/index.ejs'), 'utf-8')
const template = ejs.render(tempStr, { title: '{{title}}', mode: 'server' })

const renderer = createBundleRenderer(bundle, {
  runInNewContext: false,
  template: template,
  clientManifest: clientManifest,
  basedir: PWD,
})

const renderToString = (context) =>
  new Promise((resolve, reject) => {
    renderer.renderToString(context, (err, html) =>
      err ? reject(err) : resolve(html)
    )
  })

const renderToStream = (context) => renderer.renderToStream(context)

const main = async (ctx, next) => {
  ctx.set('content-type', 'text/html')

  const context = {
    title: get(ctx, 'currentRouter.meta.title', 'ssr mode'),
    url: ctx.url,
  }

  ctx.body = await renderToString(context)
}

module.exports = main
