import { readFile, writeFile } from "node:fs/promises"
import { homedir } from "node:os"
import { join } from "node:path"

const configPath = join(homedir(), ".config", "opencode", "opencode.jsonc")
const source = await readFile(configPath, "utf8")
const serverKey = '"chrome-devtools"'
const serverStart = source.indexOf(serverKey)

if (serverStart === -1) {
  throw new Error(`Could not find ${serverKey} in ${configPath}`)
}

const commandStart = source.indexOf('"command"', serverStart + serverKey.length)
const nextServer = source.indexOf('\n    "', serverStart + serverKey.length)

if (commandStart === -1 || (nextServer !== -1 && commandStart > nextServer)) {
  throw new Error(`Could not find the chrome-devtools command in ${configPath}`)
}

const arrayStart = source.indexOf("[", commandStart)
const arrayEnd = source.indexOf("]", arrayStart)

if (arrayStart === -1 || arrayEnd === -1) {
  throw new Error(`Could not read the chrome-devtools command in ${configPath}`)
}

const command = source.slice(arrayStart + 1, arrayEnd)
const headlessArgument = /,\s*"--headless(?:=true)?"|"--headless(?:=true)?"\s*,?/
const headless = headlessArgument.test(command)
const updatedCommand = headless
  ? command.replace(headlessArgument, "")
  : `${command.replace(/\s+$/, "")}, "--headless"${command.match(/\s*$/)[0]}`
const updated = source.slice(0, arrayStart + 1) + updatedCommand + source.slice(arrayEnd)

await writeFile(configPath, updated)
console.log(`Chrome DevTools MCP is now ${headless ? "headful" : "headless"}. Restart OpenCode to apply the change.`)
