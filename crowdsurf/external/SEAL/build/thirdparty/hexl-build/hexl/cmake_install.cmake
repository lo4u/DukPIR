# Install script for directory: /home/lo4u/workspace/ddpir/crowdsurf/external/SEAL/build/thirdparty/hexl-src/hexl

# Set the install prefix
if(NOT DEFINED CMAKE_INSTALL_PREFIX)
  set(CMAKE_INSTALL_PREFIX "/home/lo4u/workspace/ddpir/crowdsurf/external/SEAL/build")
endif()
string(REGEX REPLACE "/$" "" CMAKE_INSTALL_PREFIX "${CMAKE_INSTALL_PREFIX}")

# Set the install configuration name.
if(NOT DEFINED CMAKE_INSTALL_CONFIG_NAME)
  if(BUILD_TYPE)
    string(REGEX REPLACE "^[^A-Za-z0-9_]+" ""
           CMAKE_INSTALL_CONFIG_NAME "${BUILD_TYPE}")
  else()
    set(CMAKE_INSTALL_CONFIG_NAME "Release")
  endif()
  message(STATUS "Install configuration: \"${CMAKE_INSTALL_CONFIG_NAME}\"")
endif()

# Set the component getting installed.
if(NOT CMAKE_INSTALL_COMPONENT)
  if(COMPONENT)
    message(STATUS "Install component: \"${COMPONENT}\"")
    set(CMAKE_INSTALL_COMPONENT "${COMPONENT}")
  else()
    set(CMAKE_INSTALL_COMPONENT)
  endif()
endif()

# Install shared libraries without execute permission?
if(NOT DEFINED CMAKE_INSTALL_SO_NO_EXE)
  set(CMAKE_INSTALL_SO_NO_EXE "1")
endif()

# Is this installation the result of a crosscompile?
if(NOT DEFINED CMAKE_CROSSCOMPILING)
  set(CMAKE_CROSSCOMPILING "FALSE")
endif()

# Set default install directory permissions.
if(NOT DEFINED CMAKE_OBJDUMP)
  set(CMAKE_OBJDUMP "/usr/bin/objdump")
endif()

if(CMAKE_INSTALL_COMPONENT STREQUAL "Unspecified" OR NOT CMAKE_INSTALL_COMPONENT)
  list(APPEND CMAKE_ABSOLUTE_DESTINATION_FILES
   "/home/lo4u/workspace/ddpir/crowdsurf/external/SEAL/build/include//")
  if(CMAKE_WARN_ON_ABSOLUTE_INSTALL_DESTINATION)
    message(WARNING "ABSOLUTE path INSTALL DESTINATION : ${CMAKE_ABSOLUTE_DESTINATION_FILES}")
  endif()
  if(CMAKE_ERROR_ON_ABSOLUTE_INSTALL_DESTINATION)
    message(FATAL_ERROR "ABSOLUTE path INSTALL DESTINATION forbidden (by caller): ${CMAKE_ABSOLUTE_DESTINATION_FILES}")
  endif()
  file(INSTALL DESTINATION "/home/lo4u/workspace/ddpir/crowdsurf/external/SEAL/build/include/" TYPE DIRECTORY MESSAGE_LAZY FILES "/home/lo4u/workspace/ddpir/crowdsurf/external/SEAL/build/thirdparty/hexl-src/hexl/include/" FILES_MATCHING REGEX "/[^/]*\\.hpp$" REGEX "/[^/]*\\.h$")
endif()

if(CMAKE_INSTALL_COMPONENT STREQUAL "Unspecified" OR NOT CMAKE_INSTALL_COMPONENT)
  file(INSTALL DESTINATION "${CMAKE_INSTALL_PREFIX}/lib" TYPE STATIC_LIBRARY MESSAGE_LAZY FILES "/home/lo4u/workspace/ddpir/crowdsurf/external/SEAL/build/thirdparty/hexl-build/hexl/lib/libhexl.a")
endif()

if(CMAKE_INSTALL_COMPONENT STREQUAL "Unspecified" OR NOT CMAKE_INSTALL_COMPONENT)
  include("/home/lo4u/workspace/ddpir/crowdsurf/external/SEAL/build/thirdparty/hexl-build/hexl/CMakeFiles/hexl.dir/install-cxx-module-bmi-Release.cmake" OPTIONAL)
endif()

