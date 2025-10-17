package main

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

// UserRole 用户角色
type UserRole string

const (
	RoleAdmin UserRole = "admin"
	RoleUser  UserRole = "user"
)

// User 用户结构
type User struct {
	ID           string    `json:"id"`
	Username     string    `json:"username"`
	PasswordHash string    `json:"-"` // 不返回给客户端
	Role         UserRole  `json:"role"`
	CreatedAt    time.Time `json:"created_at"`
}

// AuthService 认证服务
type AuthService struct {
	users    map[string]*User
	jwtSecret []byte
}

// NewAuthService 创建新的认证服务
func NewAuthService() *AuthService {
	// 生成JWT密钥
	secret := make([]byte, 32)
	rand.Read(secret)
	
	authService := &AuthService{
		users:     make(map[string]*User),
		jwtSecret: secret,
	}
	
	// 创建默认管理员账户
	authService.createDefaultAdmin()
	
	return authService
}

// createDefaultAdmin 创建默认管理员账户
func (as *AuthService) createDefaultAdmin() {
	adminID := as.generateUserID()
	passwordHash, _ := bcrypt.GenerateFromPassword([]byte("admin123"), bcrypt.DefaultCost)
	
	admin := &User{
		ID:           adminID,
		Username:     "admin",
		PasswordHash: string(passwordHash),
		Role:         RoleAdmin,
		CreatedAt:    time.Now(),
	}
	
	as.users[admin.Username] = admin
	fmt.Println("默认管理员账户已创建:")
	fmt.Println("用户名: admin")
	fmt.Println("密码: admin123")
}

// generateUserID 生成用户ID
func (as *AuthService) generateUserID() string {
	bytes := make([]byte, 16)
	rand.Read(bytes)
	return hex.EncodeToString(bytes)
}

// Register 注册新用户
func (as *AuthService) Register(username, password string, role UserRole) (*User, error) {
	// 检查用户名是否已存在
	if _, exists := as.users[username]; exists {
		return nil, fmt.Errorf("用户名已存在")
	}
	
	// 验证角色
	if role != RoleAdmin && role != RoleUser {
		return nil, fmt.Errorf("无效的用户角色")
	}
	
	// 加密密码
	passwordHash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, fmt.Errorf("密码加密失败: %v", err)
	}
	
	// 创建用户
	user := &User{
		ID:           as.generateUserID(),
		Username:     username,
		PasswordHash: string(passwordHash),
		Role:         role,
		CreatedAt:    time.Now(),
	}
	
	as.users[username] = user
	return user, nil
}

// Login 用户登录
func (as *AuthService) Login(username, password string) (string, *User, error) {
	user, exists := as.users[username]
	if !exists {
		return "", nil, fmt.Errorf("用户名或密码错误")
	}
	
	// 验证密码
	err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password))
	if err != nil {
		return "", nil, fmt.Errorf("用户名或密码错误")
	}
	
	// 生成JWT token
	token, err := as.generateToken(user)
	if err != nil {
		return "", nil, fmt.Errorf("生成token失败: %v", err)
	}
	
	return token, user, nil
}

// generateToken 生成JWT token
func (as *AuthService) generateToken(user *User) (string, error) {
	claims := jwt.MapClaims{
		"user_id":  user.ID,
		"username": user.Username,
		"role":     string(user.Role),
		"exp":      time.Now().Add(time.Hour * 24).Unix(), // 24小时过期
	}
	
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(as.jwtSecret)
}

// ValidateToken 验证JWT token
func (as *AuthService) ValidateToken(tokenString string) (*User, error) {
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("意外的签名方法: %v", token.Header["alg"])
		}
		return as.jwtSecret, nil
	})
	
	if err != nil {
		return nil, fmt.Errorf("token解析失败: %v", err)
	}
	
	if !token.Valid {
		return nil, fmt.Errorf("无效的token")
	}
	
	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return nil, fmt.Errorf("无法解析token声明")
	}
	
	username, ok := claims["username"].(string)
	if !ok {
		return nil, fmt.Errorf("token中缺少用户名")
	}
	
	user, exists := as.users[username]
	if !exists {
		return nil, fmt.Errorf("用户不存在")
	}
	
	return user, nil
}

// GetUserByUsername 根据用户名获取用户
func (as *AuthService) GetUserByUsername(username string) (*User, error) {
	user, exists := as.users[username]
	if !exists {
		return nil, fmt.Errorf("用户不存在")
	}
	return user, nil
}

// GetAllUsers 获取所有用户（仅管理员）
func (as *AuthService) GetAllUsers() []*User {
	users := make([]*User, 0, len(as.users))
	for _, user := range as.users {
		users = append(users, user)
	}
	return users
}

// DeleteUser 删除用户（仅管理员）
func (as *AuthService) DeleteUser(username string) error {
	if _, exists := as.users[username]; !exists {
		return fmt.Errorf("用户不存在")
	}
	
	// 不能删除默认管理员
	if username == "admin" {
		return fmt.Errorf("不能删除默认管理员账户")
	}
	
	delete(as.users, username)
	return nil
}

// ChangePassword 修改密码
func (as *AuthService) ChangePassword(username, oldPassword, newPassword string) error {
	user, exists := as.users[username]
	if !exists {
		return fmt.Errorf("用户不存在")
	}
	
	// 验证旧密码
	err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(oldPassword))
	if err != nil {
		return fmt.Errorf("旧密码错误")
	}
	
	// 加密新密码
	newPasswordHash, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return fmt.Errorf("密码加密失败: %v", err)
	}
	
	// 更新密码
	user.PasswordHash = string(newPasswordHash)
	return nil
}

// IsAdmin 检查用户是否为管理员
func (as *AuthService) IsAdmin(user *User) bool {
	return user.Role == RoleAdmin
}

// IsUser 检查用户是否为普通用户
func (as *AuthService) IsUser(user *User) bool {
	return user.Role == RoleUser
}
