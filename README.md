# mqtt-sensor-web
描述：ESP8266传感器数据Web监控界面
补充:访问https://song00000000001.github.io/mqtt-sensor-web/即可查看web端
    目前用的mqtt broker:wss://test.mosquitto.org:8081/mqtt
    目前用的topic:esp8266/sensor/data/202509081515
ps:(请不要向我的topic发消息)

1.代码.7z中包含51的keil工程，以及esp01s(esp8266)的ino文件（arduino开发文件），还有web端的代码。

2.关于51，可优化的地方很多，例如我将三路传感器的读取函数和全局变量采用简单的复制加改名的方式实现，而没有新建数据结构来处理：
typedef struct {
    BYTE pin_num;       // 引脚编号（0= P2^0, 1= P2^1, 2= P2^2）
    BYTE temp_H;        // 温度高8位
    BYTE temp_L;        // 温度低8位
    BYTE humi_H;        // 湿度高8位
    BYTE humi_L;        // 湿度低8位
    BYTE checksum;      // 校验位
} DHT11_Sensor;
，这是因为我遇到了读取问题，实测难以区分读取的引脚，而如果这一点解决的话，要改数据结构还不如只是简单重复0的复制换名（AI可以完成）。
具体一点来说是sbit变量根据byte变量在swtich，if分支里写入没问题，但是根据某项条件读取对应的引脚一直出问题。例如：
sbit DHT11_1 = P2^0;
sbit DHT11_2 = P2^1;
sbit DHT11_3 = P2^2;
// 根据 pin_num 获取
BYTE get_dht11_pin(BYTE pin_num) {
    switch (pin_num) {
        case 0: return DHT11_1;
        case 1: return DHT11_2;
        case 2: return DHT11_3;
        default: return DHT11_1; // 默认返回 P2^0
    }
}
实测读取的值都是上一次赋的值，会在while那里卡住。而用示波器观察信号，单片机和模块都是正常输出的。

3.关于esp8266，这玩意的耗电很大，51和传感器(传感器总耗电1ma以内)系统消耗电流5v,11ma。而esp01s耗电会让电源总输出电流增加到95ma左右，这一点就限制了我加电池的想法，除非做成30s更新一次数据，期间进入休眠模式。但是那样感觉没啥用，因为我web端是静态网页托管的方式，没有存历史数据，如果数据更新速度太慢就显得很没用。

4.关于web端，由于代码全是ai写的。我不知道github的托管服务是不是还有多的开发空间，如果能增加一个历史数据存储的功能就挺不错。此外，我发现目前各端登录网站并保持mqtt配置后，各端都不一样，我猜是因为配置是作为cookies存在本地的，这一点似乎也可以利用起来。
