import { detectReplies } from "../lib/imap"

async function main() {
  console.log("Running detectReplies()...")
  const result = await detectReplies()
  console.log("Result:", result)
}

main()
  .then(() => process.exit(0))
  .catch(e => {
    console.error("detectReplies error:", e)
    process.exit(1)
  })
