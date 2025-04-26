import { ReactNode } from "react";

interface AuthLayoutProps {
  children: ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-background flex justify-center items-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold flex items-center justify-center">
            <span className="text-accent-green mr-2">42</span>
            <span className="text-accent-cyan">CTF</span>
          </h1>
          <p className="text-text-secondary mt-2">Capture The Flag Platform</p>
        </div>
        {children}
      </div>
    </div>
  );
}
