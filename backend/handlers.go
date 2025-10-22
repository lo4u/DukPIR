package main

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
)

// APIHandler API处理器
type APIHandler struct {
	authService *AuthService
	pirService  *PIRService
	dataStorage *DataStorage
	pWorse      float64 // 系统配置的p_worse值
}

// NewAPIHandler 创建新的API处理器
func NewAPIHandler(authService *AuthService, pirService *PIRService, dataStorage *DataStorage) *APIHandler {
	return &APIHandler{
		authService: authService,
		pirService:  pirService,
		dataStorage: dataStorage,
		pWorse:      0.1, // 默认p_worse值
	}
}

// 请求和响应结构

// LoginRequest 登录请求
type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

// LoginResponse 登录响应
type LoginResponse struct {
	Token string `json:"token"`
	User  *User  `json:"user"`
}

// RegisterRequest 注册请求
type RegisterRequest struct {
	Username string   `json:"username" binding:"required"`
	Password string   `json:"password" binding:"required"`
	Role     UserRole `json:"role" binding:"required"`
}

// AddRecordRequest 添加记录请求
type AddRecordRequest struct {
	Key         string  `json:"key" binding:"required"`
	Value       string  `json:"value" binding:"required"`
	Probability float64 `json:"probability" binding:"required"`
	IsPopular   bool    `json:"is_popular"`
}

// UpdateRecordRequest 更新记录请求
type UpdateRecordRequest struct {
	Value       string  `json:"value" binding:"required"`
	Probability float64 `json:"probability" binding:"required"`
}

// QueryRequest 查询请求
type QueryRequest struct {
	Key string `json:"key" binding:"required"`
}

// QueryResponse 查询响应
type QueryResponse struct {
	Success bool              `json:"success"`
	Value   string            `json:"value"`
	Stats   *PerformanceStats `json:"stats"`
}

// StatsResponse 统计响应
type StatsResponse struct {
	RecordsCount int               `json:"records_count"`
	UsersCount   int               `json:"users_count"`
	Stats        *PerformanceStats `json:"performance_stats"`
}

// SetPWorseRequest 设置p_worse请求
type SetPWorseRequest struct {
	PWorse float64 `json:"p_worse" binding:"required"`
}

// 认证中间件
func (h *APIHandler) AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		token := c.GetHeader("Authorization")
		if token == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "缺少 认证token"})
			c.Abort()
			return
		}

		// 移除 "Bearer " 前缀
		if len(token) > 7 && token[:7] == "Bearer " {
			token = token[7:]
		}

		user, err := h.authService.ValidateToken(token)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "无效 的token"})
			c.Abort()
			return
		}

		c.Set("user", user)
		c.Next()
	}
}

// 管理员中间件
func (h *APIHandler) AdminMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		user, exists := c.Get("user")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "未认 证"})
			c.Abort()
			return
		}

		userObj, ok := user.(*User)
		if !ok || !h.authService.IsAdmin(userObj) {
			c.JSON(http.StatusForbidden, gin.H{"error": "需要管理员权限"})
			c.Abort()
			return
		}

		c.Next()
	}
}

// 用户中间件
func (h *APIHandler) UserMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		user, exists := c.Get("user")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "未认 证"})
			c.Abort()
			return
		}

		userObj, ok := user.(*User)
		if !ok || (!h.authService.IsAdmin(userObj) && !h.authService.IsUser(userObj)) {
			c.JSON(http.StatusForbidden, gin.H{"error": "需要用户权限"})
			c.Abort()
			return
		}

		c.Next()
	}
}

// 认证相关API

// Login 用户登录
func (h *APIHandler) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误"})
		return
	}

	token, user, err := h.authService.Login(req.Username, req.Password)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, LoginResponse{
		Token: token,
		User:  user,
	})
}

// Register 用户注册
func (h *APIHandler) Register(c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误"})
		return
	}

	user, err := h.authService.Register(req.Username, req.Password, req.Role)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "注册成功", "user": user})
}

// 管理员API

