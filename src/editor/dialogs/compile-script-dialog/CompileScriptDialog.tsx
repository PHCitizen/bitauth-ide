import '../editor-dialog.css';

import { useMemo, useState } from 'react';
import { Classes, Dialog, FormGroup, InputGroup } from '@blueprintjs/core';
import {
  CompilationData,
  CompilerBCH,
  WalletTemplateVariable,
  binToHex,
  createCompilerGenerateBytecodeFunction,
  encodeLockingBytecodeP2sh20,
  encodeLockingBytecodeP2sh32,
  hash160,
  hash256,
  lockingBytecodeToCashAddress,
} from '@bitauth/libauth';

// user need to deep clone by using JSON.parse
const DEFAULT_COMPILATION_DATA = `{
  "bytecode": {},
  "hdKeys": { "addressIndex": 0, "hdPrivateKeys": {}, "hdPublicKeys": {} },
  "keys": { "privateKeys": {} }
}`;

type CompilationResult = ReturnType<
  ReturnType<typeof createCompilerGenerateBytecodeFunction>
>;

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
  const [compilationData, setCompilationData] = useState<CompilationData>(
    JSON.parse(DEFAULT_COMPILATION_DATA),
  );

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
        if (type === 'HdKey') {
          variableId = err.owningEntity;
        }
        requiredFields.push([variableId, type]);
      }
    }

    return requiredFields;
  }, [compiler, id, isOpen]);

  const currentLockingScriptType =
    compiler.configuration.lockingScriptTypes![id]!;
  let bytecode = new Uint8Array();
  let lockingBytecode = new Uint8Array();
  let cashAddress = '';
  let tokenAddress = '';
  let result = { errors: [] as any, success: false } as CompilationResult;

  if (isOpen) {
    const customCompiler = createCompilerGenerateBytecodeFunction({
      ...compiler.configuration,
      lockingScriptTypes: {
        ...compiler.configuration.lockingScriptTypes,
        [id]: 'standard',
      },
    });
    result = customCompiler({ data: compilationData, scriptId: id });
    if (result.success) {
      bytecode = result.bytecode;
      switch (currentLockingScriptType) {
        case 'p2sh32':
          lockingBytecode = encodeLockingBytecodeP2sh32(hash256(bytecode));
          break;
        default:
          lockingBytecode = encodeLockingBytecodeP2sh20(hash160(bytecode));
      }

      const addressFormat = 'bitcoincash';
      const _cashAddress = lockingBytecodeToCashAddress(
        lockingBytecode,
        addressFormat,
      );
      const _tokenAddress = lockingBytecodeToCashAddress(
        lockingBytecode,
        addressFormat,
        { tokenSupport: true },
      );

      if (typeof _cashAddress === 'string') cashAddress = _cashAddress;
      if (typeof _tokenAddress === 'string') tokenAddress = _tokenAddress;
    }
  }

  return (
    <Dialog
      className="CompileScriptDialog"
      onOpening={() => {
        setCompilationData(JSON.parse(DEFAULT_COMPILATION_DATA));
      }}
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
        <div className="compilation-output">
          <FormGroup
            label="Bytecode"
            labelFor="bytecode-output"
            inline={true}
            helperText="Raw bytecode of the compiled script. AKA lockingType: standard"
            className="max-content"
          >
            <InputGroup
              id="bytecode-output"
              value={binToHex(bytecode)}
              autoComplete="off"
              contentEditable={false}
            />
          </FormGroup>
          <FormGroup
            label="Locking Bytecode"
            labelFor="locking-bytecode-output"
            inline={true}
            helperText="Locking bytecode of the compiled script. The format are either p2sh20(default) or p2sh32"
            className="max-content"
          >
            <InputGroup
              id="locking-bytecode-output"
              value={binToHex(lockingBytecode)}
              autoComplete="off"
              contentEditable={false}
            />
          </FormGroup>
          <FormGroup
            label="Cash address"
            labelFor="cash-address-output"
            inline={true}
            className="max-content"
          >
            <InputGroup
              id="cash-address-output"
              value={cashAddress}
              autoComplete="off"
              contentEditable={false}
            />
          </FormGroup>
          <FormGroup
            label="Token address"
            labelFor="token-address-output"
            inline={true}
            className="max-content"
          >
            <InputGroup
              id="token-address-output"
              value={tokenAddress}
              autoComplete="off"
              contentEditable={false}
            />
          </FormGroup>
        </div>
      </div>
    </Dialog>
  );
};
