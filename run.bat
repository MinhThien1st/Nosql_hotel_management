@echo off
chcp 65001 > nul
echo =========================================================================
echo    🏨 SUONG MAI HOTEL GROUP - HỆ THỐNG QUẢN LÝ KHÁCH SẠN (QLKS)
echo    🛠️ Backend: Spring Boot 3 + Apache Cassandra (DataStax Astra DB)
echo    🎨 Frontend: Single Page Application (Glassmorphism Dark Modern UI)
echo =========================================================================
echo.
echo [1/2] Kiểm tra môi trường Java...
java -version
if %ERRORLEVEL% NEQ 0 (
    echo [LỖI] Chưa tìm thấy Java 17+. Vui lòng cài đặt JDK 17+ và cấu hình PATH.
    pause
    exit /b 1
)

echo.
echo [2/2] Khởi chạy ứng dụng Spring Boot...
echo 🌐 Giao diện Web sẽ chạy tại: http://localhost:8080
echo =========================================================================
echo.

where mvn >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    call mvn spring-boot:run
) else (
    echo [THÔNG BÁO] Không tìm thấy lệnh 'mvn' trong biến môi trường PATH.
    echo Bạn có thể mở thư mục này trong IntelliJ IDEA, VS Code hoặc Eclipse và chạy QlksApplication.java!
    echo Hoặc thêm Maven vào PATH và chạy lại run.bat.
)

pause
