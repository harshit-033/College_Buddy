$ErrorActionPreference = "Stop"

$csvPath = Join-Path (Get-Location) "outputs\harshit_kumar_day5_review.csv"
$rows = @(Import-Csv $csvPath)
$headers = @{ "User-Agent" = "CollegeBuddy-Day5-Review" }

$explicitRepos = @{
  "aayushh0-0" = "Summer_Assignment_25113CN363"
  "alokj7552-eng" = "summer_assignment_2511cn030"
}

function Get-ProfileRepo($owner) {
  if ($explicitRepos.ContainsKey($owner)) { return $explicitRepos[$owner] }
  try {
    $html = (Invoke-WebRequest -Headers $headers -Uri "https://github.com/$owner?tab=repositories" -UseBasicParsing -TimeoutSec 20).Content
  } catch {
    return ""
  }
  $pattern = "href=`"/$([regex]::Escape($owner))/([^`"/?#]+)`""
  $repos = @([regex]::Matches($html, $pattern) | ForEach-Object {
    [System.Web.HttpUtility]::HtmlDecode($_.Groups[1].Value)
  } | Select-Object -Unique)
  $preferred = @($repos | Where-Object { $_ -match "(?i)summer|assignment|251|day|training|work" })
  if ($preferred.Count -gt 0) { return $preferred[0] }
  if ($repos.Count -gt 0) { return $repos[0] }
  return ""
}

function Measure-LocalSubmission($repoPath) {
  $dayPattern = "(?i)(^|[/\\ _-])day[/\\ _-]*0?5($|[/\\ _.\-])|(^|[/\\ _-])d[/\\ _-]*0?5($|[/\\ _.\-])"
  $codeExt = "\.(c|cpp|cc|h|hpp|py|java|js|ts|jsx|tsx|html|css|php|cs|rb|go|rs)$"
  $allFiles = @(Get-ChildItem -Path $repoPath -Recurse -File -Force | Where-Object {
    $_.FullName -notmatch "\\.git\\" -and (($_.FullName.Substring($repoPath.Length + 1)) -replace "\\", "/") -match $dayPattern
  })
  if ($allFiles.Count -eq 0) { return $null }

  $codeFiles = @($allFiles | Where-Object { $_.Name -match $codeExt })
  $sampleFiles = @($codeFiles | Sort-Object Length -Descending | Select-Object -First 6)
  $totalLines = 0
  $commentLines = 0
  $signals = 0
  $redFlags = @()
  $sampleNames = @()

  foreach ($file in $sampleFiles) {
    $rel = ($file.FullName.Substring($repoPath.Length + 1)) -replace "\\", "/"
    $sampleNames += $rel
    try {
      $text = Get-Content -LiteralPath $file.FullName -Raw -ErrorAction Stop
    } catch {
      continue
    }
    $lines = @($text -split "`n")
    $totalLines += $lines.Count
    $commentLines += @($lines | Where-Object { $_.Trim() -match "^(//|#|/\*|\*|<!--|-->|/\*\*|'''|`")" }).Count
    if ($text -match "(?m)^\s*(#include|import|from\s+\w+\s+import|public\s+class|int\s+main|void\s+main|def\s+\w+|function\s+\w+|const\s+\w+\s*=|let\s+\w+\s*=|<html|<!doctype|class\s+\w+)") {
      $signals++
    }
    if ($text -match "(?i)todo|placeholder|lorem|chatgpt|openai|copied from|copy from|source:") {
      $redFlags += "template/copied-source wording"
    }
    if ($text -match "<<<<<<<|>>>>>>>") {
      $redFlags += "merge conflict markers"
    }
  }

  $commentRatio = if ($totalLines -gt 0) { [math]::Round($commentLines / $totalLines, 2) } else { 0 }
  $codeBytes = ($codeFiles | Measure-Object -Property Length -Sum).Sum
  if (-not $codeBytes) { $codeBytes = 0 }
  $marks = 8
  $behaviour = "all ok"
  $reason = "Day 5 code files found and appear substantive"

  if ($codeFiles.Count -eq 0) {
    $marks = 3
    $reason = "Day 5 path exists but no code file was found"
  } elseif ($codeBytes -lt 500 -or $signals -eq 0) {
    $marks = 5
    $reason = "Day 5 code is present but looks minimal or incomplete"
  } elseif ($redFlags.Count -gt 0) {
    $marks = 6
    $reason = ($redFlags | Select-Object -Unique) -join "; "
  }

  if ($commentRatio -ge 0.35 -and $commentLines -ge 15) {
    $behaviour = "plagrism"
    if ($marks -gt 6) { $marks = 6 }
    $reason = "Too many comments in Day 5 code; " + $reason
  }

  return [pscustomobject]@{
    FileCount = $allFiles.Count
    CodeCount = $codeFiles.Count
    SampleFiles = ($sampleNames -join " | ")
    CommentRatio = $commentRatio
    Marks = $marks
    Behaviour = $behaviour
    Reason = $reason
  }
}

$workDir = Join-Path "C:\tmp" ("day5_review_" + (Get-Date -Format "yyyyMMdd_HHmmss"))
New-Item -ItemType Directory -Path $workDir -Force | Out-Null

foreach ($row in $rows) {
  $needsResolve = [string]::IsNullOrWhiteSpace($row.Repository) -or $row.Evidence -match "inaccessible"
  if (-not $needsResolve) { continue }

  $owner = $row.GitHubId
  $repoName = if ($row.Repository) { ($row.Repository -split "/", 2)[1] } else { Get-ProfileRepo $owner }
  if (-not $repoName) {
    $row.Evidence = "No public repository found on profile page"
    continue
  }

  $safeDir = ($owner + "_" + $repoName) -replace "[^A-Za-z0-9_.-]", "_"
  $dest = Join-Path $workDir $safeDir
  $cloneUrl = "https://github.com/$owner/$repoName.git"
  $previousErrorPreference = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  $cloneOutput = & git clone --depth 1 --quiet $cloneUrl $dest 2>&1
  $ErrorActionPreference = $previousErrorPreference
  if ($LASTEXITCODE -ne 0) {
    $row.Repository = "$owner/$repoName"
    $row.RepositoryUrl = "https://github.com/$owner/$repoName"
    $row.Evidence = "Repository could not be cloned: $cloneOutput"
    continue
  }

  $row.Repository = "$owner/$repoName"
  $row.RepositoryUrl = "https://github.com/$owner/$repoName"
  $measure = Measure-LocalSubmission $dest
  if (-not $measure) {
    $row.Day5Status = "Absent"
    $row.Marks = 0
    $row.Behaviour = "absentee"
    $row.Evidence = "No Day 5 folder/file found in repository"
    $row.Day5FilesReviewed = ""
    $row.CommentRatio = ""
  } else {
    $row.Day5Status = "Present"
    $row.Marks = $measure.Marks
    $row.Behaviour = $measure.Behaviour
    $row.Evidence = $measure.Reason
    $row.Day5FilesReviewed = $measure.SampleFiles
    $row.CommentRatio = $measure.CommentRatio
  }
}

$rows | Export-Csv -Path $csvPath -NoTypeInformation -Encoding UTF8
$rows | Format-Table GitHubId,Repository,Day5Status,Marks,Behaviour -AutoSize
Write-Host "CSV: $csvPath"
