@Echo off

set BACK=%~dp0
set CLIENT=..\JCloisterZone-Client

copy build\Engine.jar %CLIENT%
