package cuckoo

type fingerprint byte

type bucket [bucketSize]fingerprint

const (
	nullFp     = 0
	bucketSize = 4
)

// insert tries to insert fp into the first empty slot.
// Returns (true, slotIndex) on success, (false, -1) if no empty slot.
func (b *bucket) insert(fp fingerprint) (bool, int) {
	for i, tfp := range b {
		if tfp == nullFp {
			b[i] = fp
			return true, i
		}
	}
	return false, -1
}

// delete removes the fingerprint if exists; returns true on success.
// (keeps old API behavior)
func (b *bucket) delete(fp fingerprint) bool {
	for i, tfp := range b {
		if tfp == fp {
			b[i] = nullFp
			return true
		}
	}
	return false
}

// deleteAt clears the slot at index idx (new helper).
func (b *bucket) deleteAt(idx int) {
	if idx >= 0 && idx < bucketSize {
		b[idx] = nullFp
	}
}

// getFingerprintIndex returns the index of fp in the bucket, or -1 if not found.
func (b *bucket) getFingerprintIndex(fp fingerprint) int {
	for i, tfp := range b {
		if tfp == fp {
			return i
		}
	}
	return -1
}

// reset clears all slots in the bucket.
func (b *bucket) reset() {
	for i := range b {
		b[i] = nullFp
	}
}
