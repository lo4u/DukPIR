package main

import (
	"fmt"
	"math"
	"math/rand"
	"sort"
	"testing"
	"time"

	rd "crypto/rand"

	cf "github.com/seiflotfy/cuckoofilter"
)

func TestGenerateZipfProbabilities(t *testing.T) {
	n := 1 << 20

	tests := []struct {
		name         string
		s            float64
		topPercent   float64 // 头部的比例，例如 0.2 (20%)
		expectedProb float64 // 头部元素占比预期，例如 0.8 (80%)
	}{
		{"91开", 1.0702, 0.1, 0.90},
		{"82开", 0.8941, 0.2, 0.80},
		{"73开", 0.7090, 0.3, 0.70},
		{"64开", 0.4427, 0.4, 0.60},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			probs := GenerateZipfProbabilities(n, tt.s)

			// 1. 测试长度是否正确
			if len(probs) != n {
				t.Fatalf("预期长度 %d，实际长度 %d", n, len(probs))
			}

			// 2. 测试概率总和是否归一化到 1.0
			var totalProb float64
			for _, p := range probs {
				totalProb += p
			}

			epsilon := 1e-6
			if math.Abs(totalProb-1.0) > epsilon {
				t.Errorf("概率总和不为 1.0，实际为 %v", totalProb)
			}

			// 3. 验证长尾分布的特定比例
			topIndex := int(float64(n) * tt.topPercent)
			var topProb float64
			for i := 0; i < topIndex; i++ {
				topProb += probs[i]
			}

			// 验证误差范围控制在 ±0.01 内
			if topProb < tt.expectedProb-0.01 || topProb > tt.expectedProb+0.01 {
				t.Errorf("%s 分布测试失败: 前 %v%% 预期概率 %.2f，实际为 %v", tt.name, tt.topPercent*100, tt.expectedProb, topProb)
			} else {
				t.Logf("验证成功: %s 分布，前 %v%% 头部元素实际占据了 %.4f 的概率", tt.name, tt.topPercent*100, topProb)
			}
		})
	}
}

func TestGenerateRandomDBs(t *testing.T) {
	n := 1 << 20 // 2^20 条记录，如果有内存/速度限制，可以改小一点，如 100000
	keyLen := 1024

	tests := []struct {
		name     string
		s        float64
		filename string
	}{
		{"91开", 1.0702, "./data/db_91.txt"},
		{"82开", 0.8941, "./data/db_82.txt"},
		{"73开", 0.7090, "./data/db_73.txt"},
		{"64开", 0.4427, "./data/db_64.txt"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Logf("开始生成 %s 分布数据库 (参数 s=%.4f)...", tt.name, tt.s)
			db := generateRandomDB(n, keyLen, tt.s)

			// 将生成的数据库保存到文件
			err := db.SaveToFile(tt.filename)
			if err != nil {
				t.Fatalf("保存数据库 %s 失败: %v", tt.filename, err)
			}
			t.Logf("成功生成并保存 %s 到 %s", tt.name, tt.filename)
		})
	}
}

func TestDistributionSampling(t *testing.T) {
	tests := []struct {
		name         string
		filename     string
		topPercent   float64
		expectedProb float64
	}{
		{"91开", "./data/db_91.txt", 0.1, 0.90},
		{"82开", "./data/db_82.txt", 0.2, 0.80},
		{"73开", "./data/db_73.txt", 0.3, 0.70},
		{"64开", "./data/db_64.txt", 0.4, 0.60},
	}

	sampleSize := 10000
	rand.Seed(time.Now().UnixNano())

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			db := readDBFromFile(tt.filename)
			n := len(db.Records)
			if n == 0 {
				t.Fatalf("数据库为空: %s", tt.filename)
			}

			// 按概率降序排序，确保前 topPercent 是热点数据
			sort.Slice(db.Records, func(i, j int) bool {
				return db.Records[i].Probability > db.Records[j].Probability
			})

			// 预先计算累积概率分布(CDF)，用于高效率随机抽样
			cdf := make([]float64, n)
			sum := 0.0
			for i, r := range db.Records {
				sum += r.Probability
				cdf[i] = sum
			}

			topIndex := int(float64(n) * tt.topPercent)

			popularCount := 0
			for i := 0; i < sampleSize; i++ {
				r := rand.Float64() * sum
				// 二分查找
				idx := sort.Search(n, func(j int) bool {
					return cdf[j] >= r
				})
				// 如果找出的索引位位于前 topPercent 内，命中热点
				if idx < topIndex {
					popularCount++
				}
			}

			actualProb := float64(popularCount) / float64(sampleSize)

			// 允许一定的随机误差范围 (例如 ±0.05 对应 1000 次抽取大约 ±50 次的抖动)
			if math.Abs(actualProb-tt.expectedProb) > 0.01 {
				t.Errorf("%s 抽样测试失败: 预期头部占比 %.2f, 实际抽样命中占比 %.3f (10000次里面命中了 %d 次)", tt.name, tt.expectedProb, actualProb, popularCount)
			} else {
				t.Logf("%s 抽样测试成功: 1000个样本中命中头部热点数: %d (占比实际: %.3f，预期概率: %.2f)", tt.name, popularCount, actualProb, tt.expectedProb)
			}
		})
	}
}

