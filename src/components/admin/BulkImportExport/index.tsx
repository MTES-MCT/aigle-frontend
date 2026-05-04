import { useState } from 'react';

import { useAuth } from '@/store/slices/auth';
import { Button } from '@mantine/core';
import { IconDownload, IconUpload } from '@tabler/icons-react';

import ImportDialog from './ImportDialog';
import classes from './index.module.scss';
import { triggerExport } from './triggerExport';
import { BulkConfig } from './types';

interface Props {
    config: BulkConfig;
    exportParams?: object;
}

const BulkImportExportButtons = ({ config, exportParams }: Props) => {
    const { userMe } = useAuth();
    const [opened, setOpened] = useState(false);
    const [exportLoading, setExportLoading] = useState(false);

    if (userMe?.userRole !== 'SUPER_ADMIN') {
        return null;
    }

    return (
        <div className={classes.container}>
            <Button
                variant="light"
                mr="md"
                leftSection={<IconDownload size={16} />}
                onClick={async () => {
                    setExportLoading(true);
                    await triggerExport(
                        config.exportEndpoint,
                        `${config.fileBaseName}.csv`,
                        exportParams as Record<string, unknown> | undefined,
                    );
                    setExportLoading(false);
                }}
                loading={exportLoading}
            >
                Télécharger
            </Button>
            <Button variant="light" mr="md" leftSection={<IconUpload size={16} />} onClick={() => setOpened(true)}>
                Importer
            </Button>
            <ImportDialog config={config} opened={opened} onClose={() => setOpened(false)} />
        </div>
    );
};

export default BulkImportExportButtons;
export type { BulkConfig, ColumnSpec } from './types';
