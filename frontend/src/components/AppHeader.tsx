import { useState } from 'react';
import { App as AntdApp, Button, Dropdown, Space, type MenuProps } from 'antd';
import {
    KeyOutlined,
    LogoutOutlined,
    UserOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ROLE_LABELS } from '../constants';
import { ChangePasswordModal } from './ChangePasswordModal';

interface AppHeaderProps {
    title?: string;
}

export function AppHeader({ title }: AppHeaderProps) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const { message } = AntdApp.useApp();
    const [passwordOpen, setPasswordOpen] = useState(false);

    if (!user) {
        return null;
    }

    const menuItems: MenuProps['items'] = [
        { key: 'password', icon: <KeyOutlined />, label: '修改密码' },
        { type: 'divider' },
        { key: 'logout', icon: <LogoutOutlined />, label: '退出登录' },
    ];

    const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
        if (key === 'password') {
            setPasswordOpen(true);
        }
        if (key === 'logout') {
            logout();
            message.success('已退出登录');
            navigate('/login', { replace: true });
        }
    };

    return (
        <>
            <header className="app-header">
                <div className="app-brand">
                    <span className="brand-logo">🍽️</span>
                    <span className="brand-name">餐厅点餐系统</span>
                    <span className="brand-role">
                        {ROLE_LABELS[user.role]}
                        {title ? ` · ${title}` : ''}
                    </span>
                </div>
                <Space size={12}>
                    <span className="header-nickname">{user.nickname}</span>
                    <Dropdown
                        menu={{ items: menuItems, onClick: handleMenuClick }}
                        trigger={['click']}
                        placement="bottomRight"
                    >
                        <Button type="text" icon={<UserOutlined />}>
                            账户
                        </Button>
                    </Dropdown>
                </Space>
            </header>
            <ChangePasswordModal
                open={passwordOpen}
                onClose={() => setPasswordOpen(false)}
            />
        </>
    );
}
