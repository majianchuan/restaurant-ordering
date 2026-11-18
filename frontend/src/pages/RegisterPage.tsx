import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { App as AntdApp, Button, Card, Form, Input, Typography } from 'antd';
import { LockOutlined, PhoneOutlined, SmileOutlined, UserOutlined } from '@ant-design/icons';
import { useAuth } from '../auth/AuthContext';
import { ROLE_HOME } from '../constants';
import { getErrorMessage } from '../api/client';

interface RegisterFormValues {
    username: string;
    nickname?: string;
    phone?: string;
    password: string;
    confirmPassword: string;
}

export function RegisterPage() {
    const { user, register } = useAuth();
    const navigate = useNavigate();
    const { message } = AntdApp.useApp();
    const [submitting, setSubmitting] = useState(false);

    if (user) {
        return <Navigate to={ROLE_HOME[user.role]} replace />;
    }

    const handleFinish = async (values: RegisterFormValues) => {
        setSubmitting(true);
        try {
            const current = await register({
                username: values.username.trim(),
                nickname: values.nickname?.trim() ?? '',
                phone: values.phone?.trim() ?? '',
                password: values.password,
            });
            message.success(`注册成功，欢迎你，${current.nickname}`);
            navigate(ROLE_HOME[current.role], { replace: true });
        } catch (error) {
            message.error(getErrorMessage(error, '注册失败，请稍后重试'));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="login-page">
            <span className="login-decor login-decor-1">🍜</span>
            <span className="login-decor login-decor-2">🥢</span>
            <span className="login-decor login-decor-3">🍵</span>

            <Card className="login-card register-card" bordered={false}>
                <div className="login-brand">
                    <span className="login-logo">🍽️</span>
                    <Typography.Title level={2} className="login-title">
                        顾客注册
                    </Typography.Title>
                    <span className="login-subtitle">
                        注册后可查看订单、收藏菜品并发表评价
                    </span>
                </div>

                <Form
                    layout="vertical"
                    requiredMark={false}
                    onFinish={handleFinish}
                    initialValues={{ username: '', nickname: '', phone: '', password: '' }}
                >
                    <Form.Item
                        label="用户名"
                        name="username"
                        rules={[
                            { required: true, message: '请输入用户名' },
                            {
                                pattern: /^[A-Za-z0-9_]{3,30}$/,
                                message: '用户名需为 3-30 位字母、数字或下划线',
                            },
                        ]}
                    >
                        <Input
                            size="large"
                            prefix={<UserOutlined />}
                            placeholder="用于登录，例如 customer02"
                            autoComplete="username"
                            allowClear
                        />
                    </Form.Item>

                    <Form.Item
                        label="昵称"
                        name="nickname"
                        rules={[{ max: 30, message: '昵称不能超过 30 个字符' }]}
                    >
                        <Input
                            size="large"
                            prefix={<SmileOutlined />}
                            placeholder="用于页面显示，不填会自动生成"
                            allowClear
                        />
                    </Form.Item>

                    <Form.Item
                        label="手机号"
                        name="phone"
                        rules={[
                            {
                                pattern: /^[0-9+\-\s]{5,20}$/,
                                message: '手机号格式不正确',
                            },
                        ]}
                    >
                        <Input
                            size="large"
                            prefix={<PhoneOutlined />}
                            placeholder="选填，用于个人资料"
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
                            autoComplete="new-password"
                        />
                    </Form.Item>

                    <Form.Item
                        label="确认密码"
                        name="confirmPassword"
                        dependencies={['password']}
                        rules={[
                            { required: true, message: '请再次输入密码' },
                            ({ getFieldValue }) => ({
                                validator(_, value) {
                                    if (!value || value === getFieldValue('password')) {
                                        return Promise.resolve();
                                    }
                                    return Promise.reject(new Error('两次输入的密码不一致'));
                                },
                            }),
                        ]}
                    >
                        <Input.Password
                            size="large"
                            prefix={<LockOutlined />}
                            placeholder="请再次输入密码"
                            autoComplete="new-password"
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
                        注 册
                    </Button>
                </Form>

                <div className="login-register">
                    已有账号？<Link to="/login">返回登录</Link>
                </div>
            </Card>
        </div>
    );
}
