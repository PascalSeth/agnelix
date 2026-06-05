import "dotenv/config"

async function main() {
  const apiKey = process.env.GOOGLE_SEARCH_API_KEY
  const cx     = process.env.GOOGLE_SEARCH_CX

  console.log("API Key found:", !!apiKey)
  console.log("CX found:", !!cx)

  const query = `site:linkedin.com/in/ "Social Media 55" "Montreal" (founder OR owner OR director OR CEO OR MD)`
  const url   = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(query)}&num=10`

  console.log("\nSearching:", query)

  const res  = await fetch(url, { signal: AbortSignal.timeout(8000) })
  const data = await res.json()

  if (!res.ok) {
    console.error("Error:", data.error?.message ?? data)
    return
  }

  const items = data.items ?? []
  console.log(`\nResults: ${items.length}`)
  for (const item of items) {
    console.log(`  ${item.title}`)
    console.log(`  ${item.link}`)
    console.log()
  }
}

main()
