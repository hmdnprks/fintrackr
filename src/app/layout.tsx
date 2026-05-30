import type { Metadata } from "next"
import { Poppins } from "next/font/google"
import "./globals.css"
import { VaultProvider } from '@/context/VaultContext'
import ChatBubble from '@/components/ChatBubble'
import NavBar from '@/components/NavBar'

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

          <NavBar />

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
