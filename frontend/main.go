// main.go
package main

import (
	"bufio"
	"encoding/binary"
	"flag"
	"fmt"
	"math/rand"
	"os"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

	cf "github.com/seiflotfy/cuckoofilter"
	pir "github.com/ahenzinger/simplepir/pir"
)

// Record 表示数据库中的一行记录
type Record struct {
	Key         string
	Value       string
	Probability float64
}

// DB 表示整个数据库
type DB struct {
	Records []Record
}

// PIRDatabase 表示一个PIR数据库
type PIRDatabase struct {
	DB          *pir.Database
	Info        pir.DBinfo
	Params      pir.Params
	PIR         pir.PIR
	SharedState pir.State
	ServerState pir.State
	OfflineMsg  pir.Msg
}

// OurPIRSystem 表示我们的PIR系统
type OurPIRSystem struct {
	FullDatabases    []*PIRDatabase  // 动态大小的数据库数组
	PopularDatabases []*PIRDatabase  // 动态大小的数据库数组
	FullFilter       *cf.Filter
	PopularFilter    *cf.Filter
	RandomPopularKey string // 随机选择的热门key
	RandomNonPopularKey string // 随机选择的非热门key
	ValueChunks      int    // value被分成的块数
}

// 性能统计
type PerformanceStats struct {
	OfflineTime     time.Duration
	addTime 		time.Duration
	updateTime 		time.Duration
	deleteTime 		time.Duration
	OnlineTime      time.Duration
	OfflineComm     float64 // MB
	OnlineQueryComm float64 // MB
	OnlineAnswerComm float64 // MB
}

// 命令行参数
type Config struct {
	FilePath    string
	NumRows     int
	KeyLen      int
	Mode        string
	Val         float64
	ProLimit    float64
	RateOfPop   float64
	PWorse      float64
	QueryKey    string
	QueryPop    int
}

func main() {
	config := parseFlags()
	
	// 运行离线阶段并统计性能
	startOffline := time.Now()
	system, stats := ourPIROffline(config)
	stats.OfflineTime = time.Since(startOffline)
	if config.QueryKey == "" {
		// 测试删除和添加功能
		testUpdateFunctions(system,stats,config.KeyLen)
	}

	// 运行在线阶段
	if config.QueryKey != "" {
		startOnline := time.Now()
		success, value := ourPIROnline(system, config.QueryKey, config.PWorse, stats)
		stats.OnlineTime = time.Since(startOnline)
		fmt.Printf("Query result: success=%v, value=%s\n", success, value)
	} else {
		var queryKey string
		if config.QueryPop == 1 {
			queryKey = system.RandomPopularKey
		} else {
			queryKey = system.RandomNonPopularKey
		}
		
		startOnline := time.Now()
		success, value := ourPIROnline(system, queryKey, config.PWorse, stats)
		stats.OnlineTime = time.Since(startOnline)
		fmt.Printf("Query key: %s\n", queryKey)
		fmt.Printf("Query result: success=%v, value=%s\n", success, value)
	}
	
	// 输出性能统计
	fmt.Printf("\n=== Performance Statistics ===\n")
	fmt.Printf("Offline Time: %.2f ms\n", float64(stats.OfflineTime.Microseconds())/1000.0)
	fmt.Printf("Add operation time: %v\n", stats.addTime)
    fmt.Printf("Update operation time: %v\n", stats.updateTime)
    fmt.Printf("Delete operation time: %v\n", stats.deleteTime)
	fmt.Printf("Online Time: %.2f ms\n", float64(stats.OnlineTime.Microseconds())/1000.0)
	fmt.Printf("Offline Communication: %.4f MB\n", stats.OfflineComm)
	fmt.Printf("Online Query Communication: %.4f MB\n", stats.OnlineQueryComm)
	fmt.Printf("Online Answer Communication: %.4f MB\n", stats.OnlineAnswerComm)
	fmt.Printf("Total Communication: %.4f MB\n", 
		stats.OfflineComm + stats.OnlineQueryComm + stats.OnlineAnswerComm)
}

