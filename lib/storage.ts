import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const BUCKET = "images"

export async function uploadLogo(file: File, userId: string): Promise<string> {
  const ext = file.name.split(".").pop()
  const path = `agency-logos/${userId}-${Date.now()}.${ext}`

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true })

  if (error) throw error

  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path)

  return publicUrl
}

export async function deleteLogo(url: string) {
  // Extract the path after /object/public/images/
  const match = url.match(/\/object\/public\/images\/(.+)$/)
  if (!match) return
  await supabase.storage.from(BUCKET).remove([match[1]])
}

export async function uploadReportPdf(buffer: Buffer, userId: string, reportId: string): Promise<string> {
  const path = `client-reports/${userId}-${reportId}-${Date.now()}.pdf`

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, { upsert: true, contentType: "application/pdf" })

  if (error) throw error

  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path)

  return publicUrl
}
