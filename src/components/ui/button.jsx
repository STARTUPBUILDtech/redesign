export function Button({ variant = "default", className = "", children, ...props }) {
  const variantClass =
    variant === "outline"
      ? "ui-btn-outline"
      : variant === "ghost"
      ? "ui-btn-ghost"
      : variant === "secondary"
      ? "ui-btn-secondary"
      : "ui-btn-primary";

  return (
    <button className={`ui-btn ${variantClass} ${className}`} {...props}>
      {children}
    </button>
  );
}
