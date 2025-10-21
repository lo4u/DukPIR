module our_pir

go 1.21

toolchain go1.22.2

require (
	github.com/ahenzinger/simplepir v0.0.0-20230113230609-e9020b03bf28
	github.com/seiflotfy/cuckoofilter v0.0.0
)

require (
	github.com/ALTree/bigfloat v0.0.0-20220102081255-38c8b72a9924 // indirect
	github.com/davecgh/go-spew v1.1.1 // indirect
	github.com/dgryski/go-metro v0.0.0-20200812162917-85c65e2d0165 // indirect
	github.com/google/go-cmp v0.5.8 // indirect
	github.com/pmezard/go-difflib v1.0.0 // indirect
	github.com/stretchr/testify v1.8.0 // indirect
	github.com/tuneinsight/lattigo/v6 v6.1.1 // indirect
	golang.org/x/crypto v0.18.0 // indirect
	golang.org/x/exp v0.0.0-20230321023759-10a507213a29 // indirect
	golang.org/x/sys v0.16.0 // indirect
	gopkg.in/yaml.v3 v3.0.1 // indirect
)

replace github.com/ahenzinger/simplepir => ../simplepir

replace github.com/seiflotfy/cuckoofilter => ../cuckoofilter
