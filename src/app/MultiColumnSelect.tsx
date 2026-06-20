import Select, { type MultiValue } from "react-select";

type ColumnOption = {
    value: string;
    label: string;
};

type MultiColumnSelectProps = {
    availableColumns: string[];
    selectedColumns: string[];
    onChange: (columns: string[]) => void;
};

export function MultiColumnSelect({
    availableColumns,
    selectedColumns,
    onChange,
}: MultiColumnSelectProps) {
    const options: ColumnOption[] = availableColumns.map((columnName) => ({
        value: columnName,
        label: columnName,
    }));

    const value = options.filter((option) =>
        selectedColumns.includes(option.value)
    );

    function handleChange(newValue: MultiValue<ColumnOption>) {
        onChange(newValue.map((option) => option.value));
    }

    return (
        <Select
            isMulti
            options={options}
            value={value}
            onChange={handleChange}
            placeholder="Select columns..."
            classNamePrefix="multi-select"
        />
    );
}