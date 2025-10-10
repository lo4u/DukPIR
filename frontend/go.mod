module our_pir

go 1.19

require github.com/seiflotfy/cuckoofilter v0.0.0

require (
	github.com/ahenzinger/simplepir v0.0.0-20230113230609-e9020b03bf28 // indirect
	github.com/dgryski/go-metro v0.0.0-20200812162917-85c65e2d0165 // indirect
)

replace github.com/ahenzinger/simplepir/pir => ../simplepir/pir

replace github.com/seiflotfy/cuckoofilter => ../cuckoofilter