func TestSampleQueriesByProbability(t *testing.T) {
	tests := []struct {
		name         string
		filename     string
		topPercent   float64
		expectedProb float64
	}{
		{"91开", "./data/db_91.txt", 0.1, 0.90},
		{"82开", "./data/db_82.txt", 0.2, 0.80},
		{"73开", "./data/db_73.txt", 0.3, 0.70},
		{"64开", "./data/db_64.txt", 0.4, 0.60},
	}

	const sampleSize = 100000
	const tolerance = 0.015

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rand.Seed(42)
			db := readDBFromFile(tt.filename)
			if len(db.Records) == 0 {
				t.Fatalf("数据库为空: %s", tt.filename)
			}

			samples := sampleQueriesByProbability(db, "rate", tt.topPercent, sampleSize)
			if len(samples) != sampleSize {
				t.Fatalf("抽样数量不正确: got=%d want=%d", len(samples), sampleSize)
			}

			hotCount := 0
			for _, s := range samples {
				if s.IsHot {
					hotCount++
				}
			}

			actual := float64(hotCount) / float64(sampleSize)
			if math.Abs(actual-tt.expectedProb) > tolerance {
				t.Errorf("%s 抽样比例不符合预期: expected=%.3f actual=%.3f tolerance=%.3f", tt.name, tt.expectedProb, actual, tolerance)
			} else {
				t.Logf("%s 抽样比例符合预期: expected=%.3f actual=%.3f", tt.name, tt.expectedProb, actual)
			}
		})
	}
}

func randomString(l int) string {
	b := make([]byte, l)
	_, _ = rd.Read(b)
	return string(b)
}

func TestFalsePositiveRate(t *testing.T) {
	total := 200000
	insertN := 199800
	testN := total - insertN

	fmt.Printf("开始生成%d个8字节随机字符串...", total)
	allItems := make([]string, 0, total)
	itemSet := make(map[string]struct{}, total)
	for len(allItems) < total {
		s := randomString(8)
		if _, exists := itemSet[s]; !exists {
			allItems = append(allItems, s)
			itemSet[s] = struct{}{}
		}
	}

	fmt.Println("开始插入过滤器...")
	insertItems := allItems[:insertN]
	testItems := allItems[insertN:]
	filter := cf.NewFilter(uint(insertN) * 2)
	for _, item := range insertItems {
		err := filter.Insert([]byte(item))
		if err != true {
			t.Fatalf("插入元素失败: %v", err)
		}
	}

	fmt.Println("开始测试假阳率...")
	fpCount := 0
	for _, item := range testItems {
		if filter.Lookup([]byte(item)) {
			fpCount++
		}
	}
	fpr := float64(fpCount) / float64(testN)
	fmt.Println("\n===== 测试结果 =====")
	fmt.Printf("测试数量：%d\n", testN)
	fmt.Printf("假阳数量：%d\n", fpCount)
	fmt.Printf("假阳率：%.6f (%.2f%%)\n", fpr, fpr*100)
}

// TestFindZipfS 查找在离散长度 n 下，使得前 topPercent 的累计概率接近 target 的 Zipf 指数 s。
// 输出每个目标的 s 值与实际前部概率，便于把结果写回生成脚本中。
func TestFindZipfS(t *testing.T) {
	n := 1 << 20
	tests := []struct {
		name       string
		topPercent float64
		target     float64
	}{
		{"91开", 0.1, 0.90},
		{"82开", 0.2, 0.80},
		{"73开", 0.3, 0.70},
		{"64开", 0.4, 0.60},
	}

	for _, tt := range tests {
		lo := 0.001
		hi := 5.0
		var mid float64
		for i := 0; i < 80; i++ {
			mid = (lo + hi) / 2.0
			probs := GenerateZipfProbabilities(n, mid)
			topIndex := int(float64(n) * tt.topPercent)
			if topIndex <= 0 {
				t.Fatalf("invalid top index")
			}
			var topSum float64
			for j := 0; j < topIndex; j++ {
				topSum += probs[j]
			}
			if topSum < tt.target {
				lo = mid
			} else {
				hi = mid
			}
		}
		s := (lo + hi) / 2.0
		probs := GenerateZipfProbabilities(n, s)
		topIndex := int(float64(n) * tt.topPercent)
		var topSum float64
		for j := 0; j < topIndex; j++ {
			topSum += probs[j]
		}
		t.Logf("%s -> s=%.6f actual_top=%.6f error=%.6f", tt.name, s, topSum, topSum-tt.target)
		if math.Abs(topSum-tt.target) > 0.01 {
			t.Errorf("%s: 找到的 s 不能满足目标精度: error=%.6f", tt.name, topSum-tt.target)
		}
	}
}

func TestZipf2(t *testing.T) {
	fmt.Printf("读取数据...")
	db := readDBFromFile("./data/db_73.txt")
	sort.Slice(db.Records, func(i, j int) bool {
		return db.Records[i].Probability > db.Records[j].Probability
	})
	hotItems := db.Records[:int(float64(len(db.Records))*0.3)]
	otherItems := db.Records[int(float64(len(db.Records))*0.3):]
	testItems := otherItems[:300]

	fmt.Printf("开始构建过滤器...")
	ft := cf.NewFilter(uint(len(hotItems)) * 2)
	for _, r := range hotItems {
		ft.InsertWithValue([]byte(r.Key), r.Value)
	}

	fmt.Printf("开始测试查询...")
	fpCount := 0
	for _, r := range testItems {
		if ft.Lookup([]byte(r.Key)) {
			fpCount++
		}
	}
	fmt.Printf("假阳数量：%d\n", fpCount)
	fpr := float64(fpCount) / float64(len(testItems))
	fmt.Println("\n===== 测试结果 =====")
	fmt.Printf("测试数量：%d\n", len(testItems))
	fmt.Printf("假阳数量：%d\n", fpCount)
	fmt.Printf("假阳率：%.6f (%.2f%%)\n", fpr, fpr*100)
}
