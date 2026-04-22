@echo off
rem ------------------------------------------------------------------------------
rem Gradle wrapper for Windows
rem ------------------------------------------------------------------------------
setlocal
set DIR=%~dp0
set JAVA_CMD=java
if defined JAVA_HOME set JAVA_CMD=%JAVA_HOME%\bin\java.exe
"%JAVA_CMD%" -classpath "%DIR%gradle\wrapper\gradle-wrapper.jar" org.gradle.wrapper.GradleWrapperMain %*
