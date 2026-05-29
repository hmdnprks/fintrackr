import type { Metadata } from "next"
import { Poppins } from "next/font/google"
import "./globals.css"
import Link from "next/link"
import { VaultProvider } from '@/context/VaultContext'
import ChatBubble from '@/components/ChatBubble'
import Image from "next/image"

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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${poppins.className} antialiased`}>
        <div className="min-h-screen bg-gray-50">

          {/* Navigation */}
          <nav className="bg-white border-b border-gray-100 sticky top-0 z-40">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
              <Image alt="Fintrackr" src="/logo-fintrackr.png" height={60} width={90} />
              <div className="flex gap-4 sm:gap-6 text-sm text-gray-600">
                <Link href="/"          className="hover:text-blue-600 transition">Import</Link>
                <Link href="/dashboard" className="hover:text-blue-600 transition">Dashboard</Link>
                <Link href="/settings"  className="hover:text-blue-600 transition">Settings</Link>
              </div>
            </div>
          </nav>

          {/* Pages manage their own padding — no extra wrapper here */}
          <VaultProvider>
            {children}
          </VaultProvider>

          <ChatBubble />

        </div>
      </body>
    </html>
  )
}