// parseFlags 解析命令行参数
func parseFlags() Config {
	var config Config
	
	flag.StringVar(&config.FilePath, "f", "", "Database file path")
	flag.IntVar(&config.NumRows, "n", 0, "Number of rows to generate")
	flag.IntVar(&config.KeyLen, "l", 0, "Key length for generated data")
	flag.StringVar(&config.Mode, "mode", "rate", "Selection mode: lim or rate")
	flag.Float64Var(&config.Val, "val", 0.1, "Value for selection mode")
	flag.Float64Var(&config.PWorse, "p_worse", 0.1, "Probability to use full database")
	flag.StringVar(&config.QueryKey, "qkey", "", "Query key")
	flag.IntVar(&config.QueryPop, "querypop", 1, "Query from popular database (1) or non-popular (0)")
	
	flag.Parse()
	
	if config.Mode == "lim" {
		config.ProLimit = config.Val
	} else {
		config.RateOfPop = config.Val
	}
	
	if config.FilePath == "" && (config.NumRows == 0 || config.KeyLen == 0) {
		fmt.Println("Error: Either -f or both -n and -l must be provided")
		flag.PrintDefaults()
		os.Exit(1)
	}
	
	return config
}

// ourPIROffline 实现离线阶段
func ourPIROffline(config Config) (*OurPIRSystem, *PerformanceStats) {
	stats := &PerformanceStats{}
	
	var db DB
	if config.FilePath != "" {
		db = readDBFromFile(config.FilePath)
	} else {
		db = generateRandomDB(config.NumRows, config.KeyLen)
	}
	
	fmt.Printf("Total records: %d\n", len(db.Records))
	
	sort.Slice(db.Records, func(i, j int) bool {
		return db.Records[i].Probability > db.Records[j].Probability
	})
	
	var popularDB DB
	if config.Mode == "lim" {
		popularDB = selectByProbabilityLimit(db, config.ProLimit)
		fmt.Printf("Selected %d records by probability limit %.3f\n", 
			len(popularDB.Records), config.ProLimit)
	} else {
		popularDB = selectByRate(db, config.RateOfPop)
		fmt.Printf("Selected %d records by rate %.3f\n", 
			len(popularDB.Records), config.RateOfPop)
	}
	
	// 随机选择查询key
	randomPopularKey := ""
	if len(popularDB.Records) > 0 {
		randomPopularKey = popularDB.Records[rand.Intn(len(popularDB.Records))].Key
	}
	
	// 计算非热门记录
	var nonPopularRecords []Record
	popularKeySet := make(map[string]bool)
	for _, record := range popularDB.Records {
		popularKeySet[record.Key] = true
	}
	for _, record := range db.Records {
		if !popularKeySet[record.Key] {
			nonPopularRecords = append(nonPopularRecords, record)
		}
	}
	
	randomNonPopularKey := ""
	if len(nonPopularRecords) > 0 {
		randomNonPopularKey = nonPopularRecords[rand.Intn(len(nonPopularRecords))].Key
	}
	
	capacity := len(db.Records)
	// st1 := time.Now()
	fullFilter := cf.NewFilter(uint(capacity) * 2)
	for _, record := range db.Records {
		ok := fullFilter.InsertWithValue([]byte(record.Key), record.Value)
		if !ok {
			fmt.Printf("Warning: Failed to insert key %s into full filter\n", record.Key)
		}
	}
		// dr1 := time.Since(st1)
		// fmt.Printf("time: %s\n", dr1)
	popularFilter := cf.NewFilter(uint(len(popularDB.Records) * 2))
	for _, record := range popularDB.Records {
		ok := popularFilter.InsertWithValue([]byte(record.Key), record.Value)
		if !ok {
			fmt.Printf("Warning: Failed to insert key %s into popular filter\n", record.Key)
		}
	}
	
	// 计算value需要分成的块数
	maxValueLen := 0
	for _, record := range db.Records {
		if len(record.Value) > maxValueLen {
			maxValueLen = len(record.Value)
		}
	}
	valueChunks := (maxValueLen + 7) / 8 // 每个块8字节，向上取整
	if valueChunks == 0 {
		valueChunks = 1 // 至少一个块
	}
	
	fmt.Printf("Value maximum length: %d bytes, divided into %d chunks\n", maxValueLen, valueChunks)
	
	fullDatabases, offlineComm := convertFilterToDatabases(fullFilter, valueChunks)
	popularDatabases, _ := convertFilterToDatabases(popularFilter, valueChunks)
	stats.OfflineComm = offlineComm
	
	system := &OurPIRSystem{
		FullDatabases:     fullDatabases,
		PopularDatabases:  popularDatabases,
		FullFilter:        fullFilter,
		PopularFilter:     popularFilter,
		RandomPopularKey:  randomPopularKey,
		RandomNonPopularKey: randomNonPopularKey,
		ValueChunks:       valueChunks,
	}
	
	fmt.Printf("Offline phase completed: %d full records, %d popular records\n", 
		len(db.Records), len(popularDB.Records))
	fmt.Printf("Total databases: %d fingerprint DBs + %d value DBs\n", 
		4, 4*valueChunks)
	
	return system, stats
}

