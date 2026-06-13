import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface NavigationContextType {
  currentPath: string;
  navigate: (path: string) => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  return (
    <NavigationContext.Provider value={{ currentPath, navigate }}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigate() {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigate must be used within NavigationProvider');
  }
  return context.navigate;
}

export function useLocation() {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useLocation must be used within NavigationProvider');
  }
  return { pathname: context.currentPath };
}

interface LinkProps {
  to: string;
  children: ReactNode;
  className?: string;
}

export function Link({ to, children, className = '' }: LinkProps) {
  const { navigate } = useContext(NavigationContext)!;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    navigate(to);
  };

  return (
    <a href={to} onClick={handleClick} className={className}>
      {children}
    </a>
  );
}
