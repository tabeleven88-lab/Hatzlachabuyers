@echo off
cd /d "%~dp0"
echo Metal Buyer Tablet is starting at http://127.0.0.1:4173
echo Keep this window open while using the app.
python -m http.server 4173 --bind 127.0.0.1
