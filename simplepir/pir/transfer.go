package pir

// #cgo CFLAGS: -O3 -march=native
// #include "pir.h"
import "C"

import (
	"unsafe"

	rlwe "github.com/ryanleh/secure-inference/crypto/rlwe"
	m "github.com/ryanleh/secure-inference/matrix"
)

type matrix32 = m.Matrix[m.Elem32]
type Context = rlwe.Context[m.Elem32]

func UnsafeToMatrix32(raw *Matrix) *matrix32 {
	// 警告：这依赖于 C.Elem32 和 uint32 内存布局完全一致
	// 且 data 的生命周期必须长于返回的 Matrix
	data := *(*[]m.Elem32)(unsafe.Pointer(&raw.Data))
	return m.NewFromRaw(data, raw.Rows, raw.Cols)
}

func unsafeToMatrix(mat *matrix32) *Matrix {
	// 警告：这依赖于 C.Elem32 和 uint32 内存布局完全一致
	// 且 mat 的生命周期必须长于返回的 Matrix
	rawdata := mat.Data()
	data := *(*[]C.Elem)(unsafe.Pointer(&rawdata))
	return &Matrix{
		Data: data,
		Rows: mat.Rows(),
		Cols: mat.Cols(),
	}
}

func NewContext(pMod, n uint64, module_switch bool) *Context {
	ctx := rlwe.NewContext[m.Elem32](pMod, n, module_switch)

	return (*Context)(ctx)
}
