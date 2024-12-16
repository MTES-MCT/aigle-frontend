import pdfDoc from '@/assets/Fiche métier - AIGLE - v1.pdf';
import logoMte from '@/assets/MTE.png';
import logoDdtm from '@/assets/ddtm.png';
import logoImg from '@/assets/logo.png';
import logoPrefet from '@/assets/prefet_herault.png';
import LayoutBase from '@/components/LayoutBase';
import { Anchor, Button, Divider, Group, Image } from '@mantine/core';
import { IconDownload } from '@tabler/icons-react';
import React from 'react';
import classes from './index.module.scss';

const Component: React.FC = () => {
    return (
        <LayoutBase>
            <div className={classes.container}>
                <h1>Détection par IA des irrégularités d&apos;occupation du sol</h1>

                <Group>
                    <Image
                        src={logoImg}
                        mt="lg"
                        mb="lg"
                        className={classes.logo}
                        alt="Logo Aigle"
                        h={200}
                        fit="contain"
                    />
                </Group>

                <p>Un projet de la Direction Départementale des Territoires et de la Mer de l&apos;Hérault</p>
                <p>
                    La fiche projet du projet est disponible ici :{' '}
                    <Anchor target="_blank" href="https://beta.gouv.fr/startups/aigle.html">
                        fiche projet
                    </Anchor>
                </p>

                <Group>
                    <Image src={logoDdtm} mt="lg" className={classes.logo} alt="Logo DDTM" h={100} fit="contain" />
                </Group>

                <Divider className={classes.divider} mt="xl" mb="xl" />

                <Group gap="lg">
                    <Image src={logoMte} className={classes.logo} alt="Logo MTE" h={200} fit="contain" />
                    <Image src={logoPrefet} className={classes.logo} alt="Logo Préfet Hérault" h={200} fit="contain" />
                </Group>
            </div>
        </LayoutBase>
    );
};

export default Component;
