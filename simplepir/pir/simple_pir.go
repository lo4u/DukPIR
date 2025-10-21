package pir

// #cgo CFLAGS: -O3 -march=native
// #include "pir.h"
import "C"
import (
	"fmt"
	"math"

	"github.com/tuneinsight/lattigo/v6/ring"
)

// import "time"

type SimplePIR struct{}

func (pi *SimplePIR) Name() string {
	return "SimplePIR"
}

func (pi *SimplePIR) PickParams(N, d, n, logq uint64) Params {
	good_p := Params{}
	found := false

	// Iteratively refine p and DB dims, until find tight values
	for mod_p := uint64(2); ; mod_p += 1 {
		l, m := ApproxSquareDatabaseDims(N, d, mod_p)

		p := Params{
			N:    n,
			Logq: logq,
			L:    l,
			M:    m,
		}
		p.PickParams(false, m)

		if p.P < mod_p {
			if !found {
				panic("Error; should not happen")
			}
			// good_p.PrintParams()
			return good_p
		}

		good_p = p
		found = true
	}

	panic("Cannot be reached")
	return Params{}
}

func (pi *SimplePIR) PickParamsGivenDimensions(l, m, n, logq uint64) Params {
	p := Params{
		N:    n,
		Logq: logq,
		L:    l,
		M:    m,
	}
	p.PickParams(false, m)
	return p
}

// Works for SimplePIR because vertical concatenation doesn't increase
// the number of LWE samples (so don't need to change LWE params)
func (pi *SimplePIR) ConcatDBs(DBs []*Database, p *Params) *Database {
	if len(DBs) == 0 {
		panic("Should not happen")
	}

	if DBs[0].Info.Num != p.L*p.M {
		panic("Not yet implemented")
	}

	rows := DBs[0].Data.Rows
	for j := 1; j < len(DBs); j++ {
		if DBs[j].Data.Rows != rows {
			panic("Bad input")
		}
	}

	D := new(Database)
	D.Data = MatrixZeros(0, 0)
	D.Info = DBs[0].Info
	D.Info.Num *= uint64(len(DBs))
	p.L *= uint64(len(DBs))

	for j := 0; j < len(DBs); j++ {
		D.Data.Concat(DBs[j].Data.SelectRows(0, rows))
	}

	return D
}

func (pi *SimplePIR) GetBW(info DBinfo, p Params) {
	offline_download := float64(p.L*p.N*p.Logq) / (8.0 * 1024.0)
	fmt.Printf("\t\tOffline download: %d KB\n", uint64(offline_download))

	online_upload := float64(p.M*p.Logq) / (8.0 * 1024.0)
	fmt.Printf("\t\tOnline upload: %d KB\n", uint64(online_upload))

	online_download := float64(p.L*p.Logq) / (8.0 * 1024.0)
	fmt.Printf("\t\tOnline download: %d KB\n", uint64(online_download))
}

func (pi *SimplePIR) Init(info DBinfo, p Params) State {
	A := MatrixZeros(p.M, p.N)
	A.Add(1)
	return MakeState(A)
}

func (pi *SimplePIR) InitCompressed(info DBinfo, p Params) (State, CompressedState) {
	seed := RandomPRGKey()
	return pi.InitCompressedSeeded(info, p, seed)
}

func (pi *SimplePIR) InitCompressedSeeded(info DBinfo, p Params, seed *PRGKey) (State, CompressedState) {
	bufPrgReader = NewBufPRG(NewPRG(seed))
	return pi.Init(info, p), MakeCompressedState(seed)
}

func (pi *SimplePIR) DecompressState(info DBinfo, p Params, comp CompressedState) State {
	bufPrgReader = NewBufPRG(NewPRG(comp.Seed))
	return pi.Init(info, p)
}

func (pi *SimplePIR) Setup(DB *Database, shared State, p Params) (State, Msg) {
	A := shared.Data[0]
	H := MatrixMul(DB.Data, A)

	// map the database entries to [0, p] (rather than [-p/1, p/2]) and then
	// pack the database more tightly in memory, because the online computation
	// is memory-bandwidth-bound
	DB.Data.Add(p.P / 2)
	DB.Squish()

	return MakeState(), MakeMsg(H)
}

