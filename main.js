const CUSTOM_SERVICE_UUID = '0000ff00-0000-1000-8000-00805f9b34fb';
const FILE_CHARACTERISTIC_UUID = '0000ff01-0000-1000-8000-00805f9b34fb';

let device;
let fileCharacteristic;

// 连接蓝牙设备
document.getElementById('connectBtn').addEventListener('click', async () => {
    try {
        device = await navigator.bluetooth.requestDevice({
            filters: [{ services: [CUSTOM_SERVICE_UUID] }],
            optionalServices: [CUSTOM_SERVICE_UUID]
        });
        
        const server = await device.gatt.connect();
        const service = await server.getPrimaryService(CUSTOM_SERVICE_UUID);
        fileCharacteristic = await service.getCharacteristic(FILE_CHARACTERISTIC_UUID);
        
        updateStatus('已连接: ' + device.name);
    } catch (error) {
        updateStatus('连接失败: ' + error);
    }
});

// 发送文件
document.getElementById('sendBtn').addEventListener('click', async () => {
    const file = document.getElementById('fileInput').files[0];
    if (!file || !fileCharacteristic) return;

    const reader = new FileReader();
    reader.onload = async function(event) {
        const fileData = new Uint8Array(event.target.result);
        const chunkSize = 512; // BLE最大包长
        for (let i = 0; i < fileData.length; i += chunkSize) {
            const chunk = fileData.slice(i, i + chunkSize);
            await fileCharacteristic.writeValue(chunk);
            updateStatus(`发送进度: ${Math.round((i / fileData.length) * 100)}%`);
        }
        updateStatus('文件发送完成！');
    };
    reader.readAsArrayBuffer(file);
});

// 接收文件（需设备支持通知）
async function startReceiving() {
    await fileCharacteristic.startNotifications();
    fileCharacteristic.addEventListener('characteristicvaluechanged', event => {
        const data = new Uint8Array(event.target.value.buffer);
        // 处理接收到的数据块
    });
}

function updateStatus(text) {
    document.getElementById('status').innerText = text;
}