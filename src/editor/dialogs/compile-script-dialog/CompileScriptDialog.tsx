import { CompilerBCH, WalletTemplateVariable } from '@bitauth/libauth';
import '../editor-dialog.css';

import { Classes, Dialog } from '@blueprintjs/core';
import { useMemo } from 'react';

// user need to deep clone by using JSON.parse
const DEFAULT_COMPILATION_DATA = `{
  "bytecode": {},
  "hdKeys": { "addressIndex": 0, "hdPrivateKeys": {}, "hdPublicKeys": {} },
  "keys": { "privateKeys": {} }
}`;

export const CompileScriptDialog = ({
  isOpen,
  closeDialog,
  id,
  compiler,
}: {
  isOpen: boolean;
  closeDialog: () => void;
  id: string;
  compiler: CompilerBCH;
}) => {
  const requiredFields = useMemo(() => {
    const result = compiler.generateBytecode({
      data: JSON.parse(DEFAULT_COMPILATION_DATA),
      scriptId: id,
    });

    if (result.success) return [];

    const requiredFields: Array<[string, WalletTemplateVariable['type']]> = [];
    for (const err of result.errors) {
      if ('missingIdentifier' in err) {
        let variableId = err.missingIdentifier.split('.')[0]!;
        const type = compiler.configuration.variables![variableId]!.type;
        if (type === 'HdKey') variableId = err.owningEntity;
        requiredFields.push([variableId, type]);
      }
    }

    return requiredFields;
  }, [compiler, id, isOpen]);

  return (
    <Dialog
      className="CompileScriptDialog"
      onOpening={() => {}}
      onClose={() => {
        closeDialog();
      }}
      title="Compile Script"
      isOpen={isOpen}
      canOutsideClickClose={false}
    >
      <div className={Classes.DIALOG_BODY}>
        {requiredFields.map(([name, type]) => (
          <p>
            {name}: {type}
          </p>
        ))}
      </div>
    </Dialog>
  );
};
