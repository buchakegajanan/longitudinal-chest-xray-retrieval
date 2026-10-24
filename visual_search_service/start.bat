@echo off
setlocal
echo Starting Visual Search Service on http://localhost:5100
echo First run will download ResNet-50 weights and build the FAISS index (~1-2 min)
echo.
cd /d "%~dp0"
set "PYTHON=%~dp0.venv\Scripts\python.exe"

if not exist "%PYTHON%" (
	echo Creating the visual-search Python environment...
	py -3.12 -m venv "%~dp0.venv"
	if errorlevel 1 (
		echo Failed to create the Python environment. Install Python 3.12 and retry.
		pause
		exit /b 1
	)
)

"%PYTHON%" -c "import torch, torchvision, faiss, flask, PIL" >nul 2>&1
if errorlevel 1 (
	echo Installing visual-search dependencies. This may take several minutes...
	"%PYTHON%" -m pip install -r requirements.txt
	if errorlevel 1 (
		echo Dependency installation failed. See the output above.
		pause
		exit /b 1
	)
)

"%PYTHON%" app.py
pause