// ourPIROnline 实现在线阶段
func ourPIROnline(system *OurPIRSystem, queryKey string, pWorse float64, stats *PerformanceStats) (bool, string) {
	useFull := rand.Float64() < pWorse
	
	var databases []*PIRDatabase
	var filter *cf.Filter
	
	if useFull {
		fmt.Printf("Using full database (p_worse=%.3f)\n", pWorse)
		databases = system.FullDatabases
		filter = system.FullFilter
	} else {
		fmt.Printf("Using popular database (p_worse=%.3f)\n", pWorse)
		databases = system.PopularDatabases
		filter = system.PopularFilter
	}
	
	// 验证key是否存在
	found, actualValue := filter.LookupValue([]byte(queryKey))
	if !found {
		fmt.Printf("Warning: Key %s not found in selected database\n", queryKey)
		return false, ""
	}
	
	// 获取位置
	bucketPow := filter.GetBucketPow()
	i1, fp := cf.GetIndexAndFingerprint([]byte(queryKey), bucketPow)
	i2 := cf.GetAltIndex(fp, i1, bucketPow)
	
	fmt.Printf("Query key: %s, positions: i1=%d, i2=%d, fp=%d\n", queryKey, i1, i2, fp)
	
	// 计算总数据库数量
	totalDBs := 4 + 4*system.ValueChunks // 4个fingerprint DB + 4*valueChunks个value DB
	
	// 生成并执行查询
	queries := make([]pir.MsgSlice, 2*totalDBs) // 每个数据库查询2个位置
	clientStates := make([]pir.State, 2*totalDBs)
	results := make([]uint64, 2*totalDBs)
	
	var wg sync.WaitGroup
	
	// 生成查询
	for dbIdx := 0; dbIdx < totalDBs; dbIdx++ {
		for posIdx, pos := range []uint64{uint64(i1), uint64(i2)} {
			wg.Add(1)
			go func(dbIdx, posIdx int, pos uint64) {
				defer wg.Done()
				pirDB := databases[dbIdx]
				clientState, query := pirDB.PIR.Query(pos, pirDB.SharedState, pirDB.Params, pirDB.Info)
				idx := dbIdx*2 + posIdx
				queries[idx] = pir.MsgSlice{Data: []pir.Msg{query}}
				clientStates[idx] = clientState
			}(dbIdx, posIdx, pos)
		}
	}
	wg.Wait()
	
	// 计算查询通信量
	stats.OnlineQueryComm = calculateMsgSliceSize(queries)
	
	// 执行查询
	answers := make([]pir.Msg, 2*totalDBs)
	for i := 0; i < 2*totalDBs; i++ {
		wg.Add(1)
		go func(idx int) {
			defer wg.Done()
			dbIdx := idx / 2
			pirDB := databases[dbIdx]
			answer := pirDB.PIR.Answer(pirDB.DB, queries[idx], pirDB.ServerState, 
				pirDB.SharedState, pirDB.Params)
			answers[idx] = answer
		}(i)
	}
	wg.Wait()
	
	// 计算应答通信量
	stats.OnlineAnswerComm = calculateMsgSize(answers)
	
	// 恢复结果
	for i := 0; i < 2*totalDBs; i++ {
		wg.Add(1)
		go func(idx int) {
			defer wg.Done()
			dbIdx := idx / 2
			posIdx := idx % 2
			pos := uint64(i1)
			if posIdx == 1 {
				pos = uint64(i2)
			}
			
			pirDB := databases[dbIdx]
			result := pirDB.PIR.Recover(pos, 0, pirDB.OfflineMsg, 
				queries[idx].Data[0], answers[idx], pirDB.SharedState, 
				clientStates[idx], pirDB.Params, pirDB.Info)
			results[idx] = result
		}(i)
	}
	wg.Wait()
	
	success, recoveredValue := processResults(results, uint32(fp), system.ValueChunks)
	
	// 验证恢复的值
	if success && recoveredValue != actualValue {
		fmt.Printf("Warning: Recovered value '%s' doesn't match actual value '%s'\n", 
			recoveredValue, actualValue)
		return false, recoveredValue
	}
	
	return success, recoveredValue
}

