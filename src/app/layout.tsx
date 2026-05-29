import type { Metadata } from "next"
import { Poppins } from "next/font/google"
import "./globals.css"
import Link from "next/link"
import { VaultProvider } from '@/context/VaultContext'
import Image from "next/image"
// app/layout.tsx

const poppins = Poppins({
  weight: ['400', '600'],
  subsets: ['latin'],
  display: 'swap'
});

export const metadata: Metadata = {
  title: "FinTrackr — Personal Finance Dashboard",
  description:
    "Import Mandiri e-Statements, categorize transactions automatically, and visualize your finances locally.",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${poppins.className} antialiased`}>
        <div className="min-h-screen bg-gray-50">

          {/* Top Navigation */}
          <nav className="bg-white border-b border-gray-100">
            <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">

              <div className="font-semibold text-lg text-gray-800">
                <Image alt="logo fintrackr" src={'/logo-fintrackr.png'} height={80} width={120} />
              </div>

              <div className="flex gap-6 text-sm text-gray-600">
                <Link
                  href="/"
                  className="hover:text-blue-600 transition"
                >
                  Import
                </Link>

                <Link
                  href="/dashboard"
                  className="hover:text-blue-600 transition"
                >
                  Dashboard
                </Link>

                <Link
                  href="/settings"
                  className="hover:text-blue-600 transition"
                >
                  Settings
                </Link>
              </div>
            </div>
          </nav>

          {/* Page Content */}
          <div className="max-w-6xl mx-auto px-6 py-10">
            <VaultProvider>
              {children}
            </VaultProvider>
          </div>

        </div>
      </body>
    </html>
  )
}
