import './globals.css'
import Script from 'next/script'

export const metadata = { 
  title: 'Farcaster XBT', 
  description: 'FXBT Mint MiniApp' 
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* ✅ Tambahkan inisialisasi SDK Farcaster */}
        <Script
          id="farcaster-sdk"
          strategy="beforeInteractive"
          src="https://cdn.jsdelivr.net/npm/@farcaster/miniapp-sdk/dist/index.umd.js"
        />
      </head>
      <body style={{ margin: 0, background: '#000', color: '#fff' }}>
        {children}
      </body>
    </html>
  )
}
