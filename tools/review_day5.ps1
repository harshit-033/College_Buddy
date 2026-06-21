$ErrorActionPreference = "Stop"

$entries = @(
  "https://github.com/25116CN017",
  "https://github.com/ianiket005",
  "https://github.com/adyasingh2900",
  "https://github.com/25112EW009-Ansh",
  "https://github.com/alokpratap9451-cmd/Summer_Assignment_25114CN072.git",
  "https://github.com/Adarsh2224-git",
  "https://github.com/Suryansh-Jaiswal",
  "https://github.com/JaishAgrawal",
  "https://github.com/nitin-kumar24",
  "https://github.com/MALIK25252007",
  "https://github.com/25116cn027-rudransh-rai",
  "https://github.com/nocapninja",
  "https://github.com/dmr404",
  "https://github.com/princekumar7701",
  "https://github.com/RudraPrakashYdv",
  "https://github.com/NishantGangwar2007",
  "https://github.com/karankumar11910121-sk",
  "https://github.com/nishantkumar-GLB",
  "https://github.com/CRAckbig4inonego",
  "https://github.com/abhi-nav-svg",
  "https://github.com/aayushh0-0/Summer_Assignment_25113CN363/tree/main",
  "https://github.com/alokj7552-eng/summer_assignment_2511cn030",
  "https://github.com/Chillguy2007",
  "https://github.com/aryanv3306-commits",
  "https://github.com/shivanshyadav0909",
  "https://github.com/sarveshbarnwal",
  "https://github.com/prince800502",
  "https://github.com/GLB-25113CN047",
  "https://github.com/officialvibhavpatel-321",
  "https://github.com/abhaydv28"
)

$headers = @{
  "User-Agent" = "CollegeBuddy-Day5-Review"
  "Accept" = "application/vnd.github+json"
}

function Get-ApiJson($uri) {
  try {
    return Invoke-RestMethod -Headers $headers -Uri $uri
  } catch {
    return $null
  }
}

function Get-RawText($owner, $repo, $branch, $path) {
  $encodedPath = (($path -split "/") | ForEach-Object { [uri]::EscapeDataString($_) }) -join "/"
  $uri = "https://raw.githubusercontent.com/$owner/$repo/$branch/$encodedPath"
  try {
    return (Invoke-WebRequest -Headers @{ "User-Agent" = "CollegeBuddy-Day5-Review" } -Uri $uri -UseBasicParsing -TimeoutSec 15).Content
  } catch {
    return ""
  }
}

function Get-RepoTarget($entry) {
  $clean = $entry.Trim() -replace "\.git$", ""
  $uri = [uri]$clean
  $parts = $uri.AbsolutePath.Trim("/") -split "/"
  $owner = $parts[0]
  if ($parts.Length -ge 2 -and $parts[1] -ne "tree") {
    return [pscustomobject]@{ Owner = $owner; Repo = $parts[1]; SourceType = "direct_repo" }
  }
  return [pscustomobject]@{ Owner = $owner; Repo = ""; SourceType = "profile" }
}

function Select-CandidateRepo($owner, $explicitRepo) {
  if ($explicitRepo) {
    return Get-ApiJson "https://api.github.com/repos/$owner/$explicitRepo"
  }

  $repos = Get-ApiJson "https://api.github.com/users/$owner/repos?per_page=100&sort=updated"
  if (-not $repos) { return $null }

  $preferred = @($repos | Where-Object {
    $_.name -match "(?i)summer|assignment|251|day|training|work"
  } | Sort-Object pushed_at -Descending)

  if ($preferred.Count -gt 0) { return $preferred[0] }
  return @($repos | Sort-Object pushed_at -Descending)[0]
}

function Get-Day5Files($tree) {
  $dayPattern = "(?i)(^|[/\\ _-])day[/\\ _-]*0?5($|[/\\ _.\-])|(^|[/\\ _-])d[/\\ _-]*0?5($|[/\\ _.\-])"
  return @($tree.tree | Where-Object {
    $_.type -eq "blob" -and $_.path -match $dayPattern
  })
}

