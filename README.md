# Wardrips MiniApp (Next.js) - Deployable to Vercel

This project is a starter miniapp for Farcaster/Neynar that implements:
- Auto Neynar login (no wallet connect button required)
- Eligibility check (fid >= 1,000,000 and neynar_score >= 0.2)
- Generate random image from 63 assets
- Assign rarity and show preview: "Wardrips #<FID>"
- Upload metadata to Pinata (IPFS)
- Mint flow (placeholder for Neynar Managed Signer / relayer)
- Share to Farcaster and OpenSea link generation

IMPORTANT:
- Add your 63 images to `public/images/1.png` ... `public/images/63.png`.
- Fill environment variables in Vercel dashboard or `.env.local` for local testing.
- `app/api/mint/route.ts` contains a placeholder for the managed-signer call; replace with real Neynar relayer API.
