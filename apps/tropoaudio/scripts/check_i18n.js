import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Resolve paths
const projectRoot = path.resolve(__dirname, "..")
const workspaceRoot = path.resolve(projectRoot, "../..")
const frJsonPath = path.join(projectRoot, "src/i18n/fr.json")
const commonFrPath = path.join(workspaceRoot, "packages/react/src/i18n/fr.json")

console.log("Reading file:", frJsonPath)
const frJson = JSON.parse(fs.readFileSync(frJsonPath, "utf8"))
const commonFr = fs.existsSync(commonFrPath)
  ? JSON.parse(fs.readFileSync(commonFrPath, "utf8"))
  : {}
const combinedFr = { ...commonFr, ...frJson }
const keys = Object.keys(frJson)

const IGNORE_DIRS = new Set([
  "node_modules",
  "i18n",
  ".git",
  "build",
  "dist",
  "scripts",
])
const ALLOWED_EXTS = new Set([".js", ".jsx", ".ts", ".tsx", ".html"])

function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath)

  files.forEach((file) => {
    const fullPath = path.join(dirPath, file)
    if (fs.statSync(fullPath).isDirectory()) {
      if (!IGNORE_DIRS.has(file)) {
        arrayOfFiles = getAllFiles(fullPath, arrayOfFiles)
      }
    } else {
      const ext = path.extname(file)
      if (
        ALLOWED_EXTS.has(ext) &&
        !file.endsWith(".test.js") &&
        !file.endsWith(".spec.js") &&
        !file.endsWith(".test.jsx") &&
        !file.endsWith(".spec.jsx")
      ) {
        arrayOfFiles.push(fullPath)
      }
    }
  })

  return arrayOfFiles
}

console.log("Scanning workspace for source files...")
const sourceFiles = getAllFiles(workspaceRoot)

console.log(
  `Checking ${keys.length} translation keys across ${sourceFiles.length} files...`,
)

// Read all file contents into memory
const fileContents = sourceFiles.map((filePath) =>
  fs.readFileSync(filePath, "utf8"),
)

// Extract all translation keys used in the code
// Matches _("key"), _('key'), .t("key"), t('key') and i18nKey="key"
// The \b boundary prevents matching "it(" or "wait("
const translationRegex =
  /(?:\b(?:_|t)\()\s*(["'])(.*?)\1|i18nKey=(["'])(.*?)\3/g
const keysUsedInCode = new Set()

fileContents.forEach((content) => {
  // Strip single-line and multi-line comments that start after whitespace
  // This avoids removing // inside URLs like http://
  const cleanContent = content
    .replace(/^\s*\/\/.*$/gm, "")
    .replace(/^\s*\/\*[\s\S]*?\*\//gm, "")

  let match
  while ((match = translationRegex.exec(cleanContent)) !== null) {
    // Extract the exact key without trimming it
    const key = match[2] || match[4]
    if (key) keysUsedInCode.add(key)
  }
})

const unusedKeys = []
const missingKeys = []

//FIXME
const DYNAMIC_KEYS = new Set([
  "The {{field}} environment variable is required!",
  "The {{field}} environment variable is invalid!",
  'With the {{required}} environment variable set to "yes" you must at least set one of the following variables: {{place}}, {{price}} or {{styles}}!',
])

// 1. Find unused keys (in fr.json but not in code)
for (const key of keys) {
  if (!keysUsedInCode.has(key) && !DYNAMIC_KEYS.has(key)) {
    unusedKeys.push(key)
  }
}

// 2. Find missing keys (in code but not in combinedFr)
for (const key of keysUsedInCode) {
  if (!Object.hasOwn(combinedFr, key)) {
    missingKeys.push(key)
  }
}

let hasErrors = false

if (unusedKeys.length > 0) {
  console.log("\n⚠️  Orphaned keys (in fr.json but unused in code):")
  console.log(JSON.stringify(unusedKeys, null, 2))
  hasErrors = true
}

if (missingKeys.length > 0) {
  console.log("\n❌  Missing translations (in code but absent from fr.json):")
  console.log(JSON.stringify(missingKeys, null, 2))
  hasErrors = true
}

if (hasErrors) {
  process.exit(1)
} else {
  console.log("\n✅  Perfect! No orphaned keys and no missing translations.")
  process.exit(0)
}
