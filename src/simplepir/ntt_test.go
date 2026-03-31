package simplepir

import (
	"testing"

	"github.com/tuneinsight/lattigo/v6/ring"
)

func Test_NTT(t *testing.T) {
	r, _ := ring.NewRing(8, []uint64{17})
	p1 := r.NewPoly()

	for i := uint64(0); i < 8; i++ {
		if p1.Coeffs[0][i] != 0 {
			t.Errorf("Expected 0, got %d", p1.Coeffs[0][i])
		} else {
			t.Logf("p1.Coeffs[0][%d] = %d", i, p1.Coeffs[0][i])
		}
	}
}
