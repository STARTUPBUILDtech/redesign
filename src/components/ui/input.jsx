import { forwardRef } from "react";

export const Input = forwardRef(function Input({ className = "", autoCapitalize = "sentences", ...props }, ref) {
  return <input ref={ref} autoCapitalize={autoCapitalize} className={`ui-input ${className}`} {...props} />;
});
