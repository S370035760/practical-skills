param(
    [Parameter(Mandatory = $true, Position = 0)]
    [string]$SkillPath
)

$ErrorActionPreference = 'Stop'
$content = Get-Content -LiteralPath $SkillPath -Raw -Encoding UTF8
$markers = @('Gate A','Gate B','Outcome','Style','Efficiency','A1','A2','A3','A4','A5','A6','A7','A8','A9','A10','A11','B1','B2','B3','B4','B5','B6','B7','B8','B9','B10','快速开始','完整流程','局限性','FAQ','案例沉淀','退役条件')
$missing = @($markers | Where-Object { -not $content.Contains($_) })
$ironLaws = ([regex]::Matches($content, '(?m)^\s*(?:[-*]\s*)?(?:铁律|\d+\.\s*铁律)')).Count
$prohibitions = ([regex]::Matches($content, '(?m)^\s*(?:[-*]\s*)?(?:禁止项|禁止|绝对禁止|谨慎使用)')).Count
$examples = ([regex]::Matches($content, '(?m)^###\s*(?:示例|Example)\s*[0-9一二三四五六七八九十]+')).Count
$errors = ([regex]::Matches($content, '(?m)^\|\s*E?\d+\s*\|')).Count
$prompts = ([regex]::Matches($content, '(?m)^\s*\d+\.\s*Prompt[:：]')).Count
$result = [ordered]@{
    skill = (Resolve-Path -LiteralPath $SkillPath).Path
    lineCount = ($content -split "`n").Count
    gateA = [ordered]@{ markersMissing = $missing; ironLaws = $ironLaws; prohibitions = $prohibitions; examples = $examples; errors = $errors }
    gateB = [ordered]@{ prompts = $prompts; functionalRuns = 'not measured by static audit' }
    status = if ($missing.Count -eq 0 -and $ironLaws -ge 8 -and $prohibitions -ge 10 -and $examples -ge 3 -and $errors -ge 10 -and $prompts -ge 10) { 'static-pass' } else { 'static-fail' }
}
$result | ConvertTo-Json -Depth 5

