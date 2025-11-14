package main

import (
	"bufio"
	"encoding/binary"
	"fmt"
	"math/rand"
	"os"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

	pir "github.com/ahenzinger/simplepir/pir"
	cf "github.com/seiflotfy/cuckoofilter"
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
	FullDatabases       []*PIRDatabase // 动态大小的数据库数组
	PopularDatabases    []*PIRDatabase // 动态大小的数据库数组
	FullFilter          *cf.Filter
	PopularFilter       *cf.Filter
	RandomPopularKey    string // 随机选择的热门key
	RandomNonPopularKey string // 随机选择的非热门key
	ValueChunks         int    // value被分成的块数
}

// 性能统计
type PerformanceStats struct {
	OfflineTime      time.Duration
	AddTime          time.Duration
	UpdateTime       time.Duration
	DeleteTime       time.Duration
	OnlineTime       time.Duration
	OfflineComm      float64 // MB
	OnlineQueryComm  float64 // MB
	OnlineAnswerComm float64 // MB
}

// PIRService PIR服务封装
type PIRService struct {
	system *OurPIRSystem
	stats  *PerformanceStats
	mutex  sync.RWMutex
}

// NewPIRService 创建新的PIR服务
func NewPIRService() *PIRService {
	return &PIRService{
		stats: &PerformanceStats{},
	}
}

// InitializePIRSystem 初始化PIR系统
func (ps *PIRService) InitializePIRSystem(config Config) error {
	ps.mutex.Lock()
	defer ps.mutex.Unlock()

	// 运行离线阶段并统计性能
	startOffline := time.Now()
	system, stats := ps.ourPIROffline(config)
	stats.OfflineTime = time.Since(startOffline)

	ps.system = system
	ps.stats = stats

	fmt.Printf("PIR系统初始化完成: %d 完整记录, %d 热门记录\n",
		len(system.FullFilter.GetBuckets()), len(system.PopularFilter.GetBuckets()))

	return nil
}

// Query 执行PIR查询
func (ps *PIRService) Query(queryKey string, pWorse float64) (bool, string, *PerformanceStats) {
	ps.mutex.RLock()
	defer ps.mutex.RUnlock()

	if ps.system == nil {
		return false, "", nil
	}

	startOnline := time.Now()
	success, value := ps.ourPIROnline(ps.system, queryKey, pWorse, ps.stats)
	ps.stats.OnlineTime = time.Since(startOnline)

	return success, value, ps.stats
}

// AddItem 添加新项目
func (ps *PIRService) AddItem(key, value string, isPopular bool) error {
	ps.mutex.Lock()
	defer ps.mutex.Unlock()

	if ps.system == nil {
		return fmt.Errorf("PIR系统未初始化")
	}

	start := time.Now()
	err := ps.system.AddItem(key, value, isPopular)
	ps.stats.AddTime = time.Since(start)

	return err
}

// UpdateValue 更新现有项目的值
func (ps *PIRService) UpdateValue(key, newValue string) error {
	ps.mutex.Lock()
	defer ps.mutex.Unlock()

	if ps.system == nil {
		return fmt.Errorf("PIR系统未初始化")
	}

	start := time.Now()
	err := ps.system.UpdateValue(key, newValue)
	ps.stats.UpdateTime = time.Since(start)

	return err
}

// DeleteItem 删除指定key的项目
func (ps *PIRService) DeleteItem(key string) error {
	ps.mutex.Lock()
	defer ps.mutex.Unlock()

	if ps.system == nil {
		return fmt.Errorf("PIR系统未初始化")
	}

	start := time.Now()
	err := ps.system.DeleteItem(key)
	ps.stats.DeleteTime = time.Since(start)

	return err
}

// GetStats 获取性能统计
func (ps *PIRService) GetStats() *PerformanceStats {
	ps.mutex.RLock()
	defer ps.mutex.RUnlock()
	return ps.stats
}

// 配置结构
// Config 已移动到 main.go 中定义

