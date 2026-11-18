#!/usr/bin/env node
/**
 * 期末项目接口测试脚本
 * 运行前请确保后端已启动，并执行 `php backend/bin/migrate.php --fresh`。
 * 运行：node tests/api-test.mjs
 */

const BASE = 'http://127.0.0.1:8000/api';
const suffix = String(Date.now()).slice(-6);
const temp = {
    chefId: null,
    customerId: null,
    tableId: null,
    menuId: null,
    orderId: null,
    orderItemIds: [],
    counter: 0,
};
const results = [];

async function request(method, path, { token, body, form } = {}) {
    const headers = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    let payload;
    if (form) {
        payload = form;
    } else if (body !== undefined) {
        headers['Content-Type'] = 'application/json';
        payload = JSON.stringify(body);
    }
    const response = await fetch(`${BASE}${path}`, { method, headers, body: payload });
    const text = await response.text();
    let data;
    try {
        data = text ? JSON.parse(text) : null;
    } catch {
        data = text;
    }
    return { status: response.status, data };
}

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

async function test(name, category, fn) {
    try {
        const detail = await fn();
        results.push({ name, category, result: '通过', detail: detail ?? '' });
        console.log(`[通过] ${name}`);
    } catch (error) {
        results.push({ name, category, result: '失败', detail: error.message });
        console.log(`[失败] ${name}: ${error.message}`);
    }
}

async function expectStatus(method, path, expected, options = {}) {
    const response = await request(method, path, options);
    assert(
        response.status === expected,
        `期望 HTTP ${expected}，实际 ${response.status}：${JSON.stringify(response.data)}`
    );
    return response.data;
}

function pngForm() {
    const png = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
        'base64'
    );
    const form = new FormData();
    form.append('file', new Blob([png], { type: 'image/png' }), 'test.png');
    return form;
}

const adminLogin = await request('POST', '/auth/login', {
    body: { username: 'admin', password: '123456' },
});
const adminToken = adminLogin.data.token;
const chefLogin = await request('POST', '/auth/login', {
    body: { username: 'chef01', password: '123456' },
});
const cashierLogin = await request('POST', '/auth/login', {
    body: { username: 'cashier01', password: '123456' },
});

await test('管理员使用正确密码登录', '正常', async () => {
    assert(adminLogin.status === 200, '管理员登录应成功');
    assert(adminLogin.data.user.role === 'manager', '角色应为 manager');
    return `用户 ${adminLogin.data.user.nickname}`;
});

await test('错误密码登录被拒绝', '异常', async () => {
    await expectStatus('POST', '/auth/login', 401, {
        body: { username: 'admin', password: 'wrong-password' },
    });
});

await test('SQL 注入式用户名无法登录', '安全', async () => {
    await expectStatus('POST', '/auth/login', 401, {
        body: { username: "' OR 1=1 --", password: "x' OR '1'='1" },
    });
});

const customerUsername = `testcustomer${suffix}`;
let customerToken = '';
await test('顾客自助注册成功', '正常', async () => {
    const data = await expectStatus('POST', '/auth/register', 200, {
        body: {
            username: customerUsername,
            nickname: '接口测试顾客',
            phone: '13900002222',
            password: '123456',
        },
    });
    assert(data.user.role === 'customer', '注册角色应为 customer');
    assert(data.token, '应返回 JWT');
    temp.customerId = data.user.id;
    customerToken = data.token;
    return `顾客 #${data.user.id}`;
});

await test('重复用户名注册被拒绝', '异常', async () => {
    await expectStatus('POST', '/auth/register', 409, {
        body: {
            username: customerUsername,
            nickname: '重复用户',
            password: '123456',
        },
    });
});

await test('非法用户名格式注册被拒绝', '异常', async () => {
    await expectStatus('POST', '/auth/register', 422, {
        body: { username: 'a b', nickname: 'x', password: '123456' },
    });
});

await test('顾客使用新账号登录', '正常', async () => {
    const data = await expectStatus('POST', '/auth/login', 200, {
        body: { username: customerUsername, password: '123456' },
    });
    assert(data.user.nickname === '接口测试顾客', '昵称应一致');
    customerToken = data.token;
});

await test('未登录访问个人资料被拒绝', '权限', async () => {
    await expectStatus('GET', '/auth/me', 401);
});

await test('顾客修改个人资料', '正常', async () => {
    const data = await expectStatus('PATCH', '/profile', 200, {
        token: customerToken,
        body: { nickname: '接口测试顾客（已改）', phone: '13900003333' },
    });
    assert(data.nickname === '接口测试顾客（已改）', '昵称应更新');
    assert(data.phone === '13900003333', '手机号应更新');
});

await test('顾客越权访问账户管理接口被拒绝', '权限', async () => {
    await expectStatus('GET', '/users', 403, { token: customerToken });
});