function Measure-Submission($owner, $repo, $branch, $files) {
  $codeExt = "\.(c|cpp|cc|h|hpp|py|java|js|ts|jsx|tsx|html|css|php|cs|rb|go|rs)$"
  $codeFiles = @($files | Where-Object { $_.path -match $codeExt })
  $sampleFiles = @($codeFiles | Sort-Object size -Descending | Select-Object -First 6)

  $totalLines = 0
  $commentLines = 0
  $substantiveSignals = 0
  $redFlags = @()
  $sampleNames = @()

  foreach ($file in $sampleFiles) {
    $sampleNames += $file.path
    $text = Get-RawText $owner $repo $branch $file.path
    if (-not $text) { continue }
    $lines = @($text -split "`n")
    $totalLines += $lines.Count
    $commentLines += @($lines | Where-Object {
      $_.Trim() -match "^(//|#|/\*|\*|<!--|-->|/\*\*|'''|`")"
    }).Count
    if ($text -match "(?m)^\s*(#include|import|from\s+\w+\s+import|public\s+class|int\s+main|void\s+main|def\s+\w+|function\s+\w+|const\s+\w+\s*=|let\s+\w+\s*=|<html|<!doctype|class\s+\w+)") {
      $substantiveSignals++
    }
    if ($text -match "(?i)todo|placeholder|lorem|chatgpt|openai|copied from|copy from|source:") {
      $redFlags += "template/copied-source wording"
    }
    if ($text -match "<<<<<<<|>>>>>>>") {
      $redFlags += "merge conflict markers"
    }
  }

  $commentRatio = if ($totalLines -gt 0) { [math]::Round($commentLines / $totalLines, 2) } else { 0 }
  $totalCodeBytes = ($codeFiles | Measure-Object -Property size -Sum).Sum
  if (-not $totalCodeBytes) { $totalCodeBytes = 0 }

  $marks = 8
  $behaviour = "all ok"
  $reason = "Day 5 code files found and appear substantive"

  if ($codeFiles.Count -eq 0) {
    $marks = 3
    $reason = "Day 5 path exists but no code file was found"
  } elseif ($totalCodeBytes -lt 500 -or $substantiveSignals -eq 0) {
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
    CodeFileCount = $codeFiles.Count
    Day5FileCount = $files.Count
    SampleFiles = ($sampleNames -join " | ")
    CommentRatio = $commentRatio
    Marks = $marks
    Behaviour = $behaviour
    Reason = $reason
  }
}

$results = foreach ($entry in $entries) {
  $target = Get-RepoTarget $entry
  $user = Get-ApiJson "https://api.github.com/users/$($target.Owner)"
  $repo = Select-CandidateRepo $target.Owner $target.Repo

  if (-not $repo) {
    [pscustomobject]@{
      Mentor = "Harshit Kumar"; GitHubId = $target.Owner; Name = ""; ProfileUrl = "https://github.com/$($target.Owner)"
      Repository = ""; RepositoryUrl = ""; Day5Status = "Absent"; Marks = 0; Behaviour = "absentee"
      Evidence = "No public GitHub repository found or repository inaccessible"; Day5FilesReviewed = ""; CommentRatio = ""
    }
    continue
  }

  $tree = Get-ApiJson "https://api.github.com/repos/$($repo.owner.login)/$($repo.name)/git/trees/$($repo.default_branch)?recursive=1"
  if (-not $tree) {
    [pscustomobject]@{
      Mentor = "Harshit Kumar"; GitHubId = $target.Owner; Name = $user.name; ProfileUrl = $user.html_url
      Repository = $repo.full_name; RepositoryUrl = $repo.html_url; Day5Status = "Absent"; Marks = 0; Behaviour = "absentee"
      Evidence = "Repository tree inaccessible"; Day5FilesReviewed = ""; CommentRatio = ""
    }
    continue
  }

  $day5Files = Get-Day5Files $tree
  if ($day5Files.Count -eq 0) {
    [pscustomobject]@{
      Mentor = "Harshit Kumar"; GitHubId = $target.Owner; Name = $user.name; ProfileUrl = $user.html_url
      Repository = $repo.full_name; RepositoryUrl = $repo.html_url; Day5Status = "Absent"; Marks = 0; Behaviour = "absentee"
      Evidence = "No Day 5 folder/file found in selected repository"; Day5FilesReviewed = ""; CommentRatio = ""
    }
    continue
  }

  $measure = Measure-Submission $repo.owner.login $repo.name $repo.default_branch $day5Files
  [pscustomobject]@{
    Mentor = "Harshit Kumar"; GitHubId = $target.Owner; Name = $user.name; ProfileUrl = $user.html_url
    Repository = $repo.full_name; RepositoryUrl = $repo.html_url; Day5Status = "Present"; Marks = $measure.Marks; Behaviour = $measure.Behaviour
    Evidence = $measure.Reason; Day5FilesReviewed = $measure.SampleFiles; CommentRatio = $measure.CommentRatio
  }
}

$outDir = Join-Path (Get-Location) "outputs"
New-Item -ItemType Directory -Path $outDir -Force | Out-Null
$outPath = Join-Path $outDir "harshit_kumar_day5_review.csv"
$results | Export-Csv -Path $outPath -NoTypeInformation -Encoding UTF8
$results | Format-Table GitHubId,Repository,Day5Status,Marks,Behaviour -AutoSize
Write-Host "CSV: $outPath"
