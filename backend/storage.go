package main

import (
	"bufio"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"
)

// DataStorage 数据存储服务
type DataStorage struct {
	dataDir    string
	usersFile  string
	recordsFile string
	mutex      sync.RWMutex
}

// NewDataStorage 创建新的数据存储服务
func NewDataStorage(dataDir string) *DataStorage {
	if dataDir == "" {
		dataDir = "./data"
	}
	
	// 确保数据目录存在
	if err := os.MkdirAll(dataDir, 0755); err != nil {
		fmt.Printf("创建数据目录失败: %v\n", err)
	}
	
	return &DataStorage{
		dataDir:    dataDir,
		usersFile:  filepath.Join(dataDir, "users.json"),
		recordsFile: filepath.Join(dataDir, "records.txt"),
	}
}

// SaveUsers 保存用户数据
func (ds *DataStorage) SaveUsers(users map[string]*User) error {
	ds.mutex.Lock()
	defer ds.mutex.Unlock()
	
	// 转换为可序列化的格式
	userData := make(map[string]interface{})
	for username, user := range users {
		userData[username] = map[string]interface{}{
			"id":        user.ID,
			"username":  user.Username,
			"password_hash": user.PasswordHash,
			"role":      string(user.Role),
			"created_at": user.CreatedAt.Format(time.RFC3339),
		}
	}
	
	data, err := json.MarshalIndent(userData, "", "  ")
	if err != nil {
		return fmt.Errorf("序列化用户数据失败: %v", err)
	}
	
	if err := os.WriteFile(ds.usersFile, data, 0644); err != nil {
		return fmt.Errorf("写入用户文件失败: %v", err)
	}
	
	return nil
}

// LoadUsers 加载用户数据
func (ds *DataStorage) LoadUsers() (map[string]*User, error) {
	ds.mutex.RLock()
	defer ds.mutex.RUnlock()
	
	// 检查文件是否存在
	if _, err := os.Stat(ds.usersFile); os.IsNotExist(err) {
		return make(map[string]*User), nil
	}
	
	data, err := os.ReadFile(ds.usersFile)
	if err != nil {
		return nil, fmt.Errorf("读取用户文件失败: %v", err)
	}
	
	var userData map[string]interface{}
	if err := json.Unmarshal(data, &userData); err != nil {
		return nil, fmt.Errorf("反序列化用户数据失败: %v", err)
	}
	
	users := make(map[string]*User)
	for username, userInfo := range userData {
		userMap, ok := userInfo.(map[string]interface{})
		if !ok {
			continue
		}
		
		createdAt, _ := time.Parse(time.RFC3339, userMap["created_at"].(string))
		
		user := &User{
			ID:           userMap["id"].(string),
			Username:     userMap["username"].(string),
			PasswordHash: userMap["password_hash"].(string),
			Role:         UserRole(userMap["role"].(string)),
			CreatedAt:    createdAt,
		}
		
		users[username] = user
	}
	
	return users, nil
}

// SaveRecords 保存记录数据
func (ds *DataStorage) SaveRecords(records []Record) error {
	ds.mutex.Lock()
	defer ds.mutex.Unlock()
	
	file, err := os.Create(ds.recordsFile)
	if err != nil {
		return fmt.Errorf("创建记录文件失败: %v", err)
	}
	defer file.Close()
	
	writer := bufio.NewWriter(file)
	defer writer.Flush()
	
	// 写入文件头
	writer.WriteString("# PIR数据库记录文件\n")
	writer.WriteString("# 格式: key value probability\n")
	writer.WriteString("# 生成时间: " + time.Now().Format(time.RFC3339) + "\n\n")
	
	// 写入记录
	for _, record := range records {
		line := fmt.Sprintf("%s %s %.6f\n", record.Key, record.Value, record.Probability)
		if _, err := writer.WriteString(line); err != nil {
			return fmt.Errorf("写入记录失败: %v", err)
		}
	}
	
	return nil
}

// LoadRecords 加载记录数据
func (ds *DataStorage) LoadRecords() ([]Record, error) {
	ds.mutex.RLock()
	defer ds.mutex.RUnlock()
	
	// 检查文件是否存在
	if _, err := os.Stat(ds.recordsFile); os.IsNotExist(err) {
		return []Record{}, nil
	}
	
	file, err := os.Open(ds.recordsFile)
	if err != nil {
		return nil, fmt.Errorf("打开记录文件失败: %v", err)
	}
	defer file.Close()
	
	var records []Record
	scanner := bufio.NewScanner(file)
	lineNum := 0
	
	for scanner.Scan() {
		lineNum++
		line := strings.TrimSpace(scanner.Text())
		
		// 跳过空行和注释
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
		
		records = append(records, Record{
			Key:         parts[0],
			Value:       parts[1],
			Probability: prob,
		})
	}
	
	if err := scanner.Err(); err != nil {
		return nil, fmt.Errorf("读取记录文件失败: %v", err)
	}
	
	return records, nil
}

