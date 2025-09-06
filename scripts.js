// 与ESP8266相同的MQTT服务器列表
const mqttServers = [
    "test.mosquitto.org",
    "broker.hivemq.com",
    "broker.emqx.io"
];

// 与ESP8266相同的主题和客户端ID
const topic = "esp8266/sensor/data/202509062242";
const clientId = "WebClient_" + Math.random().toString(16).substr(2, 8);

let client = null;
let currentBrokerIndex = 0;
let isConnected = false;

// 尝试连接下一个服务器
function connectToNextBroker() {
    if (currentBrokerIndex >= mqttServers.length) {
        currentBrokerIndex = 0; // 循环尝试
        setTimeout(connectToNextBroker, 5000); // 5秒后重试
        return;
    }
    
    const broker = mqttServers[currentBrokerIndex];
    const url = `wss://${broker}:8081`; // 使用WebSocket端口
    
    updateStatus(`正在连接 ${broker}...`);
    
    // 断开现有连接（如果有）
    if (client) {
        client.end();
    }
    
    // 创建新连接
    client = mqtt.connect(url, {
        clientId: clientId,
        clean: true,
        reconnectPeriod: 0 // 禁用自动重连，我们自己处理
    });
    
    // 连接成功
    client.on('connect', () => {
        isConnected = true;
        updateStatus(`已连接 ${broker}`);
        currentBrokerIndex = 0; // 重置索引，下次从第一个开始
        
        // 订阅主题
        client.subscribe(topic, (err) => {
            if (!err) {
                console.log(`成功订阅主题: ${topic}`);
            } else {
                console.error('订阅失败:', err);
            }
        });
    });
    
    // 连接失败
    client.on('error', (err) => {
        console.error(`连接 ${broker} 失败:`, err);
        isConnected = false;
        updateStatus(`连接 ${broker} 失败`);
        currentBrokerIndex++;
        setTimeout(connectToNextBroker, 1000); // 1秒后尝试下一个
    });
    
    // 断开连接
    client.on('close', () => {
        if (isConnected) {
            isConnected = false;
            updateStatus('连接已断开');
            setTimeout(connectToNextBroker, 1000); // 1秒后重试
        }
    });
    
    // 接收消息
    client.on('message', (receivedTopic, message) => {
        if (receivedTopic === topic) {
            try {
                const data = JSON.parse(message.toString());
                updateSensorData(data);
            } catch (e) {
                console.error('解析消息失败:', e);
            }
        }
    });
}

// 更新传感器数据显示
function updateSensorData(data) {
    document.getElementById('temperature').textContent = `${data.t.toFixed(1)} °C`;
    document.getElementById('humidity').textContent = `${data.h.toFixed(1)} %`;
    document.getElementById('illuminance').textContent = `${data.i.toFixed(1)} lx`;
    
    const now = new Date();
    document.getElementById('updateTime').textContent = 
        `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`;
}

// 更新连接状态显示
function updateStatus(status) {
    document.getElementById('connectionStatus').textContent = status;
}

// 页面加载完成后开始连接
window.addEventListener('load', () => {
    connectToNextBroker();
    
    // 每分钟检查一次连接状态
    setInterval(() => {
        if (!isConnected) {
            connectToNextBroker();
        }
    }, 60000);
});