// ourPIROffline 实现离线阶段
func (ps *PIRService) ourPIROffline(config Config) (*OurPIRSystem, *PerformanceStats) {
	fmt.Println("ourPIROffline function is called")
	stats := &PerformanceStats{}

	var db DB

	if config.FilePath != "" {
		fmt.Printf("尝试从文件读取: %s\n", config.FilePath)
		// 检查文件是否存在
		if _, err := os.Stat(config.FilePath); os.IsNotExist(err) {
			fmt.Printf("文件不存在: %s\n", config.FilePath)
		} else {
			fmt.Printf("文件存在，准备读取\n")
		}
		db = ps.readDBFromFile(config.FilePath)

	} else {
		fmt.Printf("文件路径为空，使用随机生成\n")
		db = ps.generateRandomDB(config.NumRows, config.KeyLen)
		fmt.Println("没有成功捏")
	}

	fmt.Printf("总记录数: %d\n", len(db.Records))

	sort.Slice(db.Records, func(i, j int) bool {
		return db.Records[i].Probability > db.Records[j].Probability
	})

	var popularDB DB
	if config.Mode == "lim" {
		popularDB = ps.selectByProbabilityLimit(db, config.ProLimit)
		fmt.Printf("按概率限制 %.3f 选择了 %d 条记录\n",
			config.ProLimit, len(popularDB.Records))
	} else {
		popularDB = ps.selectByRate(db, config.RateOfPop)
		fmt.Printf("按比例 %.3f 选择了 %d 条记录\n",
			config.RateOfPop, len(popularDB.Records))
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
	fullFilter := cf.NewFilter(uint(capacity) * 2)
	for _, record := range db.Records {
		ok := fullFilter.InsertWithValue([]byte(record.Key), record.Value)
		if !ok {
			fmt.Printf("警告: 无法将key %s 插入完整过滤器\n", record.Key)
		}
	}

	popularFilter := cf.NewFilter(uint(len(popularDB.Records) * 2))
	for _, record := range popularDB.Records {
		ok := popularFilter.InsertWithValue([]byte(record.Key), record.Value)
		if !ok {
			fmt.Printf("警告: 无法将key %s 插入热门过滤器\n", record.Key)
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

	fmt.Printf("Value最大长度: %d 字节，分成 %d 个块\n", maxValueLen, valueChunks)

	fullDatabases, offlineComm := ps.convertFilterToDatabases(fullFilter, valueChunks)
	popularDatabases, _ := ps.convertFilterToDatabases(popularFilter, valueChunks)
	stats.OfflineComm = offlineComm

	system := &OurPIRSystem{
		FullDatabases:       fullDatabases,
		PopularDatabases:    popularDatabases,
		FullFilter:          fullFilter,
		PopularFilter:       popularFilter,
		RandomPopularKey:    randomPopularKey,
		RandomNonPopularKey: randomNonPopularKey,
		ValueChunks:         valueChunks,
	}

	fmt.Printf("离线阶段完成: %d 完整记录, %d 热门记录\n",
		len(db.Records), len(popularDB.Records))
	fmt.Printf("总数据库数: %d 指纹DB + %d 值DB\n",
		4, 4*valueChunks)

	return system, stats
}

// ourPIROnline 实现在线阶段
func (ps *PIRService) ourPIROnline(system *OurPIRSystem, queryKey string, pWorse float64, stats *PerformanceStats) (bool, string) {
	useFull := rand.Float64() < pWorse
	var databases []*PIRDatabase
	var filter *cf.Filter

	if useFull {
		fmt.Printf("使用完整数据库 (p_worse=%.3f)\n", pWorse)
		databases = system.FullDatabases
		filter = system.FullFilter
	} else {
		fmt.Printf("使用热门数据库 (p_worse=%.3f)\n", pWorse)
		databases = system.PopularDatabases
		filter = system.PopularFilter
	}

	// 验证key是否存在
	found, actualValue := filter.LookupValue([]byte(queryKey))
	fmt.Println("key:", queryKey)
	fmt.Printf("Filter Lookup for key %s: found=%v, value=%s\n", queryKey, found, actualValue)
	fmt.Println()
	if !found {
		fmt.Printf("警告: Key %s 在选定数据库中未找到\n", queryKey)
		return false, ""
	}
	
	// 获取位置
	bucketPow := filter.GetBucketPow()
	i1, fp := cf.GetIndexAndFingerprint([]byte(queryKey), bucketPow)
	i2 := cf.GetAltIndex(fp, i1, bucketPow)

	fmt.Printf("查询key: %s, 位置: i1=%d, i2=%d, fp=%d\n", queryKey, i1, i2, fp)

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
	stats.OnlineQueryComm = ps.calculateMsgSliceSize(queries)

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
	stats.OnlineAnswerComm = ps.calculateMsgSize(answers)

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

	success, recoveredValue := ps.processResults(results, uint32(fp), system.ValueChunks)

	// 验证恢复的值
	if success && recoveredValue != actualValue {
		fmt.Printf("警告: 恢复的值 '%s' 与实际值 '%s' 不匹配\n",
			recoveredValue, actualValue)
		return false, recoveredValue
	}

	return success, recoveredValue
}

// convertFilterToDatabases 将cuckoo filter转换为数据库（并行版本）
func (ps *PIRService) convertFilterToDatabases(filter *cf.Filter, valueChunks int) ([]*PIRDatabase, float64) {
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
		index       int
		database    *PIRDatabase
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
			offlineComm := ps.calculateMsgSize([]pir.Msg{offlineMsg})

			resultChan <- struct {
				index       int
				database    *PIRDatabase
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
				offlineComm := ps.calculateMsgSize([]pir.Msg{offlineMsg})

				// 计算数据库索引: 4 (fingerprint DBs) + slot * valueChunks + chunk
				dbIndex := 4 + slot*valueChunks + chunk

				resultChan <- struct {
					index       int
					database    *PIRDatabase
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
func (ps *PIRService) processResults(results []uint64, fp uint32, valueChunks int) (bool, string) {
	fingerprintMatches := 0
	matchedValueChunks := make([][]byte, 4) // 每个slot的value chunks
	fmt.Printf("ProcessResults: fp=%d, valueChunks=%d, results len=%d\n", fp, valueChunks, len(results))
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
func (ps *PIRService) calculateMsgSize(msgs []pir.Msg) float64 {
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
func (ps *PIRService) calculateMsgSliceSize(msgSlices []pir.MsgSlice) float64 {
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
func (ps *PIRService) readDBFromFile(filePath string) DB {
	file, err := os.Open(filePath)
	if err != nil {
		fmt.Printf("打开文件错误: %v\n", err)
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
			fmt.Printf("警告: 第 %d 行少于3列，跳过\n", lineNum)
			continue
		}

		prob, err := strconv.ParseFloat(parts[2], 64)
		if err != nil {
			fmt.Printf("警告: 第 %d 行概率无效，跳过: %v\n", lineNum, err)
			continue
		}

		db.Records = append(db.Records, Record{
			Key:         parts[0],
			Value:       parts[1],
			Probability: prob,
		})
	}

	if err := scanner.Err(); err != nil {
		fmt.Printf("读取文件错误: %v\n", err)
		os.Exit(1)
	}

	fmt.Printf("从 %s 读取了 %d 条记录\n", filePath, len(db.Records))
	return db
}

func (ps *PIRService) generateRandomDB(numRows, keyLen int) DB {
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
			key = ps.generateRandomString(keyLen)
			if !usedKeys[key] {
				usedKeys[key] = true
				break
			}
		}

		value := ps.generateRandomString(keyLen)

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

	fmt.Printf("生成了 %d 条随机记录，键长度 %d，概率总和: %.6f\n",
		numRows, keyLen, sum)

	return db
}

func (ps *PIRService) generateRandomString(length int) string {
	const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	result := make([]byte, length)
	for i := range result {
		result[i] = charset[rand.Intn(len(charset))]
	}
	return string(result)
}

func (ps *PIRService) selectByProbabilityLimit(db DB, limit float64) DB {
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

func (ps *PIRService) selectByRate(db DB, rate float64) DB {
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
