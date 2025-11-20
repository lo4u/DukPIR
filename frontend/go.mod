module our_pir

go 1.22

toolchain go1.22.12

require (
	github.com/ahenzinger/simplepir v0.0.0-20230113230609-e9020b03bf28
	github.com/seiflotfy/cuckoofilter v0.0.0
)

require (
	github.com/dgryski/go-metro v0.0.0-20200812162917-85c65e2d0165 // indirect
	github.com/ryanleh/secure-inference v0.0.0-00010101000000-000000000000 // indirect
)

replace github.com/ahenzinger/simplepir => ../simplepir

replace github.com/seiflotfy/cuckoofilter => ../cuckoofilter

replace github.com/ryanleh/secure-inference => ../crowdsurf
