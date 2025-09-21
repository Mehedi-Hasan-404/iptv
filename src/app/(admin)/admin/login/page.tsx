'use client';
import LoginForm from "@/components/admin/LoginForm";

export default function AdminLoginPage() {
    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-900">
            <div className="w-full max-w-md p-8 bg-gray-800 rounded-lg">
                <h1 className="text-2xl font-bold text-center text-white mb-6">Admin Login</h1>
                <LoginForm />
            </div>
        </div>
    );
}
