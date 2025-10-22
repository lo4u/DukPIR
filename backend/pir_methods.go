package main

import (
	"encoding/binary"
	"fmt"

	pir "github.com/ahenzinger/simplepir/pir"
	cf "github.com/seiflotfy/cuckoofilter"
)

// UpdatePirDB 更新PIR数据库
func (system *OurPIRSystem) UpdatePirDB(i int, pirDB *PIRDatabase, v_new uint64) error {
	db := pirDB.DB
	info := db.Info
	params := pirDB.Params

	if info.Packing > 0 {
		// 打包情况：需要处理整个打包块
		packIndex := uint64(i) / info.Packing
		indexInPack := uint64(i) % info.Packing

		originalCol := packIndex % params.M // 还原到squish前的列数
		row := packIndex / params.M

		// 计算在squish后矩阵中的列
		squishCol := originalCol / info.Squishing
		offsetInSquish := originalCol % info.Squishing

		// 获取当前的squish值
		currentSquishedVal := db.Data.Get(row, squishCol)

		// 解squish：从压缩值中提取原始值
		mask := uint64((1 << info.Basis) - 1)
		originalVals := make([]uint64, info.Squishing)
		for k := uint64(0); k < info.Squishing; k++ {
			if squishCol*info.Squishing+k < db.Data.Cols*info.Squishing {
				originalVals[k] = (currentSquishedVal >> (k * info.Basis)) & mask
			}
		}

		// 现在originalVals[offsetInSquish] 包含我们需要的打包值
		currentPackedVal := originalVals[offsetInSquish]

		// 解包：恢复打包块中的所有元素
		unpacked := make([]uint64, info.Packing)
		temp := currentPackedVal
		for j := uint64(0); j < info.Packing; j++ {
			unpacked[j] = temp % (1 << info.Row_length)
			temp = temp >> info.Row_length
		}

		// 更新对应的元素
		new_unpacked := make([]uint64, info.Packing)
		copy(new_unpacked, unpacked)
		new_unpacked[indexInPack] = v_new

		// 重新打包得到新值
		newPackedVal := uint64(0)
		coeff := uint64(1)
		for j := uint64(0); j < info.Packing; j++ {
			newPackedVal += new_unpacked[j] * coeff
			coeff *= (1 << info.Row_length)
		}

		// 更新squish值中的对应部分
		originalVals[offsetInSquish] = newPackedVal

		// 重新squish
		newSquishedVal := uint64(0)
		for k := uint64(0); k < info.Squishing; k++ {
			if squishCol*info.Squishing+k < db.Data.Cols*info.Squishing {
				newSquishedVal += originalVals[k] << (k * info.Basis)
			}
		}

		// 更新数据库
		db.Data.Set(newSquishedVal, row, squishCol)

		// 计算打包值的差值用于更新hint
		delta := newPackedVal - currentPackedVal

		// 更新hint - 使用原始的row和originalCol（squish前的坐标）
		if len(pirDB.OfflineMsg.Data) == 0 {
			return fmt.Errorf("offline message is empty")
		}

		offlineMatrix := pirDB.OfflineMsg.Data[0]
		if row >= uint64(offlineMatrix.Rows) {
			return fmt.Errorf("row index out of range: %d >= %d", row, offlineMatrix.Rows)
		}

		for c := uint64(0); c < uint64(offlineMatrix.Cols); c++ {
			currentVal := offlineMatrix.Get(uint64(row), uint64(c))
			A_j := pirDB.SharedState.Data[0].Get(uint64(originalCol), uint64(c))
			delta_val := A_j * delta
			newVal := (currentVal + delta_val) % (uint64(1) << 32)
			offlineMatrix.Set(newVal, uint64(row), uint64(c))
		}

	} else {
		// 非打包情况：每个DB元素由多个Z_p元素表示
		base_row := (uint64(i) / params.M) * info.Ne
		base_col := uint64(i) % params.M

		for j := uint64(0); j < info.Ne; j++ {
			row := base_row + j
			originalCol := base_col

			// 计算在squish后矩阵中的位置
			squishCol := originalCol / info.Squishing
			offsetInSquish := originalCol % info.Squishing

			// 获取当前的squish值
			currentSquishedVal := db.Data.Get(row, squishCol)

			// 解squish
			mask := uint64((1 << info.Basis) - 1)
			old_component := (currentSquishedVal >> (offsetInSquish * info.Basis)) & mask

			// 计算新分量
			new_component := pir.Base_p(info.P, v_new, j)

			// 更新squish值
			newSquishedVal := currentSquishedVal &^ (mask << (offsetInSquish * info.Basis))
			newSquishedVal |= new_component << (offsetInSquish * info.Basis)

			// 更新数据库
			db.Data.Set(newSquishedVal, row, squishCol)

			// 计算差值用于更新hint
			delta := new_component - old_component

			// 更新hint - 使用原始坐标
			if len(pirDB.OfflineMsg.Data) == 0 {
				return fmt.Errorf("offline message is empty")
			}

			offlineMatrix := pirDB.OfflineMsg.Data[0]
			if row >= uint64(offlineMatrix.Rows) {
				return fmt.Errorf("row index out of range: %d >= %d", row, offlineMatrix.Rows)
			}

			for c := uint64(0); c < uint64(offlineMatrix.Cols); c++ {
				currentVal := offlineMatrix.Get(uint64(row), uint64(c))
				A_j := pirDB.SharedState.Data[0].Get(uint64(originalCol), uint64(c))
				delta_val := A_j * delta
				newVal := (currentVal + delta_val) % (uint64(1) << 32)
				offlineMatrix.Set(newVal, uint64(row), uint64(c))
			}
		}
	}

	return nil
}