await test('店长创建临时厨师账户', '正常', async () => {
    const data = await expectStatus('POST', '/users', 200, {
        token: adminToken,
        body: {
            role: 'chef',
            username: `testchef${suffix}`,
            nickname: '接口测试厨师',
            password: '123456',
        },
    });
    temp.chefId = data.id;
});

await test('重复用户名创建员工账户被拒绝', '异常', async () => {
    await expectStatus('POST', '/users', 409, {
        token: adminToken,
        body: {
            role: 'chef',
            username: `testchef${suffix}`,
            nickname: '重复厨师',
            password: '123456',
        },
    });
});

await test('店长新增餐桌并自动命名', '正常', async () => {
    const data = await expectStatus('POST', '/tables', 200, {
        token: adminToken,
    });
    assert(/^\d+桌$/.test(data.name), `自动命名异常：${data.name}`);
    temp.tableId = data.id;
    temp.tableName = data.name;
    return data.name;
});

await test('餐桌改名重名时被拒绝', '异常', async () => {
    await expectStatus('PATCH', `/tables/${temp.tableId}`, 409, {
        token: adminToken,
        body: { name: '1桌' },
    });
});

await test('店长新增临时菜品', '正常', async () => {
    const data = await expectStatus('POST', '/menu', 200, {
        token: adminToken,
        body: {
            name: `接口测试菜${suffix}`,
            category: '其他',
            price: 6.6,
            description: '接口测试用菜品',
            imageUrl: '',
        },
    });
    assert(data.category === '其他', '分类应为其他');
    assert(data.price === '6.60', '价格应格式化为两位小数');
    temp.menuId = data.id;
});

await test('非法菜品分类被拒绝', '异常', async () => {
    await expectStatus('POST', '/menu', 422, {
        token: adminToken,
        body: {
            name: '非法分类菜',
            category: '不存在分类',
            price: 1,
            description: '',
            imageUrl: '',
        },
    });
});

let uploadedUrl = '';
await test('上传 PNG 图片成功并可访问', '正常', async () => {
    const data = await expectStatus('POST', '/uploads', 200, {
        token: adminToken,
        form: pngForm(),
    });
    assert(data.url.startsWith('/api/uploads/'), '应返回上传地址');
    const image = await fetch(`http://127.0.0.1:8000${data.url}`);
    assert(image.status === 200, '上传图片应可访问');
    uploadedUrl = data.url;
    return data.url;
});

await test('上传非图片文件被拒绝', '安全', async () => {
    const form = new FormData();
    form.append('file', new Blob(['not an image'], { type: 'text/plain' }), 'test.txt');
    await expectStatus('POST', '/uploads', 422, { token: adminToken, form });
});

await test('顾客扫码读取空餐桌订单', '正常', async () => {
    const table = await expectStatus('GET', '/tables', 200, { token: adminToken });
    const target = table.find((item) => item.id === temp.tableId);
    const data = await expectStatus('GET', `/orders/table/${target.publicCode}`, 200);
    assert(data.order === null, '新餐桌应无订单');
});

await test('顾客提交订单成功', '正常', async () => {
    const table = await expectStatus('GET', '/tables', 200, { token: adminToken });
    const target = table.find((item) => item.id === temp.tableId);
    const data = await expectStatus('PUT', `/orders/table/${target.publicCode}`, 200, {
        token: customerToken,
        body: {
            items: [
                { menuItemId: temp.menuId, quantity: 2 },
                { menuItemId: 1, quantity: 1 },
            ],
        },
    });
    assert(data.order.status === 'pending', '新订单状态应为 pending');
    assert(data.order.totalQuantity === 3, '总份数应为 3');
    temp.orderId = data.order.id;
});

await test('空订单提交被拒绝', '异常', async () => {
    const table = await expectStatus('GET', '/tables', 200, { token: adminToken });
    const target = table.find((item) => item.id === temp.tableId);
    await expectStatus('PUT', `/orders/table/${target.publicCode}`, 422, {
        token: customerToken,
        body: { items: [] },
    });
});

await test('再次提交覆盖原订单', '正常', async () => {
    const table = await expectStatus('GET', '/tables', 200, { token: adminToken });
    const target = table.find((item) => item.id === temp.tableId);
    const data = await expectStatus('PUT', `/orders/table/${target.publicCode}`, 200, {
        token: customerToken,
        body: { items: [{ menuItemId: temp.menuId, quantity: 3 }] },
    });
    assert(data.order.id === temp.orderId, '应覆盖同一未结账订单');
    assert(data.order.totalQuantity === 3, '覆盖后份数应为 3');
    assert(data.order.items.length === 1, '覆盖后应只有一个菜品');
    temp.orderItemIds = data.order.items.map((item) => item.id);
});

await test('未登录标记菜品被拒绝', '权限', async () => {
    await expectStatus('PATCH', `/order-items/${temp.orderItemIds[0]}`, 401, {
        body: { done: true },
    });
});

