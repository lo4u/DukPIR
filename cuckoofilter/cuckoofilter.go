package cuckoo

import (
	"fmt"
	"math/bits"
	"math/rand"
)

const maxCuckooCount = 500

// Filter is a probabilistic counter
type Filter struct {
	buckets   []bucket
	count     uint
	bucketPow uint

	// parallel storage for values: length == len(buckets) * bucketSize
	// linear index = int(bucketIndex)*bucketSize + slotIndex
	values []string
}

// NewFilter returns a new cuckoofilter with a given capacity.
func NewFilter(capacity uint) *Filter {
	capacity = getNextPow2(uint64(capacity)) / bucketSize
	if capacity == 0 {
		capacity = 1
	}
	buckets := make([]bucket, capacity)
	// initialize values slice
	values := make([]string, int(capacity)*bucketSize)
	return &Filter{
		buckets:   buckets,
		count:     0,
		bucketPow: uint(bits.TrailingZeros(capacity)),
		values:    values,
	}
}

// Lookup returns true if data is in the counter
func (cf *Filter) Lookup(data []byte) bool {
	i1, fp := GetIndexAndFingerprint(data, cf.bucketPow)
	if cf.buckets[i1].getFingerprintIndex(fp) > -1 {
		return true
	}
	i2 := GetAltIndex(fp, i1, cf.bucketPow)
	return cf.buckets[i2].getFingerprintIndex(fp) > -1
}

// LookupValue returns (found, value). If not found, value == "".
func (cf *Filter) LookupValue(data []byte) (bool, string) {
	i1, fp := GetIndexAndFingerprint(data, cf.bucketPow)
	if idx := cf.buckets[i1].getFingerprintIndex(fp); idx > -1 {
		linear := int(i1)*bucketSize + idx
		return true, cf.values[linear]
	}
	i2 := GetAltIndex(fp, i1, cf.bucketPow)
	if idx := cf.buckets[i2].getFingerprintIndex(fp); idx > -1 {
		linear := int(i2)*bucketSize + idx
		return true, cf.values[linear]
	}
	return false, ""
}

// Reset ...
func (cf *Filter) Reset() {
	for i := range cf.buckets {
		cf.buckets[i].reset()
	}
	cf.count = 0
	// clear values
	for i := range cf.values {
		cf.values[i] = ""
	}
}

func randi(i1, i2 uint) uint {
	if rand.Intn(2) == 0 {
		return i1
	}
	return i2
}

// Insert inserts data into the counter and returns true upon success
// Backwards-compatible: inserts with empty value.
func (cf *Filter) Insert(data []byte) bool {
	return cf.InsertWithValue(data, "")
}

// InsertWithValue inserts data with an associated string value.
func (cf *Filter) InsertWithValue(data []byte, value string) bool {
	i1, fp := GetIndexAndFingerprint(data, cf.bucketPow)
	if cf.insertWithValue(fp, i1, value) {
		return true
	}
	i2 := GetAltIndex(fp, i1, cf.bucketPow)
	if cf.insertWithValue(fp, i2, value) {
		return true
	}
	return cf.reinsertWithValue(fp, randi(i1, i2), value)
}

// InsertUnique inserts data into the counter if not exists and returns true upon success
func (cf *Filter) InsertUnique(data []byte) bool {
	if cf.Lookup(data) {
		return false
	}
	return cf.Insert(data)
}

// InsertUniqueWithValue inserts data+value only if not present
func (cf *Filter) InsertUniqueWithValue(data []byte, value string) bool {
	if ok, _ := cf.LookupValue(data); ok {
		return false
	}
	return cf.InsertWithValue(data, value)
}

// insertWithValue attempts to insert fingerprint into bucket i and set its value.
// It requires bucket.insert to return (bool, slotIndex).
func (cf *Filter) insertWithValue(fp fingerprint, i uint, value string) bool {
	ok, slot := cf.buckets[i].insert(fp)
	if ok {
		cf.count++
		linear := int(i)*bucketSize + slot
		cf.values[linear] = value
		return true
	}
	return false
}

// keep old insert wrapper for compatibility (without value)
func (cf *Filter) insert(fp fingerprint, i uint) bool {
	// try to insert into bucket; if success, value slot will be set to empty string
	ok, slot := cf.buckets[i].insert(fp)
	if ok {
		cf.count++
		linear := int(i)*bucketSize + slot
		cf.values[linear] = ""
		return true
	}
	return false
}

func (cf *Filter) reinsert(fp fingerprint, i uint) bool {
	// original reinsert (no values), but we must keep value consistency:
	// fallback to reinsertWithValue with empty value
	return cf.reinsertWithValue(fp, i, "")
}

// reinsertWithValue performs cuckoo kicks while carrying the associated value
func (cf *Filter) reinsertWithValue(fp fingerprint, i uint, value string) bool {
	curfp := fp
	curval := value
	for k := 0; k < maxCuckooCount; k++ {
		j := rand.Intn(bucketSize)    // slot index (int)
		oldfp := curfp               // fingerprint to put into the slot
		// swap fingerprints
		swappedfp := cf.buckets[i][j]
		cf.buckets[i][j] = oldfp

		// swap values correspondingly
		linear := int(i)*bucketSize + j
		oldval := cf.values[linear]
		cf.values[linear] = curval
		// now prepare to reinsert the swapped fp/oldval
		curfp = swappedfp
		curval = oldval

		// move to alternate bucket of the element we just swapped out
		i = GetAltIndex(curfp, i, cf.bucketPow)
		// try to insert curfp into alternate bucket
		ok, slot := cf.buckets[i].insert(curfp)
		if ok {
			// insertion succeeded; set value for that slot
			linear2 := int(i)*bucketSize + slot
			cf.values[linear2] = curval
			cf.count++
			return true
		}
	}
	return false
}

