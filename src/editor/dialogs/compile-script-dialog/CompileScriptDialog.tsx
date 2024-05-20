import '../editor-dialog.css';

import { Classes, Dialog } from '@blueprintjs/core';

export const CompileScriptDialog = ({
  isOpen,
  closeDialog,
}: {
  isOpen: boolean;
  closeDialog: () => void;
}) => {
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
      <div className={Classes.DIALOG_BODY}></div>
    </Dialog>
  );
};
