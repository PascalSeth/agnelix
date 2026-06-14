import "dotenv/config"
import { detectReplies } from "../lib/imap"

async function main() {
  const result = await detectReplies()
  console.log("detectReplies result:", result)
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => process.exit(0))
