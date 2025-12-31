export const runtime = 'nodejs'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const metadata = await req.json()

    if (!metadata?.name || !metadata?.image) {
      return NextResponse.json({ error: 'Missing name or image' }, { status: 400 })
    }

    const jwt = process.env.PINATA_JWT
    const apiKey = process.env.PINATA_API_KEY
    const secret = process.env.PINATA_SECRET_API_KEY

    let headers: Record<string, string> = { 'Content-Type': 'application/json' }

    if (jwt) {
      headers['Authorization'] = `Bearer ${jwt}`
    } else if (apiKey && secret) {
      headers['pinata_api_key'] = apiKey
      headers['pinata_secret_api_key'] = secret
    } else {
      return NextResponse.json(
        { error: 'Missing Pinata credentials (JWT or API Key)' },
        { status: 500 }
      )
    }

    const payload = {
      pinataMetadata: { name: metadata.name },
      pinataContent: metadata,
    }

    const res = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    })

    const text = await res.text() // baca semua teks respon dari Pinata
    let data: any = null
    try {
      data = JSON.parse(text)
    } catch (err) {
      console.error('Pinata returned non-JSON:', text)
      return NextResponse.json(
        { error: 'Pinata returned non-JSON', raw: text },
        { status: 500 }
      )
    }

    if (!res.ok || !data?.IpfsHash) {
      console.error('Pinata upload failed:', data)
      return NextResponse.json(
        { error: 'Pinata upload failed', detail: data },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      ipfs: `ipfs://${data.IpfsHash}`,
      gateway: `https://gateway.pinata.cloud/ipfs/${data.IpfsHash}`,
      hash: data.IpfsHash,
    })
  } catch (e: any) {
    console.error('Upload Error:', e)
    return NextResponse.json(
      { error: e?.message || 'Unexpected upload error' },
      { status: 500 }
    )
  }
}
