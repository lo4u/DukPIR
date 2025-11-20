package pir

import (
	mrand "math/rand"
	"testing"

	m "github.com/ryanleh/secure-inference/matrix"
)

func Test_UnsafeToMatrix32(t *testing.T) {
	rm := MatrixRand(5, 5, 10, 0)
	rm32 := UnsafeToMatrix32(rm)
	rm32.Set(3, 3, 32)
	rm.Set(rm.Get(3, 3)*2, 1, 1)

	rm32.Print()
}

func Test_UnsafeToMatrix(t *testing.T) {
	rng := mrand.New(mrand.NewSource(0))
	rm32 := m.Rand[m.Elem32](rng, 5, 5, 0)
	rm := unsafeToMatrix(rm32)
	rm32.Set(2, 3, 32)
	rm.Set(15, 4, 1)
	rm.Print()
}
