import zlib from "zlib"

export interface PdfPage {
  pageNum: number
  text: string
}

/**
 * Extracts page-by-page text from a PDF buffer with accurate page numbers.
 * Leverages pdf-parse v2 native pages extraction, raw text delimiter detection,
 * and robust binary stream decompression fallbacks.
 */
export async function extractPdfPages(buffer: Buffer): Promise<PdfPage[]> {
  if (!buffer || buffer.length === 0) {
    throw new Error("Empty PDF buffer provided")
  }

  // ── Strategy 1: pdf-parse v2 native per-page extraction ──────────────────
  try {
    const { PDFParse } = await import("pdf-parse")
    const parser = new PDFParse({ data: buffer })
    try {
      const result = await parser.getText()
      if (result && Array.isArray(result.pages) && result.pages.length > 0) {
        const pages: PdfPage[] = []
        for (let i = 0; i < result.pages.length; i++) {
          const page = result.pages[i]
          const text = cleanPdfText(page.text || "")
          if (text.length > 10) {
            pages.push({
              pageNum: typeof page.num === "number" ? page.num : i + 1,
              text,
            })
          }
        }
        if (pages.length > 0) {
          return pages
        }
      }
    } finally {
      await parser.destroy().catch(() => {})
    }
  } catch (err) {
    console.warn("[pdf-reader] Strategy 1 (pdf-parse v2) page extraction failed:", err)
  }

  // ── Fallback: Extract full text via multi-tier strategies and paginate ────
  const fullText = await extractPdfText(buffer, { skipPdfParse: true })
  return paginateText(fullText, 2200)
}

/**
 * Universal text paginator that converts any continuous book text, pasted document,
 * or raw PDF text into structured ~2,200 character pages with sequential page numbering.
 */
export function paginateText(text: string, charsPerPage = 2200): PdfPage[] {
  if (!text || text.trim().length === 0) return []

  // 1. Detect delimiters in RAW text before cleaning
  const pageDelimiterRegex = /\f|--\s*\d+\s+of\s+\d+\s*--/i
  if (pageDelimiterRegex.test(text)) {
    const splitRegex = /\f|--\s*\d+\s+of\s+\d+\s*--/gi
    const rawParts = text
      .split(splitRegex)
      .map(s => s.trim())
      .filter(s => s.length > 15)

    if (rawParts.length >= 2) {
      return rawParts.map((t, idx) => ({
        pageNum: idx + 1,
        text: cleanPdfText(t),
      }))
    }
  }

  // 2. Continuous line-by-line pagination into ~2,200 chars per page
  const clean = cleanPdfText(text)
  const lines = clean.split(/\r?\n/)
  const pages: PdfPage[] = []
  let currentLines: string[] = []
  let currentLen = 0

  for (const line of lines) {
    currentLines.push(line)
    currentLen += line.length + 1

    if (currentLen >= charsPerPage) {
      pages.push({
        pageNum: pages.length + 1,
        text: currentLines.join("\n").trim(),
      })
      currentLines = []
      currentLen = 0
    }
  }

  if (currentLines.length > 0) {
    const remaining = currentLines.join("\n").trim()
    if (remaining.length > 20 || pages.length === 0) {
      pages.push({
        pageNum: pages.length + 1,
        text: remaining,
      })
    }
  }

  return pages.length > 0 ? pages : [{ pageNum: 1, text: clean }]
}

/**
 * Robust Multi-Tier PDF Text Extractor (Full Text)
 */
export async function extractPdfText(
  buffer: Buffer,
  options?: { skipPdfParse?: boolean }
): Promise<string> {
  if (!buffer || buffer.length === 0) {
    throw new Error("Empty PDF buffer provided")
  }

  let extractedText = ""

  // ── Strategy 1: pdf-parse v2 primary parser ────────────────────────────────
  if (!options?.skipPdfParse) {
    try {
      const { PDFParse } = await import("pdf-parse")
      const parser = new PDFParse({ data: buffer })
      try {
        const result = await parser.getText()
        if (result && typeof result.text === "string" && result.text.trim().length > 30) {
          extractedText = result.text.trim()
        }
      } finally {
        await parser.destroy().catch(() => {})
      }
    } catch (err) {
      console.warn("[pdf-reader] Strategy 1 (pdf-parse getText) failed:", err)
    }

    if (extractedText.length > 100) {
      return cleanPdfText(extractedText)
    }
  }

  // ── Strategy 2: Native Stream Decompression & Content Stream Parsing ────────
  try {
    const streamText = extractFromBinaryStreams(buffer)
    if (streamText && streamText.length > extractedText.length) {
      extractedText = streamText
    }
  } catch (err) {
    console.warn("[pdf-reader] Strategy 2 (binary stream decompression) failed:", err)
  }

  if (extractedText.length > 100) {
    return cleanPdfText(extractedText)
  }

  // ── Strategy 3: Plain text / uncompressed string extraction ─────────────────
  try {
    const rawText = extractRawStrings(buffer)
    if (rawText && rawText.length > extractedText.length) {
      extractedText = rawText
    }
  } catch (err) {
    console.warn("[pdf-reader] Strategy 3 (raw string extraction) failed:", err)
  }

  if (!extractedText || extractedText.trim().length < 20) {
    throw new Error("No readable text could be extracted from this PDF document")
  }

  return cleanPdfText(extractedText)
}

/**
 * Extracts and decompresses all PDF content streams directly from binary buffers.
 * Handles both explicit /Length dictionary properties and stream...endstream boundaries.
 */
