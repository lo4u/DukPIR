module our_pir

go 1.21

toolchain go1.22.2

require (
	github.com/ahenzinger/simplepir v0.0.0-20230113230609-e9020b03bf28
	github.com/seiflotfy/cuckoofilter v0.0.0
)

require (
	github.com/dgryski/go-metro v0.0.0-20200812162917-85c65e2d0165 // indirect
	github.com/stretchr/testify v1.8.0 // indirect
)

replace github.com/ahenzinger/simplepir => ../simplepir

replace github.com/seiflotfy/cuckoofilter => ../cuckoofilter
