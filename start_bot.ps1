# WISDOM TEMP Bot - 24/7 PowerShell Runner
# This script will automatically restart the bot if it crashes

$Host.UI.RawUI.WindowTitle = "WISDOM TEMP Bot - 24/7 Runner"

Write-Host "========================================" -ForegroundColor Green
Write-Host "   WISDOM TEMP Bot - 24/7 Runner" -ForegroundColor Green  
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Starting bot with auto-restart..." -ForegroundColor Yellow
Write-Host "Press Ctrl+C to stop the bot completely" -ForegroundColor Red
Write-Host ""

# Function to start the bot
function Start-Bot {
    while ($true) {
        $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        Write-Host "[$timestamp] Starting bot..." -ForegroundColor Cyan
        
        try {
            # Start the bot process
            $process = Start-Process -FilePath "node" -ArgumentList "index.js" -Wait -PassThru -NoNewWindow
            
            # Check exit code
            if ($process.ExitCode -eq 0) {
                Write-Host "[$timestamp] Bot exited normally." -ForegroundColor Green
            } else {
                Write-Host "[$timestamp] Bot crashed with exit code: $($process.ExitCode)" -ForegroundColor Red
            }
        }
        catch {
            Write-Host "[$timestamp] Error starting bot: $($_.Exception.Message)" -ForegroundColor Red
        }
        
        Write-Host ""
        Write-Host "[$timestamp] Bot stopped! Restarting in 5 seconds..." -ForegroundColor Yellow
        Write-Host "Press Ctrl+C to prevent restart" -ForegroundColor Red
        
        # Wait 5 seconds before restart
        Start-Sleep -Seconds 5
    }
}

# Handle Ctrl+C gracefully
try {
    Start-Bot
}
catch [System.Management.Automation.PipelineStoppedException] {
    Write-Host ""
    Write-Host "Bot runner stopped by user." -ForegroundColor Yellow
    exit 0
}