// getKeySlotPosition 获取key在filter中的确切位置（桶和slot）
func getKeySlotPosition(filter *cf.Filter, key string) (int, int) {
	bucketPow := filter.GetBucketPow()
	i1, fp := cf.GetIndexAndFingerprint([]byte(key), bucketPow)
	i2 := cf.GetAltIndex(fp, i1, bucketPow)

	buckets := filter.GetBuckets()
	bucketSize := filter.GetBucketSize()

	// 检查第一个桶
	for slot := 0; slot < 4; slot++ {
		if buckets[i1][slot] == fp {
			return int(i1), slot
		}
	}

	// 检查第二个桶
	for slot := 0; slot < bucketSize; slot++ {
		if buckets[i2][slot] == fp {
			return int(i2), slot
		}
	}

	return -1, -1
}

// DeleteItem 删除指定key的项目
func (system *OurPIRSystem) DeleteItem(key string) error {
	// 在完整数据库中查找并删除
	foundInFull := system.deleteFromFilterAndDatabase(system.FullFilter, system.FullDatabases, key)

	// 在热门数据库中查找并删除
	if system.PopularFilter != nil && len(system.PopularDatabases) > 0 {
		foundInPopular := system.deleteFromFilterAndDatabase(system.PopularFilter, system.PopularDatabases, key)
		if foundInFull || foundInPopular {
			return nil
		}
	} else if foundInFull {
		return nil
	}

	return fmt.Errorf("key not found in any database: %s", key)
}

