import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Resolve paths to package.json and docs directory
const projectRoot = path.resolve(__dirname, "..")
const packageJsonPath = path.join(projectRoot, "package.json")
const docsDir = path.join(projectRoot, "docs")

// Read homepage from package.json
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"))
const homepage = (packageJson.homepage || "").replace(/\/+$/, "")

if (!homepage) {
  console.error("Error: No 'homepage' field found in package.json")
  process.exit(1)
}

const docFiles = ["index.html", "index-fr.html"]

// Update metadata URLs in static presentation HTML pages
docFiles.forEach((file) => {
  const filePath = path.join(docsDir, file)
  if (!fs.existsSync(filePath)) {
    console.warn(`File not found: ${filePath}`)
    return
  }

  let content = fs.readFileSync(filePath, "utf8")

  // Update canonical link tag
  content = content.replace(
    /(<link\s+rel="canonical"\s+href=")[^"]*(\/index(-fr)?\.html"\s*\/>)/g,
    `$1${homepage}$2`,
  )

  // Update alternate hreflang tags
  content = content.replace(
    /(<link\s+rel="alternate"\s+hreflang="[^"]+"\s+href=")[^"]*(\/index(-fr)?\.html"\s*\/>)/g,
    `$1${homepage}$2`,
  )

  // Update Open Graph url tag
  content = content.replace(
    /(<meta\s+property="og:url"\s+content=")[^"]*(\/index\.html"\s*\/>)/g,
    `$1${homepage}$2`,
  )

  // Update Twitter url tag
  content = content.replace(
    /(<meta\s+name="twitter:url"\s+content=")[^"]*(\/index\.html"\s*\/>)/g,
    `$1${homepage}$2`,
  )

  // Update Schema.org image URL
  content = content.replace(
    /("image":\s*")[^"]*(\/icon-512\.png")/g,
    `$1${homepage}$2`,
  )

  fs.writeFileSync(filePath, content, "utf8")
  console.log(`Synchronized homepage URLs in ${file}`)
})
