package main

import (
	"flag"
	"fmt"
	"log"

	"github.com/gin-gonic/gin"
)

// Config 命令行参数
type Config struct {
	FilePath  string
	NumRows   int
	KeyLen    int
	Mode      string
	Val       float64
	ProLimit  float64
	RateOfPop float64
	PWorse    float64
	QueryKey  string
	QueryPop  int
	UseNTT    int
}

func main() {
	// 命令行参数
	var (
		port    = flag.String("port", "8080", "服务器端口")
		dataDir = flag.String("data", "./data", "数据存储目录")
		dbFile  = flag.String("db", "", "数据库文件路径（可选，不指定则生成随机数据库）")
		mode    = flag.String("mode", "debug", "运行模式: debug, release")
		numRows = flag.Int("n", 1000, "初始化时生成的记录数")
		keyLen  = flag.Int("l", 10, "初始化时生成的键值长度")
	)
	flag.Parse()

	// 设置Gin模式
	if *mode == "release" {
		gin.SetMode(gin.ReleaseMode)
	}

	// 创建服务实例
	authService := NewAuthService()
	pirService := NewPIRService()
	dataStorage := NewDataStorage(*dataDir, *dbFile)

	// 加载用户数据
	if users, err := dataStorage.LoadUsers(); err == nil {
		// 这里可以更新authService中的用户数据
		fmt.Printf("加载了 %d 个用户\n", len(users))
	}

	// 创建API处理器
	apiHandler := NewAPIHandler(authService, pirService, dataStorage)

	// 初始化PIR系统
	shouldInitDB := true

	if shouldInitDB {
		fmt.Println("正在初始化PIR系统...")

		// 检查是否有数据库文件
		if *dbFile != "" {
			// 使用指定的数据库文件
			fmt.Printf("使用数据库文件: %s\n", *dbFile)
			config := Config{
				FilePath:  *dbFile,
				Mode:      "rate",
				Val:       0.1,
				RateOfPop: 0.1,
				PWorse:    0.1,
				UseNTT:    1,
			}

			if err := pirService.InitializePIRSystem(config); err != nil {
				log.Fatalf("PIR系统初始化失败: %v", err)
			}
		} else {
			// 生成随机数据库
			fmt.Printf("未指定数据库文件，生成随机数据库（记录数: %d，键长度: %d）\n", *numRows, *keyLen)
			config := Config{
				NumRows:   *numRows,
				KeyLen:    *keyLen,
				Mode:      "rate",
				Val:       0.1,
				RateOfPop: 0.1,
				PWorse:    0.1,
				UseNTT:    1,
			}

			if err := pirService.InitializePIRSystem(config); err != nil {
				log.Fatalf("PIR系统初始化失败: %v", err)
			}
		}
		fmt.Println("PIR系统初始化完成")
	}

	// 创建Gin路由器
	router := gin.Default()

	// 添加CORS中间件
	router.Use(func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Accept, Authorization")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	})

	// 健康检查
	router.GET("/health", apiHandler.Health)

	// 认证相关路由
	auth := router.Group("/auth")
	{
		auth.POST("/login", apiHandler.Login)
		auth.POST("/register", apiHandler.Register)
	}

	// 系统相关路由
	system := router.Group("/system")
	{
		system.POST("/init-pir", apiHandler.InitializePIR)
		system.GET("/config", apiHandler.GetPIRConfig)
		system.GET("/stats", apiHandler.GetStats)
		system.POST("/upload-db", apiHandler.UploadDb)
	}

	// 管理员路由
	admin := router.Group("/admin")
	admin.Use(apiHandler.AuthMiddleware(), apiHandler.AdminMiddleware())
	{
		// 记录管理
		admin.POST("/records", apiHandler.AddRecord)
		admin.PUT("/records/:key", apiHandler.UpdateRecord)
		admin.DELETE("/records/:key", apiHandler.DeleteRecord)
		admin.GET("/records", apiHandler.GetAllRecords)
		admin.GET("/records/:key", apiHandler.GetRecord)

		// 用户管理
		admin.GET("/users", apiHandler.GetAllUsers)
		admin.DELETE("/users/:username", apiHandler.DeleteUser)

		// 系统管理
		admin.POST("/backup", apiHandler.BackupData)
		admin.POST("/config/p-worse", apiHandler.SetPWorse)
		admin.GET("/config/p-worse", apiHandler.GetPWorse)
	}

	// 用户路由
	user := router.Group("/user")
	user.Use(apiHandler.AuthMiddleware(), apiHandler.UserMiddleware())
	{
		user.POST("/query", apiHandler.Query)
		user.GET("/stats", apiHandler.GetStats)
	}

	// 启动服务器
	addr := ":" + *port
	fmt.Printf("PIR后端服务启动在端口 %s\n", *port)
	fmt.Printf("数据目录: %s\n", *dataDir)
	fmt.Printf("运行模式: %s\n", *mode)

	if shouldInitDB {
		if *dbFile != "" {
			fmt.Printf("已初始化PIR数据库，使用文件: %s\n", *dbFile)
		} else {
			fmt.Printf("已初始化PIR数据库，生成随机数据，记录数: %d，键长度: %d\n", *numRows, *keyLen)
		}
	}

	fmt.Println("\nAPI端点:")
	fmt.Println("  健康检查: GET /health")
	fmt.Println("  用户登录: POST /auth/login")
	fmt.Println("  用户注册: POST /auth/register")
	fmt.Println("  初始化PIR: POST /system/init-pir")
	fmt.Println("  获取统计: GET /system/stats")
	fmt.Println("  管理员添加记录: POST /admin/records")
	fmt.Println("  管理员更新记录: PUT /admin/records/:key")
	fmt.Println("  管理员删除记录: DELETE /admin/records/:key")
	fmt.Println("  管理员获取所有记录: GET /admin/records")
	fmt.Println("  管理员获取用户列表: GET /admin/users")
	fmt.Println("  管理员备份数据: POST /admin/backup")
	fmt.Println("  管理员设置p_worse: POST /admin/config/p-worse")
	fmt.Println("  管理员获取p_worse: GET /admin/config/p-worse")
	fmt.Println("  用户查询: POST /user/query")
	fmt.Println("  用户获取统计: GET /user/stats")

	fmt.Println("\n默认管理员账户:")
	fmt.Println("  用户名: admin")
	fmt.Println("  密码: admin123")

	if err := router.Run(addr); err != nil {
		log.Fatalf("服务器启动失败: %v", err)
	}
}
