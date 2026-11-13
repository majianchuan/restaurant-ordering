import { useState } from 'react';
import { App as AntdApp, Form, Input, Modal } from 'antd';
import { authApi, getErrorMessage } from '../api/client';

interface ChangePasswordModalProps {
    open: boolean;
    onClose: () => void;
}

interface PasswordFormValues {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
}

export function ChangePasswordModal({ open, onClose }: ChangePasswordModalProps) {
    const [form] = Form.useForm<PasswordFormValues>();
    const [submitting, setSubmitting] = useState(false);
    const { message } = AntdApp.useApp();

    const handleOk = async () => {
        let values: PasswordFormValues;
        try {
            values = await form.validateFields();
        } catch {
            return;
        }

        setSubmitting(true);
        try {
            await authApi.changePassword(values.currentPassword, values.newPassword);
            message.success('密码修改成功');
            form.resetFields();
            onClose();
        } catch (error) {
            message.error(getErrorMessage(error));
        } finally {
            setSubmitting(false);
        }
    };

    const handleCancel = () => {
        form.resetFields();
        onClose();
    };

    return (
        <Modal
            title="修改密码"
            open={open}
            onOk={handleOk}
            confirmLoading={submitting}
            onCancel={handleCancel}
            okText="确认修改"
            cancelText="取消"
            destroyOnClose
            maskClosable={false}
        >
            <Form form={form} layout="vertical" requiredMark={false} preserve={false}>
                <Form.Item
                    label="原密码"
                    name="currentPassword"
                    rules={[{ required: true, message: '请输入原密码' }]}
                >
                    <Input.Password autoComplete="current-password" placeholder="请输入原密码" />
                </Form.Item>
                <Form.Item
                    label="新密码"
                    name="newPassword"
                    rules={[{ required: true, message: '请输入新密码' }]}
                >
                    <Input.Password autoComplete="new-password" placeholder="请输入新密码" />
                </Form.Item>
                <Form.Item
                    label="确认新密码"
                    name="confirmPassword"
                    dependencies={['newPassword']}
                    rules={[
                        { required: true, message: '请再次输入新密码' },
                        ({ getFieldValue }) => ({
                            validator(_, value) {
                                if (!value || value === getFieldValue('newPassword')) {
                                    return Promise.resolve();
                                }
                                return Promise.reject(new Error('两次输入的新密码不一致'));
                            },
                        }),
                    ]}
                >
                    <Input.Password autoComplete="new-password" placeholder="请再次输入新密码" />
                </Form.Item>
            </Form>
        </Modal>
    );
}
