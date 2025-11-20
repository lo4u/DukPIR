# Distributed under the OSI-approved BSD 3-Clause License.  See accompanying
# file Copyright.txt or https://cmake.org/licensing for details.

cmake_minimum_required(VERSION 3.5)

file(MAKE_DIRECTORY
  "/home/lo4u/workspace/ddpir/crowdsurf/external/SEAL/build/thirdparty/hexl-src"
  "/home/lo4u/workspace/ddpir/crowdsurf/external/SEAL/build/thirdparty/hexl-build"
  "/home/lo4u/workspace/ddpir/crowdsurf/external/SEAL/build/thirdparty/hexl-subbuild/hexl"
  "/home/lo4u/workspace/ddpir/crowdsurf/external/SEAL/build/thirdparty/hexl-subbuild/hexl/tmp"
  "/home/lo4u/workspace/ddpir/crowdsurf/external/SEAL/build/thirdparty/hexl-subbuild/hexl/src/hexl-populate-stamp"
  "/home/lo4u/workspace/ddpir/crowdsurf/external/SEAL/build/thirdparty/hexl-subbuild/hexl/src"
  "/home/lo4u/workspace/ddpir/crowdsurf/external/SEAL/build/thirdparty/hexl-subbuild/hexl/src/hexl-populate-stamp"
)

set(configSubDirs )
foreach(subDir IN LISTS configSubDirs)
    file(MAKE_DIRECTORY "/home/lo4u/workspace/ddpir/crowdsurf/external/SEAL/build/thirdparty/hexl-subbuild/hexl/src/hexl-populate-stamp/${subDir}")
endforeach()
if(cfgdir)
  file(MAKE_DIRECTORY "/home/lo4u/workspace/ddpir/crowdsurf/external/SEAL/build/thirdparty/hexl-subbuild/hexl/src/hexl-populate-stamp${cfgdir}") # cfgdir has leading slash
endif()
