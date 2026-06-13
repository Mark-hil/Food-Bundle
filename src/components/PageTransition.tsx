import React, { ReactNode } from 'react';

interface PageTransitionProps {
  children: ReactNode;
}

const PageTransition: React.FC<PageTransitionProps> = ({ children }) => {
  return (
    <>
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .page-transition {
          animation: fadeInUp 300ms ease-out;
        }
      `}</style>

      <div className="page-transition">
        {children}
      </div>
    </>
  );
};

export default PageTransition;
