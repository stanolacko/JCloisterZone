@Echo off

set "EXTRA="
if /I "%~1"=="-v" set "EXTRA=-v"

npm install && npm run build && node dist\cli\jcz-engine.js -p 9001 %EXTRA%
