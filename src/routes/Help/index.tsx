import pdfDoc from '@/assets/Fiche métier - AIGLE - v1.pdf';
import LayoutBase from '@/components/LayoutBase';
import { Anchor, Button } from '@mantine/core';
import { IconDownload } from '@tabler/icons-react';
import React from 'react';
import classes from './index.module.scss';

const Component: React.FC = () => {
    return (
        <LayoutBase>
            <div className={classes.container}>
                <p>
                    Vous pouvez consulter la fiche métier AIGLE en cliquant sur le bouton ci-dessous en cas de besoin
                    d&apos;aide{' '}
                </p>

                <Button mt="lg" leftSection={<IconDownload />} component={Anchor} href={pdfDoc} target="_blank">
                    Télécharger la fiche métier
                </Button>
            </div>
        </LayoutBase>
    );
};

export default Component;