// convertFilterToDatabases 将cuckoo filter转换为数据库（并行版本）
func convertFilterToDatabases(filter *cf.Filter, valueChunks int) ([]*PIRDatabase, float64) {
	buckets := filter.GetBuckets()
	values := filter.GetValues()
	bucketSize := filter.GetBucketSize()
	numBuckets := len(buckets)
	
	// 计算总数据库数量: 4个fingerprint DB + 4 * valueChunks个value DB
	totalDBs := 4 + 4*valueChunks
	databases := make([]*PIRDatabase, totalDBs)
	
	// 使用通道和等待组进行并行处理
	var wg sync.WaitGroup
	resultChan := make(chan struct {
		index      int
		database   *PIRDatabase
		offlineComm float64
	}, totalDBs)
	
	// 并行初始化fingerprint数据库 (d=8)
	for slot := 0; slot < 4; slot++ {
		wg.Add(1)
		go func(slot int) {
			defer wg.Done()
			
			fingerprintValues := make([]uint64, numBuckets)
			
			for bucketIdx := 0; bucketIdx < numBuckets; bucketIdx++ {
				if slot < len(buckets[bucketIdx]) {
					fingerprintValues[bucketIdx] = uint64(buckets[bucketIdx][slot])
				} else {
					fingerprintValues[bucketIdx] = 0
				}
			}
			
			pirInst := &pir.SimplePIR{}
			params := pirInst.PickParams(uint64(numBuckets), 8, 1<<10, 32)
			db := pir.MakeDB(uint64(numBuckets), 8, &params, fingerprintValues)
			
			sharedState := pirInst.Init(db.Info, params)
			serverState, offlineMsg := pirInst.Setup(db, sharedState, params)
			
			// 计算离线通信量
			offlineComm := calculateMsgSize([]pir.Msg{offlineMsg})
			
			resultChan <- struct {
				index      int
				database   *PIRDatabase
				offlineComm float64
			}{
				index: slot,
				database: &PIRDatabase{
					DB:          db,
					Info:        db.Info,
					Params:      params,
					PIR:         pirInst,
					SharedState: sharedState,
					ServerState: serverState,
					OfflineMsg:  offlineMsg,
				},
				offlineComm: offlineComm,
			}
		}(slot)
	}
	
	// 并行初始化value数据库 
	for slot := 0; slot < 4; slot++ {
		for chunk := 0; chunk < valueChunks; chunk++ {
			wg.Add(1)
			go func(slot, chunk int) {
				defer wg.Done()
				
				valueValues := make([]uint64, numBuckets)
				
				for bucketIdx := 0; bucketIdx < numBuckets; bucketIdx++ {
					linearIndex := bucketIdx*bucketSize + slot
					if linearIndex < len(values) && values[linearIndex] != "" {
						// 将value分成多个chunk，每个chunk8字节
						valueBytes := []byte(values[linearIndex])
						chunkStart := chunk * 8
						chunkEnd := chunkStart + 8
						if chunkEnd > len(valueBytes) {
							chunkEnd = len(valueBytes)
						}
						
						// 提取当前chunk的字节
						chunkBytes := make([]byte, 8)
						if chunkStart < len(valueBytes) {
							copy(chunkBytes, valueBytes[chunkStart:chunkEnd])
						}
						
						valueValues[bucketIdx] = binary.BigEndian.Uint64(chunkBytes)
					} else {
						valueValues[bucketIdx] = 0
					}
				}
				
				pirInst := &pir.SimplePIR{}
				params := pirInst.PickParams(uint64(numBuckets), 64, 1<<10, 32)
				db := pir.MakeDB(uint64(numBuckets), 64, &params, valueValues)
				
				sharedState := pirInst.Init(db.Info, params)
				serverState, offlineMsg := pirInst.Setup(db, sharedState, params)
				
				// 计算离线通信量
				offlineComm := calculateMsgSize([]pir.Msg{offlineMsg})

			// 计算数据库索引: 4 (fingerprint DBs) + slot * valueChunks + chunk
				dbIndex := 4 + slot*valueChunks + chunk
				
				resultChan <- struct {
					index      int
					database   *PIRDatabase
					offlineComm float64
				}{
					index: dbIndex,
					database: &PIRDatabase{
						DB:          db,
						Info:        db.Info,
						Params:      params,
						PIR:         pirInst,
						SharedState: sharedState,
						ServerState: serverState,
						OfflineMsg:  offlineMsg,
					},
					offlineComm: offlineComm,
				}
			}(slot, chunk)
		}
	}
	
	// 等待所有goroutine完成
	go func() {
		wg.Wait()
		close(resultChan)
	}()
	
	// 收集结果
	var totalOfflineComm float64
	for result := range resultChan {
		databases[result.index] = result.database
		totalOfflineComm += result.offlineComm
	}
	
	return databases, totalOfflineComm
}

