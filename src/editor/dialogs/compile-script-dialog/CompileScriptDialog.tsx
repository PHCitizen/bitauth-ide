import '../editor-dialog.css';
import './CompileScriptDialog.css';
import { wrapInterfaceTooltip } from '../../common';

import { useId, useMemo, useState } from 'react';
import {
  Button,
  Classes,
  Dialog,
  FormGroup,
  InputGroup,
  Section,
  SectionCard,
} from '@blueprintjs/core';
import {
  CompilationData,
  CompilerBCH,
  WalletTemplateVariable,
  binToHex,
  createCompilerGenerateBytecodeFunction,
  decodeHdPrivateKey,
  decodeHdPublicKey,
  decodePrivateKeyWif,
  deriveHdPublicNode,
  encodeHdPrivateKey,
  encodeHdPublicKey,
  encodeLockingBytecodeP2sh20,
  encodeLockingBytecodeP2sh32,
  encodePrivateKeyWif,
  generateHdPrivateNode,
  generatePrivateKey,
  hash160,
  hash256,
  hexToBin,
  lockingBytecodeToCashAddress,
} from '@bitauth/libauth';

// user need to deep clone by using JSON.parse
const DEFAULT_COMPILATION_DATA = `{
  "bytecode": {},
  "hdKeys": { "addressIndex": 0, "hdPrivateKeys": {}, "hdPublicKeys": {} },
  "keys": { "privateKeys": {} }
}`;

type Networks = 'mainnet' | 'testnet';
type CompilationResult = ReturnType<
  ReturnType<typeof createCompilerGenerateBytecodeFunction>
>;
type CompileScriptData = {
  bytecode: { [fullIdentifier: string]: Uint8Array | undefined };
  currentBlockHeight?: number;
  currentBlockTime?: number;
  hdKeys: {
    addressIndex: number;
    hdPublicKeys: {
      [entityId: string]: string | undefined;
    };
    hdPrivateKeys: {
      [entityId: string]: string | undefined;
    };
  };
  keys: {
    // wif encoded
    privateKeys: { [variableId: string]: string | undefined };
  };
};

type CompilationDataProps = {
  variableId: string;
  data: CompileScriptData;
  setData: React.Dispatch<React.SetStateAction<CompileScriptData>>;
  network: Networks;
};

