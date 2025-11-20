# Distributed under the OSI-approved BSD 3-Clause License.  See accompanying
# file Copyright.txt or https://cmake.org/licensing for details.

cmake_minimum_required(VERSION 3.5)

file(MAKE_DIRECTORY
  "/home/lo4u/workspace/ddpir/crowdsurf/external/SEAL/build/thirdparty/msgsl-src"
  "/home/lo4u/workspace/ddpir/crowdsurf/external/SEAL/build/thirdparty/msgsl-build"
  "/home/lo4u/workspace/ddpir/crowdsurf/external/SEAL/build/thirdparty/msgsl-subbuild/msgsl-populate-prefix"
  "/home/lo4u/workspace/ddpir/crowdsurf/external/SEAL/build/thirdparty/msgsl-subbuild/msgsl-populate-prefix/tmp"
  "/home/lo4u/workspace/ddpir/crowdsurf/external/SEAL/build/thirdparty/msgsl-subbuild/msgsl-populate-prefix/src/msgsl-populate-stamp"
  "/home/lo4u/workspace/ddpir/crowdsurf/external/SEAL/build/thirdparty/msgsl-subbuild/msgsl-populate-prefix/src"
  "/home/lo4u/workspace/ddpir/crowdsurf/external/SEAL/build/thirdparty/msgsl-subbuild/msgsl-populate-prefix/src/msgsl-populate-stamp"
)

set(configSubDirs )
foreach(subDir IN LISTS configSubDirs)
    file(MAKE_DIRECTORY "/home/lo4u/workspace/ddpir/crowdsurf/external/SEAL/build/thirdparty/msgsl-subbuild/msgsl-populate-prefix/src/msgsl-populate-stamp/${subDir}")
endforeach()
if(cfgdir)
  file(MAKE_DIRECTORY "/home/lo4u/workspace/ddpir/crowdsurf/external/SEAL/build/thirdparty/msgsl-subbuild/msgsl-populate-prefix/src/msgsl-populate-stamp${cfgdir}") # cfgdir has leading slash
endif()
