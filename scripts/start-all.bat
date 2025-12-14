@echo off
setlocal enabledelayedexpansion

:: OpenMeet Development Environment Startup Script (Windows)
:: Handles port conflicts, service dependencies, and health checks

title OpenMeet Dev Environment Startup

:: Colors (Windows 10+)
set "GREEN=[92m"
set "RED=[91m"
set "YELLOW=[93m"
set "BLUE=[94m"
set "NC=[0m"

:: Configuration
set "PROJECT_ROOT=%~dp0.."
set "PORTS=3000 4000 5432 6380 27017 9200 5674 15674 9000 9001"

echo.
echo %BLUE%===============================================================%NC%
echo %BLUE%  OpenMeet Development Environment Startup%NC%
echo %BLUE%===============================================================%NC%
echo.

:: Check Docker
echo %BLUE%[INFO]%NC% Checking Docker...
docker info >nul 2>&1
if errorlevel 1 (
    echo %RED%[ERROR]%NC% Docker is not running! Please start Docker Desktop first.
    pause
    exit /b 1
)
echo %GREEN%[OK]%NC% Docker is running

:: Check and free ports
echo.
echo %BLUE%===============================================================%NC%
echo %BLUE%  Checking and Freeing Ports%NC%
echo %BLUE%===============================================================%NC%
echo.

for %%p in (%PORTS%) do (
    call :check_and_kill_port %%p
)

:: Stop existing containers
echo.
echo %BLUE%===============================================================%NC%
echo %BLUE%  Stopping Existing Containers%NC%
echo %BLUE%===============================================================%NC%
echo.

cd /d "%PROJECT_ROOT%"
docker-compose down --remove-orphans 2>nul
echo %GREEN%[OK]%NC% Stopped existing containers

:: Start infrastructure
echo.
echo %BLUE%===============================================================%NC%
echo %BLUE%  Starting Infrastructure Services%NC%
echo %BLUE%===============================================================%NC%
echo.

echo %BLUE%[INFO]%NC% Starting postgres...
docker-compose up -d postgres
timeout /t 3 /nobreak >nul

echo %BLUE%[INFO]%NC% Starting redis...
docker-compose up -d redis
timeout /t 2 /nobreak >nul

echo %BLUE%[INFO]%NC% Starting mongodb...
docker-compose up -d mongodb
timeout /t 3 /nobreak >nul

echo %BLUE%[INFO]%NC% Starting elasticsearch...
docker-compose up -d elasticsearch
timeout /t 5 /nobreak >nul

echo %BLUE%[INFO]%NC% Starting rabbitmq...
docker-compose up -d rabbitmq
timeout /t 3 /nobreak >nul

echo %BLUE%[INFO]%NC% Starting minio...
docker-compose up -d minio
timeout /t 2 /nobreak >nul

echo %GREEN%[OK]%NC% Infrastructure services started

:: Wait for infrastructure
echo.
echo %BLUE%[INFO]%NC% Waiting for infrastructure to be healthy...
timeout /t 15 /nobreak >nul

:: Start API
echo.
echo %BLUE%===============================================================%NC%
echo %BLUE%  Starting API Service%NC%
echo %BLUE%===============================================================%NC%
echo.

echo %BLUE%[INFO]%NC% Building and starting API...
docker-compose up -d --build api

echo %BLUE%[INFO]%NC% Waiting for API to be ready...
timeout /t 30 /nobreak >nul

:: Verify services
echo.
echo %BLUE%===============================================================%NC%
echo %BLUE%  Verifying Services%NC%
echo %BLUE%===============================================================%NC%
echo.

docker-compose ps

:: Check API health
curl -s http://localhost:4000/health >nul 2>&1
if errorlevel 1 (
    echo %YELLOW%[WARN]%NC% API may still be starting...
) else (
    echo %GREEN%[OK]%NC% API is responding
)

:: Print summary
echo.
echo %BLUE%===============================================================%NC%
echo %BLUE%  Service URLs%NC%
echo %BLUE%===============================================================%NC%
echo.
echo   %GREEN%Web App:%NC%              http://localhost:3000
echo   %GREEN%API:%NC%                  http://localhost:4000
echo   %GREEN%API Health:%NC%           http://localhost:4000/health
echo   %GREEN%GraphQL:%NC%              http://localhost:4000/graphql
echo.
echo   %BLUE%PostgreSQL:%NC%           localhost:5432
echo   %BLUE%Redis:%NC%                localhost:6380
echo   %BLUE%MongoDB:%NC%              localhost:27017
echo   %BLUE%Elasticsearch:%NC%        http://localhost:9200
echo   %BLUE%RabbitMQ:%NC%             http://localhost:15674
echo   %BLUE%MinIO Console:%NC%        http://localhost:9001
echo.
echo   %YELLOW%Default Credentials:%NC%
echo     PostgreSQL: openmeet / openmeet123
echo     Redis: redis123
echo     MongoDB: openmeet / mongo123
echo     RabbitMQ: openmeet / rabbit123
echo     MinIO: openmeet / minio123
echo.
echo   %YELLOW%To start the web dev server:%NC%
echo     cd apps\web ^&^& pnpm dev
echo.
echo %GREEN%===============================================================%NC%
echo %GREEN%  Startup Complete!%NC%
echo %GREEN%===============================================================%NC%
echo.

pause
exit /b 0

:: Function to check and kill process on port
:check_and_kill_port
set port=%1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%port% " ^| findstr "LISTENING" 2^>nul') do (
    set pid=%%a
    if not "!pid!"=="" if not "!pid!"=="0" (
        echo %YELLOW%[WARN]%NC% Port %port% is in use by PID !pid!
        taskkill /F /PID !pid! >nul 2>&1
        if not errorlevel 1 (
            echo %GREEN%[OK]%NC% Killed process !pid! on port %port%
        )
    )
)
exit /b 0
