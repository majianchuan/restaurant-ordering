import { App as AntdApp, ConfigProvider, Button, Result } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { PageLoading } from './components/PageLoading';
import { RequireRole } from './components/RequireRole';
import { ROLE_HOME } from './constants';
import { LoginPage } from './pages/LoginPage';
import { AdminPage } from './pages/AdminPage';
import { KitchenPage } from './pages/KitchenPage';
import { CashierPage } from './pages/CashierPage';
import { OrderPage } from './pages/OrderPage';

function HomeRedirect() {
    const { user, loading } = useAuth();

    if (loading) {
        return <PageLoading />;
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    return <Navigate to={ROLE_HOME[user.role]} replace />;
}

function NotFound() {
    const navigate = useNavigate();

    return (
        <div className="not-found-page">
            <Result
                status="404"
                title="页面不存在"
                subTitle="你访问的页面可能已被移动或删除"
                extra={
                    <Button type="primary" onClick={() => navigate('/')}>
                        返回首页
                    </Button>
                }
            />
        </div>
    );
}

export default function App() {
    return (
        <ConfigProvider
            locale={zhCN}
            theme={{
                token: {
                    colorPrimary: '#fa541c',
                    colorLink: '#fa541c',
                    colorInfo: '#fa541c',
                    borderRadius: 8,
                },
                components: {
                    Button: { borderRadius: 8 },
                    Card: { borderRadiusLG: 14 },
                    Table: { headerBg: '#fafafa' },
                },
            }}
        >
            <AntdApp>
                <BrowserRouter>
                    <AuthProvider>
                        <Routes>
                            <Route path="/login" element={<LoginPage />} />
                            <Route
                                path="/admin"
                                element={
                                    <RequireRole role="manager">
                                        <AdminPage />
                                    </RequireRole>
                                }
                            />
                            <Route
                                path="/kitchen"
                                element={
                                    <RequireRole role="chef">
                                        <KitchenPage />
                                    </RequireRole>
                                }
                            />
                            <Route
                                path="/cashier"
                                element={
                                    <RequireRole role="cashier">
                                        <CashierPage />
                                    </RequireRole>
                                }
                            />
                            <Route path="/order/:code" element={<OrderPage />} />
                            <Route path="/" element={<HomeRedirect />} />
                            <Route path="*" element={<NotFound />} />
                        </Routes>
                    </AuthProvider>
                </BrowserRouter>
            </AntdApp>
        </ConfigProvider>
    );
}
