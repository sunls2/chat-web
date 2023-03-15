## Chat Web App

这是一个简单而优雅的 AI 聊天应用，使用 [node-chatgpt-api](https://github.com/waylaidwanderer/node-chatgpt-api) 作为后端接口，前端基于 `react+antd`

### 演示图

*一图胜千言* 

![alt 示例](./doc/example.gif)

*(图太大了，降低了分辨率，有点糊...)*

### Roadmap

- [x] 流式输出（打字效果）
- [ ] 支持 BingAI

### Caddy 配置示例

```
you_site {
    root * /var/www/chat/
    encode gzip
    file_server
    reverse_proxy /conversation localhost:3001
}
```
1. 将`npm i && npm run build`后生成的所有文件(`build`文件夹下)放至`/var/www/chat/`下
2. 需要将你的 [node-chatgpt-api](https://github.com/waylaidwanderer/node-chatgpt-api) 服务配置好并启动在`3001`端口