// deleteFromFilterAndDatabase 从指定filter和数据库中删除key
func (system *OurPIRSystem) deleteFromFilterAndDatabase(filter *cf.Filter, databases []*PIRDatabase, key string) bool {
	// 检查key是否存在
	found, _ := filter.LookupValue([]byte(key))
	if !found {
		fmt.Printf("Cannot delete key: not exist!")
		return false
	}

	// 获取key的确切位置（桶和slot）
	bucketIndex, slotIndex := getKeySlotPosition(filter, key)
	if bucketIndex == -1 {
		fmt.Printf("Warning: Cannot find exact position for key %s\n", key)
		return false
	}

	fmt.Printf("Deleting key: %s, bucket=%d, slot=%d\n", key, bucketIndex, slotIndex)

	// 从filter中删除
	success := filter.DeleteWithValue([]byte(key))
	if !success {
		fmt.Printf("Warning: Failed to delete key %s from filter\n", key)
	}

	// 只更新对应的slot数据库
	// 指纹数据库：对应的slot数据库
	if slotIndex < 4 {
		dbIndex := slotIndex
		if dbIndex < len(databases) {
			// 对于删除操作，v_new = 0
			system.UpdatePirDB(bucketIndex, databases[dbIndex], 0)
		}
	}

	// 值分片数据库：对应的slot的值分片数据库
	for chunk := 0; chunk < system.ValueChunks; chunk++ {
		dbIndex := 4 + slotIndex*system.ValueChunks + chunk
		if dbIndex < len(databases) {
			// 对于删除操作，v_new = 0
			system.UpdatePirDB(bucketIndex, databases[dbIndex], 0)
		}
	}

	return true
}

// stringToUint64 将字符串转换为uint64
func (system *OurPIRSystem) stringToUint64(s string) uint64 {
	if len(s) == 0 {
		return 0
	}

	// 将字符串转换为字节切片
	bytes := []byte(s)

	// 确保字节切片长度至少为8
	if len(bytes) < 8 {
		padded := make([]byte, 8)
		copy(padded, bytes)
		bytes = padded
	}

	// 取前8个字节转换为uint64
	return binary.BigEndian.Uint64(bytes[:8])
}

// AddItem 添加新项目
func (system *OurPIRSystem) AddItem(key, value string, is_popular bool) error {
	// 添加到完整数据库
	fmt.Printf("Adding key-value pair to full databases : (%s, %s)\n", key, value)
	err := system.addToFilterAndDatabase(system.FullFilter, system.FullDatabases, key, value)
	if err != nil {
		return fmt.Errorf("failed to add to full database: %v", err)
	}

	// 如果是热门项目，也添加到热门数据库
	if is_popular && system.PopularFilter != nil && len(system.PopularDatabases) > 0 {
		fmt.Printf("Adding key-value pair to popular databases : (%s, %s)\n", key, value)
		err = system.addToFilterAndDatabase(system.PopularFilter, system.PopularDatabases, key, value)
		if err != nil {
			return fmt.Errorf("failed to add to popular database: %v", err)
		}
	}

	return nil
}

// addToFilterAndDatabase 添加到指定filter和数据库
func (system *OurPIRSystem) addToFilterAndDatabase(filter *cf.Filter, databases []*PIRDatabase, key, value string) error {
	// 检查key是否已存在
	found, _ := filter.LookupValue([]byte(key))
	if found {
		return fmt.Errorf("key already exists: %s", key)
	}

	// 添加到filter
	success := filter.InsertWithValue([]byte(key), value)
	if !success {
		return fmt.Errorf("failed to insert key into filter: %s", key)
	}

	// 获取key的确切位置（桶和slot）
	bucketIndex, slotIndex := getKeySlotPosition(filter, key)
	if bucketIndex == -1 {
		return fmt.Errorf("cannot find exact position for key after insertion: %s", key)
	}

	// 计算指纹
	bucketPow := filter.GetBucketPow()
	_, fp := cf.GetIndexAndFingerprint([]byte(key), bucketPow)

	// 将value转换为uint64分片
	valueBytes := []byte(value)
	valueChunks := make([]uint64, system.ValueChunks)

	for chunk := 0; chunk < system.ValueChunks; chunk++ {
		chunkStart := chunk * 8
		chunkEnd := chunkStart + 8
		if chunkEnd > len(valueBytes) {
			chunkEnd = len(valueBytes)
		}

		chunkBytes := make([]byte, 8)
		if chunkStart < len(valueBytes) {
			copy(chunkBytes, valueBytes[chunkStart:chunkEnd])
		}
		valueChunks[chunk] = binary.BigEndian.Uint64(chunkBytes)
	}

	// 指纹数据库：对应的slot数据库
	if slotIndex < 4 {
		dbIndex := slotIndex
		if dbIndex < len(databases) {
			// 设置指纹值
			system.UpdatePirDB(bucketIndex, databases[dbIndex], uint64(fp))
		}
	}

	// 值分片数据库：对应的slot的值分片数据库
	for chunk := 0; chunk < system.ValueChunks; chunk++ {
		dbIndex := 4 + slotIndex*system.ValueChunks + chunk
		if dbIndex < len(databases) {
			// 设置对应的值分片
			system.UpdatePirDB(bucketIndex, databases[dbIndex], valueChunks[chunk])
		}
	}

	return nil
}

