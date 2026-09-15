export function Badge({ variant = "default", className = "", children, ...props }) {
  const variantClass =
    variant === "secondary"
      ? "ui-badge-secondary"
      : variant === "destructive"
      ? "ui-badge-destructive"
      : variant === "outline"
      ? "ui-badge-outline"
      : "ui-badge-default";

  return (
    <span className={`ui-badge ${variantClass} ${className}`} {...props}>
      {children}
    </span>
  );
}
