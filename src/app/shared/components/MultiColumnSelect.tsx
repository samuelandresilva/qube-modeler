import Select, { type MultiValue } from "react-select";

type Option = { value: string; label: string };
type Props = {
  availableColumns: string[];
  selectedColumns: string[];
  onChange: (columns: string[]) => void;
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
    />
  );
}
