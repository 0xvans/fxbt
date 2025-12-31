import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase environment variables are missing.')
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const fid = searchParams.get('fid')

  if (!fid) {
    return NextResponse.json({ error: 'Missing fid' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('wardrips_nft')
    .select('*')
    .eq('fid', fid)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