await test('厨师标记全部菜品做好，订单变为已上齐', '正常', async () => {
    for (const itemId of temp.orderItemIds) {
        await expectStatus('PATCH', `/order-items/${itemId}`, 200, {
            token: chefLogin.data.token,
            body: { done: true },
        });
    }
    const order = await expectStatus('GET', `/admin/orders/${temp.orderId}`, 200, {
        token: adminToken,
    });
    assert(order.status === 'served', `订单状态应为 served，实际 ${order.status}`);
    assert(order.undoneCount === 0, '未做数量应为 0');
});

await test('厨师不能执行结账', '权限', async () => {
    await expectStatus('POST', `/orders/${temp.orderId}/pay`, 403, {
        token: chefLogin.data.token,
    });
});

await test('收银员结账成功', '正常', async () => {
    const data = await expectStatus('POST', `/orders/${temp.orderId}/pay`, 200, {
        token: cashierLogin.data.token,
    });
    assert(data.status === 'paid', '订单状态应为 paid');
    assert(data.doneCount === 0 && data.undoneCount === 0, '结账后已做/未做应为 0');
});

await test('重复结账被拒绝', '异常', async () => {
    await expectStatus('POST', `/orders/${temp.orderId}/pay`, 409, {
        token: cashierLogin.data.token,
    });
});

await test('顾客对已结账订单发表评价', '正常', async () => {
    const data = await expectStatus('POST', `/my/orders/${temp.orderId}/reviews`, 200, {
        token: customerToken,
        body: { menuItemId: temp.menuId, rating: 5, content: '接口测试评价' },
    });
    assert(data.rating === 5, '评分应为 5');
});

await test('重复评价同一菜品被拒绝', '异常', async () => {
    await expectStatus('POST', `/my/orders/${temp.orderId}/reviews`, 409, {
        token: customerToken,
        body: { menuItemId: temp.menuId, rating: 4, content: '重复评价' },
    });
});

await test('收藏与取消收藏菜品', '正常', async () => {
    const added = await expectStatus('POST', `/my/favorites/${temp.menuId}`, 200, {
        token: customerToken,
    });
    assert(added.favorited === true, '第一次应收藏成功');
    const removed = await expectStatus('POST', `/my/favorites/${temp.menuId}`, 200, {
        token: customerToken,
    });
    assert(removed.favorited === false, '第二次应取消收藏');
});

await test('我的订单包含已提交订单', '正常', async () => {
    const data = await expectStatus('GET', '/my/orders', 200, { token: customerToken });
    const order = data.find((item) => item.id === temp.orderId);
    assert(order, '我的订单中应包含测试订单');
    assert(order.items[0].review, '订单菜品应带评价信息');
});

await test('管理后台订单支持关键词、状态与分页', '正常', async () => {
    const data = await expectStatus(
        'GET',
        `/admin/orders?keyword=${encodeURIComponent(temp.tableName)}&status=paid&page=1&pageSize=5`,
        200,
        { token: adminToken }
    );
    assert(data.items.length >= 1, '应检索到订单');
    assert(data.items.every((item) => item.status === 'paid'), '状态筛选应为 paid');
    assert(data.pageSize === 5, '分页大小应为 5');
});

await test('管理后台统计返回 7 天趋势与热销菜品', '正常', async () => {
    const data = await expectStatus('GET', '/admin/stats', 200, { token: adminToken });
    assert(data.week.length === 7, '趋势应返回 7 天');
    assert(Array.isArray(data.topDishes), '应返回热销菜品');
    assert(Number(data.today.revenue) >= 0, '今日营业额应为非负数');
});

await test('顾客不能访问管理后台统计', '权限', async () => {
    await expectStatus('GET', '/admin/stats', 403, { token: customerToken });
});

await test('非法餐桌二维码返回 404', '异常', async () => {
    await expectStatus('GET', '/orders/table/invalid-code', 404);
});

// 清理测试数据
try {
    if (temp.tableId) {
        await request('DELETE', `/tables/${temp.tableId}`, { token: adminToken });
    }
    if (temp.menuId) {
        await request('DELETE', `/menu/${temp.menuId}`, { token: adminToken });
    }
    if (temp.customerId) {
        await request('DELETE', `/users/${temp.customerId}`, { token: adminToken });
    }
    if (temp.chefId) {
        await request('DELETE', `/users/${temp.chefId}`, { token: adminToken });
    }
} catch (error) {
    console.error('清理测试数据失败:', error.message);
}

const passed = results.filter((item) => item.result === '通过').length;
const failed = results.length - passed;
console.log('');
console.log(`测试完成：${results.length} 条，通过 ${passed} 条，失败 ${failed} 条`);
if (uploadedUrl) console.log(`上传测试文件：${uploadedUrl}`);
if (failed > 0) process.exitCode = 1;
