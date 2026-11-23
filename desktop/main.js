import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 部分环境（沙箱/受限账户）禁止写 Roaming，默认放 LocalAppData；可用环境变量覆盖（便携模式）
const userDataDir =
  process.env.IMAGE_TOOLBOX_USER_DATA ||
  path.join(process.env.LOCALAPPDATA || app.getPath('appData'), 'image-toolbox');
app.setPath('userData', userDataDir);

// 纯前端项目：hash 路由 + 相对资源路径，直接 loadFile 即可，无需内置服务
app.whenReady().then(() => {
  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    autoHideMenuBar: true,
    title: '图片工具箱',
  });
  win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
});

app.on('window-all-closed', () => app.quit());