const HdKey = ({
  variableId,
  data,
  setData,
  network,
}: CompilationDataProps) => {
  const addressIndexId = useId();
  const hdPrivKeyId = useId();
  const hdPubKeyId = useId();

  const setAddressIndex = (addressIndex: number) => {
    setData((data) => ({
      ...data,
      hdKeys: { ...data.hdKeys, addressIndex },
    }));
  };

  const setHdPubKey = (hdPubKey: string | undefined) => {
    setData((data) => ({
      ...data,
      hdKeys: {
        ...data.hdKeys,
        hdPublicKeys: {
          ...data.hdKeys.hdPublicKeys,
          [variableId]: hdPubKey,
        },
      },
    }));
  };

  const setHdPrivKey = (hdPrivKey: string | undefined) => {
    setData((data) => ({
      ...data,
      hdKeys: {
        ...data.hdKeys,
        hdPrivateKeys: {
          ...data.hdKeys.hdPrivateKeys,
          [variableId]: hdPrivKey,
        },
      },
    }));
  };

  const randomHdPrivateNode = () => {
    const { hdPrivateNode } = generateHdPrivateNode();
    const hdPublicNode = deriveHdPublicNode(hdPrivateNode);

    const hdPriv = encodeHdPrivateKey({
      node: hdPrivateNode,
      network,
    });
    const hdPub = encodeHdPublicKey({
      node: hdPublicNode,
      network,
    });

    setHdPrivKey(hdPriv);
    setHdPubKey(hdPub);
  };

  const checkHdKey = (value: string, isPrivate: boolean) => {
    const decoder = isPrivate ? decodeHdPrivateKey : decodeHdPublicKey;
    const decoded = decoder(value);
    if (typeof decoded === 'string') {
      return decoded;
    }
    if (decoded.network !== network) {
      return 'Network mismatch';
    }

    return false;
  };

  const addressIndex = data.hdKeys!.addressIndex;
  const hdPrivKey = data.hdKeys.hdPrivateKeys[variableId] || '';
  const hdPrivKeyErr = checkHdKey(hdPrivKey, true);
  const hdPubKey = data.hdKeys.hdPublicKeys[variableId] || '';
  const hdPubKeyErr = checkHdKey(hdPubKey, false);

  return (
    <Section
      title={variableId}
      collapsible={true}
      compact={true}
      collapseProps={{ defaultIsOpen: false, keepChildrenMounted: true }}
    >
      <SectionCard>
        <FormGroup
          label="Address index"
          labelFor={addressIndexId}
          inline={true}
        >
          <InputGroup
            id={addressIndexId}
            value={addressIndex?.toString() || ''}
            autoComplete="off"
            onChange={(e) => setAddressIndex(Number(e.currentTarget.value))}
          />
        </FormGroup>
        <FormGroup
          label="HdPrivate Key"
          labelFor={hdPrivKeyId}
          inline={true}
          className="form-group-with-btn "
        >
          <InputGroup
            id={hdPrivKeyId}
            value={hdPrivKey}
            autoComplete="off"
            onChange={(e) => setHdPrivKey(e.currentTarget.value)}
          />
          {wrapInterfaceTooltip(
            <Button icon="refresh" onClick={randomHdPrivateNode} />,
            'Generate HdPrivateKey and the corresponding HdPublicKey',
          )}
        </FormGroup>
        <div className="error-block mb-15">
          {hdPrivKeyErr && <span className="error-item">{hdPrivKeyErr}</span>}
        </div>

        <FormGroup label="HdPublic Key" labelFor={hdPubKeyId} inline={true}>
          <InputGroup
            id={hdPubKeyId}
            value={hdPubKey}
            autoComplete="off"
            onChange={(e) => setHdPubKey(e.currentTarget.value)}
          />
        </FormGroup>
        <div className="error-block mb-15">
          {hdPubKeyErr && <span className="error-item">{hdPubKeyErr}</span>}
        </div>
      </SectionCard>
    </Section>
  );
};

const Key = ({ variableId, setData, data, network }: CompilationDataProps) => {
  const privateKeyId = useId();
  const value = data.keys.privateKeys[variableId] || '';

  const setKey = (value: string | undefined) => {
    setData((data) => ({
      ...data,
      keys: {
        ...data.keys,
        privateKeys: {
          ...data.keys.privateKeys,
          [variableId]: value,
        },
      },
    }));
  };

  const randomPrivateKey = () => {
    const privateKey = generatePrivateKey();
    const wif = encodePrivateKeyWif(privateKey, network);
    setKey(wif);
  };

  const err = (() => {
    const decoded = decodePrivateKeyWif(value);
    if (typeof decoded === 'string') {
      return decoded;
    }

    const deriveNetwork = decoded.type.replace('Uncompressed', '') as Networks;
    return deriveNetwork === network ? false : 'Network mismatch';
  })();

  return (
    <Section
      title={variableId}
      collapsible={true}
      compact={true}
      collapseProps={{ defaultIsOpen: false, keepChildrenMounted: true }}
    >
      <SectionCard>
        <FormGroup
          label="Private Key"
          labelFor={privateKeyId}
          inline={true}
          className="form-group-with-btn"
        >
          <InputGroup
            value={value}
            onChange={(e) => setKey(e.currentTarget.value)}
            autoComplete="off"
          />
          <Button icon="refresh" onClick={randomPrivateKey} />
        </FormGroup>
        <div className="error-block mb-15">
          {err && <span className="error-item">{err}</span>}
        </div>
      </SectionCard>
    </Section>
  );
};

