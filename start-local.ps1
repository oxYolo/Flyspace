$ErrorActionPreference = "Stop"
Push-Location $PSScriptRoot
try {
    & npm.cmd run dev:local
} finally {
    Pop-Location
}
