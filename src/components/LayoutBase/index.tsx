import Header from '@/components/Header';
import { getPageTitle, MAIN_CONTENT_ID } from '@/utils/html';
import { PropsWithChildren } from 'react';
import classes from './index.module.scss';

interface ComponentProps extends PropsWithChildren {
    title?: string;
}

const Component: React.FC<ComponentProps> = ({ children, title }: ComponentProps) => {
    return (
        <>
            <title>{getPageTitle(title)}</title>
            <Header />
            <main id={MAIN_CONTENT_ID} className={classes.content}>
                {children}
            </main>
        </>
    );
};

export default Component;