function extractFromBinaryStreams(buffer: Buffer): string {
  const textChunks: string[] = []
  const content = buffer.toString("binary")

  // Find all stream blocks using stream dictionaries
  const streamDictRegex = /<<([\s\S]*?)>>\s*stream\r?\n/g
  let match: RegExpExecArray | null

  while ((match = streamDictRegex.exec(content)) !== null) {
    const dict = match[1]
    const streamStart = streamDictRegex.lastIndex

    let rawStream: Buffer | null = null
    const lengthMatch = dict.match(/\/Length\s+(\d+)\b/)

    if (lengthMatch) {
      const len = parseInt(lengthMatch[1], 10)
      if (len > 0 && streamStart + len <= buffer.length) {
        rawStream = buffer.subarray(streamStart, streamStart + len)
      }
    }

    if (!rawStream) {
      // Fallback: search for endstream
      const endstreamIdx = content.indexOf("endstream", streamStart)
      if (endstreamIdx !== -1) {
        let end = endstreamIdx
        if (content[end - 1] === "\n") end--
        if (content[end - 1] === "\r") end--
        rawStream = buffer.subarray(streamStart, end)
      }
    }

    if (rawStream && rawStream.length > 0) {
      let decompressed: Buffer | null = null

      try {
        decompressed = zlib.inflateSync(rawStream)
      } catch {
        try {
          decompressed = zlib.inflateRawSync(rawStream)
        } catch {
          decompressed = rawStream
        }
      }

      if (decompressed && decompressed.length > 0) {
        const streamStr = decompressed.toString("latin1")

        // Extract text within BT (Begin Text) ... ET (End Text) blocks
        const btRegex = /BT([\s\S]*?)ET/g
        let btMatch: RegExpExecArray | null

        while ((btMatch = btRegex.exec(streamStr)) !== null) {
          const btBlock = btMatch[1]

          // 1. Match (text) Tj and ' / " operators with escape handling
          const tjRegex = /\(((?:\\.|[^\\)])*)\)\s*(?:Tj|'|")/g
          let tjMatch: RegExpExecArray | null
          while ((tjMatch = tjRegex.exec(btBlock)) !== null) {
            textChunks.push(decodePdfString(tjMatch[1]))
          }

          // 2. Match [(array of strings / spacing)] TJ operator
          const arrayTjRegex = /\[([\s\S]*?)\]\s*TJ/g
          let arrMatch: RegExpExecArray | null
          while ((arrMatch = arrayTjRegex.exec(btBlock)) !== null) {
            const inner = arrMatch[1]
            const innerTjRegex = /\(((?:\\.|[^\\)])*)\)/g
            let innerMatch: RegExpExecArray | null
            while ((innerMatch = innerTjRegex.exec(inner)) !== null) {
              textChunks.push(decodePdfString(innerMatch[1]))
            }
          }

          // 3. Match hex strings <48656c6c6f> Tj
          const hexTjRegex = /<([0-9a-fA-F\s]+)>\s*Tj/g
          let hexMatch: RegExpExecArray | null
          while ((hexMatch = hexTjRegex.exec(btBlock)) !== null) {
            const hex = hexMatch[1].replace(/\s+/g, "")
            if (hex.length % 2 === 0) {
              try {
                const decoded = Buffer.from(hex, "hex").toString("utf8")
                textChunks.push(decoded)
              } catch { /* skip */ }
            }
          }
        }
      }
    }
  }

  // Fallback to simple stream regex if dictionary parsing found no text
  if (textChunks.length === 0) {
    const genericStreamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g
    let gMatch: RegExpExecArray | null
    while ((gMatch = genericStreamRegex.exec(content)) !== null) {
      try {
        const raw = Buffer.from(gMatch[1], "binary")
        const decomp = zlib.inflateSync(raw)
        const str = decomp.toString("latin1")
        const tjRegex = /\(((?:\\.|[^\\)])*)\)\s*(?:Tj|'|")/g
        let m: RegExpExecArray | null
        while ((m = tjRegex.exec(str)) !== null) {
          textChunks.push(decodePdfString(m[1]))
        }
      } catch { /* skip */ }
    }
  }

  return textChunks.join(" ")
}

/**
 * Extracts printable text blocks from uncompressed portions of the buffer,
 * respecting escaped parentheses \( and \) and common PDF string escape sequences.
 */
function extractRawStrings(buffer: Buffer): string {
  const content = buffer.toString("latin1")
  const matches = content.match(/\((?:\\.|[^\\)]){3,}\)/g) ?? []
  return matches
    .map(m => m.slice(1, -1))
    .map(s => decodePdfString(s))
    .filter(s => /[a-zA-Z]{2,}/.test(s) && !s.startsWith("PDF") && !s.includes("CreationDate"))
    .join(" ")
}

/**
 * Unescapes standard PDF string escape sequences in a single pass to prevent double-unescaping.
 * Handles \n, \r, \t, \b, \f, \(, \), \\, octal codes (\ddd), and escaped line endings.
 */
export function decodePdfString(str: string): string {
  return str.replace(/\\([0-7]{1,3}|[\s\S])/g, (_, esc) => {
    if (/^[0-7]{1,3}$/.test(esc)) {
      const code = parseInt(esc, 8)
      return code === 0 ? "" : String.fromCharCode(code)
    }
    switch (esc) {
      case "n": return "\n"
      case "r": return "\r"
      case "t": return "\t"
      case "b": return "\b"
      case "f": return "\f"
      case "(": return "("
      case ")": return ")"
      case "\\": return "\\"
      case "\r\n":
      case "\n":
      case "\r": return "" // PDF line continuation
      default: return esc
    }
  })
}

/**
 * Cleans extracted PDF text while preserving line breaks, tabs, and form feeds (\f).
 */
export function cleanPdfText(text: string): string {
  return text
    .replace(/\0/g, "")
    .replace(/\u0000/g, "")
    .replace(/[\x00-\x08\x0B\x0E-\x1F]/g, " ")
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}
