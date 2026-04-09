import nextra from 'nextra'

const basePath = '/reading-the-reader-monorepo'

const withNextra = nextra({
  search: false
})

export default withNextra({
  output: 'export',
  basePath,
  assetPrefix: basePath,
  trailingSlash: true,
  images: {
    unoptimized: true
  }
})