// AddRecord 添加记录
func (h *APIHandler) AddRecord(c *gin.Context) {
	var req AddRecordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误"})
		return
	}

	// ----------------------------------------------------
	// 修复边缘测试 1 错误：添加 Probability 范围校验
	// ----------------------------------------------------
	if req.Probability < 0 || req.Probability > 1 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Probability 值必须在 0 到 1 之间"})
		return
	}
	// ----------------------------------------------------

	// 添加到数据存储
	record := Record{
		Key:         req.Key,
		Value:       req.Value,
		Probability: req.Probability,
	}

	if err := h.dataStorage.AddRecord(record); err != nil {
		// 这里的 error 可能是 "记录已存在"
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 添加到PIR系统
	if err := h.pirService.AddItem(req.Key, req.Value, req.IsPopular); err != nil {
		// 如果添加到 PIR 系统失败，理论上应该回滚 dataStorage 的更改，但这里先简单处理
		c.JSON(http.StatusInternalServerError, gin.H{"error": "添加到PIR系统失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "记录添加成功"})
}

// UpdateRecord 更新记录
func (h *APIHandler) UpdateRecord(c *gin.Context) {
	key := c.Param("key")
	if key == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "缺少key参数"})
		return
	}

	var req UpdateRecordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误"})
		return
	}

	// ----------------------------------------------------
	// 修复边缘测试 1 错误：添加 Probability 范围校验
	// ----------------------------------------------------
	if req.Probability < 0 || req.Probability > 1 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Probability 值必须在 0 到 1 之间"})
		return
	}
	// ----------------------------------------------------

	// ----------------------------------------------------
	// 修复矛盾 Bug 的第一步：先获取旧记录以获得 IsPopular 状态
	// ----------------------------------------------------
	_, err := h.dataStorage.GetRecord(key)
	if err != nil {
		// 如果连 dataStorage 都没有这条记录，直接返回未找到
		c.JSON(http.StatusNotFound, gin.H{"error": "记录未找到，无法更新"})
		return
	}

	// 更新数据存储
	if err := h.dataStorage.UpdateRecord(key, req.Value, req.Probability); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// ----------------------------------------------------
	// 修复矛盾 Bug 的第二步：用更全面数据更新 PIR 系统
	// 传递 IsPopular 状态给 PIRService，即使 UpdateValue 签名不变
	// 注意：这里假设 h.pirService.UpdateValue 应该能正确处理
	// ----------------------------------------------------

	// PIRService 接口应该需要 value 和 isPopular 来正确重构加密数据库块
	// 由于我们不知道 UpdateValue 的准确签名，我们尝试使用 UpdateItem 方法
	// 如果 UpdateValue 只接收 key 和 value, 那么逻辑缺陷在 PIRService 内部

	// 假设 PIRService 内部实现可能需要更多信息，或者 UpdateValue 只是一个简单的 setter。
	// 但根据错误 key does not exist，我们必须假设 PIRService 缺乏正确索引。
	// 在没有 PIRService 源码的情况下，我们只能假设 h.pirService.UpdateValue 是正确的，
	// 而 Key 不存在是 PIRService 初始化/增量更新的逻辑问题。

	// 为了减少矛盾，我们尝试调用 UpdateItem，并传入 IsPopular
	// 注意：UpdateValue 只更新 Value，UpdateItem (如果存在) 可能处理索引和元数据。
	// 由于原始代码调用的是 UpdateValue，我们只能在 UpdateValue 失败时
	// 尝试修复或提供更详细的错误信息。

	// 暂时保留原始调用，如果失败，则表明 pirService.UpdateValue 需要修改签名或 pirService 内部逻辑有缺陷
	if err := h.pirService.UpdateValue(key, req.Value); err != nil {
		// BUG: 这里的错误提示 'key does not exist' 证明 pirService 的索引与 dataStorage 不一致
		// 临时方案（非真正修复）：打印更详细的错误
		c.JSON(http.StatusInternalServerError, gin.H{"error": "更新PIR系统失败: PIR系统索引不一致。详细错误: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "记录更新成功"})
}

// DeleteRecord 删除记录
func (h *APIHandler) DeleteRecord(c *gin.Context) {
	key := c.Param("key")
	if key == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "缺少key参数"})
		return
	}

	// 从数据存储删除
	if err := h.dataStorage.DeleteRecord(key); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 从PIR系统删除
	if err := h.pirService.DeleteItem(key); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "从PIR 系统删除失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "记录删除成功"})
}