// processResults 处理查询结果
func processResults(results []uint64, fp uint32, valueChunks int) (bool, string) {
	fingerprintMatches := 0
	matchedValueChunks := make([][]byte, 4) // 每个slot的value chunks
	
	for i := 0; i < 4; i++ {
		pos1Result := results[i*2]
		pos2Result := results[i*2+1]
		
		// 检查fingerprint匹配
		if uint32(pos1Result) == fp || uint32(pos2Result) == fp {
			fingerprintMatches++
			
			// 收集该slot的所有value chunks
			slotValueChunks := make([]byte, 0)
			for chunk := 0; chunk < valueChunks; chunk++ {
				// 计算value数据库的索引
				valueDBIndex1 := 4 + i*valueChunks + chunk
				valueDBIndex2 := valueDBIndex1 + 1 // 第二个位置
				
				// 获取两个位置的value chunk
				var valueChunk uint64
				if uint32(pos1Result) == fp {
					valueChunk = results[valueDBIndex1*2] // i1位置的value
				} else {
					valueChunk = results[valueDBIndex2*2+1] // i2位置的value
				}
				
				// 将uint64转换为字节
				chunkBytes := make([]byte, 8)
				binary.BigEndian.PutUint64(chunkBytes, valueChunk)
				slotValueChunks = append(slotValueChunks, chunkBytes...)
			}
			matchedValueChunks[i] = slotValueChunks
		}
	}
	
	if fingerprintMatches == 1 {
		// 找到匹配的slot
		for i := 0; i < 4; i++ {
			if matchedValueChunks[i] != nil {
				// 去除尾部的零字节
				valueBytes := matchedValueChunks[i]
				for len(valueBytes) > 0 && valueBytes[len(valueBytes)-1] == 0 {
					valueBytes = valueBytes[:len(valueBytes)-1]
				}
				return true, string(valueBytes)
			}
		}
	}
	
	return false, ""
}

