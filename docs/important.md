# Important System & Development Paths

## System Information
- **OS Name**: Microsoft Windows 11 Home
- **OS Version**: 10.0.26200
- **System Manufacturer**: Dell Inc.
- **System Model**: Inspiron 15 3520
- **System Type**: x64-based PC
- **Processor**: Intel64 Family 6 Model 154 Stepping 4 (12 logical processors)

## Key Project & Workspace Directories
- **Workspace Root**: `C:\Users\Admin\Desktop\screen-ai`
- **Temp/Cache Directory**: `C:\Users\Admin\.gemini\tmp\screen-ai`

## Essential Development Paths (from `path.md`)
The following paths are critical for building Native Windows C++ projects without relying on the Visual Studio IDE:

- **MSVC Compiler (cl.exe)**: `C:\Program Files (x86)\Microsoft Visual Studio\18\BuildTools\VC\Tools\MSVC\14.50.35717\bin\Hostx64\x64`
- **MSVC Include Directory**: `C:\Program Files (x86)\Microsoft Visual Studio\18\BuildTools\VC\Tools\MSVC\14.50.35717\include`
- **MSVC Library Directory (lib)**: `C:\Program Files (x86)\Microsoft Visual Studio\18\BuildTools\VC\Tools\MSVC\14.50.35717\lib\x64`

### Windows 10 SDK
- **SDK Base Directory**: `C:\Program Files (x86)\Windows Kits\10`
- **SDK Target Version**: `10.0.26100.0`
- **SDK Binaries (rc.exe, mt.exe, cppwinrt.exe)**: `C:\Program Files (x86)\Windows Kits\10\bin\10.0.26100.0\x64`
- **SDK Include Directories**: `C:\Program Files (x86)\Windows Kits\10\Include\10.0.26100.0\` (shared, ucrt, um, winrt, cppwinrt)
- **SDK Lib Directories**: `C:\Program Files (x86)\Windows Kits\10\Lib\10.0.26100.0\` (ucrt\x64, um\x64)

### Build Utilities
- **CMake (cmake.exe)**: `C:\Program Files\CMake\bin`
- **Ninja (ninja.exe)**: `C:\Users\Admin\AppData\Local\Microsoft\WinGet\Links`

## Build Outputs (from `BUILD_NOTES.md`)
*Note: Always use the Visual Studio generator for CMake, Ninja is broken for this project due to manifest.rc failures.*
- **App (Debug)**: `build\Debug\ScreenRecorder.exe`
- **App (Release)**: `build\Release\ScreenRecorder.exe`
- **Unit Tests**: `build\tests\Debug\unit_tests.exe`

## Other Important Environment Paths
- **Python**: `C:\Python314\` and `C:\Python314\Scripts\`
- **Java Home**: `C:\Program Files\Eclipse Adoptium\jdk-17.0.15.6-hotspot`
- **Android Home**: `C:\Android`
- **Go Path**: `C:\Users\Admin\go`
- **NVM Home**: `C:\Users\Admin\AppData\Local\nvm`
- **VCPKG Root**: `C:\vcpkg`
- **LLVM / Clang**: `C:\Program Files\LLVM\bin`
- **PostgreSQL / GDAL / Proj**: 
  - `C:\Program Files\PostgreSQL\17\gdal-data`
  - `C:\Program Files\PostgreSQL\17\share\contrib\postgis-3.5\proj`

## Notes on Existing Documentation
- **`idea.md`**: Contains the roadmap, product definition, and AI models stack. We are currently acknowledging this file but do not need to implement the AI stack at this moment.
- **`path.md`**: Detailed C++ environment bindings.
- **`BUILD_NOTES.md`**: Troubleshooting notes for CMake and GTest compilation.