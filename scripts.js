// script.js - GitHub Pages MQTT客户端

// 与ESP8266相同的MQTT服务器配置
const MQTT_SERVERS = [
    "wss://test.mosquitto.org:8080/mqtt",
    "wss://broker.hivemq.com:8000/mqtt",
    "wss://broker.emqx.io:8083/mqtt"
];

// 与ESP8266相同的主题和客户端ID
const TOPIC = "esp8266/sensor/data/202509062242";
const CLIENT_ID = "WebClient_" + Math.random().toString(16).substr(2, 8);

// 全局变量
let currentBrokerIndex = 0;
let client = null;
let isConnected = false;
let retryCount = 0;
const MAX_RETRIES = 3;
let lastDataTime = 0;
const DATA_TIMEOUT = 10000; // 10秒数据超时

// 初始化函数
function init() {
    setupEventListeners();
    connectToBroker();
    startConnectionMonitor();
}

// 设置事件监听器
function setupEventListeners() {
    // 手动刷新按钮
    document.getElementById('refreshBtn').addEventListener('click', () => {
        location.reload();
    });
}

// 连接MQTT代理
function connectToBroker() {
    if (retryCount >= MAX_RETRIES) {
        updateStatus(`连接失败: 已尝试所有服务器 ${MAX_RETRIES}次`, true);
        retryCount = 0;
        setTimeout(connectToBroker, 10000); // 10秒后重试
        return;
    }

    if (currentBrokerIndex >= MQTT_SERVERS.length) {
        currentBrokerIndex = 0;
        retryCount++;
    }

    const brokerUrl = MQTT_SERVERS[currentBrokerIndex];
    updateStatus(`正在连接 ${brokerUrl.split('/')[2]}...`);
    updateBrokerDisplay(brokerUrl);

    // 断开现有连接
    if (client) {
        client.end();
    }

    // 创建新连接
    client = mqtt.connect(brokerUrl, {
        clientId: CLIENT_ID,
        clean: true,
        reconnectPeriod: 0 // 禁用自动重连
    });

    // 连接成功回调
    client.on('connect', () => {
        retryCount = 0;
        isConnected = true;
        updateStatus("已连接");
        client.subscribe(TOPIC, (err) => {
            if (err) {
                console.error('订阅失败:', err);
                updateStatus("订阅失败", true);
            } else {
                console.log(`成功订阅主题: ${TOPIC}`);
            }
        });
    });

    // 连接错误回调
    client.on('error', (err) => {
        console.error("连接错误:", err);
        isConnected = false;
        updateStatus(`连接失败: ${err.message}`, true);
        currentBrokerIndex++;
        setTimeout(connectToBroker, 2000);
    });

    // 断开连接回调
    client.on('close', () => {
        if (isConnected) {
            isConnected = false;
            updateStatus("连接已断开");
            setTimeout(connectToBroker, 1000);
        }
    });

    // 消息接收回调
    client.on('message', (topic, message) => {
        if (topic === TOPIC) {
            try {
                const data = JSON.parse(message.toString());
                updateSensorData(data);
                lastDataTime = Date.now();
                
                // 检查是否与ESP8266使用相同代理
                checkCurrentBroker();
            } catch (e) {
                console.error('解析消息失败:', e);
            }
        }
    });
}

// 更新传感器数据显示
function updateSensorData(data) {
    // 检查数据完整性
    if (!data || typeof data !== 'object') return;
    
    // 更新温度显示
    if (typeof data.t === 'number') {
        document.getElementById('temperature').textContent = `${data.t.toFixed(1)} °C`;
    }
    
    // 更新湿度显示
    if (typeof data.h === 'number') {
        document.getElementById('humidity').textContent = `${data.h.toFixed(1)} %`;
    }
    
    // 更新光照显示
    if (typeof data.i === 'number') {
        document.getElementById('illuminance').textContent = `${data.i.toFixed(1)} lx`;
    }
    
    // 更新时间显示
    const now = new Date();
    document.getElementById('updateTime').textContent = 
        `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
}

// 更新连接状态显示
function updateStatus(text, isError = false) {
    const elem = document.getElementById('statusText');
    elem.textContent = text;
    elem.style.color = isError ? 'red' : 'green';
}

// 更新当前代理显示
function updateBrokerDisplay(url) {
    const brokerName = url.split('/')[2];
    document.getElementById('currentBroker').textContent = `(服务器: ${brokerName})`;
}

// 检查数据超时
function checkDataTimeout() {
    if (lastDataTime > 0 && (Date.now() - lastDataTime) > DATA_TIMEOUT) {
        document.getElementById('temperature').textContent = '-- °C';
        document.getElementById('humidity').textContent = '-- %';
        document.getElementById('illuminance').textContent = '-- lx';
        document.getElementById('updateTime').textContent = '--';
        updateStatus("数据接收超时", true);
        lastDataTime = 0;
    }
}

// 检查当前代理是否与ESP8266一致
function checkCurrentBroker() {
    // 这里可以添加逻辑来验证是否与ESP8266使用相同的代理
    // 例如，ESP8266可以发布当前使用的代理信息
}

// 启动连接监控
function startConnectionMonitor() {
    setInterval(() => {
        if (!isConnected) {
            connectToBroker();
        }
        checkDataTimeout();
    }, 5000);
}

function testBrokers() {
    MQTT_SERVERS.forEach(url => {
        const client = mqtt.connect(url, {
            connectTimeout: 3000,
            clientId: 'test_client_' + Math.random().toString(16).substr(2, 8)
        });
        
        client.on('connect', () => {
            console.log(`成功连接到 ${url}`);
            client.end();
        });
        
        client.on('error', (err) => {
            console.error(`连接 ${url} 失败:`, err);
        });
    });
}

// 页面加载完成后初始化
window.addEventListener('load', init);