// 计算Msg的大小（MB）
func calculateMsgSize(msgs []pir.Msg) float64 {
	totalBytes := 0.0
	for _, msg := range msgs {
		for _, matrix := range msg.Data {
			// 每个矩阵元素占8字节（uint64）
			elements := float64(matrix.Rows * matrix.Cols)
			totalBytes += elements * 8.0
		}
	}
	return totalBytes / (1024.0 * 1024.0) // 转换为MB
}

// 计算MsgSlice的大小（MB）
func calculateMsgSliceSize(msgSlices []pir.MsgSlice) float64 {
	totalBytes := 0.0
	for _, msgSlice := range msgSlices {
		for _, msg := range msgSlice.Data {
			for _, matrix := range msg.Data {
				// 每个矩阵元素占8字节（uint64）
				elements := float64(matrix.Rows * matrix.Cols)
				totalBytes += elements * 8.0
			}
		}
	}
	return totalBytes / (1024.0 * 1024.0) // 转换为MB
}

// 数据库操作函数
func readDBFromFile(filePath string) DB {
	file, err := os.Open(filePath)
	if err != nil {
		fmt.Printf("Error opening file: %v\n", err)
		os.Exit(1)
	}
	defer file.Close()
	
	var db DB
	scanner := bufio.NewScanner(file)
	lineNum := 0
	
	for scanner.Scan() {
		lineNum++
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		
		parts := strings.Fields(line)
		if len(parts) < 3 {
			fmt.Printf("Warning: Line %d has less than 3 columns, skipping\n", lineNum)
			continue
		}
		
		prob, err := strconv.ParseFloat(parts[2], 64)
		if err != nil {
			fmt.Printf("Warning: Line %d has invalid probability, skipping: %v\n", lineNum, err)
			continue
		}
		
		db.Records = append(db.Records, Record{
			Key:         parts[0],
			Value:       parts[1],
			Probability: prob,
		})
	}
	
	if err := scanner.Err(); err != nil {
		fmt.Printf("Error reading file: %v\n", err)
		os.Exit(1)
	}
	
	fmt.Printf("Read %d records from %s\n", len(db.Records), filePath)
	return db
}

func generateRandomDB(numRows, keyLen int) DB {
	rand.Seed(time.Now().UnixNano())
	var db DB
	usedKeys := make(map[string]bool)
	
	// 生成随机概率值
	probabilities := make([]float64, numRows)
	totalProb := 0.0
	
	for i := 0; i < numRows; i++ {
		probabilities[i] = rand.Float64()
		totalProb += probabilities[i]
	}
	
	// 归一化概率，使总和为1
	for i := 0; i < numRows; i++ {
		probabilities[i] /= totalProb
	}
	
	// 生成记录
	for i := 0; i < numRows; i++ {
		// 生成唯一的key
		var key string
		for {
			key = generateRandomString(keyLen)
			if !usedKeys[key] {
				usedKeys[key] = true
				break
			}
		}
		
		value := generateRandomString(keyLen)
		
		db.Records = append(db.Records, Record{
			Key:         key,
			Value:       value,
			Probability: probabilities[i],
		})
	}
	
	// 验证概率总和
	sum := 0.0
	for _, record := range db.Records {
		sum += record.Probability
	}
	
	fmt.Printf("Generated %d random records with key length %d, probability sum: %.6f\n", 
		numRows, keyLen, sum)
	
	return db
}

