import { NextResponse } from "next/server";

export async function GET() {
  const html = `
  <!DOCTYPE html>
  <html>
    <head>
      <meta property="og:title" content="Based Apollo NFT" />
      <meta property="og:description" content="BASED APOLLO NFT for Farcaster user." />
      <meta property="og:image" content="https://based-apollo.vercel.app/splash.png" />
      <meta property="fc:frame" content="vNext" />
      <meta property="fc:frame:image" content="https://based-apollo.vercel.app/splash.pngg" />
      <meta property="fc:frame:button:1" content="Mint Now" />
      <meta property="fc:frame:post_url" content="https://based-apollo.vercel.app/" />
    </head>
    <body></body>
  </html>`;

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      "Pragma": "no-cache",
      "Expires": "0",
      "Surrogate-Control": "no-store",
    },
  });
}
