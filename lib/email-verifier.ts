import dns from "dns"
import net from "net"

// Resolves MX records for a domain
export async function getMxServers(domain: string): Promise<string[]> {
  try {
    const records = await dns.promises.resolveMx(domain)
    if (!records || records.length === 0) return []
    // Sort by priority ascending (lowest value = highest priority)
    return records.sort((a, b) => a.priority - b.priority).map(r => r.exchange)
  } catch {
    return []
  }
}

// Generates 8 standard permutations
export function generateEmailPermutations(firstName: string, lastName: string, domain: string): string[] {
  const f = firstName.toLowerCase().trim()
  const l = lastName.toLowerCase().trim()
  const d = domain.toLowerCase().trim()

  if (!f || !l) return []

  const list = [
    `${f}@${d}`,                          // john@company.com
    `${f}.${l}@${d}`,                     // john.doe@company.com
    `${f}${l}@${d}`,                      // johndoe@company.com
    `${f.charAt(0)}${l}@${d}`,            // jdoe@company.com
    `${f}${l.charAt(0)}@${d}`,            // johnd@company.com
    `${f.charAt(0)}.${l}@${d}`,           // j.doe@company.com
    `${l}@${d}`,                          // doe@company.com
    `${f}_${l}@${d}`                      // john_doe@company.com
  ]

  // Remove duplicates
  return Array.from(new Set(list))
}

export interface SmtpSessionResult {
  isCatchAll: boolean
  results: Record<string, "valid" | "invalid" | "unknown">
}

// Connects to target MX server and validates list of candidate emails in a single session
export async function testEmailsSmtp(
  domain: string,
  emails: string[],
  senderEmail = "verify@leadgenz.com"
): Promise<SmtpSessionResult> {
  const mxServers = await getMxServers(domain)
  const results: Record<string, "valid" | "invalid" | "unknown"> = {}
  
  for (const email of emails) {
    results[email] = "unknown"
  }

  if (mxServers.length === 0) {
    return { isCatchAll: false, results }
  }

  const mxHost = mxServers[0]!
  const timeoutMs = 6000

  return new Promise((resolve) => {
    let socket: net.Socket
    try {
      socket = net.createConnection(25, mxHost)
    } catch {
      return resolve({ isCatchAll: false, results })
    }

    socket.setTimeout(timeoutMs)
    socket.setEncoding("ascii")

    let stage = 0 // 0: connect, 1: HELO, 2: MAIL FROM, 3: CATCHALL_CHECK, 4: RCPT CHECKING, 5: QUIT
    let buffer = ""
    let isCatchAll = false
    let currentEmailIndex = -1
    const emailsToCheck = [...emails]
    const catchAllTestEmail = `galien_chk_${Math.floor(Math.random() * 100000)}@${domain}`

    function send(cmd: string) {
      if (socket.writable) {
        socket.write(cmd + "\r\n")
      }
    }

    function cleanupAndResolve() {
      try {
        socket.destroy()
      } catch {}
      resolve({ isCatchAll, results })
    }

    socket.on("connect", () => {
      // Connect is handled when we receive 220 banner
    })

    socket.on("timeout", () => {
      cleanupAndResolve()
    })

    socket.on("error", () => {
      cleanupAndResolve()
    })

    socket.on("close", () => {
      cleanupAndResolve()
    })

    socket.on("data", (data) => {
      buffer += data
      if (!buffer.endsWith("\r\n")) return

      const lines = buffer.split("\r\n").filter(Boolean)
      buffer = "" // clear buffer

      const lastLine = lines[lines.length - 1] ?? ""
      const code = parseInt(lastLine.slice(0, 3), 10)

      if (stage === 0) {
        if (code === 220) {
          stage = 1
          send("HELO galien.com")
        } else {
          cleanupAndResolve()
        }
      } else if (stage === 1) {
        if (code === 250) {
          stage = 2
          send(`MAIL FROM:<${senderEmail}>`)
        } else {
          cleanupAndResolve()
        }
      } else if (stage === 2) {
        if (code === 250) {
          stage = 3
          send(`RCPT TO:<${catchAllTestEmail}>`)
        } else {
          cleanupAndResolve()
        }
      } else if (stage === 3) {
        if (code === 250) {
          isCatchAll = true
          stage = 5
          send("QUIT")
        } else {
          stage = 4
          currentEmailIndex = 0
          if (emailsToCheck.length > 0) {
            send(`RCPT TO:<${emailsToCheck[currentEmailIndex]}>`)
          } else {
            stage = 5
            send("QUIT")
          }
        }
      } else if (stage === 4) {
        const checkedEmail = emailsToCheck[currentEmailIndex]!
        if (code === 250) {
          results[checkedEmail] = "valid"
        } else if (code === 550 || code === 551 || code === 553 || code === 554) {
          results[checkedEmail] = "invalid"
        } else {
          results[checkedEmail] = "unknown"
        }

        currentEmailIndex++
        if (currentEmailIndex < emailsToCheck.length) {
          send(`RCPT TO:<${emailsToCheck[currentEmailIndex]}>`)
        } else {
          stage = 5
          send("QUIT")
        }
      } else if (stage === 5) {
        cleanupAndResolve()
      }
    })
  })
}