const TargetBytecode = ({
  variableId,
  setData,
  data,
}: CompilationDataProps) => {
  const inputId = useId();
  const initValue = binToHex(data.bytecode![variableId] || new Uint8Array());

  const [value, setValue] = useState(initValue);

  const setGlobalBytecode = (props: string) => {
    const value = hexToBin(props);

    setData((data) => {
      const newData = {
        ...data,
        bytecode: { ...data.bytecode, [variableId]: value },
      };

      if (value.length === 0) {
        delete newData.bytecode[variableId];
      }

      return newData;
    });
  };

  return (
    <Section
      title={variableId}
      collapsible={true}
      compact={true}
      collapseProps={{ defaultIsOpen: false }}
    >
      <SectionCard>
        <FormGroup label="Content" labelFor={inputId} inline={true}>
          <InputGroup
            id={inputId}
            value={value}
            autoComplete="off"
            onChange={(e) => setValue(e.currentTarget.value)}
            onBlur={(e) => {
              setValue(binToHex(hexToBin(e.currentTarget.value)));
              setGlobalBytecode(e.currentTarget.value);
            }}
          />
        </FormGroup>
      </SectionCard>
    </Section>
  );
};

const VariableTypeMap: Record<
  WalletTemplateVariable['type'],
  (props: CompilationDataProps) => JSX.Element
> = {
  HdKey,
  Key,
  AddressData: TargetBytecode,
  WalletData: TargetBytecode,
};

const computeCompilationData = (
  scriptData: CompileScriptData,
  network: Networks,
): CompilationData => {
  let ptr: any;

  ptr = scriptData.hdKeys.hdPrivateKeys;
  for (const key of Object.keys(ptr)) {
    if (typeof ptr[key] === 'undefined') {
      delete ptr[key];
      continue;
    }
    const decoded = decodeHdPrivateKey(ptr[key]);
    if (typeof decoded === 'string' || decoded.network !== network) {
      delete ptr[key];
    }
  }

  ptr = scriptData.hdKeys.hdPublicKeys;
  for (const key of Object.keys(ptr)) {
    if (typeof ptr[key] === 'undefined') {
      delete ptr[key];
      continue;
    }
    const decoded = decodeHdPublicKey(ptr[key]);
    if (typeof decoded === 'string' || decoded.network !== network) {
      delete ptr[key];
    }
  }

  ptr = scriptData.keys.privateKeys;
  for (const key of Object.keys(ptr)) {
    if (typeof ptr[key] === 'undefined') {
      delete ptr[key];
      continue;
    }
    const decoded = decodePrivateKeyWif(ptr[key]);
    if (
      typeof decoded === 'string' ||
      decoded.type.replace('Uncompressed', '') !== network
    ) {
      delete ptr[key];
      continue;
    }

    ptr[key] = decoded.privateKey;
  }

  return scriptData as any;
};

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
  const network = 'mainnet';
  const [compilationData, setCompilationData] = useState<CompileScriptData>(
    JSON.parse(DEFAULT_COMPILATION_DATA),
  );

  const data = useMemo(
    () =>
      computeCompilationData(
        JSON.parse(JSON.stringify(compilationData)),
        network,
      ),
    [compilationData, network],
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
    result = customCompiler({ data, scriptId: id });
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
        <FormGroup
          label="Variables"
          inline={true}
          helperText="Variables needed to compile the scripts"
          className="max-content"
        >
          {requiredFields.map(([variableId, type]) => {
            const Component = VariableTypeMap[type];
            return (
              <Component
                variableId={variableId}
                data={compilationData}
                setData={setCompilationData}
                key={variableId}
                network={network}
              />
            );
          })}
        </FormGroup>
        <div className="divider" />
        <div className="error-block mb-15">
          <ul>
            {!result.success &&
              result.errors.map((err) => (
                <li className="text-danger error-item" key={err.error}>
                  {err.error}
                </li>
              ))}
          </ul>
        </div>
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
