import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const API_BASE = 'https://api.almostcrackd.ai'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const token = session!.access_token

  const { imageFile, imageUrl: existingImageUrl, humorFlavorId } = await request.json()

  let resolvedImageUrl: string

  if (imageFile) {
    // imageFile is a base64 data URL — convert to Blob for upload
    const [meta, base64] = imageFile.split(',')
    const contentType = meta.match(/:(.*?);/)?.[1] ?? 'image/jpeg'
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
    const blob = new Blob([bytes], { type: contentType })

    // Step 1: Generate presigned URL
    const presignedRes = await fetch(`${API_BASE}/pipeline/generate-presigned-url`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ contentType }),
    })
    if (!presignedRes.ok) {
      const t = await presignedRes.text()
      return NextResponse.json({ error: `Presigned URL failed: ${t}` }, { status: 502 })
    }
    const { presignedUrl, cdnUrl } = await presignedRes.json()

    // Step 2: Upload image bytes
    await fetch(presignedUrl, {
      method: 'PUT',
      headers: { 'Content-Type': contentType },
      body: blob,
    })

    resolvedImageUrl = cdnUrl
  } else {
    resolvedImageUrl = existingImageUrl
  }

  // Step 3: Register image URL
  const registerRes = await fetch(`${API_BASE}/pipeline/upload-image-from-url`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageUrl: resolvedImageUrl, isCommonUse: false }),
  })
  if (!registerRes.ok) {
    const t = await registerRes.text()
    return NextResponse.json({ error: `Image registration failed: ${t}` }, { status: 502 })
  }
  const { imageId } = await registerRes.json()

  // Step 4: Generate captions
  const captionsRes = await fetch(`${API_BASE}/pipeline/generate-captions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageId, humorFlavorId }),
  })
  const captions = await captionsRes.json()

  if (!captionsRes.ok) {
    return NextResponse.json(captions, { status: captionsRes.status })
  }
  return NextResponse.json(captions)
}
