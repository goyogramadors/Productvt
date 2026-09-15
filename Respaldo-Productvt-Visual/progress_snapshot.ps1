$ts = [datetime]::UtcNow.ToString('o')
$dir = 'c:\Users\bcar3\Desktop\Productvt'

function Get-TreeItems {
    param([string]$Root, [int]$Depth=3)
    $items = @()
    Get-ChildItem -Path $Root -Recurse -Force -ErrorAction SilentlyContinue | ForEach-Object {
        $obj = @{
            type = if ($_.PSIsContainer) { 'dir' } else { 'file' }
            path = $_.FullName
            name = $_.Name
            size = if ($_.PSIsContainer) { $null } else { $_.Length }
            modified_utc = if ($_.PSIsContainer) { $null } else { $_.LastWriteTimeUtc.ToString('o') }
            created_utc = if ($_.PSIsContainer) { $null } else { $_.CreationTimeUtc.ToString('o') }
            attributes = if ($_.PSIsContainer) { $null } else { $_.Attributes.ToString() }
            is_hidden = $_.Attributes.HasFlag([System.IO.FileAttributes]::Hidden)
            is_system = $_.Attributes.HasFlag([System.IO.FileAttributes]::System)
        }
        $items += $obj
    }
    return $items
}

$items = Get-TreeItems -Root $dir

# Quick summary of common project markers
$markers = @{
    git_repo = Test-Path (Join-Path $dir '.git')
    package_json = Test-Path (Join-Path $dir 'package.json')
    requirements_txt = Test-Path (Join-Path $dir 'requirements.txt')
    readme = Test-Path (Join-Path $dir 'README.md')
    pyproject_toml = Test-Path (Join-Path $dir 'pyproject.toml')
    cargo_toml = Test-Path (Join-Path $dir 'Cargo.toml')
    cmake = Test-Path (Join-Path $dir 'CMakeLists.txt')
    docker_compose = Test-Path (Join-Path $dir 'docker-compose.yml')
}

$snapshot = @{
    saved_at_utc = $ts
    workspace = $dir
    items_count = $items.Count
    items = $items
    project_markers = $markers
    note = "Snapshot de progreso del workspace Productvt"
}

$json = $snapshot | ConvertTo-Json -Depth 5
$outDir = Join-Path $dir '.cline'
if (-not (Test-Path $outDir)) {
    New-Item -ItemType Directory -Path $outDir -Force | Out-Null
}
$outPath = Join-Path $outDir 'progress_snapshot.json'
$json | Set-Content -Path $outPath -Encoding UTF8

Write-Host "Saved snapshot to $outPath"
Write-Host "Items: $($items.Count) | Project markers: $($markers | ConvertTo-Json -Compress)" 

