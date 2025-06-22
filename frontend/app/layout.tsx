import type React from "react"
import type { Metadata } from "next"
import "../styles/globals.css"
import Image from "next/image"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Recruitment Analyzer",
  description: "AI-powered GitHub profile analysis for recruitment",
  generator: "v0.dev",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>
        {/* Header with logo */}
        <header className="bg-white shadow p-4">
          <div className="max-w-7xl mx-auto flex items-center">
            <Link href="/">
              <Image
                src="/githire-logo.png"
                alt="GitHired Logo"
                width={250}
                height={70}
                className="cursor-pointer"
              />
            </Link>
          </div>
        </header>

        {/* Main content */}
        <main>{children}</main>
      </body>
    </html>
  )
}
