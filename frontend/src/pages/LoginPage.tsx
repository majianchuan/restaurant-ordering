import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { App as AntdApp, Button, Card, Form, Input, Typography } from 'antd';
import { CoffeeOutlined, LockOutlined, UserOutlined } from '@ant-design/icons';
import { useAuth } from '../auth/AuthContext';
import { ROLE_HOME } from '../constants';
import { getErrorMessage } from '../api/client';

interface LoginFormValues {
    username: string;
    password: string;
}

export function LoginPage() {
    const { user, login } = useAuth();
    const navigate = useNavigate();
    const { message } = AntdApp.useApp();
    const [submitting, setSubmitting] = useState(false);

    if (user) {
        return <Navigate to={ROLE_HOME[user.role]} replace />;
    }

    const handleFinish = async (values: LoginFormValues) => {
        setSubmitting(true);
        try {
            const current = await login(values.username.trim(), values.password);
            message.success(`欢迎回来，${current.nickname}`);
            navigate(ROLE_HOME[current.role], { replace: true });
        } catch (error) {
            message.error(getErrorMessage(error, '登录失败，请检查用户名和密码'));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="login-page">
            <Card className="login-card" bordered={false}>
                <div className="login-brand">
                    <span className="login-logo">
                        <CoffeeOutlined />
                    </span>
                    <Typography.Title level={2} className="login-title">
                        餐厅点餐系统
                    </Typography.Title>
                    <span className="login-subtitle">店长 · 厨师 · 收银员 登录入口</span>
                </div>

                <Form
                    layout="vertical"
                    requiredMark={false}
                    onFinish={handleFinish}
                    initialValues={{ username: '', password: '' }}
                >
                    <Form.Item
                        label="用户名"
                        name="username"
                        rules={[{ required: true, message: '请输入用户名' }]}
                    >
                        <Input
                            size="large"
                            prefix={<UserOutlined />}
                            placeholder="请输入用户名"
                            autoComplete="username"
                            allowClear
                        />
                    </Form.Item>

                    <Form.Item
                        label="密码"
                        name="password"
                        rules={[{ required: true, message: '请输入密码' }]}
                    >
                        <Input.Password
                            size="large"
                            prefix={<LockOutlined />}
                            placeholder="请输入密码"
                            autoComplete="current-password"
                        />
                    </Form.Item>

                    <Button
                        type="primary"
                        htmlType="submit"
                        size="large"
                        block
                        loading={submitting}
                        className="login-submit"
                    >
                        登 录
                    </Button>
                </Form>

                <div className="login-hint">
                    <div>演示账号：admin / chef01 / cashier01</div>
                    <div>初始密码均为 123456</div>
                    <div>顾客无需登录，扫描餐桌二维码即可点餐</div>
                </div>
            </Card>
        </div>
    );
}
