import CodeMirror from '@uiw/react-codemirror';
import { sql, PostgreSQL } from '@codemirror/lang-sql';

const sqlExtensions = [sql({ dialect: PostgreSQL })];

interface SqlEditorProps {
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  height?: string;
  placeholder?: string;
}

export function SqlEditor({ value, onChange, readOnly = false, height = '400px', placeholder }: SqlEditorProps) {
  return (
    // O div wrapper é OBRIGATÓRIO para bloquear a herança de cor do texto dos labels do modal
    <div
      style={{
        width: '100%',
        minWidth: 0,
        maxWidth: '100%',
        color: 'initial',
        backgroundColor: '#282c34',
        borderRadius: '6px',
        overflow: 'hidden',
      }}
    >
      <CodeMirror
        value={value}
        height={height}
        theme="dark"
        extensions={sqlExtensions}
        onChange={onChange}
        readOnly={readOnly}
        placeholder={placeholder}
        basicSetup={{
          lineNumbers: true,
          highlightActiveLine: !readOnly,
          tabSize: 4,
        }}
      />
    </div>
  );
}

export default SqlEditor;
