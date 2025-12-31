'use client'

import React, { useEffect, useState, useRef } from 'react'
import Image from 'next/image'
import { sdk } from '@farcaster/miniapp-sdk'
import {
  WagmiConfig,
  createConfig,
  http,
  useAccount,
  useConnect,
  useContractWrite,
  useBalance,
} from 'wagmi'
import { base } from 'wagmi/chains'
import farcasterMiniAppConnector from '@farcaster/miniapp-wagmi-connector'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { parseEther } from 'viem'
import { createClient } from '@supabase/supabase-js'

// =========================
// CONFIG
const CONTRACT_ADDRESS = '0x1b977cea265ec47c25361e6b96de22e3b2107257'
const BASE_RPC_URL = 'https://mainnet.base.org'
const MINT_PRICE_ETH = '0.01'
const MAX_SUPPLY = 1000

const queryClient = new QueryClient()

const config = createConfig({
  chains: [base],
  connectors: [farcasterMiniAppConnector()],
  transports: { [base.id]: http(BASE_RPC_URL) },
})

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase environment variables')
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

// =========================
// Toast
function Toast({ message, type }: { message: string; type: 'error' | 'success' }) {
  if (!message) return null
  return (
    <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 999 }}>
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 16px',
          borderRadius: 12,
          border: '2px solid #000',
          boxShadow: '6px 6px 0 #000',
          background: type === 'error' ? '#ffefef' : '#f0fff0',
          color: '#000',
          fontWeight: 700,
          fontFamily: 'Inter, Arial, sans-serif',
        }}
      >
        <span style={{ fontSize: 16 }}>{type === 'error' ? '⚠️' : '✅'}</span>
        <span style={{ fontSize: 14 }}>{message}</span>
      </div>
    </div>
  )
}

// =========================
// Equalizer Loader
function GeneratingUI({ progress }: { progress: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center', marginTop: 12 }}>
      <div style={{ display: 'flex', gap: 6, height: 44, alignItems: 'flex-end' }}>
        <div className="eq-bar bar1" />
        <div className="eq-bar bar2" />
        <div className="eq-bar bar3" />
      </div>

      <style jsx>{`
        .eq-bar {
          width: 10px;
          background: #000;
          border: 2px solid #000;
          border-radius: 6px;
          box-shadow: 3px 3px 0 #000;
        }
        .bar1 {
          animation: bounce1 0.9s infinite ease-in-out;
        }
        .bar2 {
          animation: bounce2 0.9s infinite ease-in-out;
        }
        .bar3 {
          animation: bounce3 0.9s infinite ease-in-out;
        }
        @keyframes bounce1 {
          0% { height: 10px; }
          50% { height: 40px; }
          100% { height: 10px; }
        }
        @keyframes bounce2 {
          0% { height: 18px; }
          50% { height: 44px; }
          100% { height: 18px; }
        }
        @keyframes bounce3 {
          0% { height: 12px; }
          50% { height: 36px; }
          100% { height: 12px; }
        }
      `}</style>

      <div style={{ fontWeight: 800 }}>Generating...</div>

      <div
        style={{
          width: '80%',
          height: 10,
          borderRadius: 999,
          background: 'rgba(0,0,0,0.09)',
          overflow: 'hidden',
          border: '1px solid rgba(0,0,0,0.12)',
        }}
      >
        <div
          style={{
            width: `${Math.min(100, Math.max(0, progress))}%`,
            height: '100%',
            transition: 'width 200ms linear',
            background: 'linear-gradient(90deg, #000000ff, #000000ff)',
          }}
        />
      </div>
    </div>
  )
}