func (pi *SimplePIR) FakeSetup_NTT(DB *Database, shared State, p Params) (State, Msg) {
	// A := shared.Data[0]
	// H := MatrixMul(DB.Data, A)

	A := shared.Data[0]
	D := DB.Data
	sqrt_N := D.Rows
	n := p.N
	k := uint64(math.Ceil(float64(sqrt_N) / float64(n)))

	r, err := ring.NewRing(int(n), []uint64{(uint64(1) << p.Logq) + 1})
	if err != nil {
		panic(err)
	}

	H := MatrixZeros(sqrt_N, n)
	H_poly := make([]ring.Poly, sqrt_N)
	for i := uint64(0); i < sqrt_N; i++ {
		H_poly[i] = r.NewPoly()
	}

	for i := uint64(0); i < k; i++ {
		// 注意这里的D_i是深层拷贝
		D_i := D.SelectColumns(i*n, n)
		A_i := A.SelectRows(i*n, 1)
		p2 := r.NewPoly()
		p2_ntt := r.NewPoly()
		for t := uint64(0); t < n; t++ {
			p2.Coeffs[0][t] = uint64(A_i.Data[t])
		}
		r.NTT(p2, p2_ntt)

		for j := uint64(0); j < sqrt_N; j++ {
			p1 := r.NewPoly()
			// copy(p1.Coeffs[0], D_i.Data[j])
			for t := uint64(0); t < n; t++ {
				p1.Coeffs[0][t] = uint64(D_i.Data[j*n+t])
			}
			r.NTT(p1, p1)
			r.MulCoeffsMontgomeryThenAdd(p1, p2_ntt, H_poly[j])
		}
	}

	for i := uint64(0); i < sqrt_N; i++ {
		r.INTT(H_poly[i], H_poly[i])
		for t := uint64(0); t < n; t++ {
			H.Data[i*n+t] = C.Elem(H_poly[i].Coeffs[0][t])
		}
	}
	// map the database entries to [0, p] (rather than [-p/1, p/2]) and then
	// pack the database more tightly in memory, because the online computation
	// is memory-bandwidth-bound
	DB.Data.Add(p.P / 2)
	DB.Squish()

	return MakeState(), MakeMsg(H)
}

func (pi *SimplePIR) FakeSetup(DB *Database, p Params) (State, float64) {
	offline_download := float64(p.L*p.N*uint64(p.Logq)) / (8.0 * 1024.0)
	fmt.Printf("\t\tOffline download: %d KB\n", uint64(offline_download))

	// map the database entries to [0, p] (rather than [-p/1, p/2]) and then
	// pack the database more tightly in memory, because the online computation
	// is memory-bandwidth-bound
	DB.Data.Add(p.P / 2)
	DB.Squish()

	return MakeState(), offline_download
}

func (pi *SimplePIR) Query(i uint64, shared State, p Params, info DBinfo) (State, Msg) {
	A := shared.Data[0]

	secret := MatrixRand(p.N, 1, p.Logq, 0)
	err := MatrixGaussian(p.M, 1)
	query := MatrixMul(A, secret)
	query.MatrixAdd(err)
	query.Data[i%p.M] += C.Elem(p.Delta())

	// Pad the query to match the dimensions of the compressed DB
	if p.M%info.Squishing != 0 {
		query.AppendZeros(info.Squishing - (p.M % info.Squishing))
	}

	return MakeState(secret), MakeMsg(query)
}

func (pi *SimplePIR) Answer(DB *Database, query MsgSlice, server State, shared State, p Params) Msg {
	ans := new(Matrix)
	num_queries := uint64(len(query.Data)) // number of queries in the batch of queries
	batch_sz := DB.Data.Rows / num_queries // how many rows of the database each query in the batch maps to

	last := uint64(0)

	// Run SimplePIR's answer routine for each query in the batch
	for batch, q := range query.Data {
		if batch == int(num_queries-1) {
			batch_sz = DB.Data.Rows - last
		}
		a := MatrixMulVecPacked(DB.Data.SelectRows(last, batch_sz),
			q.Data[0],
			DB.Info.Basis,
			DB.Info.Squishing)
		ans.Concat(a)
		last += batch_sz
	}

	return MakeMsg(ans)
}

func (pi *SimplePIR) Recover(i uint64, batch_index uint64, offline Msg, query Msg, answer Msg,
	shared State, client State, p Params, info DBinfo) uint64 {
	secret := client.Data[0]
	H := offline.Data[0]
	ans := answer.Data[0]

	ratio := p.P / 2
	offset := uint64(0)
	for j := uint64(0); j < p.M; j++ {
		offset += ratio * query.Data[0].Get(j, 0)
	}
	offset %= (1 << p.Logq)
	offset = (1 << p.Logq) - offset

	row := i / p.M
	interm := MatrixMul(H, secret)
	ans.MatrixSub(interm)

	var vals []uint64
	// Recover each Z_p element that makes up the desired database entry
	for j := row * info.Ne; j < (row+1)*info.Ne; j++ {
		noised := uint64(ans.Data[j]) + offset
		denoised := p.Round(noised)
		vals = append(vals, denoised)
		//fmt.Printf("Reconstructing row %d: %d\n", j, denoised)
	}
	ans.MatrixAdd(interm)

	return ReconstructElem(vals, i, info)
}

func (pi *SimplePIR) Reset(DB *Database, p Params) {
	// Uncompress the database, and map its entries to the range [-p/2, p/2].
	DB.Unsquish()
	DB.Data.Sub(p.P / 2)
}
