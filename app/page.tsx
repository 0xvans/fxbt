'use client'

import { useEffect } from 'react'
import WardripsGenerator from '../components/WardripsGenerator'

// ✅ Jika kamu sudah install @farcaster/miniapp-sdk
import { sdk } from '@farcaster/miniapp-sdk'

export default function Page() {
  useEffect(() => {
    // Memberitahu Farcaster bahwa MiniApp sudah siap (hilangkan splash screen)
    sdk.actions.ready()

    // Contoh: Ambil token user Farcaster (untuk autentikasi API)
    sdk.quickAuth
      .getToken()
      .then((token) => {
        console.log('✅ Farcaster Token:', token)
      })
      .catch((err) => {
        console.warn('⚠️ Tidak bisa ambil token:', err)
      })
  }, [])

  return (
    <main
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',

        // 🔥 Background dari public/background.png
        backgroundImage: 'url("/background.png")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',

        padding: 24,
      }}
    >
      <div style={{ maxWidth: 900, width: '100%' }}>
        <WardripsGenerator />
      </div>
    </main>
  )
}
