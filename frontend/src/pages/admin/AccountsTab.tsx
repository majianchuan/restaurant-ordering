import { useCallback, useEffect, useState } from 'react';
import {
    App as AntdApp,
    Button,
    Form,
    Input,
    Modal,
    Popconfirm,
    Select,
    Space,
    Table,
    Tag,
    Typography,
} from 'antd';
import { DeleteOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { getErrorMessage, userApi } from '../../api/client';
import type { CreateUserPayload, StaffAccount } from '../../types';

const ROLE_TAG_COLORS: Record<string, string> = {
    manager: 'gold',
    chef: 'blue',
    cashier: 'green',
    customer: 'purple',
};

function randomFourDigits(): string {
    return String(Math.floor(1000 + Math.random() * 9000));
}

function autoNickname(role: 'chef' | 'cashier'): string {
    return `${role === 'chef' ? '厨师' : '收银员'}${randomFourDigits()}`;
}

export function AccountsTab() {
    const { message } = AntdApp.useApp();
    const [accounts, setAccounts] = useState<StaffAccount[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [form] = Form.useForm<CreateUserPayload>();

    const load = useCallback(async () => {
        setLoading(true);
        try {
            setAccounts(await userApi.list());
        } catch (error) {
            message.error(getErrorMessage(error));
        } finally {
            setLoading(false);
        }
    }, [message]);

    useEffect(() => {
        void load();
    }, [load]);

    const openCreate = () => {
        form.resetFields();
        form.setFieldsValue({
            role: 'chef',
            username: '',
            nickname: autoNickname('chef'),
            password: '123456',
        });
        setModalOpen(true);
    };

    const handleCreate = async () => {
        let values: CreateUserPayload;
        try {
            values = await form.validateFields();
        } catch {
            return;
        }

        setSubmitting(true);
        try {
            await userApi.create(values);
            message.success('账户创建成功');
            setModalOpen(false);
            await load();
        } catch (error) {
            message.error(getErrorMessage(error));
        } finally {
            setSubmitting(false);
        }
    };

    const handleRemove = async (account: StaffAccount) => {
        try {
            await userApi.remove(account.id);
            message.success('账户已删除');
            await load();
        } catch (error) {
            message.error(getErrorMessage(error));
        }
    };

    const columns: ColumnsType<StaffAccount> = [
        {
            title: '用户名',
            dataIndex: 'username',
            key: 'username',
            width: 160,
        },
        {
            title: '昵称',
            dataIndex: 'nickname',
            key: 'nickname',
            width: 160,
        },
        {
            title: '角色',
            dataIndex: 'role',
            key: 'role',
            width: 120,
            render: (_, record) => (
                <Tag color={ROLE_TAG_COLORS[record.role] ?? 'default'}>
                    {record.roleLabel}
                </Tag>
            ),
        },
        {
            title: '创建时间',
            dataIndex: 'createdAt',
            key: 'createdAt',
            width: 180,
            render: (value?: string) =>
                value ? dayjs(value).format('YYYY-MM-DD HH:mm') : '-',
        },
        {
            title: '操作',
            key: 'actions',
            width: 110,
            render: (_, record) =>
                record.role === 'manager' ? (
                    <Typography.Text type="secondary">不可删除</Typography.Text>
                ) : (
                    <Popconfirm
                        title={`删除账户「${record.nickname}」？`}
                        description="删除后该账户将无法登录。"
                        okText="删除"
                        cancelText="取消"
                        okButtonProps={{ danger: true }}
                        onConfirm={() => handleRemove(record)}
                    >
                        <Button type="text" danger icon={<DeleteOutlined />}>
                            删除
                        </Button>
                    </Popconfirm>
                ),
        },
    ];

    return (
        <div>
            <div className="panel-toolbar">
                <div>
                    <h2>员工账户</h2>
                    <span className="toolbar-subtitle">
                        店长可创建、删除厨师与收银员账户
                    </span>
                </div>
                <Space>
                    <Button icon={<ReloadOutlined />} onClick={() => void load()}>
                        刷新
                    </Button>
                    <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
                        创建账户
                    </Button>
                </Space>
            </div>

            <Table<StaffAccount>
                rowKey="id"
                size="middle"
                loading={loading}
                columns={columns}
                dataSource={accounts}
                pagination={false}
                scroll={{ x: 720 }}
            />

            <Modal
                title="创建账户"
                open={modalOpen}
                onOk={handleCreate}
                onCancel={() => setModalOpen(false)}
                confirmLoading={submitting}
                okText="创建"
                cancelText="取消"
                destroyOnClose
                maskClosable={false}
            >
                <Form form={form} layout="vertical" requiredMark={false} preserve={false}>
                    <Form.Item
                        label="角色"
                        name="role"
                        rules={[{ required: true, message: '请选择角色' }]}
                    >
                        <Select
                            options={[
                                { value: 'chef', label: '厨师' },
                                { value: 'cashier', label: '收银员' },
                            ]}
                            onChange={(role: 'chef' | 'cashier') => {
                                form.setFieldValue('nickname', autoNickname(role));
                            }}
                        />
                    </Form.Item>

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
                        <Input placeholder="用于登录，例如 chef01" autoComplete="off" />
                    </Form.Item>

                    <Form.Item
                        label="昵称"
                        name="nickname"
                        rules={[
                            { required: true, message: '请输入昵称' },
                            { max: 30, message: '昵称不能超过 30 个字符' },
                        ]}
                    >
                        <Input placeholder="用于页面显示" />
                    </Form.Item>

                    <Form.Item
                        label="密码"
                        name="password"
                        rules={[{ required: true, message: '请输入密码' }]}
                    >
                        <Input.Password placeholder="默认 123456" autoComplete="new-password" />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
