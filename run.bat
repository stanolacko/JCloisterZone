@Echo off

set BACK=%~dp0
set CLIENT=..\JCloisterZone-Client

copyclient.bat
cd %CLIENT%
yarn run dev & cd %BACK%