if(CMAKE_INSTALL_COMPONENT STREQUAL "Unspecified" OR NOT CMAKE_INSTALL_COMPONENT)
  if(EXISTS "$ENV{DESTDIR}${CMAKE_INSTALL_PREFIX}/lib/cmake/hexl-1.2.5/HEXLTargets.cmake")
    file(DIFFERENT _cmake_export_file_changed FILES
         "$ENV{DESTDIR}${CMAKE_INSTALL_PREFIX}/lib/cmake/hexl-1.2.5/HEXLTargets.cmake"
         "/home/lo4u/workspace/ddpir/crowdsurf/external/SEAL/build/thirdparty/hexl-build/hexl/CMakeFiles/Export/c883a4d8f21e7a77f4cd3ab228739ff0/HEXLTargets.cmake")
    if(_cmake_export_file_changed)
      file(GLOB _cmake_old_config_files "$ENV{DESTDIR}${CMAKE_INSTALL_PREFIX}/lib/cmake/hexl-1.2.5/HEXLTargets-*.cmake")
      if(_cmake_old_config_files)
        string(REPLACE ";" ", " _cmake_old_config_files_text "${_cmake_old_config_files}")
        message(STATUS "Old export file \"$ENV{DESTDIR}${CMAKE_INSTALL_PREFIX}/lib/cmake/hexl-1.2.5/HEXLTargets.cmake\" will be replaced.  Removing files [${_cmake_old_config_files_text}].")
        unset(_cmake_old_config_files_text)
        file(REMOVE ${_cmake_old_config_files})
      endif()
      unset(_cmake_old_config_files)
    endif()
    unset(_cmake_export_file_changed)
  endif()
  file(INSTALL DESTINATION "${CMAKE_INSTALL_PREFIX}/lib/cmake/hexl-1.2.5" TYPE FILE MESSAGE_LAZY FILES "/home/lo4u/workspace/ddpir/crowdsurf/external/SEAL/build/thirdparty/hexl-build/hexl/CMakeFiles/Export/c883a4d8f21e7a77f4cd3ab228739ff0/HEXLTargets.cmake")
  if(CMAKE_INSTALL_CONFIG_NAME MATCHES "^([Rr][Ee][Ll][Ee][Aa][Ss][Ee])$")
    file(INSTALL DESTINATION "${CMAKE_INSTALL_PREFIX}/lib/cmake/hexl-1.2.5" TYPE FILE MESSAGE_LAZY FILES "/home/lo4u/workspace/ddpir/crowdsurf/external/SEAL/build/thirdparty/hexl-build/hexl/CMakeFiles/Export/c883a4d8f21e7a77f4cd3ab228739ff0/HEXLTargets-release.cmake")
  endif()
endif()

if(CMAKE_INSTALL_COMPONENT STREQUAL "Unspecified" OR NOT CMAKE_INSTALL_COMPONENT)
  file(INSTALL DESTINATION "${CMAKE_INSTALL_PREFIX}/lib" TYPE STATIC_LIBRARY MESSAGE_LAZY FILES "/home/lo4u/workspace/ddpir/crowdsurf/external/SEAL/build/thirdparty/hexl-build/hexl/lib/libhexl.a")
endif()

if(CMAKE_INSTALL_COMPONENT STREQUAL "Unspecified" OR NOT CMAKE_INSTALL_COMPONENT)
  file(INSTALL DESTINATION "${CMAKE_INSTALL_PREFIX}/lib/cmake/hexl-1.2.5" TYPE FILE MESSAGE_LAZY FILES
    "/home/lo4u/workspace/ddpir/crowdsurf/external/SEAL/build/thirdparty/hexl-src/cmake/hexl-1.2.5/HEXLConfig.cmake"
    "/home/lo4u/workspace/ddpir/crowdsurf/external/SEAL/build/thirdparty/hexl-build/hexl/cmake/hexl-1.2.5/HEXLConfigVersion.cmake"
    )
endif()

if(CMAKE_INSTALL_COMPONENT STREQUAL "Unspecified" OR NOT CMAKE_INSTALL_COMPONENT)
  file(INSTALL DESTINATION "${CMAKE_INSTALL_PREFIX}/lib/pkgconfig" TYPE FILE MESSAGE_LAZY FILES "/home/lo4u/workspace/ddpir/crowdsurf/external/SEAL/build/thirdparty/hexl-src/pkgconfig/hexl.pc")
endif()

