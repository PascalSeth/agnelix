import fs from "fs"
import path from "path"
import { extractPdfPages } from "../lib/pdf-reader"

async function main() {
  const pdfPath = path.join(process.cwd(), "docs", "DotCom Secrets by Russell Brunson.pdf")
  console.log(`\n======================================================`)
  console.log(`📄 Testing PDF: ${path.basename(pdfPath)}`)
  console.log(`======================================================`)

  if (!fs.existsSync(pdfPath)) {
    console.error(`❌ PDF file not found at: ${pdfPath}`)
    process.exit(1)
  }

  const buffer = fs.readFileSync(pdfPath)
  console.log(`📦 File Size: ${(buffer.length / (1024 * 1024)).toFixed(2)} MB`)

  console.log(`\n⏳ Extracting pages with pdf-parse v2 native parser...`)
  const startTime = performance.now()
  const pages = await extractPdfPages(buffer)
  const duration = ((performance.now() - startTime) / 1000).toFixed(2)

  console.log(`\n✅ Extraction Complete!`)
  console.log(`⏱️  Duration: ${duration}s`)
  console.log(`📑 Total Pages Extracted: ${pages.length}`)

  const totalChars = pages.reduce((acc, p) => acc + p.text.length, 0)
  console.log(`🔤 Total Characters Extracted: ${totalChars.toLocaleString()}`)

  if (pages.length > 0) {
    console.log(`\n---------------- [Page 1 Preview] ----------------`)
    console.log(`Page Number: ${pages[0].pageNum} (Chars: ${pages[0].text.length})`)
    console.log(pages[0].text.slice(0, 300) + (pages[0].text.length > 300 ? "..." : ""))

    if (pages.length > 1) {
      const midIdx = Math.floor(pages.length / 2)
      console.log(`\n---------------- [Middle Page Preview (Page ${pages[midIdx].pageNum})] ----------------`)
      console.log(pages[midIdx].text.slice(0, 300) + (pages[midIdx].text.length > 300 ? "..." : ""))

      const lastIdx = pages.length - 1
      console.log(`\n---------------- [Last Page Preview (Page ${pages[lastIdx].pageNum})] ----------------`)
      console.log(pages[lastIdx].text.slice(0, 300) + (pages[lastIdx].text.length > 300 ? "..." : ""))
    }
  }
  console.log(`\n======================================================\n`)
}

main().catch(err => {
  console.error("❌ Extraction failed with error:", err)
  process.exit(1)
})
