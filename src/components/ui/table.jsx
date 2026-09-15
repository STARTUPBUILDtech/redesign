export function Table({ className = "", children, ...props }) {
  return (
    <table className={`ui-table ${className}`} {...props}>
      {children}
    </table>
  );
}

export function TableHeader({ className = "", children, ...props }) {
  return (
    <thead className={`ui-table-header ${className}`} {...props}>
      {children}
    </thead>
  );
}

export function TableBody({ className = "", children, ...props }) {
  return (
    <tbody className={`ui-table-body ${className}`} {...props}>
      {children}
    </tbody>
  );
}

export function TableRow({ className = "", children, ...props }) {
  return (
    <tr className={`ui-table-row ${className}`} {...props}>
      {children}
    </tr>
  );
}

export function TableHead({ className = "", children, ...props }) {
  return (
    <th className={`ui-table-head ${className}`} {...props}>
      {children}
    </th>
  );
}

export function TableCell({ className = "", children, ...props }) {
  return (
    <td className={`ui-table-cell ${className}`} {...props}>
      {children}
    </td>
  );
}