// UpdateValue 更新现有项目的值
func (system *OurPIRSystem) UpdateValue(key, newValue string) error {
	// 更新完整数据库
	fmt.Printf("Updating key-value pair in full databases: (%s, %s)\n", key, newValue)
	err := system.updateValueInFilterAndDatabase(system.FullFilter, system.FullDatabases, key, newValue)
	if err != nil {
		return fmt.Errorf("failed to update in full database: %v", err)
	}

	// 如果该key在热门数据库中，也更新热门数据库
	if system.PopularFilter != nil && len(system.PopularDatabases) > 0 {
		found, _ := system.PopularFilter.LookupValue([]byte(key))
		if found {
			fmt.Printf("Updating key-value pair in popular databases: (%s, %s)\n", key, newValue)
			err = system.updateValueInFilterAndDatabase(system.PopularFilter, system.PopularDatabases, key, newValue)
			if err != nil {
				return fmt.Errorf("failed to update in popular database: %v", err)
			}
		}
	}

	return nil
}

// updateValueInFilterAndDatabase 在指定filter和数据库中更新值
func (system *OurPIRSystem) updateValueInFilterAndDatabase(filter *cf.Filter, databases []*PIRDatabase, key, newValue string) error {
	// 检查key是否存在

	found, _ := filter.LookupValue([]byte(key))
	if !found {
		return fmt.Errorf("key does not exist: %s", key)
	}
	fmt.Println("11111111111111")
	// 更新filter中的值
	success := filter.SetValue([]byte(key), newValue)
	if !success {
		return fmt.Errorf("failed to update value in filter for key: %s", key)
	}

	// 获取key的位置（桶和slot）
	bucketIndex, slotIndex := getKeySlotPosition(filter, key)
	if bucketIndex == -1 {
		return fmt.Errorf("cannot find position for key: %s", key)
	}

	// 将新值转换为uint64分片
	valueBytes := []byte(newValue)
	valueChunks := make([]uint64, system.ValueChunks)

	for chunk := 0; chunk < system.ValueChunks; chunk++ {
		chunkStart := chunk * 8
		chunkEnd := chunkStart + 8
		if chunkEnd > len(valueBytes) {
			chunkEnd = len(valueBytes)
		}

		chunkBytes := make([]byte, 8)
		if chunkStart < len(valueBytes) {
			copy(chunkBytes, valueBytes[chunkStart:chunkEnd])
		}
		valueChunks[chunk] = binary.BigEndian.Uint64(chunkBytes)
	}

	// 更新对应的值分片数据库（指纹数据库不需要更新，因为指纹没有改变）
	for chunk := 0; chunk < system.ValueChunks; chunk++ {
		dbIndex := 4 + slotIndex*system.ValueChunks + chunk
		if dbIndex < len(databases) {
			// 更新对应的值分片
			system.UpdatePirDB(bucketIndex, databases[dbIndex], valueChunks[chunk])
		}
	}

	return nil
}
