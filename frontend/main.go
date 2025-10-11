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
	st1 := time.Now()
		
	fullFilter := cf.NewFilter(uint(capacity))
	for _, record := range db.Records {
		ok := fullFilter.InsertWithValue([]byte(record.Key), record.Value)
		if !ok {
			fmt.Printf("Warning: Failed to insert key %s into full filter\n", record.Key)
		}
	}
		dr1 := time.Since(st1)
		fmt.Printf("time: %s\n", dr1)
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
	
	// 并行初始化value数据库 (d=64)
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