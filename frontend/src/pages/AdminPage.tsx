import { Tabs } from 'antd';
import {
    AppstoreOutlined,
    CoffeeOutlined,
    DashboardOutlined,
    ProfileOutlined,
    TeamOutlined,
} from '@ant-design/icons';
import { AppHeader } from '../components/AppHeader';
import { AccountsTab } from './admin/AccountsTab';
import { TablesTab } from './admin/TablesTab';
import { MenuTab } from './admin/MenuTab';
import { DashboardTab } from './admin/DashboardTab';
import { OrdersTab } from './admin/OrdersTab';

export function AdminPage() {
    return (
        <div className="app-shell">
            <AppHeader title="管理后台" />
            <main className="page-container">
                <div className="page-title-row">
                    <h1>管理后台</h1>
                    <p>查看经营数据，管理订单、员工账户、餐桌与菜单</p>
                </div>

                <Tabs
                    className="admin-tabs"
                    defaultActiveKey="dashboard"
                    items={[
                        {
                            key: 'dashboard',
                            label: (
                                <span>
                                    <DashboardOutlined /> 数据概览
                                </span>
                            ),
                            children: <DashboardTab />,
                        },
                        {
                            key: 'orders',
                            label: (
                                <span>
                                    <ProfileOutlined /> 订单管理
                                </span>
                            ),
                            children: <OrdersTab />,
                        },
                        {
                            key: 'accounts',
                            label: (
                                <span>
                                    <TeamOutlined /> 账户管理
                                </span>
                            ),
                            children: <AccountsTab />,
                        },
                        {
                            key: 'tables',
                            label: (
                                <span>
                                    <AppstoreOutlined /> 餐桌管理
                                </span>
                            ),
                            children: <TablesTab />,
                        },
                        {
                            key: 'menu',
                            label: (
                                <span>
                                    <CoffeeOutlined /> 菜单管理
                                </span>
                            ),
                            children: <MenuTab />,
                        },
                    ]}
                />
            </main>
        </div>
    );
}
