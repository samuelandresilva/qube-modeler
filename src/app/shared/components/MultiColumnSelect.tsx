import Select, { type MultiValue, type StylesConfig } from "react-select";

type Option = { value: string; label: string };
type Props = {
  availableColumns: string[];
  selectedColumns: string[];
  onChange: (columns: string[]) => void;
};

const multiColumnSelectStyles: StylesConfig<Option, true> = {
  control: (base, state) => ({
    ...base,
    minHeight: 40,
    borderColor: state.isFocused
      ? "var(--color-accent)"
      : "var(--color-border-strong)",
    borderRadius: "var(--radius-md)",
    backgroundColor: "var(--color-bg)",
    boxShadow: state.isFocused ? "0 0 0 1px var(--color-accent)" : "none",
    cursor: "text",
    ":hover": {
      borderColor: state.isFocused
        ? "var(--color-accent)"
        : "var(--color-border-strong)",
    },
  }),
  input: (base) => ({
    ...base,
    color: "var(--color-text)",
  }),
  placeholder: (base) => ({
    ...base,
    color: "var(--color-text-subtle)",
  }),
  menu: (base) => ({
    ...base,
    zIndex: 400,
    overflow: "hidden",
    border: "1px solid var(--color-border-strong)",
    borderRadius: "var(--radius-md)",
    backgroundColor: "var(--color-surface-raised)",
    boxShadow: "var(--shadow-panel)",
  }),
  menuList: (base) => ({
    ...base,
    padding: 4,
    backgroundColor: "var(--color-surface-raised)",
  }),
  option: (base, state) => ({
    ...base,
    borderRadius: "var(--radius-sm)",
    backgroundColor: state.isSelected
      ? "var(--color-accent)"
      : state.isFocused
        ? "var(--color-border)"
        : "transparent",
    color: state.isSelected ? "var(--color-bg)" : "var(--color-text)",
    cursor: "pointer",
    ":active": {
      backgroundColor: state.isSelected
        ? "var(--color-accent)"
        : "var(--color-border-strong)",
    },
  }),
  multiValue: (base) => ({
    ...base,
    border: "1px solid var(--color-border-strong)",
    borderRadius: "var(--radius-sm)",
    backgroundColor: "var(--color-surface-raised)",
  }),
  multiValueLabel: (base) => ({
    ...base,
    color: "var(--color-text)",
  }),
  multiValueRemove: (base) => ({
    ...base,
    borderRadius: "0 var(--radius-sm) var(--radius-sm) 0",
    color: "var(--color-text-muted)",
    cursor: "pointer",
    ":hover": {
      backgroundColor: "rgba(127, 29, 29, 0.65)",
      color: "var(--color-danger)",
    },
  }),
  clearIndicator: (base) => ({
    ...base,
    color: "var(--color-text-subtle)",
    cursor: "pointer",
    ":hover": { color: "var(--color-text)" },
  }),
  dropdownIndicator: (base, state) => ({
    ...base,
    color: state.isFocused
      ? "var(--color-accent)"
      : "var(--color-text-subtle)",
    cursor: "pointer",
    ":hover": { color: "var(--color-text)" },
  }),
  indicatorSeparator: (base) => ({
    ...base,
    backgroundColor: "var(--color-border-strong)",
  }),
  noOptionsMessage: (base) => ({
    ...base,
    color: "var(--color-text-muted)",
  }),
};

export function MultiColumnSelect({
  availableColumns,
  selectedColumns,
  onChange,
}: Props) {
  const options = availableColumns.map((column) => ({
    value: column,
    label: column,
  }));
  const value = selectedColumns.map((column) => ({
    value: column,
    label: column,
  }));
  return (
    <Select<Option, true>
      isMulti
      options={options}
      value={value}
      onChange={(next: MultiValue<Option>) =>
        onChange(next.map((option) => option.value))
      }
      classNamePrefix="multi-column-select"
      placeholder="Select columns"
      styles={multiColumnSelectStyles}
    />
  );
}
