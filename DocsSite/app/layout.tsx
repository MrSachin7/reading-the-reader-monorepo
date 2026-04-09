import type { Metadata } from 'next'
import { Footer, Layout, Navbar, NotFoundPage } from 'nextra-theme-docs'
import { Head } from 'nextra/components'
import { getPageMap } from 'nextra/page-map'
import 'nextra-theme-docs/style.css'

export const metadata: Metadata = {
  title: {
    default: 'Reading the Reader Docs',
    template: '%s | Reading the Reader Docs'
  },
  description:
    'Architecture, integration, and thesis documentation for the Reading the Reader platform.'
}

const navbar = <Navbar logo={<strong>Reading the Reader Docs</strong>} />

const footer = (
  <Footer>
    Reading the Reader documentation portal.
  </Footer>
)

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <Head />
      <body>
        <Layout
          navbar={navbar}
          footer={footer}
          pageMap={await getPageMap()}
          sidebar={{ defaultMenuCollapseLevel: 1, toggleButton: true }}
          toc={{ backToTop: true }}
          editLink={null}
          feedback={{ content: null }}
        >
          {children}
        </Layout>
      </body>
    </html>
  )
}

export function GlobalNotFound() {
  return <NotFoundPage content="The requested documentation page could not be found." />
}