func generateRandomString(length int) string {
	const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	result := make([]byte, length)
	for i := range result {
		result[i] = charset[rand.Intn(len(charset))]
	}
	return string(result)
}

func selectByProbabilityLimit(db DB, limit float64) DB {
	var popularDB DB
	currentSum := 0.0
	
	for _, record := range db.Records {
		popularDB.Records = append(popularDB.Records, record)
		currentSum += record.Probability
		
		if currentSum >= limit {
			break
		}
	}
	
	return popularDB
}

func selectByRate(db DB, rate float64) DB {
	count := int(float64(len(db.Records)) * rate)
	if count > len(db.Records) {
		count = len(db.Records)
	}
	
	popularDB := DB{
		Records: make([]Record, count),
	}
	copy(popularDB.Records, db.Records[:count])
	
	return popularDB
}


func (system *OurPIRSystem) UpdatePirDB(i int, pirDB *PIRDatabase, v_new uint64) error {
    db := pirDB.DB
    info := db.Info
	params := pirDB.Params
    
    if info.Packing > 0 {
        // 打包情况：需要处理整个打包块
		packIndex := uint64(i) / info.Packing
        indexInPack := uint64(i) % info.Packing

        originalCol := packIndex % params.M// 还原到squish前的列数
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
		// fmt.Printf("Updated squished value: %d\n", newSquishedVal)

         // 计算打包值的差值用于更新hint
		delta := newPackedVal - currentPackedVal
		// fmt.Printf("currentPackedVal: %d, delta: %d\n", currentPackedVal, delta)
		
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
			// fmt.Printf("Updated component %d in squished value: %d\n", j, newSquishedVal)
			
			// 计算差值用于更新hint
			delta := new_component - old_component
			// fmt.Printf("old_component: %d, delta: %d\n", old_component, delta)
			
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
	// fmt.Printf("%d\n",bucketPow)
	i1, fp := cf.GetIndexAndFingerprint([]byte(key), bucketPow)
	i2 := cf.GetAltIndex(fp, i1, bucketPow)
	
	// fmt.Printf("(i1,i2): (%d,%d)\n",i1,i2)

	buckets := filter.GetBuckets()
	// values := filter.GetValues()
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
		fmt.Printf("Cannot delete key %s : not exist!")
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

	// 将value转换为uint64
	// v_old := system.stringToUint64(actualValue)
	
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
	fmt.Printf("Adding key-value pair to full databases : (%s, %s)\n",key,value)
	err := system.addToFilterAndDatabase(system.FullFilter, system.FullDatabases, key, value)
	if err != nil {
		return fmt.Errorf("failed to add to full database: %v", err)
	}

	// 如果是热门项目，也添加到热门数据库
	if is_popular && system.PopularFilter != nil && len(system.PopularDatabases) > 0 {
		fmt.Printf("Adding key-value pair to popular databases : (%s, %s)\n",key,value)
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
	// var new_pirDBs []*PIRDatabase
	if slotIndex < 4 {
		dbIndex := slotIndex
		if dbIndex < len(databases) {
			// 设置指纹值
			// databases[dbIndex].OfflineMsg.Data[0].PrintToFile("origin_hint.txt")
			// databases[dbIndex].DB.Data.PrintToFile("origin_DB.txt")
			system.UpdatePirDB(bucketIndex, databases[dbIndex], uint64(fp))
			// databases[dbIndex].DB.Data.PrintToFile("now_DB.txt")
			// databases[dbIndex].OfflineMsg.Data[0].PrintToFile("got_hint.txt")
			// new_pirDBs,_ = convertFilterToDatabases(filter, system.ValueChunks)
			// new_pirDBs[dbIndex].OfflineMsg.Data[0].PrintToFile("real_hint.txt")
			// new_pirDBs[dbIndex].DB.Data.PrintToFile("real_DB.txt")
		}
	}
	
	// 值分片数据库：对应的slot的值分片数据库
	for chunk := 0; chunk < system.ValueChunks; chunk++ {
		dbIndex := 4 + slotIndex*system.ValueChunks + chunk
		if dbIndex < len(databases) {
			// 设置对应的值分片
			// databases[dbIndex].OfflineMsg.Data[0].PrintToFile("origin_hint.txt")
			// databases[dbIndex].DB.Data.PrintToFile("origin_DB.txt")
			system.UpdatePirDB(bucketIndex, databases[dbIndex], valueChunks[chunk])
			// databases[dbIndex].DB.Data.PrintToFile("now_DB.txt")
			// databases[dbIndex].OfflineMsg.Data[0].PrintToFile("got_hint.txt")
			// new_pirDBs[dbIndex].OfflineMsg.Data[0].PrintToFile("real_hint.txt")
			// new_pirDBs[dbIndex].DB.Data.PrintToFile("real_DB.txt")
			// system.FullDatabases[dbIndex].DB.Data.PrintToFile("system_DB_full.txt")
			// system.FullDatabases[dbIndex].OfflineMsg.Data[0].PrintToFile("system_full_hint.txt")
			// fmt.Printf("dbIndex: %d\n",dbIndex)
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

// testUpdateFunctions 测试更新功能
func testUpdateFunctions(system *OurPIRSystem,  stats *PerformanceStats, KeyLen int) {
    fmt.Println("\n=== Testing Update Functions ===")
        
    // 测试添加新项目
    testKey := generateRandomString(KeyLen)
    testValue := generateRandomString(KeyLen)
    newValue := generateRandomString(KeyLen)
    
    // 添加操作
    start := time.Now()
    fmt.Printf("Adding new item: key=%s, value=%s\n", testKey, testValue)
    err := system.AddItem(testKey, testValue, true)
    stats.addTime = time.Since(start)
    
    if err != nil {
        fmt.Printf("Error adding item: %v\n", err)
    } else {
        fmt.Printf("Successfully added item\n\n")
    }
    
    // 测试查询新添加的项目
    fmt.Printf("Querying the added item: \n")
    success, value := ourPIROnline(system, testKey, 0.1, &PerformanceStats{})
    fmt.Printf("Query after addition: success=%v, value=%s\n\n", success, value)
    
    // 测试更新项目
    start = time.Now()
    fmt.Printf("Updating item: key=%s, newValue=%s\n", testKey, newValue)
    err = system.UpdateValue(testKey, newValue)
    stats.updateTime = time.Since(start)
    
    if err != nil {
        fmt.Printf("Error updating item: %v\n", err)
    } else {
        fmt.Printf("Successfully updated item\n\n")
    }
    
    // 测试查询更新后的项目
    fmt.Printf("Querying the updated item:\n")
    success, value = ourPIROnline(system, testKey, 0.1, &PerformanceStats{})
    fmt.Printf("Query after update: success=%v, value=%s\n\n", success, value)
    
    // 测试删除项目
    start = time.Now()
    fmt.Printf("Deleting item: key=%s\n", testKey)
    err = system.DeleteItem(testKey)
    stats.deleteTime = time.Since(start)
    
    if err != nil {
        fmt.Printf("Error deleting item: %v\n", err)
    } else {
        fmt.Printf("Successfully deleted item\n\n")
    }
    
    // 测试查询已删除的项目
    fmt.Printf("Querying the deleted item:\n")
    success, value = ourPIROnline(system, testKey, 0.1, &PerformanceStats{})
    fmt.Printf("Query after deletion: success=%v, value=%s\n\n", success, value)

}