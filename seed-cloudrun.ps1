$uri = 'https://internal-didactics-log-api-737409422048.europe-west1.run.app'
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
Invoke-RestMethod -Uri "$uri/api/admin/login" -Method Post -WebSession $session -ContentType 'application/json' -Body '{"password":"change-this-password"}' | Out-Null
$store = Get-Content 'site/data/store.json' -Raw | ConvertFrom-Json
$article = $store.articles[0]
$payload = @{ title=$article.title; slug=$article.slug; summary=$article.summary; contentHtml=$article.contentHtml; coverImage=$article.coverImage; mediaVideo=$article.mediaVideo; tags=$article.tags; links=$article.links; published=$true } | ConvertTo-Json -Depth 20
Invoke-RestMethod -Uri "$uri/api/admin/articles" -Method Post -WebSession $session -ContentType 'application/json' -Body $payload | ConvertTo-Json -Depth 5
