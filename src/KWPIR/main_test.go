package main

import (
	"math"
	"testing"
)

func TestGenerateZipfProbabilities(t *testing.T) {
	n := 100000

	tests := []struct {
		name         string
		s            float64
		topPercent   float64 // 头部的比例，例如 0.2 (20%)
		expectedProb float64 // 头部元素占比预期，例如 0.8 (80%)
	}{
		{"91开", 1.1161, 0.1, 0.90},
		{"82开", 0.9138, 0.2, 0.80},
		{"73开", 0.7149, 0.3, 0.70},
		{"64开", 0.4433, 0.4, 0.60},
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
	keyLen := 32 // 假设 key 长度为 32

	tests := []struct {
		name     string
		s        float64
		filename string
	}{
		{"91开", 1.1161, "./data/db_91.txt"},
		{"82开", 0.9138, "./data/db_82.txt"},
		{"73开", 0.7149, "./data/db_73.txt"},
		{"64开", 0.4433, "./data/db_64.txt"},
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
