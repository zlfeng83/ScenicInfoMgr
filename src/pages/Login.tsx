import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../lib/store';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { toast } from 'react-hot-toast';

export function LoginPage() {
    const navigate = useNavigate();
    const { setUser, setAdminProfile } = useAppStore();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        // Mock authentication process
        const mockUser = {
            id: 'mock-super-admin-id',
            email: email || 'admin@scenic.com',
            app_metadata: {},
            user_metadata: {},
            aud: 'authenticated',
            created_at: new Date().toISOString()
        } as any; // Cast as any to fit Supabase User type

        const mockProfile = {
            id: 'mock-super-admin-id',
            email: email || 'admin@scenic.com',
            role: 'super_admin' as const,
        };

        setUser(mockUser);
        setAdminProfile(mockProfile);

        toast.success('登录成功！(Mock 超级管理员)');
        navigate('/', { replace: true });

        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-muted/20 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-background rounded-lg shadow-lg border p-8">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold tracking-tight">欢迎登录</h1>
                    <p className="text-muted-foreground mt-2">游客管理后台系统</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="email">邮箱邮箱</Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="name@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="password">密码</Label>
                        <Input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? '登录中...' : '登录'}
                    </Button>
                </form>
            </div>
        </div>
    );
}
