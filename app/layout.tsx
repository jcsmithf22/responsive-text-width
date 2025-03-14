import type React from "react"
import "@/app/globals.css"
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import type { Metadata } from "next"
import QueryProviderWrapper from "@/components/QueryProviderWrapper";
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "v0 App",
  description: "Created with v0",
  generator: "v0.dev",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <title>SVG Text Editor</title>
        <meta name="description" content="Create and customize SVG text elements" />
      </head>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <QueryProviderWrapper>
            {children}
          </QueryProviderWrapper>
        </ThemeProvider>
      </body>
    </html>
  )
}