// Delete data from counter if exists and return if deleted or not
func (cf *Filter) Delete(data []byte) bool {
	return cf.DeleteWithValue(data)
}

// DeleteWithValue deletes and clears the associated value
func (cf *Filter) DeleteWithValue(data []byte) bool {
	i1, fp := GetIndexAndFingerprint(data, cf.bucketPow)
	if cf.deleteWithValue(fp, i1) {
		return true
	}
	i2 := GetAltIndex(fp, i1, cf.bucketPow)
	return cf.deleteWithValue(fp, i2)
}

func (cf *Filter) delete(fp fingerprint, i uint) bool {
	// keep backward-compatible delete using existing bucket.delete which returns bool
	if cf.buckets[i].delete(fp) {
		if cf.count > 0 {
			cf.count--
		}
		// we don't know which slot was deleted here; attempt to clear by scanning
		if idx := cf.buckets[i].getFingerprintIndex(fp); idx > -1 {
			linear := int(i)*bucketSize + idx
			cf.values[linear] = ""
		} else {
			// fallback: clear any equal fp (unlikely because delete already removed it)
		}
		return true
	}
	return false
}

func (cf *Filter) deleteWithValue(fp fingerprint, i uint) bool {
	// safer: use getFingerprintIndex to find slot, then delete at that slot
	if idx := cf.buckets[i].getFingerprintIndex(fp); idx > -1 {
		// delete at slot idx
		cf.buckets[i].deleteAt(idx)
		if cf.count > 0 {
			cf.count--
		}
		linear := int(i)*bucketSize + idx
		cf.values[linear] = ""
		return true
	}
	return false
}

// Count returns the number of items in the counter
func (cf *Filter) Count() uint {
	return cf.count
}

// Encode returns a byte slice representing a Cuckoofilter (fingerprints only)
func (cf *Filter) Encode() []byte {
	bytes := make([]byte, len(cf.buckets)*bucketSize)
	for i, b := range cf.buckets {
		for j, f := range b {
			index := (i * len(b)) + j
			bytes[index] = byte(f)
		}
	}
	return bytes
}

// Decode returns a Cuckoofilter from a byte slice (values not decoded)
func Decode(bytes []byte) (*Filter, error) {
	var count uint
	if len(bytes)%bucketSize != 0 {
		return nil, fmt.Errorf("expected bytes to be multiple of %d, got %d", bucketSize, len(bytes))
	}
	if len(bytes) == 0 {
		return nil, fmt.Errorf("bytes can not be empty")
	}
	buckets := make([]bucket, len(bytes)/4)
	for i, b := range buckets {
		for j := range b {
			index := (i * len(b)) + j
			if bytes[index] != 0 {
				buckets[i][j] = fingerprint(bytes[index])
				count++
			}
		}
	}
	// initialize values slice (empty strings)
	values := make([]string, len(buckets)*bucketSize)
	return &Filter{
		buckets:   buckets,
		count:     count,
		bucketPow: uint(bits.TrailingZeros(uint(len(buckets)))),
		values:    values,
	}, nil
}

func (cf *Filter) DumpBuckets() []string {
    lines := make([]string, len(cf.buckets))
    for bi := range cf.buckets {
        line := "{"
        for si := 0; si < bucketSize; si++ {
            linear := bi*bucketSize + si
            fp := cf.buckets[bi][si]
            val := ""
            if linear < len(cf.values) {
                val = cf.values[linear]
            }
            line += fmt.Sprintf("[%d,\"%s\"]", fp, val)
            if si+1 < bucketSize {
                line += ","
            }
        }
        line += "}"
        lines[bi] = line
    }
    return lines
}

// cuckoofilter.go - 添加以下方法

// GetBuckets 返回 buckets 数组
func (cf *Filter) GetBuckets() []bucket {
    return cf.buckets
}

// GetValues 返回 values 数组
func (cf *Filter) GetValues() []string {
    return cf.values
}

// GetBucketPow 返回 bucketPow
func (cf *Filter) GetBucketPow() uint {
    return cf.bucketPow
}

// GetBucketSize 返回桶大小
func (cf *Filter) GetBucketSize() int {
    return bucketSize
}

func (cf *Filter) SetValue(key []byte, newValue string) bool {
	i1, fp := GetIndexAndFingerprint(key, cf.bucketPow)
	// 查找第一个候选桶
	if idx := cf.buckets[i1].getFingerprintIndex(fp); idx > -1 {
		linear := int(i1)*bucketSize + idx
		if linear < len(cf.values) {
			cf.values[linear] = newValue
			return true
		}
	}
	// 查找另一个候选桶
	i2 := GetAltIndex(fp, i1, cf.bucketPow)
	if idx := cf.buckets[i2].getFingerprintIndex(fp); idx > -1 {
		linear := int(i2)*bucketSize + idx
		if linear < len(cf.values) {
			cf.values[linear] = newValue
			return true
		}
	}
	return false
}