import fs from "fs"
import readline from "readline/promises"
import { exec } from "child_process"
import { fileURLToPath } from "url"

// Resolve .env path relative to this script directory
const envPath = fileURLToPath(new URL("../.env", import.meta.url))
const sampleEnvPath = fileURLToPath(new URL("../.env.sample", import.meta.url))

// Helper to open a URL in the default system browser
function openBrowser(url) {
  const startCmd =
    process.platform === "darwin"
      ? "open"
      : process.platform === "win32"
        ? "start"
        : "xdg-open"
  exec(`${startCmd} "${url}"`, () => {
    // Silently ignore browser launch errors since the URL is printed
  })
}

// Read TMDB_TOKEN from .env file if available
function readTokenFromEnv() {
  if (!fs.existsSync(envPath)) return null
  const content = fs.readFileSync(envPath, "utf8")
  const match = content.match(/^TMDB_TOKEN=["']?([^"'\r\n]+)["']?/m)
  return match ? match[1].trim() : null
}

// Save the access token into .env, preserving all existing configurations
function saveTokenToEnv(token) {
  let content = ""
  if (fs.existsSync(envPath)) {
    content = fs.readFileSync(envPath, "utf8")
  } else if (fs.existsSync(sampleEnvPath)) {
    content = fs.readFileSync(sampleEnvPath, "utf8")
  }

  if (/^TMDB_TOKEN=/m.test(content)) {
    content = content.replace(/^TMDB_TOKEN=.*$/m, `TMDB_TOKEN="${token}"`)
  } else {
    content += `\nTMDB_TOKEN="${token}"\n`
  }

  fs.writeFileSync(envPath, content, "utf8")
}

async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  console.log("\n==============================================")
  console.log("  TropoCine - TMDB Write Authorization Setup  ")
  console.log("==============================================\n")

  let initialToken = readTokenFromEnv()

  if (!initialToken) {
    console.log("No TMDB_TOKEN found in your .env file.")
    console.log("Please retrieve your 'API Read Access Token (v4)' from:")
    console.log("https://www.themoviedb.org/settings/api\n")
    initialToken = (
      await rl.question("Paste your TMDB Read Access Token: ")
    ).trim()
  }

  if (!initialToken) {
    console.error("❌ Error: TMDB token is required.")
    rl.close()
    process.exit(1)
  }

  console.log("\n1/3. Generating TMDB authorization request token...")

  let requestToken
  try {
    const res = await fetch("https://api.themoviedb.org/4/auth/request_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json;charset=utf-8",
        Authorization: `Bearer ${initialToken}`,
      },
      body: JSON.stringify({}),
    })

    const data = await res.json()
    if (!res.ok || !data.success) {
      throw new Error(
        data.status_message || `HTTP ${res.status}: ${res.statusText}`,
      )
    }
    requestToken = data.request_token
  } catch (err) {
    console.error(`\n❌ Failed to request authorization token: ${err.message}`)
    console.error(
      "Please check that your Read Access Token is valid and has not expired.\n",
    )
    rl.close()
    process.exit(1)
  }

  const authUrl = `https://www.themoviedb.org/auth/access?request_token=${requestToken}`

  console.log("\n2/3. Authorizing your TMDB account...")
  console.log("Opening approval page in your default browser:")
  console.log(`\n  👉 ${authUrl}\n`)
  openBrowser(authUrl)

  console.log("Please click 'Approve' on the TMDB webpage.")
  await rl.question("Once approved, press [Enter] to finalize the setup... ")

  console.log("\n3/3. Exchanging for permanent User Access Token...")

  try {
    const res = await fetch("https://api.themoviedb.org/4/auth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json;charset=utf-8",
        Authorization: `Bearer ${initialToken}`,
      },
      body: JSON.stringify({ request_token: requestToken }),
    })

    const data = await res.json()
    if (!res.ok || !data.success) {
      throw new Error(
        data.status_message || `HTTP ${res.status}: ${res.statusText}`,
      )
    }

    saveTokenToEnv(data.access_token)

    console.log("\n✅ Success! User Access Token successfully generated.")
    if (data.account_id) {
      console.log(`👤 Connected TMDB Account ID: ${data.account_id}`)
    }
    console.log(`💾 Saved to: ${envPath}`)
    console.log(
      "\nTropoCine is now fully configured with read and write permissions!\n",
    )
  } catch (err) {
    console.error(`\n❌ Failed to obtain User Access Token: ${err.message}`)
    console.error(
      "Make sure you approved the request in your browser before pressing [Enter].\n",
    )
    process.exit(1)
  } finally {
    rl.close()
  }
}

main()