// AddRecord 添加新记录
func (ds *DataStorage) AddRecord(record Record) error {
	records, err := ds.LoadRecords()
	if err != nil {
		return err
	}
	
	// 检查key是否已存在
	for _, existingRecord := range records {
		if existingRecord.Key == record.Key {
			return fmt.Errorf("记录已存在: %s", record.Key)
		}
	}
	
	records = append(records, record)
	return ds.SaveRecords(records)
}

// UpdateRecord 更新记录
func (ds *DataStorage) UpdateRecord(key string, newValue string, newProbability float64) error {
	records, err := ds.LoadRecords()
	if err != nil {
		return err
	}
	
	found := false
	for i, record := range records {
		if record.Key == key {
			records[i].Value = newValue
			records[i].Probability = newProbability
			found = true
			break
		}
	}
	
	if !found {
		return fmt.Errorf("记录不存在: %s", key)
	}
	
	return ds.SaveRecords(records)
}

// DeleteRecord 删除记录
func (ds *DataStorage) DeleteRecord(key string) error {
	records, err := ds.LoadRecords()
	if err != nil {
		return err
	}
	
	found := false
	for i, record := range records {
		if record.Key == key {
			records = append(records[:i], records[i+1:]...)
			found = true
			break
		}
	}
	
	if !found {
		return fmt.Errorf("记录不存在: %s", key)
	}
	
	return ds.SaveRecords(records)
}

// GetRecord 获取记录
func (ds *DataStorage) GetRecord(key string) (*Record, error) {
	records, err := ds.LoadRecords()
	if err != nil {
		return nil, err
	}
	
	for _, record := range records {
		if record.Key == key {
			return &record, nil
		}
	}
	
	return nil, fmt.Errorf("记录不存在: %s", key)
}

// GetAllRecords 获取所有记录
func (ds *DataStorage) GetAllRecords() ([]Record, error) {
	return ds.LoadRecords()
}

// GetRecordsCount 获取记录数量
func (ds *DataStorage) GetRecordsCount() (int, error) {
	records, err := ds.LoadRecords()
	if err != nil {
		return 0, err
	}
	return len(records), nil
}

// BackupData 备份数据
func (ds *DataStorage) BackupData() error {
	ds.mutex.RLock()
	defer ds.mutex.RUnlock()
	
	timestamp := time.Now().Format("20060102_150405")
	backupDir := filepath.Join(ds.dataDir, "backups")
	
	// 创建备份目录
	if err := os.MkdirAll(backupDir, 0755); err != nil {
		return fmt.Errorf("创建备份目录失败: %v", err)
	}
	
	// 备份用户文件
	if _, err := os.Stat(ds.usersFile); err == nil {
		backupUsersFile := filepath.Join(backupDir, fmt.Sprintf("users_%s.json", timestamp))
		if err := copyFile(ds.usersFile, backupUsersFile); err != nil {
			return fmt.Errorf("备份用户文件失败: %v", err)
		}
	}
	
	// 备份记录文件
	if _, err := os.Stat(ds.recordsFile); err == nil {
		backupRecordsFile := filepath.Join(backupDir, fmt.Sprintf("records_%s.txt", timestamp))
		if err := copyFile(ds.recordsFile, backupRecordsFile); err != nil {
			return fmt.Errorf("备份记录文件失败: %v", err)
		}
	}
	
	return nil
}

// copyFile 复制文件
func copyFile(src, dst string) error {
	sourceFile, err := os.Open(src)
	if err != nil {
		return err
	}
	defer sourceFile.Close()
	
	destFile, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer destFile.Close()
	
	_, err = destFile.ReadFrom(sourceFile)
	return err
}

// GetDataDir 获取数据目录
func (ds *DataStorage) GetDataDir() string {
	return ds.dataDir
}

// GetUsersFile 获取用户文件路径
func (ds *DataStorage) GetUsersFile() string {
	return ds.usersFile
}

// GetRecordsFile 获取记录文件路径
func (ds *DataStorage) GetRecordsFile() string {
	return ds.recordsFile
}