// =========================
// MAIN COMPONENT
function BasedApolloInner() {
  const [step, setStep] = useState<'loading' | 'eligible' | 'generated' | 'minting' | 'done' | 'ineligible'>('loading')
  const [status, setStatus] = useState('')
  const [toast, setToast] = useState<{ msg: string; type: 'error' | 'success' } | null>(null)
  const [fid, setFid] = useState<string | null>(null)
  const [username, setUsername] = useState<string | null>(null)
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [rankColor, setRankColor] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generateProgress, setGenerateProgress] = useState(0)
  const [hasMinted, setHasMinted] = useState(false)
  const [hasGenerated, setHasGenerated] = useState(false)
  const [mintedCount, setMintedCount] = useState<number | null>(0)

  const [isButtonLocked, setIsButtonLocked] = useState(false)
  const [isMinting, setIsMinting] = useState(false)
  const lastClickRef = useRef<{ [k: string]: number }>({})

  const { address, isConnected } = useAccount()
  const { connectAsync, connectors } = useConnect()
  const { writeContractAsync } = useContractWrite()
  const { data: balanceData } = useBalance({ address, chainId: base.id })

  const total = 1

  const CONTRACT_ABI = [
    {
      name: 'mintTo',
      type: 'function',
      stateMutability: 'payable',
      inputs: [
        { name: 'fid', type: 'uint256' },
        { name: 'uri', type: 'string' },
      ],
      outputs: [],
    },
  ] as const

  const computeRarityByRank = (rank: number) => {
    if (rank < 1000) return 'purple'
    if (rank < 2000) return 'yellow'
    if (rank < 3000) return 'blue'
    return 'green'
  }

  const fetchMintedCount = async () => {
    try {
      const res = await supabase
        .from('wardrips_nft')
        .select('*', { count: 'exact', head: false })
        .eq('minted', true)
      setMintedCount((res as any).count ?? 0)
    } catch {
      setMintedCount(null)
    }
  }

  useEffect(() => {
    let canceled = false
    const init = async () => {
      try {
        await sdk.actions.ready()
        const context = await sdk.context
        const f = context?.user?.fid?.toString()
        const uname = context?.user?.username || null

        if (!f) {
          if (!canceled) {
            setStep('ineligible')
            setStatus('Please open the MiniApp inside Farcaster to generate.')
            await fetchMintedCount()
          }
          return
        }

        if (canceled) return

        setFid(f)
        setUsername(uname)

        const { data } = await supabase.from('wardrips_nft').select('*').eq('fid', f).maybeSingle()

        if (data) {
          setHasGenerated(true)
          setSelectedIndex(data.image_index)
          setRankColor(data.rarity)

          if (data.minted) {
            setHasMinted(true)
            setStep('done')
            setStatus('You already minted this NFT.')
          } else {
            setStep('generated')
            setStatus('Click "Mint NFT" to continue.')
          }
        } else {
          setStep('eligible')
          setStatus('Eligible. Click "Generate" to create your FXBT')
        }
      } catch {
        if (!canceled) {
          setStep('ineligible')
          setStatus('Unable to determine eligibility.')
        }
      } finally {
        if (!canceled) await fetchMintedCount()
      }
    }
    init()
    return () => {
      canceled = true
    }
  }, [])

  const canClick = (key: string, ms = 500) => {
    const now = Date.now()
    const last = lastClickRef.current[key] || 0
    if (now - last < ms) return false
    lastClickRef.current[key] = now
    return true
  }

  const generateNFT = async () => {
    if (!fid) {
      setToast({ msg: 'FID not found.', type: 'error' })
      return
    }
    if (isGenerating || isButtonLocked || hasGenerated) return

    setIsButtonLocked(true)
    setIsGenerating(true)
    setGenerateProgress(0)

    const duration = 5000
    const start = Date.now()

    const tick = () => {
      const elapsed = Date.now() - start
      const pct = Math.min(100, Math.round((elapsed / duration) * 100))
      setGenerateProgress(pct)
      if (elapsed < duration) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)

    try {
      await new Promise((r) => setTimeout(r, duration))

      const idx = Math.floor(Math.random() * total)
      const rank = computeRarityByRank(idx)

      const insertRes = await supabase.from('wardrips_nft').insert([
        {
          fid,
          image_index: idx,
          rarity: rank,
          minted: false,
        },
      ])

      if (insertRes.error) throw insertRes.error

      await fetchMintedCount()

      setSelectedIndex(idx)
      setRankColor(rank)
      setHasGenerated(true)
      setStep('generated')
      setStatus('Click "Mint NFT" to continue.')
      setToast({ msg: 'Farcaster XBT generated successfully.', type: 'success' })
    } catch {
      setToast({ msg: 'Failed to save to Supabase.', type: 'error' })
    } finally {
      setIsGenerating(false)
      setTimeout(() => setGenerateProgress(0), 300)
      setTimeout(() => setIsButtonLocked(false), 600)
    }
  }

  const handleGenerateClick = async () => {
    if (!canClick('generate', 600)) return
    await generateNFT()
  }

  const handleMint = async () => {
    if (!fid || selectedIndex === null) {
      setToast({ msg: 'No generated NFT to mint.', type: 'error' })
      return
    }
    if (isButtonLocked || isMinting) return

    setIsButtonLocked(true)
    setIsMinting(true)
    setStep('minting')
    setStatus('Preparing to mint...')

    try {
      if (!isConnected) {
        const connector = connectors?.[0]
        if (!connector) throw new Error('No wallet connector available.')
        await connectAsync({ connector })
        setToast({ msg: 'Wallet connected. Click Mint again.', type: 'success' })
        setStep('generated')
        setStatus('Wallet connected. Click "Mint NFT" to continue.')
        return
      }

      const ethBalance = Number(balanceData?.formatted || 0)
      if (ethBalance < Number(MINT_PRICE_ETH)) {
        setToast({ msg: `Need gas at least $1 ETH`, type: 'error' })
        setStep('generated')
        return
      }

      setStatus('Uploading metadata...')

      const metaName = username ? `${username} #${fid}` : `User #${fid}`

      const metadata = {
        name: metaName,
        description: `NFT for Farcaster user ${username || fid}`,
        image: `${window.location.origin}/images/${selectedIndex + 1}.png`,
        attributes: [
          { trait_type: 'Rank Color', value: rankColor || 'unknown' },
          { trait_type: 'FID', value: fid },
          { trait_type: 'Username', value: username || '-' },
        ],
      }

      const upload = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(metadata),
      })

      const res = await upload.json()
      if (!res?.ipfs) throw new Error('Upload failed.')

      setStatus('Minting on Base...')

      await writeContractAsync({
        chain: base,
        account: address,
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'mintTo',
        args: [BigInt(fid), res.ipfs],
        value: parseEther(MINT_PRICE_ETH),
      })

      await supabase.from('wardrips_nft').update({ minted: true, metadata }).eq('fid', fid)

      await fetchMintedCount()

      setHasMinted(true)
      setStep('done')
      setStatus('You already minted this NFT.')
      setToast({ msg: 'Mint successful!', type: 'success' })
    } catch (err: any) {
      setToast({ msg: err?.message || 'Mint failed.', type: 'error' })
      setStep('generated')
      setStatus('Click "Mint NFT" to try again.')
    } finally {
      setTimeout(() => {
        setIsMinting(false)
        setIsButtonLocked(false)
      }, 800)
    }
  }

  const handleMintClick = async () => {
    if (!canClick('mint', 800)) return
    await handleMint()
  }

  const handleShare = async () => {
    const text = encodeURIComponent('I just minted my Farcaster XBT NFT!  @takemoney.eth')
    const castUrl = `https://warpcast.com/~/compose?text=${text}&embeds[]=${encodeURIComponent(
      'https://farcaster.xyz/miniapps/EvgnYVZ-21Tc/based-apollo-nft'
    )}`

    try {
      await sdk.actions.openUrl(castUrl)
    } catch {
      window.open(castUrl, '_blank')
    }
  }

  const openSeaLink = fid ? `https://opensea.io/assets/base/basedapollo` : 'https://opensea.io'

  return (
    <div
      style={{
        background: '#000000ff',
        color: '#e4dfdfff',
        padding: 28,
        borderRadius: 18,
        maxWidth: 460,
        margin: '30px auto',
        textAlign: 'center',
        border: '3px solid #000',
        boxShadow: '10px 10px 0 #000',
        fontFamily: 'Inter, Arial, sans-serif',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ textAlign: 'left' }}>
          <h1 style={{ fontSize: 26, fontWeight: 900, margin: 0 }}>Farcaster XBT</h1>
          <div style={{ fontSize: 12, color: '#333', marginTop: 6 }}>{status}</div>
          {/* 🔥 MINTED COUNT */}
          <div style={{ fontSize: 12, color: '#111', marginTop: 4, fontWeight: 700 }}>
            {mintedCount ?? 67}/{MAX_SUPPLY} minted
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6 }}>
          <div style={{ width: 36, height: 36, background: '#001affff', borderRadius: 8, border: '2px solid #ffffffff', boxShadow: '3px 3px 0 #000' }} />
          <div style={{ width: 26, height: 26, background: '#001affff', borderRadius: 6, border: '2px solid #ffffffff', boxShadow: '3px 3px 0 #000' }} />
        </div>
      </div>

      {/* Main Card */}
      <div
        style={{
          marginTop: 18,
          background: 'linear-gradient(180deg, rgba(0, 0, 0, 0.95), rgba(0, 0, 0, 0.85))',
          borderRadius: 14,
          padding: 16,
          border: '2px solid rgba(0,0,0,0.12)',
          boxShadow: 'inset 0 -6px 0 rgba(0,0,0,0.02)',
        }}
      >
        {/* Image Box */}
        <div
          style={{
            background: '#000000ff',
            padding: 10,
            borderRadius: 12,
            border: '3px solid #ffffffff',
            boxShadow: '4px 4px 0 #000000ff',
            display: 'inline-block',
            width: '100%',
            maxWidth: 360,
          }}
        >
          {selectedIndex === null ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}>
              <Image
                src="/icon.png"
                alt="Placeholder"
                width={220}
                height={220}
                style={{
                  width: '70%',
                  height: 'auto',
                  borderRadius: 16,
                  border: '3px solid #000000ff',
                  boxShadow: '4px 4px 0 #ffffffff',
                }}
              />
            </div>
          ) : (
            <Image
              src={`/images/${selectedIndex + 1}.png`}
              alt="Based Apollo"
              width={600}
              height={600}
              style={{ width: '100%', height: 'auto', borderRadius: 10 }}
            />
          )}
        </div>

        {/* FIXED — username #fid text */}
        {selectedIndex !== null && fid && (
          <div
            style={{
              marginTop: 10,
              textAlign: 'center',
              fontSize: 12,
              fontWeight: 700,
              opacity: 0.8,
              letterSpacing: 0.5,
              textTransform: 'uppercase',
            }}
          >
            {username ? `${username} #${fid}` : `User #${fid}`}
          </div>
        )}

        {/* ACTION BUTTONS */}
        <div style={{ marginTop: 16, display: 'grid', gap: 10 }}>
          {step === 'eligible' && (
            <>
              <button
                type="button"
                onClick={handleGenerateClick}
                disabled={isGenerating || hasGenerated || isButtonLocked}
                style={{
                  ...btnStyle,
                  background: 'linear-gradient(180deg, #000000ff, #000000ff)',
                  cursor: isGenerating || hasGenerated || isButtonLocked ? 'not-allowed' : 'pointer',
                  opacity: isGenerating || hasGenerated || isButtonLocked ? 0.7 : 1,
                  pointerEvents: isGenerating || hasGenerated || isButtonLocked ? 'none' : 'auto',
                }}
              >
                {isGenerating ? 'Generating...' : 'Generate'}
              </button>

              {isGenerating && <GeneratingUI progress={generateProgress} />}
            </>
          )}

          {step === 'generated' && !hasMinted && selectedIndex !== null && (
            <button
              type="button"
              onClick={handleMintClick}
              disabled={isMinting || isButtonLocked}
              style={{
                ...btnStyle,
                background: '#000000ff',
                cursor: isMinting || isButtonLocked ? 'not-allowed' : 'pointer',
                opacity: isMinting || isButtonLocked ? 0.7 : 1,
                pointerEvents: isMinting || isButtonLocked ? 'none' : 'auto',
              }}
            >
              {isMinting ? 'Minting...' : 'Mint NFT'}
            </button>
          )}

          {(step === 'done' || hasMinted) && (
            <>
              <button
                type="button"
                onClick={handleShare}
                style={{
                  ...btnStyle,
                  opacity: isButtonLocked ? 0.7 : 1,
                  pointerEvents: isButtonLocked ? 'none' : 'auto',
                }}
              >
                Share
              </button>

              <a href={openSeaLink} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
                <div
                  role="button"
                  tabIndex={0}
                  onKeyDown={() => {}}
                  style={{ ...btnStyle, background: '#fff', cursor: 'pointer' }}
                >
                  View on OpenSea
                </div>
              </a>
            </>
          )}

          {step === 'ineligible' && (
            <button
              type="button"
              onClick={() => window.open('https://farcaster.xyz/miniapps/EvgnYVZ-21Tc/based-apollo-nft', '_blank')}
              style={{ ...btnStyle, background: '#000000ff' }}
            >
              Open MiniApp in Farcaster
            </button>
          )}
        </div>
      </div>

      {toast && <Toast message={toast.msg} type={toast.type} />}
    </div>
  )
}

const btnStyle: React.CSSProperties = {
  padding: '14px 18px',
  borderRadius: 12,
  background: '#000000ff',
  border: '2px solid #ffffffff',
  color: '#ffffffff',
  fontSize: 15,
  fontWeight: 900,
  width: '100%',
  cursor: 'pointer',
  boxShadow: '6px 6px 0 #000',
}

export default function BasedApolloGenerator() {
  return (
    <QueryClientProvider client={queryClient}>
      <WagmiConfig config={config}>
        <BasedApolloInner />
      </WagmiConfig>
    </QueryClientProvider>
  )
}
