import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  to?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ items }) => (
  <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-surface-400 mb-4">
    {items.map((item, i) => (
      <React.Fragment key={i}>
        {i > 0 && <ChevronRight className="h-3.5 w-3.5 flex-shrink-0" />}
        {item.to ? (
          <Link to={item.to} className="hover:text-white transition-colors truncate max-w-[200px]">
            {item.label}
          </Link>
        ) : (
          <span className="text-surface-200 truncate max-w-[200px]">{item.label}</span>
        )}
      </React.Fragment>
    ))}
  </nav>
);