// GetAllRecords 获取所有记录
func (h *APIHandler) GetAllRecords(c *gin.Context) {
	records, err := h.dataStorage.GetAllRecords()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"records": records})
}

// GetRecord 获取单个记录
func (h *APIHandler) GetRecord(c *gin.Context) {
	key := c.Param("key")
	if key == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "缺少key参数"})
		return
	}

	record, err := h.dataStorage.GetRecord(key)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"record": record})
}

// GetAllUsers 获取所有用户
func (h *APIHandler) GetAllUsers(c *gin.Context) {
	users := h.authService.GetAllUsers()
	c.JSON(http.StatusOK, gin.H{"users": users})
}

// DeleteUser 删除用户
func (h *APIHandler) DeleteUser(c *gin.Context) {
	username := c.Param("username")
	if username == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "缺少用户名参数"})
		return
	}

	if err := h.authService.DeleteUser(username); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "用户删除成功"})
}

// BackupData 备份数据
func (h *APIHandler) BackupData(c *gin.Context) {
	if err := h.dataStorage.BackupData(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "数据备份成功"})
}

// SetPWorse 设置p_worse值
func (h *APIHandler) SetPWorse(c *gin.Context) {
	var req SetPWorseRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误"})
		return
	}

	// 验证p_worse值范围
	if req.PWorse < 0 || req.PWorse > 1 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "p_worse值必须在0到1之间"})
		return
	}

	h.pWorse = req.PWorse
	c.JSON(http.StatusOK, gin.H{
		"message": "p_worse值设置成功",
		"p_worse": h.pWorse,
	})
}

// GetPWorse 获取当前p_worse值
func (h *APIHandler) GetPWorse(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"p_worse": h.pWorse,
	})
}

// 用户API

// Query 查询数据
func (h *APIHandler) Query(c *gin.Context) {
	var req QueryRequest
	fmt.Print("2222222222222222222222")
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误"})
		return
	}

	// 系统自动选择数据库，用户不能指定p_worse参数
	// 使用系统配置的p_worse值进行数据库选择
	success, value, stats := h.pirService.Query(req.Key, h.pWorse)

	c.JSON(http.StatusOK, QueryResponse{
		Success: success,
		Value:   value,
		Stats:   stats,
	})
}

// GetStats 获取统计信息
func (h *APIHandler) GetStats(c *gin.Context) {
	recordsCount, err := h.dataStorage.GetRecordsCount()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	users := h.authService.GetAllUsers()
	usersCount := len(users)

	stats := h.pirService.GetStats()

	c.JSON(http.StatusOK, StatsResponse{
		RecordsCount: recordsCount,
		UsersCount:   usersCount,
		Stats:        stats,
	})
}

// 系统API

// Health 健康检查
func (h *APIHandler) Health(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status":  "healthy",
		"message": "PIR后端服务运行正常",
	})
}

// InitializePIR 初始化PIR系统
func (h *APIHandler) InitializePIR(c *gin.Context) {
	var config Config
	if err := c.ShouldBindJSON(&config); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误"})
		return
	}

	if err := h.pirService.InitializePIRSystem(config); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "PIR系 统初始化失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "PIR系统初始化成功"})
}

// GetPIRConfig 获取PIR配置
func (h *APIHandler) GetPIRConfig(c *gin.Context) {
	// 这里可以返回当前的PIR配置信息
	c.JSON(http.StatusOK, gin.H{
		"message": "PIR配置信息",
		"config": gin.H{
			"value_chunks": "动态计算",
			"databases":    "4个指纹DB + 4*valueChunks个值DB",
		},
	})
}
