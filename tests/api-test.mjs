#!/usr/bin/env node
/**
 * 餐厅点餐系统接口测试
 * 运行前：php backend/bin/migrate.php --fresh，然后启动后端。
 * 运行：node tests/api-test.mjs
 */

const BASE = 'http://127.0.0.1:8000/api';
const suffix = String(Date.now()).slice(-6);
const temp = {
    chefId: null,
    tableId: null,
    tableName: '',
    tableCode: '',
    categoryId: null,
    menuId: null,
    orderId: null,
    orderItemId: null,
    imageUrl: '',
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
    form.append('file', new Blob([png], { type: 'image/png' }), 'user-original-name.png');
    return form;
}

const adminLogin = await request('POST', '/auth/login', {
    body: { username: 'admin', password: '123456' },
});
const adminToken = adminLogin.data.token;
const chefLogin = await request('POST', '/auth/login', {
    body: { username: 'chef01', password: '123456' },
});
const chefToken = chefLogin.data.token;
const cashierLogin = await request('POST', '/auth/login', {
    body: { username: 'cashier01', password: '123456' },
});
const cashierToken = cashierLogin.data.token;

await test('管理员使用正确密码登录', '正常', async () => {
    assert(adminLogin.status === 200, '管理员登录应成功');
    assert(adminLogin.data.user.role === 'manager', '角色应为 manager');
    assert(adminLogin.data.user.phone === undefined, '员工账户不应返回手机号字段');
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

await test('顾客注册入口已移除', '业务边界', async () => {
    await expectStatus('POST', '/auth/register', 404, {
        body: { username: 'should_not_exist', password: '123456' },
    });
});

await test('厨师与收银员可以登录', '正常', async () => {
    assert(chefLogin.status === 200 && chefLogin.data.user.role === 'chef', '厨师登录应成功');
    assert(
        cashierLogin.status === 200 && cashierLogin.data.user.role === 'cashier',
        '收银员登录应成功'
    );
});

await test('未登录访问个人资料被拒绝', '权限', async () => {
    await expectStatus('GET', '/auth/me', 401);
});

await test('非店长角色不可访问管理接口', '权限', async () => {
    await expectStatus('GET', '/admin/stats', 403, { token: chefToken });
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
    const data = await expectStatus('POST', '/tables', 200, { token: adminToken });
    assert(/^\d+桌$/.test(data.name), `自动命名异常：${data.name}`);
    temp.tableId = data.id;
    temp.tableName = data.name;
    temp.tableCode = data.publicCode;
    return data.name;
});

await test('餐桌改名重名时被拒绝', '异常', async () => {
    await expectStatus('PATCH', `/tables/${temp.tableId}`, 409, {
        token: adminToken,
        body: { name: '1桌' },
    });
});

await test('店长新增菜品分类', '正常', async () => {
    const data = await expectStatus('POST', '/menu/categories', 200, {
        token: adminToken,
        body: { name: `测试分类${suffix}` },
    });
    temp.categoryId = data.id;
});

await test('重复分类名称被拒绝', '异常', async () => {
    await expectStatus('POST', '/menu/categories', 409, {
        token: adminToken,
        body: { name: `测试分类${suffix}` },
    });
});

await test('店长新增菜品并关联分类', '正常', async () => {
    const data = await expectStatus('POST', '/menu', 200, {
        token: adminToken,
        body: {
            name: `接口测试菜${suffix}`,
            categoryId: temp.categoryId,
            price: 6.6,
            description: '接口测试用菜品',
            imageUrl: '',
        },
    });
    assert(data.categoryId === temp.categoryId, '分类 ID 应一致');
    assert(data.price === '6.60', '价格应格式化为两位小数');
    temp.menuId = data.id;
});

await test('非法分类新增菜品被拒绝', '异常', async () => {
    await expectStatus('POST', '/menu', 422, {
        token: adminToken,
        body: {
            name: '非法分类菜',
            categoryId: 999999,
            price: 1,
            description: '',
            imageUrl: '',
        },
    });
});

await test('图片地址只允许后端生成的地址', '安全', async () => {
    await expectStatus('POST', '/menu', 422, {
        token: adminToken,
        body: {
            name: '外部图片菜',
            categoryId: temp.categoryId,
            price: 1,
            description: '',
            imageUrl: 'https://example.com/a.png',
        },
    });
});

await test('上传 PNG 并生成不保留原文件名的唯一文件名', '正常', async () => {
    const data = await expectStatus('POST', '/uploads', 200, {
        token: adminToken,
        form: pngForm(),
    });
    assert(data.url.startsWith('/api/uploads/'), '应返回上传地址');
    assert(!data.url.includes('user-original-name'), '不应保留用户原始文件名');
    assert(/^\/api\/uploads\/[a-f0-9]{32}\.png$/.test(data.url), '文件名应为随机 32 位十六进制');
    const image = await fetch(`http://127.0.0.1:8000${data.url}`);
    assert(image.status === 200, '上传图片应可访问');
    temp.imageUrl = data.url;
    return data.url;
});

await test('上传非图片文件被拒绝', '安全', async () => {
    const form = new FormData();
    form.append('file', new Blob(['not an image'], { type: 'text/plain' }), 'test.txt');
    await expectStatus('POST', '/uploads', 422, { token: adminToken, form });
});

await test('上传文件路径穿越访问被拒绝', '安全', async () => {
    await expectStatus('GET', '/uploads/..%2F..%2Fbackend%2F.env', 404);
});

await test('顾客扫码读取空餐桌订单', '正常', async () => {
    const data = await expectStatus('GET', `/orders/table/${temp.tableCode}`, 200);
    assert(data.order === null, '新餐桌应无订单');
});

await test('顾客提交订单成功', '正常', async () => {
    const data = await expectStatus('PUT', `/orders/table/${temp.tableCode}`, 200, {
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
    temp.orderItemId = data.order.items.find((item) => item.menuItemId === temp.menuId)?.id;
});

await test('空订单提交被拒绝', '异常', async () => {
    await expectStatus('PUT', `/orders/table/${temp.tableCode}`, 422, {
        body: { items: [] },
    });
});

await test('再次提交覆盖原订单', '正常', async () => {
    const data = await expectStatus('PUT', `/orders/table/${temp.tableCode}`, 200, {
        body: { items: [{ menuItemId: temp.menuId, quantity: 3 }] },
    });
    assert(data.order.id === temp.orderId, '应覆盖同一未结账订单');
    assert(data.order.totalQuantity === 3, '覆盖后份数应为 3');
    assert(data.order.items.length === 1, '覆盖后应只有一个菜品');
    temp.orderItemId = data.order.items[0].id;
});

await test('未登录标记菜品被拒绝', '权限', async () => {
    await expectStatus('PATCH', `/order-items/${temp.orderItemId}`, 401, {
        body: { done: true },
    });
});

await test('厨师标记菜品做好，订单保持未结账', '正常', async () => {
    await expectStatus('PATCH', `/order-items/${temp.orderItemId}`, 200, {
        token: chefToken,
        body: { done: true },
    });
    const order = await expectStatus('GET', `/admin/orders/${temp.orderId}`, 200, {
        token: adminToken,
    });
    assert(order.status === 'pending', '未结账订单状态应保持 pending');
    assert(order.undoneCount === 0 && order.doneCount === 3, '已做/未做数量应正确');
});

await test('厨师不能执行结账', '权限', async () => {
    await expectStatus('POST', `/orders/${temp.orderId}/pay`, 403, { token: chefToken });
});

await test('收银员结账成功，菜品全部视为已做好', '正常', async () => {
    const data = await expectStatus('POST', `/orders/${temp.orderId}/pay`, 200, {
        token: cashierToken,
    });
    assert(data.status === 'paid', '订单状态应为 paid');
    assert(data.doneCount === 0 && data.undoneCount === 0, '结账后已做/未做应为 0');
});

await test('重复结账被拒绝', '异常', async () => {
    await expectStatus('POST', `/orders/${temp.orderId}/pay`, 409, {
        token: cashierToken,
    });
});

await test('给测试菜品上传并绑定图片', '正常', async () => {
    await expectStatus('PUT', `/menu/${temp.menuId}`, 200, {
        token: adminToken,
        body: {
            name: `接口测试菜${suffix}`,
            categoryId: temp.categoryId,
            price: 6.6,
            description: '带图片的测试菜品',
            imageUrl: temp.imageUrl,
        },
    });
});

await test('分类下还有菜品时不能删除', '异常', async () => {
    await expectStatus('DELETE', `/menu/categories/${temp.categoryId}`, 409, {
        token: adminToken,
    });
});

await test('删除菜品会同步删除图片', '正常', async () => {
    await expectStatus('DELETE', `/menu/${temp.menuId}`, 200, { token: adminToken });
    const image = await fetch(`http://127.0.0.1:8000${temp.imageUrl}`);
    assert(image.status === 404, '删除菜品后图片应不可访问');
});

await test('删除无在售菜品的分类', '正常', async () => {
    await expectStatus('DELETE', `/menu/categories/${temp.categoryId}`, 200, {
        token: adminToken,
    });
    const categories = await expectStatus('GET', '/menu/categories', 200);
    assert(!categories.some((item) => item.id === temp.categoryId), '分类不应再返回');
});

await test('管理后台订单支持关键词、状态与分页', '正常', async () => {
    const keyword = encodeURIComponent(temp.tableName);
    const data = await expectStatus(
        'GET',
        `/admin/orders?keyword=${keyword}&status=paid&page=1&pageSize=5`,
        200,
        { token: adminToken }
    );
    assert(data.items.length >= 1, '应检索到订单');
    assert(data.items.every((item) => item.status === 'paid'), '状态筛选应为 paid');
    assert(data.pageSize === 5, '分页大小应为 5');
});

await test('管理后台统计返回 7 天趋势、分类数和热销菜品', '正常', async () => {
    const data = await expectStatus('GET', '/admin/stats', 200, { token: adminToken });
    assert(Array.isArray(data.week) && data.week.length === 7, '趋势应返回 7 天');
    assert(typeof data.counts.categories === 'number', '分类数应为数字');
    assert(data.counts.categories >= 1, '分类数应大于 0');
    assert(Array.isArray(data.topDishes), '应返回热销菜品');
});

await test('无效餐桌二维码返回 404', '异常', async () => {
    await expectStatus('GET', '/orders/table/invalid-code', 404);
});

// 清理测试数据（失败也尽量清理）
try {
    if (temp.tableId) {
        await request('DELETE', `/tables/${temp.tableId}`, { token: adminToken });
    }
    if (temp.menuId) {
        await request('DELETE', `/menu/${temp.menuId}`, { token: adminToken });
    }
    if (temp.categoryId) {
        await request('DELETE', `/menu/categories/${temp.categoryId}`, { token: adminToken });
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
if (failed > 0) process.exitCode = 1;
