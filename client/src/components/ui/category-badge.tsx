interface CategoryBadgeProps {
  name: string;
  color?: string;
  className?: string;
}

export default function CategoryBadge({ name, color = "#2A2A2A", className = "" }: CategoryBadgeProps) {
  // Generate alpha color with 10% opacity
  const alphaColor = `${color}1A`; // 1A is hex for 10% opacity
  
  return (
    <span 
      className={`inline-block px-2 py-1 text-xs rounded font-medium ${className}`}
      style={{ 
        backgroundColor: alphaColor,
        color: color
      }}
    >
      {name}
    </span>
  );
}
