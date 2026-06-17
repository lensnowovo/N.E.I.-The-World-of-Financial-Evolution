# N.E.I. 一键部署脚本
# 用法：在本地项目根目录执行 .\deploy.ps1
# 会自动：打包 → 上传 → SSH 到服务器执行更新

$ErrorActionPreference = "Stop"
$SERVER = "admin@120.77.179.233"
$KEY = "$env:USERPROFILE\.ssh\aliyun_nei_ed25519"
$REMOTE_DIR = "/var/www/nei"
$TMP_TAR = "$env:TEMP\nei-src.tar.gz"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  N.E.I. 部署脚本" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# 1. 检查 SSH key 存在
if (-not (Test-Path $KEY)) {
    Write-Host "❌ SSH key 不存在: $KEY" -ForegroundColor Red
    Write-Host "   先生成: ssh-keygen -t ed25519 -f `"$KEY`" -C nei-aliyun" -ForegroundColor Yellow
    exit 1
}

# 2. 打包
Write-Host "`n[1/3] 打包代码..." -ForegroundColor Yellow
tar czf $TMP_TAR `
    --exclude='node_modules' `
    --exclude='.git' `
    --exclude='.next' `
    --exclude='uploads' `
    --exclude='.env' `
    --exclude='prisma/dev.db' `
    --exclude='prisma/dev.db-journal' `
    --exclude='.env.local-backup' `
    --exclude='output' `
    --exclude='*.tar.gz' `
    .
$size = [math]::Round((Get-Item $TMP_TAR).Length / 1KB)
Write-Host "✅ 打包完成: ${size}KB" -ForegroundColor Green

# 3. 上传
Write-Host "`n[2/3] 上传到服务器..." -ForegroundColor Yellow
scp -i $KEY $TMP_TAR "${SERVER}:/tmp/"
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 上传失败" -ForegroundColor Red
    exit 1
}
Write-Host "✅ 上传完成" -ForegroundColor Green

# 4. 远程执行更新
Write-Host "`n[3/3] 服务器更新 + 重启..." -ForegroundColor Yellow
$remoteCmd = "cd $REMOTE_DIR && tar xzf /tmp/nei-src.tar.gz && npm install && npx prisma generate && npm run build && pm2 restart nei-skills && echo '✅ 部署成功！' && pm2 status nei-skills"
ssh -i $KEY $SERVER $remoteCmd

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n==========================================" -ForegroundColor Green
    Write-Host "  部署成功！" -ForegroundColor Green
    Write-Host "  访问: http://120.77.179.233" -ForegroundColor Green
    Write-Host "==========================================" -ForegroundColor Green
} else {
    Write-Host "`n❌ 部署可能有问题，检查上面的输出" -ForegroundColor Red
}

# 清理本地临时文件
Remove-Item $TMP_TAR -Force -ErrorAction SilentlyContinue
