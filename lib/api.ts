export async function checkEligibility(token: string) {
  const res = await fetch('/api/checkEligible', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ token }) })
  return res.json()
}

export async function mintManaged(token: string, metadataURI: string) {
  const res = await fetch('/api/mint', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ token, metadataURI }) })
  return res.json()
}
