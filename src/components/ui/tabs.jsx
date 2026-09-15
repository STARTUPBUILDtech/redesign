import { createContext, useContext, useState } from "react";

const TabsContext = createContext(null);

export function Tabs({
  defaultValue = "all",
  value,
  onValueChange,
  className = "",
  children,
  ...props
}) {
  const [val, setVal] = useState(value !== undefined ? value : defaultValue);
  const currentVal = value !== undefined ? value : val;

  const handleChange = (newVal) => {
    setVal(newVal);
    if (onValueChange) onValueChange(newVal);
  };

  return (
    <TabsContext.Provider value={{ value: currentVal, onChange: handleChange }}>
      <div className={`ui-tabs ${className}`} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

export function TabsList({ className = "", children, ...props }) {
  return (
    <div className={`ui-tabs-list ${className}`} {...props}>
      {children}
    </div>
  );
}

export function TabsTrigger({ value, className = "", children, ...props }) {
  const ctx = useContext(TabsContext);
  const isActive = ctx?.value === value;
  return (
    <button
      type="button"
      className={`ui-tabs-trigger ${isActive ? "active" : ""} ${className}`}
      onClick={() => ctx?.onChange(value)}
      {...props}
    >
      {children}
    </button>
  );
}
