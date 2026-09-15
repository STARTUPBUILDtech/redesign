import { createContext, useContext, useState, useRef, useEffect, Children } from "react";
import { ChevronDown } from "lucide-react";

const SelectContext = createContext(null);

export function Select({
  defaultValue = "",
  value,
  onValueChange,
  onChange,
  children,
  className = "",
  placeholder = "Select option",
}) {
  const [val, setVal] = useState(value !== undefined ? value : defaultValue);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const currentVal = value !== undefined ? value : val;

  const handleSelect = (newVal) => {
    setVal(newVal);
    if (onValueChange) onValueChange(newVal);
    if (onChange) onChange({ target: { value: newVal } });
    setIsOpen(false);
  };

  // Close when clicking outside or pressing Escape
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  // Extract label for currently selected value
  let selectedLabel = placeholder;
  Children.forEach(children, (child) => {
    if (child && child.type === SelectContent) {
      Children.forEach(child.props.children, (item) => {
        if (item && item.props && item.props.value === currentVal) {
          selectedLabel = item.props.children;
        }
      });
    }
  });

  return (
    <SelectContext.Provider
      value={{
        value: currentVal,
        onSelect: handleSelect,
        isOpen,
      }}
    >
      <div className={`custom-select-container ${className}`} ref={containerRef}>
        <button
          type="button"
          className={`custom-select-trigger ${isOpen ? "open" : ""}`}
          onClick={() => setIsOpen((prev) => !prev)}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
        >
          <span className="custom-select-value">{selectedLabel}</span>
          <ChevronDown
            size={16}
            className={`custom-select-chevron ${isOpen ? "rotate" : ""}`}
          />
        </button>

        {isOpen && (
          <div className="custom-select-dropdown" role="listbox">
            {children}
          </div>
        )}
      </div>
    </SelectContext.Provider>
  );
}

export function SelectContent({ children, className = "" }) {
  return <div className={`custom-select-menu ${className}`}>{children}</div>;
}

export function SelectItem({ value, children, className = "" }) {
  const ctx = useContext(SelectContext);
  const isSelected = ctx?.value === value;

  return (
    <div
      role="option"
      aria-selected={isSelected}
      className={`custom-select-item ${isSelected ? "selected" : ""} ${className}`}
      onClick={() => ctx?.onSelect(value)}
    >
      <span className="custom-select-item-text">{children}</span>
    </div>
  );
}
