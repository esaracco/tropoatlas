import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const workspaceRoot = path.resolve(__dirname, "..")

// Build a map of workspace package names to their relative directories
function findWorkspaceDirs(root) {
  const rootPkg = JSON.parse(
    fs.readFileSync(path.join(root, "package.json"), "utf8"),
  )
  const patterns = rootPkg.workspaces || []
  const map = new Map()

  for (const pat of patterns) {
    const parts = pat.split("/")
    if (parts.length === 2 && parts[1] === "*") {
      const base = parts[0]
      const fullBase = path.join(root, base)
      if (fs.existsSync(fullBase)) {
        for (const sub of fs.readdirSync(fullBase)) {
          const pkgPath = path.join(fullBase, sub, "package.json")
          if (fs.existsSync(pkgPath)) {
            const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"))
            map.set(pkg.name, path.join(base, sub))
          }
        }
      }
    } else if (parts.length === 3 && parts[1] === "*" && parts[2] === "*") {
      const base = parts[0]
      const fullBase = path.join(root, base)
      if (fs.existsSync(fullBase)) {
        for (const domain of fs.readdirSync(fullBase)) {
          const fullDomain = path.join(fullBase, domain)
          if (fs.statSync(fullDomain).isDirectory()) {
            for (const sub of fs.readdirSync(fullDomain)) {
              const pkgPath = path.join(fullDomain, sub, "package.json")
              if (fs.existsSync(pkgPath)) {
                const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"))
                map.set(pkg.name, path.join(base, domain, sub))
              }
            }
          }
        }
      }
    }
  }
  return map
}

const IGNORE_DIRS = new Set([
  "node_modules",
  "i18n",
  ".git",
  "build",
  "dist",
  "scripts",
  "docs",
  "public",
])

const ALLOWED_EXTS = new Set([".js", ".jsx", ".ts", ".tsx", ".html"])

// Recursively retrieve all source files in a directory
function getAllFiles(dirPath, arrayOfFiles = []) {
  if (!fs.existsSync(dirPath)) return arrayOfFiles
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

const translationRegex =
  /(?:\b(?:_|t)\()\s*(["'])(.*?)\1|i18nKey=(["'])(.*?)\3/g

// Dynamic keys constructed at runtime by validators or settings helpers
const DYNAMIC_KEYS = new Set([
  "The {{field}} environment variable is required!",
  "The {{field}} environment variable is invalid!",
  'With the {{required}} environment variable set to "yes" you must at least set one of the following variables: {{place}}, {{price}} or {{styles}}!',
])

const workspaceMap = findWorkspaceDirs(workspaceRoot)
const appsBaseDir = path.join(workspaceRoot, "apps")
const appDirs = fs.existsSync(appsBaseDir)
  ? fs
      .readdirSync(appsBaseDir)
      .filter((dir) =>
        fs.existsSync(path.join(appsBaseDir, dir, "src/i18n/fr.json")),
      )
  : []

let totalErrors = 0

for (const appDir of appDirs) {
  const appFullDir = path.join(appsBaseDir, appDir)
  const pkgPath = path.join(appFullDir, "package.json")
  const appPkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"))
  const frJsonPath = path.join(appFullDir, "src/i18n/fr.json")
  const frJson = JSON.parse(fs.readFileSync(frJsonPath, "utf8"))
  const keys = Object.keys(frJson)

  // Scan the app itself and all its declared workspace dependencies
  const scanDirs = [appFullDir]
  const allDeps = { ...appPkg.dependencies, ...appPkg.devDependencies }
  for (const dep of Object.keys(allDeps)) {
    if (workspaceMap.has(dep)) {
      scanDirs.push(path.join(workspaceRoot, workspaceMap.get(dep)))
    }
  }

  const sourceFiles = []
  scanDirs.forEach((dir) => getAllFiles(dir, sourceFiles))

  const keysUsedInCode = new Set()

  sourceFiles.forEach((filePath) => {
    const content = fs.readFileSync(filePath, "utf8")
    // Strip comments to prevent detecting commented-out translations
    const cleanContent = content
      .replace(/^\s*\/\/.*$/gm, "")
      .replace(/^\s*\/\*[\s\S]*?\*\//gm, "")

    let match
    while ((match = translationRegex.exec(cleanContent)) !== null) {
      const key = match[2] || match[4]
      if (key) keysUsedInCode.add(key)
    }
  })

  const unusedKeys = []
  const missingKeys = []

  // Check for orphaned keys in dictionary
  for (const key of keys) {
    if (!keysUsedInCode.has(key) && !DYNAMIC_KEYS.has(key)) {
      unusedKeys.push(key)
    }
  }

  // Check for missing keys in dictionary
  for (const key of keysUsedInCode) {
    if (!Object.hasOwn(frJson, key)) {
      missingKeys.push(key)
    }
  }

  console.log(`\n=== Checking ${appDir} (${keys.length} keys in fr.json, ${sourceFiles.length} files scanned) ===`)

  if (unusedKeys.length > 0) {
    console.log("⚠️  Orphaned keys (in fr.json but unused in code):")
    console.log(JSON.stringify(unusedKeys, null, 2))
    totalErrors++
  }

  if (missingKeys.length > 0) {
    console.log("❌  Missing translations (in code but absent from fr.json):")
    console.log(JSON.stringify(missingKeys, null, 2))
    totalErrors++
  }

  if (unusedKeys.length === 0 && missingKeys.length === 0) {
    console.log(`✅  ${appDir}: No orphaned keys and no missing translations.`)
  }
}

if (totalErrors > 0) {
  process.exit(1)
} else {
  console.log("\n🎉  All applications i18n checks passed successfully!\n")
  process.exit(0)
}
